import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowRightLeft, ArrowLeft, Package
} from 'lucide-react';
import { stockApi, sitesApi } from '../../services/api';
import toast from 'react-hot-toast';
import './Stock.css';

export default function StockTransferForm() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [sites, setSites] = useState([]);
    const [availableAssets, setAvailableAssets] = useState([]);
    const [fetchingAssets, setFetchingAssets] = useState(false);

    const [formData, setFormData] = useState({
        sourceSiteId: '',
        destinationSiteId: '',
        assetIds: [],
        notes: ''
    });

    useEffect(() => {
        fetchSites();
    }, []);

    useEffect(() => {
        if (formData.sourceSiteId) {
            fetchAvailableAssets();
        } else {
            setAvailableAssets([]);
        }
    }, [formData.sourceSiteId]);

    const fetchSites = async () => {
        try {
            const response = await sitesApi.getAll({ limit: 100 });
            setSites(response.data.data || response.data);
        } catch (error) {
            console.error('Failed to fetch sites:', error);
        }
    };

    const fetchAvailableAssets = async () => {
        try {
            setFetchingAssets(true);
            const response = await stockApi.getInventory({ siteId: formData.sourceSiteId });
            const flattened = response.data.data.reduce((acc, group) => {
                return [...acc, ...group.assets.map(a => ({ ...a, assetType: group.assetType }))];
            }, []);
            setAvailableAssets(flattened);
        } catch (error) {
            console.error('Failed to fetch assets:', error);
            toast.error('Failed to load available stock at source');
        } finally {
            setFetchingAssets(false);
        }
    };

    const handleSiteChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
            assetIds: name === 'sourceSiteId' ? [] : prev.assetIds
        }));
    };

    const toggleAsset = (assetId) => {
        setFormData(prev => {
            const exists = prev.assetIds.includes(assetId);
            if (exists) {
                return { ...prev, assetIds: prev.assetIds.filter(id => id !== assetId) };
            } else {
                return { ...prev, assetIds: [...prev.assetIds, assetId] };
            }
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.sourceSiteId || !formData.destinationSiteId || formData.assetIds.length === 0) {
            toast.error('Please select source, destination, and at least one item');
            return;
        }

        if (formData.sourceSiteId === formData.destinationSiteId) {
            toast.error('Source and destination cannot be the same');
            return;
        }

        try {
            setLoading(true);
            await stockApi.initiateTransfer(formData);
            toast.success('Stock transfer initiated');
            navigate('/stock/transfers');
        } catch (error) {
            console.error('Failed to initiate transfer:', error);
            toast.error(error.response?.data?.message || 'Initiation failed');
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
                            <ArrowRightLeft size={20} />
                        </div>
                        <div>
                            <h1 className="page-title">New Stock Transfer</h1>
                            <p className="page-subtitle">Move spare assets between locations</p>
                        </div>
                    </div>

                    <div className="header-actions">
                        <Link to="/stock/transfers" className="back-link" style={{ margin: 0 }}>
                            <ArrowLeft size={18} />
                            Back to Transfers
                        </Link>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="stock-form">
                    <div className='asset-form-container'>
                        <div className="form-card">
                            <div className="section-header">
                                <div className="section-icon">
                                    <ArrowRightLeft size={16} />
                                </div>
                                <div>
                                    <h2>Transfer Details</h2>
                                    <p className="section-description">Select source and destination sites</p>
                                </div>
                            </div>

                            <div className="form-section">
                                <div className="section-subtitle">Site Selection</div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Source Site (From) <span className="required">*</span></label>
                                        <select
                                            name="sourceSiteId"
                                            value={formData.sourceSiteId}
                                            onChange={handleSiteChange}
                                            className="form-select"
                                            required
                                        >
                                            <option value="">Select Origin</option>
                                            {sites.map(s => (
                                                <option key={s._id} value={s._id}>{s.siteName} {s.isHeadOffice ? '(HO)' : ''}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Destination Site (To) <span className="required">*</span></label>
                                        <select
                                            name="destinationSiteId"
                                            value={formData.destinationSiteId}
                                            onChange={handleSiteChange}
                                            className="form-select"
                                            required
                                        >
                                            <option value="">Select Target</option>
                                            {sites.map(s => (
                                                <option key={s._id} value={s._id}>{s.siteName} {s.isHeadOffice ? '(HO)' : ''}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="form-section">
                                <div className="section-subtitle">
                                    Select Items ({formData.assetIds.length} Selected)
                                    {fetchingAssets && <span className="loading-text"> Refreshing...</span>}
                                </div>
                                <div className="asset-selection-list">
                                    {availableAssets.length > 0 ? (
                                        availableAssets.map(asset => (
                                            <div
                                                key={asset._id}
                                                className={`asset-selection-item ${formData.assetIds.includes(asset._id) ? 'selected' : ''}`}
                                                onClick={() => toggleAsset(asset._id)}
                                            >
                                                <div className="asset-icon">
                                                    <Package size={16} />
                                                </div>
                                                <div className="asset-info">
                                                    <span className="asset-code">{asset.assetCode}</span>
                                                    <span className="asset-meta">{asset.assetType} • {asset.stockLocation || 'Shelf'}</span>
                                                </div>
                                                <div className="asset-check">
                                                    {formData.assetIds.includes(asset._id) && <span className="check-mark">✓</span>}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="empty-state-inline">
                                            <Package size={18} />
                                            <span>{formData.sourceSiteId ? 'No spare assets at this source' : 'Select a source site first'}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="form-section">
                                <div className="section-subtitle">Notes (Optional)</div>
                                <div className="form-group full-width">
                                    <textarea
                                        name="notes"
                                        value={formData.notes}
                                        onChange={handleSiteChange}
                                        className="form-input"
                                        placeholder="Purpose of transfer, carrier details, etc..."
                                        rows="2"
                                        style={{ resize: 'none' }}
                                    ></textarea>
                                </div>
                            </div>

                            <div className="form-actions">
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-outline"
                                    onClick={() => navigate('/stock/transfers')}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={loading || formData.assetIds.length === 0}
                                >
                                    {loading ? 'Initiating...' : `Initiate Transfer (${formData.assetIds.length})`}
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
