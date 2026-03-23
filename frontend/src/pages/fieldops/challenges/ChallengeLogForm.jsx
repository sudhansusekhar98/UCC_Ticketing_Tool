import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ArrowLeft,
    Save,
    AlertTriangle,
    Flag,
    MapPin,
    MessageSquare,
    CheckCircle
} from 'lucide-react';
import { fieldOpsApi, usersApi } from '../../../services/api';
import useAuthStore from '../../../context/authStore';
import toast from 'react-hot-toast';
import '../fieldops.css';

const ISSUE_TYPES = ['Technical', 'Civil', 'Vendor', 'Client', 'Permit', 'Safety', 'Material', 'Weather', 'Other'];
const SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];
const RESOLUTION_STATUSES = ['Open', 'InProgress', 'Resolved', 'Closed', 'Deferred'];

export default function ChallengeLogForm() {
    const { projectId, challengeId } = useParams();
    const navigate = useNavigate();
    const { user, hasRole } = useAuthStore();
    const isEditing = Boolean(challengeId);

    const [loading, setLoading] = useState(isEditing);
    const [saving, setSaving] = useState(false);
    const [project, setProject] = useState(null);
    const [users, setUsers] = useState([]);
    const [zones, setZones] = useState([]);

    const [formData, setFormData] = useState({
        projectId: projectId,
        issueType: 'Technical',
        severity: 'Medium',
        title: '',
        description: '',
        actionTaken: '',
        escalateToAdmin: false,
        resolutionStatus: 'Open',
        assignedTo: '',
        relatedZoneId: '',
        location: {
            description: '',
            latitude: '',
            longitude: ''
        },
        impact: {
            delayDays: '',
            costImpact: '',
            impactDescription: ''
        }
    });

    const isAdmin = hasRole(['Admin', 'Supervisor']);

    useEffect(() => {
        loadData();
    }, [projectId, challengeId]);

    const loadData = async () => {
        try {
            const [projectRes, usersRes, zonesRes] = await Promise.all([
                fieldOpsApi.getProjectById(projectId),
                usersApi.getAll({ limit: 200, isActive: true }),
                fieldOpsApi.getProjectZones(projectId)
            ]);
            setProject(projectRes.data.data);
            setUsers(usersRes.data.data || []);
            setZones(zonesRes.data.data || []);

            if (isEditing) {
                const challengeRes = await fieldOpsApi.getChallengeLogById(challengeId);
                const challenge = challengeRes.data.data;
                setFormData({
                    ...challenge,
                    projectId: challenge.projectId._id || challenge.projectId,
                    assignedTo: challenge.assignedTo?._id || challenge.assignedTo || '',
                    relatedZoneId: challenge.relatedZoneId?._id || challenge.relatedZoneId || '',
                    location: challenge.location || { description: '', latitude: '', longitude: '' },
                    impact: challenge.impact || { delayDays: '', costImpact: '', impactDescription: '' }
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

    const captureGPS = () => {
        if (!navigator.geolocation) {
            toast.error('Geolocation not supported');
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (position) => {
                handleNestedChange('location', 'latitude', position.coords.latitude);
                handleNestedChange('location', 'longitude', position.coords.longitude);
                toast.success('Location captured');
            },
            (error) => toast.error('Failed to get location'),
            { enableHighAccuracy: true }
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.title || !formData.description) {
            toast.error('Please fill in title and description');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                ...formData,
                // Convert empty string ObjectId fields to undefined so Mongoose omits them
                relatedZoneId: formData.relatedZoneId || undefined,
                assignedTo: formData.assignedTo || undefined,
                location: {
                    ...formData.location,
                    latitude: formData.location.latitude ? parseFloat(formData.location.latitude) : undefined,
                    longitude: formData.location.longitude ? parseFloat(formData.location.longitude) : undefined
                },
                impact: {
                    ...formData.impact,
                    delayDays: formData.impact.delayDays ? parseInt(formData.impact.delayDays) : undefined,
                    costImpact: formData.impact.costImpact ? parseFloat(formData.impact.costImpact) : undefined
                }
            };

            if (isEditing) {
                await fieldOpsApi.updateChallengeLog(challengeId, payload);
                toast.success('Challenge updated successfully');
            } else {
                await fieldOpsApi.createChallengeLog(payload);
                toast.success('Challenge reported successfully');
            }
            navigate(`/fieldops/projects/${projectId}`);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save challenge');
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
                            {isEditing ? 'Edit Challenge' : 'Report Challenge'}
                        </h1>
                        <p className="text-secondary">
                            {project?.projectName} ({project?.projectNumber})
                        </p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="glass-card">
                {/* Issue Classification */}
                <div className="form-section">
                    <h3 className="form-section-title">
                        <AlertTriangle size={18} /> Issue Details
                    </h3>
                    <div className="form-grid">
                        <div className="form-group full-width">
                            <label className="form-label">Title *</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.title}
                                onChange={(e) => handleChange('title', e.target.value)}
                                placeholder="Brief title describing the issue"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Issue Type *</label>
                            <select
                                className="form-select"
                                value={formData.issueType}
                                onChange={(e) => handleChange('issueType', e.target.value)}
                                required
                            >
                                {ISSUE_TYPES.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Severity *</label>
                            <select
                                className={`form-select severity-${formData.severity.toLowerCase()}`}
                                value={formData.severity}
                                onChange={(e) => handleChange('severity', e.target.value)}
                                required
                            >
                                {SEVERITIES.map(sev => (
                                    <option key={sev} value={sev}>{sev}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Related Zone</label>
                            <select
                                className="form-select"
                                value={formData.relatedZoneId}
                                onChange={(e) => handleChange('relatedZoneId', e.target.value)}
                            >
                                <option value="">-- Select Zone --</option>
                                {zones.map(zone => (
                                    <option key={zone._id} value={zone._id}>
                                        {zone.zoneName}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group full-width">
                            <label className="form-label">Description *</label>
                            <textarea
                                className="form-textarea"
                                value={formData.description}
                                onChange={(e) => handleChange('description', e.target.value)}
                                placeholder="Detailed description of the issue..."
                                rows={4}
                                required
                            />
                        </div>
                        <div className="form-group full-width">
                            <label className="form-label">Action Already Taken</label>
                            <textarea
                                className="form-textarea"
                                value={formData.actionTaken}
                                onChange={(e) => handleChange('actionTaken', e.target.value)}
                                placeholder="What steps have already been taken to address this issue..."
                                rows={3}
                            />
                        </div>
                    </div>
                </div>

                {/* Location */}
                <div className="form-section">
                    <h3 className="form-section-title">
                        <MapPin size={18} /> Location (Optional)
                    </h3>
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Location Description</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.location.description}
                                onChange={(e) => handleNestedChange('location', 'description', e.target.value)}
                                placeholder="e.g., Near Main Gate"
                            />
                        </div>
                        <div className="form-group">
                            <button type="button" onClick={captureGPS} className="gps-button">
                                <MapPin size={18} /> Capture GPS
                            </button>
                            {formData.location.latitude && (
                                <span className="text-sm text-secondary" style={{ marginLeft: '8px' }}>
                                    {formData.location.latitude.toFixed?.(4) || formData.location.latitude},
                                    {formData.location.longitude.toFixed?.(4) || formData.location.longitude}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Impact Assessment */}
                <div className="form-section">
                    <h3 className="form-section-title">
                        <Flag size={18} /> Impact Assessment
                    </h3>
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Estimated Delay (days)</label>
                            <input
                                type="number"
                                className="form-input"
                                value={formData.impact.delayDays}
                                onChange={(e) => handleNestedChange('impact', 'delayDays', e.target.value)}
                                min="0"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Cost Impact</label>
                            <input
                                type="number"
                                className="form-input"
                                value={formData.impact.costImpact}
                                onChange={(e) => handleNestedChange('impact', 'costImpact', e.target.value)}
                                min="0"
                                placeholder="Amount"
                            />
                        </div>
                        <div className="form-group full-width">
                            <label className="form-label">Impact Description</label>
                            <textarea
                                className="form-textarea"
                                value={formData.impact.impactDescription}
                                onChange={(e) => handleNestedChange('impact', 'impactDescription', e.target.value)}
                                placeholder="Describe the impact on project timeline, cost, quality..."
                                rows={2}
                            />
                        </div>
                    </div>
                </div>

                {/* Assignment & Escalation */}
                <div className="form-section">
                    <h3 className="form-section-title">
                        <MessageSquare size={18} /> Assignment & Escalation
                    </h3>
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Assign To</label>
                            <select
                                className="form-select"
                                value={formData.assignedTo}
                                onChange={(e) => handleChange('assignedTo', e.target.value)}
                            >
                                <option value="">-- Unassigned --</option>
                                {users.map(u => (
                                    <option key={u._id} value={u._id}>
                                        {u.fullName || u.username} ({u.role})
                                    </option>
                                ))}
                            </select>
                        </div>
                        {isAdmin && (
                            <div className="form-group">
                                <label className="form-label">Resolution Status</label>
                                <select
                                    className="form-select"
                                    value={formData.resolutionStatus}
                                    onChange={(e) => handleChange('resolutionStatus', e.target.value)}
                                >
                                    {RESOLUTION_STATUSES.map(status => (
                                        <option key={status} value={status}>
                                            {status.replace(/([A-Z])/g, ' $1').trim()}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div className="form-group full-width">
                            <label className="checkbox-item" style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                                <input
                                    type="checkbox"
                                    checked={formData.escalateToAdmin}
                                    onChange={(e) => handleChange('escalateToAdmin', e.target.checked)}
                                    style={{ width: '20px', height: '20px' }}
                                />
                                <span style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <strong>Escalate to Admin</strong>
                                    <span className="text-sm text-secondary">
                                        Flag this issue for immediate Admin attention
                                    </span>
                                </span>
                            </label>
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
                                {isEditing ? 'Update Challenge' : 'Report Challenge'}
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
