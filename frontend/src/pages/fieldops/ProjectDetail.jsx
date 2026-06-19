import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ArrowLeft,
    Edit,
    MapPin,
    User,
    Building,
    FileText,
    Camera,
    AlertTriangle,
    Truck,
    BarChart3,
    Plus,
    CheckCircle,
    Package,
    Play,
    Gauge,
    Zap,
    Activity,
} from 'lucide-react';
import { fieldOpsApi } from '../../services/api';
import useAuthStore from '../../context/authStore';
import toast from 'react-hot-toast';
import './fieldops.css';

const statusColors = {
    Planning: 'status-badge-info',
    Active: 'status-badge-success',
    OnHold: 'status-badge-warning',
    Completed: 'status-badge-secondary',
    Cancelled: 'status-badge-danger'
};

/* â”€â”€ Circular Donut component for Timeline Status â”€â”€ */
function TimelineDonut({ percentage, elapsed, total, remaining }) {
    const size = 120;
    const strokeWidth = 10;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
                <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                    <circle
                        cx={size / 2} cy={size / 2} r={radius}
                        fill="none"
                        stroke="var(--border-light, rgba(148,163,184,0.15))"
                        strokeWidth={strokeWidth}
                    />
                    <circle
                        cx={size / 2} cy={size / 2} r={radius}
                        fill="none"
                        stroke="url(#donutGrad)"
                        strokeWidth={strokeWidth}
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)' }}
                    />
                    <defs>
                        <linearGradient id="donutGrad" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" />
                            <stop offset="100%" stopColor="#06b6d4" />
                        </linearGradient>
                    </defs>
                </svg>
                <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                }}>
                    <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                        {percentage}%
                    </span>
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.06em', marginTop: 2 }}>
                        Time Used
                    </span>
                </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div>
                    <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{elapsed}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 4 }}>of {total} days</span>
                </div>
                <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>Elapsed</span>
                <div style={{ borderTop: '1px solid var(--border-light, rgba(148,163,184,0.15))', paddingTop: '0.4rem', marginTop: '0.1rem' }}>
                    <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{remaining}</span>
                    <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.05em', display: 'block', marginTop: 2 }}>Days Remaining</span>
                </div>
            </div>
        </div>
    );
}

/* â”€â”€ Milestone progress row â”€â”€ */
function MilestoneRow({ label, weight, percentage, completed, total }) {
    return (
        <div style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--border-light, rgba(148,163,184,0.08))' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <div>
                    <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{label}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 8, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>Weight: {weight}%</span>
                </div>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{percentage}%</span>
            </div>
            <div className="progress-bar-container" style={{ height: 6 }}>
                <div
                    className="progress-bar"
                    style={{
                        width: `${percentage}%`,
                        background: percentage >= 75 ? 'var(--success-500, #10b981)' : percentage >= 30 ? 'var(--primary-500, #3b82f6)' : 'var(--text-muted, #94a3b8)',
                        height: 6
                    }}
                />
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                {completed} / {total} Units
            </div>
        </div>
    );
}

export default function ProjectDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, hasRole } = useAuthStore();

    const [project, setProject] = useState(null);
    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading] = useState(true);

    const canEdit = hasRole(['Admin', 'Supervisor']);

    useEffect(() => {
        loadProjectData();
    }, [id]);

    const loadProjectData = async () => {
        try {
            const [projectRes, dashboardRes] = await Promise.all([
                fieldOpsApi.getProjectById(id),
                fieldOpsApi.getProjectDashboard(id)
            ]);
            setProject(projectRes.data.data);
            setDashboard(dashboardRes.data.data);
        } catch {
            toast.error('Failed to load project');
            navigate('/fieldops/projects');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="page-container">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading project...</p>
                </div>
            </div>
        );
    }

    if (!project) {
        return null;
    }

    const isAssignedPM = project.assignedPM?._id === user?._id ||
                         project.teamMembers?.some(tm => tm._id === user?._id);

    const schedStatus = dashboard?.progress?.scheduleStatus;
    const currentPhase = dashboard?.progress?.taskProgress >= 100
        ? 'Completed'
        : dashboard?.progress?.milestoneBreakdown?.installation < 100
        ? 'Phase 1: Foundation & Infrastructure'
        : dashboard?.progress?.milestoneBreakdown?.configuration < 100
        ? 'Phase 2: Configuration & Setup'
        : 'Phase 3: Testing & Validation';

    return (
        <div className="page-container animate-fade-in">
            {/* Header */}
            <div className="project-detail-header">
                <div className="project-info">
                    <div className="header-left">
                        <Link to="/fieldops/projects" className="btn btn-ghost">
                            <ArrowLeft size={18} />
                        </Link>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1>{project.projectName}</h1>
                                <span className={`status-badge ${statusColors[project.status]}`}>
                                    {project.status}
                                </span>
                            </div>
                            <div className="project-meta">
                                <span className="project-meta-item">
                                    <FileText size={14} /> {project.projectNumber}
                                </span>
                                <span className="project-meta-item">
                                    <Building size={14} /> {project.clientName}
                                </span>
                                <span className="project-meta-item">
                                    <MapPin size={14} /> {project.city || project.siteAddress}
                                </span>
                                <span className="project-meta-item">
                                    <User size={14} /> PM: {project.assignedPM?.fullName || 'Unassigned'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="header-actions">
                    {(isAssignedPM || canEdit) && project.status === 'Active' && (
                        <Link to={`/fieldops/projects/${id}/daily-log`} className="btn btn-primary">
                            <Plus size={18} />
                            Submit Daily Log
                        </Link>
                    )}
                    {canEdit && (
                        <Link to={`/fieldops/projects/${id}/edit`} className="btn btn-ghost">
                            <Edit size={18} />
                        </Link>
                    )}
                </div>
            </div>

            {/* â”€â”€â”€ Hero Stats Row â”€â”€â”€ */}
            <div className="pd-hero-stats">
                {/* Efficiency / Task Progress */}
                <Link to={`/fieldops/reports?projectId=${id}`} className="pd-hero-card">
                    <div className="pd-hero-icon" style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
                        <Gauge size={22} />
                    </div>
                    <div className="pd-hero-label">Efficiency</div>
                    <div className="pd-hero-value">{dashboard?.progress?.taskProgress || 0}%</div>
                    <div className="pd-hero-sublabel">Task Progress</div>
                </Link>

                {/* Deployment / Devices Installed */}
                <button
                    className="pd-hero-card"
                    onClick={() => navigate(`/fieldops/projects/${id}/devices`)}
                >
                    <div className="pd-hero-icon" style={{ background: 'rgba(6,182,212,0.12)', color: '#06b6d4' }}>
                        <Zap size={22} />
                    </div>
                    <div className="pd-hero-label">Deployment</div>
                    <div className="pd-hero-value">{dashboard?.allocations?.totalInstalled || 0}</div>
                    <div className="pd-hero-sublabel">Devices Installed</div>
                </button>

                {/* Inventory / Stock Remaining */}
                <Link to={`/fieldops/projects/${id}/stock`} className="pd-hero-card" style={{ textDecoration: 'none' }}>
                    <div className="pd-hero-icon" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                        <Package size={22} />
                    </div>
                    <div className="pd-hero-label">Inventory</div>
                    <div className="pd-hero-value">{dashboard?.allocations?.remaining || 0}</div>
                    <div className="pd-hero-sublabel">Stock Remaining</div>
                </Link>

                {/* Compact counts grid */}
                <div className="pd-counts-grid">
                    <button
                        className="pd-count-cell"
                        onClick={() => navigate(`/fieldops/projects/${id}/vendor-work`)}
                    >
                        <span className="pd-count-value">{dashboard?.dailyLogs?.totalManHours || 0}</span>
                        <span className="pd-count-label">Man-Hours</span>
                    </button>
                    <button
                        className="pd-count-cell"
                        onClick={() => navigate(`/fieldops/projects/${id}/challenges`)}
                    >
                        <span className="pd-count-value pd-count-danger">{dashboard?.challenges?.byStatus?.Open || 0}</span>
                        <span className="pd-count-label">Challenges</span>
                    </button>
                    <Link to={`/fieldops/projects/${id}/devices/assigned`} className="pd-count-cell">
                        <span className="pd-count-value">{dashboard?.devices?.total || 0}</span>
                        <span className="pd-count-label">Device Recs</span>
                    </Link>
                    <button
                        className="pd-count-cell"
                        onClick={() => navigate(`/fieldops/projects/${id}/daily-logs`)}
                    >
                        <span className="pd-count-value">{dashboard?.dailyLogs?.total || 0}</span>
                        <span className="pd-count-label">Daily Log</span>
                    </button>
                </div>
            </div>

            {/* â”€â”€â”€ Project Progress + Timeline Status â”€â”€â”€ */}
            {dashboard?.progress && (
            <div className="pd-progress-row">
                {/* Left: Progress breakdown */}
                <div className="pd-progress-card glass-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <h3 className="card-title" style={{ margin: 0, fontSize: '1.1rem' }}>Project Progress</h3>
                    </div>

                    {/* Phase indicator */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                        <Play size={14} style={{ color: 'var(--text-muted)' }} />
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{currentPhase}</span>
                        <span className={`status-badge ${
                            schedStatus === 'On Track' ? 'status-badge-success' :
                            schedStatus === 'Behind Schedule' ? 'status-badge-danger' :
                            'status-badge-info'
                        }`} style={{ marginLeft: 'auto' }}>
                            {schedStatus === 'On Track' && <CheckCircle size={11} />}
                            {schedStatus === 'Behind Schedule' && <AlertTriangle size={11} />}
                            {schedStatus?.toUpperCase() || 'N/A'}
                        </span>
                    </div>

                    {/* Milestone rows */}
                    <MilestoneRow
                        label="Installation"
                        weight={30}
                        percentage={dashboard.progress.milestoneBreakdown?.installation || 0}
                        completed={dashboard.progress.milestoneBreakdown?.installedCount || 0}
                        total={dashboard.progress.milestoneBreakdown?.allocatedScope || 0}
                    />
                    <MilestoneRow
                        label="Configuration"
                        weight={30}
                        percentage={dashboard.progress.milestoneBreakdown?.configuration || 0}
                        completed={dashboard.progress.milestoneBreakdown?.configuredCount || 0}
                        total={dashboard.progress.milestoneBreakdown?.allocatedScope || 0}
                    />
                    <MilestoneRow
                        label="Testing & Validation"
                        weight={40}
                        percentage={dashboard.progress.milestoneBreakdown?.testing || 0}
                        completed={dashboard.progress.milestoneBreakdown?.testedCount || 0}
                        total={dashboard.progress.milestoneBreakdown?.allocatedScope || 0}
                    />

                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.75rem', fontStyle: 'italic' }}>
                        Milestones based on {dashboard.progress.milestoneBreakdown?.allocatedScope || 0} allocated units.
                    </div>
                </div>

                {/* Right: Timeline Status donut */}
                <div className="pd-timeline-card glass-card">
                    <h3 className="card-title" style={{ margin: '0 0 1rem', fontSize: '1.1rem' }}>Timeline Status</h3>
                    <TimelineDonut
                        percentage={dashboard.progress.timeProgress || 0}
                        elapsed={dashboard.progress.elapsedDays || 0}
                        total={dashboard.progress.contractDays || 0}
                        remaining={dashboard.progress.remainingDays || 0}
                    />
                </div>
            </div>
            )}

            {/* â”€â”€â”€ Section Navigation â”€â”€â”€ */}
            <div className="glass-card" style={{ padding: '1.5rem' }}>
                <h3 className="card-title" style={{ margin: '0 0 1.25rem', fontSize: '1rem' }}>
                    Project Sections
                </h3>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                    gap: '1rem'
                }}>
                    <SectionCard
                        to={`/fieldops/projects/${id}/overview`}
                        icon={<FileText size={22} />}
                        label="Overview"
                    />
                    <SectionCard
                        to={`/fieldops/projects/${id}/activities`}
                        icon={<Activity size={22} />}
                        label="Activities"
                    />
                    <SectionCard
                        to={`/fieldops/projects/${id}/daily-logs`}
                        icon={<FileText size={22} />}
                        label="Daily Logs"
                        count={dashboard?.dailyLogs?.total || 0}
                    />
                    <SectionCard
                        to={`/fieldops/projects/${id}/devices`}
                        icon={<Camera size={22} />}
                        label="Devices"
                        count={dashboard?.allocations?.totalInstalled || 0}
                    />
                    <SectionCard
                        to={`/fieldops/projects/${id}/vendor-work`}
                        icon={<Truck size={22} />}
                        label="Vendor Work"
                        count={dashboard?.vendorWork?.totalLogs || 0}
                    />
                    <SectionCard
                        to={`/fieldops/projects/${id}/challenges`}
                        icon={<AlertTriangle size={22} />}
                        label="Challenges"
                        count={dashboard?.challenges?.total || 0}
                        highlight={dashboard?.challenges?.byStatus?.Open > 0}
                    />
                    <SectionCard
                        to={`/fieldops/projects/${id}/stock`}
                        icon={<Package size={22} />}
                        label="Allocated Stock"
                        count={dashboard?.allocations?.remaining || 0}
                    />
                    {project.surveyDeviceRequirements?.length > 0 && (
                        <SectionCard
                            to={`/fieldops/projects/${id}/reconciliation`}
                            icon={<BarChart3 size={22} />}
                            label="Survey vs Actual"
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

function SectionCard({ to, icon, label, count, highlight }) {
    return (
        <Link
            to={to}
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '1.25rem 0.75rem',
                borderRadius: '12px',
                background: 'var(--bg-secondary, rgba(148,163,184,0.06))',
                border: '1px solid var(--border-light, rgba(148,163,184,0.12))',
                textDecoration: 'none',
                color: 'var(--text-primary)',
                transition: 'background 0.15s, border-color 0.15s, transform 0.1s',
                cursor: 'pointer',
            }}
            onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--bg-hover, rgba(59,130,246,0.08))';
                e.currentTarget.style.borderColor = 'var(--primary-300, rgba(59,130,246,0.35))';
                e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={e => {
                e.currentTarget.style.background = 'var(--bg-secondary, rgba(148,163,184,0.06))';
                e.currentTarget.style.borderColor = 'var(--border-light, rgba(148,163,184,0.12))';
                e.currentTarget.style.transform = 'translateY(0)';
            }}
        >
            <span style={{ color: 'var(--primary-400, #60a5fa)', opacity: 0.85 }}>{icon}</span>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, textAlign: 'center', lineHeight: 1.3 }}>
                {label}
            </span>
            {count !== undefined && (
                <span style={{
                    fontSize: '1.1rem',
                    fontWeight: 800,
                    color: highlight ? 'var(--danger-500, #ef4444)' : 'var(--text-primary)',
                    lineHeight: 1
                }}>
                    {count}
                </span>
            )}
        </Link>
    );
}

