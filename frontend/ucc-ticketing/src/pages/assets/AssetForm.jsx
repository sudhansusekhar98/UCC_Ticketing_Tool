import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, Loader, Eye, EyeOff } from 'lucide-react';
import { assetsApi, sitesApi, lookupsApi } from '../../services/api';
import toast from 'react-hot-toast';
import '../sites/Sites.css';

export default function AssetForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditing = Boolean(id);

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [sites, setSites] = useState([]);
    const [assetTypes, setAssetTypes] = useState([]);
    const [assetStatuses, setAssetStatuses] = useState([]);

    const [formData, setFormData] = useState({
        assetCode: '',
        assetType: 'Camera',
        make: '',
        model: '',


        serialNumber: '',
        managementIP: '',

        mac: '',
        siteId: '',
        locationDescription: '',
        locationName: '',
        deviceType: '',
        usedFor: '',
        criticality: 2,
        status: 'Operational',
        installationDate: '',
        warrantyEndDate: '',
        vmsReferenceId: '',
        nmsReferenceId: '',
        userName: '',
        password: '',
        remark: '',
        isActive: true,
    });

    useEffect(() => {
        loadDropdowns();
        if (isEditing) {
            loadAsset();
        }
    }, [id]);

    const loadDropdowns = async () => {
        try {
            const [sitesRes, typesRes, statusesRes] = await Promise.all([
                sitesApi.getDropdown(),
                lookupsApi.getAssetTypes(),
                lookupsApi.getAssetStatuses(),
            ]);
            setSites(sitesRes.data);
            setAssetTypes(typesRes.data);
            setAssetStatuses(statusesRes.data);
        } catch (error) {
            console.error('Failed to load dropdowns', error);
        }
    };

    const loadAsset = async () => {
        setLoading(true);
        try {
            const response = await assetsApi.getById(id);
            const asset = response.data.data;
            setFormData({
                assetCode: asset.assetCode,
                assetType: asset.assetType,
                make: asset.make || '',
                model: asset.model || '',

                serialNumber: asset.serialNumber || '',
                managementIP: asset.managementIP || '',

                mac: asset.mac || '',
                siteId: asset.siteId?.toString() || '',
                locationDescription: asset.locationDescription || '',
                locationName: asset.locationName || '',
                deviceType: asset.deviceType || '',
                usedFor: asset.usedFor || '',
                criticality: asset.criticality,
                status: asset.status,
                installationDate: asset.installationDate ? asset.installationDate.split('T')[0] : '',
                warrantyEndDate: asset.warrantyEndDate ? asset.warrantyEndDate.split('T')[0] : '',
                vmsReferenceId: asset.vmsReferenceId || '',
                nmsReferenceId: asset.nmsReferenceId || '',
                userName: asset.userName || '',
                password: '', // Don't load password for security
                remark: asset.remark || '',
                isActive: asset.isActive,
            });
        } catch (error) {
            toast.error('Failed to load asset');
            navigate('/assets');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field, value) => {
        setFormData({ ...formData, [field]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.assetCode || !formData.siteId || !formData.assetType) {
            toast.error('Please fill in required fields');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                ...formData,
                siteId: parseInt(formData.siteId),
                criticality: parseInt(formData.criticality),
                installationDate: formData.installationDate || null,
                warrantyEndDate: formData.warrantyEndDate || null,

            };

            if (isEditing) {
                await assetsApi.update(id, payload);
                toast.success('Asset updated successfully');
            } else {
                await assetsApi.create(payload);
                toast.success('Asset created successfully');
            }
            navigate('/assets');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save asset');
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
            <Link to="/assets" className="back-link">
                <ArrowLeft size={18} />
                Back to Assets
            </Link>

            <div className="page-header">
                <h1 className="page-title">
                    {isEditing ? 'Edit Asset' : 'Add New Asset'}
                </h1>
            </div>

            <form onSubmit={handleSubmit} className="form-card glass-card">
                {/* Section: Basic Information */}
                <h3 className="form-section-title">Basic Information</h3>
                <div className="form-grid">
                    <div className="form-group">
                        <label className="form-label">Asset Code *</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.assetCode}
                            onChange={(e) => handleChange('assetCode', e.target.value)}
                            placeholder="e.g., CAM-CC-001"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Asset Type *</label>
                        <select
                            className="form-select"
                            value={formData.assetType}
                            onChange={(e) => handleChange('assetType', e.target.value)}
                            required
                        >
                            {assetTypes.map(type => (
                                <option key={type.value} value={type.value}>{type.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Site *</label>
                        <select
                            className="form-select"
                            value={formData.siteId}
                            onChange={(e) => handleChange('siteId', e.target.value)}
                            required
                        >
                            <option value="">Select Site</option>
                            {sites.map(site => (
                                <option key={site.value} value={site.value}>{site.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Status</label>
                        <select
                            className="form-select"
                            value={formData.status}
                            onChange={(e) => handleChange('status', e.target.value)}
                        >
                            {assetStatuses.map(status => (
                                <option key={status.value} value={status.value}>{status.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Criticality Level</label>
                        <select
                            className="form-select"
                            value={formData.criticality}
                            onChange={(e) => handleChange('criticality', e.target.value)}
                        >
                            <option value="1">Low</option>
                            <option value="2">Medium</option>
                            <option value="3">High</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Device Type</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.deviceType}
                            onChange={(e) => handleChange('deviceType', e.target.value)}
                            placeholder="e.g., PTZ Camera, Fixed Dome"
                        />
                    </div>
                </div>

                {/* Section: Make & Model */}
                <h3 className="form-section-title">Make & Model</h3>
                <div className="form-grid">
                    <div className="form-group">
                        <label className="form-label">Make</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.make}
                            onChange={(e) => handleChange('make', e.target.value)}
                            placeholder="e.g., Hikvision"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Model</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.model}
                            onChange={(e) => handleChange('model', e.target.value)}
                            placeholder="e.g., DS-2CD2385G1-I"
                        />
                    </div>



                    <div className="form-group">
                        <label className="form-label">Serial Number</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.serialNumber}
                            onChange={(e) => handleChange('serialNumber', e.target.value)}
                            placeholder="Enter serial number"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Used For</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.usedFor}
                            onChange={(e) => handleChange('usedFor', e.target.value)}
                            placeholder="e.g., Traffic Monitoring"
                        />
                    </div>
                </div>

                {/* Section: Network Information */}
                <h3 className="form-section-title">Network Information</h3>
                <div className="form-grid">
                    <div className="form-group">
                        <label className="form-label">Management IP</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.managementIP}
                            onChange={(e) => handleChange('managementIP', e.target.value)}
                            placeholder="e.g., 192.168.1.100"
                        />
                    </div>



                    <div className="form-group">
                        <label className="form-label">MAC Address</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.mac}
                            onChange={(e) => handleChange('mac', e.target.value)}
                            placeholder="e.g., AA:BB:CC:DD:EE:FF"
                        />
                    </div>
                </div>

                {/* Section: Location */}
                <h3 className="form-section-title">Location</h3>
                <div className="form-grid">
                    <div className="form-group">
                        <label className="form-label">Location Name</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.locationName}
                            onChange={(e) => handleChange('locationName', e.target.value)}
                            placeholder="e.g., Junction A"
                        />
                    </div>

                    <div className="form-group full-width">
                        <label className="form-label">Location Description</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.locationDescription}
                            onChange={(e) => handleChange('locationDescription', e.target.value)}
                            placeholder="e.g., Main Entrance, South Corner near pole #15"
                        />
                    </div>
                </div>

                {/* Section: Dates & References */}
                <h3 className="form-section-title">Dates & References</h3>
                <div className="form-grid">
                    <div className="form-group">
                        <label className="form-label">Installation Date</label>
                        <input
                            type="date"
                            className="form-input"
                            value={formData.installationDate}
                            onChange={(e) => handleChange('installationDate', e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Warranty End Date</label>
                        <input
                            type="date"
                            className="form-input"
                            value={formData.warrantyEndDate}
                            onChange={(e) => handleChange('warrantyEndDate', e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">VMS Reference ID</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.vmsReferenceId}
                            onChange={(e) => handleChange('vmsReferenceId', e.target.value)}
                            placeholder="VMS camera/source ID"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">NMS Reference ID</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.nmsReferenceId}
                            onChange={(e) => handleChange('nmsReferenceId', e.target.value)}
                            placeholder="NMS device ID"
                        />
                    </div>
                </div>

                {/* Section: Credentials */}
                <h3 className="form-section-title">Device Credentials</h3>
                <div className="form-grid">
                    <div className="form-group">
                        <label className="form-label">Username</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.userName}
                            onChange={(e) => handleChange('userName', e.target.value)}
                            placeholder="Device login username"
                            autoComplete="off"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <div className="password-input-wrapper">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                className="form-input"
                                value={formData.password}
                                onChange={(e) => handleChange('password', e.target.value)}
                                placeholder={isEditing ? 'Leave blank to keep current' : 'Device login password'}
                                autoComplete="new-password"
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Section: Notes */}
                <h3 className="form-section-title">Additional Notes</h3>
                <div className="form-grid">
                    <div className="form-group full-width">
                        <label className="form-label">Remarks</label>
                        <textarea
                            className="form-textarea"
                            value={formData.remark}
                            onChange={(e) => handleChange('remark', e.target.value)}
                            placeholder="Any additional notes about this asset..."
                            rows={3}
                        />
                    </div>
                </div>

                <div className="form-actions">
                    <Link to="/assets" className="btn btn-ghost">Cancel</Link>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                        {saving ? (
                            <>
                                <Loader size={18} className="animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save size={18} />
                                {isEditing ? 'Update Asset' : 'Create Asset'}
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
