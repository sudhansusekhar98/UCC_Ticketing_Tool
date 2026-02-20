import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    Package, Search, Warehouse, ArrowLeft, MapPin, ChevronDown, ChevronUp,
    AlertCircle, Eye, Edit, X, Download, CheckSquare, Square, Ruler, Trash2, Save
} from 'lucide-react';
import { stockApi, sitesApi } from '../../services/api';
import toast from 'react-hot-toast';
import useAuthStore from '../../context/authStore';
import './StockCommon.css';
import './InventoryList.css';

export default function InventoryList() {
    const navigate = useNavigate();
    const { hasRole } = useAuthStore();
    const canManageStock = hasRole(['Admin', 'Supervisor']);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [inventory, setInventory] = useState([]);
    const [sites, setSites] = useState([]);
    const [assetTypes, setAssetTypes] = useState([]);
    const [expandedGroups, setExpandedGroups] = useState({});
    const [viewAsset, setViewAsset] = useState(null);
    const [selectedAssets, setSelectedAssets] = useState(new Set());
    const [exporting, setExporting] = useState(false);

    // Edit modal state
    const [editAsset, setEditAsset] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [saving, setSaving] = useState(false);

    // Delete confirm state
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const [filters, setFilters] = useState({
        siteId: '',
        assetType: '',
        search: ''
    });

    useEffect(() => {
        fetchData();
        fetchSites();
        fetchStockAssetTypes();
    }, []);

    const fetchData = async (currentFilters = filters) => {
        try {
            setLoading(true);
            setError(null);

            const response = await stockApi.getInventory(currentFilters);
            const data = response.data?.data || response.data || [];

            if (!Array.isArray(data)) {
                setInventory([]);
                return;
            }

            setInventory(data);
            setSelectedAssets(new Set()); // Clear selections on data refresh

            // Auto-expand all groups initially
            const expanded = {};
            data.forEach((group, idx) => {
                const groupKey = group.siteId && group.assetType
                    ? `${group.siteId}-${group.assetType}`
                    : `group-${idx}`;
                expanded[groupKey] = true;
            });
            setExpandedGroups(expanded);
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

    // Fetch asset types only from existing Spare (stock) assets
    const fetchStockAssetTypes = async () => {
        try {
            const response = await stockApi.getStockAssetTypes();
            setAssetTypes(response.data?.data || response.data || []);
        } catch (error) {
            console.error('Failed to fetch stock asset types:', error);
        }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        const newFilters = { ...filters, [name]: value };
        setFilters(newFilters);
        fetchData(newFilters);
    };

    const toggleGroup = (siteId) => {
        setExpandedGroups(prev => ({
            ...prev,
            [siteId]: !prev[siteId]
        }));
    };

    // Collect all visible asset IDs in current inventory view
    const getAllVisibleAssetIds = () => {
        const ids = [];
        inventory.forEach(group => {
            (group.assets || []).forEach(asset => {
                if (asset._id) ids.push(asset._id);
            });
        });
        return ids;
    };

    const isAllSelected = () => {
        const all = getAllVisibleAssetIds();
        return all.length > 0 && all.every(id => selectedAssets.has(id));
    };

    const toggleSelectAll = () => {
        const all = getAllVisibleAssetIds();
        if (isAllSelected()) {
            setSelectedAssets(new Set());
        } else {
            setSelectedAssets(new Set(all));
        }
    };

    const toggleSelectAsset = (assetId) => {
        setSelectedAssets(prev => {
            const next = new Set(prev);
            if (next.has(assetId)) {
                next.delete(assetId);
            } else {
                next.add(assetId);
            }
            return next;
        });
    };

    const handleExportSelected = async (format = 'xlsx') => {
        if (selectedAssets.size === 0) {
            toast.error('Please select at least one asset to export.');
            return;
        }
        try {
            setExporting(true);
            const ids = Array.from(selectedAssets);
            const response = await stockApi.exportSelectedAssets(ids, format);
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `selected_assets.${format}`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            toast.success(`Exported ${selectedAssets.size} asset(s) successfully`);
        } catch (err) {
            console.error('Export failed:', err);
            toast.error('Export failed. Please try again.');
        } finally {
            setExporting(false);
        }
    };

    // ---- Edit handlers ----
    const openEdit = (asset) => {
        setEditAsset(asset);
        setEditForm({
            assetType: asset.assetType || asset.groupAssetType || '',
            deviceType: asset.deviceType || '',
            make: asset.make || '',
            model: asset.model || '',
            mac: asset.mac || '',
            serialNumber: asset.serialNumber || '',
            stockLocation: asset.stockLocation || '',
            quantity: asset.quantity ?? 1,
            unit: asset.unit || 'Nos',
            remarks: asset.remarks || asset.remark || '',
        });
    };

    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setEditForm(prev => ({ ...prev, [name]: value }));
    };

    const submitEdit = async (e) => {
        e.preventDefault();
        if (!editAsset?._id) return;
        try {
            setSaving(true);
            await stockApi.updateStock(editAsset._id, editForm);
            toast.success('Stock item updated successfully');
            setEditAsset(null);
            fetchData();   // refresh the list
        } catch (err) {
            console.error('Update failed:', err);
            toast.error(err.response?.data?.message || 'Failed to update stock item');
        } finally {
            setSaving(false);
        }
    };

    // ---- Delete handlers ----
    const handleDeleteConfirm = async () => {
        if (!deleteTarget?._id) return;
        try {
            setDeleting(true);
            await stockApi.deleteStock(deleteTarget._id);
            toast.success('Stock item deleted');
            setDeleteTarget(null);
            setSelectedAssets(prev => { const n = new Set(prev); n.delete(deleteTarget._id); return n; });
            fetchData();
        } catch (err) {
            console.error('Delete failed:', err);
            toast.error(err.response?.data?.message || 'Failed to delete stock item');
        } finally {
            setDeleting(false);
        }
    };

    // Meter-unit assets are excluded from totalCount; their lengths are accumulated separately.
    const siteGroups = Object.values(
        inventory.reduce((acc, current) => {
            if (!acc[current.siteId]) {
                acc[current.siteId] = {
                    siteId: current.siteId,
                    siteName: current.siteName,
                    isHeadOffice: current.isHeadOffice,
                    assets: [],
                    totalCount: 0,       // only non-meter items
                    totalMeters: 0       // sum of all meter-unit lengths for this site
                };
            }
            acc[current.siteId].assets.push(
                ...current.assets.map(a => ({ ...a, groupAssetType: current.assetType }))
            );
            acc[current.siteId].totalCount += current.count;  // count already excludes meters (backend)
            acc[current.siteId].totalMeters += current.meterTotalLength || 0;
            return acc;
        }, {})
    );

    // Total item count — excludes all meter-unit assets (matching backend)
    const totalAssets = Array.isArray(inventory)
        ? inventory.reduce((acc, group) => acc + (Number(group.count) || 0), 0)
        : 0;

    // Total distinct meter asset rows across the entire inventory
    const totalMeterRows = Array.isArray(inventory)
        ? inventory.reduce((acc, group) => {
            return acc + (group.assets || []).filter(a => a.isMeterUnit).length;
        }, 0)
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
                                {totalAssets} spare asset{totalAssets !== 1 ? 's' : ''}
                                {totalMeterRows > 0 && <> + {totalMeterRows} cable/wire item{totalMeterRows !== 1 ? 's' : ''}</>}
                                {' '}across {inventory.length} categories
                            </p>
                        </div>
                    </div>

                    <div className="header-actions">
                        {selectedAssets.size > 0 && (
                            <div className="export-controls" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                    {selectedAssets.size} selected
                                </span>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => handleExportSelected('xlsx')}
                                    disabled={exporting}
                                    title="Export selected as Excel"
                                >
                                    <Download size={16} />
                                    {exporting ? 'Exporting...' : 'Export Excel'}
                                </button>
                                <button
                                    className="btn btn-secondary btn-ghost"
                                    onClick={() => handleExportSelected('csv')}
                                    disabled={exporting}
                                    title="Export selected as CSV"
                                >
                                    <Download size={16} />
                                    CSV
                                </button>
                                <button
                                    className="btn btn-secondary btn-ghost"
                                    onClick={() => setSelectedAssets(new Set())}
                                    title="Clear selection"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        )}
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
                                    <th style={{ width: '40px' }}>
                                        <button
                                            onClick={toggleSelectAll}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
                                            title={isAllSelected() ? 'Deselect all' : 'Select all'}
                                        >
                                            {isAllSelected()
                                                ? <CheckSquare size={16} style={{ color: 'var(--primary-500)' }} />
                                                : <Square size={16} />
                                            }
                                        </button>
                                    </th>
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

                            {siteGroups.map((siteGroup, siteIdx) => {
                                const isExpanded = expandedGroups[siteGroup.siteId] !== false;

                                return (
                                    <tbody key={siteGroup.siteId || siteIdx}>
                                        {/* Site Separator Row */}
                                        <tr
                                            className="site-separator-row"
                                            onClick={() => toggleGroup(siteGroup.siteId)}
                                        >
                                            <td colSpan="12">
                                                <div className="separator-content">
                                                    <div className="separator-left">
                                                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}                                                        {siteGroup.isHeadOffice ? (
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
                                                        {siteGroup.totalCount > 0 && (
                                                            <span className="item-count">{siteGroup.totalCount} item{siteGroup.totalCount !== 1 ? 's' : ''}</span>
                                                        )}
                                                        {siteGroup.totalMeters > 0 && (
                                                            <span className="item-count meter-count">{siteGroup.totalMeters} m wire/cable</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>

                                        {/* Asset Rows for this site */}
                                        {isExpanded && siteGroup.assets.map((asset, aIdx) => (
                                            <tr
                                                key={asset._id || `asset-${siteGroup.siteId}-${aIdx}`}
                                                className={`inventory-data-row${selectedAssets.has(asset._id) ? ' selected-row' : ''}${asset.isMeterUnit ? ' meter-row' : ''}`}
                                            >
                                                <td>
                                                    <button
                                                        onClick={() => toggleSelectAsset(asset._id)}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                                        title={selectedAssets.has(asset._id) ? 'Deselect' : 'Select'}
                                                    >
                                                        {selectedAssets.has(asset._id)
                                                            ? <CheckSquare size={16} style={{ color: 'var(--primary-500)' }} />
                                                            : <Square size={16} style={{ color: 'var(--text-tertiary)' }} />
                                                        }
                                                    </button>
                                                </td>
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
                                                    {asset.isMeterUnit ? (
                                                        <span className="meter-qty-badge" title={`${asset.quantity} meters of wire/cable — not counted in stock total`}>
                                                            {asset.quantity || '—'}
                                                        </span>
                                                    ) : (
                                                        asset.quantity || '1'
                                                    )}
                                                </td>
                                                <td className="col-unit">
                                                    {asset.isMeterUnit ? (
                                                        <span className="meter-unit-badge">m</span>
                                                    ) : (
                                                        asset.unit || 'Nos'
                                                    )}
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
                                                        {canManageStock && (
                                                            <>
                                                                <button
                                                                    className="action-btn-direct edit"
                                                                    onClick={() => openEdit(asset)}
                                                                    title="Edit Stock Item"
                                                                >
                                                                    <Edit size={16} />
                                                                </button>
                                                                <button
                                                                    className="action-btn-direct delete"
                                                                    onClick={() => setDeleteTarget(asset)}
                                                                    title="Delete Stock Item"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </>
                                                        )}
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

            {/* View Asset Modal */}
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
                                    <div className="detail-value">
                                        {viewAsset.isMeterUnit ? (
                                            <span className="meter-qty-badge">
                                                <Ruler size={12} />
                                                {viewAsset.quantity || '—'} m
                                            </span>
                                        ) : (
                                            viewAsset.quantity || '1'
                                        )}
                                    </div>
                                </div>
                                <div className="detail-item">
                                    <label>Unit</label>
                                    <div className="detail-value">
                                        {viewAsset.isMeterUnit ? (
                                            <><span className="meter-unit-badge">Meter</span>
                                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '6px' }}>⚠ Not included in stock count</span></>
                                        ) : (
                                            viewAsset.unit || 'Nos'
                                        )}
                                    </div>
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
                            {canManageStock && (
                                <button
                                    className="btn btn-primary"
                                    onClick={() => {
                                        openEdit(viewAsset);
                                        setViewAsset(null);
                                    }}
                                >
                                    <Edit size={16} />
                                    Edit Stock
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ===== Edit Stock Modal ===== */}
            {editAsset && (
                <div className="modal-overlay" onClick={() => !saving && setEditAsset(null)}>
                    <div className="modal-content asset-view-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                        <div className="modal-header">
                            <div className="modal-title">
                                <Edit size={20} />
                                <h2>Edit Stock Item</h2>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400, marginLeft: '4px' }}>
                                    — {editAsset.assetType || editAsset.groupAssetType}
                                </span>
                            </div>
                            <button className="modal-close" onClick={() => !saving && setEditAsset(null)} disabled={saving}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={submitEdit}>
                            <div className="modal-body">
                                <div className="asset-detail-grid">
                                    {/* Asset Type — free text */}
                                    <div className="detail-item">
                                        <label htmlFor="edit-assetType">Asset Type</label>
                                        <input
                                            id="edit-assetType"
                                            name="assetType"
                                            type="text"
                                            className="form-input"
                                            value={editForm.assetType}
                                            onChange={handleEditChange}
                                            required
                                            placeholder="e.g. Camera, Switch"
                                        />
                                    </div>
                                    {/* Device Type — free text */}
                                    <div className="detail-item">
                                        <label htmlFor="edit-deviceType">Device Type</label>
                                        <input
                                            id="edit-deviceType"
                                            name="deviceType"
                                            type="text"
                                            className="form-input"
                                            value={editForm.deviceType}
                                            onChange={handleEditChange}
                                            placeholder="e.g. IP Camera, PoE Switch"
                                        />
                                    </div>
                                    {/* Make */}
                                    <div className="detail-item">
                                        <label htmlFor="edit-make">Make</label>
                                        <input
                                            id="edit-make"
                                            name="make"
                                            type="text"
                                            className="form-input"
                                            value={editForm.make}
                                            onChange={handleEditChange}
                                            placeholder="e.g. Hikvision"
                                        />
                                    </div>
                                    {/* Model */}
                                    <div className="detail-item">
                                        <label htmlFor="edit-model">Model</label>
                                        <input
                                            id="edit-model"
                                            name="model"
                                            type="text"
                                            className="form-input"
                                            value={editForm.model}
                                            onChange={handleEditChange}
                                            placeholder="e.g. DS-2CD2143G2"
                                        />
                                    </div>
                                    {/* MAC Address */}
                                    <div className="detail-item full-width">
                                        <label htmlFor="edit-mac">MAC Address</label>
                                        <input
                                            id="edit-mac"
                                            name="mac"
                                            type="text"
                                            className="form-input"
                                            value={editForm.mac}
                                            onChange={handleEditChange}
                                            placeholder="XX:XX:XX:XX:XX:XX"
                                        />
                                    </div>
                                    {/* Serial Number */}
                                    <div className="detail-item full-width">
                                        <label htmlFor="edit-serialNumber">Serial Number</label>
                                        <input
                                            id="edit-serialNumber"
                                            name="serialNumber"
                                            type="text"
                                            className="form-input"
                                            value={editForm.serialNumber}
                                            onChange={handleEditChange}
                                            placeholder="e.g. SN-00123"
                                        />
                                    </div>
                                    {/* Shelf / Bin location */}
                                    <div className="detail-item full-width">
                                        <label htmlFor="edit-stockLocation">Shelf / Bin Location</label>
                                        <input
                                            id="edit-stockLocation"
                                            name="stockLocation"
                                            type="text"
                                            className="form-input"
                                            value={editForm.stockLocation}
                                            onChange={handleEditChange}
                                            placeholder="e.g. Rack-A / Shelf-2"
                                        />
                                    </div>
                                    {/* Quantity */}
                                    <div className="detail-item">
                                        <label htmlFor="edit-quantity">Quantity</label>
                                        <input
                                            id="edit-quantity"
                                            name="quantity"
                                            type="number"
                                            min="0"
                                            step="any"
                                            className="form-input"
                                            value={editForm.quantity}
                                            onChange={handleEditChange}
                                        />
                                    </div>
                                    {/* Unit */}
                                    <div className="detail-item">
                                        <label htmlFor="edit-unit">Unit</label>
                                        <select
                                            id="edit-unit"
                                            name="unit"
                                            className="form-select"
                                            value={editForm.unit}
                                            onChange={handleEditChange}
                                        >
                                            <option value="Nos">Nos</option>
                                            <option value="Meter">Meter</option>
                                            <option value="Box">Box</option>
                                            <option value="Set">Set</option>
                                            <option value="Pair">Pair</option>
                                            <option value="Roll">Roll</option>
                                        </select>
                                    </div>
                                    {/* Remarks */}
                                    <div className="detail-item full-width">
                                        <label htmlFor="edit-remarks">Remarks</label>
                                        <textarea
                                            id="edit-remarks"
                                            name="remarks"
                                            className="form-input"
                                            rows={2}
                                            value={editForm.remarks}
                                            onChange={handleEditChange}
                                            placeholder="Optional notes..."
                                            style={{ resize: 'vertical', minHeight: '60px' }}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setEditAsset(null)} disabled={saving}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    <Save size={16} />
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ===== Delete Confirmation Modal ===== */}
            {deleteTarget && (
                <div className="modal-overlay" onClick={() => !deleting && setDeleteTarget(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
                        <div className="modal-header">
                            <div className="modal-title">
                                <Trash2 size={20} style={{ color: 'var(--error-500)' }} />
                                <h2>Delete Stock Item?</h2>
                            </div>
                            <button className="modal-close" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                Are you sure you want to permanently delete this stock item?
                            </p>
                            <div style={{ marginTop: '12px', padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--error-500)' }}>
                                <strong style={{ color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                                    {deleteTarget.assetType || deleteTarget.groupAssetType}
                                    {deleteTarget.deviceType ? ` — ${deleteTarget.deviceType}` : ''}
                                </strong>
                                {deleteTarget.serialNumber && (
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>S/N: {deleteTarget.serialNumber}</div>
                                )}
                                {deleteTarget.mac && (
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>MAC: {deleteTarget.mac}</div>
                                )}
                            </div>
                            <p style={{ marginTop: '12px', fontSize: '0.8125rem', color: 'var(--error-600)', fontWeight: 500 }}>
                                ⚠ This action cannot be undone.
                            </p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                                Cancel
                            </button>
                            <button
                                className="btn btn-danger"
                                onClick={handleDeleteConfirm}
                                disabled={deleting}
                                style={{ background: 'var(--error-600)', color: '#fff', border: 'none' }}
                            >
                                <Trash2 size={16} />
                                {deleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
