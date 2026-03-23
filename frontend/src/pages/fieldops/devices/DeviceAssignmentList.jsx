import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import {
    UserPlus,
    Search,
    RefreshCw,
    Camera,
    MapPin,
    Filter,
    CheckCircle,
    Users,
    AlertTriangle,
    ArrowLeft,
    SkipForward,
    CheckSquare,
    Square,
    Loader
} from 'lucide-react';
import { fieldOpsApi, usersApi } from '../../../services/api';
import useAuthStore from '../../../context/authStore';
import toast from 'react-hot-toast';
import '../fieldops.css';

const DEVICE_TYPES = ['IPCamera', 'NVR', 'DVR', 'PTZ', 'AccessPoint', 'Switch', 'Router', 'UPS', 'Other'];

export default function DeviceAssignmentList() {
    const [searchParams] = useSearchParams();
    const projectIdFromUrl = searchParams.get('projectId');
    const navigate = useNavigate();
    const { hasRole, user } = useAuthStore();

    const [devices, setDevices] = useState([]);
    const [projects, setProjects] = useState([]);
    const [engineers, setEngineers] = useState([]);
    const [projectEngineers, setProjectEngineers] = useState([]); // Engineers for specific project
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [projectFilter, setProjectFilter] = useState(projectIdFromUrl || '');
    const [typeFilter, setTypeFilter] = useState('');

    // Selection state
    const [selectedDevices, setSelectedDevices] = useState([]);

    // Assignment modal state
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showSkipConfigModal, setShowSkipConfigModal] = useState(false);
    const [selectedEngineer, setSelectedEngineer] = useState('');
    const [assignmentNotes, setAssignmentNotes] = useState('');
    const [skipReason, setSkipReason] = useState('');
    const [modalDevice, setModalDevice] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);

    const canManage = hasRole(['Admin', 'Supervisor', 'L1Engineer', 'L2Engineer']);

    useEffect(() => {
        loadProjects();
        loadEngineers();
    }, []);

    useEffect(() => {
        fetchDevices();
    }, [projectFilter, typeFilter]);

    // Load project-specific engineers when modal device is selected
    useEffect(() => {
        const loadProjectEngineers = async () => {
            if (!modalDevice || !modalDevice.projectId) {
                setProjectEngineers([]);
                return;
            }

            try {
                // Get the project ID (could be object or string reference)
                const projectId = typeof modalDevice.projectId === 'object'
                    ? modalDevice.projectId._id
                    : modalDevice.projectId;

                // Fetch full project details to get team members
                const projectRes = await fieldOpsApi.getProjectById(projectId);
                const project = projectRes.data.data;

                // Build list of project engineers (PM + team members)
                const team = [];

                if (project.assignedPM) {
                    team.push(project.assignedPM);
                }

                if (project.teamMembers && Array.isArray(project.teamMembers)) {
                    team.push(...project.teamMembers);
                }

                // Remove duplicates by _id
                const uniqueTeam = team.filter((member, index, self) =>
                    index === self.findIndex((m) => m._id === member._id)
                );

                setProjectEngineers(uniqueTeam);
            } catch (error) {
                console.error('Failed to load project engineers:', error);
                toast.error('Failed to load project team members');
                setProjectEngineers([]);
            }
        };

        loadProjectEngineers();
    }, [modalDevice]);

    const loadProjects = async () => {
        try {
            const response = await fieldOpsApi.getProjects({ limit: 100 });
            setProjects(response.data.data || []);
        } catch (error) {
            console.error('Failed to load projects:', error);
        }
    };

    const loadEngineers = async () => {
        try {
            const response = await usersApi.getAll({
                role: 'L1Engineer,L2Engineer,Supervisor',
                limit: 100
            });
            setEngineers(response.data.data || []);
        } catch (error) {
            console.error('Failed to load engineers:', error);
        }
    };

    const fetchDevices = async () => {
        setLoading(true);
        try {
            const response = await fieldOpsApi.getDevicesAwaitingAssignment({
                projectId: projectFilter || undefined,
                deviceType: typeFilter || undefined
            });
            setDevices(response.data.data || []);
            setSelectedDevices([]);
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
            device.deviceType?.toLowerCase().includes(search) ||
            device.make?.toLowerCase().includes(search) ||
            device.model?.toLowerCase().includes(search) ||
            device.serialNumber?.toLowerCase().includes(search) ||
            device.installationLocation?.description?.toLowerCase().includes(search)
        );
    });

    const toggleDeviceSelection = (deviceId) => {
        setSelectedDevices(prev =>
            prev.includes(deviceId)
                ? prev.filter(id => id !== deviceId)
                : [...prev, deviceId]
        );
    };

    const toggleSelectAll = () => {
        if (selectedDevices.length === filteredDevices.length) {
            setSelectedDevices([]);
        } else {
            setSelectedDevices(filteredDevices.map(d => d._id));
        }
    };

    const handleAssignClick = (device = null) => {
        setModalDevice(device);
        setSelectedEngineer('');
        setAssignmentNotes('');
        setShowAssignModal(true);
    };

    const handleSkipConfigClick = (device) => {
        setModalDevice(device);
        setSkipReason('');
        setShowSkipConfigModal(true);
    };

    const handleAssignSubmit = async () => {
        if (!selectedEngineer) {
            toast.error('Please select an engineer');
            return;
        }

        setActionLoading(true);
        try {
            if (modalDevice) {
                // Single device assignment
                await fieldOpsApi.assignDevice(modalDevice._id, {
                    engineerId: selectedEngineer,
                    notes: assignmentNotes || undefined
                });
                toast.success('Device assigned successfully');
            } else if (selectedDevices.length > 0) {
                // Bulk assignment
                const response = await fieldOpsApi.bulkAssignDevices({
                    deviceIds: selectedDevices,
                    engineerId: selectedEngineer,
                    notes: assignmentNotes || undefined
                });
                toast.success(`${response.data.data?.assignedCount || 0} devices assigned`);
            }

            setShowAssignModal(false);
            setSelectedDevices([]);
            fetchDevices();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to assign device(s)');
        } finally {
            setActionLoading(false);
        }
    };

    const handleSkipConfigSubmit = async () => {
        if (!modalDevice) return;

        setActionLoading(true);
        try {
            await fieldOpsApi.skipDeviceConfiguration(modalDevice._id, {
                reason: skipReason || 'Non-IT/passive item'
            });
            toast.success('Device converted to asset (configuration skipped)');
            setShowSkipConfigModal(false);
            fetchDevices();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to skip configuration');
        } finally {
            setActionLoading(false);
        }
    };

    const getEngineerName = (id) => {
        const eng = engineers.find(e => e._id === id);
        return eng?.fullName || 'Unknown';
    };

    return (
        <div className="page-container animate-fade-in">
            <div className="page-header">
                <div className="header-left">
                    <button onClick={() => navigate(-1)} className="btn btn-ghost">
                        <ArrowLeft size={18} />
                    </button>
                    <UserPlus size={28} className="page-icon" />
                    <div>
                        <h1 className="page-title">Device Assignment</h1>
                        <p className="page-subtitle">Assign installed devices to engineers for configuration/testing</p>
                    </div>
                </div>
                <div className="header-actions">
                    <button onClick={fetchDevices} className="btn btn-ghost" title="Refresh">
                        <RefreshCw size={18} />
                    </button>
                    {selectedDevices.length > 0 && (
                        <button
                            onClick={() => handleAssignClick()}
                            className="btn btn-primary"
                        >
                            <Users size={18} />
                            Assign Selected ({selectedDevices.length})
                        </button>
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
                </div>
            </div>

            {/* Devices Table */}
            <div className="glass-card">
                {loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Loading devices awaiting assignment...</p>
                    </div>
                ) : filteredDevices.length === 0 ? (
                    <div className="empty-state">
                        <CheckCircle size={48} />
                        <h3>No devices awaiting assignment</h3>
                        <p>All installed devices have been assigned or there are no installed devices yet.</p>
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '40px' }}>
                                        <button
                                            onClick={toggleSelectAll}
                                            className="btn btn-ghost btn-sm"
                                            title={selectedDevices.length === filteredDevices.length ? 'Deselect All' : 'Select All'}
                                        >
                                            {selectedDevices.length === filteredDevices.length ? (
                                                <CheckSquare size={18} />
                                            ) : (
                                                <Square size={18} />
                                            )}
                                        </button>
                                    </th>
                                    <th>Device</th>
                                    <th>Project</th>
                                    <th>Zone / Location</th>
                                    <th>Installed By</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredDevices.map(device => (
                                    <tr key={device._id} className={selectedDevices.includes(device._id) ? 'selected-row' : ''}>
                                        <td>
                                            <button
                                                onClick={() => toggleDeviceSelection(device._id)}
                                                className="btn btn-ghost btn-sm"
                                            >
                                                {selectedDevices.includes(device._id) ? (
                                                    <CheckSquare size={18} className="text-primary" />
                                                ) : (
                                                    <Square size={18} />
                                                )}
                                            </button>
                                        </td>
                                        <td>
                                            <div>
                                                <strong>{device.deviceType}</strong>
                                                {device.assetType && device.assetType !== device.deviceType && (
                                                    <span className="text-sm text-secondary ml-1">({device.assetType})</span>
                                                )}
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
                                            <Link to={`/fieldops/projects/${device.projectId?._id}`} className="link">
                                                {device.projectId?.projectNumber}
                                            </Link>
                                            <div className="text-sm text-secondary">
                                                {device.projectId?.projectName}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="cell-with-icon">
                                                <MapPin size={14} />
                                                {device.zoneId?.zoneName || '-'}
                                            </div>
                                            <div className="text-sm text-secondary">
                                                {device.installationLocation?.description || device.installationLocation?.poleWallId || '-'}
                                            </div>
                                        </td>
                                        <td>
                                            {device.installedBy?.fullName || '-'}
                                        </td>
                                        <td>
                                            <div className="action-buttons">
                                                <button
                                                    onClick={() => handleAssignClick(device)}
                                                    className="btn btn-primary btn-sm"
                                                    title="Assign to Engineer"
                                                >
                                                    <UserPlus size={16} />
                                                    Assign
                                                </button>
                                                <button
                                                    onClick={() => handleSkipConfigClick(device)}
                                                    className="btn btn-ghost btn-sm"
                                                    title="Skip Configuration (for non-IT/passive items)"
                                                >
                                                    <SkipForward size={16} />
                                                    Skip Config
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Assignment Modal */}
            {showAssignModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '500px' }}>
                        <div className="modal-header">
                            <h3>
                                <UserPlus size={20} />
                                {modalDevice ? 'Assign Device' : `Assign ${selectedDevices.length} Devices`}
                            </h3>
                            <button onClick={() => setShowAssignModal(false)} className="modal-close">
                                &times;
                            </button>
                        </div>
                        <div className="modal-body">
                            {modalDevice && (
                                <div className="device-info-card mb-4">
                                    <strong>{modalDevice.deviceType}</strong> - {modalDevice.make} {modalDevice.model}
                                    {modalDevice.serialNumber && <div className="text-sm text-secondary">S/N: {modalDevice.serialNumber}</div>}
                                </div>
                            )}

                            <div className="form-group">
                                <label className="form-label required">Assign to Engineer</label>
                                <select
                                    value={selectedEngineer}
                                    onChange={(e) => setSelectedEngineer(e.target.value)}
                                    className="form-input"
                                >
                                    <option value="">Select Engineer...</option>
                                    {projectEngineers.map(eng => (
                                        <option key={eng._id} value={eng._id}>
                                            {eng.fullName} ({eng.role})
                                        </option>
                                    ))}
                                </select>
                                {projectEngineers.length === 0 && modalDevice && (
                                    <p className="text-sm text-secondary mt-2">
                                        No team members assigned to this project yet.
                                    </p>
                                )}
                            </div>

                            <div className="form-group">
                                <label className="form-label">Assignment Notes</label>
                                <textarea
                                    value={assignmentNotes}
                                    onChange={(e) => setAssignmentNotes(e.target.value)}
                                    placeholder="Optional notes for the engineer..."
                                    className="form-input"
                                    rows={3}
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button
                                onClick={() => setShowAssignModal(false)}
                                className="btn btn-ghost"
                                disabled={actionLoading}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAssignSubmit}
                                className="btn btn-primary"
                                disabled={actionLoading || !selectedEngineer}
                            >
                                {actionLoading ? (
                                    <>
                                        <Loader size={16} className="spin" />
                                        Assigning...
                                    </>
                                ) : (
                                    <>
                                        <UserPlus size={16} />
                                        Assign
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Skip Configuration Modal */}
            {showSkipConfigModal && modalDevice && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '500px' }}>
                        <div className="modal-header">
                            <h3>
                                <SkipForward size={20} />
                                Skip Configuration
                            </h3>
                            <button onClick={() => setShowSkipConfigModal(false)} className="modal-close">
                                &times;
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="alert alert-warning mb-4">
                                <AlertTriangle size={18} />
                                <div>
                                    <strong>Non-IT / Passive Item</strong>
                                    <p>This action will skip configuration/testing and directly convert the device to an operational asset.</p>
                                </div>
                            </div>

                            <div className="device-info-card mb-4">
                                <strong>{modalDevice.deviceType}</strong> - {modalDevice.make} {modalDevice.model}
                                {modalDevice.serialNumber && <div className="text-sm text-secondary">S/N: {modalDevice.serialNumber}</div>}
                            </div>

                            <div className="form-group">
                                <label className="form-label">Reason for Skipping Configuration</label>
                                <select
                                    value={skipReason}
                                    onChange={(e) => setSkipReason(e.target.value)}
                                    className="form-input"
                                >
                                    <option value="">Select reason...</option>
                                    <option value="Non-IT/passive item">Non-IT / Passive Item</option>
                                    <option value="No configuration required">No Configuration Required</option>
                                    <option value="Pre-configured device">Pre-configured Device</option>
                                    <option value="Infrastructure component">Infrastructure Component</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button
                                onClick={() => setShowSkipConfigModal(false)}
                                className="btn btn-ghost"
                                disabled={actionLoading}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSkipConfigSubmit}
                                className="btn btn-warning"
                                disabled={actionLoading}
                            >
                                {actionLoading ? (
                                    <>
                                        <Loader size={16} className="spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <SkipForward size={16} />
                                        Skip & Convert to Asset
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
