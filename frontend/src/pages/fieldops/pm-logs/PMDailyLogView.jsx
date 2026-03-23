import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ArrowLeft,
    Calendar,
    User,
    FileText,
    CheckCircle,
    XCircle,
    TrendingUp,
    Users,
    Clock,
    MapPin,
    Camera,
    AlertCircle,
    Package,
    Edit,
    Lock,
    Unlock
} from 'lucide-react';
import { fieldOpsApi } from '../../../services/api';
import useAuthStore from '../../../context/authStore';
import toast from 'react-hot-toast';
import '../fieldops.css';

export default function PMDailyLogView() {
    const { logId } = useParams();
    const navigate = useNavigate();
    const { user, hasRole } = useAuthStore();
    const [log, setLog] = useState(null);
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadLogDetails();
    }, [logId]);

    const loadLogDetails = async () => {
        try {
            const [logRes, devicesRes] = await Promise.all([
                fieldOpsApi.getPMDailyLogById(logId),
                fieldOpsApi.getDeviceInstallations({ linkedDailyLogId: logId })
            ]);
            setLog(logRes.data.data);
            setDevices(devicesRes.data.data || []);
        } catch (error) {
            console.error('Error loading log details:', error);
            toast.error('Failed to load log details');
        } finally {
            setLoading(false);
        }
    };

    const handleUnlockRequest = async () => {
        if (!window.confirm('Request to unlock this log for editing?')) return;
        try {
            await fieldOpsApi.unlockPMDailyLog(logId);
            toast.success('Log unlocked successfully');
            loadLogDetails();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to unlock log');
        }
    };

    if (loading) {
        return (
            <div className="loading-state">
                <div className="spinner"></div>
                <p>Loading log details...</p>
            </div>
        );
    }

    if (!log) {
        return (
            <div className="empty-state">
                <AlertCircle size={48} />
                <h3>Log not found</h3>
                <Link to="/fieldops/pm-logs" className="btn btn-primary">
                    Back to Logs
                </Link>
            </div>
        );
    }

    const completedTasks = log.taskChecklist?.filter(t => t.completed).length || 0;
    const totalTasks = log.taskChecklist?.length || 0;

    return (
        <div className="page-container">
            {/* Header */}
            <div className="page-header">
                <button onClick={() => navigate(-1)} className="btn btn-ghost">
                    <ArrowLeft size={20} /> Back
                </button>
                <div>
                    <h1 className="page-title">Daily Log Details</h1>
                    <p className="page-subtitle">
                        {log.logNumber} · {log.projectId?.projectNumber}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    {log.isLocked ? (
                        hasRole(['Admin']) && (
                            <button onClick={handleUnlockRequest} className="btn btn-warning">
                                <Unlock size={18} /> Unlock
                            </button>
                        )
                    ) : (
                        <Link
                            to={`/fieldops/pm-logs/${logId}/edit`}
                            className="btn btn-primary"
                        >
                            <Edit size={18} /> Edit
                        </Link>
                    )}
                </div>
            </div>

            <div style={{ display: 'grid', gap: '1.5rem' }}>
                {/* Basic Info Card */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Log Information</h3>
                        {log.isLocked && (
                            <span className="status-badge status-badge-warning">
                                <Lock size={14} /> Locked
                            </span>
                        )}
                    </div>
                    <div className="card-body">
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                            <div className="info-item">
                                <div className="info-label">
                                    <Calendar size={16} /> Date
                                </div>
                                <div className="info-value">
                                    {new Date(log.logDate).toLocaleDateString()}
                                </div>
                            </div>
                            <div className="info-item">
                                <div className="info-label">
                                    <User size={16} /> Submitted By
                                </div>
                                <div className="info-value">
                                    {log.submittedBy?.fullName}
                                </div>
                            </div>
                            <div className="info-item">
                                <div className="info-label">
                                    <FileText size={16} /> Project
                                </div>
                                <div className="info-value">
                                    <Link to={`/fieldops/projects/${log.projectId?._id}`}>
                                        {log.projectId?.projectName}
                                    </Link>
                                </div>
                            </div>
                            <div className="info-item">
                                <div className="info-label">
                                    <TrendingUp size={16} /> Progress
                                </div>
                                <div className="info-value">
                                    {log.progressPercentage}%
                                </div>
                            </div>
                            <div className="info-item">
                                <div className="info-label">
                                    <Users size={16} /> Team Count
                                </div>
                                <div className="info-value">
                                    {log.teamCount} members
                                </div>
                            </div>
                            <div className="info-item">
                                <div className="info-label">
                                    <Clock size={16} /> Man Hours
                                </div>
                                <div className="info-value">
                                    {log.manHours} hours
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Work Summary */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Work Summary</h3>
                    </div>
                    <div className="card-body">
                        <p style={{ whiteSpace: 'pre-wrap' }}>{log.workSummary}</p>
                    </div>
                </div>

                {/* Task Checklist */}
                {log.taskChecklist && log.taskChecklist.length > 0 && (
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Task Checklist</h3>
                            <span className="badge">
                                {completedTasks} / {totalTasks} completed
                            </span>
                        </div>
                        <div className="card-body">
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {log.taskChecklist.map((task, index) => (
                                    <div key={index} className="task-item" style={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: '0.75rem',
                                        padding: '0.75rem',
                                        background: 'var(--background)',
                                        borderRadius: '6px',
                                        border: '1px solid var(--border)'
                                    }}>
                                        <div style={{ marginTop: '2px' }}>
                                            {task.completed ? (
                                                <CheckCircle size={20} style={{ color: 'var(--success-400)' }} />
                                            ) : (
                                                <XCircle size={20} style={{ color: 'var(--text-muted)' }} />
                                            )}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{
                                                fontWeight: 500,
                                                textDecoration: task.completed ? 'line-through' : 'none',
                                                color: task.completed ? 'var(--text-muted)' : 'inherit'
                                            }}>
                                                {task.taskName}
                                            </div>
                                            {task.notes && (
                                                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                                    {task.notes}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Device Installations */}
                {devices.length > 0 && (
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">
                                <Package size={20} /> Device Installations
                            </h3>
                            <span className="badge">{devices.length} devices</span>
                        </div>
                        <div className="card-body">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Device Type</th>
                                        <th>Make/Model</th>
                                        <th>Serial Number</th>
                                        <th>Installed By</th>
                                        <th>Status</th>
                                        <th>Zone</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {devices.map(device => (
                                        <tr key={device._id}>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>
                                                    {device.deviceType || device.assetType}
                                                </div>
                                            </td>
                                            <td>
                                                {device.make} {device.model}
                                            </td>
                                            <td>
                                                <code style={{ fontSize: '0.875rem' }}>
                                                    {device.serialNumber || 'N/A'}
                                                </code>
                                            </td>
                                            <td>
                                                {device.installedBy?.fullName || 'N/A'}
                                            </td>
                                            <td>
                                                <span className={`status-badge ${
                                                    device.status === 'Deployed' ? 'status-badge-success' :
                                                    device.status === 'Tested' ? 'status-badge-info' :
                                                    device.status === 'Faulty' ? 'status-badge-error' :
                                                    'status-badge-warning'
                                                }`}>
                                                    {device.status}
                                                </span>
                                            </td>
                                            <td>
                                                {device.zoneId?.zoneName || 'N/A'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Issues & Next Day Plan */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    {log.issuesFaced && (
                        <div className="card">
                            <div className="card-header">
                                <h3 className="card-title">
                                    <AlertCircle size={20} /> Issues/Blockers
                                </h3>
                            </div>
                            <div className="card-body">
                                <p style={{ whiteSpace: 'pre-wrap' }}>{log.issuesFaced}</p>
                            </div>
                        </div>
                    )}
                    {log.nextDayPlan && (
                        <div className="card">
                            <div className="card-header">
                                <h3 className="card-title">
                                    <Calendar size={20} /> Next Day Plan
                                </h3>
                            </div>
                            <div className="card-body">
                                <p style={{ whiteSpace: 'pre-wrap' }}>{log.nextDayPlan}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Photos */}
                {log.photos && log.photos.length > 0 && (
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">
                                <Camera size={20} /> Photos
                            </h3>
                            <span className="badge">{log.photos.length} photos</span>
                        </div>
                        <div className="card-body">
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                                {log.photos.map((photo, index) => (
                                    <div key={index} className="photo-card" style={{
                                        border: '1px solid var(--border)',
                                        borderRadius: '8px',
                                        overflow: 'hidden'
                                    }}>
                                        <img
                                            src={photo.url}
                                            alt={photo.caption || `Photo ${index + 1}`}
                                            style={{ width: '100%', height: '200px', objectFit: 'cover', cursor: 'pointer' }}
                                            onClick={() => window.open(photo.url, '_blank')}
                                        />
                                        {photo.caption && (
                                            <div style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                                                {photo.caption}
                                            </div>
                                        )}
                                        {photo.photoType && (
                                            <div style={{ padding: '0 0.75rem 0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                {photo.photoType}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Location */}
                {log.submissionLocation && log.submissionLocation.latitude && (
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">
                                <MapPin size={20} /> Submission Location
                            </h3>
                        </div>
                        <div className="card-body">
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <div>
                                    <strong>Coordinates:</strong> {log.submissionLocation.latitude.toFixed(6)}, {log.submissionLocation.longitude.toFixed(6)}
                                </div>
                                {log.submissionLocation.accuracy && (
                                    <div style={{ color: 'var(--text-muted)' }}>
                                        Accuracy: ±{Math.round(log.submissionLocation.accuracy)}m
                                    </div>
                                )}
                                <a
                                    href={`https://www.google.com/maps?q=${log.submissionLocation.latitude},${log.submissionLocation.longitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-sm btn-ghost"
                                >
                                    View on Map
                                </a>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
