import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, Loader } from 'lucide-react';
import { ticketsApi, assetsApi, sitesApi, lookupsApi, usersApi } from '../../services/api';
import toast from 'react-hot-toast';
import './Tickets.css';

export default function TicketForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditing = Boolean(id);

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form data
    const [formData, setFormData] = useState({
        assetId: '',
        category: '',
        subCategory: '',
        title: '',
        description: '',
        impact: 3,
        urgency: 3,
        assignedTo: '',
        tags: '',
    });

    // Dropdown options
    const [categories, setCategories] = useState([]);
    const [assets, setAssets] = useState([]);
    const [sites, setSites] = useState([]);
    const [engineers, setEngineers] = useState([]);
    const [selectedSiteId, setSelectedSiteId] = useState('');

    useEffect(() => {
        loadDropdowns();
        if (isEditing) {
            loadTicket();
        }
    }, [id]);

    useEffect(() => {
        // Load assets when site changes
        if (selectedSiteId) {
            loadAssets(selectedSiteId);
        } else {
            loadAllAssets();
        }
    }, [selectedSiteId]);

    const loadDropdowns = async () => {
        try {
            const [categoriesRes, sitesRes, engineersRes] = await Promise.all([
                lookupsApi.getCategories(),
                sitesApi.getDropdown(),
                usersApi.getEngineers(),
            ]);
            setCategories(categoriesRes.data);
            setSites(sitesRes.data);
            setEngineers(engineersRes.data);
        } catch (error) {
            console.error('Failed to load dropdowns', error);
        }
    };

    const loadAllAssets = async () => {
        try {
            const response = await assetsApi.getDropdown();
            setAssets(response.data);
        } catch (error) {
            console.error('Failed to load assets', error);
        }
    };

    const loadAssets = async (siteId) => {
        try {
            const response = await assetsApi.getDropdown(siteId);
            setAssets(response.data);
        } catch (error) {
            console.error('Failed to load assets', error);
        }
    };

    const loadTicket = async () => {
        setLoading(true);
        try {
            const response = await ticketsApi.getById(id);
            const ticket = response.data.data;
            setFormData({
                assetId: ticket.assetId?.toString() || '',
                category: ticket.category,
                subCategory: ticket.subCategory || '',
                title: ticket.title,
                description: ticket.description || '',
                impact: ticket.impact,
                urgency: ticket.urgency,
                assignedTo: ticket.assignedTo?.toString() || '',
                tags: ticket.tags || '',
            });
        } catch (error) {
            toast.error('Failed to load ticket');
            navigate('/tickets');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field, value) => {
        setFormData({ ...formData, [field]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.title || !formData.category) {
            toast.error('Please fill in required fields');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                ...formData,
                assetId: formData.assetId ? parseInt(formData.assetId) : null,
                assignedTo: formData.assignedTo ? parseInt(formData.assignedTo) : null,
                impact: parseInt(formData.impact),
                urgency: parseInt(formData.urgency),
            };

            if (isEditing) {
                await ticketsApi.update(id, payload);
                toast.success('Ticket updated successfully');
            } else {
                const response = await ticketsApi.create(payload);
                toast.success('Ticket created successfully');
                navigate(`/tickets/${response.data.data.ticketId}`);
                return;
            }

            navigate(`/tickets/${id}`);
        } catch (error) {
            toast.error(isEditing ? 'Failed to update ticket' : 'Failed to create ticket');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="ticket-form-page animate-fade-in">
            <Link to="/tickets" className="back-link">
                <ArrowLeft size={18} />
                Back to Tickets
            </Link>

            <div className="page-header">
                <h1 className="page-title">
                    {isEditing ? 'Edit Ticket' : 'Create New Ticket'}
                </h1>
            </div>

            <form onSubmit={handleSubmit} className="form-card glass-card">
                <div className="form-grid">
                    {/* Site Selection (filter for assets) */}
                    <div className="form-group">
                        <label className="form-label">Site (optional filter)</label>
                        <select
                            className="form-select"
                            value={selectedSiteId}
                            onChange={(e) => setSelectedSiteId(e.target.value)}
                        >
                            <option value="">All Sites</option>
                            {sites.map((site) => (
                                <option key={site.value} value={site.value}>{site.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Asset Selection */}
                    <div className="form-group">
                        <label className="form-label">Asset</label>
                        <select
                            className="form-select"
                            value={formData.assetId}
                            onChange={(e) => handleChange('assetId', e.target.value)}
                        >
                            <option value="">Select Asset (optional)</option>
                            {assets.map((asset) => (
                                <option key={asset.value} value={asset.value}>{asset.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Category */}
                    <div className="form-group">
                        <label className="form-label">Category *</label>
                        <select
                            className="form-select"
                            value={formData.category}
                            onChange={(e) => handleChange('category', e.target.value)}
                            required
                        >
                            <option value="">Select Category</option>
                            {categories.map((cat) => (
                                <option key={cat.value} value={cat.value}>{cat.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Sub Category */}
                    <div className="form-group">
                        <label className="form-label">Sub Category</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.subCategory}
                            onChange={(e) => handleChange('subCategory', e.target.value)}
                            placeholder="Optional sub-category"
                        />
                    </div>

                    {/* Title */}
                    <div className="form-group full-width">
                        <label className="form-label">Title *</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.title}
                            onChange={(e) => handleChange('title', e.target.value)}
                            placeholder="Brief description of the issue"
                            required
                        />
                    </div>

                    {/* Description */}
                    <div className="form-group full-width">
                        <label className="form-label">Description</label>
                        <textarea
                            className="form-textarea"
                            value={formData.description}
                            onChange={(e) => handleChange('description', e.target.value)}
                            placeholder="Detailed description of the issue..."
                            rows={4}
                        />
                    </div>

                    {/* Impact */}
                    <div className="form-group">
                        <label className="form-label">Impact (1-5)</label>
                        <select
                            className="form-select"
                            value={formData.impact}
                            onChange={(e) => handleChange('impact', e.target.value)}
                        >
                            <option value="1">1 - Minimal</option>
                            <option value="2">2 - Low</option>
                            <option value="3">3 - Moderate</option>
                            <option value="4">4 - Significant</option>
                            <option value="5">5 - Critical</option>
                        </select>
                    </div>

                    {/* Urgency */}
                    <div className="form-group">
                        <label className="form-label">Urgency (1-5)</label>
                        <select
                            className="form-select"
                            value={formData.urgency}
                            onChange={(e) => handleChange('urgency', e.target.value)}
                        >
                            <option value="1">1 - Planned</option>
                            <option value="2">2 - Low</option>
                            <option value="3">3 - Normal</option>
                            <option value="4">4 - High</option>
                            <option value="5">5 - Immediate</option>
                        </select>
                    </div>

                    {/* Assign To (only for new tickets) */}
                    {!isEditing && (
                        <div className="form-group">
                            <label className="form-label">Assign To (optional)</label>
                            <select
                                className="form-select"
                                value={formData.assignedTo}
                                onChange={(e) => handleChange('assignedTo', e.target.value)}
                            >
                                <option value="">Unassigned</option>
                                {engineers.map((eng) => (
                                    <option key={eng.value} value={eng.value}>{eng.label}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Tags */}
                    <div className="form-group">
                        <label className="form-label">Tags</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.tags}
                            onChange={(e) => handleChange('tags', e.target.value)}
                            placeholder="Comma-separated tags"
                        />
                    </div>
                </div>

                {/* Priority Preview */}
                <div className="priority-preview">
                    <span className="preview-label">Calculated Priority:</span>
                    <span className={`badge priority-${getPriorityFromScore(formData.impact * formData.urgency * 2).toLowerCase()}`}>
                        {getPriorityFromScore(formData.impact * formData.urgency * 2)}
                    </span>
                    <span className="preview-note">
                        (Score: {formData.impact * formData.urgency * 2} = Impact × Urgency × Asset Criticality)
                    </span>
                </div>

                <div className="form-actions">
                    <Link to="/tickets" className="btn btn-ghost">Cancel</Link>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                        {saving ? (
                            <>
                                <Loader size={18} className="animate-spin" />
                                {isEditing ? 'Saving...' : 'Creating...'}
                            </>
                        ) : (
                            <>
                                <Save size={18} />
                                {isEditing ? 'Save Changes' : 'Create Ticket'}
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}

function getPriorityFromScore(score) {
    if (score >= 50) return 'P1';
    if (score >= 25) return 'P2';
    if (score >= 10) return 'P3';
    return 'P4';
}
