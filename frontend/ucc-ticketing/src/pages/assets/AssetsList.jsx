import { useState, useEffect, useRef } from 'react';
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
    EyeOff,
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
    const [statusFilter, setStatusFilter] = useState('');
    const [sites, setSites] = useState([]);
    const [assetTypes, setAssetTypes] = useState([]);
    const [assetStatuses, setAssetStatuses] = useState([]);
    const [page, setPage] = useState(1);
    const pageSize = 15;
    const navigate = useNavigate();
    const { hasRole } = useAuthStore();

    // Bulk import/export state
    const [showImportModal, setShowImportModal] = useState(false);
    const [importFile, setImportFile] = useState(null);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const [exporting, setExporting] = useState(false);
    const fileInputRef = useRef(null);
    
    // Password visibility state
    const [visiblePasswords, setVisiblePasswords] = useState({});

    const canCreate = hasRole(['Admin', 'Supervisor']);
    const canEdit = hasRole(['Admin', 'Supervisor']);
    const canDelete = hasRole(['Admin']);
    const canBulkOps = hasRole(['Admin', 'Supervisor']);

    useEffect(() => {
        loadDropdowns();
    }, []);

    // Handle search debounce
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
    }, [page, debouncedSearchValue, siteFilter, typeFilter, statusFilter]);

    const loadDropdowns = async () => {
        try {
            const [sitesRes, typesRes, statusesRes] = await Promise.all([
                sitesApi.getDropdown(),
                lookupsApi.getAssetTypes(),
                lookupsApi.getAssetStatuses(),
            ]);
            // Handle Express response format
            const siteData = sitesRes.data.data || sitesRes.data || [];
            setSites(siteData.map(s => ({
                value: s._id || s.value || s.siteId,
                label: s.siteName || s.label
            })));
            
            const typeData = typesRes.data.data || typesRes.data || [];
            setAssetTypes(typeData.map ? typeData.map(t => ({
                value: t.value || t,
                label: t.label || t
            })) : []);
            
            const statusData = statusesRes.data.data || statusesRes.data || [];
            setAssetStatuses(statusData);
        } catch (error) {
            console.error('Failed to load dropdowns', error);
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
                assetType: typeFilter || undefined,
                status: statusFilter || undefined,
                isActive: true,
            });
            // Handle both Express and .NET response formats
            const assetData = response.data.data || response.data.items || response.data || [];
            const total = response.data.pagination?.total || response.data.totalCount || assetData.length;
            
            // Map to expected format
            const mappedAssets = assetData.map(a => ({
                ...a,
                assetId: a._id || a.assetId,
                locationName: a.locationDescription || a.siteId?.siteName || a.locationName,
                macAddress: a.mac || a.macAddress
            }));
            
            setAssets(mappedAssets);
            setTotalCount(total);
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

    // Bulk operations handlers
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
            
            // Clean up
            setTimeout(() => {
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            }, 100);
            
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
            
            // Clean up
            setTimeout(() => {
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            }, 100);

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
            if (!isValidExtension) {
                toast.error('Please select a CSV or XLSX file');
                return;
            }
            setImportFile(file);
            setImportResult(null);
        }
    };

    const handleImport = async () => {
        if (!importFile) {
            toast.error('Please select a file to import');
            return;
        }

        setImporting(true);
        setImportResult(null);

        try {
            const response = await assetsApi.bulkImport(importFile);
            setImportResult(response.data);
            if (response.data.success) {
                toast.success(response.data.message);
                fetchAssets();
            } else {
                toast.error(response.data.message);
            }
        } catch (error) {
            const errorData = error.response?.data;
            if (errorData?.data) {
                setImportResult(errorData);
            }
            toast.error(errorData?.message || 'Import failed');
        } finally {
            setImporting(false);
        }
    };

    const closeImportModal = () => {
        setShowImportModal(false);
        setImportFile(null);
        setImportResult(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const getStatusClass = (status) => {
        switch (status) {
            case 'Operational': return 'operational';
            case 'Degraded': return 'degraded';
            case 'Offline': return 'offline';
            case 'Maintenance': return 'maintenance';
            default: return '';
        }
    };

    const renderCriticality = (level) => {
        return (
            <div className="criticality">
                {[1, 2, 3].map(i => (
                    <span key={i} className={`criticality-dot ${i <= level ? 'filled' : ''}`}></span>
                ))}
            </div>
        );
    };

    const totalPages = Math.ceil(totalCount / pageSize);

    return (
        <div className="page-container animate-fade-in assets-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Assets</h1>
                    <p className="page-subtitle">
                        {totalCount} total assets
                    </p>
                </div>
                <div className="header-actions">
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
                            <button
                                className="btn btn-secondary"
                                onClick={handleExport}
                                disabled={exporting}
                                title="Export Assets to CSV"
                            >
                                <Download size={18} />
                                {exporting ? 'Exporting...' : 'Export'}
                            </button>
                        </>
                    )}
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
                <div className="search-filter-row">
                    <div className="search-box large">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Search assets..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        className="form-select compact-select"
                        value={siteFilter}
                        onChange={(e) => { setSiteFilter(e.target.value); setPage(1); }}
                    >
                        <option value="">All Sites</option>
                        {sites.map(site => (
                            <option key={site.value} value={site.value}>{site.label}</option>
                        ))}
                    </select>
                    <select
                        className="form-select compact-select"
                        value={typeFilter}
                        onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
                    >
                        <option value="">All Types</option>
                        {assetTypes.map(type => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                    </select>
                    <select
                        className="form-select compact-select"
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                    >
                        <option value="">All Status</option>
                        {assetStatuses.map(status => (
                            <option key={status.value} value={status.value}>{status.label}</option>
                        ))}
                    </select>
                    <button className="btn btn-secondary btn-icon" onClick={fetchAssets}>
                        <RefreshCw size={18} />
                    </button>
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
                                    <th className="col-ip">IP Address</th>
                                    <th className="col-location">Location</th>
                                    <th className="col-make">Make</th>
                                    <th className="col-model">Model</th>
                                    <th className="col-mac">MAC</th>
                                    <th className="col-serial">Serial No</th>
                                    <th className="col-device">Device</th>
                                    <th className="col-used">Used For</th>
                                    <th className="col-user">User</th>
                                    <th className="col-pass">Pass</th>
                                    <th className="col-remark">Remark</th>
                                    <th className="col-actions">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {assets.map((asset, index) => (
                                    <tr key={asset.assetId}>
                                        <td className="col-sl">{(page - 1) * pageSize + index + 1}</td>
                                        <td title={asset.ipAddress || asset.managementIP || ''}>{asset.ipAddress || asset.managementIP || '—'}</td>
                                        <td title={asset.locationName || ''}>{asset.locationName || '—'}</td>
                                        <td title={asset.make || ''}>{asset.make || '—'}</td>
                                        <td title={asset.model || ''}>{asset.model || '—'}</td>
                                        <td title={asset.mac || asset.macAddress || ''}>{asset.mac || asset.macAddress || '—'}</td>
                                        <td title={asset.serialNumber || ''}>{asset.serialNumber || '—'}</td>
                                        <td title={asset.deviceType || asset.assetType || ''}>{asset.deviceType || asset.assetType || '—'}</td>
                                        <td title={asset.usedFor || ''}>{asset.usedFor || '—'}</td>
                                        <td title={asset.userName || ''}>{asset.userName || '—'}</td>
                                        <td className="password-cell">
                                            {asset.password ? (
                                                <div className="password-reveal">
                                                    <span className="password-text">
                                                        {visiblePasswords[asset._id || asset.assetId] ? asset.password : '•••••'}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        className="btn btn-icon btn-ghost password-toggle"
                                                        onClick={() => setVisiblePasswords(prev => ({
                                                            ...prev,
                                                            [asset._id || asset.assetId]: !prev[asset._id || asset.assetId]
                                                        }))}
                                                        title={visiblePasswords[asset._id || asset.assetId] ? 'Hide password' : 'Show password'}
                                                    >
                                                        {visiblePasswords[asset._id || asset.assetId] ? <EyeOff size={14} /> : <Eye size={14} />}
                                                    </button>
                                                </div>
                                            ) : '—'}
                                        </td>
                                        <td title={asset.remark || ''}>{asset.remark || '—'}</td>
                                        <td className="col-actions">
                                            <div className="action-buttons">
                                                {canEdit && (
                                                    <Link to={`/assets/${asset.assetId}/edit`} className="btn btn-icon btn-ghost" title="Edit">
                                                        <Edit size={14} />
                                                    </Link>
                                                )}
                                                {canDelete && (
                                                    <button
                                                        className="btn btn-icon btn-ghost text-danger"
                                                        onClick={() => handleDelete(asset.assetId, asset.assetCode)}
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
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
                                <span className="page-info">
                                    Page {page} of {totalPages}
                                </span>
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
            {showImportModal && (
                <div className="modal-overlay">
                    <div className="import-modal glass-card">
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
                            <button className="btn btn-secondary" onClick={closeImportModal}>
                                Cancel
                            </button>
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
                </div>
            )}
        </div>
    );
}
