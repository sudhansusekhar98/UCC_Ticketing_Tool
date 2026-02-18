import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { stockApi } from '../../services/api';
import toast from 'react-hot-toast';
import { Database, CheckCircle, AlertTriangle, RotateCcw, Info, Search, XCircle, Check, ChevronDown, ChevronRight, MapPin, Building2, Package } from 'lucide-react';
import useAuthStore from '../../context/authStore';

const TicketStockPanel = ({ ticketId, siteId, assetId, ticketStatus, isLocked, onUpdate }) => {
    const { hasRole, hasRight } = useAuthStore();
    const [availability, setAvailability] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showReplaceModal, setShowReplaceModal] = useState(false);
    const [selectedSpare, setSelectedSpare] = useState(null);
    const [newIp, setNewIp] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [expandedSites, setExpandedSites] = useState({});

    const isAdminOrSupervisor = hasRole(['Admin', 'Supervisor']);

    const closeModal = () => {
        setShowReplaceModal(false);
        setSearchTerm('');
        setSelectedSpare(null);
    };

    useEffect(() => {
        if (ticketId) loadAvailability();
    }, [ticketId]);

    const loadAvailability = async () => {
        setLoading(true);
        try {
            const res = await stockApi.getAvailability(ticketId);
            setAvailability(res.data.data);
        } catch (error) {
            console.error('Failed to load stock availability', error);
        } finally {
            setLoading(false);
        }
    };

    const handleReplace = async () => {
        if (!selectedSpare) return toast.error('Please select a spare item');

        setActionLoading(true);
        try {
            await stockApi.replaceAsset({
                ticketId,
                defectiveAssetId: assetId,
                spareAssetId: selectedSpare._id,
                newIp
            });
            toast.success('Asset replaced successfully');
            closeModal();
            if (onUpdate) onUpdate();
            loadAvailability();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Replacement failed');
        } finally {
            setActionLoading(false);
        }
    };

    const toggleSiteExpand = (siteId) => {
        setExpandedSites(prev => ({ ...prev, [siteId]: !prev[siteId] }));
    };

    if (loading) return <div className="p-4 text-center">Checking stock availability...</div>;
    if (!availability) return null;

    const hasStock = availability.totalAvailable > 0;
    const displayType = availability.deviceType || availability.assetType || 'N/A';

    return (
        <div
            className="shadow-[0_2px_12px_rgba(0,0,0,0.08)] border p-4 mt-4 animate-fade-in"
            style={{ backgroundColor: '#ffffff', color: '#1e293b', borderRadius: '12px', border: '1px solid #f1f5f9' }}
        >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                    <Database size={19} className="text-gray-400" />
                    <h3 className="text-[17px] font-semibold m-0" style={{ color: '#1e293b' }}>
                        Stock Availability
                        <span style={{ color: '#94a3b8', fontWeight: 'normal', fontSize: '13px', marginLeft: '4px' }}>({displayType})</span>
                    </h3>
                </div>
                {/* Total badge */}
                <div className="flex items-center gap-2">
                    <span
                        className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                        style={{
                            backgroundColor: hasStock ? '#dcfce7' : '#fee2e2',
                            color: hasStock ? '#166534' : '#991b1b'
                        }}
                    >
                        {availability.totalAvailable} Total
                    </span>
                    {availability.viewScope === 'site' && (
                        <span className="text-[9px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: '#f1f5f9', color: '#64748b' }}>
                            Your Site Only
                        </span>
                    )}
                </div>
            </div>

            {/* Subtle Divider */}
            <div style={{ borderTop: '1px solid #f1f5f9', marginBottom: '4px' }}></div>

            {/* ==========================================
                ADMIN/SUPERVISOR VIEW: Per-site breakdown
               ========================================== */}
            {isAdminOrSupervisor && availability.allSitesStock?.length > 0 ? (
                <div className="flex flex-col gap-1">
                    {availability.allSitesStock.map((site) => (
                        <div key={site.siteId} className="rounded-lg overflow-hidden border" style={{ borderColor: '#f1f5f9' }}>
                            {/* Site Row */}
                            <div
                                className="flex justify-between items-center py-2 px-3 cursor-pointer transition-all hover:bg-slate-50"
                                onClick={() => toggleSiteExpand(site.siteId)}
                                style={{ backgroundColor: site.isTicketSite ? '#f0fdf4' : site.isHeadOffice ? '#eff6ff' : '#ffffff' }}
                            >
                                <div className="flex items-center gap-2.5">
                                    {expandedSites[site.siteId] ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
                                    <div
                                        className="w-2 h-2 rounded-full"
                                        style={{
                                            backgroundColor: site.isTicketSite ? '#059669' : site.isHeadOffice ? '#2563eb' : '#8b5cf6'
                                        }}
                                    ></div>
                                    <span className="text-[12px] font-bold tracking-wide" style={{ color: '#334155' }}>
                                        {site.siteName}
                                    </span>
                                    {site.isTicketSite && (
                                        <span className="text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
                                            style={{ backgroundColor: '#dcfce7', color: '#166534' }}>
                                            Ticket Site
                                        </span>
                                    )}
                                    {site.isHeadOffice && (
                                        <span className="text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
                                            style={{ backgroundColor: '#dbeafe', color: '#1e40af' }}>
                                            HO
                                        </span>
                                    )}
                                </div>
                                <span
                                    className="text-[18px] font-bold"
                                    style={{
                                        color: site.count > 0
                                            ? (site.isTicketSite ? '#059669' : site.isHeadOffice ? '#2563eb' : '#7c3aed')
                                            : '#cbd5e1'
                                    }}
                                >
                                    {site.count}
                                </span>
                            </div>

                            {/* Expanded spare items */}
                            {expandedSites[site.siteId] && site.spares?.length > 0 && (
                                <div className="px-3 pb-2 pt-1 animate-fade-in" style={{ backgroundColor: '#fafbfc' }}>
                                    <div className="grid gap-1.5">
                                        {site.spares.map((spare) => (
                                            <div
                                                key={spare._id}
                                                className="flex items-center justify-between px-3 py-2 rounded-lg border transition-all"
                                                style={{
                                                    backgroundColor: '#ffffff',
                                                    borderColor: '#f1f5f9',
                                                    fontSize: '11px'
                                                }}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Package size={12} className="text-gray-300" />
                                                    <div>
                                                        <span className="font-bold text-gray-700">{spare.assetCode}</span>
                                                        {spare.serialNumber && (
                                                            <span className="ml-2 text-gray-400">S/N: {spare.serialNumber}</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-right text-gray-400">
                                                    <span>{spare.make}</span>
                                                    {spare.model && <span className="ml-1 text-gray-300">{spare.model}</span>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                /* ==========================================
                   ENGINEER VIEW: Only local site stock
                   ========================================== */
                <div className="flex flex-col">
                    <div className="flex justify-between items-center py-2.5 border-b" style={{ borderColor: '#f8fafc' }}>
                        <div className="flex items-center gap-2.5">
                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                            <span className="text-[12px] font-bold uppercase tracking-wider" style={{ color: '#64748b' }}>
                                {isAdminOrSupervisor ? 'Local Site Stock' : 'Your Site Stock'}
                            </span>
                        </div>
                        <span className="text-[20px] font-bold" style={{ color: availability.localStock > 0 ? '#059669' : '#cbd5e1' }}>
                            {availability.localStock}
                        </span>
                    </div>

                    {isAdminOrSupervisor && (
                        <div className="flex justify-between items-center py-2.5">
                            <div className="flex items-center gap-2.5">
                                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                <span className="text-[12px] font-bold uppercase tracking-wider" style={{ color: '#64748b' }}>Head Office Stock</span>
                            </div>
                            <span className="text-[20px] font-bold" style={{ color: availability.hoStock > 0 ? '#2563eb' : '#cbd5e1' }}>
                                {availability.hoStock}
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Contextual Alerts */}
            {!isLocked && ticketStatus === 'InProgress' && (
                <div className="mt-3 pt-3 border-t space-y-2" style={{ borderColor: '#f1f5f9' }}>
                    {!hasStock ? (
                        <div
                            className="flex items-center gap-2 text-xs font-medium p-2.5 border"
                            style={{ backgroundColor: '#fef2f2', color: '#b91c1c', borderColor: '#fee2e2', borderRadius: '8px' }}
                        >
                            <AlertTriangle size={14} />
                            <span>
                                {availability.viewScope === 'site'
                                    ? 'No stock available at your site for this device type. Please initiate replacement through RMA.'
                                    : 'No stock available for this device type. Please initiate replacement through RMA.'
                                }
                            </span>
                        </div>
                    ) : (
                        <div
                            className="flex items-center gap-2 text-[11px] leading-relaxed p-2.5 border"
                            style={{ backgroundColor: '#f0f9ff', color: '#0369a1', borderColor: '#e0f2fe', borderRadius: '8px' }}
                        >
                            <Info size={14} className="shrink-0" />
                            <span>Replacements can be managed through the RMA workflow below.</span>
                        </div>
                    )}
                </div>
            )}

            {showReplaceModal && createPortal(
                <div className="modal-overlay animate-fade-in" onClick={closeModal}>
                    <div className="modal glass-card animate-slide-up w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="flex items-center gap-2">
                                <RotateCcw size={16} />
                                Asset Replacement
                            </h3>
                            <button className="btn btn-ghost btn-sm" onClick={closeModal}>
                                <XCircle size={14} />
                            </button>
                        </div>

                        <div className="modal-body">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div className="form-group">
                                    <label className="form-label">New IP Address (Optional)</label>
                                    <input
                                        className="form-input"
                                        placeholder="Enter new IP..."
                                        value={newIp}
                                        onChange={e => setNewIp(e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Search Spares</label>
                                    <div className="relative flex items-center">
                                        <input
                                            className="form-input pr-10"
                                            placeholder="S/N, Asset Code..."
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                        />
                                        <div className="absolute right-3 text-muted">
                                            <Search size={14} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="spare-selection-list max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                                {(() => {
                                    const filterSpares = (spares) => spares?.filter(s =>
                                        s.assetCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                        s.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                        s.make?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                        s.model?.toLowerCase().includes(searchTerm.toLowerCase())
                                    ) || [];

                                    const filteredLocal = filterSpares(availability.localSpares);
                                    const filteredHO = filterSpares(availability.hoSpares);

                                    if (filteredLocal.length === 0 && filteredHO.length === 0) {
                                        return (
                                            <div className="text-center py-8 bg-secondary/10 rounded-lg border border-border">
                                                <Search size={32} className="mx-auto mb-2 opacity-10" />
                                                <p className="text-muted text-sm">No matching spares found.</p>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="space-y-4">
                                            {filteredLocal.length > 0 && (
                                                <div>
                                                    <h4 className="text-xs font-bold mb-3 uppercase tracking-wider text-muted flex items-center gap-2">
                                                        <div className="w-1 h-3 bg-success-500 rounded-full"></div>
                                                        Local Site Stock
                                                    </h4>
                                                    <div className="grid gap-2">
                                                        {filteredLocal.map((spare) => (
                                                            <div
                                                                key={spare._id}
                                                                className={`p-3 cursor-pointer transition-all border rounded-lg relative ${selectedSpare?._id === spare._id ? 'bg-primary-500/10 border-primary-500 ring-1 ring-primary-500' : 'bg-secondary/10 border-border hover:border-primary-500/50'}`}
                                                                onClick={() => setSelectedSpare(prev => prev?._id === spare._id ? null : spare)}
                                                            >
                                                                {selectedSpare?._id === spare._id && (
                                                                    <div className="absolute top-2 right-2 text-primary-500">
                                                                        <CheckCircle size={14} />
                                                                    </div>
                                                                )}
                                                                <div className="flex justify-between items-center gap-4">
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="font-bold text-sm truncate">
                                                                            {spare.assetCode}
                                                                        </div>
                                                                        <div className="text-muted mt-1 flex items-center gap-2 text-[10px]">
                                                                            <span>S/N: <b className="text-primary-400">{spare.serialNumber}</b></span>
                                                                            <span className="opacity-30">|</span>
                                                                            <span>MAC: <b className="text-primary-400">{spare.mac}</b></span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-right shrink-0">
                                                                        <div className="font-bold text-xs">{spare.make}</div>
                                                                        <div className="text-[10px] text-muted">{spare.model}</div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {filteredHO.length > 0 && (
                                                <div>
                                                    <h4 className="text-xs font-bold mb-3 uppercase tracking-wider text-muted flex items-center gap-2">
                                                        <div className="w-1 h-3 bg-primary-500 rounded-full"></div>
                                                        Head Office Stock
                                                    </h4>
                                                    <div className="grid gap-2">
                                                        {filteredHO.map((spare) => (
                                                            <div
                                                                key={spare._id}
                                                                className={`p-3 cursor-pointer transition-all border rounded-lg relative ${selectedSpare?._id === spare._id ? 'bg-primary-500/10 border-primary-500 ring-1 ring-primary-500' : 'bg-secondary/10 border-border hover:border-primary-500/50'}`}
                                                                onClick={() => setSelectedSpare(prev => prev?._id === spare._id ? null : spare)}
                                                            >
                                                                {selectedSpare?._id === spare._id && (
                                                                    <div className="absolute top-2 right-2 text-primary-500">
                                                                        <CheckCircle size={14} />
                                                                    </div>
                                                                )}
                                                                <div className="flex justify-between items-center gap-4">
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="font-bold text-sm truncate">{spare.assetCode}</div>
                                                                        <div className="text-muted mt-1 flex items-center gap-2 text-[10px]">
                                                                            <span>S/N: <b className="text-primary-400">{spare.serialNumber}</b></span>
                                                                            <span className="opacity-30">|</span>
                                                                            <span>MAC: <b className="text-primary-400">{spare.mac}</b></span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-right shrink-0">
                                                                        <div className="font-bold text-xs">{spare.make}</div>
                                                                        <div className="text-[10px] text-muted">{spare.model}</div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={closeModal}>Cancel</button>
                            <button
                                className="btn btn-primary"
                                onClick={handleReplace}
                                disabled={!selectedSpare || actionLoading}
                            >
                                {actionLoading ? 'Processing...' : 'Confirm Replacement'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default TicketStockPanel;
