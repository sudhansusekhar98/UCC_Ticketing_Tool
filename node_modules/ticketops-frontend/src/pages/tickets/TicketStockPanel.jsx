import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { stockApi } from '../../services/api';
import { toast } from 'react-hot-toast';
import { Database, CheckCircle, AlertTriangle, RotateCcw, Info, Search, XCircle, Check } from 'lucide-react';
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

    if (loading) return <div className="p-4 text-center">Checking stock availability...</div>;
    if (!availability) return null;

    const hasStock = availability.localStock > 0 || availability.hoStock > 0;
    const canManageReplace = hasRole(['Admin', 'Supervisor', 'L1Engineer', 'L2Engineer']) || hasRight('DIRECT_STOCK_REPLACEMENT', siteId);

    return (
        <div className="detail-section glass-card stock-panel p-3 mt-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="section-title flex items-center gap-2">
                    <Database size={18} />
                    Stock Availability ({availability.assetType || 'N/A'})
                </h3>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
                <div className={`p-3 rounded border ${availability.localStock > 0 ? 'bg-success/10 border-success/30' : 'bg-secondary/10 border-border'}`}>
                    <div className="text-xs text-muted font-bold mb-1">LOCAL SITE STOCK</div>
                    <div className="text-2xl font-bold">{availability.localStock}</div>
                </div>
                <div className={`p-3 rounded border ${availability.hoStock > 0 ? 'bg-primary/10 border-primary/30' : 'bg-secondary/10 border-border'}`}>
                    <div className="text-xs text-muted font-bold mb-1">HEAD OFFICE STOCK</div>
                    <div className="text-2xl font-bold">{availability.hoStock}</div>
                </div>
            </div>

            {/* 
            {!isLocked && ticketStatus === 'InProgress' && hasStock && canManageReplace && (
                <div className="flex justify-end">
                    <button className="btn btn-sm btn-primary" onClick={() => setShowReplaceModal(true)}>
                        <RotateCcw size={16} className="mr-2" />
                        Replace from Stock
                    </button>
                </div>
            )}
            */}

            {!isLocked && ticketStatus === 'InProgress' && (
                <div className="alert-box info flex items-center gap-2 text-sm p-3 rounded bg-primary/10 border border-primary/30 text-primary-700">
                    <Info size={16} />
                    <span>Please use the RMA Portal below for any device replacements or stock updates.</span>
                </div>
            )}

            {!hasStock && !isLocked && ticketStatus === 'InProgress' && (
                <div className="alert-box warning flex items-center gap-2 text-sm p-3 rounded bg-warning/10 border border-warning/30 text-warning-700">
                    <AlertTriangle size={16} />
                    <span>No spare stock available. Please initiate RMA replacement.</span>
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
