import { useState, useEffect } from 'react';
import {
    ArrowRightLeft, PackagePlus, Truck, CheckCircle2, AlertCircle,
    Clock, Filter, Building2, Box, Calendar, User, FileText,
    ChevronLeft, ChevronRight, RefreshCw, History
} from 'lucide-react';
import { stockApi, sitesApi } from '../../services/api';
import toast from 'react-hot-toast';
import './StockCommon.css';
import './MovementLogs.css';

const MovementLogs = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, pages: 0 });
    const [sites, setSites] = useState([]);
    const [typeCounts, setTypeCounts] = useState({});

    // Filters
    const [filters, setFilters] = useState({
        siteId: '',
        movementType: '',
        fromDate: '',
        toDate: ''
    });

    const movementTypes = [
        { value: 'Added', label: 'Stock Added', icon: PackagePlus, color: 'var(--success)' },
        { value: 'Transfer', label: 'Transfer', icon: ArrowRightLeft, color: 'var(--info)' },
        { value: 'RMATransfer', label: 'RMA Transfer', icon: Truck, color: 'var(--warning)' },
        { value: 'RepairedReturn', label: 'Repaired Return', icon: CheckCircle2, color: 'var(--accent-teal)' },
        { value: 'StatusChange', label: 'Status Change', icon: RefreshCw, color: 'var(--secondary)' },
        { value: 'Reserved', label: 'Reserved', icon: Clock, color: 'var(--warning)' },
        { value: 'Released', label: 'Released', icon: CheckCircle2, color: 'var(--success)' },
        { value: 'Disposed', label: 'Disposed', icon: AlertCircle, color: 'var(--danger)' }
    ];

    useEffect(() => {
        fetchSites();
    }, []);

    useEffect(() => {
        fetchLogs();
    }, [pagination.page, filters]);

    const fetchSites = async () => {
        try {
            const res = await sitesApi.getDropdown();
            setSites(res.data.data || []);
        } catch (error) {
            console.error('Failed to fetch sites:', error);
        }
    };

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const params = {
                page: pagination.page,
                limit: pagination.limit,
                ...Object.fromEntries(
                    Object.entries(filters).filter(([, v]) => v)
                )
            };
            const res = await stockApi.getMovementLogs(params);
            setLogs(res.data.data || []);
            setTypeCounts(res.data.typeCounts || {});
            setPagination(prev => ({
                ...prev,
                total: res.data.pagination?.total || 0,
                pages: res.data.pagination?.pages || 0
            }));
        } catch (error) {
            toast.error('Failed to fetch movement logs');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (date) => {
        if (!date) return '-';
        return new Date(date).toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getMovementIcon = (type) => {
        const movement = movementTypes.find(m => m.value === type);
        if (!movement) return <div className="movement-icon-box"><Box size={16} /></div>;
        const Icon = movement.icon;
        return (
            <div className="movement-icon-box" style={{ background: `${movement.color}15`, color: movement.color }}>
                <Icon size={16} />
            </div>
        );
    };

    const getMovementLabel = (type) => {
        const movement = movementTypes.find(m => m.value === type);
        return movement?.label || type;
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const resetFilters = () => {
        setFilters({ siteId: '', movementType: '', fromDate: '', toDate: '' });
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    return (
        <div className="stock-page animate-fade-in">
            <div className="stock-header">
                <div className="header-icon">
                    <History size={28} />
                </div>
                <div className="header-text">
                    <h1>Stock Movement Logs</h1>
                    <p>Complete audit trail of all stock movements and asset transitions</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="movement-stats-grid">
                {movementTypes.slice(0, 6).map(({ value, label, icon: Icon, color }) => (
                    <div key={value} className="stat-card-mini" style={{ borderLeftColor: color }}>
                        <div className="stat-icon-wrapper" style={{ background: `${color}15`, color }}>
                            <Icon size={22} />
                        </div>
                        <div className="stat-info">
                            <span className="stat-count">{typeCounts[value] || 0}</span>
                            <span className="stat-label">{label}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="stock-filters">
                <div className="filter-group">
                    <label><Building2 size={14} /> Site</label>
                    <select
                        value={filters.siteId}
                        onChange={(e) => handleFilterChange('siteId', e.target.value)}
                    >
                        <option value="">All Sites</option>
                        {sites.map(site => (
                            <option key={site._id} value={site._id}>
                                {site.siteName} {site.isHeadOffice && '(HO)'}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="filter-group">
                    <label><ArrowRightLeft size={14} /> Movement Type</label>
                    <select
                        value={filters.movementType}
                        onChange={(e) => handleFilterChange('movementType', e.target.value)}
                    >
                        <option value="">All Types</option>
                        {movementTypes.map(type => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                    </select>
                </div>

                <div className="filter-group">
                    <label><Calendar size={14} /> From Date</label>
                    <input
                        type="date"
                        value={filters.fromDate}
                        onChange={(e) => handleFilterChange('fromDate', e.target.value)}
                    />
                </div>

                <div className="filter-group">
                    <label><Calendar size={14} /> To Date</label>
                    <input
                        type="date"
                        value={filters.toDate}
                        onChange={(e) => handleFilterChange('toDate', e.target.value)}
                    />
                </div>

                <button className="btn-reset" onClick={resetFilters}>
                    <RefreshCw size={14} /> Reset
                </button>
            </div>

            {/* Logs Table */}
            <div className="stock-table-container">
                {loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Loading movement logs...</p>
                    </div>
                ) : logs.length === 0 ? (
                    <div className="empty-state">
                        <History size={48} />
                        <h3>No Movement Logs Found</h3>
                        <p>Stock movements will appear here once items are added or transferred.</p>
                    </div>
                ) : (
                    <table className="stock-table">
                        <thead>
                            <tr>
                                <th>Timestamp</th>
                                <th>Movement</th>
                                <th>Asset</th>
                                <th>From → To</th>
                                <th>Status Change</th>
                                <th>Reference</th>
                                <th>Performed By</th>
                                <th>Notes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map(log => (
                                <tr key={log._id}>
                                    <td>
                                        <div className="timestamp-cell">
                                            <Clock size={12} />
                                            {formatDate(log.createdAt)}
                                        </div>
                                    </td>
                                    <td>
                                        <span className="movement-badge">
                                            {getMovementIcon(log.movementType)}
                                            {getMovementLabel(log.movementType)}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="asset-info-cell">
                                            <strong>{log.assetSnapshot?.assetCode || log.assetId?.assetCode}</strong>
                                            <span className="asset-type">{log.assetSnapshot?.assetType || log.assetId?.assetType}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="location-flow">
                                            {log.fromSiteId ? (
                                                <span className={`site-pill ${log.fromSiteId.isHeadOffice ? 'ho-pill' : ''}`}>
                                                    <Building2 size={12} />
                                                    {log.fromSiteId.siteName}
                                                </span>
                                            ) : (
                                                <span className="new-badge">INITIAL STOCK</span>
                                            )}
                                            <div className="flow-connector">
                                                <div className="connector-line"></div>
                                                <ArrowRightLeft size={10} className="flow-arrow" />
                                            </div>
                                            {log.toSiteId ? (
                                                <span className={`site-pill ${log.toSiteId.isHeadOffice ? 'ho-pill' : ''}`}>
                                                    <Building2 size={12} />
                                                    {log.toSiteId.siteName}
                                                </span>
                                            ) : <span className="null-pill">-</span>}
                                        </div>
                                    </td>
                                    <td>
                                        {log.fromStatus || log.toStatus ? (
                                            <div className="status-flow">
                                                <span className={`status-badge ${log.fromStatus?.toLowerCase().replace(/\s/g, '-')}`}>
                                                    {log.fromStatus || '-'}
                                                </span>
                                                →
                                                <span className={`status-badge ${log.toStatus?.toLowerCase().replace(/\s/g, '-')}`}>
                                                    {log.toStatus || '-'}
                                                </span>
                                            </div>
                                        ) : '-'}
                                    </td>
                                    <td className="reference-cell">
                                        {log.rmaId && (
                                            <span className="ref-badge rma">
                                                <FileText size={12} />
                                                {log.rmaId.rmaNumber}
                                            </span>
                                        )}
                                        {log.ticketId && (
                                            <span className="ref-badge ticket">
                                                #{log.ticketId.ticketNumber}
                                            </span>
                                        )}
                                        {log.requisitionId && (
                                            <span className="ref-badge requisition">
                                                {log.requisitionId.requisitionNumber}
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        <span className="user-badge">
                                            <User size={14} />
                                            {log.performedBy?.fullName || 'System'}
                                        </span>
                                    </td>
                                    <td className="notes-cell">
                                        {log.notes ? (
                                            <span title={log.notes}>
                                                {log.notes.length > 40 ? log.notes.substring(0, 40) + '...' : log.notes}
                                            </span>
                                        ) : '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
                <div className="pagination">
                    <button
                        className="p-btn"
                        disabled={pagination.page === 1}
                        onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                        title="Previous Page"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div className="p-info">
                        Page <span>{pagination.page}</span> of <span>{pagination.pages}</span>
                    </div>
                    <button
                        className="p-btn"
                        disabled={pagination.page >= pagination.pages}
                        onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                        title="Next Page"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default MovementLogs;
