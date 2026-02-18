import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    Package, Search, Warehouse, ArrowLeft, MapPin, ChevronDown, ChevronUp, AlertCircle, Eye, Edit, X
} from 'lucide-react';
import { stockApi, sitesApi, lookupsApi } from '../../services/api';
import toast from 'react-hot-toast';
import './StockCommon.css';
import './InventoryList.css';

export default function InventoryList() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [inventory, setInventory] = useState([]);
    const [sites, setSites] = useState([]);
    const [assetTypes, setAssetTypes] = useState([]);
    const [expandedGroups, setExpandedGroups] = useState({});
    const [viewAsset, setViewAsset] = useState(null);

    const [filters, setFilters] = useState({
        siteId: '',
        assetType: '',
        search: ''
    });

    useEffect(() => {
        fetchData();
        fetchSites();
        fetchAssetTypes();
    }, []);



    const fetchData = async (currentFilters = filters) => {
        try {
            setLoading(true);
            setError(null);
            console.log('Fetching inventory with filters:', currentFilters);

            const response = await stockApi.getInventory(currentFilters);
            const data = response.data?.data || response.data || [];

            if (!Array.isArray(data)) {
                console.error('Expected array for inventory but got:', data);
                setInventory([]);
                return;
            }

            setInventory(data);

            // Auto-expand all groups initially
            const expanded = {};
            data.forEach((group, idx) => {
                const groupKey = group.siteId && group.assetType
                    ? `${group.siteId}-${group.assetType}`
                    : `group-${idx}`;
                expanded[groupKey] = true;
            });
            setExpandedGroups(expanded);
            console.log('Inventory loaded successfully:', data.length, 'groups');
        } catch (err) {
            console.error('Failed to fetch inventory:', err);
            setError(err.response?.data?.message || err.message || 'Failed to load inventory');
            toast.error('Failed to load inventory');
            setInventory([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchSites = async () => {
        try {
            const response = await sitesApi.getAll({ limit: 100 });
            setSites(response.data?.data || response.data || []);
        } catch (error) {
            console.error('Failed to fetch sites:', error);
        }
    };

    const fetchAssetTypes = async () => {
        try {
            const response = await lookupsApi.getAssetTypes();
            setAssetTypes(response.data?.data || response.data || []);
        } catch (error) {
            console.error('Failed to fetch asset types:', error);
        }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        const newFilters = { ...filters, [name]: value };
        setFilters(newFilters);
        fetchData(newFilters);
    };

    const toggleGroup = (groupKey) => {
        setExpandedGroups(prev => ({
            ...prev,
            [groupKey]: !prev[groupKey]
        }));
    };



    // Safe calculation of total assets
    const totalAssets = Array.isArray(inventory)
        ? inventory.reduce((acc, group) => acc + (Number(group.count) || 0), 0)
        : 0;

    return (
        <div className="stock-container">
            <div className="add-stock-page animate-fade-in" style={{ maxWidth: '1400px' }}>
                <div className="page-header">
                    <div className="flex items-center gap-3">
                        <div className="title-icon">
                            <Package size={20} />
                        </div>
                        <div>
                            <h1 className="page-title">Inventory Catalog</h1>
                            <p className="page-subtitle">
                                {totalAssets} spare assets across {inventory.length} categories
                            </p>
                        </div>
                    </div>

                    <div className="header-actions">
                        <Link to="/stock" className="btn btn-secondary">
                            <ArrowLeft size={18} />
                            Back to Dashboard
                        </Link>
                    </div>
                </div>

                {/* Filters */}
                <div className="inventory-filters">
                    <div className="filter-group">
                        <label>Site / Location</label>
                        <select
                            name="siteId"
                            value={filters.siteId}
                            onChange={handleFilterChange}
                            className="form-select"
                        >
                            <option value="">All Sites</option>
                            {Array.isArray(sites) && sites.map(site => (
                                <option key={site._id} value={site._id}>
                                    {site.siteName} {site.isHeadOffice ? '(HO)' : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="filter-group">
                        <label>Asset Type</label>
                        <select
                            name="assetType"
                            value={filters.assetType}
                            onChange={handleFilterChange}
                            className="form-select"
                        >
                            <option value="">All Types</option>
                            {Array.isArray(assetTypes) && assetTypes.map((type, idx) => {
                                const val = typeof type === 'object' ? (type.value || type._id) : type;
                                const lab = typeof type === 'object' ? (type.label || type.name || val) : type;
                                return <option key={idx} value={val}>{lab}</option>;
                            })}

                        </select>
                    </div>
                    <div className="filter-group filter-search">
                        <label>Search</label>
                        <div className="search-input-wrapper">
                            <Search size={14} className="search-icon" />
                            <input
                                type="text"
                                name="search"
                                placeholder="MAC, Serial, Model..."
                                value={filters.search}
                                onChange={handleFilterChange}
                                className="form-input"
                            />
                        </div>
                    </div>
                </div>

                {error ? (
                    <div className="empty-state-card">
                        <AlertCircle size={32} className="icon-danger" style={{ color: 'var(--error-500)' }} />
                        <p style={{ color: 'var(--error-500)', fontWeight: 600 }}>{error}</p>
                        <button className="btn btn-secondary mt-2" onClick={() => fetchData()}>
                            Retry Loading
                        </button>
                    </div>
                ) : loading ? (
                    <div className="empty-state-card">
                        <div className="loading-spinner"></div>
                        <p>Loading inventory data...</p>
                    </div>
                ) : inventory.length > 0 ? (
                    <div className="inventory-table-wrapper">
                        <table className="inventory-table">
                            <thead>
                                <tr>
                                    <th className="col-type">Asset Type</th>
                                    <th className="col-device">Device Type</th>
                                    <th className="col-make">Make</th>
                                    <th className="col-model">Model</th>
                                    <th className="col-mac">MAC Address</th>
                                    <th className="col-serial">Serial Number</th>
                                    <th className="col-location">Shelf/Bin</th>
                                    <th className="col-qty">Qty</th>
                                    <th className="col-unit">Unit</th>
                                    <th className="col-remarks">Remarks</th>
                                    <th className="col-actions">Actions</th>
                                </tr>
                            </thead>

                            {/* Process and Map Sites */}
                            {Object.values(inventory.reduce((acc, current) => {
                                if (!acc[current.siteId]) {
                                    acc[current.siteId] = {
                                        siteId: current.siteId,
                                        siteName: current.siteName,
                                        isHeadOffice: current.isHeadOffice,
                                        assets: [],
                                        totalCount: 0
                                    };
                                }
                                acc[current.siteId].assets.push(...current.assets.map(a => ({
                                    ...a,
                                    groupAssetType: current.assetType
                                })));
                                acc[current.siteId].totalCount += current.count;
                                return acc;
                            }, {})).map((siteGroup, siteIdx) => {
                                const isExpanded = expandedGroups[siteGroup.siteId] !== false;

                                return (
                                    <tbody key={siteGroup.siteId || siteIdx}>
                                        {/* Site Separator Row */}
                                        <tr
                                            className="site-separator-row"
                                            onClick={() => setExpandedGroups(prev => ({ ...prev, [siteGroup.siteId]: !isExpanded }))}
                                        >
                                            <td colSpan="11">
                                                <div className="separator-content">
                                                    <div className="separator-left">
                                                        {isExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                                                        {siteGroup.isHeadOffice ? (
                                                            <Warehouse size={16} className="icon-success" />
                                                        ) : (
                                                            <MapPin size={16} className="icon-primary" />
                                                        )}
                                                        <span className="site-name">
                                                            {siteGroup.siteName}
                                                            {siteGroup.isHeadOffice && <span className="ho-badge">Head Office</span>}
                                                        </span>
                                                    </div>
                                                    <div className="separator-right">
                                                        <span className="item-count">{siteGroup.totalCount} items</span>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>

                                        {/* Asset Rows for this site */}
                                        {isExpanded && siteGroup.assets.map((asset, aIdx) => (
                                            <tr key={asset._id || `asset-${siteGroup.siteId}-${aIdx}`} className="inventory-data-row">
                                                <td className="col-type">
                                                    <span className="type-badge">{asset.assetType || asset.groupAssetType}</span>
                                                </td>
                                                <td className="col-device">
                                                    {asset.deviceType || '—'}
                                                </td>
                                                <td className="col-make">
                                                    {asset.make || '—'}
                                                </td>
                                                <td className="col-model">
                                                    {asset.model || '—'}
                                                </td>
                                                <td className="col-mac">
                                                    <code className="mac-code" title={asset.mac}>
                                                        {asset.mac || '—'}
                                                    </code>
                                                </td>
                                                <td className="col-serial">
                                                    <span className="serial-text" title={asset.serialNumber}>
                                                        {asset.serialNumber || '—'}
                                                    </span>
                                                </td>
                                                <td className="col-location">
                                                    <span className="location-text">{asset.stockLocation || '—'}</span>
                                                </td>
                                                <td className="col-qty">
                                                    {asset.quantity || '1'}
                                                </td>
                                                <td className="col-unit">
                                                    {asset.unit || 'Nos'}
                                                </td>
                                                <td className="col-remarks">
                                                    <span className="remarks-text" title={asset.remarks || asset.remark}>
                                                        {asset.remarks || asset.remark || '—'}
                                                    </span>
                                                </td>
                                                <td className="col-actions">
                                                    <div className="action-buttons-direct">
                                                        <button
                                                            className="action-btn-direct view"
                                                            onClick={() => setViewAsset(asset)}
                                                            title="View Details"
                                                        >
                                                            <Eye size={16} />
                                                        </button>
                                                        <button
                                                            className="action-btn-direct edit"
                                                            onClick={() => navigate(`/assets/${asset._id}/edit`)}
                                                            title="Edit Asset"
                                                        >
                                                            <Edit size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                );
                            })}
                        </table>
                    </div>
                ) : (




                    <div className="empty-state-card">
                        <Package size={32} className="empty-icon" />
                        <p>No matching inventory items found</p>
                    </div>
                )}
            </div>

            {/* View Asset Modal - Rendered at root level for full-screen overlay */}
            {viewAsset && (
                <div className="modal-overlay" onClick={() => setViewAsset(null)}>
                    <div className="modal-content asset-view-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-title">
                                <Eye size={20} />
                                <h2>Asset Details</h2>
                            </div>
                            <button className="modal-close" onClick={() => setViewAsset(null)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="asset-detail-grid">
                                <div className="detail-item">
                                    <label>Asset Type</label>
                                    <div className="detail-value">
                                        <span className="type-badge">{viewAsset.assetType || viewAsset.groupAssetType}</span>
                                    </div>
                                </div>
                                <div className="detail-item">
                                    <label>Device Type</label>
                                    <div className="detail-value">{viewAsset.deviceType || '—'}</div>
                                </div>
                                <div className="detail-item">
                                    <label>Make</label>
                                    <div className="detail-value">{viewAsset.make || '—'}</div>
                                </div>
                                <div className="detail-item">
                                    <label>Model</label>
                                    <div className="detail-value">{viewAsset.model || '—'}</div>
                                </div>
                                <div className="detail-item full-width">
                                    <label>MAC Address</label>
                                    <div className="detail-value">
                                        <code className="mac-code">{viewAsset.mac || '—'}</code>
                                    </div>
                                </div>
                                <div className="detail-item full-width">
                                    <label>Serial Number</label>
                                    <div className="detail-value">{viewAsset.serialNumber || '—'}</div>
                                </div>
                                <div className="detail-item">
                                    <label>Storage Location</label>
                                    <div className="detail-value">{viewAsset.stockLocation || '—'}</div>
                                </div>
                                <div className="detail-item">
                                    <label>Quantity</label>
                                    <div className="detail-value">{viewAsset.quantity || '1'}</div>
                                </div>
                                <div className="detail-item">
                                    <label>Unit</label>
                                    <div className="detail-value">{viewAsset.unit || 'Nos'}</div>
                                </div>
                                <div className="detail-item full-width">
                                    <label>Remarks</label>
                                    <div className="detail-value">{viewAsset.remarks || viewAsset.remark || '—'}</div>
                                </div>
                                <div className="detail-item">
                                    <label>Status</label>
                                    <div className="detail-value">
                                        <span className="status-badge success">In Stock</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setViewAsset(null)}>
                                Close
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={() => {
                                    setViewAsset(null);
                                    navigate(`/assets/${viewAsset._id}/edit`);
                                }}
                            >
                                <Edit size={16} />
                                Edit Asset
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
