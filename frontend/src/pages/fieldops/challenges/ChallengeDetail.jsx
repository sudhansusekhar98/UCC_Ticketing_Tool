import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Edit,
    AlertTriangle,
    Clock,
    User,
    CheckCircle,
    XCircle,
    Send,
    MessageSquare,
    Calendar,
    Flag,
    Play,
    MapPin,
    RefreshCw,
    ExternalLink
} from 'lucide-react';
import { fieldOpsApi } from '../../../services/api';
import useAuthStore from '../../../context/authStore';
import toast from 'react-hot-toast';
import { format, formatDistanceToNow } from 'date-fns';
import '../fieldops.css';

const severityColors = {
    Low: 'status-badge-info',
    Medium: 'status-badge-warning',
    High: 'status-badge-danger',
    Critical: 'status-badge-danger animate-pulse'
};

const statusColors = {
    Open: 'status-badge-danger',
    InProgress: 'status-badge-warning',
    Resolved: 'status-badge-success',
    Closed: 'status-badge-secondary',
    Deferred: 'status-badge-info'
};

export default function ChallengeDetail() {
    const { projectId, challengeId } = useParams();
    const navigate = useNavigate();
    const { user, hasRole } = useAuthStore();
    const [challenge, setChallenge] = useState(null);
    const [loading, setLoading] = useState(true);
    const [comment, setComment] = useState('');
    const [sending, setSending] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [recentChallenges, setRecentChallenges] = useState([]);
    const chatEndRef = useRef(null);

    const isAdmin = hasRole(['Admin', 'Supervisor']);

    useEffect(() => {
        loadChallenge();
        loadRecentChallenges();

        // Poll every 30 seconds for real-time status and comment updates
        const pollInterval = setInterval(() => {
            fieldOpsApi.getChallengeLogById(challengeId)
                .then(res => setChallenge(res.data.data))
                .catch(() => {});
        }, 30000);

        return () => clearInterval(pollInterval);
    }, [challengeId, projectId]);

    useEffect(() => {
        scrollToBottom();
    }, [challenge?.comments]);

    const loadRecentChallenges = async () => {
        try {
            const res = await fieldOpsApi.getChallengeLogs({ projectId, limit: 6 });
            const all = res.data.data || [];
            setRecentChallenges(all.filter(c => c._id !== challengeId));
        } catch { /* silent */ }
    };

    const loadChallenge = async () => {
        try {
            setLoading(true);
            const res = await fieldOpsApi.getChallengeLogById(challengeId);
            setChallenge(res.data.data);
        } catch (error) {
            toast.error('Failed to load challenge details');
            navigate(`/fieldops/projects/${projectId}`);
        } finally {
            setLoading(false);
        }
    };

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!comment.trim() || sending) return;

        setSending(true);
        try {
            const res = await fieldOpsApi.addChallengeComment(challengeId, { text: comment });
            setChallenge(prev => ({ ...prev, comments: res.data.data }));
            setComment('');
            toast.success('Comment added');
        } catch (error) {
            toast.error('Failed to add comment');
        } finally {
            setSending(false);
        }
    };

    const handleUpdateStatus = async (newStatus) => {
        if (updatingStatus) return;
        setUpdatingStatus(true);
        try {
            await fieldOpsApi.updateChallengeLog(challengeId, { resolutionStatus: newStatus });
            setChallenge(prev => ({ ...prev, resolutionStatus: newStatus }));
            toast.success(`Status updated to ${newStatus}`);
        } catch (error) {
            toast.error('Failed to update status');
        } finally {
            setUpdatingStatus(false);
        }
    };

    if (loading) {
        return (
            <div className="page-container">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading challenge details...</p>
                </div>
            </div>
        );
    }

    if (!challenge) return null;

    return (
        <div className="page-container animate-fade-in">
            <div className="page-header">
                <div className="header-left">
                    <Link to={`/fieldops/projects/${projectId}`} className="btn btn-ghost">
                        <ArrowLeft size={18} />
                    </Link>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h1 className="page-title">{challenge.challengeNumber}</h1>
                            <span className={`status-badge ${statusColors[challenge.resolutionStatus]}`}>
                                {challenge.resolutionStatus}
                            </span>
                            <span className={`status-badge ${severityColors[challenge.severity]}`}>
                                {challenge.severity} Priority
                            </span>
                        </div>
                        <p className="text-secondary">{challenge.title}</p>
                    </div>
                </div>
                <div className="header-actions">
                    {isAdmin && (
                        <Link to={`/fieldops/projects/${projectId}/challenges/${challengeId}/edit`} className="btn btn-ghost">
                            <Edit size={18} /> Edit
                        </Link>
                    )}
                </div>
            </div>

            <div className="ticket-detail-grid">
                {/* Main Content: Info + Conversations */}
                <div className="ticket-main-col">
                    {/* Description Card */}
                    <div className="glass-card mb-6">
                        <div className="card-header">
                            <h3 className="card-title">Description</h3>
                        </div>
                        <div className="card-body">
                            <p className="description-text">{challenge.description}</p>
                            {challenge.actionTaken && (
                                <div className="mt-4 p-4 bg-secondary rounded-lg">
                                    <h4 className="text-sm font-bold mb-2 flex items-center gap-2">
                                        <CheckCircle size={14} className="text-success" />
                                        Action Taken So Far
                                    </h4>
                                    <p className="text-sm">{challenge.actionTaken}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Conversations Section */}
                    <div className="glass-card conversation-card">
                        <div className="card-header flex justify-between items-center">
                            <h3 className="card-title flex items-center gap-2">
                                <MessageSquare size={18} />
                                Conversations & Updates
                            </h3>
                            <span className="text-xs text-muted">{challenge.comments?.length || 0} messages</span>
                        </div>
                        
                        <div className="chat-history">
                            {challenge.comments?.length === 0 ? (
                                <div className="empty-chat">
                                    <MessageSquare size={48} className="text-muted opacity-20" />
                                    <p>No updates yet. Start the conversation below.</p>
                                </div>
                            ) : (
                                challenge.comments.map((msg, idx) => (
                                    <div key={idx} className={`chat-message ${msg.commentedBy?._id === user?._id ? 'self' : 'other'}`}>
                                        <div className="message-header">
                                            <span className="sender-name">{msg.commentedBy?.fullName || 'User'}</span>
                                            <span className="message-time">{formatDistanceToNow(new Date(msg.commentedAt), { addSuffix: true })}</span>
                                        </div>
                                        <div className="message-body">
                                            {msg.text}
                                        </div>
                                    </div>
                                ))
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        <form onSubmit={handleAddComment} className="chat-input-area">
                            <textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="Type your update or comment here..."
                                className="chat-textarea"
                                rows={2}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleAddComment(e);
                                    }
                                }}
                            />
                            <button 
                                type="submit" 
                                className="chat-send-btn" 
                                disabled={!comment.trim() || sending}
                            >
                                {sending ? <div className="spinner-sm" /> : <Send size={18} />}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Sidebar: Details + Actions */}
                <div className="ticket-side-col">
                    {/* Status Actions */}
                    <div className="glass-card mb-6">
                        <div className="card-header">
                            <h3 className="card-title">Resolution Actions</h3>
                        </div>
                        <div className="card-body flex flex-col gap-2">
                            {challenge.resolutionStatus === 'Open' && (
                                <button 
                                    className="btn btn-warning w-full"
                                    onClick={() => handleUpdateStatus('InProgress')}
                                    disabled={updatingStatus}
                                >
                                    <Play size={16} /> Mark In Progress
                                </button>
                            )}
                            {['Open', 'InProgress'].includes(challenge.resolutionStatus) && (
                                <button 
                                    className="btn btn-success w-full"
                                    onClick={() => handleUpdateStatus('Resolved')}
                                    disabled={updatingStatus}
                                >
                                    <CheckCircle size={16} /> Mark Resolved
                                </button>
                            )}
                            {challenge.resolutionStatus === 'Resolved' && (
                                <button 
                                    className="btn btn-secondary w-full"
                                    onClick={() => handleUpdateStatus('Closed')}
                                    disabled={updatingStatus}
                                >
                                    <XCircle size={16} /> Close Challenge
                                </button>
                            )}
                            {['Resolved', 'Closed'].includes(challenge.resolutionStatus) && (
                                <button 
                                    className="btn btn-ghost w-full"
                                    onClick={() => handleUpdateStatus('InProgress')}
                                    disabled={updatingStatus}
                                >
                                    <RefreshCw size={16} /> Re-open
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Metadata Card */}
                    <div className="glass-card">
                        <div className="card-header">
                            <h3 className="card-title">Challenge Details</h3>
                        </div>
                        <div className="card-body">
                            <div className="meta-item">
                                <span className="meta-label"><Flag size={14} /> Issue Type</span>
                                <span className="meta-value">{challenge.issueType}</span>
                            </div>
                            <div className="meta-item">
                                <span className="meta-label"><User size={14} /> Reported By</span>
                                <span className="meta-value">{challenge.reportedBy?.fullName}</span>
                            </div>
                            <div className="meta-item">
                                <span className="meta-label"><Calendar size={14} /> Date Reported</span>
                                <span className="meta-value">{format(new Date(challenge.reportedAt), 'dd MMM yyyy')}</span>
                            </div>
                            <div className="meta-item">
                                <span className="meta-label"><User size={14} /> Assigned To</span>
                                <span className="meta-value">{challenge.assignedTo?.fullName || 'Unassigned'}</span>
                            </div>
                            {challenge.impact?.delayDays > 0 && (
                                <div className="meta-item">
                                    <span className="meta-label"><Clock size={14} /> Est. Delay</span>
                                    <span className="meta-value text-danger">{challenge.impact.delayDays} Days</span>
                                </div>
                            )}
                            {challenge.location?.description && (
                                <div className="meta-item">
                                    <span className="meta-label"><MapPin size={14} /> Location</span>
                                    <span className="meta-value">{challenge.location.description}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Recent Challenges from same project */}
                    {recentChallenges.length > 0 && (
                        <div className="glass-card mt-4">
                            <div className="card-header">
                                <h3 className="card-title flex items-center gap-2">
                                    <AlertTriangle size={16} /> Recent Challenges
                                </h3>
                            </div>
                            <div className="card-body" style={{ padding: '0.5rem 0' }}>
                                {recentChallenges.slice(0, 5).map(rc => (
                                    <Link
                                        key={rc._id}
                                        to={`/fieldops/projects/${projectId}/challenges/${rc._id}`}
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            padding: '0.625rem 1rem',
                                            borderBottom: '1px solid var(--border-light)',
                                            textDecoration: 'none',
                                            color: 'inherit',
                                            transition: 'background 0.15s'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                                            <span className={`status-badge ${statusColors[rc.resolutionStatus]}`} style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
                                                {rc.resolutionStatus}
                                            </span>
                                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{rc.challengeNumber}</span>
                                        </div>
                                        <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                                            {rc.title?.substring(0, 50)}{rc.title?.length > 50 ? '…' : ''}
                                        </span>
                                    </Link>
                                ))}
                                <div style={{ padding: '0.5rem 1rem' }}>
                                    <Link
                                        to={`/fieldops/challenges?projectId=${projectId}`}
                                        style={{ fontSize: '0.8rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px' }}
                                    >
                                        <ExternalLink size={13} /> View all challenges
                                    </Link>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
