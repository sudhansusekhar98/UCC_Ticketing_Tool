import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
    Bell,
    Plus,
    Edit2,
    Trash2,
    Search,
    Filter,
    X,
    Send,
    Users,
    User,
    Info,
    CheckCircle,
    AlertTriangle,
    AlertCircle,
    Megaphone,
    Ticket,
    Settings,
    Calendar,
    Loader,
    Mail,
    Shield,
    Bold,
    Italic,
    ImagePlus,
    Underline,
} from 'lucide-react';
import { notificationsApi, usersApi } from '../../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import DOMPurify from 'dompurify';
import NotificationLogs from './NotificationLogs';
import './NotificationsManagement.css';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

// Strips all markup for a plain-text preview. Uses DOMPurify (not raw innerHTML
// parsing) so a malicious notification body can't trigger onerror/onload handlers.
function stripHtml(html) {
    return DOMPurify.sanitize(html || '', { ALLOWED_TAGS: [] });
}

function RichMessageEditor({ value, onChange }) {
    const editorRef = useRef(null);
    const imageInputRef = useRef(null);
    const isInternalUpdate = useRef(false);

    // Seed editor with initial value on mount (handles edit mode)
    useEffect(() => {
        if (editorRef.current && value) {
            editorRef.current.innerHTML = value;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // mount only

    // Clear editor when parent resets value to empty (modal close/reset)
    useEffect(() => {
        const editor = editorRef.current;
        if (!editor) return;
        if (!value && editor.innerHTML !== '') {
            editor.innerHTML = '';
        }
    }, [value]);

    const sync = useCallback(() => {
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    }, [onChange]);

    const execCmd = (cmd, val = null) => {
        editorRef.current?.focus();
        document.execCommand(cmd, false, val);
        sync();
    };

    const insertImageDataUrl = (dataUrl) => {
        editorRef.current?.focus();
        document.execCommand(
            'insertHTML', false,
            `<img src="${dataUrl}" class="notif-inline-img" />`
        );
        sync();
    };

    const handlePaste = (e) => {
        const items = Array.from(e.clipboardData?.items || []);
        const imgItem = items.find(i => i.type.startsWith('image/'));
        if (!imgItem) return; // let default paste happen for text

        e.preventDefault();
        const blob = imgItem.getAsFile();
        if (blob.size > MAX_IMAGE_BYTES) {
            toast.error('Image exceeds 5 MB limit');
            return;
        }
        const reader = new FileReader();
        reader.onload = (evt) => insertImageDataUrl(evt.target.result);
        reader.readAsDataURL(blob);
    };

    const handleImageFile = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > MAX_IMAGE_BYTES) {
            toast.error('Image exceeds 5 MB limit');
            return;
        }
        const reader = new FileReader();
        reader.onload = (evt) => insertImageDataUrl(evt.target.result);
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const isEmpty = !stripHtml(value).trim();

    return (
        <div className="rich-editor-wrapper">
            {/* Toolbar */}
            <div className="rich-editor-toolbar">
                <button type="button" title="Bold" className="rtb-btn" onMouseDown={e => { e.preventDefault(); execCmd('bold'); }}>
                    <Bold size={14} />
                </button>
                <button type="button" title="Italic" className="rtb-btn" onMouseDown={e => { e.preventDefault(); execCmd('italic'); }}>
                    <Italic size={14} />
                </button>
                <button type="button" title="Underline" className="rtb-btn" onMouseDown={e => { e.preventDefault(); execCmd('underline'); }}>
                    <Underline size={14} />
                </button>
                <div className="rtb-divider" />
                <button
                    type="button"
                    title="Attach image"
                    className="rtb-btn rtb-img-btn"
                    onClick={() => imageInputRef.current?.click()}
                >
                    <ImagePlus size={14} />
                    <span>Image</span>
                </button>
                <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleImageFile}
                />
            </div>

            {/* Editable body */}
            <div
                ref={editorRef}
                className="rich-editor-body"
                contentEditable
                suppressContentEditableWarning
                onInput={sync}
                onPaste={handlePaste}
                data-placeholder="Enter notification message - paste or attach images inline…"
                aria-label="Message"
                aria-multiline="true"
                role="textbox"
            />
            {isEmpty && (
                <div className="rich-editor-placeholder" aria-hidden="true">
                    Enter notification message - paste or attach images inline…
                </div>
            )}
        </div>
    );
}

const notificationTypes = [
    { value: 'info', label: 'Info', icon: Info, color: '#3b82f6' },
    { value: 'success', label: 'Success', icon: CheckCircle, color: '#22c55e' },
    { value: 'warning', label: 'Warning', icon: AlertTriangle, color: '#f59e0b' },
    { value: 'error', label: 'Error', icon: AlertCircle, color: '#ef4444' },
    { value: 'announcement', label: 'Announcement', icon: Megaphone, color: '#6366f1' },
    { value: 'ticket', label: 'Ticket', icon: Ticket, color: '#06b6d4' },
    { value: 'system', label: 'System', icon: Settings, color: '#8b5cf6' },
];



export default function NotificationsManagement() {
    const [notifications, setNotifications] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [showModal, setShowModal] = useState(false);
    const [editingNotification, setEditingNotification] = useState(null);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('notifications'); // notifications | logs
    const [expandedIds, setExpandedIds] = useState(new Set());

    // Form state
    const [formData, setFormData] = useState({
        title: '',
        message: '',
        type: 'info',
        link: '',
        isBroadcast: true,
        userId: '',
        targetRoles: [],
        expiresAt: '',
        sendEmail: false,
    });

    useEffect(() => {
        fetchNotifications();
        fetchUsers();
    }, []);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const response = await notificationsApi.getAll({ limit: 100 });
            setNotifications(response.data?.data || []);
        } catch (error) {
            toast.error('Failed to load notifications');
            console.error(error);
            setNotifications([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const response = await usersApi.getAll({ limit: 100 });
            setUsers(response.data?.data || []);
        } catch (error) {
            console.error('Failed to load users', error);
            setUsers([]);
        }
    };

    const handleOpenModal = (notification = null) => {
        if (notification) {
            setEditingNotification(notification);
            setFormData({
                title: notification.title || '',
                message: notification.message || '',
                type: notification.type || 'info',
                link: notification.link || '',
                isBroadcast: notification.isBroadcast || false,
                userId: notification.userId || '',
                targetRoles: notification.targetRoles || [],
                expiresAt: notification.expiresAt ? format(new Date(notification.expiresAt), "yyyy-MM-dd'T'HH:mm") : '',
                sendEmail: false, // Default to false for edits
            });
        } else {
            setEditingNotification(null);
            setFormData({
                title: '',
                message: '',
                type: 'info',
                link: '',
                isBroadcast: true,
                userId: '',
                targetRoles: [],
                expiresAt: '',
                sendEmail: false,
            });
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingNotification(null);
        setFormData({
            title: '',
            message: '',
            type: 'info',
            link: '',
            isBroadcast: true,
            userId: '',
            targetRoles: [],
            expiresAt: '',
            sendEmail: false,
        });
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const toggleExpand = (id) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.title.trim() || !stripHtml(formData.message).trim()) {
            toast.error('Title and message are required');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                ...formData,
                expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : null,
                userId: (formData.isBroadcast || formData.targetRoles.length > 0) ? null : formData.userId,
                targetRoles: formData.isBroadcast ? [] : formData.targetRoles,
            };

            if (editingNotification) {
                // For now, we'll delete and recreate since there's no update endpoint
                await notificationsApi.delete(editingNotification._id);
                await notificationsApi.create(payload);
                toast.success('Notification updated successfully');
            } else {
                await notificationsApi.create(payload);
                toast.success('Notification created and sent successfully');
            }

            handleCloseModal();
            fetchNotifications();
        } catch (error) {
            toast.error('Failed to save notification');
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this notification?')) {
            return;
        }

        try {
            await notificationsApi.delete(id);
            toast.success('Notification deleted');
            setNotifications(prev => prev.filter(n => n._id !== id));
        } catch (error) {
            toast.error('Failed to delete notification');
            console.error(error);
        }
    };

    const filteredNotifications = notifications.filter(notification => {
        const matchesSearch =
            notification.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            notification.message?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = filterType === 'all' || notification.type === filterType;
        return matchesSearch && matchesType;
    });

    return (
        <div className="notifications-management">
            <div className="page-header">
                <div className="header-content">
                    <div className="header-icon">
                        <Bell size={24} />
                    </div>
                    <div>
                        <h1>Notifications Management</h1>
                        <p>Create and manage announcements and notifications</p>
                    </div>
                </div>
                <div className="header-actions">
                    <div className="tab-switcher">
                        <button
                            className={`tab-btn ${activeTab === 'notifications' ? 'active' : ''}`}
                            onClick={() => setActiveTab('notifications')}
                        >
                            Notifications
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
                            onClick={() => setActiveTab('logs')}
                        >
                            Logs
                        </button>
                    </div>
                    {activeTab === 'notifications' && (
                        <button className="btn-primary" onClick={() => handleOpenModal()}>
                            <Plus size={18} />
                            Create Notification
                        </button>
                    )}
                </div>
            </div>

            {activeTab === 'logs' ? (
                <NotificationLogs embedded={true} />
            ) : (
                <>
                    {/* Filters */}
                    <div className="filters-bar glass-card">
                        <div className="search-box">
                            <Search size={18} />
                            <input
                                type="text"
                                placeholder="Search notifications..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="filter-controls">
                            <div className="filter-select-wrapper">
                                <Filter size={16} />
                                <select
                                    className="filter-select"
                                    value={filterType}
                                    onChange={(e) => setFilterType(e.target.value)}
                                >
                                    <option value="all">All Types</option>
                                    {notificationTypes.map(type => (
                                        <option key={type.value} value={type.value}>{type.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="results-count">
                                <span>{filteredNotifications.length}</span> results
                            </div>
                        </div>
                    </div>

                    {/* Notifications List */}
                    <div className="notifications-list glass-card">
                        {loading ? (
                            <div className="loading-state">
                                <Loader size={32} className="animate-spin" />
                                <p>Loading notifications...</p>
                            </div>
                        ) : filteredNotifications.length === 0 ? (
                            <div className="empty-state">
                                <Bell size={48} />
                                <h3>No notifications found</h3>
                                <p>Create your first notification to get started</p>
                                <button className="btn-primary" onClick={() => handleOpenModal()}>
                                    <Plus size={18} />
                                    Create Notification
                                </button>
                            </div>
                        ) : (
                            <div className="notifications-table">
                                <div className="table-header">
                                    <div className="col-type">Type</div>
                                    <div className="col-title">Title & Message</div>
                                    <div className="col-target">Target</div>
                                    <div className="col-date">Created</div>
                                    <div className="col-status">Status</div>
                                    <div className="col-actions">Actions</div>
                                </div>
                                {filteredNotifications.map(notification => {
                                    const typeInfo = notificationTypes.find(t => t.value === notification.type) || notificationTypes[0];
                                    const TypeIcon = typeInfo.icon;

                                    return (
                                        <div key={notification._id} className="table-row">
                                            <div className="col-type" data-label="Type">
                                                <div
                                                    className="type-badge"
                                                    style={{
                                                        color: typeInfo.color,
                                                        backgroundColor: `${typeInfo.color}15`,
                                                        borderColor: `${typeInfo.color}30`
                                                    }}
                                                >
                                                    <TypeIcon size={14} />
                                                    <span>{notification.type}</span>
                                                </div>
                                            </div>
                                            <div className="col-title" data-label="Content">
                                                <div className="notification-title">{notification.title}</div>
                                                <div className="notification-message">
                                                    {(() => {
                                                        const plain = stripHtml(notification.message);
                                                        return expandedIds.has(notification._id)
                                                            ? plain
                                                            : plain.length > 100 ? `${plain.substring(0, 100)}…` : plain;
                                                    })()}
                                                    {stripHtml(notification.message).length > 100 && (
                                                        <button
                                                            className="read-more-btn"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleExpand(notification._id);
                                                            }}
                                                        >
                                                            {expandedIds.has(notification._id) ? 'Show Less' : 'Read More'}
                                                        </button>
                                                    )}
                                                </div>
                                                {notification.link && (
                                                    <div className="notification-link">
                                                        🔗 {notification.link}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="col-target" data-label="Target">
                                                {notification.isBroadcast ? (
                                                    <span className="target-badge broadcast">
                                                        <Users size={14} />
                                                        All Users
                                                    </span>
                                                ) : notification.targetRoles?.length > 0 ? (
                                                    <span className="target-badge roles">
                                                        <Shield size={14} />
                                                        {notification.targetRoles.length} Roles
                                                    </span>
                                                ) : (
                                                    <span className="target-badge specific">
                                                        <User size={14} />
                                                        Specific User
                                                    </span>
                                                )}
                                            </div>
                                            <div className="col-date" data-label="Date">
                                                {format(new Date(notification.createdAt), 'MMM dd, yyyy')}
                                                <div className="date-time">
                                                    {format(new Date(notification.createdAt), 'HH:mm')}
                                                </div>
                                            </div>
                                            <div className="col-status" data-label="Status">
                                                {notification.expiresAt && new Date(notification.expiresAt) < new Date() ? (
                                                    <span className="status-badge expired">Expired</span>
                                                ) : (
                                                    <span className="status-badge active">Active</span>
                                                )}
                                            </div>
                                            <div className="col-actions">
                                                <button
                                                    className="action-btn edit"
                                                    onClick={() => handleOpenModal(notification)}
                                                    title="Edit"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    className="action-btn delete"
                                                    onClick={() => handleDelete(notification._id)}
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Create/Edit Modal */}
            {showModal && createPortal(
                <div className="modal-overlay" onClick={handleCloseModal}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>
                                {editingNotification ? 'Edit Notification' : 'Create Notification'}
                            </h2>
                            <button className="btn btn-ghost btn-icon" onClick={handleCloseModal}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label" id="type-selector-label">Notification Type</label>
                                    <div
                                        className="type-selector"
                                        role="radiogroup"
                                        aria-labelledby="type-selector-label"
                                    >
                                        {notificationTypes.map((type, index) => {
                                            const isActive = formData.type === type.value;
                                            const TypeIcon = type.icon;
                                            return (
                                                <button
                                                    key={type.value}
                                                    type="button"
                                                    role="radio"
                                                    aria-checked={isActive}
                                                    tabIndex={isActive ? 0 : -1}
                                                    className={`type-option ${isActive ? 'active' : ''}`}
                                                    onClick={() => setFormData(prev => ({ ...prev, type: type.value }))}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                                                            e.preventDefault();
                                                            const nextIndex = (index + 1) % notificationTypes.length;
                                                            setFormData(prev => ({ ...prev, type: notificationTypes[nextIndex].value }));
                                                        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                                                            e.preventDefault();
                                                            const prevIndex = (index - 1 + notificationTypes.length) % notificationTypes.length;
                                                            setFormData(prev => ({ ...prev, type: notificationTypes[prevIndex].value }));
                                                        }
                                                    }}
                                                    style={{
                                                        '--type-color': type.color,
                                                        '--type-color-bg': `${type.color}15`,
                                                        '--type-color-border': `${type.color}50`
                                                    }}
                                                >
                                                    <TypeIcon size={20} />
                                                    <span className="type-label">{type.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label" htmlFor="title">Title *</label>
                                    <input
                                        type="text"
                                        id="title"
                                        name="title"
                                        className="form-input"
                                        value={formData.title}
                                        onChange={handleInputChange}
                                        placeholder="Enter notification title"
                                        maxLength={200}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Message *</label>
                                    <RichMessageEditor
                                        value={formData.message}
                                        onChange={(html) => setFormData(prev => ({ ...prev, message: html }))}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label" htmlFor="link">Link (Optional)</label>
                                    <input
                                        type="text"
                                        id="link"
                                        name="link"
                                        className="form-input"
                                        value={formData.link}
                                        onChange={handleInputChange}
                                        placeholder="/tickets/123 or https://example.com"
                                    />
                                    <small>Users will be redirected when clicking the notification</small>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Target Audience</label>
                                        <div className="audience-toggle">
                                            <button
                                                type="button"
                                                className={`audience-option ${formData.isBroadcast ? 'active' : ''}`}
                                                onClick={() => setFormData(prev => ({ ...prev, isBroadcast: true, targetRoles: [], userId: '' }))}
                                            >
                                                <Users size={18} />
                                                <span>All Users</span>
                                            </button>
                                            <button
                                                type="button"
                                                className={`audience-option ${!formData.isBroadcast && formData.targetRoles.length > 0 ? 'active' : ''}`}
                                                onClick={() => setFormData(prev => ({ ...prev, isBroadcast: false, targetRoles: prev.targetRoles.length > 0 ? prev.targetRoles : ['L1Engineer'], userId: '' }))}
                                            >
                                                <Shield size={18} />
                                                <span>Roles</span>
                                            </button>
                                            <button
                                                type="button"
                                                className={`audience-option ${!formData.isBroadcast && formData.targetRoles.length === 0 ? 'active' : ''}`}
                                                onClick={() => setFormData(prev => ({ ...prev, isBroadcast: false, targetRoles: [], userId: prev.userId || '' }))}
                                            >
                                                <User size={18} />
                                                <span>Specific</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {!formData.isBroadcast && formData.targetRoles.length > 0 && (
                                    <div className="form-group">
                                        <label className="form-label">Select Roles</label>
                                        <div className="role-selector">
                                            {['Admin', 'Supervisor', 'Dispatcher', 'L1Engineer', 'L2Engineer', 'ClientViewer'].map(role => (
                                                <label key={role} className="role-checkbox">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.targetRoles.includes(role)}
                                                        onChange={(e) => {
                                                            const roles = e.target.checked
                                                                ? [...formData.targetRoles, role]
                                                                : formData.targetRoles.filter(r => r !== role);
                                                            setFormData(prev => ({ ...prev, targetRoles: roles }));
                                                        }}
                                                    />
                                                    <span>{role}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {!formData.isBroadcast && formData.targetRoles.length === 0 && (
                                    <div className="form-group">
                                        <label className="form-label" htmlFor="userId">Select User</label>
                                        <select
                                            id="userId"
                                            name="userId"
                                            className="form-select"
                                            value={formData.userId}
                                            onChange={handleInputChange}
                                            required={!formData.isBroadcast && formData.targetRoles.length === 0}
                                        >
                                            <option value="">Select a user...</option>
                                            {users.map(user => (
                                                <option key={user._id} value={user._id}>
                                                    {user.fullName} ({user.role})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div className="form-group">
                                    <label className="form-label" htmlFor="expiresAt">
                                        <Calendar size={14} />
                                        Expiry Date (Optional)
                                    </label>
                                    <input
                                        type="datetime-local"
                                        id="expiresAt"
                                        name="expiresAt"
                                        className="form-input"
                                        value={formData.expiresAt}
                                        onChange={handleInputChange}
                                    />
                                    <small>Notification will be automatically hidden after this date</small>
                                </div>

                                <div className={`email-notification-toggle ${formData.sendEmail ? 'active' : ''}`}>
                                    <div className="email-toggle-icon">
                                        <Mail size={20} />
                                    </div>
                                    <div className="email-toggle-main">
                                        <label className="email-toggle-header">
                                            <input
                                                type="checkbox"
                                                name="sendEmail"
                                                checked={formData.sendEmail}
                                                onChange={handleInputChange}
                                            />
                                            <span className="email-toggle-title">Send via Email</span>
                                        </label>
                                        <div className="email-toggle-description">
                                            {formData.isBroadcast
                                                ? 'All system users will receive an email copy.'
                                                : formData.targetRoles.length > 0
                                                    ? `All users with ${formData.targetRoles.length} selected role(s) will receive an email copy.`
                                                    : 'Selected user will receive an email copy.'
                                            }
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="btn btn-ghost" onClick={handleCloseModal}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? (
                                        <>
                                            <Loader size={18} className="animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Send size={18} />
                                            {editingNotification ? 'Update & Send' : 'Create & Send'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
