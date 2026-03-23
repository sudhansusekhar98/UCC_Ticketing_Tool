import { useState, useEffect } from 'react';
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
    UserPlus
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

            {/* Stats Grid */}
            <div className="stats-grid">
                <Link
                    to={`/fieldops/reports?projectId=${id}`}
                    className="pm-stat-card pm-stat-card-link"
                >
                    <div className="pm-stat-icon primary">
                        <BarChart3 size={24} />
                    </div>
                    <div className="pm-stat-content">
                        <h3>{dashboard?.dailyLogs?.avgProgress || 0}%</h3>
                        <p>Overall Progress</p>
                        <span className="pm-stat-card-hint">View Report →</span>
                    </div>
                </Link>

                {/* Devices Installed → Devices tab */}
                <button
                    className="pm-stat-card pm-stat-card-link"
                    onClick={() => { setActiveTab('devices'); document.querySelector('.tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
                >
                    <div className="pm-stat-icon success">
                        <Camera size={24} />
                    </div>
                    <div className="pm-stat-content">
                        <h3>{dashboard?.devices?.total || 0}</h3>
                        <p>Devices Installed</p>
                        <span className="pm-stat-card-hint">View Devices →</span>
                    </div>
                </button>

                {/* Daily Logs → Logs tab */}
                <button
                    className="pm-stat-card pm-stat-card-link"
                    onClick={() => { setActiveTab('logs'); document.querySelector('.tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
                >
                    <div className="pm-stat-icon info">
                        <FileText size={24} />
                    </div>
                    <div className="pm-stat-content">
                        <h3>{dashboard?.dailyLogs?.total || 0}</h3>
                        <p>Daily Logs</p>
                        <span className="pm-stat-card-hint">View Logs →</span>
                    </div>
                </button>

                {/* Open Challenges → Challenges tab */}
                <button
                    className="pm-stat-card pm-stat-card-link"
                    onClick={() => { setActiveTab('challenges'); document.querySelector('.tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
                >
                    <div className="pm-stat-icon warning">
                        <AlertTriangle size={24} />
                    </div>
                    <div className="pm-stat-content">
                        <h3>{dashboard?.challenges?.byStatus?.Open || 0}</h3>
                        <p>Open Challenges</p>
                        <span className="pm-stat-card-hint">View Challenges →</span>
                    </div>
                </button>

                {/* Total Man-Hours → Vendor Work tab */}
                <button
                    className="pm-stat-card pm-stat-card-link"
                    onClick={() => { setActiveTab('vendor'); document.querySelector('.tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
                >
                    <div className="pm-stat-icon primary">
                        <Clock size={24} />
                    </div>
                    <div className="pm-stat-content">
                        <h3>{dashboard?.dailyLogs?.totalManHours || 0}</h3>
                        <p>Total Man-Hours</p>
                        <span className="pm-stat-card-hint">View Vendor Work →</span>
                    </div>
                </button>

                {/* Allocated Stock → Stock tab */}
                <button
                    className="pm-stat-card pm-stat-card-link"
                    onClick={() => { setActiveTab('stock'); document.querySelector('.tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
                >
                    <div className="pm-stat-icon info">
                        <Package size={24} />
                    </div>
                    <div className="pm-stat-content">
                        <h3>{dashboard?.allocations?.remaining || 0}</h3>
                        <p>Stock Remaining</p>
                        <span className="pm-stat-card-hint">View Stock →</span>
                    </div>
                </button>
            </div>

            {/* Progress Bar */}
            <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span>Project Progress</span>
                    <span>{dashboard?.dailyLogs?.avgProgress || 0}%</span>
                </div>
                <div className="progress-bar-container">
                    <div
                        className="progress-bar"
                        style={{ width: `${dashboard?.dailyLogs?.avgProgress || 0}%` }}
                    />
                </div>
            </div>

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
                        <span className="tab-badge">{dashboard?.devices?.total || 0}</span>
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

function DevicesTab({ projectId, stats }) {
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

            <div className="stats-grid" style={{ marginBottom: '1rem' }}>
                {Object.entries(stats.byStatus || {}).map(([status, count]) => (
                    <div key={status} className="pm-stat-card">
                        <div className="pm-stat-content">
                            <h3>{count}</h3>
                            <p>{status}</p>
                        </div>
                    </div>
                ))}
            </div>

            <Link to={`/fieldops/devices?projectId=${projectId}`} className="btn btn-ghost">
                View All Devices
            </Link>
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
