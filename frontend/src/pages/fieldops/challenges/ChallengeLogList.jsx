import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import {
    Plus,
    Search,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    AlertTriangle,
    Filter,
    Edit,
    Eye,
    MessageSquare,
    Flag,
    CheckCircle
} from 'lucide-react';
import { fieldOpsApi } from '../../../services/api';
import useAuthStore from '../../../context/authStore';
import toast from 'react-hot-toast';
import { format, formatDistanceToNow } from 'date-fns';
import '../fieldops.css';

const ISSUE_TYPES = ['Technical', 'Civil', 'Vendor', 'Client', 'Permit', 'Safety', 'Material', 'Weather', 'Other'];
const SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];
const RESOLUTION_STATUSES = ['Open', 'InProgress', 'Resolved', 'Closed', 'Deferred'];

const severityColors = {
    Low: 'status-badge-success',
    Medium: 'status-badge-warning',
    High: 'status-badge-danger',
    Critical: 'status-badge-danger'
};

const statusColors = {
    Open: 'status-badge-warning',
    InProgress: 'status-badge-info',
    Resolved: 'status-badge-success',
    Closed: 'status-badge-secondary',
    Deferred: 'status-badge-secondary'
};

export default function ChallengeLogList() {
    const [searchParams] = useSearchParams();
    const projectIdFromUrl = searchParams.get('projectId');
    const navigate = useNavigate();
    const { hasRole } = useAuthStore();

    const [challenges, setChallenges] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [projectFilter, setProjectFilter] = useState(projectIdFromUrl || '');
    const [typeFilter, setTypeFilter] = useState('');
    const [severityFilter, setSeverityFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ total: 0, pages: 1 });
    const pageSize = 20;

    const canAdd = hasRole(['Admin', 'Supervisor', 'L1Engineer', 'L2Engineer']);

    useEffect(() => {
        loadProjects();
    }, []);

    useEffect(() => {
        fetchChallenges();
    }, [page, projectFilter, typeFilter, severityFilter, statusFilter]);

    const loadProjects = async () => {
        try {
            const response = await fieldOpsApi.getProjects({ limit: 100 });
            setProjects(response.data.data || []);
        } catch (error) {
            console.error('Failed to load projects:', error);
        }
    };

    const fetchChallenges = async () => {
        setLoading(true);
        try {
            const response = await fieldOpsApi.getChallengeLogs({
                page,
                limit: pageSize,
                projectId: projectFilter || undefined,
                issueType: typeFilter || undefined,
                severity: severityFilter || undefined,
                resolutionStatus: statusFilter || undefined
            });
            setChallenges(response.data.data || []);
            setPagination(response.data.pagination || { total: 0, pages: 1 });
        } catch (error) {
            toast.error('Failed to load challenges');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleResolve = async (id) => {
        const resolution = prompt('Enter resolution description:');
        if (!resolution) return;

        try {
            await fieldOpsApi.resolveChallengeLog(id, resolution);
            toast.success('Challenge marked as resolved');
            fetchChallenges();
        } catch (error) {
            toast.error('Failed to resolve challenge');
        }
    };

    const filteredChallenges = challenges.filter(challenge => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return (
            challenge.title?.toLowerCase().includes(search) ||
            challenge.description?.toLowerCase().includes(search) ||
            challenge.challengeNumber?.toLowerCase().includes(search)
        );
    });

    const totalPages = pagination.pages;

    return (
        <div className="page-container animate-fade-in">
            <div className="page-header">
                <div className="header-left">
                    <AlertTriangle size={28} className="page-icon" />
                    <h1 className="page-title">Challenge Logs</h1>
                    <span className="record-count">{pagination.total} challenges</span>
                </div>
                <div className="header-actions">
                    <button onClick={fetchChallenges} className="btn btn-ghost" title="Refresh">
                        <RefreshCw size={18} />
                    </button>
                    {canAdd && projectFilter && (
                        <Link to={`/fieldops/projects/${projectFilter}/challenges/new`} className="btn btn-primary">
                            <Plus size={18} />
                            Report Challenge
                        </Link>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="filter-section glass-card">
                <div className="filter-row">
                    <div className="search-box">
                        <Search size={18} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search by title or description..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                    </div>
                    <div className="filter-group">
                        <Filter size={18} />
                        <select
                            value={projectFilter}
                            onChange={(e) => { setProjectFilter(e.target.value); setPage(1); }}
                            className="filter-select"
                        >
                            <option value="">All Projects</option>
                            {projects.map(project => (
                                <option key={project._id} value={project._id}>
                                    {project.projectNumber} - {project.projectName}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="filter-group">
                        <select
                            value={typeFilter}
                            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
                            className="filter-select"
                        >
                            <option value="">All Types</option>
                            {ISSUE_TYPES.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>
                    <div className="filter-group">
                        <select
                            value={severityFilter}
                            onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }}
                            className="filter-select"
                        >
                            <option value="">All Severities</option>
                            {SEVERITIES.map(sev => (
                                <option key={sev} value={sev}>{sev}</option>
                            ))}
                        </select>
                    </div>
                    <div className="filter-group">
                        <select
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                            className="filter-select"
                        >
                            <option value="">All Statuses</option>
                            {RESOLUTION_STATUSES.map(status => (
                                <option key={status} value={status}>
                                    {status.replace(/([A-Z])/g, ' $1').trim()}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Challenges List */}
            <div className="glass-card">
                {loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Loading challenges...</p>
                    </div>
                ) : filteredChallenges.length === 0 ? (
                    <div className="empty-state">
                        <AlertTriangle size={48} />
                        <h3>No challenges found</h3>
                        <p>No issues have been reported yet.</p>
                    </div>
                ) : (
                    <>
                        <div className="challenge-list">
                            {filteredChallenges.map(challenge => (
                                <div key={challenge._id} className="challenge-card">
                                    <div className="challenge-header">
                                        <div className="challenge-title-row">
                                            <span className="project-number">{challenge.challengeNumber}</span>
                                            <h4 className="challenge-title">{challenge.title}</h4>
                                            {challenge.escalateToAdmin && (
                                                <span className="escalate-badge">
                                                    <Flag size={12} /> Escalated
                                                </span>
                                            )}
                                        </div>
                                        <div className="challenge-badges">
                                            <span className={`status-badge ${severityColors[challenge.severity]}`}>
                                                {challenge.severity}
                                            </span>
                                            <span className={`status-badge ${statusColors[challenge.resolutionStatus]}`}>
                                                {challenge.resolutionStatus?.replace(/([A-Z])/g, ' $1').trim()}
                                            </span>
                                        </div>
                                    </div>

                                    <p className="challenge-description">
                                        {challenge.description?.substring(0, 200)}
                                        {challenge.description?.length > 200 && '...'}
                                    </p>

                                    <div className="challenge-meta">
                                        <span>
                                            <AlertTriangle size={14} /> {challenge.issueType}
                                        </span>
                                        <span>
                                            Project: {challenge.projectId?.projectNumber || 'N/A'}
                                        </span>
                                        <span>
                                            Reported: {challenge.createdAt && formatDistanceToNow(new Date(challenge.createdAt), { addSuffix: true })}
                                        </span>
                                        {challenge.reportedBy && (
                                            <span>By: {challenge.reportedBy.name || challenge.reportedBy.username}</span>
                                        )}
                                    </div>

                                    <div className="challenge-actions">
                                        <Link
                                            to={`/fieldops/projects/${challenge.projectId?._id || challenge.projectId}/challenges/${challenge._id}/edit`}
                                            className="btn btn-ghost btn-sm"
                                        >
                                            <Edit size={16} /> Edit
                                        </Link>
                                        {challenge.resolutionStatus !== 'Resolved' && challenge.resolutionStatus !== 'Closed' && (
                                            <button
                                                onClick={() => handleResolve(challenge._id)}
                                                className="btn btn-ghost btn-sm"
                                            >
                                                <CheckCircle size={16} /> Resolve
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="pagination">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="btn btn-ghost btn-sm"
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                <span className="page-info">
                                    Page {page} of {totalPages}
                                </span>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="btn btn-ghost btn-sm"
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
