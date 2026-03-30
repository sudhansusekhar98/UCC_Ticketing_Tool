import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ArrowLeft,
    Save,
    Camera,
    MapPin,
    Wifi,
    Cable,
    Hash,
    Package,
    AlertCircle,
    Layers,
    CheckSquare,
    Square
} from 'lucide-react';
import { fieldOpsApi, stockApi } from '../../../services/api';
import useAuthStore from '../../../context/authStore';
import toast from 'react-hot-toast';
import '../fieldops.css';

const INSTALLATION_STATUSES = ['Pending', 'Installed', 'Configured', 'Tested', 'Deployed', 'Faulty'];

export default function DeviceInstallationForm() {
    const { projectId, deviceId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const isEditing = Boolean(deviceId);

    const [loading, setLoading] = useState(isEditing);
    const [saving, setSaving] = useState(false);
    const [project, setProject] = useState(null);
    const [zones, setZones] = useState([]);
    const [allocatedStock, setAllocatedStock] = useState([]); // All allocated stock for the project
    const [allCableAllocations, setAllCableAllocations] = useState([]); // Cable allocations
    const [filteredCableAllocations, setFilteredCableAllocations] = useState([]);

    // Selected filters
    const [selectedAssetType, setSelectedAssetType] = useState('');
    const [selectedDeviceType, setSelectedDeviceType] = useState('');

    // Multi-select: track selected stock items for bulk installation
    const [selectedItems, setSelectedItems] = useState([]);

    const [formData, setFormData] = useState({
        projectId: projectId,
        zoneId: '',
        deviceType: '',
        assetType: '',
        make: '',
        model: '',
        serialNumber: '',
        quantity: 1,
        installationLocation: {
            description: '',
            poleWallId: '',
            latitude: '',
            longitude: ''
        },
        status: 'Pending',
        installedBy: '',
        cableDetails: {
            length: '',
            type: '',
            trenchId: ''
        },
        networkDetails: {
            ipAddress: '',
            subnetMask: '',
            gateway: '',
            nvrChannel: ''
        },
        notes: '',
        allocationId: '',
        cableAllocationId: ''
    });

    useEffect(() => {
        loadData();
    }, [projectId, deviceId]);

    const loadData = async () => {
        try {
            const [projectRes, zonesRes] = await Promise.all([
                fieldOpsApi.getProjectById(projectId),
                fieldOpsApi.getProjectZones(projectId)
            ]);
            setProject(projectRes.data.data);
            setZones(zonesRes.data.data || []);

            // Fetch allocated stock for this project
            try {
                const allocRes = await stockApi.getProjectAllocatedStock(projectId);
                setAllocatedStock(allocRes.data.data || []);
            } catch { /* no allocations — that's OK */ }

            // Fetch all cable allocations for this project
            try {
                const cableRes = await stockApi.getProjectCableAllocations(projectId);
                setAllCableAllocations(cableRes.data.data || []);
            } catch { /* no cable allocations — that's OK */ }

            if (isEditing) {
                const deviceRes = await fieldOpsApi.getDeviceInstallationById(deviceId);
                const device = deviceRes.data.data;
                setFormData({
                    ...device,
                    projectId: device.projectId._id || device.projectId,
                    zoneId: device.zoneId?._id || device.zoneId || '',
                    allocationId: device.allocationId || '',
                    cableAllocationId: device.cableAllocationId || '',
                    assetType: device.assetType || '',
                    installationLocation: device.installationLocation || {
                        description: '', poleWallId: '', latitude: '', longitude: ''
                    },
                    cableDetails: device.cableDetails || { length: '', type: '', trenchId: '' },
                    networkDetails: device.networkDetails || {
                        ipAddress: '', subnetMask: '', gateway: '', nvrChannel: ''
                    }
                });
                // Set selected filters for editing
                setSelectedAssetType(device.assetType || '');
                setSelectedDeviceType(device.deviceType || '');
            }
        } catch (error) {
            toast.error('Failed to load data');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Compute unique asset types with quantities from allocated stock
    const assetTypesWithQty = useMemo(() => {
        const grouped = allocatedStock.reduce((acc, item) => {
            const assetType = item.assetType || 'Other';
            if (!acc[assetType]) {
                acc[assetType] = { type: assetType, totalAllocated: 0, totalRemaining: 0, count: 0 };
            }
            acc[assetType].totalAllocated += item.allocatedQty || 0;
            acc[assetType].totalRemaining += item.remainingQty || 0;
            acc[assetType].count += 1;
            return acc;
        }, {});
        return Object.values(grouped);
    }, [allocatedStock]);

    // Compute device types for selected asset type
    const deviceTypesForAsset = useMemo(() => {
        if (!selectedAssetType) return [];

        const filtered = allocatedStock.filter(item =>
            (item.assetType || 'Other') === selectedAssetType
        );

        const grouped = filtered.reduce((acc, item) => {
            const deviceType = item.deviceType || item.assetType || 'Unknown';
            if (!acc[deviceType]) {
                acc[deviceType] = { type: deviceType, totalAllocated: 0, totalRemaining: 0, count: 0 };
            }
            acc[deviceType].totalAllocated += item.allocatedQty || 0;
            acc[deviceType].totalRemaining += item.remainingQty || 0;
            acc[deviceType].count += 1;
            return acc;
        }, {});
        return Object.values(grouped);
    }, [allocatedStock, selectedAssetType]);

    // Get stock items filtered by asset type and device type
    const filteredStockItems = useMemo(() => {
        if (!selectedAssetType || !selectedDeviceType) return [];

        return allocatedStock.filter(item => {
            const itemAssetType = item.assetType || 'Other';
            const itemDeviceType = item.deviceType || item.assetType || 'Unknown';
            return itemAssetType === selectedAssetType && itemDeviceType === selectedDeviceType;
        });
    }, [allocatedStock, selectedAssetType, selectedDeviceType]);

    // Compute cable types with quantities
    const cableTypesWithQty = useMemo(() => {
        const grouped = allCableAllocations.reduce((acc, cable) => {
            const cableType = cable.deviceType || cable.assetType || 'Unknown';
            if (!acc[cableType]) {
                acc[cableType] = { type: cableType, totalAllocated: 0, totalRemaining: 0 };
            }
            acc[cableType].totalAllocated += cable.allocatedQty || 0;
            acc[cableType].totalRemaining += cable.remainingQty || 0;
            return acc;
        }, {});
        return Object.values(grouped);
    }, [allCableAllocations]);

    // Compute team members list (PM + team members) for installedBy dropdown
    const teamMembers = useMemo(() => {
        if (!project) return [];
        const members = [];

        // Add PM if exists
        if (project.assignedPM) {
            members.push(project.assignedPM);
        }

        // Add team members if exist
        if (project.teamMembers && Array.isArray(project.teamMembers)) {
            members.push(...project.teamMembers);
        }

        // Remove duplicates by _id
        const uniqueMembers = members.filter((member, index, self) =>
            index === self.findIndex((m) => m._id === member._id)
        );

        return uniqueMembers;
    }, [project]);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleNestedChange = (parent, field, value) => {
        setFormData(prev => ({
            ...prev,
            [parent]: { ...prev[parent], [field]: value }
        }));
    };

    // Handle asset type selection
    const handleAssetTypeChange = (assetType) => {
        setSelectedAssetType(assetType);
        setSelectedDeviceType(''); // Reset device type
        setSelectedItems([]); // Clear selected items
        setFormData(prev => ({
            ...prev,
            assetType: assetType,
            deviceType: '',
            allocationId: '',
            make: '',
            model: '',
            serialNumber: ''
        }));
    };

    // Handle device type selection
    const handleDeviceTypeChange = (deviceType) => {
        setSelectedDeviceType(deviceType);
        setSelectedItems([]); // Clear selected items
        setFormData(prev => ({
            ...prev,
            deviceType: deviceType,
            allocationId: '',
            make: '',
            model: '',
            serialNumber: ''
        }));
    };

    // Toggle item selection (for multi-select)
    const toggleItemSelection = (item) => {
        setSelectedItems(prev => {
            const isSelected = prev.some(i => i.allocationId === item.allocationId);
            if (isSelected) {
                return prev.filter(i => i.allocationId !== item.allocationId);
            } else {
                return [...prev, item];
            }
        });
    };

    // Select/deselect all visible items
    const toggleSelectAll = () => {
        const availableItems = filteredStockItems.filter(item => item.remainingQty > 0);
        if (selectedItems.length === availableItems.length) {
            setSelectedItems([]);
        } else {
            setSelectedItems(availableItems);
        }
    };

    // Handle cable type selection
    const handleCableTypeChange = (cableType) => {
        setFormData(prev => ({
            ...prev,
            cableDetails: { ...prev.cableDetails, type: cableType },
            cableAllocationId: ''
        }));

        if (!cableType) {
            setFilteredCableAllocations([]);
            return;
        }

        const filtered = allCableAllocations.filter(cable => {
            const itemType = cable.deviceType || cable.assetType || '';
            return itemType.toLowerCase() === cableType.toLowerCase();
        });
        setFilteredCableAllocations(filtered);
    };

    // Handle cable allocation selection
    const handleCableAllocationSelect = (allocationId) => {
        setFormData(prev => ({
            ...prev,
            cableAllocationId: allocationId || ''
        }));
    };

    // Get selected cable allocation for display
    const selectedCableAllocation = filteredCableAllocations.find(
        c => c.allocationId === formData.cableAllocationId
    );

    // Legacy: Get selected stock item for quantity validation (used in edit mode)
    const selectedStockItem = allocatedStock.find(a => a.allocationId === formData.allocationId);

    const captureGPS = () => {
        if (!navigator.geolocation) {
            toast.error('Geolocation not supported');
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (position) => {
                handleNestedChange('installationLocation', 'latitude', position.coords.latitude);
                handleNestedChange('installationLocation', 'longitude', position.coords.longitude);
                toast.success('Location captured');
            },
            (error) => toast.error('Failed to get location'),
            { enableHighAccuracy: true }
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Multi-select mode: create multiple devices
        if (!isEditing && selectedItems.length > 0) {
            // Validate cable allocation if specified
            if (formData.cableDetails.length && formData.cableAllocationId) {
                const cableLength = parseFloat(formData.cableDetails.length);
                if (selectedCableAllocation && cableLength > selectedCableAllocation.remainingQty) {
                    toast.error(`Cable length ${cableLength}m exceeds available ${selectedCableAllocation.remainingQty}m`);
                    return;
                }
            }

            setSaving(true);
            try {
                // Create devices in bulk
                const devices = selectedItems.map(item => {
                    const devicePayload = {
                        projectId,
                        zoneId: formData.zoneId || undefined,
                        deviceType: item.deviceType || formData.deviceType,
                        assetType: item.assetType || formData.assetType,
                        make: item.make || '',
                        model: item.model || '',
                        serialNumber: item.serialNumber || '',
                        mac: item.mac || '',
                        quantity: 1, // Each selected item is one device
                        status: formData.status,
                        installationLocation: {
                            description: formData.installationLocation.description || undefined,
                            poleWallId: formData.installationLocation.poleWallId || undefined,
                            latitude: formData.installationLocation.latitude ? parseFloat(formData.installationLocation.latitude) : undefined,
                            longitude: formData.installationLocation.longitude ? parseFloat(formData.installationLocation.longitude) : undefined
                        },
                        networkDetails: {
                            ipAddress: formData.networkDetails.ipAddress || undefined,
                            subnetMask: formData.networkDetails.subnetMask || undefined,
                            gateway: formData.networkDetails.gateway || undefined,
                            nvrChannel: formData.networkDetails.nvrChannel || undefined
                        },
                        notes: formData.notes || undefined,
                        allocationId: item.allocationId,
                        cableAllocationId: formData.cableAllocationId || undefined
                    };

                    // Only include cableDetails if cable type is selected
                    if (formData.cableDetails.type && formData.cableAllocationId) {
                        devicePayload.cableDetails = {
                            lengthMeters: formData.cableDetails.length ? parseFloat(formData.cableDetails.length) / selectedItems.length : undefined,
                            cableType: formData.cableDetails.type,
                            trenchId: formData.cableDetails.trenchId || undefined
                        };
                    }

                    return devicePayload;
                });

                const response = await fieldOpsApi.createBulkDeviceInstallations({ devices });
                const createdCount = response.data.data?.length || 0;
                const errorCount = response.data.errors?.length || 0;

                if (createdCount > 0) {
                    toast.success(response.data.message || `${createdCount} device(s) added successfully`);
                    if (errorCount > 0) {
                        console.error('Device creation errors:', response.data.errors);
                        toast.error(`${errorCount} device(s) failed to create. Check console for details.`);
                    }
                    navigate(`/fieldops/projects/${projectId}`);
                } else {
                    toast.error('Failed to create devices. ' + (response.data.errors?.[0]?.error || 'Unknown error'));
                    console.error('Device creation errors:', response.data.errors);
                }
            } catch (error) {
                toast.error(error.response?.data?.message || 'Failed to save devices');
                console.error('Device creation error:', error);
            } finally {
                setSaving(false);
            }
            return;
        }

        // Single device mode (legacy or editing)
        if (!formData.deviceType || !formData.make) {
            toast.error('Please fill required fields (Device Type and Make)');
            return;
        }

        // Validate quantity against allocation
        if (formData.allocationId && selectedStockItem) {
            const qty = parseInt(formData.quantity) || 1;
            if (qty > selectedStockItem.remainingQty) {
                toast.error(`Quantity ${qty} exceeds available ${selectedStockItem.remainingQty}`);
                return;
            }
        }

        // Validate cable allocation
        if (formData.cableDetails.length && formData.cableAllocationId) {
            const cableLength = parseFloat(formData.cableDetails.length);
            if (selectedCableAllocation && cableLength > selectedCableAllocation.remainingQty) {
                toast.error(`Cable length ${cableLength}m exceeds available ${selectedCableAllocation.remainingQty}m`);
                return;
            }
        }

        setSaving(true);
        try {
            const payload = {
                ...formData,
                zoneId: formData.zoneId || undefined,
                allocationId: formData.allocationId || undefined,
                cableAllocationId: formData.cableAllocationId || undefined,
                quantity: parseInt(formData.quantity) || 1,
                cableDetails: {
                    ...formData.cableDetails,
                    length: formData.cableDetails.length ? parseFloat(formData.cableDetails.length) : undefined
                },
                installationLocation: {
                    ...formData.installationLocation,
                    latitude: formData.installationLocation.latitude ? parseFloat(formData.installationLocation.latitude) : undefined,
                    longitude: formData.installationLocation.longitude ? parseFloat(formData.installationLocation.longitude) : undefined
                }
            };

            if (isEditing) {
                await fieldOpsApi.updateDeviceInstallation(deviceId, payload);
                toast.success('Device updated successfully');
            } else {
                await fieldOpsApi.createDeviceInstallation(payload);
                toast.success('Device added successfully');
            }
            navigate(`/fieldops/projects/${projectId}`);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save device');
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

    const availableItems = filteredStockItems.filter(item => item.remainingQty > 0);
    const allSelected = availableItems.length > 0 && selectedItems.length === availableItems.length;

    return (
        <div className="page-container animate-fade-in">
            <div className="page-header">
                <div className="header-left">
                    <Link to={`/fieldops/projects/${projectId}`} className="btn btn-ghost">
                        <ArrowLeft size={18} />
                    </Link>
                    <div>
                        <h1 className="page-title">
                            {isEditing ? 'Edit Device' : 'Add Device Installation'}
                        </h1>
                        <p className="text-secondary">
                            {project?.projectName} ({project?.projectNumber})
                        </p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="glass-card device-installation-form">
                {/* Device Selection from Allocated Stock */}
                <div className="form-section">
                    <h3 className="form-section-title">
                        <Package size={18} /> Select from Allocated Stock
                    </h3>

                    {allocatedStock.length === 0 && !isEditing ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', padding: '16px 0' }}>
                            <AlertCircle size={18} />
                            No stock allocated to this project. Please allocate stock first.
                        </div>
                    ) : (
                        <div className="form-grid">
                            {/* Asset Type Selection */}
                            <div className="form-group">
                                <label className="form-label">
                                    <Layers size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                                    Asset Type *
                                </label>
                                <select
                                    className="form-select"
                                    value={selectedAssetType}
                                    onChange={(e) => handleAssetTypeChange(e.target.value)}
                                    required={!isEditing}
                                >
                                    <option value="">-- Select Asset Type --</option>
                                    {assetTypesWithQty.map(asset => (
                                        <option key={asset.type} value={asset.type}>
                                            {asset.type} — {asset.totalRemaining} remaining ({asset.count} items)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Device Type Selection - shown after Asset Type is selected */}
                            <div className="form-group">
                                <label className="form-label">Device Type *</label>
                                <select
                                    className="form-select"
                                    value={selectedDeviceType}
                                    onChange={(e) => handleDeviceTypeChange(e.target.value)}
                                    disabled={!selectedAssetType && !isEditing}
                                    required
                                >
                                    <option value="">-- Select Device Type --</option>
                                    {deviceTypesForAsset.map(device => (
                                        <option key={device.type} value={device.type}>
                                            {device.type} — {device.totalRemaining} remaining
                                        </option>
                                    ))}
                                    {isEditing && formData.deviceType && deviceTypesForAsset.length === 0 && (
                                        <option value={formData.deviceType}>{formData.deviceType}</option>
                                    )}
                                </select>
                            </div>

                            {/* Multi-Select Stock Items - shown after Device Type is selected (for new devices) */}
                            {!isEditing && selectedDeviceType && availableItems.length > 0 && (
                                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Package size={14} />
                                        Select Stock Items
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                                            ({selectedItems.length} of {availableItems.length} selected)
                                        </span>
                                    </label>

                                    {/* Select All / Deselect All */}
                                    <div style={{ marginBottom: '8px' }}>
                                        <button
                                            type="button"
                                            onClick={toggleSelectAll}
                                            className="btn btn-ghost btn-sm"
                                            style={{ fontSize: '0.8rem' }}
                                        >
                                            {allSelected ? (
                                                <><CheckSquare size={14} /> Deselect All</>
                                            ) : (
                                                <><Square size={14} /> Select All ({availableItems.length})</>
                                            )}
                                        </button>
                                    </div>

                                    {/* Stock Items List */}
                                    <div className="stock-multi-select-list" style={{
                                        maxHeight: '300px',
                                        overflowY: 'auto',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '8px',
                                        padding: '8px'
                                    }}>
                                        {availableItems.map(item => {
                                            const isSelected = selectedItems.some(i => i.allocationId === item.allocationId);
                                            return (
                                                <div
                                                    key={item.allocationId}
                                                    onClick={() => toggleItemSelection(item)}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '12px',
                                                        padding: '10px 12px',
                                                        borderRadius: '6px',
                                                        cursor: 'pointer',
                                                        backgroundColor: isSelected ? 'var(--primary-light, rgba(59, 130, 246, 0.1))' : 'transparent',
                                                        border: isSelected ? '1px solid var(--primary)' : '1px solid transparent',
                                                        marginBottom: '4px',
                                                        transition: 'all 0.15s ease'
                                                    }}
                                                >
                                                    {isSelected ? (
                                                        <CheckSquare size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                                                    ) : (
                                                        <Square size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                                                    )}
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontWeight: 500 }}>
                                                            {item.make} {item.model}
                                                        </div>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                            {item.serialNumber && <span>S/N: {item.serialNumber}</span>}
                                                            {item.mac && <span style={{ marginLeft: item.serialNumber ? '12px' : 0 }}>MAC: {item.mac}</span>}
                                                        </div>
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                        {item.remainingQty} available
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {selectedItems.length > 0 && (
                                        <div style={{ fontSize: '0.8rem', color: 'var(--primary)', marginTop: '8px' }}>
                                            {selectedItems.length} item(s) selected for installation
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Single stock item select for edit mode */}
                            {isEditing && filteredStockItems.length > 0 && (
                                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Package size={14} />
                                        Stock Item
                                    </label>
                                    <select
                                        className="form-select"
                                        value={formData.allocationId}
                                        onChange={(e) => {
                                            const allocationId = e.target.value;
                                            const item = allocatedStock.find(a => a.allocationId === allocationId);
                                            setFormData(prev => ({
                                                ...prev,
                                                allocationId,
                                                make: item?.make || prev.make,
                                                model: item?.model || prev.model,
                                                serialNumber: item?.serialNumber || prev.serialNumber
                                            }));
                                        }}
                                    >
                                        <option value="">-- Select Stock Item --</option>
                                        {filteredStockItems.map(item => (
                                            <option key={item.allocationId} value={item.allocationId}>
                                                {item.make} {item.model} {item.serialNumber ? `(${item.serialNumber})` : ''} — {item.remainingQty} remaining
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Device Details */}
                <div className="form-section">
                    <h3 className="form-section-title">
                        <Camera size={18} /> Device Details
                    </h3>
                    <div className="form-grid">
                        <div className="form-group">
                            {/* <label className="form-label">Zone</label>
                            <select
                                className="form-select"
                                value={formData.zoneId}
                                onChange={(e) => handleChange('zoneId', e.target.value)}
                            >
                                <option value="">-- Select Zone --</option>
                                {zones.map(zone => (
                                    <option key={zone._id} value={zone._id}>
                                        {zone.zoneName} ({zone.zoneCode})
                                    </option>
                                ))}
                            </select> */}
                            <label className="form-label">Location Name</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.installationLocation.description}
                                onChange={(e) => handleNestedChange('installationLocation', 'description', e.target.value)}
                                placeholder="e.g., Main Gate Entry"
                            />
                        </div>

                        {/* Show make/model/serial only in edit mode or when no multi-select */}
                        {(isEditing || selectedItems.length === 0) && (
                            <>
                                <div className="form-group">
                                    <label className="form-label">Make/Brand {isEditing && '*'}</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.make}
                                        onChange={(e) => handleChange('make', e.target.value)}
                                        placeholder="e.g., Hikvision, Dahua"
                                        required={isEditing}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Model</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.model}
                                        onChange={(e) => handleChange('model', e.target.value)}
                                        placeholder="Model number"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Serial Number</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.serialNumber}
                                        onChange={(e) => handleChange('serialNumber', e.target.value)}
                                        placeholder="Device serial number"
                                    />
                                </div>
                            </>
                        )}

                        {isEditing && (
                            <div className="form-group">
                                <label className="form-label">
                                    Quantity
                                    {selectedStockItem && (
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400, marginLeft: '6px' }}>
                                            (max: {selectedStockItem.remainingQty})
                                        </span>
                                    )}
                                </label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={formData.quantity}
                                    onChange={(e) => handleChange('quantity', e.target.value)}
                                    min="1"
                                    max={selectedStockItem?.remainingQty}
                                />
                            </div>
                        )}

                        <div className="form-group">
                            <label className="form-label">Status</label>
                            <select
                                className="form-select"
                                value={formData.status}
                                onChange={(e) => handleChange('status', e.target.value)}
                            >
                                {INSTALLATION_STATUSES.map(status => (
                                    <option key={status} value={status}>{status}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Installed By</label>
                            <select
                                className="form-select"
                                value={formData.installedBy}
                                onChange={(e) => handleChange('installedBy', e.target.value)}
                            >
                                <option value="">-- Select Installer --</option>
                                {teamMembers.map(member => (
                                    <option key={member._id} value={member._id}>
                                        {member.fullName}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Installation Location */}
                {/* <div className="form-section">
                    <h3 className="form-section-title">
                        <MapPin size={18} /> Installation Location
                    </h3>
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Location Description</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.installationLocation.description}
                                onChange={(e) => handleNestedChange('installationLocation', 'description', e.target.value)}
                                placeholder="e.g., Main Gate Entry"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Pole/Wall ID</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.installationLocation.poleWallId}
                                onChange={(e) => handleNestedChange('installationLocation', 'poleWallId', e.target.value)}
                                placeholder="e.g., P-001, W-012"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Latitude</label>
                            <input
                                type="number"
                                step="any"
                                className="form-input"
                                value={formData.installationLocation.latitude}
                                onChange={(e) => handleNestedChange('installationLocation', 'latitude', e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Longitude</label>
                            <input
                                type="number"
                                step="any"
                                className="form-input"
                                value={formData.installationLocation.longitude}
                                onChange={(e) => handleNestedChange('installationLocation', 'longitude', e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <button type="button" onClick={captureGPS} className="gps-button">
                                <MapPin size={18} /> Capture GPS
                            </button>
                        </div>
                    </div>
                </div> */}

                {/* Cable Details */}
                <div className="form-section">
                    <h3 className="form-section-title">
                        <Cable size={18} /> Cable Details
                    </h3>
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">
                                Cable Type
                                {allCableAllocations.length === 0 && !isEditing && (
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400, marginLeft: '6px' }}>
                                        (No cables allocated)
                                    </span>
                                )}
                            </label>
                            <select
                                className="form-select"
                                value={formData.cableDetails.type}
                                onChange={(e) => handleCableTypeChange(e.target.value)}
                            >
                                <option value="">-- Select Cable Type --</option>
                                {cableTypesWithQty.map(cable => (
                                    <option key={cable.type} value={cable.type}>
                                        {cable.type} — {cable.totalRemaining} remaining (of {cable.totalAllocated})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Cable Stock Selection */}
                        {formData.cableDetails.type && !isEditing && (
                            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Package size={14} />
                                    Select Cable Stock
                                </label>
                                {filteredCableAllocations.length > 0 ? (
                                    <select
                                        className="form-select"
                                        value={formData.cableAllocationId}
                                        onChange={(e) => handleCableAllocationSelect(e.target.value)}
                                    >
                                        <option value="">-- Select Cable Stock --</option>
                                        {filteredCableAllocations.filter(c => c.remainingQty > 0).map(cable => (
                                            <option key={cable.allocationId} value={cable.allocationId}>
                                                {cable.make} {cable.model} — {cable.remainingQty} {cable.unit || 'm'} remaining
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '8px 0' }}>
                                        <AlertCircle size={14} />
                                        No {formData.cableDetails.type} cable allocated to this project
                                    </div>
                                )}
                                {selectedCableAllocation && (
                                    <div style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '4px' }}>
                                        Available: {selectedCableAllocation.remainingQty} {selectedCableAllocation.unit || 'm'} of {selectedCableAllocation.allocatedQty} {selectedCableAllocation.unit || 'm'} allocated
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="form-group">
                            <label className="form-label">
                                Length (meters)
                                {selectedCableAllocation && (
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400, marginLeft: '6px' }}>
                                        (max: {selectedCableAllocation.remainingQty})
                                    </span>
                                )}
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                className="form-input"
                                value={formData.cableDetails.length}
                                onChange={(e) => handleNestedChange('cableDetails', 'length', e.target.value)}
                                max={selectedCableAllocation?.remainingQty}
                            />
                        </div>
                        {/* <div className="form-group">
                            <label className="form-label">Trench ID</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.cableDetails.trenchId}
                                onChange={(e) => handleNestedChange('cableDetails', 'trenchId', e.target.value)}
                                placeholder="e.g., TR-001"
                            />
                        </div> */}
                    </div>
                </div>

                {/* Network Details */}
                <div className="form-section">
                    <h3 className="form-section-title">
                        <Wifi size={18} /> Network Details
                    </h3>
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">IP Address</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.networkDetails.ipAddress}
                                onChange={(e) => handleNestedChange('networkDetails', 'ipAddress', e.target.value)}
                                placeholder="192.168.1.100"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Subnet Mask</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.networkDetails.subnetMask}
                                onChange={(e) => handleNestedChange('networkDetails', 'subnetMask', e.target.value)}
                                placeholder="255.255.255.0"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Gateway</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.networkDetails.gateway}
                                onChange={(e) => handleNestedChange('networkDetails', 'gateway', e.target.value)}
                                placeholder="192.168.1.1"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">NVR Channel</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.networkDetails.nvrChannel}
                                onChange={(e) => handleNestedChange('networkDetails', 'nvrChannel', e.target.value)}
                                placeholder="e.g., CH-01"
                            />
                        </div>
                    </div>
                </div>

                {/* Notes */}
                <div className="form-section">
                    <h3 className="form-section-title">
                        <Hash size={18} /> Additional Notes
                    </h3>
                    <div className="form-group">
                        <textarea
                            className="form-textarea"
                            value={formData.notes}
                            onChange={(e) => handleChange('notes', e.target.value)}
                            placeholder="Any additional notes about this installation..."
                            rows={3}
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="form-actions">
                    <Link to={`/fieldops/projects/${projectId}`} className="btn btn-ghost">
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={saving || (!isEditing && selectedItems.length === 0 && !formData.make)}
                    >
                        {saving ? (
                            <>
                                <div className="spinner-sm"></div>
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save size={18} />
                                {isEditing ? 'Update Device' : selectedItems.length > 1 ? `Add ${selectedItems.length} Devices` : 'Add Device'}
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
