import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import {
    Clipboard,
    Search,
    RefreshCw,
    Camera,
    MapPin,
    Filter,
    CheckCircle,
    Wifi,
    AlertTriangle,
    Clock,
    ArrowLeft,
    ChevronRight,
    Settings
} from 'lucide-react';
import { fieldOpsApi } from '../../../services/api';
import useAuthStore from '../../../context/authStore';
import toast from 'react-hot-toast';
import { format, formatDistanceToNow } from 'date-fns';
import '../fieldops.css';

const DEVICE_TYPES = ['IPCamera', 'NVR', 'DVR', 'PTZ', 'AccessPoint', 'Switch', 'Router', 'UPS', 'Other'];
const STATUS_OPTIONS = ['Installed', 'Configured', 'Tested'];

const statusIcons = {
    Installed: Clock,
    Configured: Wifi,
    Tested: CheckCircle,
    Deployed: CheckCircle,
    Faulty: AlertTriangle
};

const statusColors = {
    Installed: 'status-badge-info',
    Configured: 'status-badge-warning',
    Tested: 'status-badge-success',
    Deployed: 'status-badge-success',
    Faulty: 'status-badge-danger'
};

export default function MyDeviceAssignments() {
    const [searchParams] = useSearchParams();
    const projectIdFromUrl = searchParams.get('projectId');
    const navigate = useNavigate();
    const { user } = useAuthStore();

    const [devices, setDevices] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [projectFilter, setProjectFilter] = useState(projectIdFromUrl || '');
    const [typeFilter, setTypeFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    useEffect(() => {
        loadProjects();
    }, []);

    useEffect(() => {
        fetchDevices();
    }, [projectFilter, typeFilter, statusFilter]);

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
            const response = await fieldOpsApi.getMyDeviceAssignments({
                projectId: projectFilter || undefined,
                status: statusFilter || undefined
            });
            setDevices(response.data.data || []);
        } catch (error) {
            toast.error('Failed to load assigned devices');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (deviceId, newStatus) => {
        try {
            await fieldOpsApi.updateDeviceStatus(deviceId, newStatus);
            toast.success(`Status updated to ${newStatus}`);
            fetchDevices();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update status');
        }
    };

    const filteredDevices = devices.filter(device => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return (
            device.deviceType?.toLowerCase().includes(search) ||
            device.make?.toLowerCase().includes(search) ||
            device.model?.toLowerCase().includes(search) ||
            device.serialNumber?.toLowerCase().includes(search) ||
            device.installationLocation?.description?.toLowerCase().includes(search)
        );
    }).filter(device => {
        if (!typeFilter) return true;
        return device.deviceType === typeFilter;
    });

    // Group by status for summary
    const statusSummary = devices.reduce((acc, d) => {
        acc[d.status] = (acc[d.status] || 0) + 1;
        return acc;
    }, {});

    return (
        <div className="page-container animate-fade-in">
            <div className="page-header">
                <div className="header-left">
                    <button onClick={() => navigate(-1)} className="btn btn-ghost">
                        <ArrowLeft size={18} />
                    </button>
                    <Clipboard size={28} className="page-icon" />
                    <div>
                        <h1 className="page-title">My Device Assignments</h1>
                        <p className="page-subtitle">Devices assigned to you for configuration/testing</p>
                    </div>
                </div>
                <div className="header-actions">
                    <button onClick={fetchDevices} className="btn btn-ghost" title="Refresh">
                        <RefreshCw size={18} />
                    </button>
                </div>
            </div>

            {/* Status Summary Cards */}
            <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
                <div className="pm-stat-card">
                    <div className="pm-stat-icon info">
                        <Clock size={24} />
                    </div>
                    <div className="pm-stat-content">
                        <h3>{statusSummary['Installed'] || 0}</h3>
                        <p>Awaiting Config</p>
                    </div>
                </div>
                <div className="pm-stat-card">
                    <div className="pm-stat-icon warning">
                        <Wifi size={24} />
                    </div>
                    <div className="pm-stat-content">
                        <h3>{statusSummary['Configured'] || 0}</h3>
                        <p>Configured</p>
                    </div>
                </div>
                <div className="pm-stat-card">
                    <div className="pm-stat-icon success">
                        <CheckCircle size={24} />
                    </div>
                    <div className="pm-stat-content">
                        <h3>{statusSummary['Tested'] || 0}</h3>
                        <p>Tested</p>
                    </div>
                </div>
                <div className="pm-stat-card">
                    <div className="pm-stat-icon primary">
                        <Camera size={24} />
                    </div>
                    <div className="pm-stat-content">
                        <h3>{devices.length}</h3>
                        <p>Total Assigned</p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="filter-section glass-card">
                <div className="filter-row">
                    <div className="search-box">
                        <Search size={18} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search by type, make, model, serial..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                    </div>
                    <div className="filter-group">
                        <Filter size={18} />
                        <select
                            value={projectFilter}
                            onChange={(e) => setProjectFilter(e.target.value)}
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
                            onChange={(e) => setTypeFilter(e.target.value)}
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
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="filter-select"
                        >
                            <option value="">All Statuses</option>
                            {STATUS_OPTIONS.map(status => (
                                <option key={status} value={status}>{status}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Devices List */}
            <div className="glass-card">
                {loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Loading your assignments...</p>
                    </div>
                ) : filteredDevices.length === 0 ? (
                    <div className="empty-state">
                        <CheckCircle size={48} />
                        <h3>No devices assigned</h3>
                        <p>You don't have any devices assigned for configuration/testing.</p>
                    </div>
                ) : (
                    <div className="device-cards-grid">
                        {filteredDevices.map(device => {
                            const StatusIcon = statusIcons[device.status] || Clock;
                            return (
                                <div key={device._id} className="device-assignment-card">
                                    <div className="device-card-header">
                                        <div className="device-info">
                                            <Camera size={20} />
                                            <div>
                                                <strong>{device.deviceType}</strong>
                                                <div className="text-sm text-secondary">
                                                    {device.make} {device.model}
                                                </div>
                                            </div>
                                        </div>
                                        <span className={`status-badge ${statusColors[device.status]}`}>
                                            <StatusIcon size={12} />
                                            {device.status}
                                        </span>
                                    </div>

                                    <div className="device-card-body">
                                        <div className="device-detail-row">
                                            <span className="label">Project:</span>
                                            <Link to={`/fieldops/projects/${device.projectId?._id}`} className="link">
                                                {device.projectId?.projectNumber}
                                            </Link>
                                        </div>
                                        {device.serialNumber && (
                                            <div className="device-detail-row">
                                                <span className="label">Serial:</span>
                                                <span>{device.serialNumber}</span>
                                            </div>
                                        )}
                                        {device.mac && (
                                            <div className="device-detail-row">
                                                <span className="label">MAC:</span>
                                                <span>{device.mac}</span>
                                            </div>
                                        )}
                                        {device.installationLocation?.description && (
                                            <div className="device-detail-row">
                                                <span className="label">Location:</span>
                                                <span className="cell-with-icon">
                                                    <MapPin size={12} />
                                                    {device.installationLocation.description}
                                                </span>
                                            </div>
                                        )}
                                        {device.networkDetails?.ipAddress && (
                                            <div className="device-detail-row">
                                                <span className="label">IP:</span>
                                                <span>{device.networkDetails.ipAddress}</span>
                                            </div>
                                        )}
                                        <div className="device-detail-row">
                                            <span className="label">Assigned:</span>
                                            <span className="text-secondary">
                                                {device.assignedAt ? formatDistanceToNow(new Date(device.assignedAt), { addSuffix: true }) : '-'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="device-card-footer">
                                        {device.status === 'Installed' && (
                                            <button
                                                onClick={() => handleUpdateStatus(device._id, 'Configured')}
                                                className="btn btn-primary btn-sm"
                                            >
                                                <Settings size={14} />
                                                Mark Configured
                                            </button>
                                        )}
                                        {device.status === 'Configured' && (
                                            <button
                                                onClick={() => handleUpdateStatus(device._id, 'Tested')}
                                                className="btn btn-success btn-sm"
                                            >
                                                <CheckCircle size={14} />
                                                Mark Tested
                                            </button>
                                        )}
                                        {device.status === 'Tested' && (
                                            <button
                                                onClick={() => handleUpdateStatus(device._id, 'Deployed')}
                                                className="btn btn-success btn-sm"
                                            >
                                                <CheckCircle size={14} />
                                                Deploy to Asset
                                            </button>
                                        )}
                                        <Link
                                            to={`/fieldops/projects/${device.projectId?._id}/devices/${device._id}/edit`}
                                            className="btn btn-ghost btn-sm"
                                        >
                                            Edit <ChevronRight size={14} />
                                        </Link>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
