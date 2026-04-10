import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ArrowLeft,
    Save,
    MapPin,
    Calendar,
    User,
    Building,
    FileText,
    Users,
    ClipboardList,
    Package,
    Loader
} from 'lucide-react';
import { fieldOpsApi, usersApi, sitesApi } from '../../services/api';
import useAuthStore from '../../context/authStore';
import toast from 'react-hot-toast';
import './fieldops.css';

const PROJECT_STATUSES = ['Planning', 'Active', 'OnHold', 'Completed', 'Cancelled'];

export default function ProjectForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { hasRole } = useAuthStore();
    const isEditing = Boolean(id);

    const [loading, setLoading] = useState(isEditing);
    const [saving, setSaving] = useState(false);
    const [users, setUsers] = useState([]);
    const [sites, setSites] = useState([]);

    // Survey integration state
    const [surveys, setSurveys] = useState([]);
    const [surveyRequirements, setSurveyRequirements] = useState([]);
    const [loadingSurveys, setLoadingSurveys] = useState(false);
    const [loadingRequirements, setLoadingRequirements] = useState(false);

    const [formData, setFormData] = useState({
        projectName: '',
        clientName: '',
        description: '',
        siteAddress: '',
        city: '',
        state: '',
        pincode: '',
        latitude: '',
        longitude: '',
        contractStartDate: '',
        contractEndDate: '',
        contractValue: '',
        status: 'Planning',
        assignedPM: '',
        teamMembers: [],
        assignedVendors: [],
        linkedSiteId: '',
        linkedSurveyId: '',
        linkedSurveyName: '',
        surveyDeviceRequirements: [],
        tags: []
    });

    useEffect(() => {
        loadDropdownData();
        if (isEditing) {
            loadProject();
        }
    }, [id]);

    const loadDropdownData = async () => {
        try {
            const promises = [
                usersApi.getAll({ limit: 500, isActive: true }),
                sitesApi.getAll({ limit: 500, isActive: true })
            ];

            // Load surveys for Admin/Supervisor
            if (hasRole(['Admin', 'Supervisor'])) {
                setLoadingSurveys(true);
                promises.push(fieldOpsApi.getSurveys({ limit: 100 }));
            }

            const results = await Promise.all(promises);
            setUsers(results[0].data.data || []);
            setSites(results[1].data.data || []);

            if (results[2]) {
                setSurveys(results[2].data.data || []);
            }
        } catch (error) {
            console.error('Failed to load dropdown data:', error);
        } finally {
            setLoadingSurveys(false);
        }
    };

    const loadProject = async () => {
        try {
            const response = await fieldOpsApi.getProjectById(id);
            const project = response.data.data;
            setFormData({
                ...project,
                contractStartDate: project.contractStartDate?.split('T')[0] || '',
                contractEndDate: project.contractEndDate?.split('T')[0] || '',
                assignedPM: project.assignedPM?._id || project.assignedPM || '',
                teamMembers: project.teamMembers?.map(u => u._id || u) || [],
                assignedVendors: project.assignedVendors?.map(u => u._id || u) || [],
                linkedSiteId: project.linkedSiteId?._id || project.linkedSiteId || '',
                linkedSurveyId: project.linkedSurveyId || '',
                linkedSurveyName: project.linkedSurveyName || '',
                surveyDeviceRequirements: project.surveyDeviceRequirements || [],
                latitude: project.latitude || '',
                longitude: project.longitude || '',
                contractValue: project.contractValue || ''
            });
            // Populate requirements display from saved data
            if (project.surveyDeviceRequirements?.length > 0) {
                setSurveyRequirements(project.surveyDeviceRequirements);
            }
        } catch (error) {
            toast.error('Failed to load project');
            navigate('/fieldops/projects');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleMultiSelect = (field, value) => {
        const current = formData[field] || [];
        const updated = current.includes(value)
            ? current.filter(v => v !== value)
            : [...current, value];
        handleChange(field, updated);
    };

    const handleSurveyChange = async (surveyId) => {
        const selected = surveys.find(s => String(s.surveyId) === String(surveyId));
        handleChange('linkedSurveyId', surveyId);
        handleChange('linkedSurveyName', selected?.surveyName || '');

        if (surveyId) {
            setLoadingRequirements(true);
            try {
                const res = await fieldOpsApi.getSurveyRequirements(surveyId);
                const requirements = res.data.data || [];
                setSurveyRequirements(requirements);
                handleChange('surveyDeviceRequirements', requirements);

                // Auto-fill client name from survey if empty
                if (selected?.clientName && !formData.clientName) {
                    handleChange('clientName', selected.clientName);
                }
            } catch (error) {
                toast.error('Failed to load survey device requirements');
                setSurveyRequirements([]);
                handleChange('surveyDeviceRequirements', []);
            } finally {
                setLoadingRequirements(false);
            }
        } else {
            setSurveyRequirements([]);
            handleChange('surveyDeviceRequirements', []);
            handleChange('linkedSurveyName', '');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!formData.projectName || !formData.clientName || !formData.siteAddress) {
            toast.error('Please fill in required fields');
            return;
        }
        if (!formData.linkedSiteId) {
            toast.error('Please select a site');
            return;
        }
        if (!formData.assignedPM) {
            toast.error('Please assign a Project Manager');
            return;
        }
        if (!formData.contractStartDate || !formData.contractEndDate) {
            toast.error('Please set contract dates');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                ...formData,
                latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
                longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
                contractValue: formData.contractValue ? parseFloat(formData.contractValue) : undefined
            };

            if (isEditing) {
                await fieldOpsApi.updateProject(id, payload);
                toast.success('Project updated successfully');
            } else {
                await fieldOpsApi.createProject(payload);
                toast.success('Project created successfully');
            }
            navigate('/fieldops/projects');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save project');
        } finally {
            setSaving(false);
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

    // Filter users by role for PM selection
    const pmCandidates = users.filter(u =>
        ['Admin', 'Supervisor', 'L1Engineer', 'L2Engineer'].includes(u.role)
    );

    return (
        <div className="page-container animate-fade-in">
            <div className="page-header">
                <div className="header-left">
                    <Link to="/fieldops/projects" className="btn btn-ghost">
                        <ArrowLeft size={18} />
                    </Link>
                    <h1 className="page-title">
                        {isEditing ? 'Edit Project' : 'New Project'}
                    </h1>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="glass-card project-form">
                {/* Survey Linkage */}
                <div className="form-section">
                    <h3 className="form-section-title">
                        <ClipboardList size={18} /> Survey Linkage
                    </h3>
                    <div className="form-grid">
                        <div className="form-group full-width">
                            <label className="form-label">Select Survey</label>
                            {loadingSurveys ? (
                                <div className="form-input" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                                    <Loader size={16} className="spinning" /> Loading surveys...
                                </div>
                            ) : (
                                <select
                                    className="form-select"
                                    value={formData.linkedSurveyId}
                                    onChange={(e) => handleSurveyChange(e.target.value)}
                                >
                                    <option value="">-- Select Survey (Optional) --</option>
                                    {surveys.map(survey => (
                                        <option key={survey.surveyId} value={survey.surveyId}>
                                            {survey.surveyName} {survey.clientName ? `- ${survey.clientName}` : ''} {survey.regionName ? `(${survey.regionName})` : ''}
                                        </option>
                                    ))}
                                </select>
                            )}
                            <small style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'block' }}>
                                Link a completed survey to auto-populate device requirements
                            </small>
                        </div>
                    </div>

                    {/* Device Requirements Table */}
                    {loadingRequirements && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem', color: 'var(--text-secondary)' }}>
                            <Loader size={16} className="spinning" /> Loading device requirements...
                        </div>
                    )}

                    {!loadingRequirements && surveyRequirements.length > 0 && (
                        <div style={{ marginTop: '1rem' }}>
                            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                                <Package size={16} /> Survey Device Requirements
                            </h4>
                            <div style={{
                                background: 'var(--info-50, #eff6ff)',
                                border: '1px solid var(--info-200, #bfdbfe)',
                                borderRadius: '0.5rem',
                                padding: '0.625rem 0.875rem',
                                marginBottom: '0.75rem',
                                fontSize: '0.8125rem',
                                color: 'var(--info-700, #1d4ed8)'
                            }}>
                                These device counts are from the approved survey and will be saved with the project.
                            </div>
                            <div className="table-responsive">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Device Name</th>
                                            <th>Type</th>
                                            <th style={{ textAlign: 'center' }}>Existing Qty</th>
                                            <th style={{ textAlign: 'center' }}>Required Qty</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {surveyRequirements.map((item, idx) => (
                                            <tr key={item.itemId || idx}>
                                                <td>{item.itemName}</td>
                                                <td>{item.itemTypeName}</td>
                                                <td style={{ textAlign: 'center' }}>{item.totalExisting}</td>
                                                <td style={{ textAlign: 'center', fontWeight: 600 }}>{item.totalRequired}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Basic Information */}
                <div className="form-section">
                    <h3 className="form-section-title">
                        <FileText size={18} /> Basic Information
                    </h3>
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Project Name *</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.projectName}
                                onChange={(e) => handleChange('projectName', e.target.value)}
                                placeholder="Enter project name"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Client Name *</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.clientName}
                                onChange={(e) => handleChange('clientName', e.target.value)}
                                placeholder="Enter client name"
                                required
                            />
                        </div>
                        <div className="form-group full-width">
                            <label className="form-label">Description</label>
                            <textarea
                                className="form-textarea"
                                value={formData.description}
                                onChange={(e) => handleChange('description', e.target.value)}
                                placeholder="Project description..."
                                rows={3}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Status</label>
                            <select
                                className="form-select"
                                value={formData.status}
                                onChange={(e) => handleChange('status', e.target.value)}
                            >
                                {PROJECT_STATUSES.map(status => (
                                    <option key={status} value={status}>{status}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Location */}
                <div className="form-section">
                    <h3 className="form-section-title">
                        <MapPin size={18} /> Location
                    </h3>
                    <div className="form-grid">
                        <div className="form-group full-width">
                            <label className="form-label">Site Address *</label>
                            <textarea
                                className="form-textarea"
                                value={formData.siteAddress}
                                onChange={(e) => handleChange('siteAddress', e.target.value)}
                                placeholder="Full site address"
                                rows={2}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">City</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.city}
                                onChange={(e) => handleChange('city', e.target.value)}
                                placeholder="City"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">State</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.state}
                                onChange={(e) => handleChange('state', e.target.value)}
                                placeholder="State"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Pincode</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.pincode}
                                onChange={(e) => handleChange('pincode', e.target.value)}
                                placeholder="Pincode"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Latitude</label>
                            <input
                                type="number"
                                step="any"
                                className="form-input"
                                value={formData.latitude}
                                onChange={(e) => handleChange('latitude', e.target.value)}
                                placeholder="e.g., 19.0596"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Longitude</label>
                            <input
                                type="number"
                                step="any"
                                className="form-input"
                                value={formData.longitude}
                                onChange={(e) => handleChange('longitude', e.target.value)}
                                placeholder="e.g., 72.8295"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Site *</label>
                            <select
                                className="form-select"
                                value={formData.linkedSiteId}
                                onChange={(e) => handleChange('linkedSiteId', e.target.value)}
                                required
                            >
                                <option value="">-- Select Site --</option>
                                {sites.map(site => (
                                    <option key={site._id} value={site._id}>
                                        {site.siteName} ({site.siteUniqueID})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Contract Details */}
                <div className="form-section">
                    <h3 className="form-section-title">
                        <Calendar size={18} /> Contract Details
                    </h3>
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Contract Start Date *</label>
                            <input
                                type="date"
                                className="form-input"
                                value={formData.contractStartDate}
                                onChange={(e) => handleChange('contractStartDate', e.target.value)}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Contract End Date *</label>
                            <input
                                type="date"
                                className="form-input"
                                value={formData.contractEndDate}
                                onChange={(e) => handleChange('contractEndDate', e.target.value)}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Contract Value</label>
                            <input
                                type="number"
                                className="form-input"
                                value={formData.contractValue}
                                onChange={(e) => handleChange('contractValue', e.target.value)}
                                placeholder="Amount"
                            />
                        </div>
                    </div>
                </div>

                {/* Team Assignment */}
                <div className="form-section">
                    <h3 className="form-section-title">
                        <Users size={18} /> Team Assignment
                    </h3>
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Assigned Project Manager *</label>
                            <select
                                className="form-select"
                                value={formData.assignedPM}
                                onChange={(e) => handleChange('assignedPM', e.target.value)}
                                required
                            >
                                <option value="">-- Select PM --</option>
                                {pmCandidates.map(user => (
                                    <option key={user._id} value={user._id}>
                                        {user.fullName || user.username} ({user.role})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Team Members (Optional)</label>
                            <div className="checkbox-list">
                                {users.slice(0, 20).map(user => (
                                    <label key={user._id} className="checkbox-item">
                                        <input
                                            type="checkbox"
                                            checked={formData.teamMembers.includes(user._id)}
                                            onChange={() => handleMultiSelect('teamMembers', user._id)}
                                        />
                                        {user.fullName || user.username}
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="form-actions">
                    <Link to="/fieldops/projects" className="btn btn-ghost">
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
                                {isEditing ? 'Update Project' : 'Create Project'}
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
