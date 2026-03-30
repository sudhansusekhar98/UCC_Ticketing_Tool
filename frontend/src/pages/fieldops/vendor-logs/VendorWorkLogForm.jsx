import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ArrowLeft,
    Save,
    Truck,
    MapPin,
    Users,
    Shovel,
    AlertTriangle
} from 'lucide-react';
import { fieldOpsApi, usersApi } from '../../../services/api';
import useAuthStore from '../../../context/authStore';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import '../fieldops.css';

const LABOUR_TYPES = ['RoadDigging', 'CableLaying', 'Backfilling', 'RoadRestoration', 'TrenchMarking', 'Other'];
const TRENCH_STATUSES = ['Open', 'CableLaid', 'Backfilled', 'RoadRestored', 'Pending'];

export default function VendorWorkLogForm() {
    const { projectId, logId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const isEditing = Boolean(logId);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [project, setProject] = useState(null);
    const [vendors, setVendors] = useState([]);

    const [formData, setFormData] = useState({
        projectId: projectId,
        vendorId: '',
        workOrderId: '',
        supervisorName: '',
        crewCount: 1,
        labourType: 'CableLaying',
        logDate: format(new Date(), 'yyyy-MM-dd'),
        areaWorked: {
            fromDescription: '',
            toDescription: '',
            fromLatitude: '',
            fromLongitude: '',
            toLatitude: '',
            toLongitude: '',
            lengthMeters: ''
        },
        trenchId: '',
        trenchStatus: 'Open',
        challenges: '',
        notes: ''
    });

    useEffect(() => {
        loadData();
    }, [projectId, logId]);

    const loadData = async () => {
        try {
            const [projectRes, usersRes] = await Promise.all([
                fieldOpsApi.getProjectById(projectId),
                usersApi.getAll({ limit: 200, isActive: true })
            ]);
            setProject(projectRes.data.data);

            // Filter to only show assigned vendors or all users for admin
            const allUsers = usersRes.data.data || [];
            setVendors(allUsers);

            if (isEditing) {
                const logRes = await fieldOpsApi.getVendorWorkLogById(logId);
                const log = logRes.data.data;
                setFormData({
                    ...log,
                    projectId: log.projectId._id || log.projectId,
                    vendorId: log.vendorId?._id || log.vendorId || '',
                    logDate: log.logDate?.split('T')[0] || '',
                    areaWorked: log.areaWorked || {
                        fromDescription: '', toDescription: '',
                        fromLatitude: '', fromLongitude: '',
                        toLatitude: '', toLongitude: '',
                        lengthMeters: ''
                    }
                });
            }
        } catch (error) {
            toast.error('Failed to load data');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleNestedChange = (parent, field, value) => {
        setFormData(prev => ({
            ...prev,
            [parent]: { ...prev[parent], [field]: value }
        }));
    };

    const captureFromGPS = () => {
        if (!navigator.geolocation) {
            toast.error('Geolocation not supported');
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (position) => {
                handleNestedChange('areaWorked', 'fromLatitude', position.coords.latitude);
                handleNestedChange('areaWorked', 'fromLongitude', position.coords.longitude);
                toast.success('Start location captured');
            },
            (error) => toast.error('Failed to get location'),
            { enableHighAccuracy: true }
        );
    };

    const captureToGPS = () => {
        if (!navigator.geolocation) {
            toast.error('Geolocation not supported');
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (position) => {
                handleNestedChange('areaWorked', 'toLatitude', position.coords.latitude);
                handleNestedChange('areaWorked', 'toLongitude', position.coords.longitude);
                toast.success('End location captured');
            },
            (error) => toast.error('Failed to get location'),
            { enableHighAccuracy: true }
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.labourType || !formData.logDate) {
            toast.error('Please fill required fields');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                ...formData,
                crewCount: parseInt(formData.crewCount) || 1,
                areaWorked: {
                    ...formData.areaWorked,
                    lengthMeters: formData.areaWorked.lengthMeters ? parseFloat(formData.areaWorked.lengthMeters) : undefined,
                    fromLatitude: formData.areaWorked.fromLatitude ? parseFloat(formData.areaWorked.fromLatitude) : undefined,
                    fromLongitude: formData.areaWorked.fromLongitude ? parseFloat(formData.areaWorked.fromLongitude) : undefined,
                    toLatitude: formData.areaWorked.toLatitude ? parseFloat(formData.areaWorked.toLatitude) : undefined,
                    toLongitude: formData.areaWorked.toLongitude ? parseFloat(formData.areaWorked.toLongitude) : undefined
                }
            };

            if (isEditing) {
                await fieldOpsApi.updateVendorWorkLog(logId, payload);
                toast.success('Vendor log updated successfully');
            } else {
                await fieldOpsApi.createVendorWorkLog(payload);
                toast.success('Vendor work log submitted successfully');
            }
            navigate(`/fieldops/projects/${projectId}`);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save vendor log');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="page-container">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container animate-fade-in">
            <div className="page-header">
                <div className="header-left">
                    <Link to={`/fieldops/projects/${projectId}`} className="btn btn-ghost">
                        <ArrowLeft size={18} />
                    </Link>
                    <div>
                        <h1 className="page-title">
                            {isEditing ? 'Edit Vendor Work Log' : 'Add Vendor Work Log'}
                        </h1>
                        <p className="text-secondary">
                            {project?.projectName} ({project?.projectNumber})
                        </p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="glass-card vendor-work-log-form">
                {/* Basic Info */}
                <div className="form-section">
                    <h3 className="form-section-title">
                        <Truck size={18} /> Work Details
                    </h3>
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Log Date *</label>
                            <input
                                type="date"
                                className="form-input"
                                value={formData.logDate}
                                onChange={(e) => handleChange('logDate', e.target.value)}
                                max={format(new Date(), 'yyyy-MM-dd')}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Labour Type *</label>
                            <select
                                className="form-select"
                                value={formData.labourType}
                                onChange={(e) => handleChange('labourType', e.target.value)}
                                required
                            >
                                {LABOUR_TYPES.map(type => (
                                    <option key={type} value={type}>
                                        {type.replace(/([A-Z])/g, ' $1').trim()}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Vendor</label>
                            <select
                                className="form-select"
                                value={formData.vendorId}
                                onChange={(e) => handleChange('vendorId', e.target.value)}
                            >
                                <option value="">-- Select Vendor --</option>
                                {vendors.map(vendor => (
                                    <option key={vendor._id} value={vendor._id}>
                                        {vendor.fullName || vendor.username}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Work Order ID</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.workOrderId}
                                onChange={(e) => handleChange('workOrderId', e.target.value)}
                                placeholder="e.g., WO-2024-001"
                            />
                        </div>
                    </div>
                </div>

                {/* Crew Info */}
                <div className="form-section">
                    <h3 className="form-section-title">
                        <Users size={18} /> Crew Information
                    </h3>
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Supervisor Name</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.supervisorName}
                                onChange={(e) => handleChange('supervisorName', e.target.value)}
                                placeholder="On-site supervisor name"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Crew Count</label>
                            <input
                                type="number"
                                className="form-input"
                                value={formData.crewCount}
                                onChange={(e) => handleChange('crewCount', e.target.value)}
                                min="1"
                            />
                        </div>
                    </div>
                </div>

                {/* Area Worked */}
                <div className="form-section">
                    <h3 className="form-section-title">
                        <MapPin size={18} /> Area Worked
                    </h3>
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">From (Description)</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.areaWorked.fromDescription}
                                onChange={(e) => handleNestedChange('areaWorked', 'fromDescription', e.target.value)}
                                placeholder="e.g., Main Gate"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">To (Description)</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.areaWorked.toDescription}
                                onChange={(e) => handleNestedChange('areaWorked', 'toDescription', e.target.value)}
                                placeholder="e.g., Building A Junction"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Length (meters)</label>
                            <input
                                type="number"
                                step="0.1"
                                className="form-input"
                                value={formData.areaWorked.lengthMeters}
                                onChange={(e) => handleNestedChange('areaWorked', 'lengthMeters', e.target.value)}
                                placeholder="Work length in meters"
                            />
                        </div>
                        <div className="form-group">
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button type="button" onClick={captureFromGPS} className="gps-button">
                                    <MapPin size={16} /> Capture Start
                                </button>
                                <button type="button" onClick={captureToGPS} className="gps-button">
                                    <MapPin size={16} /> Capture End
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Trench Info */}
                <div className="form-section">
                    <h3 className="form-section-title">
                        <Shovel size={18} /> Trench Details
                    </h3>
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Trench ID</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.trenchId}
                                onChange={(e) => handleChange('trenchId', e.target.value)}
                                placeholder="e.g., TR-001"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Trench Status</label>
                            <select
                                className="form-select"
                                value={formData.trenchStatus}
                                onChange={(e) => handleChange('trenchStatus', e.target.value)}
                            >
                                {TRENCH_STATUSES.map(status => (
                                    <option key={status} value={status}>
                                        {status.replace(/([A-Z])/g, ' $1').trim()}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Challenges & Notes */}
                <div className="form-section">
                    <h3 className="form-section-title">
                        <AlertTriangle size={18} /> Challenges & Notes
                    </h3>
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Challenges Faced</label>
                            <textarea
                                className="form-textarea"
                                value={formData.challenges}
                                onChange={(e) => handleChange('challenges', e.target.value)}
                                placeholder="Any issues faced during work (soil conditions, utilities, etc.)"
                                rows={3}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Additional Notes</label>
                            <textarea
                                className="form-textarea"
                                value={formData.notes}
                                onChange={(e) => handleChange('notes', e.target.value)}
                                placeholder="Any additional notes..."
                                rows={3}
                            />
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="form-actions">
                    <Link to={`/fieldops/projects/${projectId}`} className="btn btn-ghost">
                        Cancel
                    </Link>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                        {saving ? (
                            <>
                                <div className="spinner-sm"></div>
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save size={18} />
                                {isEditing ? 'Update Log' : 'Submit Vendor Log'}
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
