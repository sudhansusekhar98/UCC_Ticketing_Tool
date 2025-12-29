import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, Loader } from 'lucide-react';
import { sitesApi } from '../../services/api';
import toast from 'react-hot-toast';
import './Sites.css';

export default function SiteForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditing = Boolean(id);

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        siteName: '',
        city: '',
        zone: '',
        ward: '',
        address: '',
        latitude: '',
        longitude: '',
        contactPerson: '',
        contactPhone: '',
        isActive: true,
    });

    useEffect(() => {
        if (isEditing) {
            loadSite();
        }
    }, [id]);

    const loadSite = async () => {
        setLoading(true);
        try {
            const response = await sitesApi.getById(id);
            const site = response.data.data;
            setFormData({
                siteName: site.siteName,
                city: site.city,
                zone: site.zone || '',
                ward: site.ward || '',
                address: site.address || '',
                latitude: site.latitude || '',
                longitude: site.longitude || '',
                contactPerson: site.contactPerson || '',
                contactPhone: site.contactPhone || '',
                isActive: site.isActive,
            });
        } catch (error) {
            toast.error('Failed to load site');
            navigate('/sites');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field, value) => {
        setFormData({ ...formData, [field]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.siteName || !formData.city) {
            toast.error('Please fill in required fields');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                ...formData,
                latitude: formData.latitude ? parseFloat(formData.latitude) : null,
                longitude: formData.longitude ? parseFloat(formData.longitude) : null,
            };

            if (isEditing) {
                await sitesApi.update(id, payload);
                toast.success('Site updated successfully');
            } else {
                await sitesApi.create(payload);
                toast.success('Site created successfully');
            }
            navigate('/sites');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save site');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="loading-state">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="page-container animate-fade-in">
            <Link to="/sites" className="back-link">
                <ArrowLeft size={18} />
                Back to Sites
            </Link>

            <div className="page-header">
                <h1 className="page-title">
                    {isEditing ? 'Edit Site' : 'Add New Site'}
                </h1>
            </div>

            <form onSubmit={handleSubmit} className="form-card glass-card">
                <div className="form-grid">
                    <div className="form-group">
                        <label className="form-label">Site Name *</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.siteName}
                            onChange={(e) => handleChange('siteName', e.target.value)}
                            placeholder="Enter site name"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">City *</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.city}
                            onChange={(e) => handleChange('city', e.target.value)}
                            placeholder="Enter city"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Zone</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.zone}
                            onChange={(e) => handleChange('zone', e.target.value)}
                            placeholder="Enter zone"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Ward</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.ward}
                            onChange={(e) => handleChange('ward', e.target.value)}
                            placeholder="Enter ward"
                        />
                    </div>

                    <div className="form-group full-width">
                        <label className="form-label">Address</label>
                        <textarea
                            className="form-textarea"
                            value={formData.address}
                            onChange={(e) => handleChange('address', e.target.value)}
                            placeholder="Enter full address"
                            rows={2}
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
                        <label className="form-label">Contact Person</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.contactPerson}
                            onChange={(e) => handleChange('contactPerson', e.target.value)}
                            placeholder="Enter contact name"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Contact Phone</label>
                        <input
                            type="tel"
                            className="form-input"
                            value={formData.contactPhone}
                            onChange={(e) => handleChange('contactPhone', e.target.value)}
                            placeholder="Enter phone number"
                        />
                    </div>

                    {isEditing && (
                        <div className="form-group">
                            <label className="form-label">Status</label>
                            <select
                                className="form-select"
                                value={formData.isActive}
                                onChange={(e) => handleChange('isActive', e.target.value === 'true')}
                            >
                                <option value="true">Active</option>
                                <option value="false">Inactive</option>
                            </select>
                        </div>
                    )}
                </div>

                <div className="form-actions">
                    <Link to="/sites" className="btn btn-ghost">Cancel</Link>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                        {saving ? (
                            <>
                                <Loader size={18} className="animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save size={18} />
                                {isEditing ? 'Update Site' : 'Create Site'}
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
