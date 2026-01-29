import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit, History, Calendar, MapPin, Network, HardDrive, Info, Server, Database, RotateCcw, ArrowRight, User, Ticket, Search, XCircle, Copy, X, Clock } from 'lucide-react';
import { assetsApi, rmaApi, stockApi } from '../../services/api';
import useAuthStore from '../../context/authStore';
import toast from 'react-hot-toast';
import '../sites/Sites.css';
import './AssetView.css';

export default function AssetView() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { hasRole } = useAuthStore();

    const [asset, setAsset] = useState(null);
    const [loading, setLoading] = useState(true);
    const [rmaHistory, setRmaHistory] = useState([]);
    const [replacementHistory, setReplacementHistory] = useState([]);
    const [showHistory, setShowHistory] = useState(false);
    const [historySearch, setHistorySearch] = useState('');

    useEffect(() => {
        if (id) {
            loadAsset();
            loadReplacementHistory();
        }
    }, [id]);

    const loadAsset = async () => {
        setLoading(true);
        try {
            const response = await assetsApi.getById(id);
            setAsset(response.data.data || response.data);
        } catch (error) {
            toast.error('Failed to load asset');
            navigate('/assets');
        } finally {
            setLoading(false);
        }
    };

    const loadReplacementHistory = async () => {
        try {
            const response = await stockApi.getReplacementHistory(id);
            setReplacementHistory(response.data.data || []);
        } catch (error) {
            console.error('Failed to load replacement history', error);
            setReplacementHistory([]);
        }
    };

    const getStatusBadgeClass = (status) => {
        const statusMap = {
            'Operational': 'badge-success',
            'Degraded': 'badge-warning',
            'Offline': 'badge-danger',
            'Maintenance': 'badge-info'
        };
        return statusMap[status] || 'badge-secondary';
    };

    const getCriticalityBadge = (level) => {
        const criticalityMap = {
            1: { label: 'Low', class: 'badge-success' },
            2: { label: 'Medium', class: 'badge-warning' },
            3: { label: 'High', class: 'badge-danger' }
        };
        const crit = criticalityMap[level] || criticalityMap[2];
        return <span className={`badge ${crit.class}`}>{crit.label}</span>;
    };

    if (loading) {
        return (
            <div className="loading-state">
                <div className="spinner"></div>
            </div>
        );
    }

    if (!asset) {
        return (
            <div className="page-container">
                <div className="text-center py-12">
                    <h2>Asset not found</h2>
                    <Link to="/assets" className="btn btn-primary mt-4">Back to Assets</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container form-view asset-view-page">
            <Link to="/assets" className="back-link">
                <ArrowLeft size={18} />
                Back to Assets
            </Link>

            <div className="page-header">
                <div>
                    <h1 className="page-title">{asset.assetCode}</h1>
                    <p className="page-subtitle">{asset.assetType} - {asset.deviceType || 'N/A'}</p>
                </div>
                <div className="flex gap-2">
                    {replacementHistory.length > 0 && (
                        <button
                            className="btn btn-history"
                            onClick={() => setShowHistory(true)}
                        >
                            <History size={18} />
                            Replacement History ({replacementHistory.length})
                        </button>
                    )}
                    {(hasRole(['Admin', 'Supervisor']) || hasRole('Dispatcher')) && (
                        <Link to={`/assets/${id}/edit`} className="btn btn-primary">
                            <Edit size={18} />
                            Edit Asset
                        </Link>
                    )}
                </div>
            </div>

            <div className="asset-view-grid">
                {/* Main Information Card */}
                <div className="main-info-col">
                    <div className="info-card">
                        <h2 className="section-title">
                            <Info size={20} />
                            Asset Information
                        </h2>

                        <div className="asset-info-grid">
                            <div className="asset-info-item">
                                <label className="asset-info-label">Asset Code</label>
                                <p className="asset-info-value">{asset.assetCode}</p>
                            </div>

                            <div className="asset-info-item">
                                <label className="asset-info-label">Asset Type</label>
                                <p className="asset-info-value">{asset.assetType}</p>
                            </div>

                            <div className="asset-info-item">
                                <label className="asset-info-label">Device Type</label>
                                <p className="asset-info-value">{asset.deviceType || '—'}</p>
                            </div>

                            <div className="asset-info-item">
                                <label className="asset-info-label">Status</label>
                                <div>
                                    <span className={`badge ${getStatusBadgeClass(asset.status)}`}>
                                        {asset.status}
                                    </span>
                                </div>
                            </div>

                            <div className="asset-info-item">
                                <label className="asset-info-label">Criticality</label>
                                <div>{getCriticalityBadge(asset.criticality)}</div>
                            </div>

                            <div className="asset-info-item">
                                <label className="asset-info-label">Make</label>
                                <p className="asset-info-value">{asset.make || '—'}</p>
                            </div>

                            <div className="asset-info-item">
                                <label className="asset-info-label">Model</label>
                                <p className="asset-info-value">{asset.model || '—'}</p>
                            </div>

                            <div className="asset-info-item">
                                <label className="asset-info-label">Serial Number</label>
                                <p className="asset-info-value font-mono">{asset.serialNumber || '—'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Network Information */}
                    <div className="info-card">
                        <h2 className="section-title">
                            <Network size={20} />
                            Network Information
                        </h2>

                        <div className="asset-info-grid">
                            <div className="asset-info-item">
                                <label className="asset-info-label">IP Address</label>
                                <p className="asset-info-value font-mono">{asset.ipAddress || '—'}</p>
                            </div>

                            <div className="asset-info-item">
                                <label className="asset-info-label">MAC Address</label>
                                <p className="asset-info-value font-mono">{asset.mac || '—'}</p>
                            </div>

                            <div className="asset-info-item">
                                <label className="asset-info-label">VMS Ref ID</label>
                                <p className="asset-info-value">{asset.vmsReferenceId || '—'}</p>
                            </div>

                            <div className="asset-info-item">
                                <label className="asset-info-label">NMS Ref ID</label>
                                <p className="asset-info-value">{asset.nmsReferenceId || '—'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Location Information */}
                    <div className="info-card">
                        <h2 className="section-title">
                            <MapPin size={20} />
                            Location Information
                        </h2>

                        <div className="location-details">
                            <div className="asset-info-item">
                                <label className="asset-info-label">Site</label>
                                <p className="asset-info-value">{asset.siteId?.siteName || '—'}</p>
                            </div>

                            <div className="asset-info-grid">
                                <div className="asset-info-item">
                                    <label className="asset-info-label">Location Name</label>
                                    <p className="asset-info-value">{asset.locationName || '—'}</p>
                                </div>

                                <div className="asset-info-item">
                                    <label className="asset-info-label">Description</label>
                                    <p className="asset-info-value">{asset.locationDescription || '—'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Credentials / Others */}
                    {(asset.userName || asset.remark) && (
                        <div className="info-card">
                            <h2 className="section-title">
                                <Server size={20} />
                                Additional Details
                            </h2>

                            <div className="asset-info-grid">
                                {asset.userName && (
                                    <div className="asset-info-item">
                                        <label className="asset-info-label">Device Username</label>
                                        <p className="asset-info-value font-mono">{asset.userName}</p>
                                    </div>
                                )}

                                {asset.remark && (
                                    <div className="asset-info-item">
                                        <label className="asset-info-label">Remarks</label>
                                        <p className="asset-info-value">{asset.remark}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="sidebar-col">
                    <div className="info-card sidebar-card">
                        <h2 className="section-title">
                            <Calendar size={20} />
                            Lifecycle
                        </h2>

                        <div className="space-y-1">
                            <div className="summary-item">
                                <span className="asset-info-label">Installed</span>
                                <span className="asset-info-value">
                                    {asset.installationDate ? new Date(asset.installationDate).toLocaleDateString() : '—'}
                                </span>
                            </div>

                            <div className="summary-item">
                                <span className="asset-info-label">Warranty Ends</span>
                                <span className="asset-info-value text-warning">
                                    {asset.warrantyEndDate ? new Date(asset.warrantyEndDate).toLocaleDateString() : '—'}
                                </span>
                            </div>

                            <div className="summary-item">
                                <span className="asset-info-label">Last Managed</span>
                                <span className="asset-info-value">
                                    {new Date(asset.updatedAt).toLocaleDateString()}
                                </span>
                            </div>
                        </div>

                        {replacementHistory.length > 0 && (
                            <div className="mt-6 pt-6 border-t border-border">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="font-bold">Lifecycle History</span>
                                    <span className="badge badge-primary">{replacementHistory.length} Changs</span>
                                </div>
                                <button
                                    className="btn btn-outline-primary w-full btn-sm"
                                    onClick={() => setShowHistory(true)}
                                >
                                    <History size={14} />
                                    View History
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="info-card">
                        <h2 className="section-title">Connectivity</h2>
                        <div className="flex items-center gap-3">
                            <div className={`w-4 h-4 rounded-full ${asset.status === 'Operational' ? 'bg-success' : 'bg-danger'} shadow-sm`}></div>
                            <span className="font-bold">{asset.status}</span>
                        </div>
                        <p className="text-xs text-muted mt-2">
                            Current operational state as per last health check.
                        </p>
                    </div>
                </div>
            </div>


            {showHistory && createPortal(
                <div className="modal-overlay" onClick={() => setShowHistory(false)}>
                    <div className="modal w-full max-w-[1000px] rounded-[16px] shadow-lg overflow-hidden"
                        style={{ background: '#f5f5f5' }}
                        onClick={(e) => e.stopPropagation()}>


                        <div className="modal-header" style={{
                            background: '#ffffff',
                            color: '#1e293b',
                            padding: '16px 24px',
                            borderBottom: 'none',
                            borderRadius: '16px 16px 0 0',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
                        }}>
                            <h3 className="font-bold truncate" style={{ fontSize: '18px', margin: 0, whiteSpace: 'nowrap', letterSpacing: '0.01em' }}>Asset Replacement History</h3>
                            <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => setShowHistory(false)}
                                style={{
                                    color: '#64748b',
                                    background: 'transparent',
                                    borderRadius: '8px',
                                    border: 'none',
                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.background = '#f1f5f9';
                                    e.currentTarget.style.color = '#1e293b';
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.color = '#64748b';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                }}
                            >
                                <XCircle size={18} />
                            </button>
                        </div>

                        <div className="modal-body max-h-[75vh] overflow-y-auto" style={{ padding: '24px 32px', background: '#f8fafc' }}>
                            {/* Search & Filter Section */}
                            <div style={{ marginBottom: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                    <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
                                        <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                        <input
                                            type="text"
                                            placeholder="Search by Serial Number, Ticket, or User..."
                                            value={historySearch}
                                            onChange={e => setHistorySearch(e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '10px 14px 10px 40px',
                                                fontSize: '14px',
                                                border: '1px solid #e2e8f0',
                                                borderRadius: '8px',
                                                background: 'white',
                                                color: '#1e293b',
                                                outline: 'none',
                                                transition: 'border-color 0.2s, box-shadow 0.2s'
                                            }}
                                            onFocus={(e) => {
                                                e.target.style.borderColor = '#6366f1';
                                                e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                                            }}
                                            onBlur={(e) => {
                                                e.target.style.borderColor = '#e2e8f0';
                                                e.target.style.boxShadow = 'none';
                                            }}
                                        />
                                        {historySearch && (
                                            <button
                                                onClick={() => setHistorySearch('')}
                                                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '2px' }}
                                            >
                                                <X size={14} />
                                            </button>
                                        )}
                                    </div>
                                    <span style={{ fontSize: '13px', color: '#64748b' }}>
                                        {replacementHistory.length} record{replacementHistory.length !== 1 ? 's' : ''} total
                                    </span>
                                </div>
                            </div>

                            {(() => {
                                const filtered = replacementHistory.filter(h =>
                                    h.ticketNumber?.toLowerCase().includes(historySearch.toLowerCase()) ||
                                    h.oldDetails?.serialNumber?.toLowerCase().includes(historySearch.toLowerCase()) ||
                                    h.newDetails?.serialNumber?.toLowerCase().includes(historySearch.toLowerCase()) ||
                                    h.performedBy?.toLowerCase().includes(historySearch.toLowerCase())
                                );

                                // Copy to clipboard helper
                                const copyToClipboard = (text) => {
                                    navigator.clipboard.writeText(text);
                                    toast.success('Copied to clipboard');
                                };

                                if (filtered.length === 0) {
                                    return (
                                        <div style={{ textAlign: 'center', padding: '48px 24px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                            <Search size={48} style={{ color: '#cbd5e1', marginBottom: '16px' }} />
                                            <p style={{ fontSize: '15px', color: '#64748b', margin: 0 }}>No matching records found</p>
                                            <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>Try adjusting your search criteria</p>
                                        </div>
                                    );
                                }

                                return (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        {filtered.map((item, index) => (
                                            <div
                                                key={item.id}
                                                style={{
                                                    background: 'white',
                                                    borderRadius: '12px',
                                                    border: '1px solid #e2e8f0',
                                                    overflow: 'hidden',
                                                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
                                                }}
                                            >
                                                {/* Consolidated Header: Ticket Metadata */}
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    padding: '16px 20px',
                                                    borderBottom: '1px solid #f1f5f9',
                                                    background: '#fafbfc'
                                                }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                        {/* Type Badge */}
                                                        <span style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            padding: '6px 12px',
                                                            borderRadius: '6px',
                                                            fontSize: '11px',
                                                            fontWeight: '600',
                                                            textTransform: 'uppercase',
                                                            letterSpacing: '0.5px',
                                                            background: item.type === 'Stock' ? '#eef2ff' : '#f3e8ff',
                                                            color: item.type === 'Stock' ? '#4f46e5' : '#7c3aed',
                                                            border: `1px solid ${item.type === 'Stock' ? '#c7d2fe' : '#ddd6fe'}`
                                                        }}>
                                                            {item.type === 'Stock' ? <Database size={12} /> : <RotateCcw size={12} />}
                                                            {item.type} Replacement
                                                        </span>

                                                        {/* Ticket Number */}
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569' }}>
                                                            <Ticket size={14} style={{ color: '#64748b' }} />
                                                            <span style={{ fontSize: '14px', fontWeight: '600' }}>#{item.ticketNumber || 'N/A'}</span>
                                                        </div>

                                                        {/* Separator */}
                                                        <span style={{ color: '#cbd5e1' }}>|</span>

                                                        {/* Date */}
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b' }}>
                                                            <Calendar size={14} />
                                                            <span style={{ fontSize: '13px' }}>
                                                                {new Date(item.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                                                            </span>
                                                        </div>

                                                        {/* Separator */}
                                                        <span style={{ color: '#cbd5e1' }}>|</span>

                                                        {/* Admin */}
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b' }}>
                                                            <User size={14} />
                                                            <span style={{ fontSize: '13px' }}>{item.performedBy || 'System'}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Hardware Cards Section */}
                                                <div style={{ padding: '20px', display: 'flex', gap: '24px', alignItems: 'stretch' }}>
                                                    {/* Hardware Removed Card */}
                                                    <div style={{
                                                        flex: 1,
                                                        background: '#fafafa',
                                                        borderRadius: '8px',
                                                        border: '1px solid #e5e7eb',
                                                        borderLeft: '4px solid #ef4444',
                                                        padding: '16px 20px',
                                                        display: 'flex',
                                                        flexDirection: 'column'
                                                    }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                                            <span style={{
                                                                background: '#fef2f2',
                                                                color: '#dc2626',
                                                                padding: '4px 8px',
                                                                borderRadius: '4px',
                                                                fontSize: '10px',
                                                                fontWeight: '700',
                                                                textTransform: 'uppercase',
                                                                letterSpacing: '0.5px'
                                                            }}>Removed</span>
                                                        </div>

                                                        {/* Serial Number - Primary */}
                                                        <div style={{ marginBottom: '16px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                                <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Serial Number</span>
                                                                <button
                                                                    onClick={() => copyToClipboard(item.oldDetails?.serialNumber || '')}
                                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '2px' }}
                                                                    title="Copy to clipboard"
                                                                >
                                                                    <Copy size={12} />
                                                                </button>
                                                            </div>
                                                            <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: '15px', fontWeight: '600', color: '#1f2937', letterSpacing: '0.2px' }}>
                                                                {item.oldDetails?.serialNumber || 'N/A'}
                                                            </span>
                                                        </div>

                                                        {/* Secondary Details */}
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                                            <div>
                                                                <span style={{ fontSize: '10px', color: '#9ca3af', fontWeight: '500', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                                                                    MAC Address
                                                                    <button
                                                                        onClick={() => copyToClipboard(item.oldDetails?.mac || '')}
                                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', padding: '1px' }}
                                                                        title="Copy"
                                                                    >
                                                                        <Copy size={10} />
                                                                    </button>
                                                                </span>
                                                                <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: '13px', color: '#4b5563' }}>
                                                                    {item.oldDetails?.mac || 'N/A'}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <span style={{ fontSize: '10px', color: '#9ca3af', fontWeight: '500', textTransform: 'uppercase', marginBottom: '2px', display: 'block' }}>Model</span>
                                                                <span style={{ fontSize: '13px', color: '#4b5563' }}>
                                                                    {item.oldDetails?.model || 'N/A'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Arrow Connector */}
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}>
                                                        <ArrowRight size={24} />
                                                    </div>

                                                    {/* Hardware Installed Card */}
                                                    <div style={{
                                                        flex: 1,
                                                        background: '#fafafa',
                                                        borderRadius: '8px',
                                                        border: '1px solid #e5e7eb',
                                                        borderLeft: '4px solid #22c55e',
                                                        padding: '16px 20px',
                                                        display: 'flex',
                                                        flexDirection: 'column'
                                                    }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                                            <span style={{
                                                                background: '#f0fdf4',
                                                                color: '#16a34a',
                                                                padding: '4px 8px',
                                                                borderRadius: '4px',
                                                                fontSize: '10px',
                                                                fontWeight: '700',
                                                                textTransform: 'uppercase',
                                                                letterSpacing: '0.5px'
                                                            }}>Installed</span>
                                                        </div>

                                                        {/* Serial Number - Primary */}
                                                        <div style={{ marginBottom: '16px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                                <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Serial Number</span>
                                                                <button
                                                                    onClick={() => copyToClipboard(item.newDetails?.serialNumber || '')}
                                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '2px' }}
                                                                    title="Copy to clipboard"
                                                                >
                                                                    <Copy size={12} />
                                                                </button>
                                                            </div>
                                                            <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: '15px', fontWeight: '600', color: '#1f2937', letterSpacing: '0.2px' }}>
                                                                {item.newDetails?.serialNumber || 'N/A'}
                                                            </span>
                                                        </div>

                                                        {/* Secondary Details */}
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                                            <div>
                                                                <span style={{ fontSize: '10px', color: '#9ca3af', fontWeight: '500', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                                                                    MAC Address
                                                                    <button
                                                                        onClick={() => copyToClipboard(item.newDetails?.mac || '')}
                                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', padding: '1px' }}
                                                                        title="Copy"
                                                                    >
                                                                        <Copy size={10} />
                                                                    </button>
                                                                </span>
                                                                <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: '13px', color: '#4b5563' }}>
                                                                    {item.newDetails?.mac || 'N/A'}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <span style={{ fontSize: '10px', color: '#9ca3af', fontWeight: '500', textTransform: 'uppercase', marginBottom: '2px', display: 'block' }}>Model</span>
                                                                <span style={{ fontSize: '13px', color: '#4b5563' }}>
                                                                    {item.newDetails?.model || 'N/A'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Replacement Reason - Structured */}
                                                {item.remarks && (
                                                    <div style={{
                                                        margin: '0 20px 20px 20px',
                                                        padding: '12px 16px',
                                                        background: '#f8fafc',
                                                        borderRadius: '8px',
                                                        border: '1px solid #e2e8f0',
                                                        display: 'flex',
                                                        alignItems: 'flex-start',
                                                        gap: '12px'
                                                    }}>
                                                        <Info size={16} style={{ color: '#64748b', marginTop: '1px', flexShrink: 0 }} />
                                                        <div>
                                                            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.3px', display: 'block', marginBottom: '4px' }}>
                                                                Replacement Reason
                                                            </span>
                                                            <span style={{ fontSize: '14px', color: '#374151', lineHeight: '1.5' }}>
                                                                {item.remarks}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()}
                        </div>

                        <div className="modal-footer p-[16px] border-t border-[#d1d1d1] flex justify-end" style={{ background: 'white' }}>
                            <button className="btn font-bold"
                                onClick={() => setShowHistory(false)}
                                style={{
                                    background: '#325fe8c7',
                                    color: 'white',
                                    padding: '0.7rem 1.5rem',
                                    fontSize: '1rem',
                                    border: 'none',
                                    borderRadius: '4px',
                                    boxShadow: '0 2px 4px rgba(40, 167, 69, 0.1)'
                                }}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
