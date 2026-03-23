import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import {
    Plus,
    Search,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    Camera,
    MapPin,
    Filter,
    Edit,
    Eye,
    Wifi,
    CheckCircle,
    AlertTriangle,
    Clock
} from 'lucide-react';
import { fieldOpsApi } from '../../../services/api';
import useAuthStore from '../../../context/authStore';
import toast from 'react-hot-toast';
import '../fieldops.css';

const DEVICE_TYPES = ['IPCamera', 'NVR', 'DVR', 'PTZ', 'Cable', 'AccessPoint', 'Switch', 'Router', 'Other'];
const INSTALLATION_STATUSES = ['Pending', 'Installed', 'Configured', 'Tested', 'Deployed', 'Faulty'];

const statusIcons = {
    Pending: Clock,
    Installed: CheckCircle,
    Configured: Wifi,
    Tested: CheckCircle,
    Deployed: CheckCircle,
    Faulty: AlertTriangle
};

const statusColors = {
    Pending: 'status-badge-warning',
    Installed: 'status-badge-info',
    Configured: 'status-badge-info',
    Tested: 'status-badge-success',
    Deployed: 'status-badge-success',
    Faulty: 'status-badge-danger'
};

export default function DeviceInstallationList() {
    const [searchParams] = useSearchParams();
    const projectIdFromUrl = searchParams.get('projectId');
    const navigate = useNavigate();
    const { hasRole } = useAuthStore();

    const [devices, setDevices] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [projectFilter, setProjectFilter] = useState(projectIdFromUrl || '');
    const [typeFilter, setTypeFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ total: 0, pages: 1 });
    const pageSize = 30;

    const canEdit = hasRole(['Admin', 'Supervisor', 'L1Engineer', 'L2Engineer']);

    useEffect(() => {
        loadProjects();
    }, []);

    useEffect(() => {
        fetchDevices();
    }, [page, projectFilter, typeFilter, statusFilter]);

    const loadProjects = async () => {
        try {
            const response = await fieldOpsApi.getProjects({ limit: 100 });
            setProjects(response.data.data || []);
        } catch (error) {
            console.error('Failed to load projects:', error);
        }
    };

    const fetchDevices = async () => {
        setLoading(true);
        try {
            const response = await fieldOpsApi.getDeviceInstallations({
                page,
                limit: pageSize,
                projectId: projectFilter || undefined,
                deviceType: typeFilter || undefined,
                status: statusFilter || undefined
            });
            setDevices(response.data.data || []);
            setPagination(response.data.pagination || { total: 0, pages: 1 });
        } catch (error) {
            toast.error('Failed to load devices');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const filteredDevices = devices.filter(device => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return (
            device.make?.toLowerCase().includes(search) ||
            device.model?.toLowerCase().includes(search) ||
            device.serialNumber?.toLowerCase().includes(search) ||
            device.installationLocation?.description?.toLowerCase().includes(search)
        );
    });

    const totalPages = pagination.pages;

    return (
        <div className="page-container animate-fade-in">
            <div className="page-header">
                <div className="header-left">
                    <Camera size={28} className="page-icon" />
                    <h1 className="page-title">Device Installations</h1>
                    <span className="record-count">{pagination.total} devices</span>
                </div>
                <div className="header-actions">
                    <button onClick={fetchDevices} className="btn btn-ghost" title="Refresh">
                        <RefreshCw size={18} />
                    </button>
                    {canEdit && projectFilter && (
                        <Link to={`/fieldops/projects/${projectFilter}/devices/new`} className="btn btn-primary">
                            <Plus size={18} />
                            Add Device
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
                            placeholder="Search by make, model, serial..."
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
                            {DEVICE_TYPES.map(type => (
                                <option key={type} value={type}>{type}</option>
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
                            {INSTALLATION_STATUSES.map(status => (
                                <option key={status} value={status}>{status}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Devices Table */}
            <div className="glass-card">
                {loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Loading devices...</p>
                    </div>
                ) : filteredDevices.length === 0 ? (
                    <div className="empty-state">
                        <Camera size={48} />
                        <h3>No devices found</h3>
                        <p>Select a project and add device installations.</p>
                    </div>
                ) : (
                    <>
                        <div className="table-responsive">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Device</th>
                                        <th>Project</th>
                                        <th>Zone</th>
                                        <th>Location</th>
                                        <th>IP Address</th>
                                        <th>Status</th>
                                        <th>Installed By</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredDevices.map(device => {
                                        const StatusIcon = statusIcons[device.status] || Clock;
                                        return (
                                            <tr key={device._id}>
                                                <td>
                                                    <div>
                                                        <strong>{device.deviceType}</strong>
                                                        <div className="text-sm text-secondary">
                                                            {device.make} {device.model}
                                                        </div>
                                                        {device.serialNumber && (
                                                            <div className="text-sm text-secondary">
                                                                S/N: {device.serialNumber}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td>
                                                    <Link to={`/fieldops/projects/${device.projectId?._id || device.projectId}`} className="link">
                                                        {device.projectId?.projectNumber || 'N/A'}
                                                    </Link>
                                                </td>
                                                <td>{device.zoneId?.zoneName || '-'}</td>
                                                <td>
                                                    <div className="cell-with-icon">
                                                        <MapPin size={14} />
                                                        {device.installationLocation?.description || device.installationLocation?.poleWallId || '-'}
                                                    </div>
                                                </td>
                                                <td>
                                                    {device.networkDetails?.ipAddress || '-'}
                                                </td>
                                                <td>
                                                    <span className={`status-badge ${statusColors[device.status] || ''}`}>
                                                        <StatusIcon size={12} />
                                                        {device.status}
                                                    </span>
                                                </td>
                                                <td>
                                                    {device.installedBy?.fullName || '-'}
                                                </td>
                                                <td>
                                                    <div className="action-buttons">
                                                        {canEdit && (
                                                            <Link
                                                                to={`/fieldops/projects/${device.projectId?._id || device.projectId}/devices/${device._id}/edit`}
                                                                className="btn btn-ghost btn-sm"
                                                                title="Edit"
                                                            >
                                                                <Edit size={16} />
                                                            </Link>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
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
