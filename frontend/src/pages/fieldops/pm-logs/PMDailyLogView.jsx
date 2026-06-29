import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ArrowLeft, Calendar, User, FileText, CheckCircle, XCircle,
    TrendingUp, Users, Clock, MapPin, Camera, AlertCircle,
    Package, Edit, Lock, Unlock, ExternalLink, ChevronRight, Activity
} from 'lucide-react';
import { fieldOpsApi } from '../../../services/api';
import useAuthStore from '../../../context/authStore';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import '../fieldops.css';

const deviceStatusColors = {
    Deployed: 'status-badge-success',
    Tested: 'status-badge-info',
    Faulty: 'status-badge-danger',
    Installed: 'status-badge-warning',
};

/* ── tiny helper components ── */
function MetricItem({ icon, label, value, color = 'var(--primary-400,#60a5fa)' }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0 }}>
            <span style={{ color, flexShrink: 0, display: 'flex' }}>{icon}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{label}</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{value}</span>
        </div>
    );
}

function SectionTitle({ icon, title, badge }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <span style={{ color: 'var(--primary-400,#60a5fa)', display: 'flex' }}>{icon}</span>
                <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>{title}</h3>
            </div>
            {badge !== undefined && (
                <span style={{
                    fontSize: '0.7rem', fontWeight: 700,
                    background: 'rgba(59,130,246,0.1)', color: 'var(--primary-400,#60a5fa)',
                    padding: '0.15rem 0.55rem', borderRadius: 20, flexShrink: 0
                }}>
                    {badge}
                </span>
            )}
        </div>
    );
}

export default function PMDailyLogView() {
    const { logId } = useParams();
    const navigate = useNavigate();
    const { hasRole } = useAuthStore();
    const [log, setLog] = useState(null);
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lightboxUrl, setLightboxUrl] = useState(null);

    useEffect(() => { loadLogDetails(); }, [logId]);

    const loadLogDetails = async () => {
        try {
            const [logRes, devicesRes] = await Promise.all([
                fieldOpsApi.getPMDailyLogById(logId),
                fieldOpsApi.getDeviceInstallations({ linkedDailyLogId: logId })
            ]);
            setLog(logRes.data.data);
            setDevices(devicesRes.data.data || []);
        } catch {
            toast.error('Failed to load log details');
        } finally {
            setLoading(false);
        }
    };

    const handleUnlockRequest = async () => {
        if (!window.confirm('Unlock this log for editing?')) return;
        try {
            await fieldOpsApi.unlockPMDailyLog(logId);
            toast.success('Log unlocked');
            loadLogDetails();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to unlock log');
        }
    };

    if (loading) {
        return (
            <div className="page-container">
                <div className="loading-state"><div className="spinner" /><p>Loading log details…</p></div>
            </div>
        );
    }

    if (!log) {
        return (
            <div className="page-container">
                <div className="empty-state">
                    <AlertCircle size={40} />
                    <h3>Log not found</h3>
                    <Link to="/fieldops/pm-logs" className="btn btn-primary">Back to Logs</Link>
                </div>
            </div>
        );
    }

    const completedTasks = log.taskChecklist?.filter(t => t.completed).length || 0;
    const totalTasks = log.taskChecklist?.length || 0;
    const checklistPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const progressColor = log.progressPercentage >= 75
        ? 'var(--success-500,#10b981)'
        : log.progressPercentage >= 40
        ? 'var(--primary-500,#3b82f6)'
        : 'var(--warning-500,#f59e0b)';

    return (
        <div className="page-container animate-fade-in">

            {/* ── Header ── */}
            <div className="project-detail-header">
                <div className="project-info">
                    <div className="header-left">
                        <button onClick={() => navigate(-1)} className="btn btn-ghost">
                            <ArrowLeft size={18} />
                        </button>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 style={{ fontSize: '1.2rem' }}>{log.logNumber}</h1>
                                {log.isLocked
                                    ? <span className="status-badge status-badge-warning"><Lock size={11} /> Locked</span>
                                    : <span className="status-badge status-badge-success"><Unlock size={11} /> Editable</span>
                                }
                            </div>
                            <div className="project-meta">
                                <span className="project-meta-item">
                                    <Calendar size={13} />
                                    {format(new Date(log.logDate), 'EEEE, dd MMM yyyy')}
                                </span>
                                {log.projectId && (
                                    <Link
                                        to={`/fieldops/projects/${log.projectId._id}`}
                                        className="project-meta-item"
                                        style={{ textDecoration: 'none', color: 'inherit' }}
                                    >
                                        <FileText size={13} />
                                        {log.projectId.projectName}
                                        <ChevronRight size={11} style={{ opacity: 0.45 }} />
                                    </Link>
                                )}
                                <span className="project-meta-item">
                                    <User size={13} /> {log.submittedBy?.fullName}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="header-actions">
                    {log.isLocked
                        ? hasRole(['Admin']) && (
                            <button onClick={handleUnlockRequest} className="btn btn-ghost btn-sm">
                                <Unlock size={15} /> Unlock
                            </button>
                        )
                        : (
                            <Link to={`/fieldops/pm-logs/${logId}/edit`} className="btn btn-primary btn-sm">
                                <Edit size={15} /> Edit
                            </Link>
                        )
                    }
                </div>
            </div>

            {/* ── main content column ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>

                {/* Compact metrics strip */}
                <div className="glass-card" style={{ padding: '0.75rem 1.1rem' }}>
                    <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <MetricItem icon={<TrendingUp size={14} />} label="Progress" value={`${log.progressPercentage}%`} color="#3b82f6" />
                        <div style={{ width: 1, height: 18, background: 'var(--border-light,rgba(148,163,184,0.15))' }} />
                        <MetricItem icon={<Clock size={14} />} label="Man Hours" value={`${log.manHours}h`} color="#10b981" />
                        <div style={{ width: 1, height: 18, background: 'var(--border-light,rgba(148,163,184,0.15))' }} />
                        <MetricItem icon={<Users size={14} />} label="Team" value={`${log.teamCount} members`} color="#8b5cf6" />
                        <div style={{ width: 1, height: 18, background: 'var(--border-light,rgba(148,163,184,0.15))' }} />
                        <MetricItem icon={<Package size={14} />} label="Devices" value={devices.length} color="#f59e0b" />
                        {totalTasks > 0 && (
                            <>
                                <div style={{ width: 1, height: 18, background: 'var(--border-light,rgba(148,163,184,0.15))' }} />
                                <MetricItem icon={<CheckCircle size={14} />} label="Tasks" value={`${completedTasks}/${totalTasks}`} color="#06b6d4" />
                            </>
                        )}
                        {log.photos?.length > 0 && (
                            <>
                                <div style={{ width: 1, height: 18, background: 'var(--border-light,rgba(148,163,184,0.15))' }} />
                                <MetricItem icon={<Camera size={14} />} label="Photos" value={log.photos.length} color="#ec4899" />
                            </>
                        )}
                    </div>
                </div>

                {/* Activity Entries */}
                {log.activityEntries?.length > 0 && (
                    <div className="glass-card" style={{ padding: '1rem 1.1rem' }}>
                        <SectionTitle icon={<Activity size={15} />} title="Activities Worked" badge={log.activityEntries.length} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {log.activityEntries.map((entry, ei) => (
                                <div key={ei} style={{
                                    paddingBottom: ei < log.activityEntries.length - 1 ? '0.75rem' : 0,
                                    borderBottom: ei < log.activityEntries.length - 1 ? '1px solid var(--border-light,rgba(148,163,184,0.1))' : 'none'
                                }}>
                                    <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.35rem', color: 'var(--text-primary)' }}>
                                        {entry.activityTitle}
                                    </div>
                                    {entry.progressNote && (
                                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.4rem', fontStyle: 'italic' }}>
                                            {entry.progressNote}
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                        {(entry.tasksWorked || []).map((tw, ti) => (
                                            <div key={ti} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', fontSize: '0.8rem' }}>
                                                <span style={{ flexShrink: 0, marginTop: 1 }}>
                                                    {tw.completed
                                                        ? <CheckCircle size={13} style={{ color: 'var(--success-500,#10b981)' }} />
                                                        : <XCircle size={13} style={{ color: 'var(--text-muted)', opacity: 0.45 }} />
                                                    }
                                                </span>
                                                <div style={{ flex: 1 }}>
                                                    <span style={{
                                                        color: tw.completed ? 'var(--text-muted)' : 'var(--text-primary)',
                                                        textDecoration: tw.completed ? 'line-through' : 'none'
                                                    }}>
                                                        {tw.taskTitle}
                                                    </span>
                                                    {tw.delayReason && (
                                                        <div style={{ color: 'var(--warning-500,#f59e0b)', fontSize: '0.72rem', marginTop: 2 }}>
                                                            Delay: {tw.delayReason}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Work Summary */}
                <div className="glass-card" style={{ padding: '1rem 1.1rem' }}>
                    <SectionTitle icon={<FileText size={15} />} title="Work Summary" />
                    <div style={{
                        background: 'var(--bg-secondary,rgba(148,163,184,0.05))',
                        borderLeft: '3px solid var(--primary-400,#60a5fa)',
                        borderRadius: '0 6px 6px 0',
                        padding: '0.75rem 1rem',
                        fontSize: '0.875rem',
                        lineHeight: 1.65,
                        color: 'var(--text-secondary)',
                        whiteSpace: 'pre-wrap'
                    }}>
                        {log.workSummary || <em style={{ color: 'var(--text-muted)' }}>No summary provided.</em>}
                    </div>
                </div>

                {/* Progress bar + Task Checklist - side by side */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>

                    {/* Progress */}
                    <div className="glass-card" style={{ padding: '1rem 1.1rem' }}>
                        <SectionTitle icon={<TrendingUp size={15} />} title="Daily Progress" />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                            <div style={{ flex: 1 }}>
                                <div className="progress-bar-container" style={{ height: 8, borderRadius: 5 }}>
                                    <div className="progress-bar" style={{
                                        width: `${log.progressPercentage}%`, height: 8, borderRadius: 5,
                                        background: progressColor,
                                        transition: 'width 0.7s cubic-bezier(0.4,0,0.2,1)'
                                    }} />
                                </div>
                            </div>
                            <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', minWidth: 40, textAlign: 'right' }}>
                                {log.progressPercentage}%
                            </span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            Submitted by {log.submittedBy?.fullName} · {format(new Date(log.logDate), 'dd MMM yyyy')}
                        </div>

                        {log.submissionLocation?.latitude && (
                            <div style={{
                                marginTop: '0.875rem', paddingTop: '0.875rem',
                                borderTop: '1px solid var(--border-light,rgba(148,163,184,0.1))',
                                display: 'flex', flexDirection: 'column', gap: '0.35rem'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                    <MapPin size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                                    <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        GPS
                                    </span>
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                                    {log.submissionLocation.latitude.toFixed(5)}, {log.submissionLocation.longitude.toFixed(5)}
                                    {log.submissionLocation.accuracy && (
                                        <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>
                                            ±{Math.round(log.submissionLocation.accuracy)}m
                                        </span>
                                    )}
                                </div>
                                <a
                                    href={`https://www.google.com/maps?q=${log.submissionLocation.latitude},${log.submissionLocation.longitude}`}
                                    target="_blank" rel="noopener noreferrer"
                                    className="btn btn-ghost"
                                    style={{ alignSelf: 'flex-start', padding: '0.25rem 0.6rem', fontSize: '0.75rem', marginTop: '0.1rem' }}
                                >
                                    <ExternalLink size={12} /> View on Map
                                </a>
                            </div>
                        )}
                    </div>

                    {/* Task Checklist */}
                    <div className="glass-card" style={{ padding: '1rem 1.1rem' }}>
                        <SectionTitle
                            icon={<CheckCircle size={15} />}
                            title="Task Checklist"
                            badge={totalTasks > 0 ? `${completedTasks}/${totalTasks}` : undefined}
                        />
                        {totalTasks > 0 ? (
                            <>
                                <div className="progress-bar-container" style={{ height: 3, marginBottom: '0.75rem', borderRadius: 3 }}>
                                    <div className="progress-bar" style={{
                                        width: `${checklistPct}%`, height: 3, borderRadius: 3,
                                        background: checklistPct === 100 ? 'var(--success-500,#10b981)' : 'var(--primary-500,#3b82f6)'
                                    }} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: 240, overflowY: 'auto' }}>
                                    {log.taskChecklist.map((task, i) => (
                                        <div key={i} style={{
                                            display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
                                            padding: '0.45rem 0.6rem',
                                            background: task.completed ? 'rgba(16,185,129,0.05)' : 'transparent',
                                            borderRadius: 6,
                                            border: `1px solid ${task.completed ? 'rgba(16,185,129,0.18)' : 'var(--border-light,rgba(148,163,184,0.08))'}`,
                                        }}>
                                            <span style={{ flexShrink: 0, marginTop: 1 }}>
                                                {task.completed
                                                    ? <CheckCircle size={14} style={{ color: 'var(--success-500,#10b981)' }} />
                                                    : <XCircle size={14} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
                                                }
                                            </span>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{
                                                    fontSize: '0.8rem', fontWeight: 500,
                                                    color: task.completed ? 'var(--text-muted)' : 'var(--text-primary)',
                                                    textDecoration: task.completed ? 'line-through' : 'none'
                                                }}>
                                                    {task.taskName}
                                                </div>
                                                {task.notes && (
                                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 1 }}>
                                                        {task.notes}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>
                                No tasks recorded.
                            </p>
                        )}
                    </div>
                </div>

                {/* Issues + Next Day Plan */}
                {(log.issuesFaced || log.nextDayPlan) && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: '0.875rem' }}>
                        {log.issuesFaced && (
                            <div className="glass-card" style={{
                                padding: '1rem 1.1rem',
                                borderLeft: '3px solid var(--danger-500,#ef4444)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem' }}>
                                    <AlertCircle size={14} style={{ color: 'var(--danger-500,#ef4444)', flexShrink: 0 }} />
                                    <h4 style={{ margin: 0, fontSize: '0.82rem', fontWeight: 700, color: 'var(--danger-500,#ef4444)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                        Issues / Blockers
                                    </h4>
                                </div>
                                <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.6, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                                    {log.issuesFaced}
                                </p>
                            </div>
                        )}
                        {log.nextDayPlan && (
                            <div className="glass-card" style={{
                                padding: '1rem 1.1rem',
                                borderLeft: '3px solid var(--primary-400,#60a5fa)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem' }}>
                                    <Calendar size={14} style={{ color: 'var(--primary-400,#60a5fa)', flexShrink: 0 }} />
                                    <h4 style={{ margin: 0, fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary-400,#60a5fa)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                        Next Day Plan
                                    </h4>
                                </div>
                                <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.6, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                                    {log.nextDayPlan}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Device Installations */}
                {devices.length > 0 && (
                    <div className="glass-card" style={{ padding: '1rem 1.1rem' }}>
                        <SectionTitle
                            icon={<Package size={15} />}
                            title="Device Installations"
                            badge={`${devices.length} device${devices.length !== 1 ? 's' : ''}`}
                        />
                        <div className="table-responsive">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Device Type</th>
                                        <th>Make / Model</th>
                                        <th>Serial No.</th>
                                        <th>Installed By</th>
                                        <th>Zone</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {devices.map(device => (
                                        <tr key={device._id}>
                                            <td style={{ fontWeight: 600 }}>{device.deviceType || device.assetType}</td>
                                            <td>{device.make} {device.model}</td>
                                            <td>
                                                <code style={{
                                                    fontSize: '0.78rem',
                                                    background: 'var(--bg-secondary,rgba(148,163,184,0.08))',
                                                    padding: '0.1rem 0.35rem', borderRadius: 4
                                                }}>
                                                    {device.serialNumber || '-'}
                                                </code>
                                            </td>
                                            <td>{device.installedBy?.fullName || '-'}</td>
                                            <td>{device.zoneId?.zoneName || '-'}</td>
                                            <td>
                                                <span className={`status-badge ${deviceStatusColors[device.status] || 'status-badge-info'}`}>
                                                    {device.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Photos */}
                {log.photos?.length > 0 && (
                    <div className="glass-card" style={{ padding: '1rem 1.1rem' }}>
                        <SectionTitle
                            icon={<Camera size={15} />}
                            title="Site Photos"
                            badge={`${log.photos.length} photo${log.photos.length !== 1 ? 's' : ''}`}
                        />
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: '0.625rem' }}>
                            {log.photos.map((photo, i) => (
                                <div
                                    key={i}
                                    onClick={() => setLightboxUrl(photo.url)}
                                    style={{
                                        borderRadius: 8, overflow: 'hidden',
                                        border: '1px solid var(--border-light,rgba(148,163,184,0.12))',
                                        cursor: 'pointer',
                                        transition: 'transform 0.12s, box-shadow 0.12s',
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.transform = 'scale(1.025)';
                                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.22)';
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.transform = 'scale(1)';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}
                                >
                                    <img
                                        src={photo.url}
                                        alt={photo.caption || `Photo ${i + 1}`}
                                        style={{ width: '100%', height: 130, objectFit: 'cover', display: 'block' }}
                                    />
                                    {(photo.caption || photo.photoType) && (
                                        <div style={{ padding: '0.4rem 0.6rem', background: 'var(--bg-card,rgba(15,23,42,0.7))' }}>
                                            {photo.caption && (
                                                <div style={{
                                                    fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-primary)',
                                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                                }}>
                                                    {photo.caption}
                                                </div>
                                            )}
                                            {photo.photoType && (
                                                <div style={{
                                                    fontSize: '0.65rem', color: 'var(--text-muted)',
                                                    textTransform: 'uppercase', letterSpacing: '0.04em'
                                                }}>
                                                    {photo.photoType}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </div>{/* end main column */}

            {/* Lightbox */}
            {lightboxUrl && (
                <div
                    onClick={() => setLightboxUrl(null)}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 9999,
                        background: 'rgba(0,0,0,0.9)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'zoom-out'
                    }}
                >
                    <img
                        src={lightboxUrl} alt="Full size"
                        style={{ maxWidth: '90vw', maxHeight: '88vh', borderRadius: 8, boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}
                        onClick={e => e.stopPropagation()}
                    />
                    <button
                        onClick={() => setLightboxUrl(null)}
                        style={{
                            position: 'absolute', top: 16, right: 20,
                            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                            borderRadius: 6, color: '#fff', fontSize: '1.2rem', cursor: 'pointer',
                            width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                    >
                        ×
                    </button>
                    <a
                        href={lightboxUrl} target="_blank" rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        style={{
                            position: 'absolute', bottom: 20, right: 20,
                            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                            color: '#fff', padding: '0.4rem 0.85rem', borderRadius: 6,
                            textDecoration: 'none', fontSize: '0.8rem',
                            display: 'flex', alignItems: 'center', gap: '0.35rem'
                        }}
                    >
                        <ExternalLink size={13} /> Open original
                    </a>
                </div>
            )}
        </div>
    );
}
