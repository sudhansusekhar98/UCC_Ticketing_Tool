import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save, Loader, Eye, EyeOff, History, Clock, CheckCircle } from 'lucide-react';
import { assetsApi, sitesApi, lookupsApi, rmaApi, assetUpdateRequestApi } from '../../services/api';
import useAuthStore from '../../context/authStore';
import toast from 'react-hot-toast';
import '../sites/Sites.css';

export default function AssetForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const isEditing = Boolean(id);
    const { hasRole, getSitesWithRight } = useAuthStore();

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [sites, setSites] = useState([]);
    const [assetTypes, setAssetTypes] = useState([]);
    const [deviceTypes, setDeviceTypes] = useState([]);
    const [assetStatuses, setAssetStatuses] = useState([]);
    const [rmaHistory, setRmaHistory] = useState([]);
    const [showRmaHistory, setShowRmaHistory] = useState(false);
    
    // RMA Update Request states
    const [updateToken, setUpdateToken] = useState(null);
    const [updateRequestData, setUpdateRequestData] = useState(null);
    const [timeRemaining, setTimeRemaining] = useState(null);
    const [isPendingApproval, setIsPendingApproval] = useState(false);
    
    // RMA mode means only IP Address and Serial Number are editable
    const isRMAMode = Boolean(updateToken && timeRemaining > 0);
    
    // Fields that are allowed to be edited in RMA mode
    const rmaEditableFields = ['ipAddress', 'serialNumber', 'mac'];
    
    // Helper function to check if a field is editable
    const isFieldEditable = (fieldName) => {
        if (!isRMAMode) return true;
        return rmaEditableFields.includes(fieldName);
    };

    const [formData, setFormData] = useState({
        assetCode: '',
        assetType: 'Camera',
        make: '',
        model: '',
        serialNumber: '',
        ipAddress: '',
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
        // Check for update token (temporary access workflow)
        const token = searchParams.get('updateToken');
        if (token) {
            setUpdateToken(token);
            validateUpdateToken(token);
        }
        
        loadDropdowns();
        if (isEditing) {
            loadAsset();
            loadRMAHistory();
        }
        
        // Show notification if redirected from RMA flow
        if (searchParams.get('fromRMA') === 'true') {
            toast.success('Asset swapped successfully! You can now update additional details if needed.');
        }
    }, [id]);
    
    // Timer for update token expiration
    useEffect(() => {
        if (!updateToken || !timeRemaining) return;
        
        const interval = setInterval(() => {
            setTimeRemaining(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    toast.error('Access expired! Redirecting to ticket...');
                    if (updateRequestData?.ticketId) {
                        setTimeout(() => {
                            navigate(`/tickets/${updateRequestData.ticketId}`);
                        }, 2000);
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        
        return () => clearInterval(interval);
    }, [updateToken, timeRemaining]);

    // Load device types when assetType changes
    useEffect(() => {
        if (formData.assetType) {
            loadDeviceTypes(formData.assetType);
        }
    }, [formData.assetType]);

    const loadDropdowns = async () => {
        try {
            const [sitesRes, typesRes, statusesRes] = await Promise.all([
                sitesApi.getDropdown(),
                lookupsApi.getAssetTypes(),
                lookupsApi.getAssetStatuses(),
            ]);
            // Handle Express response format - backend already filters sites based on assignedSites
            const siteData = sitesRes.data.data || sitesRes.data || [];

            setSites(siteData.map(s => ({
                value: s._id || s.value || s.siteId,
                label: s.siteName || s.label
            })));
            
            const typeData = typesRes.data.data || typesRes.data || [];
            setAssetTypes(typeData);
            
            const statusData = statusesRes.data.data || statusesRes.data || [];
            setAssetStatuses(statusData);
        } catch (error) {
            console.error('Failed to load dropdowns', error);
        }
    };

    const loadDeviceTypes = async (assetType) => {
        try {
            const response = await lookupsApi.getDeviceTypes(assetType);
            const deviceTypeData = response.data.data || response.data || [];
            setDeviceTypes(deviceTypeData);
        } catch (error) {
            console.error('Failed to load device types', error);
            setDeviceTypes([]);
        }
    };

    const loadAsset = async () => {
        setLoading(true);
        try {
            const response = await assetsApi.getById(id);
            const asset = response.data.data || response.data;
            // Get siteId - could be object or string
            const siteIdValue = typeof asset.siteId === 'object' ? asset.siteId?._id : asset.siteId;
            setFormData({
                assetCode: asset.assetCode,
                assetType: asset.assetType,
                make: asset.make || '',
                model: asset.model || '',
                serialNumber: asset.serialNumber || '',
                ipAddress: asset.ipAddress || asset.managementIP || '',
                mac: asset.mac || '',
                siteId: siteIdValue || '',
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

    const loadRMAHistory = async () => {
        try {
            const response = await rmaApi.getHistory(id);
            setRmaHistory(response.data.data || []);
        } catch (error) {
            console.error('Failed to load RMA history', error);
            setRmaHistory([]);
        }
    };

    const validateUpdateToken = async (token) => {
        try {
            const response = await assetUpdateRequestApi.validate(token);
            const data = response.data.data;
            setUpdateRequestData(data);
            setTimeRemaining(response.data.timeRemaining);
            
            toast.success(`Temporary access granted! You have ${Math.floor(response.data.timeRemaining / 60)} minutes remaining.`, {
                duration: 5000
            });
        } catch (error) {
            if (error.response?.data?.expired) {
                toast.error('Access token has expired');
            } else {
                toast.error('Invalid or expired access token');
            }
            // Redirect back after error
            setTimeout(() => {
                navigate('/assets');
            }, 2000);
        }
    };


    const handleChange = (field, value) => {
        // Reset deviceType when assetType changes
        if (field === 'assetType') {
            setFormData({ ...formData, [field]: value, deviceType: '' });
        } else {
            setFormData({ ...formData, [field]: value });
        }
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
                siteId: formData.siteId, // Keep as string for MongoDB ObjectId
                criticality: parseInt(formData.criticality),
                installationDate: formData.installationDate || null,
                warrantyEndDate: formData.warrantyEndDate || null,
            };

            // If we have an update token, submit for approval instead of direct update
            if (updateToken) {
                // In RMA mode, only submit the allowed fields (IP Address, Serial Number, and MAC)
                const rmaPayload = {
                    serialNumber: formData.serialNumber,
                    ipAddress: formData.ipAddress,
                    mac: formData.mac,
                };
                
                await assetUpdateRequestApi.submit(updateToken, rmaPayload);
                toast.success('Changes submitted for approval!');
                setIsPendingApproval(true);
                
                // Redirect to ticket after a delay
                setTimeout(() => {
                    if (updateRequestData?.ticketId) {
                        navigate(`/tickets/${updateRequestData.ticketId}`);
                    } else {
                        navigate('/assets');
                    }
                }, 2000);
            } else {
                // Normal asset update workflow
                if (isEditing) {
                    await assetsApi.update(id, payload);
                    toast.success('Asset updated successfully');
                } else {
                    await assetsApi.create(payload);
                    toast.success('Asset created successfully');
                }
                navigate('/assets');
            }
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
        <div className="page-container form-view animate-fade-in">
            <Link to="/assets" className="back-link">
                <ArrowLeft size={18} />
                Back to Assets
            </Link>

            <div className="page-header">
                <h1 className="page-title">
                    {isEditing ? 'Edit Asset' : 'Add New Asset'}
                </h1>
                {isEditing && rmaHistory.length > 0 && (
                    <button 
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => setShowRmaHistory(true)}
                    >
                        <History size={18} />
                        RMA History ({rmaHistory.length})
                    </button>
                )}
            </div>

            {/* Temporary Access Timer Banner */}
            {updateToken && timeRemaining !== null && !isPendingApproval && (
                <div className={`p-4 rounded-lg border-2 mb-4 ${
                    timeRemaining < 300 ? 'bg-danger/10 border-danger' : 'bg-warning/10 border-warning'
                }`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Clock size={24} className={timeRemaining < 300 ? 'text-danger' : 'text-warning'} />
                            <div>
                            <h3 className="font-bold text-lg">RMA Installation Mode - Limited Access</h3>
                                <p className="text-sm text-muted">
                                    You can only update <strong>Serial Number</strong>, <strong>IP Address</strong>, and <strong>MAC Address</strong>. Submit your changes before the timer expires.
                                </p>
                            </div>
                        </div>
                        <div className="text-center">
                            <div className={`text-3xl font-bold ${timeRemaining < 300 ? 'text-danger' : 'text-warning'}`}>
                                {Math.floor(timeRemaining / 60)}:{String(timeRemaining % 60).padStart(2, '0')}
                            </div>
                            <div className="text-xs text-muted">Time Remaining</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Pending Approval Banner */}
            {isPendingApproval && (
                <div className="p-4 rounded-lg border-2 bg-info/10 border-info mb-4">
                    <div className="flex items-center gap-3">
                        <CheckCircle size={24} className="text-info" />
                        <div>
                            <h3 className="font-bold text-lg">Changes Submitted!</h3>
                            <p className="text-sm text-muted">
                                Your asset update request has been submitted and is pending admin approval.
                            </p>
                        </div>
                    </div>
                </div>
            )}

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
                            disabled={!isFieldEditable('assetCode')}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Asset Type *</label>
                        <select
                            className="form-select"
                            value={formData.assetType}
                            onChange={(e) => handleChange('assetType', e.target.value)}
                            required
                            disabled={!isFieldEditable('assetType')}
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
                            disabled={!isFieldEditable('siteId')}
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
                            disabled={!isFieldEditable('status')}
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
                            disabled={!isFieldEditable('criticality')}
                        >
                            <option value="1">Low</option>
                            <option value="2">Medium</option>
                            <option value="3">High</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Device Type</label>
                        {deviceTypes.length > 0 ? (
                            <select
                                className="form-select"
                                value={formData.deviceType}
                                onChange={(e) => handleChange('deviceType', e.target.value)}
                                disabled={!isFieldEditable('deviceType')}
                            >
                                <option value="">Select Device Type</option>
                                {deviceTypes.map(dt => (
                                    <option key={dt.value} value={dt.value}>{dt.label}</option>
                                ))}
                            </select>
                        ) : (
                            <input
                                type="text"
                                className="form-input"
                                value={formData.deviceType}
                                onChange={(e) => handleChange('deviceType', e.target.value)}
                                placeholder="e.g., PTZ Camera, Fixed Dome"
                                disabled={!isFieldEditable('deviceType')}
                            />
                        )}
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
                            disabled={!isFieldEditable('make')}
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
                            disabled={!isFieldEditable('model')}
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
                            disabled={!isFieldEditable('usedFor')}
                        />
                    </div>
                </div>

                {/* Section: Network Information */}
                <h3 className="form-section-title">Network Information</h3>
                <div className="form-grid">
                    <div className="form-group">
                        <label className="form-label">IP Address</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.ipAddress}
                            onChange={(e) => handleChange('ipAddress', e.target.value)}
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
                            disabled={!isFieldEditable('mac')}
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
                            disabled={!isFieldEditable('locationName')}
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
                            disabled={!isFieldEditable('locationDescription')}
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
                            disabled={!isFieldEditable('installationDate')}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Warranty End Date</label>
                        <input
                            type="date"
                            className="form-input"
                            value={formData.warrantyEndDate}
                            onChange={(e) => handleChange('warrantyEndDate', e.target.value)}
                            disabled={!isFieldEditable('warrantyEndDate')}
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
                            disabled={!isFieldEditable('vmsReferenceId')}
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
                            disabled={!isFieldEditable('nmsReferenceId')}
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
                            disabled={!isFieldEditable('userName')}
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
                                disabled={!isFieldEditable('password')}
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
                            disabled={!isFieldEditable('remark')}
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

            {/* RMA History Modal */}
            {showRmaHistory && (
                <div className="modal-overlay" onClick={() => setShowRmaHistory(false)}>
                    <div className="modal glass-card" onClick={(e) => e.stopPropagation()}>
                        <h3>RMA / Replacement History</h3>
                        <p className="text-sm text-muted mb-4">
                            Complete history of device replacements for this asset
                        </p>

                        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                            {rmaHistory.length === 0 ? (
                                <div className="text-center py-8 text-muted">
                                    <p>No replacement history found for this asset.</p>
                                </div>
                            ) : (
                                rmaHistory.map((rma, index) => (
                                    <div key={rma._id} className="p-4 bg-secondary/20 rounded border border-border">
                                        <div className="flex justify-between items-center mb-3">
                                            <div className="flex items-center gap-2">
                                                <span className="badge badge-outline">#{rmaHistory.length - index}</span>
                                                <span className="font-bold text-sm">
                                                    Ticket: {rma.ticketId?.ticketNumber || 'N/A'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`badge badge-${rma.status === 'Installed' ? 'success' : 'warning'}`}>
                                                    {rma.status}
                                                </span>
                                                <span className="text-xs text-muted">
                                                    {new Date(rma.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 mb-3">
                                            <div className="p-3 bg-danger/10 rounded">
                                                <h4 className="text-xs font-bold text-muted mb-2">Old Device (Replaced)</h4>
                                                <div className="space-y-1 text-sm">
                                                    <div>
                                                        <span className="text-muted">S/N:</span>{' '}
                                                        <span className="font-mono">{rma.originalDetailsSnapshot?.serialNumber || 'N/A'}</span>
                                                    </div>
                                                    {rma.originalDetailsSnapshot?.ipAddress && (
                                                        <div>
                                                            <span className="text-muted">IP:</span>{' '}
                                                            <span className="font-mono">{rma.originalDetailsSnapshot.ipAddress}</span>
                                                        </div>
                                                    )}
                                                    {rma.originalDetailsSnapshot?.mac && (
                                                        <div>
                                                            <span className="text-muted">MAC:</span>{' '}
                                                            <span className="font-mono">{rma.originalDetailsSnapshot.mac}</span>
                                                        </div>
                                                    )}
                                                    {rma.originalDetailsSnapshot?.model && (
                                                        <div>
                                                            <span className="text-muted">Model:</span>{' '}
                                                            <span>{rma.originalDetailsSnapshot.model}</span>
                                                        </div>
                                                    )}
                                                    {rma.originalDetailsSnapshot?.make && (
                                                        <div>
                                                            <span className="text-muted">Make:</span>{' '}
                                                            <span>{rma.originalDetailsSnapshot.make}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="p-3 bg-success/10 rounded">
                                                <h4 className="text-xs font-bold text-muted mb-2">New Device (Installed)</h4>
                                                <div className="space-y-1 text-sm">
                                                    {rma.replacementDetails?.serialNumber ? (
                                                        <>
                                                            <div>
                                                                <span className="text-muted">S/N:</span>{' '}
                                                                <span className="font-mono">{rma.replacementDetails.serialNumber}</span>
                                                            </div>
                                                            {rma.replacementDetails?.ipAddress && (
                                                                <div>
                                                                    <span className="text-muted">IP:</span>{' '}
                                                                    <span className="font-mono">{rma.replacementDetails.ipAddress}</span>
                                                                </div>
                                                            )}
                                                            {rma.replacementDetails?.mac && (
                                                                <div>
                                                                    <span className="text-muted">MAC:</span>{' '}
                                                                    <span className="font-mono">{rma.replacementDetails.mac}</span>
                                                                </div>
                                                            )}
                                                            {rma.replacementDetails?.model && (
                                                                <div>
                                                                    <span className="text-muted">Model:</span>{' '}
                                                                    <span>{rma.replacementDetails.model}</span>
                                                                </div>
                                                            )}
                                                            {rma.replacementDetails?.make && (
                                                                <div>
                                                                    <span className="text-muted">Make:</span>{' '}
                                                                    <span>{rma.replacementDetails.make}</span>
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <span className="text-muted italic">Installation pending</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-3 bg-warning/10 rounded">
                                            <h4 className="text-xs font-bold text-muted mb-1">Replacement Reason</h4>
                                            <p className="text-sm">{rma.requestReason}</p>
                                        </div>

                                        {rma.installedBy && (
                                            <div className="mt-2 text-xs text-muted">
                                                Installed on: {new Date(rma.installedOn).toLocaleString()}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="modal-actions mt-4">
                            <button className="btn btn-ghost" onClick={() => setShowRmaHistory(false)}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
