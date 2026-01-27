import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Bell,
    ArrowLeft,
    Calendar,
    ExternalLink,
    Trash2,
    CheckCircle,
    AlertTriangle,
    AlertCircle,
    Megaphone,
    Ticket,
    Settings as SettingsIcon,
    Info
} from 'lucide-react';
import { notificationsApi } from '../../services/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import './NotificationRead.css';

const getNotificationIcon = (type) => {
    const iconProps = { size: 40 };
    switch (type) {
        case 'success': return <CheckCircle {...iconProps} className="icon-success" />;
        case 'warning': return <AlertTriangle {...iconProps} className="icon-warning" />;
        case 'error': return <AlertCircle {...iconProps} className="icon-error" />;
        case 'announcement': return <Megaphone {...iconProps} className="icon-announcement" />;
        case 'ticket': return <Ticket {...iconProps} className="icon-ticket" />;
        case 'system': return <SettingsIcon {...iconProps} className="icon-system" />;
        default: return <Info {...iconProps} className="icon-info" />;
    }
};

export default function NotificationRead() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [notification, setNotification] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNotification = async () => {
            try {
                setLoading(true);
                const response = await notificationsApi.getById(id);
                const data = response.data.data;

                if (data) {
                    setNotification(data);
                    if (!data.isRead) {
                        await notificationsApi.markAsRead(id);
                    }
                } else {
                    toast.error('Notification not found');
                    navigate('/notifications');
                }
            } catch (error) {
                console.error('Failed to fetch notification:', error);
                toast.error('Error loading notification');
                navigate('/notifications');
            } finally {
                setLoading(false);
            }
        };

        fetchNotification();
    }, [id, navigate]);

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this notification?')) return;

        try {
            await notificationsApi.delete(id);
            toast.success('Notification deleted');
            navigate('/notifications');
        } catch (error) {
            toast.error('Failed to delete notification');
        }
    };

    if (loading) {
        return (
            <div className="notification-read-page loading">
                <div className="loader"></div>
                <p>Loading notification...</p>
            </div>
        );
    }

    if (!notification) return null;

    return (
        <div className="notification-read-page animate-fade-in">
            <div className="page-header">
                <button className="back-btn" onClick={() => navigate(-1)}>
                    <ArrowLeft size={20} />
                    <span>Back</span>
                </button>
                <button className="delete-btn" onClick={handleDelete} title="Delete notification">
                    <Trash2 size={20} />
                </button>
            </div>

            <div className="notification-content-card glass-card">
                <div className="notification-main-header">
                    <div className="notification-type-icon">
                        {getNotificationIcon(notification.type)}
                    </div>
                    <div className="notification-meta">
                        <span className={`type-badge ${notification.type}`}>
                            {notification.type.toUpperCase()}
                        </span>
                        <div className="date-time">
                            <Calendar size={14} />
                            <span>{format(new Date(notification.createdAt), 'MMMM dd, yyyy - hh:mm a')}</span>
                        </div>
                    </div>
                </div>

                <div className="notification-body">
                    <h1 className="notification-title">{notification.title}</h1>
                    <div className="notification-message">
                        {notification.message}
                    </div>
                </div>

                {notification.link && (
                    <div className="notification-footer">
                        <button
                            className="action-btn-primary"
                            onClick={() => navigate(notification.link)}
                        >
                            <ExternalLink size={18} />
                            Go to reference
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
