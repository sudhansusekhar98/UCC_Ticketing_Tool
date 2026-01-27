import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, X, Check, CheckCheck, Trash2, Info, AlertTriangle, AlertCircle, Megaphone, Ticket, Settings } from 'lucide-react';
import { notificationsApi } from '../../services/api';
import socketService from '../../services/socket';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import './NotificationBell.css';

const getNotificationIcon = (type) => {
    switch (type) {
        case 'success': return <Check size={16} className="notification-icon success" />;
        case 'warning': return <AlertTriangle size={16} className="notification-icon warning" />;
        case 'error': return <AlertCircle size={16} className="notification-icon error" />;
        case 'announcement': return <Megaphone size={16} className="notification-icon announcement" />;
        case 'ticket': return <Ticket size={16} className="notification-icon ticket" />;
        case 'system': return <Settings size={16} className="notification-icon system" />;
        default: return <Info size={16} className="notification-icon info" />;
    }
};

export default function NotificationBell() {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    // Fetch notifications
    const fetchNotifications = useCallback(async () => {
        try {
            setLoading(true);
            const [notifResponse, countResponse] = await Promise.all([
                notificationsApi.getAll({ limit: 10 }),
                notificationsApi.getUnreadCount()
            ]);
            setNotifications(notifResponse.data.data || []);
            setUnreadCount(countResponse.data.data?.count || 0);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial fetch and socket setup
    useEffect(() => {
        fetchNotifications();

        // Connect to socket for real-time notifications
        const socket = socketService.connect();

        const handleNewNotification = (notification) => {
            setNotifications(prev => [notification, ...prev.slice(0, 9)]);
            setUnreadCount(prev => prev + 1);
        };

        socketService.on('notification:new', handleNewNotification);

        return () => {
            socketService.off('notification:new', handleNewNotification);
        };
    }, [fetchNotifications]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleMarkAsRead = async (id, e) => {
        e.stopPropagation();
        try {
            await notificationsApi.markAsRead(id);
            setNotifications(prev =>
                prev.map(n => n._id === id ? { ...n, isRead: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await notificationsApi.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    };

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        try {
            await notificationsApi.delete(id);
            setNotifications(prev => prev.filter(n => n._id !== id));
            // Update unread count if deleted notification was unread
            const deleted = notifications.find(n => n._id === id);
            if (deleted && !deleted.isRead) {
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (error) {
            console.error('Failed to delete notification:', error);
        }
    };

    const handleNotificationClick = async (notification) => {
        setIsOpen(false);
        navigate(`/notifications/${notification._id}`);
    };

    return (
        <div className="notification-bell-container" ref={dropdownRef}>
            <button
                className={`notification-bell-btn ${unreadCount > 0 ? 'has-unread' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                title="Notifications"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="notification-badge">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="notification-dropdown">
                    <div className="notification-header">
                        <h3>Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                className="mark-all-read-btn"
                                onClick={handleMarkAllAsRead}
                                title="Mark all as read"
                            >
                                <CheckCheck size={16} />
                                Mark all read
                            </button>
                        )}
                    </div>

                    <div className="notification-list">
                        {loading ? (
                            <div className="notification-loading">Loading...</div>
                        ) : notifications.length === 0 ? (
                            <div className="notification-empty">
                                <Bell size={32} />
                                <p>No notifications yet</p>
                            </div>
                        ) : (
                            notifications.map(notification => (
                                <div
                                    key={notification._id}
                                    className={`notification-item ${!notification.isRead ? 'unread' : ''} ${notification.link ? 'clickable' : ''}`}
                                    onClick={() => handleNotificationClick(notification)}
                                >
                                    <div className="notification-icon-wrapper">
                                        {getNotificationIcon(notification.type)}
                                    </div>
                                    <div className="notification-content">
                                        <div className="notification-title">{notification.title}</div>
                                        <div className="notification-message">{notification.message}</div>
                                        <div className="notification-time">
                                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                        </div>
                                    </div>
                                    <div className="notification-actions">
                                        {!notification.isRead && (
                                            <button
                                                className="notification-action-btn"
                                                onClick={(e) => handleMarkAsRead(notification._id, e)}
                                                title="Mark as read"
                                            >
                                                <Check size={14} />
                                            </button>
                                        )}
                                        <button
                                            className="notification-action-btn delete"
                                            onClick={(e) => handleDelete(notification._id, e)}
                                            title="Delete"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {notifications.length > 0 && (
                        <div className="notification-footer">
                            <button onClick={() => { setIsOpen(false); navigate('/notifications'); }}>
                                View all notifications
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
