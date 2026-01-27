import { useState, useEffect, useCallback } from 'react';
import {
    Bell,
    Check,
    CheckCheck,
    Trash2,
    Info,
    CheckCircle,
    AlertTriangle,
    AlertCircle,
    Megaphone,
    Ticket,
    Settings,
    Loader,
    ArrowLeft,
} from 'lucide-react';
import { notificationsApi } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { formatDistanceToNow, format } from 'date-fns';
import './NotificationsList.css';

const getNotificationIcon = (type) => {
    const iconProps = { size: 20 };
    switch (type) {
        case 'success': return <CheckCircle {...iconProps} className="icon-success" />;
        case 'warning': return <AlertTriangle {...iconProps} className="icon-warning" />;
        case 'error': return <AlertCircle {...iconProps} className="icon-error" />;
        case 'announcement': return <Megaphone {...iconProps} className="icon-announcement" />;
        case 'ticket': return <Ticket {...iconProps} className="icon-ticket" />;
        case 'system': return <Settings {...iconProps} className="icon-system" />;
        default: return <Info {...iconProps} className="icon-info" />;
    }
};

export default function NotificationsList() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedIds, setExpandedIds] = useState(new Set());
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const navigate = useNavigate();

    const fetchNotifications = useCallback(async (pageNum = 1, append = false) => {
        try {
            setLoading(true);
            const response = await notificationsApi.getAll({ page: pageNum, limit: 20 });
            const newNotifications = response.data.data || [];
            const pagination = response.data.pagination;

            if (append) {
                setNotifications(prev => [...prev, ...newNotifications]);
            } else {
                setNotifications(newNotifications);
            }

            setHasMore(pagination ? pageNum < pagination.pages : false);
        } catch (error) {
            toast.error('Failed to load notifications');
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, []);

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

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    const handleMarkAsRead = async (id) => {
        try {
            await notificationsApi.markAsRead(id);
            setNotifications(prev =>
                prev.map(n => n._id === id ? { ...n, isRead: true } : n)
            );
        } catch (error) {
            toast.error('Failed to mark as read');
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await notificationsApi.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            toast.success('All notifications marked as read');
        } catch (error) {
            toast.error('Failed to mark all as read');
        }
    };

    const handleDelete = async (id) => {
        try {
            await notificationsApi.delete(id);
            setNotifications(prev => prev.filter(n => n._id !== id));
            toast.success('Notification deleted');
        } catch (error) {
            toast.error('Failed to delete notification');
        }
    };

    const handleNotificationClick = (notification) => {
        navigate(`/notifications/${notification._id}`);
    };

    const handleLoadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchNotifications(nextPage, true);
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <div className="notifications-list-page">
            <div className="page-header">
                <div className="header-top-nav">
                    <div className="header-icon">
                        <Bell size={24} />
                    </div>
                    <button className="back-btn" onClick={() => navigate(-1)}>
                        <ArrowLeft size={20} />
                    </button>
                </div>
                <div className="header-text">
                    <h1>My Notifications</h1>
                    <p>{notifications.length} notification{notifications.length !== 1 ? 's' : ''}</p>
                </div>
                {unreadCount > 0 && (
                    <button className="btn-secondary mark-all-btn" onClick={handleMarkAllAsRead}>
                        <CheckCheck size={18} />
                        Mark all read
                    </button>
                )}
            </div>

            <div className="notifications-container glass-card">
                {loading && notifications.length === 0 ? (
                    <div className="loading-state">
                        <Loader size={32} className="animate-spin" />
                        <p>Loading notifications...</p>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="empty-state">
                        <Bell size={48} />
                        <h3>No notifications</h3>
                        <p>You're all caught up!</p>
                    </div>
                ) : (
                    <>
                        <div className="notifications-list">
                            {notifications.map(notification => (
                                <div
                                    key={notification._id}
                                    className={`notification-card ${!notification.isRead ? 'unread' : ''} ${notification.link ? 'clickable' : ''}`}
                                    onClick={() => handleNotificationClick(notification)}
                                >
                                    <div className="notification-icon-wrapper">
                                        {getNotificationIcon(notification.type)}
                                    </div>
                                    <div className="notification-content">
                                        <div className="notification-header">
                                            <span className="notification-title">{notification.title}</span>
                                            <span className="notification-time">
                                                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                            </span>
                                        </div>
                                        <p className="notification-message">
                                            {expandedIds.has(notification._id)
                                                ? notification.message
                                                : (notification.message?.length > 100
                                                    ? `${notification.message.substring(0, 100)}...`
                                                    : notification.message)}
                                            {notification.message?.length > 100 && (
                                                <button
                                                    className="read-more-link"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleExpand(notification._id);
                                                    }}
                                                >
                                                    {expandedIds.has(notification._id) ? 'Show Less' : 'Read More'}
                                                </button>
                                            )}
                                        </p>
                                        {notification.link && (
                                            <span className="notification-link">Click to view →</span>
                                        )}
                                    </div>
                                    <div className="notification-actions">
                                        {!notification.isRead && (
                                            <button
                                                className="action-btn"
                                                onClick={(e) => { e.stopPropagation(); handleMarkAsRead(notification._id); }}
                                                title="Mark as read"
                                            >
                                                <Check size={16} />
                                            </button>
                                        )}
                                        <button
                                            className="action-btn delete"
                                            onClick={(e) => { e.stopPropagation(); handleDelete(notification._id); }}
                                            title="Delete"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {hasMore && (
                            <div className="load-more">
                                <button
                                    className="btn-secondary"
                                    onClick={handleLoadMore}
                                    disabled={loading}
                                >
                                    {loading ? 'Loading...' : 'Load more'}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
