import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { notificationsApi, usersApi } from '../../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import NotificationLogs from './NotificationLogs';
import './NotificationsManagement.css';

const notificationTypes = [
    { value: 'info', label: 'Info', icon: Info, color: '#3b82f6' },
    { value: 'success', label: 'Success', icon: CheckCircle, color: '#22c55e' },
    { value: 'warning', label: 'Warning', icon: AlertTriangle, color: '#f59e0b' },
    { value: 'error', label: 'Error', icon: AlertCircle, color: '#ef4444' },
    { value: 'announcement', label: 'Announcement', icon: Megaphone, color: '#6366f1' },
    { value: 'ticket', label: 'Ticket', icon: Ticket, color: '#06b6d4' },
    { value: 'system', label: 'System', icon: Settings, color: '#8b5cf6' },
];

const getTypeIcon = (type) => {
    const typeInfo = notificationTypes.find(t => t.value === type);
    if (!typeInfo) return <Info size={16} />;
    const IconComponent = typeInfo.icon;
    return <IconComponent size={16} style={{ color: typeInfo.color }} />;
};

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
        expiresAt: '',
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
                expiresAt: notification.expiresAt ? format(new Date(notification.expiresAt), "yyyy-MM-dd'T'HH:mm") : '',
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
                expiresAt: '',
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
            expiresAt: '',
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

        if (!formData.title.trim() || !formData.message.trim()) {
            toast.error('Title and message are required');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                ...formData,
                expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : null,
                userId: formData.isBroadcast ? null : formData.userId,
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
                                {filteredNotifications.map(notification => (
                                    <div key={notification._id} className="table-row">
                                        <div className="col-type" data-label="Type">
                                            <div className="type-badge">
                                                {getTypeIcon(notification.type)}
                                                <span>{notification.type}</span>
                                            </div>
                                        </div>
                                        <div className="col-title" data-label="Content">
                                            <div className="notification-title">{notification.title}</div>
                                            <div className="notification-message">
                                                {expandedIds.has(notification._id)
                                                    ? notification.message
                                                    : (notification.message?.length > 100
                                                        ? `${notification.message.substring(0, 100)}...`
                                                        : notification.message)}
                                                {notification.message?.length > 100 && (
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
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={handleCloseModal}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>
                                {editingNotification ? 'Edit Notification' : 'Create Notification'}
                            </h2>
                            <button className="close-btn" onClick={handleCloseModal}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="modal-body">
                            <div className="form-group">
                                <label>Notification Type</label>
                                <div className="type-selector">
                                    {notificationTypes.map(type => (
                                        <button
                                            key={type.value}
                                            type="button"
                                            className={`type-option ${formData.type === type.value ? 'active' : ''}`}
                                            onClick={() => setFormData(prev => ({ ...prev, type: type.value }))}
                                            style={{ '--type-color': type.color }}
                                        >
                                            <type.icon size={18} />
                                            <span>{type.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="title">Title *</label>
                                <input
                                    type="text"
                                    id="title"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleInputChange}
                                    placeholder="Enter notification title"
                                    maxLength={200}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="message">Message *</label>
                                <textarea
                                    id="message"
                                    name="message"
                                    value={formData.message}
                                    onChange={handleInputChange}
                                    placeholder="Enter notification message"
                                    rows={4}
                                    maxLength={1000}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="link">Link (Optional)</label>
                                <input
                                    type="text"
                                    id="link"
                                    name="link"
                                    value={formData.link}
                                    onChange={handleInputChange}
                                    placeholder="/tickets/123 or https://example.com"
                                />
                                <small>Users will be redirected when clicking the notification</small>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Target Audience</label>
                                    <div className="toggle-group">
                                        <button
                                            type="button"
                                            className={`toggle-btn ${formData.isBroadcast ? 'active' : ''}`}
                                            onClick={() => setFormData(prev => ({ ...prev, isBroadcast: true }))}
                                        >
                                            <Users size={16} />
                                            All Users
                                        </button>
                                        <button
                                            type="button"
                                            className={`toggle-btn ${!formData.isBroadcast ? 'active' : ''}`}
                                            onClick={() => setFormData(prev => ({ ...prev, isBroadcast: false }))}
                                        >
                                            <User size={16} />
                                            Specific User
                                        </button>
                                    </div>
                                </div>

                                {!formData.isBroadcast && (
                                    <div className="form-group">
                                        <label htmlFor="userId">Select User</label>
                                        <select
                                            id="userId"
                                            name="userId"
                                            value={formData.userId}
                                            onChange={handleInputChange}
                                            required={!formData.isBroadcast}
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
                            </div>

                            <div className="form-group">
                                <label htmlFor="expiresAt">
                                    <Calendar size={16} />
                                    Expiry Date (Optional)
                                </label>
                                <input
                                    type="datetime-local"
                                    id="expiresAt"
                                    name="expiresAt"
                                    value={formData.expiresAt}
                                    onChange={handleInputChange}
                                />
                                <small>Notification will be automatically hidden after this date</small>
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="btn-secondary" onClick={handleCloseModal}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary" disabled={saving}>
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
                </div>
            )}
        </div>
    );
}
