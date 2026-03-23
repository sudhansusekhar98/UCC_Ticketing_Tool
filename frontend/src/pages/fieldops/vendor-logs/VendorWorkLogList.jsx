import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
    Plus,
    Search,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    Truck,
    MapPin,
    Filter,
    Edit,
    Users,
    Calendar
} from 'lucide-react';
import { fieldOpsApi } from '../../../services/api';
import useAuthStore from '../../../context/authStore';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import '../fieldops.css';

const LABOUR_TYPES = ['RoadDigging', 'CableLaying', 'Backfilling', 'RoadRestoration', 'TrenchMarking', 'Other'];

const trenchStatusColors = {
    Open: 'status-badge-warning',
    CableLaid: 'status-badge-info',
    Backfilled: 'status-badge-secondary',
    RoadRestored: 'status-badge-success',
    Pending: 'status-badge-warning'
};

export default function VendorWorkLogList() {
    const [searchParams] = useSearchParams();
    const projectIdFromUrl = searchParams.get('projectId');
    const { hasRole } = useAuthStore();

    const [logs, setLogs] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [projectFilter, setProjectFilter] = useState(projectIdFromUrl || '');
    const [typeFilter, setTypeFilter] = useState('');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ total: 0, pages: 1 });
    const pageSize = 20;

    const canAdd = hasRole(['Admin', 'Supervisor', 'L1Engineer', 'L2Engineer']);

    useEffect(() => {
        loadProjects();
    }, []);

    useEffect(() => {
        fetchLogs();
    }, [page, projectFilter, typeFilter]);

    const loadProjects = async () => {
        try {
            const response = await fieldOpsApi.getProjects({ limit: 100 });
            setProjects(response.data.data || []);
        } catch (error) {
            console.error('Failed to load projects:', error);
        }
    };

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const response = await fieldOpsApi.getVendorWorkLogs({
                page,
                limit: pageSize,
                projectId: projectFilter || undefined,
                labourType: typeFilter || undefined
            });
            setLogs(response.data.data || []);
            setPagination(response.data.pagination || { total: 0, pages: 1 });
        } catch (error) {
            toast.error('Failed to load vendor logs');
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
                    <Truck size={28} className="page-icon" />
                    <h1 className="page-title">Vendor Work Logs</h1>
                    <span className="record-count">{pagination.total} logs</span>
                </div>
                <div className="header-actions">
                    <button onClick={fetchLogs} className="btn btn-ghost" title="Refresh">
                        <RefreshCw size={18} />
                    </button>
                    {canAdd && projectFilter && (
                        <Link to={`/fieldops/projects/${projectFilter}/vendor-logs/new`} className="btn btn-primary">
                            <Plus size={18} />
                            Add Vendor Log
                        </Link>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="filter-section glass-card">
                <div className="filter-row">
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
                        <select
                            value={typeFilter}
                            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
                            className="filter-select"
                        >
                            <option value="">All Labour Types</option>
                            {LABOUR_TYPES.map(type => (
                                <option key={type} value={type}>
                                    {type.replace(/([A-Z])/g, ' $1').trim()}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Logs Table */}
            <div className="glass-card">
                {loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Loading vendor logs...</p>
                    </div>
                ) : logs.length === 0 ? (
                    <div className="empty-state">
                        <Truck size={48} />
                        <h3>No vendor logs found</h3>
                        <p>Select a project and add vendor work logs.</p>
                    </div>
                ) : (
                    <>
                        <div className="table-responsive">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Log #</th>
                                        <th>Date</th>
                                        <th>Project</th>
                                        <th>Labour Type</th>
                                        <th>Area</th>
                                        <th>Crew</th>
                                        <th>Trench Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map(log => (
                                        <tr key={log._id}>
                                            <td className="project-number">{log.logNumber}</td>
                                            <td>
                                                <div className="cell-with-icon">
                                                    <Calendar size={14} />
                                                    {log.logDate && format(new Date(log.logDate), 'dd MMM yyyy')}
                                                </div>
                                            </td>
                                            <td>
                                                <Link to={`/fieldops/projects/${log.projectId?._id || log.projectId}`} className="link">
                                                    {log.projectId?.projectNumber || 'N/A'}
                                                </Link>
                                            </td>
                                            <td>{log.labourType?.replace(/([A-Z])/g, ' $1').trim()}</td>
                                            <td>
                                                <div>
                                                    {log.areaWorked?.fromDescription && log.areaWorked?.toDescription ? (
                                                        <span>
                                                            {log.areaWorked.fromDescription} → {log.areaWorked.toDescription}
                                                        </span>
                                                    ) : (
                                                        '-'
                                                    )}
                                                    {log.areaWorked?.lengthMeters && (
                                                        <div className="text-sm text-secondary">
                                                            {log.areaWorked.lengthMeters}m
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="cell-with-icon">
                                                    <Users size={14} />
                                                    {log.crewCount || 0}
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`status-badge ${trenchStatusColors[log.trenchStatus] || ''}`}>
                                                    {log.trenchStatus?.replace(/([A-Z])/g, ' $1').trim()}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="action-buttons">
                                                    {canAdd && (
                                                        <Link
                                                            to={`/fieldops/projects/${log.projectId?._id || log.projectId}/vendor-logs/${log._id}/edit`}
                                                            className="btn btn-ghost btn-sm"
                                                            title="Edit"
                                                        >
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
