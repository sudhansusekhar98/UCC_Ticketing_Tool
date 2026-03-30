import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, Loader, Clock, RotateCcw, Download } from 'lucide-react';
import { sitesApi, usersApi } from '../../services/api';
import useAuthStore from '../../context/authStore';
import toast from 'react-hot-toast';
import './Sites.css';

const DEFAULT_SLA = [
    { priority: 'P1', responseTimeMinutes: 15, restoreTimeMinutes: 60, escalationLevel1Minutes: 30, escalationLevel2Minutes: 45 },
    { priority: 'P2', responseTimeMinutes: 30, restoreTimeMinutes: 240, escalationLevel1Minutes: 120, escalationLevel2Minutes: 180 },
    { priority: 'P3', responseTimeMinutes: 60, restoreTimeMinutes: 480, escalationLevel1Minutes: 240, escalationLevel2Minutes: 360 },
    { priority: 'P4', responseTimeMinutes: 120, restoreTimeMinutes: 1440, escalationLevel1Minutes: 720, escalationLevel2Minutes: 1080 },
];

const PRIORITY_COLORS = {
    P1: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)', label: 'Critical', color: '#ef4444' },
    P2: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', label: 'High', color: '#f59e0b' },
    P3: { bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.25)', label: 'Medium', color: '#3b82f6' },
    P4: { bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.25)', label: 'Low', color: '#6b7280' },
};

function formatMinutes(min) {
    if (!min && min !== 0) return '—';
    if (min < 60) return `${min}m`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function SiteForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { hasRole } = useAuthStore();
    const isAdmin = hasRole(['Admin']);
    const isEditing = Boolean(id);

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [savingSLA, setSavingSLA] = useState(false);
    const [contacts, setContacts] = useState([]);

    const [formData, setFormData] = useState({
        siteName: '',
        siteUniqueID: '',
        city: '',
        zone: '',
        ward: '',
        address: '',
        latitude: '',
        longitude: '',
        contactPerson: '',
        contactPhone: '',
        isActive: true,
        isHeadOffice: false,
    });
    const [hasExistingHeadOffice, setHasExistingHeadOffice] = useState(false);
    const [existingHeadOfficeName, setExistingHeadOfficeName] = useState('');

    // SLA state
    const [slaPolicies, setSlaPolicies] = useState([]);
    const [slaSource, setSlaSource] = useState('global'); // 'site' or 'global'
    const [slaExpanded, setSlaExpanded] = useState(true);

    useEffect(() => {
        loadContacts();
        checkExistingHeadOffice();
        if (isEditing) {
            loadSite();
            if (isAdmin) loadSLA();
        }
    }, [id]);

    const checkExistingHeadOffice = async () => {
        try {
            const response = await sitesApi.getAll({ limit: 100 });
            const allSites = response.data.data || response.data || [];
            const ho = allSites.find(s => s.isHeadOffice);
            if (ho) {
                setHasExistingHeadOffice(true);
                setExistingHeadOfficeName(ho.siteName);
            }
        } catch (error) {
            console.error('Failed to check head office status', error);
        }
    };

    const loadContacts = async () => {
        try {
            const response = await usersApi.getContacts();
            const contactData = response.data.data || response.data || [];
            setContacts(contactData.map(c => ({
                ...c,
                userId: c._id || c.userId
            })));
        } catch (error) {
            console.error('Failed to load contacts', error);
        }
    };

    const loadSite = async () => {
        setLoading(true);
        try {
            const response = await sitesApi.getById(id);
            const site = response.data.data;
            setFormData({
                siteName: site.siteName,
                siteUniqueID: site.siteUniqueID || '',
                city: site.city,
                zone: site.zone || '',
                ward: site.ward || '',
                address: site.address || '',
                latitude: site.latitude || '',
                longitude: site.longitude || '',
                contactPerson: site.contactPerson || '',
                contactPhone: site.contactPhone || '',
                isActive: site.isActive,
                isHeadOffice: site.isHeadOffice || false,
            });
        } catch (error) {
            toast.error('Failed to load site');
            navigate('/sites');
        } finally {
            setLoading(false);
        }
    };

    const loadSLA = async () => {
        try {
            const response = await sitesApi.getSLA(id);
            const data = response.data;
            setSlaSource(data.source);

            // Normalize: ensure all 4 priorities exist
            const incoming = data.data || [];
            const merged = ['P1', 'P2', 'P3', 'P4'].map(priority => {
                const existing = incoming.find(p => p.priority === priority);
                if (existing) {
                    return {
                        priority,
                        responseTimeMinutes: existing.responseTimeMinutes ?? 0,
                        restoreTimeMinutes: existing.restoreTimeMinutes ?? 0,
                        escalationLevel1Minutes: existing.escalationLevel1Minutes ?? 0,
                        escalationLevel2Minutes: existing.escalationLevel2Minutes ?? 0,
                    };
                }
                const defaultSLA = DEFAULT_SLA.find(d => d.priority === priority);
                return { ...defaultSLA };
            });
            setSlaPolicies(merged);
        } catch (error) {
            console.error('Failed to load SLA', error);
            setSlaPolicies(DEFAULT_SLA.map(d => ({ ...d })));
        }
    };

    const handleChange = (field, value) => {
        setFormData({ ...formData, [field]: value });
    };

    const handleContactPersonChange = (selectedName) => {
        const selectedContact = contacts.find(c => c.fullName === selectedName);
        setFormData({
            ...formData,
            contactPerson: selectedName,
            contactPhone: selectedContact?.mobileNumber || ''
        });
    };

    const handleSLAChange = (priority, field, value) => {
        setSlaPolicies(prev => prev.map(p =>
            p.priority === priority
                ? { ...p, [field]: parseInt(value) || 0 }
                : p
        ));
    };

    const handleLoadGlobalDefaults = () => {
        setSlaPolicies(DEFAULT_SLA.map(d => ({ ...d })));
        toast.success('Loaded global default SLA values');
    };

    const handleResetToGlobal = async () => {
        if (!confirm('Remove site-specific SLA and revert to global defaults?')) return;
        setSavingSLA(true);
        try {
            await sitesApi.updateSLA(id, { policies: [] });
            setSlaSource('global');
            await loadSLA();
            toast.success('SLA reset to global defaults');
        } catch (error) {
            toast.error('Failed to reset SLA');
        } finally {
            setSavingSLA(false);
        }
    };

    const handleSaveSLA = async () => {
        setSavingSLA(true);
        try {
            await sitesApi.updateSLA(id, { policies: slaPolicies });
            setSlaSource('site');
            toast.success('Site SLA policies saved');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save SLA');
        } finally {
            setSavingSLA(false);
        }
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
        <div className="page-container form-view animate-fade-in">
            <div className="page-header">
                <h1 className="page-title">
                    {isEditing ? 'Edit Site' : 'Add New Site'}
                </h1>
                <Link to="/sites" className="back-link" style={{ margin: 0 }}>
                    <ArrowLeft size={18} />
                    Back to Sites
                </Link>
            </div>

            <div className={`site-form-layout ${isEditing && isAdmin ? 'with-sidebar' : ''}`}>
                <form onSubmit={handleSubmit} className="form-card glass-card" style={{ margin: 0, maxWidth: 'none' }}>
                    <div className='asset-form-container'>
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
                            <label className="form-label">Site Unique ID *</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.siteUniqueID}
                                onChange={(e) => handleChange('siteUniqueID', e.target.value)}
                                placeholder="Enter site unique ID"
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
                            <select
                                className="form-select"
                                value={formData.contactPerson}
                                onChange={(e) => handleContactPersonChange(e.target.value)}
                            >
                                <option value="">Select contact person</option>
                                {contacts.map((contact) => (
                                    <option key={contact.userId} value={contact.fullName}>
                                        {contact.fullName}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Contact Phone</label>
                            <input
                                type="tel"
                                className="form-input"
                                value={formData.contactPhone}
                                onChange={(e) => handleChange('contactPhone', e.target.value)}
                                placeholder="Auto-filled from selected contact"
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

                        <div className="form-group" style={{ gridColumn: 'span 4', marginTop: '1rem' }}>
                            <label className="flex items-center gap-2 cursor-pointer" style={{ width: 'fit-content' }}>
                                <input
                                    type="checkbox"
                                    style={{ width: '18px', height: '18px' }}
                                    checked={formData.isHeadOffice}
                                    disabled={hasExistingHeadOffice && (!isEditing || (isEditing && existingHeadOfficeName !== formData.siteName))}
                                    onChange={(e) => handleChange('isHeadOffice', e.target.checked)}
                                />
                                <span className="form-label" style={{ marginBottom: 0, fontSize: '0.85rem' }}>
                                    Mark as Head Office Location
                                </span>
                            </label>
                            {hasExistingHeadOffice && (!isEditing || (isEditing && existingHeadOfficeName !== formData.siteName)) && (
                                <p className="cell-secondary" style={{ marginTop: '0.5rem', color: 'var(--warning-600)' }}>
                                    Note: A Head Office already exists ({existingHeadOfficeName}). You can only have one Head Office.
                                </p>
                            )}
                        </div>
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
                </div>
                </form>

                {/* ─── SLA Configuration (Admin only, edit mode) ─── */}
                {isEditing && isAdmin && (
                    <div className="glass-card sla-sidebar">
                    <button
                        type="button"
                        onClick={() => setSlaExpanded(!slaExpanded)}
                        style={{
                            width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '1.25rem', fontFamily: 'inherit'
                        }}
                    >
                        <div className="flex items-center gap-3">
                            <div style={{
                                width: 36, height: 36, borderRadius: '0.625rem',
                                background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <Clock size={18} style={{ color: '#3b82f6' }} />
                            </div>
                            <div style={{ textAlign: 'left' }}>
                                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
                                    SLA Configuration
                                </h3>
                                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                    {slaSource === 'site'
                                        ? '✦ Custom SLA configured for this site'
                                        : '↳ Using global default SLA (fallback)'}
                                </p>
                            </div>
                        </div>
                        <span style={{
                            fontSize: '1.25rem', transition: 'transform 200ms',
                            transform: slaExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
                        }}>▾</span>
                    </button>

                    {slaExpanded && (
                        <div style={{ padding: '0 1.25rem 1.25rem' }}>
                            {/* Action buttons */}
                            <div className="flex gap-2" style={{ marginBottom: '1rem', flexWrap: 'wrap' }}>
                                <button type="button" className="btn btn-ghost btn-sm" onClick={handleLoadGlobalDefaults}>
                                    <Download size={14} /> Load Global Defaults
                                </button>
                                {slaSource === 'site' && (
                                    <button type="button" className="btn btn-ghost btn-sm" onClick={handleResetToGlobal}
                                        style={{ color: 'var(--danger-500)' }} disabled={savingSLA}>
                                        <RotateCcw size={14} /> Reset to Global
                                    </button>
                                )}
                            </div>

                            {/* Priority cards grid */}
                            <div style={{
                                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                                gap: '0.75rem', marginBottom: '1rem'
                            }}>
                                {slaPolicies.map(policy => {
                                    const pConfig = PRIORITY_COLORS[policy.priority];
                                    return (
                                        <div key={policy.priority} style={{
                                            background: pConfig.bg, border: `1px solid ${pConfig.border}`,
                                            borderRadius: '0.75rem', padding: '1rem',
                                        }}>
                                            <div className="flex items-center gap-2" style={{ marginBottom: '0.75rem' }}>
                                                <span style={{
                                                    fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase',
                                                    letterSpacing: '0.06em', background: pConfig.color, color: '#fff',
                                                    padding: '2px 8px', borderRadius: '4px'
                                                }}>
                                                    {policy.priority}
                                                </span>
                                                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                                    {pConfig.label}
                                                </span>
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                                <div className="form-group" style={{ marginBottom: 0 }}>
                                                    <label style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>
                                                        Response (min)
                                                    </label>
                                                    <input
                                                        type="number" min="0" className="form-input"
                                                        style={{ fontSize: '0.85rem', padding: '0.4rem 0.5rem' }}
                                                        value={policy.responseTimeMinutes}
                                                        onChange={(e) => handleSLAChange(policy.priority, 'responseTimeMinutes', e.target.value)}
                                                    />
                                                </div>
                                                <div className="form-group" style={{ marginBottom: 0 }}>
                                                    <label style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>
                                                        Restore (min)
                                                    </label>
                                                    <input
                                                        type="number" min="0" className="form-input"
                                                        style={{ fontSize: '0.85rem', padding: '0.4rem 0.5rem' }}
                                                        value={policy.restoreTimeMinutes}
                                                        onChange={(e) => handleSLAChange(policy.priority, 'restoreTimeMinutes', e.target.value)}
                                                    />
                                                </div>
                                                <div className="form-group" style={{ marginBottom: 0 }}>
                                                    <label style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>
                                                        Escalation L1 (min)
                                                    </label>
                                                    <input
                                                        type="number" min="0" className="form-input"
                                                        style={{ fontSize: '0.85rem', padding: '0.4rem 0.5rem' }}
                                                        value={policy.escalationLevel1Minutes}
                                                        onChange={(e) => handleSLAChange(policy.priority, 'escalationLevel1Minutes', e.target.value)}
                                                    />
                                                </div>
                                                <div className="form-group" style={{ marginBottom: 0 }}>
                                                    <label style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>
                                                        Escalation L2 (min)
                                                    </label>
                                                    <input
                                                        type="number" min="0" className="form-input"
                                                        style={{ fontSize: '0.85rem', padding: '0.4rem 0.5rem' }}
                                                        value={policy.escalationLevel2Minutes}
                                                        onChange={(e) => handleSLAChange(policy.priority, 'escalationLevel2Minutes', e.target.value)}
                                                    />
                                                </div>
                                            </div>

                                            <div style={{
                                                fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.5rem',
                                                display: 'flex', gap: '0.75rem'
                                            }}>
                                                <span>Resp: {formatMinutes(policy.responseTimeMinutes)}</span>
                                                <span>Rest: {formatMinutes(policy.restoreTimeMinutes)}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Save SLA button */}
                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={handleSaveSLA}
                                    disabled={savingSLA}
                                >
                                    {savingSLA ? (
                                        <><Loader size={16} className="animate-spin" /> Saving SLA...</>
                                    ) : (
                                        <><Save size={16} /> Save SLA Configuration</>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
            </div>
        </div>
    );
}
