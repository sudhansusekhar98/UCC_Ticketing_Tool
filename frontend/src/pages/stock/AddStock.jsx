import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    Package, ArrowLeft, Plus, Warehouse, Building2, Cpu, Upload
} from 'lucide-react';
import { stockApi, sitesApi, lookupsApi } from '../../services/api';
import toast from 'react-hot-toast';
import useAuthStore from '../../context/authStore';
import { PERMISSIONS } from '../../constants/permissions';
import './StockCommon.css';
import './AddStock.css';

export default function AddStock() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [sites, setSites] = useState([]);
    const [assetTypes, setAssetTypes] = useState([]);
    const [deviceTypes, setDeviceTypes] = useState([]);
    const [models, setModels] = useState([]);

    // Permission checks
    const { hasRole, hasRight, getSitesWithRight, refreshUserRights } = useAuthStore();
    const isAdminOrSupervisor = hasRole(['Admin', 'Supervisor']);

    const [formData, setFormData] = useState({
        siteId: '',
        assetType: '',
        customAssetType: '',
        stockLocation: '',
        make: '',
        deviceType: '',
        customDeviceType: '',
        model: '',
        customModel: '',
        serialNumber: '',
        mac: '',
        quantity: 1,
        unit: 'Nos',
        remarks: ''
    });

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (formData.assetType && formData.assetType !== 'Other') {
            fetchDeviceTypes(formData.assetType);
            fetchModels(formData.assetType);
        } else {
            setDeviceTypes([]);
            setModels([]);
        }
    }, [formData.assetType]);

    useEffect(() => {
        if (formData.assetType && formData.assetType !== 'Other' && formData.deviceType && formData.deviceType !== 'Other') {
            fetchModels(formData.assetType, formData.deviceType);
        }
    }, [formData.deviceType]);

    const fetchInitialData = async () => {
        try {
            // Refresh user rights first to get latest permissions
            await refreshUserRights();

            const [sitesRes, typesRes] = await Promise.all([
                sitesApi.getAll({ limit: 100 }),
                lookupsApi.getAssetTypes()
            ]);

            let siteData = sitesRes.data.data || sitesRes.data || [];

            // Filter sites based on user permissions (only sites where user has MANAGE_SITE_STOCK right)
            // Re-check isAdminOrSupervisor after refresh
            const currentIsAdmin = hasRole(['Admin', 'Supervisor']);
            if (!currentIsAdmin) {
                const allowedSiteIds = getSitesWithRight(PERMISSIONS.MANAGE_SITE_STOCK);
                siteData = siteData.filter(site =>
                    allowedSiteIds.includes((site._id || site.id)?.toString())
                );
            }

            setSites(siteData);

            // Default to Head Office if available and user has access
            const hoSite = siteData.find(s => s.isHeadOffice);
            if (hoSite) {
                setFormData(prev => ({ ...prev, siteId: hoSite._id }));
            } else if (siteData.length > 0) {
                // Default to first available site
                setFormData(prev => ({ ...prev, siteId: siteData[0]._id }));
            }

            setAssetTypes(typesRes.data.data || typesRes.data || []);
        } catch (error) {
            console.error('Failed to fetch initial data:', error);
            toast.error('Failed to load form options');
        }
    };

    const fetchDeviceTypes = async (assetType) => {
        try {
            const response = await lookupsApi.getDeviceTypes(assetType);
            setDeviceTypes(response.data.data || []);
        } catch (error) {
            console.error('Failed to fetch device types:', error);
            setDeviceTypes([]);
        }
    };

    const fetchModels = async (assetType, deviceType = '') => {
        try {
            const response = await lookupsApi.getModels(assetType, deviceType);
            setModels(response.data.data || []);
        } catch (error) {
            console.error('Failed to fetch models:', error);
            setModels([]);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const finalAssetType = formData.assetType === 'Other' ? formData.customAssetType : formData.assetType;
        const finalDeviceType = formData.deviceType === 'Other' || formData.assetType === 'Other' ? formData.customDeviceType : formData.deviceType;
        const finalModel = formData.model === 'Other' || formData.assetType === 'Other' ? formData.customModel : formData.model;

        if (!formData.siteId || !finalAssetType || !formData.serialNumber) {
            toast.error('Please fill in all required fields (Location, Type, SL No)');
            return;
        }

        if (formData.assetType === 'Other' && !formData.customAssetType) {
            toast.error('Please enter a custom asset type.');
            return;
        }
        if ((formData.deviceType === 'Other' || formData.assetType === 'Other') && !formData.customDeviceType) {
            toast.error('Please enter a custom device type.');
            return;
        }
        if ((formData.model === 'Other' || formData.assetType === 'Other') && !formData.customModel) {
            toast.error('Please enter a custom model name.');
            return;
        }

        const submissionData = {
            ...formData,
            assetType: finalAssetType,
            deviceType: finalDeviceType,
            model: finalModel
        };

        delete submissionData.customAssetType;
        delete submissionData.customDeviceType;
        delete submissionData.customModel;

        try {
            setLoading(true);
            const response = await stockApi.addStock(submissionData);
            toast.success(response.data.message || `Stock item ${formData.assetCode} added successfully`);
            navigate('/stock');
        } catch (error) {
            console.error('Failed to add stock:', error);
            toast.error(error.response?.data?.message || 'Failed to add stock');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="stock-container">
            <div className="add-stock-page animate-fade-in">
                <div className="page-header">
                    <div className="flex items-center gap-3">
                        <div className="title-icon">
                            <Plus size={24} />
                        </div>
                        <div>
                            <h1 className="page-title">Add New Stock Item</h1>
                            <p className="page-subtitle">Register a new spare device in inventory</p>
                        </div>
                    </div>

                    <div className="header-actions">
                        <Link to="/stock/bulk" className="btn btn-secondary btn-ghost">
                            <Upload size={16} />
                            Bulk Import
                        </Link>
                        <Link to="/stock" className="btn btn-secondary">
                            <ArrowLeft size={18} />
                            Back to Stock
                        </Link>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="stock-form">
                    <div className='asset-form-container'>
                        <div className="form-card">
                            <div className="section-header">
                                <div className="section-icon">
                                    <Package size={18} />
                                </div>
                                <div className="section-header-text">
                                    <h2>Asset Information</h2>
                                    <p className="section-description">Enter device identification and classification details</p>
                                </div>
                            </div>

                            <div className="form-section">
                                <div className="section-subtitle">Primary Details & Classification</div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="mac">
                                            MAC Address
                                        </label>
                                        <input
                                            type="text"
                                            id="mac"
                                            name="mac"
                                            value={formData.mac}
                                            onChange={handleChange}
                                            placeholder="e.g., 00:1A:2B:3C:4D:5E"
                                            className="form-input"
                                        />
                                        <span className="field-hint">Network hardware address (optional)</span>
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="serialNumber">
                                            Serial Number <span className="required">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            id="serialNumber"
                                            name="serialNumber"
                                            value={formData.serialNumber}
                                            onChange={handleChange}
                                            placeholder="Enter Serial Number"
                                            className="form-input"
                                            required
                                        />
                                        <span className="field-hint">Manufacturer serial number</span>
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="assetType">
                                            Asset Type <span className="required">*</span>
                                        </label>
                                        <select
                                            id="assetType"
                                            name="assetType"
                                            value={formData.assetType}
                                            onChange={handleChange}
                                            className="form-select"
                                            required
                                        >
                                            <option value="">Select asset type</option>
                                            {assetTypes.map((type, idx) => (
                                                <option key={idx} value={type.value || type}>
                                                    {type.label || type}
                                                </option>
                                            ))}
                                            <option value="Other">Other (specify manually)</option>
                                        </select>

                                        {formData.assetType === 'Other' && (
                                            <input
                                                type="text"
                                                name="customAssetType"
                                                value={formData.customAssetType}
                                                onChange={handleChange}
                                                placeholder="Enter custom asset type"
                                                className="form-input mt-2"
                                                required
                                            />
                                        )}
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="siteId">
                                            <Warehouse size={16} /> Storage Location <span className="required">*</span>
                                        </label>
                                        <select
                                            id="siteId"
                                            name="siteId"
                                            value={formData.siteId}
                                            onChange={handleChange}
                                            className="form-select"
                                            required
                                        >
                                            <option value="">Select site/warehouse</option>
                                            {sites.map(site => (
                                                <option key={site._id} value={site._id}>
                                                    {site.siteName} {site.isHeadOffice ? '(Head Office)' : ''}
                                                </option>
                                            ))}
                                        </select>
                                        <span className="field-hint">Physical storage site</span>
                                    </div>
                                </div>
                            </div>

                            <div className="form-section">
                                <div className="section-subtitle">Device Specifications & Storage details</div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="make">Make / Brand</label>
                                        <input
                                            type="text"
                                            id="make"
                                            name="make"
                                            value={formData.make}
                                            onChange={handleChange}
                                            placeholder="e.g., Hikvision, Dell"
                                            className="form-input"
                                        />
                                        <span className="field-hint">Manufacturer name</span>
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="deviceType">
                                            <Cpu size={16} /> Device Type
                                        </label>
                                        <select
                                            id="deviceType"
                                            name="deviceType"
                                            value={formData.deviceType}
                                            onChange={handleChange}
                                            className="form-select"
                                            disabled={!formData.assetType || formData.assetType === 'Other'}
                                        >
                                            <option value="">Select device type</option>
                                            {deviceTypes.map((dt, idx) => (
                                                <option key={idx} value={dt.value}>
                                                    {dt.label}
                                                </option>
                                            ))}
                                            <option value="Other">Other (specify)</option>
                                        </select>

                                        {(formData.deviceType === 'Other' || formData.assetType === 'Other') && (
                                            <input
                                                type="text"
                                                name="customDeviceType"
                                                value={formData.customDeviceType}
                                                onChange={handleChange}
                                                placeholder="Enter custom device type"
                                                className="form-input mt-2"
                                                required={formData.deviceType === 'Other' || formData.assetType === 'Other'}
                                            />
                                        )}
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="model">
                                            <Cpu size={16} /> Model
                                        </label>
                                        <select
                                            id="model"
                                            name="model"
                                            value={formData.model}
                                            onChange={handleChange}
                                            className="form-select"
                                            disabled={!formData.assetType || (formData.assetType !== 'Other' && !formData.deviceType)}
                                        >
                                            <option value="">Select model</option>
                                            {models.map((m, idx) => (
                                                <option key={idx} value={m.value}>
                                                    {m.label}
                                                </option>
                                            ))}
                                            <option value="Other">Other (specify)</option>
                                        </select>

                                        {(formData.model === 'Other' || formData.assetType === 'Other') && (
                                            <input
                                                type="text"
                                                name="customModel"
                                                value={formData.customModel}
                                                onChange={handleChange}
                                                placeholder="Enter model name"
                                                className="form-input mt-2"
                                                required={formData.model === 'Other' || formData.assetType === 'Other'}
                                            />
                                        )}
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="stockLocation">Internal Stock Location</label>
                                        <input
                                            type="text"
                                            id="stockLocation"
                                            name="stockLocation"
                                            value={formData.stockLocation}
                                            onChange={handleChange}
                                            placeholder="e.g., Room 101 - Rack B"
                                            className="form-input"
                                        />
                                        <span className="field-hint">Shelf, rack, or bin</span>
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="quantity">Quantity</label>
                                        <input
                                            type="number"
                                            id="quantity"
                                            name="quantity"
                                            value={formData.quantity}
                                            onChange={handleChange}
                                            placeholder="e.g., 10"
                                            className="form-input"
                                            min="1"
                                        />
                                        <span className="field-hint">Number of items</span>
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="unit">Unit</label>
                                        <input
                                            type="text"
                                            id="unit"
                                            name="unit"
                                            value={formData.unit}
                                            onChange={handleChange}
                                            placeholder="e.g., Nos, Mtrs"
                                            className="form-input"
                                        />
                                        <span className="field-hint">Unit of measurement</span>
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="remarks">Remarks</label>
                                        <textarea
                                            id="remarks"
                                            name="remarks"
                                            value={formData.remarks}
                                            onChange={handleChange}
                                            placeholder="Additional notes..."
                                            className="form-input"
                                            rows="1"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="form-actions">
                            <button
                                type="button"
                                className="btn btn-secondary btn-outline"
                                onClick={() => navigate('/stock')}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <div className="spinner-small"></div>
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <Plus size={16} />
                                        Add to Stock
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
