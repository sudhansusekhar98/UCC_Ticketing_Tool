import { useState, useRef, useEffect, useCallback } from 'react';
import {
    Send,
    Paperclip,
    Image,
    FileText,
    X,
    Download,
    Trash2,
    Loader,
    MessageSquare,
    Lock,
    Clock,
    RefreshCw,
} from 'lucide-react';
import { activitiesApi } from '../../services/api';
import socketService from '../../services/socket';
import useAuthStore from '../../context/authStore';
import toast from 'react-hot-toast';
import { format, formatDistanceToNow } from 'date-fns';
import './ActivitySection.css';

const getRoleBadgeClass = (role) => {
    switch (role) {
        case 'Admin': return 'role-admin';
        case 'Supervisor': return 'role-supervisor';
        case 'Dispatcher': return 'role-dispatcher';
        case 'L1Engineer': return 'role-l1';
        case 'L2Engineer': return 'role-l2';
        case 'ClientViewer': return 'role-client';
        default: return '';
    }
};

const getActivityTypeIcon = (type) => {
    switch (type) {
        case 'StatusChange': return '🔄';
        case 'Assignment': return '👤';
        case 'Escalation': return '⬆️';
        case 'Resolution': return '✅';
        case 'Attachment': return '📎';
        default: return '💬';
    }
};

// Helper function to properly parse UTC dates from backend
const parseUTCDate = (dateString) => {
    if (!dateString) return new Date();
    // If the date string doesn't have a timezone indicator, treat it as UTC
    if (!dateString.endsWith('Z') && !dateString.includes('+')) {
        return new Date(dateString + 'Z');
    }
    return new Date(dateString);
};

export default function ActivitySection({ ticketId, ticketStatus }) {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [sending, setSending] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState('');
    const [isInternal, setIsInternal] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const fileInputRef = useRef(null);
    const messagesEndRef = useRef(null);
    const { user, hasRole } = useAuthStore();

    const canComment = ticketStatus !== 'Closed';
    const canSeeInternal = hasRole(['Admin', 'Supervisor', 'Dispatcher', 'L1Engineer', 'L2Engineer']);

    // Fetch activities function wrapped in useCallback for socket handler
    const fetchActivities = useCallback(async (showRefreshing = false) => {
        if (showRefreshing) setRefreshing(true);
        try {
            const response = await activitiesApi.getByTicket(ticketId);
            const activityData = response.data.data || response.data || [];
            // Map Express.js fields to frontend expected fields
            const mappedActivities = activityData.map(a => ({
                ...a,
                activityId: a._id || a.activityId,
                userId: typeof a.userId === 'object' ? a.userId?._id : a.userId,
                userName: a.userId?.fullName || a.userName || 'Unknown',
                userRole: a.userId?.role || a.userRole || '',
                createdOn: a.createdAt || a.createdOn,
                attachments: (a.attachments || []).map(att => ({
                    ...att,
                    attachmentId: att._id || att.attachmentId
                }))
            }));
            setActivities(mappedActivities);
        } catch (error) {
            console.error('Failed to load activities', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [ticketId]);

    // Initial load and Socket.IO connection
    useEffect(() => {
        fetchActivities();
        
        // Connect to socket and set up listener
        const socket = socketService.connect();
        
        // Join the ticket room for targeted updates
        socketService.joinTicketRoom(ticketId);
        
        // Handler for activity created events
        const handleActivityCreated = (data) => {
            // Only refresh if the activity is for this ticket
            if (String(data.ticketId) === String(ticketId)) {
                console.log('🔔 New activity received for ticket:', ticketId);
                fetchActivities();
            }
        };
        
        // Subscribe to activity events
        socketService.onActivityCreated(handleActivityCreated);
        
        // Cleanup on unmount
        return () => {
            socketService.leaveTicketRoom(ticketId);
            socketService.offActivityCreated(handleActivityCreated);
        };
    }, [ticketId, fetchActivities]);

    useEffect(() => {
        scrollToBottom();
    }, [activities]);

    // Manual refresh function
    const handleManualRefresh = () => {
        fetchActivities(true);
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 5) {
            toast.error('Maximum 5 files allowed at once');
            return;
        }

        const validFiles = files.filter(file => {
            if (file.size > 10 * 1024 * 1024) {
                toast.error(`${file.name} exceeds 10MB limit`);
                return false;
            }
            return true;
        });

        setSelectedFiles(prev => [...prev, ...validFiles]);
        e.target.value = '';
    };

    const removeFile = (index) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSend = async () => {
        if (!message.trim() && selectedFiles.length === 0) return;

        setSending(true);
        try {
            // First, create the activity with the message
            let activityId = null;
            if (message.trim()) {
                const response = await activitiesApi.create(ticketId, {
                    content: message.trim(),
                    activityType: 'Comment',
                    isInternal: isInternal,
                });
                activityId = response.data.data?.activityId;
            }

            // Upload attachments if any
            if (selectedFiles.length > 0) {
                setUploading(true);
                for (const file of selectedFiles) {
                    try {
                        await activitiesApi.uploadAttachment(ticketId, file, activityId);
                    } catch (err) {
                        toast.error(`Failed to upload ${file.name}`);
                    }
                }
                setUploading(false);
            }

            setMessage('');
            setSelectedFiles([]);
            setIsInternal(false);
            fetchActivities();
            toast.success('Comment added');
        } catch (error) {
            toast.error('Failed to send message');
        } finally {
            setSending(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleDownload = async (attachment) => {
        try {
            if (attachment.storageType === 'Cloudinary') {
                // Fetch the file from Cloudinary and download with original filename
                const response = await fetch(attachment.url);
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', attachment.fileName);
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(url);
            } else {
                const response = await activitiesApi.downloadAttachment(attachment.attachmentId);
                const url = window.URL.createObjectURL(new Blob([response.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', attachment.fileName);
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(url);
            }
        } catch (error) {
            console.error('Download error:', error);
            toast.error('Failed to download file');
        }
    };

    const isImage = (contentType) => contentType?.startsWith('image/');

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    if (loading) {
        return (
            <div className="activity-section glass-card">
                <div className="activity-header">
                    <h3><MessageSquare size={18} /> Activity</h3>
                </div>
                <div className="activity-loading">
                    <Loader className="animate-spin" size={24} />
                </div>
            </div>
        );
    }

    return (
        <div className="activity-section glass-card">
            <div className="activity-header">
                <div className="activity-header-left">
                    <h3><MessageSquare size={18} /> Activity & Comments</h3>
                    <span className="activity-count">{activities.length} entries</span>
                    <button 
                        className="refresh-btn" 
                        onClick={handleManualRefresh}
                        disabled={refreshing}
                        title="Refresh activities"
                    >
                        <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                    </button>
                </div>
                <div className="activity-header-right">
                    <span className={`status-badge status-${ticketStatus?.toLowerCase().replace(' ', '-')}`}>
                        {ticketStatus}
                    </span>
                </div>
            </div>

            <div className="activity-messages">
                {activities.length === 0 ? (
                    <div className="no-activities">
                        <MessageSquare size={32} />
                        <p>No comments yet</p>
                        <span>Be the first to add a comment or troubleshooting step</span>
                    </div>
                ) : (
                    activities.map((activity) => (
                        <div
                            key={activity.activityId}
                            className={`activity-item ${activity.userId === user?.userId ? 'own' : ''} ${activity.isInternal ? 'internal' : ''}`}
                        >
                            <div className="activity-avatar">
                                {(activity.userName || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div className="activity-content">
                                <div className="activity-meta">
                                    <span className="activity-user">{activity.userName}</span>
                                    <span className={`activity-role ${getRoleBadgeClass(activity.userRole)}`}>
                                        {activity.userRole}
                                    </span>
                                    {activity.isInternal && (
                                        <span className="internal-badge">
                                            <Lock size={10} /> Internal
                                        </span>
                                    )}
                                    <span className="activity-type-icon">
                                        {getActivityTypeIcon(activity.activityType)}
                                    </span>
                                </div>
                                <div className="activity-text">{activity.content}</div>

                                {activity.attachments?.length > 0 && (
                                    <div className="activity-attachments">
                                        {activity.attachments.map((att) => {
                                            // Construct full URL for database-stored files
                                            const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
                                            const BASE_URL = API_BASE_URL.replace('/api', '');
                                            const fullUrl = att.storageType === 'Cloudinary' 
                                                ? att.url 
                                                : `${BASE_URL}${att.url}`;
                                            
                                            return (
                                                <div key={att.attachmentId} className="attachment-item">
                                                    {isImage(att.contentType) ? (
                                                        <div className="attachment-image">
                                                            <img src={fullUrl} alt={att.fileName} />
                                                            <div className="attachment-overlay">
                                                                <button style={{ color: "white", backgroundColor: "transparent", border: "none" }} onClick={() => window.open(fullUrl, '_blank')}>
                                                                    View Full
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="attachment-file" onClick={() => handleDownload(att)}>
                                                            <FileText size={24} />
                                                            <div className="attachment-info">
                                                                <span className="attachment-name">{att.fileName}</span>
                                                                <span className="attachment-size">{formatFileSize(att.fileSize)}</span>
                                                            </div>
                                                            <Download size={16} />
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                <div className="activity-time">
                                    <Clock size={12} />
                                    {formatDistanceToNow(parseUTCDate(activity.createdOn), { addSuffix: true })}
                                    <span className="activity-exact-time">
                                        {format(parseUTCDate(activity.createdOn), 'MMM dd, yyyy HH:mm')}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {canComment && (
                <div className="activity-input-area">
                    {selectedFiles.length > 0 && (
                        <div className="selected-files">
                            {selectedFiles.map((file, index) => (
                                <div key={index} className="selected-file">
                                    {file.type.startsWith('image/') ? (
                                        <Image size={14} />
                                    ) : (
                                        <FileText size={14} />
                                    )}
                                    <span>{file.name}</span>
                                    <button onClick={() => removeFile(index)}>
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="input-row">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            multiple
                            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                            hidden
                        />
                        <button
                            className="attach-btn"
                            onClick={() => fileInputRef.current?.click()}
                            title="Attach files"
                        >
                            <Paperclip size={18} />
                        </button>

                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Type troubleshooting steps, queries, or notes..."
                            rows={1}
                            disabled={sending}
                        />

                        {canSeeInternal && (
                            <label className="internal-toggle" title="Mark as internal note (not visible to clients)">
                                <input
                                    type="checkbox"
                                    checked={isInternal}
                                    onChange={(e) => setIsInternal(e.target.checked)}
                                />
                                <Lock size={14} />
                            </label>
                        )}

                        <button
                            className="send-btn"
                            onClick={handleSend}
                            disabled={sending || uploading || (!message.trim() && selectedFiles.length === 0)}
                        >
                            {sending || uploading ? (
                                <Loader size={18} className="animate-spin" />
                            ) : (
                                <Send size={18} />
                            )}
                        </button>
                    </div>

                    <div className="input-hint">
                        Press Enter to send • Shift+Enter for new line • Max 10MB per file
                    </div>
                </div>
            )}

            {!canComment && (
                <div className="activity-closed-notice">
                    <Lock size={18} />
                    <div>
                        <strong>Ticket Closed</strong>
                        <p>Comments are disabled for closed tickets. Re-open the ticket to add new comments.</p>
                    </div>
                </div>
            )}
        </div>
    );
}
