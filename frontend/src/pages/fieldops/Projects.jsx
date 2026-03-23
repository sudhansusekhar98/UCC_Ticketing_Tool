import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Plus,
    Search,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    MapPin,
    Edit,
    Eye,
    Calendar,
    User,
    Building,
    FolderOpen,
    Filter
} from 'lucide-react';
import { fieldOpsApi } from '../../services/api';
import useAuthStore from '../../context/authStore';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import './fieldops.css';

const PROJECT_STATUSES = ['Planning', 'Active', 'OnHold', 'Completed', 'Cancelled'];

const statusColors = {
    Planning: 'status-badge-info',
    Active: 'status-badge-success',
    OnHold: 'status-badge-warning',
    Completed: 'status-badge-secondary',
    Cancelled: 'status-badge-danger'
};

export default function Projects() {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ total: 0, pages: 1 });
    const pageSize = 20;
    const navigate = useNavigate();
    const { hasRole } = useAuthStore();
    
    const canCreate = hasRole(['Admin', 'Supervisor']);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Fetch projects
    useEffect(() => {
        fetchProjects();
    }, [page, statusFilter, debouncedSearch]);

    const fetchProjects = async () => {
        setLoading(true);
        try {
            const response = await fieldOpsApi.getProjects({
                page,
                limit: pageSize,
                search: debouncedSearch || undefined,
                status: statusFilter || undefined
            });
            setProjects(response.data.data || []);
            setPagination(response.data.pagination || { total: 0, pages: 1 });
        } catch (error) {
            toast.error('Failed to load projects');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const totalPages = pagination.pages;

    return (
        <div className="page-container animate-fade-in">
            <div className="page-header">
                <div className="header-left">
                    <FolderOpen size={28} className="page-icon" />
                    <h1 className="page-title">VLAccess Projects</h1>
                    <span className="record-count">{pagination.total} projects</span>
                </div>
                <div className="header-actions">
                    <button onClick={fetchProjects} className="btn btn-ghost" title="Refresh">
                        <RefreshCw size={18} />
                    </button>
                    {canCreate && (
                        <Link to="/fieldops/projects/new" className="btn btn-primary">
                            <Plus size={18} />
                            New Project
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
                            placeholder="Search by project name, client, or number..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                    </div>
                    <div className="filter-group">
                        <Filter size={18} />
                        <select
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                            className="filter-select"
                        >
                            <option value="">All Statuses</option>
                            {PROJECT_STATUSES.map(status => (
                                <option key={status} value={status}>{status}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Projects Table */}
            <div className="glass-card">
                {loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Loading projects...</p>
                    </div>
                ) : projects.length === 0 ? (
                    <div className="empty-state">
                        <FolderOpen size={48} />
                        <h3>No projects found</h3>
                        <p>Get started by creating your first field project.</p>
                        {canCreate && (
                            <Link to="/fieldops/projects/new" className="btn btn-primary">
                                <Plus size={18} /> Create Project
                            </Link>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="table-responsive">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Project #</th>
                                        <th>Project Name</th>
                                        <th>Client</th>
                                        <th>Location</th>
                                        <th>Assigned PM</th>
                                        <th>Contract Period</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {projects.map(project => (
                                        <tr key={project._id} onClick={() => navigate(`/fieldops/projects/${project._id}`)} className="clickable-row">
                                            <td className="project-number">{project.projectNumber}</td>
                                            <td className="project-name">
                                                <strong>{project.projectName}</strong>
                                            </td>
                                            <td>
                                                <div className="cell-with-icon">
                                                    <Building size={14} />
                                                    {project.clientName}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="cell-with-icon">
                                                    <MapPin size={14} />
                                                    {project.city || project.siteAddress?.substring(0, 30)}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="cell-with-icon">
                                                    <User size={14} />
                                                    {project.assignedPM?.fullName || 'Unassigned'}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="cell-with-icon">
                                                    <Calendar size={14} />
                                                    {project.contractStartDate && format(new Date(project.contractStartDate), 'dd MMM yyyy')}
                                                    {' - '}
                                                    {project.contractEndDate && format(new Date(project.contractEndDate), 'dd MMM yyyy')}
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`status-badge ${statusColors[project.status] || ''}`}>
                                                    {project.status}
                                                </span>
                                            </td>
                                            <td onClick={(e) => e.stopPropagation()}>
                                                <div className="action-buttons">
                                                    <Link to={`/fieldops/projects/${project._id}`} className="btn btn-ghost btn-sm" title="View">
                                                        <Eye size={16} />
                                                    </Link>
                                                    {canCreate && (
                                                        <Link to={`/fieldops/projects/${project._id}/edit`} className="btn btn-ghost btn-sm" title="Edit">
                                                            <Edit size={16} />
                                                        </Link>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
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
