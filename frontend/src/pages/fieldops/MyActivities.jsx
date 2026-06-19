import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fieldOpsApi } from '../../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Activity, Calendar, ChevronRight } from 'lucide-react';
import './fieldops.css';

const PRIORITY_DOT = { High: '#ef4444', Med: '#f59e0b', Low: '#6b7280' };
const STATUS_COLORS = {
    ToDo:       { bg: 'rgba(100,116,139,0.15)', color: '#94a3b8' },
    InProgress: { bg: 'rgba(59,130,246,0.15)',  color: '#60a5fa' },
    Review:     { bg: 'rgba(168,85,247,0.15)',  color: '#c084fc' },
    Done:       { bg: 'rgba(16,185,129,0.15)',  color: '#34d399' },
    Blocked:    { bg: 'rgba(239,68,68,0.15)',   color: '#f87171' },
};

function groupByProject(activities) {
    const map = new Map();
    for (const act of activities) {
        const proj = act.projectId;
        const pid = proj?._id || 'unknown';
        if (!map.has(pid)) {
            map.set(pid, {
                projectId: pid,
                projectName: proj?.projectName || 'Unknown Project',
                projectNumber: proj?.projectNumber || '',
                projectStatus: proj?.status || '',
                city: proj?.city || '',
                activities: [],
            });
        }
        map.get(pid).activities.push(act);
    }
    return Array.from(map.values());
}

function TaskChip({ tasks }) {
    const total = tasks?.length || 0;
    const done  = tasks?.filter(t => t.done).length || 0;
    if (!total) return null;
    return (
        <span style={{
            fontSize: '0.7rem', padding: '0.1rem 0.45rem', borderRadius: 10,
            background: done === total ? 'rgba(16,185,129,0.15)' : 'rgba(100,116,139,0.12)',
            color: done === total ? '#34d399' : 'var(--text-muted)',
        }}>
            {done}/{total} tasks
        </span>
    );
}

function DateRange({ start, end }) {
    if (!start && !end) return null;
    return (
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Calendar size={11} />
            {start ? format(new Date(start), 'dd MMM') : '?'}
            {' → '}
            {end   ? format(new Date(end),   'dd MMM') : '?'}
        </span>
    );
}

export default function MyActivities() {
    const [groups, setGroups]   = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const res = await fieldOpsApi.getMyActivities();
                setGroups(groupByProject(res.data.data || []));
            } catch {
                toast.error('Failed to load activities');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const totalCount = groups.reduce((sum, g) => sum + g.activities.length, 0);

    if (loading) {
        return (
            <div className="page-container">
                <div className="loading-state"><div className="spinner" /><p>Loading…</p></div>
            </div>
        );
    }

    return (
        <div className="page-container animate-fade-in">
            <div className="project-detail-header" style={{ marginBottom: '1rem' }}>
                <div className="project-info">
                    <div className="header-left">
                        <Activity size={22} style={{ color: 'var(--primary-400)' }} />
                        <div>
                            <h1 style={{ fontSize: '1.2rem', margin: 0 }}>My Activities</h1>
                            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                                {totalCount} {totalCount === 1 ? 'activity' : 'activities'} across {groups.length} {groups.length === 1 ? 'project' : 'projects'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {groups.length === 0 ? (
                <div className="glass-card" style={{ padding: '2.5rem', textAlign: 'center' }}>
                    <Activity size={36} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
                    <p style={{ color: 'var(--text-muted)', margin: 0 }}>No activities assigned to you yet.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {groups.map(group => (
                        <div key={group.projectId} className="glass-card" style={{ padding: '1rem 1.1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
                                <span style={{
                                    fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.55rem', borderRadius: 4,
                                    background: 'rgba(59,130,246,0.12)', color: 'var(--primary-400)',
                                    letterSpacing: '0.03em',
                                }}>
                                    {group.projectNumber}
                                </span>
                                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{group.projectName}</span>
                                {group.city && (
                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>· {group.city}</span>
                                )}
                                <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                    {group.activities.length} {group.activities.length === 1 ? 'activity' : 'activities'}
                                </span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                {group.activities.map(act => {
                                    const sc = STATUS_COLORS[act.status] || STATUS_COLORS.ToDo;
                                    return (
                                        <Link
                                            key={act._id}
                                            to={`/fieldops/activities/${act._id}`}
                                            style={{ textDecoration: 'none', color: 'inherit' }}
                                        >
                                            <div style={{
                                                display: 'flex', alignItems: 'center', gap: '0.6rem',
                                                padding: '0.5rem 0.65rem', borderRadius: 6,
                                                background: 'var(--bg-secondary, rgba(148,163,184,0.06))',
                                                transition: 'background 0.15s',
                                            }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover, rgba(148,163,184,0.12))'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-secondary, rgba(148,163,184,0.06))'}
                                            >
                                                <span style={{
                                                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                                                    background: PRIORITY_DOT[act.priority] || '#6b7280',
                                                }} />
                                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                                                    {act.activityNumber}
                                                </span>
                                                <span style={{ flex: 1, fontSize: '0.85rem', fontWeight: 500 }}>{act.title}</span>
                                                <TaskChip tasks={act.tasks} />
                                                <DateRange start={act.plannedStart} end={act.plannedEnd} />
                                                <span style={{
                                                    fontSize: '0.68rem', padding: '0.15rem 0.45rem', borderRadius: 10,
                                                    background: sc.bg, color: sc.color, flexShrink: 0,
                                                }}>
                                                    {act.status}
                                                </span>
                                                <ChevronRight size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
