import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ArrowLeft, Edit, Trash2, CheckCircle, Circle,
    User, Users, Calendar, Package, Activity,
    Plus, AlertTriangle, Clock
} from 'lucide-react';
import { fieldOpsApi } from '../../../services/api';
import toast from 'react-hot-toast';
import { format, isPast, formatDistanceToNow } from 'date-fns';
import '../fieldops.css';

const STATUS_OPTS = ['ToDo', 'InProgress', 'Review', 'Done', 'Blocked'];

const statusBadgeClass = {
    ToDo: 'status-badge-info', InProgress: 'status-badge-success',
    Review: 'status-badge-warning', Done: 'status-badge-secondary', Blocked: 'status-badge-danger',
};

const typeBadgeStyle = {
    Technical:    { background: 'rgba(59,130,246,0.12)',  color: '#3b82f6' },
    Construction: { background: 'rgba(245,158,11,0.12)',  color: '#f59e0b' },
    Maintenance:  { background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' },
};

const priorityColor = { High: '#ef4444', Med: '#f59e0b', Low: '#10b981' };

function SectionTitle({ icon, title, badge }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ color: 'var(--primary-400,#60a5fa)', display: 'flex' }}>{icon}</span>
                <h3 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700 }}>{title}</h3>
            </div>
            {badge !== undefined && (
                <span style={{ fontSize: '0.7rem', fontWeight: 700, background: 'rgba(59,130,246,0.1)', color: 'var(--primary-400,#60a5fa)', padding: '0.15rem 0.5rem', borderRadius: 20 }}>
                    {badge}
                </span>
            )}
        </div>
    );
}

export default function ActivityDetail() {
    const { activityId } = useParams();
    const navigate = useNavigate();
    const [activity, setActivity] = useState(null);
    const [loading, setLoading]   = useState(true);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [addingTask, setAddingTask]     = useState(false);

    useEffect(() => { loadActivity(); }, [activityId]);

    const loadActivity = async () => {
        try {
            const res = await fieldOpsApi.getActivityById(activityId);
            setActivity(res.data.data);
        } catch {
            toast.error('Failed to load activity');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (e) => {
        const newStatus = e.target.value;
        try {
            await fieldOpsApi.updateActivityStatus(activityId, newStatus);
            setActivity(a => ({ ...a, status: newStatus }));
            toast.success('Status updated');
        } catch {
            toast.error('Failed to update status');
        }
    };

    const handleTaskToggle = async (task) => {
        try {
            const res = await fieldOpsApi.updateActivityTask(activityId, task._id, { done: !task.done });
            setActivity(res.data.data);
        } catch {
            toast.error('Failed to update task');
        }
    };

    const handleAddTask = async () => {
        if (!newTaskTitle.trim()) return;
        try {
            setAddingTask(true);
            const res = await fieldOpsApi.addActivityTask(activityId, newTaskTitle.trim());
            setActivity(res.data.data);
            setNewTaskTitle('');
        } catch {
            toast.error('Failed to add task');
        } finally {
            setAddingTask(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Delete this activity? This cannot be undone.')) return;
        try {
            await fieldOpsApi.deleteActivity(activityId);
            toast.success('Activity deleted');
            if (activity?.projectId?._id) navigate(`/fieldops/projects/${activity.projectId._id}/activities`);
            else navigate(-1);
        } catch {
            toast.error('Failed to delete activity');
        }
    };

    if (loading) {
        return (
            <div className="page-container">
                <div className="loading-state"><div className="spinner" /><p>Loading activity…</p></div>
            </div>
        );
    }

    if (!activity) return null;

    const doneTasks  = activity.tasks?.filter(t => t.done).length || 0;
    const totalTasks = activity.tasks?.length || 0;
    const tb = typeBadgeStyle[activity.type] || {};
    const projectId = activity.projectId?._id || activity.projectId;

    return (
        <div className="page-container animate-fade-in">
            {/* Header */}
            <div className="project-detail-header">
                <div className="project-info">
                    <div className="header-left">
                        <Link to={`/fieldops/projects/${projectId}/activities`} className="btn btn-ghost">
                            <ArrowLeft size={18} />
                        </Link>
                        <div>
                            <div className="flex items-center gap-3">
                                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>{activity.activityNumber}</span>
                                <h1 style={{ fontSize: '1.15rem', margin: '0 0.5rem' }}>{activity.title}</h1>
                                <select
                                    value={activity.status}
                                    onChange={handleStatusChange}
                                    className={`status-badge ${statusBadgeClass[activity.status] || 'status-badge-info'}`}
                                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700 }}
                                >
                                    {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div className="project-meta">
                                <span style={{ ...tb, fontSize: '0.7rem', fontWeight: 700, padding: '0.12rem 0.45rem', borderRadius: 20 }}>{activity.type}</span>
                                <span style={{ width: 7, height: 7, borderRadius: '50%', background: priorityColor[activity.priority] || '#94a3b8', display: 'inline-block' }} title={`Priority: ${activity.priority}`} />
                                <span className="project-meta-item">{activity.priority} priority</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="header-actions">
                    <Link to={`/fieldops/activities/${activityId}/edit`} className="btn btn-ghost btn-sm">
                        <Edit size={15} /> Edit
                    </Link>
                    <button onClick={handleDelete} className="btn btn-ghost btn-sm" style={{ color: 'var(--danger-500,#ef4444)' }}>
                        <Trash2 size={15} /> Delete
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>

                {/* Meta strip */}
                <div className="glass-card" style={{ padding: '0.7rem 1.1rem' }}>
                    <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        {activity.leadEngineer && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}>
                                <User size={13} style={{ color: 'var(--text-muted)' }} />
                                <span style={{ color: 'var(--text-muted)' }}>Lead:</span>
                                <span style={{ fontWeight: 600 }}>{activity.leadEngineer.fullName}</span>
                            </div>
                        )}
                        {activity.assignees?.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}>
                                <Users size={13} style={{ color: 'var(--text-muted)' }} />
                                <span style={{ color: 'var(--text-muted)' }}>Team:</span>
                                <span style={{ fontWeight: 600 }}>{activity.assignees.map(u => u.fullName).join(', ')}</span>
                            </div>
                        )}
                        {(activity.plannedStart || activity.plannedEnd) && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}>
                                <Calendar size={13} style={{ color: 'var(--text-muted)' }} />
                                <span style={{ color: 'var(--text-muted)' }}>Planned:</span>
                                <span style={{ fontWeight: 600 }}>
                                    {activity.plannedStart ? format(new Date(activity.plannedStart), 'dd MMM yyyy') : '?'}
                                    {' → '}
                                    {activity.plannedEnd ? format(new Date(activity.plannedEnd), 'dd MMM yyyy') : '?'}
                                </span>
                            </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', marginLeft: 'auto' }}>
                            <Activity size={13} style={{ color: 'var(--primary-400,#60a5fa)' }} />
                            <span style={{ fontWeight: 700, color: 'var(--primary-400,#60a5fa)' }}>{activity.progressPercentage}%</span>
                            <span style={{ color: 'var(--text-muted)' }}>progress</span>
                        </div>
                    </div>
                    {activity.progressPercentage > 0 && (
                        <div className="progress-bar-container" style={{ height: 4, borderRadius: 4, marginTop: '0.5rem' }}>
                            <div className="progress-bar" style={{
                                width: `${activity.progressPercentage}%`, height: 4, borderRadius: 4,
                                background: activity.status === 'Done' ? 'var(--success-500,#10b981)' : 'var(--primary-500,#3b82f6)'
                            }} />
                        </div>
                    )}
                </div>

                {/* Description */}
                {activity.description && (
                    <div className="glass-card" style={{ padding: '1rem 1.1rem' }}>
                        <SectionTitle icon={<Activity size={14} />} title="Description" />
                        <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.65, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                            {activity.description}
                        </p>
                    </div>
                )}

                {/* Sub-Tasks */}
                <div className="glass-card" style={{ padding: '1rem 1.1rem' }}>
                    <SectionTitle icon={<CheckCircle size={14} />} title="Sub-Tasks" badge={totalTasks > 0 ? `${doneTasks}/${totalTasks}` : undefined} />

                    {totalTasks > 0 && (
                        <div className="progress-bar-container" style={{ height: 3, borderRadius: 3, marginBottom: '0.75rem' }}>
                            <div className="progress-bar" style={{
                                width: `${totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0}%`,
                                height: 3, borderRadius: 3,
                                background: doneTasks === totalTasks ? 'var(--success-500,#10b981)' : 'var(--primary-500,#3b82f6)'
                            }} />
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        {(activity.tasks || []).sort((a, b) => (a.order || 0) - (b.order || 0)).map(task => {
                            const overdue = task.plannedEnd && !task.done && isPast(new Date(task.plannedEnd));
                            return (
                                <div
                                    key={task._id}
                                    style={{
                                        display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
                                        padding: '0.45rem 0.6rem',
                                        background: task.done ? 'rgba(16,185,129,0.05)' : overdue ? 'rgba(239,68,68,0.04)' : 'transparent',
                                        borderRadius: 7,
                                        border: `1px solid ${task.done ? 'rgba(16,185,129,0.15)' : overdue ? 'rgba(239,68,68,0.15)' : 'var(--border-light,rgba(148,163,184,0.08))'}`,
                                    }}
                                >
                                    <button
                                        type="button"
                                        onClick={() => handleTaskToggle(task)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0, marginTop: 1, display: 'flex' }}
                                    >
                                        {task.done
                                            ? <CheckCircle size={16} style={{ color: 'var(--success-500,#10b981)' }} />
                                            : <Circle size={16} style={{ color: 'var(--text-muted)', opacity: 0.6 }} />
                                        }
                                    </button>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                            <span style={{
                                                fontSize: '0.83rem', fontWeight: 500,
                                                color: task.done ? 'var(--text-muted)' : 'var(--text-primary)',
                                                textDecoration: task.done ? 'line-through' : 'none',
                                                flex: 1
                                            }}>
                                                {task.title}
                                            </span>
                                            {task.plannedEnd && (
                                                <span style={{
                                                    fontSize: '0.68rem', fontWeight: 600, padding: '0.1rem 0.4rem', borderRadius: 20,
                                                    background: task.done ? 'rgba(16,185,129,0.1)' : overdue ? 'rgba(239,68,68,0.12)' : 'rgba(148,163,184,0.1)',
                                                    color: task.done ? 'var(--success-500,#10b981)' : overdue ? 'var(--danger-500,#ef4444)' : 'var(--text-muted)',
                                                    display: 'flex', alignItems: 'center', gap: '0.2rem'
                                                }}>
                                                    {overdue && <AlertTriangle size={9} />}
                                                    <Clock size={9} />
                                                    {format(new Date(task.plannedEnd), 'dd MMM')}
                                                    {overdue && ` (${formatDistanceToNow(new Date(task.plannedEnd))} ago)`}
                                                </span>
                                            )}
                                        </div>
                                        {task.done && task.doneBy && (
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 1 }}>
                                                Done by {task.doneBy.fullName || task.doneBy}
                                                {task.doneAt && ` · ${format(new Date(task.doneAt), 'dd MMM yyyy')}`}
                                            </div>
                                        )}
                                        {task.notes && (
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2, fontStyle: 'italic' }}>
                                                {task.notes}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {/* Add task inline */}
                        <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem' }}>
                            <input
                                className="form-input"
                                style={{ flex: 1, padding: '0.35rem 0.6rem', fontSize: '0.82rem' }}
                                value={newTaskTitle}
                                onChange={e => setNewTaskTitle(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTask())}
                                placeholder="Add a task… (Enter to save)"
                                maxLength={200}
                            />
                            <button
                                type="button"
                                className="btn btn-ghost"
                                style={{ padding: '0.35rem 0.7rem', fontSize: '0.8rem' }}
                                onClick={handleAddTask}
                                disabled={addingTask || !newTaskTitle.trim()}
                            >
                                <Plus size={14} /> Add
                            </button>
                        </div>
                    </div>
                </div>

                {/* Resources */}
                {(activity.requiredDevices?.length > 0 || activity.requiredStockItems?.length > 0) && (
                    <div className="glass-card" style={{ padding: '1rem 1.1rem' }}>
                        <SectionTitle icon={<Package size={14} />} title="Required Resources" />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            {activity.requiredDevices?.length > 0 && (
                                <div>
                                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
                                        Device Types
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                                        {activity.requiredDevices.map((d, i) => (
                                            <span key={i} style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.55rem', borderRadius: 20, background: 'rgba(59,130,246,0.1)', color: 'var(--primary-400,#60a5fa)' }}>
                                                {d.deviceTypeName} ×{d.qty}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {activity.requiredStockItems?.length > 0 && (
                                <div>
                                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
                                        Stock Items
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                                        {activity.requiredStockItems.map((s, i) => (
                                            <span key={i} style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.55rem', borderRadius: 20, background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
                                                {s.itemName} ×{s.qty}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Timeline */}
                {(activity.plannedStart || activity.plannedEnd || activity.actualStart || activity.actualEnd) && (
                    <div className="glass-card" style={{ padding: '1rem 1.1rem' }}>
                        <SectionTitle icon={<Calendar size={14} />} title="Timeline" />
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.75rem' }}>
                            {[
                                { label: 'Planned Start', value: activity.plannedStart },
                                { label: 'Planned End',   value: activity.plannedEnd   },
                                { label: 'Actual Start',  value: activity.actualStart  },
                                { label: 'Actual End',    value: activity.actualEnd    },
                            ].map(({ label, value }) => (
                                <div key={label}>
                                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.2rem' }}>{label}</div>
                                    <div style={{ fontSize: '0.83rem', fontWeight: 600, color: value ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                        {value ? format(new Date(value), 'dd MMM yyyy') : '—'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
