import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ArrowLeft,
    Edit,
    MapPin,
    Calendar,
    User,
    Building,
    FileText,
    Camera,
    Wrench,
    AlertTriangle,
    Truck,
    BarChart3,
    Plus,
    Clock,
    Users,
    CheckCircle,
    Package,
    UserPlus,
    TrendingUp,
    TrendingDown,
    Timer,
    Activity,
    Layers,
    CalendarClock,
    Play,
    Gauge,
    CircleDot,
    Zap
} from 'lucide-react';
import { fieldOpsApi } from '../../services/api';
import useAuthStore from '../../context/authStore';
import toast from 'react-hot-toast';
import { format, formatDistanceToNow } from 'date-fns';
import AllocatedStockTab from './AllocatedStockTab';
import './fieldops.css';

const statusColors = {
    Planning: 'status-badge-info',
    Active: 'status-badge-success',
    OnHold: 'status-badge-warning',
    Completed: 'status-badge-secondary',
    Cancelled: 'status-badge-danger'
};

/* ── Circular Donut component for Timeline Status ── */
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

/* ── Milestone progress row ── */
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
    const [activeTab, setActiveTab] = useState('overview');

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
        } catch (error) {
            toast.error('Failed to load project');
            navigate('/fieldops/projects');
        } finally {
            setLoading(false);
        }
    };

    // Compute devices installed avg (average per allocation if available)
    const devicesInstalledAvg = useMemo(() => {
        if (!dashboard?.allocations) return 0;
        const installed = dashboard.allocations.totalInstalled || 0;
        const allocated = dashboard.allocations.totalAllocated || 0;
        if (allocated === 0) return installed;
        return (installed / allocated * 100).toFixed(0);
    }, [dashboard]);

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

            {/* ─── Hero Stats Row ─── */}
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
                    onClick={() => { setActiveTab('devices'); document.querySelector('.tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
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
                        onClick={() => { setActiveTab('vendor'); document.querySelector('.tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
                    >
                        <span className="pd-count-value">{dashboard?.dailyLogs?.totalManHours || 0}</span>
                        <span className="pd-count-label">Man-Hours</span>
                    </button>
                    <button
                        className="pd-count-cell"
                        onClick={() => { setActiveTab('challenges'); document.querySelector('.tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
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
                        onClick={() => { setActiveTab('logs'); document.querySelector('.tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
                    >
                        <span className="pd-count-value">{dashboard?.dailyLogs?.total || 0}</span>
                        <span className="pd-count-label">Daily Log</span>
                    </button>
                </div>
            </div>

            {/* ─── Project Progress + Timeline Status ─── */}
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

            {/* Tabs */}
            <div className="glass-card">
                <div className="tabs">
                    <button
                        className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
                        onClick={() => setActiveTab('overview')}
                    >
                        <FileText size={16} /> Overview
                    </button>
                    <button
                        className={`tab ${activeTab === 'logs' ? 'active' : ''}`}
                        onClick={() => setActiveTab('logs')}
                    >
                        <FileText size={16} /> Daily Logs
                        <span className="tab-badge">{dashboard?.dailyLogs?.total || 0}</span>
                    </button>
                    <button
                        className={`tab ${activeTab === 'devices' ? 'active' : ''}`}
                        onClick={() => setActiveTab('devices')}
                    >
                        <Camera size={16} /> Devices
                        <span className="tab-badge">{dashboard?.allocations?.totalInstalled || 0}</span>
                    </button>
                    <button
                        className={`tab ${activeTab === 'vendor' ? 'active' : ''}`}
                        onClick={() => setActiveTab('vendor')}
                    >
                        <Truck size={16} /> Vendor Work
                        <span className="tab-badge">{dashboard?.vendorWork?.totalLogs || 0}</span>
                    </button>
                    <button
                        className={`tab ${activeTab === 'challenges' ? 'active' : ''}`}
                        onClick={() => setActiveTab('challenges')}
                    >
                        <AlertTriangle size={16} /> Challenges
                        <span className="tab-badge">{dashboard?.challenges?.total || 0}</span>
                    </button>
                    <button
                        className={`tab ${activeTab === 'stock' ? 'active' : ''}`}
                        onClick={() => setActiveTab('stock')}
                    >
                        <Package size={16} /> Allocated Stock
                        <span className="tab-badge">{dashboard?.allocations?.remaining || 0}</span>
                    </button>
                </div>

                {/* Tab Content */}
                <div className="tab-content">
                    {activeTab === 'overview' && (
                        <OverviewTab project={project} />
                    )}
                    {activeTab === 'logs' && (
                        <DailyLogsTab
                            projectId={id}
                            logs={dashboard?.recentLogs || []}
                            canAdd={isAssignedPM || canEdit}
                        />
                    )}
                    {activeTab === 'devices' && (
                        <DevicesTab
                            projectId={id}
                            stats={dashboard?.devices || {}}
                            allocStats={dashboard?.allocations || {}}
                        />
                    )}
                    {activeTab === 'vendor' && (
                        <VendorTab
                            projectId={id}
                            stats={dashboard?.vendorWork || {}}
                        />
                    )}
                    {activeTab === 'challenges' && (
                        <ChallengesTab
                            projectId={id}
                            stats={dashboard?.challenges || {}}
                        />
                    )}
                    {activeTab === 'stock' && (
                        <AllocatedStockTab
                            projectId={id}
                            allocStats={dashboard?.allocations || {}}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

// Tab Components
function OverviewTab({ project }) {
    return (
        <div className="overview-content">
            <div className="form-grid">
                <div className="info-section">
                    <h4>Project Details</h4>
                    <div className="info-item">
                        <span className="label">Description</span>
                        <span className="value">{project.description || 'No description'}</span>
                    </div>
                    <div className="info-item">
                        <span className="label">Contract Period</span>
                        <span className="value">
                            {format(new Date(project.contractStartDate), 'dd MMM yyyy')} -
                            {format(new Date(project.contractEndDate), 'dd MMM yyyy')}
                        </span>
                    </div>
                    {project.contractValue && (
                        <div className="info-item">
                            <span className="label">Contract Value</span>
                            <span className="value">{project.contractValue.toLocaleString()}</span>
                        </div>
                    )}
                    {project.linkedSiteId && (
                        <div className="info-item">
                            <span className="label">Linked Site</span>
                            <span className="value">
                                {project.linkedSiteId.siteName}
                                {project.linkedSiteId.siteUniqueID && (
                                    <span className="text-secondary" style={{ marginLeft: '6px' }}>
                                        ({project.linkedSiteId.siteUniqueID})
                                    </span>
                                )}
                            </span>
                        </div>
                    )}
                </div>
                <div className="info-section">
                    <h4>Location</h4>
                    <div className="info-item">
                        <span className="label">Address</span>
                        <span className="value">{project.siteAddress}</span>
                    </div>
                    <div className="info-item">
                        <span className="label">City / State</span>
                        <span className="value">{project.city}, {project.state}</span>
                    </div>
                    {project.latitude && project.longitude && (
                        <div className="info-item">
                            <span className="label">GPS</span>
                            <span className="value">{project.latitude}, {project.longitude}</span>
                        </div>
                    )}
                </div>
                <div className="info-section">
                    <h4>Team</h4>
                    <div className="info-item">
                        <span className="label">Project Manager</span>
                        <span className="value">{project.assignedPM?.fullName || 'Unassigned'}</span>
                    </div>
                    {project.teamMembers?.length > 0 && (
                        <div className="info-item">
                            <span className="label">Team Members</span>
                            <span className="value">
                                {project.teamMembers.map(m => m.fullName).join(', ')}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function DailyLogsTab({ projectId, logs, canAdd }) {
    const navigate = useNavigate();

    return (
        <div>
            {canAdd && (
                <div style={{ marginBottom: '1rem' }}>
                    <Link to={`/fieldops/projects/${projectId}/daily-log`} className="btn btn-primary">
                        <Plus size={18} /> Submit Daily Log
                    </Link>
                </div>
            )}

            {logs.length === 0 ? (
                <div className="empty-state">
                    <FileText size={48} />
                    <h3>No daily logs yet</h3>
                    <p>Start tracking daily progress by submitting a log.</p>
                </div>
            ) : (
                <div className="log-list">
                    {logs.map(log => (
                        <div key={log._id} className="log-card" onClick={() => navigate(`/fieldops/pm-logs/${log._id}`)}>
                            <div className="log-card-header">
                                <span className="log-date">
                                    {format(new Date(log.logDate), 'EEEE, dd MMM yyyy')}
                                </span>
                                <span className="log-number">{log.logNumber}</span>
                            </div>
                            <p className="log-summary">
                                {log.workSummary?.substring(0, 150)}
                                {log.workSummary?.length > 150 && '...'}
                            </p>
                            <div className="log-stats">
                                <span className="log-stat">
                                    <BarChart3 size={14} /> {log.progressPercentage}%
                                </span>
                                <span className="log-stat">
                                    <Clock size={14} /> {log.manHours}h
                                </span>
                                <span className="log-stat">
                                    <Users size={14} /> {log.teamCount} workers
                                </span>
                                <span className="log-stat">
                                    <User size={14} /> {log.submittedBy?.fullName}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Link to={`/fieldops/pm-logs?projectId=${projectId}`} className="btn btn-ghost" style={{ marginTop: '1rem' }}>
                View All Logs
            </Link>
        </div>
    );
}

function DevicesTab({ projectId, stats, allocStats }) {
    // Stock-based counts (actual installation progress)
    const stockInstalled = allocStats?.totalInstalled || 0;
    const stockAllocated = allocStats?.totalAllocated || 0;
    const stockFaulty = allocStats?.totalFaulty || 0;
    const stockRemaining = allocStats?.remaining || 0;

    // DeviceInstallation records (for configuration tracking)
    const deviceRecords = stats?.total || 0;
    const pendingConfig = Math.max(0, stockInstalled - deviceRecords);

    return (
        <div>
            <div style={{ marginBottom: '1rem', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <Link to={`/fieldops/projects/${projectId}/devices/new`} className="btn btn-primary">
                    <Plus size={18} /> Add Device
                </Link>
                <Link to={`/fieldops/devices/assignment?projectId=${projectId}`} className="btn btn-ghost">
                    <UserPlus size={18} /> Assign Devices
                </Link>
            </div>

            {/* Stock-based installation stats */}
            <div style={{ marginBottom: '1rem' }}>
                <h4 style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Installation Progress (Stock-based)</h4>
                <div className="stats-grid">
                    <div className="pm-stat-card">
                        <div className="pm-stat-content">
                            <h3>{stockInstalled}</h3>
                            <p>Installed</p>
                        </div>
                    </div>
                    <div className="pm-stat-card">
                        <div className="pm-stat-content">
                            <h3>{stockRemaining}</h3>
                            <p>Remaining</p>
                        </div>
                    </div>
                    <div className="pm-stat-card">
                        <div className="pm-stat-content">
                            <h3>{stockFaulty}</h3>
                            <p>Faulty</p>
                        </div>
                    </div>
                    <div className="pm-stat-card">
                        <div className="pm-stat-content">
                            <h3>{stockAllocated}</h3>
                            <p>Total Allocated</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Device records for configuration */}
            <div style={{ marginBottom: '1rem' }}>
                <h4 style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Configuration Tracking (Device Records)</h4>
                <div className="stats-grid">
                    <div className="pm-stat-card">
                        <div className="pm-stat-content">
                            <h3>{deviceRecords}</h3>
                            <p>Device Records</p>
                        </div>
                    </div>
                    <div className="pm-stat-card">
                        <div className="pm-stat-content">
                            <h3>{stats?.assignedCount || 0}</h3>
                            <p>Assigned to Engineers</p>
                        </div>
                    </div>
                    {Object.entries(stats?.byStatus || {}).map(([status, count]) => (
                        <div key={status} className="pm-stat-card">
                            <div className="pm-stat-content">
                                <h3>{count}</h3>
                                <p>{status}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Pending config notice */}
            {pendingConfig > 0 && (
                <div className="glass-card" style={{ background: 'var(--info-bg)', border: '1px solid var(--info-color)', marginBottom: '1rem', padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <Package size={18} />
                        <strong>{pendingConfig} installed devices pending configuration</strong>
                    </div>
                    <p style={{ marginBottom: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        These devices have been marked as installed in stock but don&apos;t have device records for configuration tracking.
                        You can create device records from the allocated stock page.
                    </p>
                    {/* <Link to={`/fieldops/projects/${projectId}/stock`} className="btn btn-secondary btn-sm">
                        <Package size={16} /> Go to Allocated Stock
                    </Link> */}
                </div>
            )}

            <div style={{ display: 'flex', gap: '8px' }}>
                <Link to={`/fieldops/devices?projectId=${projectId}`} className="btn btn-ghost">
                    View All Devices
                </Link>
                <Link to={`/fieldops/projects/${projectId}/devices/assigned`} className="btn btn-secondary">
                    View Assigned Devices List
                </Link>
            </div>
        </div>
    );
}

function VendorTab({ projectId, stats }) {
    return (
        <div>
            <div style={{ marginBottom: '1rem' }}>
                <Link to={`/fieldops/projects/${projectId}/vendor-logs/new`} className="btn btn-primary">
                    <Plus size={18} /> Add Vendor Work Log
                </Link>
            </div>

            <div className="stats-grid">
                <div className="pm-stat-card">
                    <div className="pm-stat-content">
                        <h3>{stats.totalLogs || 0}</h3>
                        <p>Total Logs</p>
                    </div>
                </div>
                <div className="pm-stat-card">
                    <div className="pm-stat-content">
                        <h3>{stats.totalCrewCount || 0}</h3>
                        <p>Total Crew</p>
                    </div>
                </div>
                <div className="pm-stat-card">
                    <div className="pm-stat-content">
                        <h3>{stats.totalLengthMeters || 0}m</h3>
                        <p>Work Length</p>
                    </div>
                </div>
            </div>

            <Link to={`/fieldops/vendor-logs?projectId=${projectId}`} className="btn btn-ghost" style={{ marginTop: '1rem' }}>
                View All Vendor Logs
            </Link>
        </div>
    );
}

function ChallengesTab({ projectId, stats }) {
    return (
        <div>
            <div style={{ marginBottom: '1rem' }}>
                <Link to={`/fieldops/projects/${projectId}/challenges/new`} className="btn btn-primary">
                    <Plus size={18} /> Report Challenge
                </Link>
            </div>

            <div className="stats-grid">
                {Object.entries(stats.byStatus || {}).map(([status, count]) => (
                    <div key={status} className="pm-stat-card">
                        <div className="pm-stat-content">
                            <h3>{count}</h3>
                            <p>{status}</p>
                        </div>
                    </div>
                ))}
            </div>

            <Link to={`/fieldops/challenges?projectId=${projectId}`} className="btn btn-ghost" style={{ marginTop: '1rem' }}>
                View All Challenges
            </Link>
        </div>
    );
}
