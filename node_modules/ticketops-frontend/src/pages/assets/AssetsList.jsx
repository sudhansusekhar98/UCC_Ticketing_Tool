import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import {
    Plus,
    Search,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    Monitor,
    Edit,
    Trash2,
    Camera,
    HardDrive,
    Network,
    Download,
    Upload,
    FileSpreadsheet,
    X,
    CheckCircle,
    AlertCircle,
    Eye,
    RotateCcw,
} from 'lucide-react';
import { assetsApi, sitesApi, lookupsApi } from '../../services/api';
import useAuthStore from '../../context/authStore';
import toast from 'react-hot-toast';
import '../sites/Sites.css';
import './AssetsBulk.css';

const getAssetIcon = (type) => {
    switch (type) {
        case 'Camera': return <Camera size={14} />;
        case 'NVR': return <HardDrive size={14} />;
        case 'Switch': return <Network size={14} />;
        default: return <Monitor size={14} />;
    }
};

export default function AssetsList() {
    const [assets, setAssets] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchValue, setDebouncedSearchValue] = useState('');
    const [siteFilter, setSiteFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [deviceFilter, setDeviceFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [sites, setSites] = useState([]);
    const [locations, setLocations] = useState([]);
    const [locationFilter, setLocationFilter] = useState('');
    const [assetTypes, setAssetTypes] = useState([]);
    const [deviceTypes, setDeviceTypes] = useState([]);
    const [assetStatuses, setAssetStatuses] = useState([]);
    const [page, setPage] = useState(1);
    const pageSize = 15;
    const [statusCounts, setStatusCounts] = useState({ online: 0, offline: 0, passive: 0 });
    const navigate = useNavigate();
    const { hasRole, hasRight, hasRightForAnySite, refreshUserRights } = useAuthStore();

    // Bulk import/export state
    const [showImportModal, setShowImportModal] = useState(false);
    const [importFile, setImportFile] = useState(null);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const [exporting, setExporting] = useState(false);
    const fileInputRef = useRef(null);

    // Permission flags
    const canCreate = hasRole(['Admin', 'Supervisor']) || hasRightForAnySite('MANAGE_ASSETS');
    const canBulkOps = hasRole(['Admin', 'Supervisor']) || hasRightForAnySite('MANAGE_ASSETS');
    const showActionColumn = hasRole(['Admin', 'Supervisor']) || hasRightForAnySite('MANAGE_ASSETS');

    useEffect(() => { refreshUserRights(); }, []);
    useEffect(() => { loadDropdowns(); }, []);

    // Search debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchValue(searchTerm);
            setPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Fetch assets when filters or page change
    useEffect(() => {
        fetchAssets();
    }, [page, debouncedSearchValue, siteFilter, locationFilter, typeFilter, deviceFilter, statusFilter]);

    // Reset dependent filters and load locations when site changes
    useEffect(() => {
        if (siteFilter) {
            loadLocations(siteFilter);
            loadAssetTypes(siteFilter, '');
        } else {
            setLocations([]);
            setAssetTypes([]);
            setDeviceTypes([]);
        }
        setLocationFilter('');
        setTypeFilter('');
        setDeviceFilter('');
    }, [siteFilter]);

    // Load asset types based on location selection
    useEffect(() => {
        if (siteFilter && locationFilter) {
            loadAssetTypes(siteFilter, locationFilter);
            setTypeFilter('');
            setDeviceFilter('');
        }
    }, [locationFilter]);

    // Load device types when asset type changes
    useEffect(() => {
        if (siteFilter && typeFilter) {
            loadDeviceTypes(siteFilter, locationFilter, typeFilter);
        } else {
            setDeviceTypes([]);
        }
        setDeviceFilter('');
    }, [typeFilter]);

    const loadDropdowns = async () => {
        try {
            const [sitesRes, statusesRes] = await Promise.all([
                sitesApi.getDropdown(),
                lookupsApi.getAssetStatuses(),
            ]);
            const siteData = sitesRes.data.data || sitesRes.data || [];
            setSites(siteData.map(s => ({
                value: s._id || s.value || s.siteId,
                label: s.siteName || s.label
            })));
            const statusData = statusesRes.data.data || statusesRes.data || [];
            setAssetStatuses(statusData);
        } catch (error) {
            console.error('Failed to load dropdowns', error);
        }
    };

    const loadLocations = async (siteId) => {
        if (!siteId) { setLocations([]); return; }
        try {
            const response = await assetsApi.getLocationNames(siteId);
            if (response.data?.success) setLocations(response.data.data || []);
        } catch (error) {
            console.error('Failed to load locations', error);
            setLocations([]);
        }
    };

    const loadAssetTypes = async (siteId, locationName) => {
        if (!siteId) { setAssetTypes([]); return; }
        try {
            const response = await assetsApi.getAssetTypesForSite(siteId, locationName);
            if (response.data?.success) setAssetTypes(response.data.data || []);
        } catch (error) {
            console.error('Failed to load asset types', error);
            setAssetTypes([]);
        }
    };

    const loadDeviceTypes = async (siteId, locationName, assetType) => {
        if (!siteId || !assetType) { setDeviceTypes([]); return; }
        try {
            const response = await assetsApi.getDeviceTypesForSite(siteId, locationName, assetType);
            if (response.data?.success) setDeviceTypes(response.data.data || []);
        } catch (error) {
            console.error('Failed to load device types', error);
            setDeviceTypes([]);
        }
    };

    const fetchAssets = async () => {
        setLoading(true);
        try {
            const response = await assetsApi.getAll({
                page,
                limit: pageSize,
                search: debouncedSearchValue || undefined,
                siteId: siteFilter || undefined,
                locationName: locationFilter || undefined,
                assetType: typeFilter || undefined,
                deviceType: deviceFilter || undefined,
                status: statusFilter || undefined,
            });
            const assetData = response.data.data || response.data.items || response.data || [];
            const total = response.data.pagination?.total || response.data.totalCount || assetData.length;
            const counts = response.data.statusCounts || { online: 0, offline: 0, passive: 0 };

            const mappedAssets = assetData.map(a => ({
                ...a,
                assetId: a._id || a.assetId,
                locationName: a.locationName || a.locationDescription,
                macAddress: a.mac || a.macAddress
            }));

            setAssets(mappedAssets);
            setTotalCount(total);
            setStatusCounts(counts);
        } catch (error) {
            toast.error('Failed to load assets');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id, name) => {
        if (!confirm(`Are you sure you want to delete asset "${name}"?`)) return;
        try {
            await assetsApi.delete(id);
            toast.success('Asset deleted successfully');
            fetchAssets();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete asset');
        }
    };

    const handleDownloadTemplate = async () => {
        try {
            const response = await assetsApi.downloadTemplate();
            const blob = new Blob([response.data], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'assets_import_template.xlsx';
            document.body.appendChild(a);
            a.click();
            setTimeout(() => { window.URL.revokeObjectURL(url); document.body.removeChild(a); }, 100);
            toast.success('Template downloaded successfully');
        } catch (error) {
            console.error('Download error:', error);
            toast.error('Failed to download template');
        }
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            const response = await assetsApi.exportAssets({
                search: searchTerm || undefined,
                siteId: siteFilter || undefined,
                assetType: typeFilter || undefined,
                status: statusFilter || undefined,
            });
            const blob = new Blob([response.data], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `assets_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => { window.URL.revokeObjectURL(url); document.body.removeChild(a); }, 100);
            toast.success('Assets exported successfully');
        } catch (error) {
            console.error('Export error:', error);
            toast.error('Failed to export assets');
        } finally {
            setExporting(false);
        }
    };

    const handleImportClick = () => {
        setShowImportModal(true);
        setImportFile(null);
        setImportResult(null);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const isValidExtension = file.name.endsWith('.csv') || file.name.endsWith('.xlsx');
            if (!isValidExtension) { toast.error('Please select a CSV or XLSX file'); return; }
            setImportFile(file);
            setImportResult(null);
        }
    };

    const handleImport = async () => {
        if (!importFile) { toast.error('Please select a file to import'); return; }
        setImporting(true);
        setImportResult(null);
        try {
            const response = await assetsApi.bulkImport(importFile);
            setImportResult(response.data);
            if (response.data.success) {
                toast.success(response.data.message);
                fetchAssets();
                loadDropdowns();
            } else {
                toast.error(response.data.message);
            }
        } catch (error) {
            const errorData = error.response?.data;
            if (errorData?.data) setImportResult(errorData);
            const backendError = errorData?.error;
            const message = errorData?.message || 'Import failed';
            toast.error(backendError ? `${message}: ${backendError}` : message);
        } finally {
            setImporting(false);
        }
    };

    const closeImportModal = () => {
        setShowImportModal(false);
        setImportFile(null);
        setImportResult(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };



    const getStatusClass = (status) => {
        switch (status) {
            case 'Operational': return 'operational';
            case 'Degraded': return 'degraded';
            case 'Offline': return 'offline';
            case 'Maintenance': return 'maintenance';
            case 'Online': return 'operational';
            case 'Passive Device': return 'passive';
            default: return '';
        }
    };

    const totalPages = Math.ceil(totalCount / pageSize);

    return (
        <div className="page-container animate-fade-in assets-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Assets &nbsp;</h1>
                    <p className="page-subtitle">{totalCount} total assets</p>
                </div>

                {/* Status Counts */}
                <div className="status-stats-bar">
                    <div
                        className={`status-stat-card online ${statusFilter === 'Online' ? 'active' : ''}`}
                        onClick={() => { setStatusFilter(statusFilter === 'Online' ? '' : 'Online'); setPage(1); }}
                        title="Filter by Online"
                    >
                        <div className="stat-icon"><CheckCircle size={18} /></div>
                        <span className="stat-value">{statusCounts.online}</span>
                        <span className="stat-label">Online</span>
                    </div>
                    <div
                        className={`status-stat-card offline ${statusFilter === 'Offline' ? 'active' : ''}`}
                        onClick={() => { setStatusFilter(statusFilter === 'Offline' ? '' : 'Offline'); setPage(1); }}
                        title="Filter by Offline"
                    >
                        <div className="stat-icon"><AlertCircle size={18} /></div>
                        <span className="stat-value">{statusCounts.offline}</span>
                        <span className="stat-label">Offline</span>
                    </div>
                    <div
                        className={`status-stat-card passive ${statusFilter === 'Passive' ? 'active' : ''}`}
                        onClick={() => { setStatusFilter(statusFilter === 'Passive' ? '' : 'Passive'); setPage(1); }}
                        title="Filter by Passive"
                    >
                        <div className="stat-icon"><Monitor size={18} /></div>
                        <span className="stat-value">{statusCounts.passive}</span>
                        <span className="stat-label">Passive</span>
                    </div>
                </div>

                <div className="header-actions">
                    <Link to="/assets/rma-records" className="btn btn-warning" title="View RMA Records">
                        <RotateCcw size={18} />
                        RMA Records
                    </Link>
                    {canBulkOps && (
                        <>
                            <button
                                className="btn btn-secondary"
                                onClick={handleDownloadTemplate}
                                title="Download Import Template"
                            >
                                <FileSpreadsheet size={18} />
                                Template
                            </button>
                            <button
                                className="btn btn-secondary"
                                onClick={handleImportClick}
                                title="Bulk Import Assets"
                            >
                                <Upload size={18} />
                                Import
                            </button>
                        </>
                    )}

                    <button
                        className="btn btn-secondary"
                        onClick={handleExport}
                        disabled={exporting}
                        title="Export Assets to CSV"
                    >
                        <Download size={18} />
                        {exporting ? 'Exporting...' : 'Export'}
                    </button>
                    {canCreate && (
                        <Link to="/assets/new" className="btn btn-primary">
                            <Plus size={18} />
                            Add Asset
                        </Link>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="filter-bar glass-card compact">
                <div className="filter-bar-content">
                    <div className="search-box small">
                        <Search size={16} />
                        <input
                            type="text"
                            placeholder="Search assets..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="filters-inline">
                        <select
                            className="filter-select"
                            value={siteFilter}
                            onChange={(e) => { setSiteFilter(e.target.value); setPage(1); }}
                        >
                            <option value="">All Sites</option>
                            {sites.map(site => (
                                <option key={site.value} value={site.value}>{site.label}</option>
                            ))}
                        </select>
                        {siteFilter && locations.length > 0 && (
                            <select
                                className="filter-select"
                                value={locationFilter}
                                onChange={(e) => { setLocationFilter(e.target.value); setPage(1); }}
                                title="Filter by location"
                            >
                                <option value="">All Locations</option>
                                {locations.map(loc => (
                                    <option key={loc.value} value={loc.value}>{loc.label}</option>
                                ))}
                            </select>
                        )}
                        {siteFilter && assetTypes.length > 0 && (
                            <select
                                className="filter-select"
                                value={typeFilter}
                                onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
                            >
                                <option value="">All Types</option>
                                {assetTypes.map(type => (
                                    <option key={type.value} value={type.value}>{type.label}</option>
                                ))}
                            </select>
                        )}
                        {siteFilter && typeFilter && deviceTypes.length > 0 && (
                            <select
                                className="filter-select"
                                value={deviceFilter}
                                onChange={(e) => { setDeviceFilter(e.target.value); setPage(1); }}
                            >
                                <option value="">All Devices</option>
                                {deviceTypes.map(device => (
                                    <option key={device.value} value={device.value}>{device.label}</option>
                                ))}
                            </select>
                        )}
                        <select
                            className="filter-select"
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                        >
                            <option value="">All Status</option>
                            {assetStatuses.map(status => (
                                <option key={status.value} value={status.value}>{status.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="filter-actions-inline">
                        <button className="btn btn-secondary icon-btn-small" onClick={fetchAssets} title="Refresh">
                            <RefreshCw size={14} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="table-wrapper glass-card">
                {loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                    </div>
                ) : assets.length === 0 ? (
                    <div className="empty-state">
                        <Monitor size={48} />
                        <p>No assets found</p>
                    </div>
                ) : (
                    <>
                        <table className="data-table compact assets-table">
                            <thead>
                                <tr>
                                    <th className="col-sl">Sl No.</th>
                                    <th className="col-code">Asset Code</th>
                                    <th className="col-ip">IP Address</th>
                                    <th className="col-status">Status</th>
                                    <th className="col-site">Site Name</th>
                                    <th className="col-location">Location Name</th>
                                    <th className="col-type">Asset Type</th>
                                    <th className="col-device">Device</th>
                                    <th className="col-mac">Mac Address</th>
                                    <th className="col-serial">SL Number</th>
                                    {showActionColumn && <th className="col-actions">Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {assets.map((asset, index) => (
                                    <tr key={asset.assetId}>
                                        <td className="col-sl">{(page - 1) * pageSize + index + 1}</td>
                                        <td title={asset.assetCode || ''}>
                                            <Link to={`/assets/${asset.assetId}`} className="text-primary font-mono hover:underline">
                                                {asset.assetCode || '—'}
                                            </Link>
                                        </td>
                                        <td title={asset.ipAddress || asset.managementIP || ''}>
                                            <span className="font-mono">
                                                {asset.ipAddress || asset.managementIP || '—'}
                                            </span>
                                        </td>
                                        <td className="col-status">
                                            <span className={`status-badge ${getStatusClass(asset.status)}`}>
                                                {asset.status || 'Operational'}
                                            </span>
                                        </td>
                                        <td title={asset.siteId?.siteName || ''}>{asset.siteId?.siteName || '—'}</td>
                                        <td title={asset.locationName || asset.locationDescription || ''}>{asset.locationName || asset.locationDescription || '—'}</td>
                                        <td title={asset.assetType || ''}>{asset.assetType || '—'}</td>
                                        <td title={asset.deviceType || ''}>{asset.deviceType || '—'}</td>
                                        <td title={asset.mac || asset.macAddress || ''}>{asset.mac || asset.macAddress || '—'}</td>
                                        <td title={asset.serialNumber || ''}>
                                            <span className="font-mono">{asset.serialNumber || '—'}</span>
                                        </td>
                                        {showActionColumn && (
                                            <td className="col-actions">
                                                <div className="action-buttons">
                                                    <Link to={`/assets/${asset.assetId}`} className="btn btn-icon btn-ghost" title="View Details">
                                                        <Eye size={14} />
                                                    </Link>
                                                    {(hasRole(['Admin', 'Supervisor']) || hasRight('MANAGE_ASSETS', asset.siteId?._id || asset.siteId)) && (
                                                        <>
                                                            <Link to={`/assets/${asset.assetId}/edit`} className="btn btn-icon btn-ghost" title="Edit">
                                                                <Edit size={14} />
                                                            </Link>
                                                            <button
                                                                className="btn btn-icon btn-ghost text-danger"
                                                                onClick={() => handleDelete(asset.assetId, asset.assetCode)}
                                                                title="Delete"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {totalPages > 1 && (
                            <div className="pagination">
                                <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => setPage(p => p - 1)}
                                    disabled={page === 1}
                                >
                                    <ChevronLeft size={18} />
                                    Previous
                                </button>
                                <span className="page-info">Page {page} of {totalPages}</span>
                                <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => setPage(p => p + 1)}
                                    disabled={page === totalPages}
                                >
                                    Next
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Import Modal */}
            {showImportModal && createPortal(
                <div className="modal-overlay" onClick={closeImportModal}>
                    <div className="modal glass-card w-full max-w-xl" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>
                                <Upload size={20} />
                                Bulk Import Assets
                            </h3>
                            <button className="btn btn-ghost btn-icon" onClick={closeImportModal}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="modal-body">
                            <div className="import-instructions">
                                <h4>Instructions:</h4>
                                <ol>
                                    <li>Download the import template using the "Template" button</li>
                                    <li>Fill in the asset data in the CSV or Excel file</li>
                                    <li>Fields marked with * are required</li>
                                    <li>Upload the completed file below</li>
                                </ol>
                            </div>

                            <div className="file-upload-area">
                                <input
                                    type="file"
                                    accept=".csv,.xlsx"
                                    onChange={handleFileChange}
                                    ref={fileInputRef}
                                    id="csv-file-input"
                                    className="file-input"
                                />
                                <label htmlFor="csv-file-input" className="file-upload-label">
                                    <FileSpreadsheet size={32} />
                                    <span>{importFile ? importFile.name : 'Click to select file'}</span>
                                    <small>.csv and .xlsx files are supported</small>
                                </label>
                            </div>

                            {importResult && (
                                <div className={`import-result ${importResult.success ? 'success' : 'error'}`}>
                                    <div className="result-header">
                                        {importResult.success ? (
                                            <CheckCircle size={20} className="success-icon" />
                                        ) : (
                                            <AlertCircle size={20} className="error-icon" />
                                        )}
                                        <span>{importResult.message}</span>
                                    </div>

                                    {importResult.data && (
                                        <div className="result-stats">
                                            <span className="stat success">
                                                <CheckCircle size={14} />
                                                {importResult.data.created || 0} created
                                            </span>
                                            <span className="stat info">
                                                <RefreshCw size={14} />
                                                {importResult.data.updated || 0} updated
                                            </span>
                                            <span className="stat error">
                                                <AlertCircle size={14} />
                                                {importResult.data.failed || 0} failed
                                            </span>
                                        </div>
                                    )}

                                    {importResult.data?.errors?.length > 0 && (
                                        <div className="error-list">
                                            <strong>Errors:</strong>
                                            <ul>
                                                {importResult.data.errors.slice(0, 10).map((err, idx) => (
                                                    <li key={idx}>{err}</li>
                                                ))}
                                                {importResult.data.errors.length > 10 && (
                                                    <li className="more-errors">
                                                        ...and {importResult.data.errors.length - 10} more errors
                                                    </li>
                                                )}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={closeImportModal}>Cancel</button>
                            <button
                                className="btn btn-primary"
                                onClick={handleImport}
                                disabled={!importFile || importing}
                            >
                                {importing ? (
                                    <>
                                        <RefreshCw size={16} className="spin" />
                                        Importing...
                                    </>
                                ) : (
                                    <>
                                        <Upload size={16} />
                                        Import Assets
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
