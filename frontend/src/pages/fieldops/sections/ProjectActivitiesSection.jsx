import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    Activity, Plus, ChevronRight, AlertTriangle,
    User, Calendar, CheckSquare
} from 'lucide-react';
import { fieldOpsApi } from '../../../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import ProjectSectionLayout from '../ProjectSectionLayout';
import '../fieldops.css';

const STATUS_OPTS = ['All', 'ToDo', 'InProgress', 'Review', 'Done', 'Blocked'];
const TYPE_OPTS   = ['All', 'Technical', 'Construction', 'Maintenance'];

const typeBadgeStyle = {
    Technical:    { background: 'rgba(59,130,246,0.12)',  color: '#3b82f6' },
    Construction: { background: 'rgba(245,158,11,0.12)',  color: '#f59e0b' },
    Maintenance:  { background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' },
};

const statusBadgeClass = {
    ToDo:       'status-badge-info',
    InProgress: 'status-badge-success',
    Review:     'status-badge-warning',
    Done:       'status-badge-secondary',
    Blocked:    'status-badge-danger',
};

const priorityDot = {
    High: '#ef4444',
    Med:  '#f59e0b',
    Low:  '#10b981',
};

export default function ProjectActivitiesSection() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [activities, setActivities] = useState([]);
    const [loading, setLoading]       = useState(true);
    const [filterStatus, setFilterStatus] = useState('All');
    const [filterType, setFilterType]     = useState('All');

    useEffect(() => { loadActivities(); }, [id]);

    const loadActivities = async () => {
        try {
            const res = await fieldOpsApi.getProjectActivities(id);
            setActivities(res.data.data || []);
        } catch {
            toast.error('Failed to load activities');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (e, activityId) => {
        e.stopPropagation();
        const newStatus = e.target.value;
        try {
            await fieldOpsApi.updateActivityStatus(activityId, newStatus);
            setActivities(prev => prev.map(a =>
                a._id === activityId ? { ...a, status: newStatus } : a
            ));
            toast.success('Status updated');
        } catch {
            toast.error('Failed to update status');
        }
    };

    const filtered = activities
        .filter(a => filterStatus === 'All' || a.status === filterStatus)
        .filter(a => filterType   === 'All' || a.type   === filterType);

    return (
        <ProjectSectionLayout sectionTitle="Activities" sectionIcon={<Activity size={16} />}>
            {() => (
                <div className="glass-card" style={{ padding: '1rem 1.1rem' }}>
                    {/* toolbar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                        <select
                            value={filterStatus}
                            onChange={e => setFilterStatus(e.target.value)}
                            className="form-select"
                            style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem', minWidth: 110 }}
                        >
                            {STATUS_OPTS.map(s => <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>)}
                        </select>
                        <select
                            value={filterType}
                            onChange={e => setFilterType(e.target.value)}
                            className="form-select"
                            style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem', minWidth: 110 }}
                        >
                            {TYPE_OPTS.map(t => <option key={t} value={t}>{t === 'All' ? 'All Types' : t}</option>)}
                        </select>
                        <div style={{ flex: 1 }} />
                        <Link
                            to={`/fieldops/projects/${id}/activities/new`}
                            className="btn btn-primary"
                            style={{ padding: '0.35rem 0.875rem', fontSize: '0.82rem' }}
                        >
                            <Plus size={15} /> New Activity
                        </Link>
                    </div>

                    {loading ? (
                        <div className="loading-state"><div className="spinner" /><p>Loading…</p></div>
                    ) : filtered.length === 0 ? (
                        <div className="empty-state" style={{ padding: '2rem 0' }}>
                            <Activity size={36} />
                            <h3 style={{ fontSize: '1rem' }}>No activities{filterStatus !== 'All' || filterType !== 'All' ? ' matching filters' : ' yet'}</h3>
                            {filterStatus === 'All' && filterType === 'All' && (
                                <Link to={`/fieldops/projects/${id}/activities/new`} className="btn btn-primary btn-sm">
                                    <Plus size={14} /> Create First Activity
                                </Link>
                            )}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                            {filtered.map(a => {
                                const doneTasks  = a.tasks?.filter(t => t.done).length || 0;
                                const totalTasks = a.tasks?.length || 0;
                                const tb = typeBadgeStyle[a.type] || {};
                                return (
                                    <div
                                        key={a._id}
                                        onClick={() => navigate(`/fieldops/activities/${a._id}`)}
                                        style={{
                                            border: '1px solid var(--border-light,rgba(148,163,184,0.14))',
                                            borderRadius: 10,
                                            padding: '0.75rem 1rem',
                                            cursor: 'pointer',
                                            transition: 'background 0.12s',
                                            background: 'var(--bg-secondary,rgba(148,163,184,0.04))',
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover,rgba(59,130,246,0.06))'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-secondary,rgba(148,163,184,0.04))'}
                                    >
                                        {/* row 1 */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.04em', fontVariantNumeric: 'tabular-nums' }}>
                                                {a.activityNumber}
                                            </span>
                                            <span style={{
                                                width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                                                background: priorityDot[a.priority] || '#94a3b8'
                                            }} title={`Priority: ${a.priority}`} />
                                            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {a.title}
                                            </span>
                                            <span style={{ ...tb, fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 20, flexShrink: 0 }}>
                                                {a.type}
                                            </span>
                                            <ChevronRight size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                                        </div>

                                        {/* row 2 */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                                            <select
                                                value={a.status}
                                                onClick={e => e.stopPropagation()}
                                                onChange={e => handleStatusChange(e, a._id)}
                                                className={`status-badge ${statusBadgeClass[a.status] || 'status-badge-info'}`}
                                                style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.2rem' }}
                                            >
                                                {STATUS_OPTS.slice(1).map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                            {a.leadEngineer && (
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                    <User size={12} /> {a.leadEngineer.fullName}
                                                </span>
                                            )}
                                            {a.plannedStart && (
                                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                    <Calendar size={12} />
                                                    {format(new Date(a.plannedStart), 'dd MMM')}
                                                    {a.plannedEnd && ` → ${format(new Date(a.plannedEnd), 'dd MMM yyyy')}`}
                                                </span>
                                            )}
                                            {totalTasks > 0 && (
                                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginLeft: 'auto' }}>
                                                    <CheckSquare size={12} /> {doneTasks}/{totalTasks} tasks
                                                </span>
                                            )}
                                        </div>

                                        {/* progress bar */}
                                        {a.progressPercentage > 0 && (
                                            <div style={{ marginTop: '0.5rem' }}>
                                                <div className="progress-bar-container" style={{ height: 3, borderRadius: 3 }}>
                                                    <div className="progress-bar" style={{
                                                        width: `${a.progressPercentage}%`, height: 3, borderRadius: 3,
                                                        background: a.status === 'Done' ? 'var(--success-500,#10b981)' : 'var(--primary-500,#3b82f6)'
                                                    }} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </ProjectSectionLayout>
    );
}
