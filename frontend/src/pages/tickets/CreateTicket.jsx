import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, Loader, Paperclip, X, FileText, Image } from 'lucide-react';
import { ticketsApi, assetsApi, sitesApi, lookupsApi, usersApi, activitiesApi } from '../../services/api';
import useAuthStore from '../../context/authStore';
import toast from 'react-hot-toast';
import './Tickets.css';

export default function TicketForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditing = Boolean(id);
    const { user, getSitesWithRight, hasRole } = useAuthStore();
    const isSiteClient = hasRole('SiteClient');

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
        assignedTo: !isEditing && !hasRole('Admin') ? user?.userId : '',
        tags: '',
    });

    // Dropdown options
    const [categories, setCategories] = useState([]);
    const [assets, setAssets] = useState([]);
    const [sites, setSites] = useState([]);
    const [locationNames, setLocationNames] = useState([]);
    const [assetTypes, setAssetTypes] = useState([]);
    const [deviceTypes, setDeviceTypes] = useState([]);
    const [engineers, setEngineers] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [selectedSiteId, setSelectedSiteId] = useState(() => {
        // Auto-select site for SiteClient from their assigned sites
        if (isSiteClient && user?.assignedSites?.length > 0) {
            const firstSite = user.assignedSites[0];
            return firstSite?._id || firstSite || '';
        }
        return '';
    });
    const [selectedLocationName, setSelectedLocationName] = useState('');
    const [selectedAssetType, setSelectedAssetType] = useState('');
    const [selectedDeviceType, setSelectedDeviceType] = useState('');
    const [slaPolicies, setSlaPolicies] = useState([]);
    const [calculatedTargets, setCalculatedTargets] = useState({ response: null, resolution: null });

    // File attachments (only for new tickets)
    const [attachments, setAttachments] = useState([]);
    const fileInputRef = useRef(null);

    // Track if we're in initial load mode (to prevent useEffects from resetting assetId)
    const isInitialLoad = useRef(false);

    useEffect(() => {
        loadDropdowns();
        if (isEditing) {
            isInitialLoad.current = true;
            loadTicket();
        }
    }, [id]);

    // Auto-select site for SiteClient when sites dropdown loads (fallback)
    useEffect(() => {
        if (isSiteClient && !selectedSiteId && sites.length > 0) {
            setSelectedSiteId(sites[0].value);
        }
    }, [isSiteClient, sites]);

    // Load location names and asset types when site changes
    useEffect(() => {
        if (selectedSiteId) {
            loadLocationNames(selectedSiteId);
            loadAssetTypesForSite(selectedSiteId, '');
        } else {
            setLocationNames([]);
            setAssetTypes([]);
        }
        // Reset location name and dependent fields when site changes (not during initial load)
        if (!isInitialLoad.current) {
            setSelectedLocationName('');
            setSelectedAssetType('');
            setSelectedDeviceType('');
            setFormData(prev => ({ ...prev, assetId: '' }));
        }
    }, [selectedSiteId]);

    // Load asset types when location name changes
    useEffect(() => {
        if (selectedSiteId) {
            loadAssetTypesForSite(selectedSiteId, selectedLocationName);
        }
        // Reset asset type and dependent fields when location changes (not during initial load)
        if (!isInitialLoad.current) {
            setSelectedAssetType('');
            setSelectedDeviceType('');
            setFormData(prev => ({ ...prev, assetId: '' }));
        }
    }, [selectedLocationName]);

    // Load device types when assetType changes
    useEffect(() => {
        if (selectedSiteId && selectedAssetType) {
            loadDeviceTypesForSite(selectedSiteId, selectedLocationName, selectedAssetType);
        } else {
            setDeviceTypes([]);
        }
        // Only reset device type and asset when user manually changes asset type (not during initial load)
        if (!isInitialLoad.current) {
            setSelectedDeviceType('');
            setFormData(prev => ({ ...prev, assetId: '' }));
        }
    }, [selectedAssetType]);

    useEffect(() => {
        // Load assets when site, locationName, assetType, or deviceType changes
        if (selectedSiteId) {
            loadAssets(selectedSiteId, selectedLocationName, selectedAssetType, selectedDeviceType);
        } else {
            // Don't load assets if no site is selected (since site is mandatory)
            setAssets([]);
        }
        // Only reset asset selection when user manually changes filters (not during initial load)
        if (!isInitialLoad.current) {
            setFormData(prev => ({ ...prev, assetId: '' }));
        }
    }, [selectedSiteId, selectedLocationName, selectedAssetType, selectedDeviceType]);

    const loadDropdowns = async () => {
        try {
            const [categoriesRes, sitesRes, engineersRes, usersRes, lookupsRes] = await Promise.all([
                lookupsApi.getCategories(),
                sitesApi.getDropdown(),
                usersApi.getEngineers(),
                usersApi.getDropdown(), // Get all active users
                lookupsApi.getAll()
            ]);
            // Handle Express response format
            const catData = categoriesRes.data.data || categoriesRes.data || [];
            setCategories(catData);

            // Set SLA Policies
            const lookupData = lookupsRes.data.data || lookupsRes.data || {};
            setSlaPolicies(lookupData.slaPolicies || []);

            // Backend already filters sites based on user's assignedSites
            const siteData = sitesRes.data.data || sitesRes.data || [];

            setSites(siteData.map(s => ({
                value: s._id || s.value || s.siteId,
                label: s.siteName || s.label
            })));

            const engData = engineersRes.data.data || engineersRes.data || [];
            setEngineers(engData.map(e => ({
                value: e._id || e.value || e.userId,
                label: e.fullName || e.label
            })));

            const userData = usersRes.data.data || usersRes.data || [];
            setAllUsers(userData.map(u => ({
                value: u._id || u.value || u.userId,
                label: u.fullName || u.label
            })));
        } catch (error) {
            console.error('Failed to load dropdowns', error);
        }
    };

    const loadDeviceTypesForSite = async (siteId, locationName = '', assetType = '') => {
        try {
            const response = await assetsApi.getDeviceTypesForSite(siteId, locationName || undefined, assetType || undefined);
            const deviceTypeData = response.data.data || response.data || [];
            setDeviceTypes(deviceTypeData);
        } catch (error) {
            console.error('Failed to load device types', error);
            setDeviceTypes([]);
        }
    };

    const loadAssetTypesForSite = async (siteId, locationName = '') => {
        try {
            const response = await assetsApi.getAssetTypesForSite(siteId, locationName || undefined);
            const assetTypeData = response.data.data || response.data || [];
            setAssetTypes(assetTypeData);
        } catch (error) {
            console.error('Failed to load asset types', error);
            setAssetTypes([]);
        }
    };

    const loadLocationNames = async (siteId) => {
        try {
            const response = await assetsApi.getLocationNames(siteId);
            const locationData = response.data.data || response.data || [];
            setLocationNames(locationData);
        } catch (error) {
            console.error('Failed to load location names', error);
            setLocationNames([]);
        }
    };

    const loadAssets = async (siteId, locationName = '', assetType = '', deviceType = '') => {
        try {
            const response = await assetsApi.getDropdown(siteId, assetType || undefined);
            let assetData = response.data.data || response.data || [];

            // Filter by location name if selected
            if (locationName) {
                assetData = assetData.filter(a => a.locationName === locationName);
            }

            // Filter by device type if selected
            if (deviceType) {
                assetData = assetData.filter(a => a.deviceType === deviceType);
            }

            setAssets(assetData.map(a => ({
                value: a._id || a.value || a.assetId,
                label: `${a.assetCode}${a.deviceType ? ` (${a.deviceType})` : a.assetType ? ` (${a.assetType})` : ''}`,
                criticality: a.criticality || 2
            })));
        } catch (error) {
            console.error('Failed to load assets', error);
        }
    };



    // Calculate targets whenever impact, urgency or asset changes
    useEffect(() => {
        const calculateSLA = async () => {
            const selectedAsset = assets.find(a => a.value === formData.assetId);
            const criticality = selectedAsset?.criticality || 2;
            const score = formData.impact * formData.urgency * criticality;
            const priority = getPriorityFromScore(score);
            const policy = slaPolicies.find(p => p.priority === priority);

            if (policy) {
                const now = new Date();
                const responseDue = new Date(now.getTime() + policy.responseTimeMinutes * 60 * 1000);
                const resolutionDue = new Date(now.getTime() + policy.restoreTimeMinutes * 60 * 1000);
                setCalculatedTargets({
                    response: responseDue,
                    resolution: resolutionDue
                });
            } else {
                setCalculatedTargets({ response: null, resolution: null });
            }
        };

        if (slaPolicies.length > 0) {
            calculateSLA();
        }
    }, [formData.impact, formData.urgency, formData.assetId, slaPolicies, assets]);
    const loadTicket = async () => {
        setLoading(true);
        try {
            const response = await ticketsApi.getById(id);
            const ticket = response.data.data || response.data;

            // Disable editing if work has started
            const isLocked = ['InProgress', 'OnHold', 'Resolved', 'Verified', 'Closed', 'Cancelled'].includes(ticket.status);
            if (isLocked) {
                toast.error('Ticket cannot be edited once work has started');
                navigate(`/tickets/${id}`);
                return;
            }

            // Get IDs - could be objects or strings
            const assetIdValue = typeof ticket.assetId === 'object' ? ticket.assetId?._id : ticket.assetId;
            const assignedToValue = typeof ticket.assignedTo === 'object' ? ticket.assignedTo?._id : ticket.assignedTo;

            // Extract siteId from the ticket itself first, then from asset as fallback
            const ticketSiteId = typeof ticket.siteId === 'object' ? ticket.siteId?._id : ticket.siteId;

            // Extract site, asset type, and device type from the asset object if populated
            const asset = ticket.assetId && typeof ticket.assetId === 'object' ? ticket.assetId : null;
            const assetSiteId = asset ? (typeof asset.siteId === 'object' ? asset.siteId?._id : asset.siteId) : null;
            const effectiveSiteId = ticketSiteId || assetSiteId;

            if (effectiveSiteId) {
                setSelectedSiteId(effectiveSiteId);
                // Load location names for this site
                await loadLocationNames(effectiveSiteId);
                // Load asset types for this site and location
                await loadAssetTypesForSite(effectiveSiteId, asset?.locationName || '');
            }

            if (asset) {
                // Set location name from asset
                if (asset.locationName) {
                    setSelectedLocationName(asset.locationName);
                }

                // Set asset type from asset
                if (asset.assetType) {
                    setSelectedAssetType(asset.assetType);
                    // Load device types for this asset type
                    await loadDeviceTypesForSite(effectiveSiteId, asset.locationName || '', asset.assetType);
                }

                // Set device type from asset
                if (asset.deviceType) {
                    setSelectedDeviceType(asset.deviceType);
                }

                // Load assets for the site and asset type to populate the dropdown
                if (effectiveSiteId) {
                    await loadAssets(effectiveSiteId, asset.locationName || '', asset.assetType || '', asset.deviceType || '');
                }
            }

            setFormData({
                assetId: assetIdValue || '',
                category: ticket.category,
                subCategory: ticket.subCategory || '',
                title: ticket.title,
                description: ticket.description || '',
                impact: ticket.impact,
                urgency: ticket.urgency,
                assignedTo: assignedToValue || '',
                tags: ticket.tags || '',
            });
        } catch (error) {
            toast.error('Failed to load ticket');
            navigate('/tickets');
        } finally {
            setLoading(false);
            // Reset initial load flag so subsequent changes work normally
            isInitialLoad.current = false;
        }
    };

    const handleChange = (field, value) => {
        setFormData({ ...formData, [field]: value });
    };

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        const validFiles = files.filter(file => {
            const maxSize = 10 * 1024 * 1024; // 10MB
            if (file.size > maxSize) {
                toast.error(`${file.name} is too large. Maximum size is 10MB.`);
                return false;
            }
            return true;
        });
        setAttachments(prev => [...prev, ...validFiles]);
        // Reset input so same file can be selected again
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const removeAttachment = (index) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const getFileIcon = (file) => {
        if (file.type.startsWith('image/')) {
            return <Image size={16} />;
        }
        return <FileText size={16} />;
    };

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!isSiteClient && !selectedSiteId) {
            toast.error('Please select a Site');
            return;
        }

        if (!formData.title || !formData.category) {
            toast.error('Please fill in required fields');
            return;
        }

        setSaving(true);
        try {
            const siteId = isSiteClient
                ? (selectedSiteId || user?.assignedSites?.[0]?._id || user?.assignedSites?.[0])
                : selectedSiteId;
            const payload = {
                ...formData,
                siteId,
                assetId: isSiteClient ? null : (formData.assetId || null),
                assignedTo: formData.assignedTo || null,
                impact: isSiteClient ? 3 : parseInt(formData.impact),
                urgency: isSiteClient ? 3 : parseInt(formData.urgency),
            };

            if (isEditing) {
                await ticketsApi.update(id, payload);
                toast.success('Ticket updated successfully');
            } else {
                const response = await ticketsApi.create(payload);
                const newTicketId = response.data.data?._id || response.data.data?.ticketId || response.data._id;

                // Upload attachments if any
                if (attachments.length > 0 && newTicketId) {
                    toast.loading('Uploading attachments...', { id: 'upload-attachments' });

                    let successCount = 0;
                    let failCount = 0;

                    for (const file of attachments) {
                        try {
                            await activitiesApi.uploadAttachment(newTicketId, file);
                            successCount++;
                        } catch (err) {
                            console.error('Failed to upload attachment:', file.name, err);
                            failCount++;
                        }
                    }

                    toast.dismiss('upload-attachments');

                    if (failCount > 0) {
                        toast.success(`Ticket created. ${successCount} file(s) uploaded, ${failCount} failed.`);
                    } else {
                        toast.success(`Ticket created with ${successCount} attachment(s)`);
                    }
                } else {
                    toast.success('Ticket created successfully');
                }

                navigate(`/tickets/${newTicketId}`);
                return;
            }

            navigate(`/tickets/${id}`);
        } catch (error) {
            console.error('Error creating ticket:', error);
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
            <div className="page-header">
                <h1 className="page-title">
                    {isEditing ? 'Edit Ticket' : 'Create New Ticket'}
                </h1>
                <Link
                    to={isEditing ? `/tickets/${id}` : "/tickets"}
                    className="back-link"
                    style={{ marginBottom: 0 }}
                >
                    <ArrowLeft size={18} />
                    {isEditing ? 'Back to Ticket' : 'Back to Tickets'}
                </Link>
            </div>

            <form onSubmit={handleSubmit} className="form-card glass-card">
                <div className='asset-form-container' style={{ margin: "1rem" }}>
                    <div className="form-grid">
                        {/* Site Selection (mandatory for non-clients, auto-selected for clients) */}
                        {isSiteClient ? (
                            <input type="hidden" value={user?.assignedSites?.[0]?._id || user?.assignedSites?.[0] || ''} />
                        ) : (
                            <div className="form-group">
                                <label className="form-label">Site *</label>
                                <select
                                    className="form-select"
                                    value={selectedSiteId}
                                    onChange={(e) => setSelectedSiteId(e.target.value)}
                                    required
                                >
                                    <option value="">Select Site</option>
                                    {sites.map((site) => (
                                        <option key={site.value} value={site.value}>{site.label}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Location, Asset Type, Device Type, Asset Selection - Hidden for SiteClient */}
                        {!isSiteClient && (
                            <>
                                {/* Location Name Selection (filter for assets) */}
                                <div className="form-group">
                                    <label className="form-label">Location Name</label>
                                    <select
                                        className="form-select"
                                        value={selectedLocationName}
                                        onChange={(e) => setSelectedLocationName(e.target.value)}
                                        disabled={!selectedSiteId || locationNames.length === 0}
                                    >
                                        <option value="">
                                            {!selectedSiteId
                                                ? 'Select Site first'
                                                : locationNames.length === 0
                                                    ? 'No locations available'
                                                    : 'All Locations'}
                                        </option>
                                        {locationNames.map((loc) => (
                                            <option key={loc.value} value={loc.value}>{loc.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Asset Type Selection (filter for assets) */}
                                <div className="form-group">
                                    <label className="form-label">Asset Type</label>
                                    <select
                                        className="form-select"
                                        value={selectedAssetType}
                                        onChange={(e) => setSelectedAssetType(e.target.value)}
                                        disabled={!selectedSiteId || assetTypes.length === 0}
                                    >
                                        <option value="">
                                            {!selectedSiteId
                                                ? 'Select Site first'
                                                : assetTypes.length === 0
                                                    ? 'No asset types available'
                                                    : 'All Asset Types'}
                                        </option>
                                        {assetTypes.map((type) => (
                                            <option key={type.value} value={type.value}>{type.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Device Type Selection (filter for assets) */}
                                <div className="form-group">
                                    <label className="form-label">Device Type</label>
                                    <select
                                        className="form-select"
                                        value={selectedDeviceType}
                                        onChange={(e) => setSelectedDeviceType(e.target.value)}
                                        disabled={!selectedAssetType || deviceTypes.length === 0}
                                    >
                                        <option value="">
                                            {!selectedAssetType
                                                ? 'Select Asset Type first'
                                                : deviceTypes.length === 0
                                                    ? 'No device types available'
                                                    : 'All Device Types'}
                                        </option>
                                        {deviceTypes.map((dt) => (
                                            <option key={dt.value} value={dt.value}>{dt.label}</option>
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
                                        disabled={!selectedSiteId}
                                    >
                                        <option value="">
                                            {!selectedSiteId
                                                ? 'Select Site first'
                                                : assets.length === 0
                                                    ? 'No assets available'
                                                    : 'Select Asset (optional)'
                                            }
                                        </option>
                                        {assets.map((asset) => (
                                            <option key={asset.value} value={asset.value}>{asset.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </>
                        )}

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

                        {/* Impact & Urgency - Hidden for SiteClient */}
                        {!isSiteClient && (
                            <>
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
                            </>
                        )}

                        {/* Assign To (only for new tickets) - Only Admin can change default assignment */}
                        {!isEditing && hasRole('Admin') && (
                            <div className="form-group">
                                <label className="form-label">Assign To (optional)</label>
                                <select
                                    className="form-select"
                                    value={formData.assignedTo}
                                    onChange={(e) => handleChange('assignedTo', e.target.value)}
                                >
                                    <option value="">Unassigned</option>
                                    {user && (
                                        <option value={user.userId}>
                                            👤 Assign to Myself ({user.fullName})
                                        </option>
                                    )}
                                    <optgroup label="Engineers">
                                        {engineers
                                            .filter(eng => eng.value !== user?.userId?.toString())
                                            .map((eng) => (
                                                <option key={eng.value} value={eng.value}>{eng.label}</option>
                                            ))}
                                    </optgroup>
                                    <optgroup label="Other Employees">
                                        {allUsers
                                            .filter(u =>
                                                u.value !== user?.userId?.toString() &&
                                                !engineers.some(e => e.value === u.value)
                                            )
                                            .map((u) => (
                                                <option key={u.value} value={u.value}>{u.label}</option>
                                            ))}
                                    </optgroup>
                                </select>
                            </div>
                        )}

                        {/* Tags - Hidden for SiteClient */}
                        {!isSiteClient && (
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
                        )}

                        {/* File Attachments (only for new tickets) */}
                        {!isEditing && (
                            <div className="form-group full-width">
                                <label className="form-label">
                                    <Paperclip size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                                    Attachments
                                </label>
                                <div className="attachments-section">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileSelect}
                                        multiple
                                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                                        style={{ display: 'none' }}
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-ghost"
                                        onClick={() => fileInputRef.current?.click()}
                                        style={{ marginBottom: '12px' }}
                                    >
                                        <Paperclip size={16} />
                                        Add Files
                                    </button>
                                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                                        Supported: Images, PDF, Word, Excel, Text (Max 10MB each)
                                    </p>

                                    {attachments.length > 0 && (
                                        <div className="attachments-list" style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '8px',
                                            padding: '12px',
                                            backgroundColor: 'var(--surface-alt)',
                                            borderRadius: '8px'
                                        }}>
                                            {attachments.map((file, index) => (
                                                <div
                                                    key={index}
                                                    className="attachment-item"
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        padding: '8px 12px',
                                                        backgroundColor: 'var(--surface)',
                                                        borderRadius: '6px',
                                                        border: '1px solid var(--border)'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                                                        {getFileIcon(file)}
                                                        <span style={{
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap',
                                                            fontSize: '14px'
                                                        }}>
                                                            {file.name}
                                                        </span>
                                                        <span style={{
                                                            fontSize: '12px',
                                                            color: 'var(--text-muted)',
                                                            whiteSpace: 'nowrap'
                                                        }}>
                                                            ({formatFileSize(file.size)})
                                                        </span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeAttachment(index)}
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            padding: '4px',
                                                            color: 'var(--danger)',
                                                            display: 'flex',
                                                            alignItems: 'center'
                                                        }}
                                                        title="Remove file"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Priority Preview - Hidden for SiteClient */}
                    {!isSiteClient && (
                        <>
                            <div className="priority-preview">
                                <span className="preview-label">Calculated Priority:</span>
                                <span className={`badge priority-${getPriorityFromScore(formData.impact * formData.urgency * (assets.find(a => a.value === formData.assetId)?.criticality || 2)).toLowerCase()}`}>
                                    {getPriorityFromScore(formData.impact * formData.urgency * (assets.find(a => a.value === formData.assetId)?.criticality || 2))}
                                </span>
                                <span className="preview-note">
                                    (Score: {formData.impact * formData.urgency * (assets.find(a => a.value === formData.assetId)?.criticality || 2)} = Impact × Urgency × Asset Criticality)
                                </span>
                            </div>

                            {calculatedTargets.response && (
                                <div className="sla-preview-grid" style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                    gap: '1rem',
                                    marginTop: '1rem',
                                    padding: '1rem',
                                    backgroundColor: 'var(--surface-alt)',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border)'
                                }}>
                                    <div className="sla-preview-item">
                                        <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                                            Predicted Response Target
                                        </label>
                                        <span style={{ fontWeight: '600', color: 'var(--primary)' }}>
                                            {calculatedTargets.response.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="sla-preview-item">
                                        <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                                            Predicted Resolution Target
                                        </label>
                                        <span style={{ fontWeight: '600', color: 'var(--primary)' }}>
                                            {calculatedTargets.resolution.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

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
