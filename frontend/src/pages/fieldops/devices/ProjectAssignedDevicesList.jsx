import { useState, useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
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
    Wifi,
    CheckCircle,
    AlertTriangle,
    Clock,
    User,
    Users,
    Package,
    UserPlus
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

export default function ProjectAssignedDevicesList() {
    const { projectId } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const { hasRole } = useAuthStore();

    const [devices, setDevices] = useState([]);
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [assignedFilter, setAssignedFilter] = useState(searchParams.get('assigned') || '');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ total: 0, pages: 1 });
    const pageSize = 30;

    const canEdit = hasRole(['Admin', 'Supervisor', 'L1Engineer', 'L2Engineer']);

    useEffect(() => {
        if (projectId) {
            loadProjectDetails();
        }
    }, [projectId]);

    useEffect(() => {
        fetchDevices();
    }, [page, typeFilter, statusFilter, assignedFilter, projectId]);

    const loadProjectDetails = async () => {
        try {
            const res = await fieldOpsApi.getProjectById(projectId);
            setProject(res.data.data);
        } catch (error) {
            console.error('Failed to load project details:', error);
        }
    };

    const fetchDevices = async () => {
        if (!projectId) return;
        setLoading(true);
        try {
            const params = {
                page,
                limit: pageSize,
                projectId: projectId,
                deviceType: typeFilter || undefined,
                status: statusFilter || undefined
            };
            // Only add isAssigned filter if explicitly set
            if (assignedFilter === 'true') {
                params.isAssigned = 'true';
            } else if (assignedFilter === 'false') {
                params.isAssigned = 'false';
            }

            const response = await fieldOpsApi.getDeviceInstallations(params);
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
            device.installationLocation?.description?.toLowerCase().includes(search) ||
            device.assignedTo?.fullName?.toLowerCase().includes(search)
        );
    });

    const totalPages = pagination.pages;

    // Dynamic title based on filter
    const getTitle = () => {
        if (assignedFilter === 'true') return 'Assigned Devices';
        if (assignedFilter === 'false') return 'Unassigned Devices';
        return 'Device Records';
    };

    return (
        <div className="page-container animate-fade-in">
            <div className="page-header">
                <div className="header-left">
                    <Link to={`/fieldops/projects/${projectId}`} className="back-button" style={{ marginRight: '1rem', display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }}>
                        <ChevronLeft size={24} />
                    </Link>
                    <Camera size={28} className="page-icon" />
                    <div>
                        <h1 className="page-title">{getTitle()}</h1>
                        {project && <p className="text-secondary">{project.projectNumber} - {project.projectName}</p>}
                    </div>
                </div>
                <div className="header-actions">
                    <Link to={`/fieldops/projects/${projectId}/devices/new`} className="btn btn-primary">
                        <Plus size={18} /> Add Device
                    </Link>
                    <Link to={`/fieldops/devices/assignment?projectId=${projectId}`} className="btn btn-ghost">
                        <UserPlus size={18} /> Assign
                    </Link>
                    <button onClick={fetchDevices} className="btn btn-ghost" title="Refresh">
                        <RefreshCw size={18} />
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="filter-section glass-card">
                <div className="filter-row">
                    <div className="search-box">
                        <Search size={18} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search by make, model, serial, engineer..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
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
                    <div className="filter-group">
                        <select
                            value={assignedFilter}
                            onChange={(e) => { setAssignedFilter(e.target.value); setPage(1); }}
                            className="filter-select"
                        >
                            <option value="">All Devices</option>
                            <option value="true">Assigned Only</option>
                            <option value="false">Unassigned Only</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="glass-card mt-4">
                <h3 className="card-title mb-4">
                    Device Records: {pagination.total}
                </h3>
                {loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Loading devices...</p>
                    </div>
                ) : filteredDevices.length === 0 ? (
                    <div className="empty-state">
                        <Package size={48} />
                        <h3>No device records found</h3>
                        <p>Device records are created when you add devices for configuration tracking.</p>
                        <Link to={`/fieldops/projects/${projectId}/devices/new`} className="btn btn-primary" style={{ marginTop: '1rem' }}>
                            <Plus size={18} /> Add Device
                        </Link>
                    </div>
                ) : (
                    <>
                        <div className="table-responsive">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Device</th>
                                        <th>Zone/Location</th>
                                        <th>IP Address</th>
                                        <th>Status</th>
                                        <th>Assigned To</th>
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
                                                    <div>{device.zoneId?.zoneName || '-'}</div>
                                                    <div className="cell-with-icon text-sm text-secondary">
                                                        <MapPin size={12} />
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
                                                    <div className="cell-with-icon font-medium">
                                                        <User size={14} />
                                                        {device.assignedTo?.fullName || '-'}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="action-buttons">
                                                        <Link
                                                            to={`/fieldops/projects/${device.projectId?._id || device.projectId}/devices/${device._id}/edit`}
                                                            className="btn btn-ghost btn-sm"
                                                            title="View Details"
                                                        >
                                                            <Edit size={16} />
                                                        </Link>
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


