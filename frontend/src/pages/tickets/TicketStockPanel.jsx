import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { stockApi } from '../../services/api';
import { toast } from 'react-hot-toast';
import { Database, CheckCircle, AlertTriangle, RotateCcw, Info, Search, XCircle, Check } from 'lucide-react';
import useAuthStore from '../../context/authStore';

const TicketStockPanel = ({ ticketId, assetId, ticketStatus, isLocked, onUpdate }) => {
    const { hasRole } = useAuthStore();
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
    const canManageReplace = hasRole(['Admin', 'Supervisor', 'L1Engineer', 'L2Engineer']);

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

            {!isLocked && ticketStatus === 'InProgress' && hasStock && canManageReplace && (
                <div className="flex justify-end">
                    <button className="btn btn-sm btn-primary" onClick={() => setShowReplaceModal(true)}>
                        <RotateCcw size={16} className="mr-2" />
                        Replace from Stock
                    </button>
                </div>
            )}

            {!hasStock && !isLocked && ticketStatus === 'InProgress' && (
                <div className="alert-box warning flex items-center gap-2 text-sm p-3 rounded bg-warning/10 border border-warning/30 text-warning-700">
                    <AlertTriangle size={16} />
                    <span>No spare stock available. Please initiate RMA replacement.</span>
                </div>
            )}

            {showReplaceModal && createPortal(
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal w-full max-w-2xl rounded-[8px] shadow-lg overflow-hidden"
                        style={{ background: '#f5f5f5' }}
                        onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header" style={{ background: '#e0e0e0', color: '#333', padding: '16px 20px', borderBottom: '1px solid #d1d1d1' }}>
                            <h3 className="flex items-center gap-2 font-bold" style={{ fontSize: '18px', margin: 0, whiteSpace: 'nowrap' }}>
                                <RotateCcw size={20} className="shrink-0" />
                                <span className="truncate">Asset Replacement</span>
                            </h3>
                            <button className="btn btn-ghost btn-sm" onClick={closeModal} style={{ color: '#666' }}>
                                <XCircle size={18} />
                            </button>
                        </div>

                        <div className="modal-body p-[20px] space-y-[16px]">
                            <div className="flex flex-col md:flex-row gap-[16px] mb-[16px]">
                                <div className="form-group flex-1">
                                    <label className="form-label font-semibold mb-2 block" style={{ fontSize: '14px', color: '#555', whiteSpace: 'nowrap' }}>
                                        New IP Address (Optional)
                                    </label>
                                    <input
                                        className="form-input w-full border border-[#ccc]"
                                        placeholder="Enter new IP..."
                                        style={{
                                            padding: '12px',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            background: 'white'
                                        }}
                                        value={newIp}
                                        onChange={e => setNewIp(e.target.value)}
                                    />
                                </div>
                                <div className="form-group flex-1">
                                    <label className="form-label font-semibold mb-2 block" style={{ fontSize: '14px', color: '#555', whiteSpace: 'nowrap' }}>
                                        Search Spares
                                    </label>
                                    <div className="relative flex items-center">
                                        <input
                                            className="form-input w-full pr-[40px] border border-[#ccc]"
                                            placeholder="Search by S/N, Asset Code..."
                                            style={{
                                                padding: '12px',
                                                borderRadius: '6px',
                                                fontSize: '14px',
                                                background: 'white'
                                            }}
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                        />
                                        <div className="absolute right-[12px] pointer-events-none text-[#999]">
                                            <Search size={18} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="spare-selection-list max-h-[400px] overflow-y-auto pr-2 custom-scrollbar space-y-6">
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
                                            <div className="text-center py-12 bg-white rounded-[8px] border border-[#eee]">
                                                <Search size={40} className="mx-auto mb-3 opacity-10" />
                                                <p className="text-[#999]" style={{ fontSize: '14px' }}>No matching spares found.</p>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="space-y-[16px]">
                                            {filteredLocal.length > 0 && (
                                                <div>
                                                    <h4 className="font-bold mb-3 text-[#333] flex items-center gap-2" style={{ fontSize: '16px' }}>
                                                        Local Site Stock
                                                    </h4>
                                                    <div className="grid gap-2">
                                                        {filteredLocal.map((spare) => (
                                                            <div
                                                                key={spare._id}
                                                                className={`p-3 cursor-pointer transition-all border rounded-[6px] relative ${selectedSpare?._id === spare._id ? 'bg-white border-[#28a745] shadow-sm' : 'bg-white border-[#e0e0e0]'} hover:border-[#aaa]`}
                                                                onClick={() => setSelectedSpare(prev => prev?._id === spare._id ? null : spare)}
                                                            >
                                                                {selectedSpare?._id === spare._id && (
                                                                    <div className="absolute top-2 right-2 text-[#28a745]">
                                                                        <CheckCircle size={18} />
                                                                    </div>
                                                                )}
                                                                <div className="flex justify-between items-center gap-4 overflow-hidden">
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="font-bold text-[#333] truncate" style={{ fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                            {spare.assetCode}
                                                                        </div>
                                                                        <div className="text-[#666] mt-1 flex items-center gap-2" style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                                                                            <span className="shrink-0">S/N:</span>
                                                                            <span className="font-semibold truncate grow">{spare.serialNumber}</span>
                                                                            <span className="opacity-30 shrink-0">|</span>
                                                                            <span className="shrink-0">MAC:</span>
                                                                            <span className="font-semibold truncate grow">{spare.mac}</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-right shrink-0 min-w-0 max-w-[40%]">
                                                                        <div className="font-bold text-[#555] truncate" style={{ fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{spare.make}</div>
                                                                        <div className="text-[#888] truncate" style={{ fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{spare.model}</div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {filteredHO.length > 0 && (
                                                <div>
                                                    <h4 className="font-bold mb-3 text-[#333] flex items-center gap-2" style={{ fontSize: '16px' }}>
                                                        Head Office Stock
                                                    </h4>
                                                    <div className="grid gap-2">
                                                        {filteredHO.map((spare) => (
                                                            <div
                                                                key={spare._id}
                                                                className={`p-3 cursor-pointer transition-all border rounded-[6px] relative ${selectedSpare?._id === spare._id ? 'bg-white border-[#28a745] shadow-sm' : 'bg-white border-[#e0e0e0]'} hover:border-[#aaa]`}
                                                                onClick={() => setSelectedSpare(prev => prev?._id === spare._id ? null : spare)}
                                                            >
                                                                {selectedSpare?._id === spare._id && (
                                                                    <div className="absolute top-2 right-2 text-[#28a745]">
                                                                        <CheckCircle size={18} />
                                                                    </div>
                                                                )}
                                                                <div className="flex justify-between items-start">
                                                                    <div>
                                                                        <div className="font-bold text-[#333]" style={{ fontSize: '14px' }}>{spare.assetCode}</div>
                                                                        <div className="text-[#666] mt-1" style={{ fontSize: '12px' }}>
                                                                            S/N: <span className="font-semibold">{spare.serialNumber}</span>
                                                                            <span className="mx-2 opacity-30">|</span>
                                                                            MAC: <span className="font-semibold">{spare.mac}</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <div className="font-bold text-[#555]" style={{ fontSize: '12px' }}>{spare.make}</div>
                                                                        <div className="text-[#888]" style={{ fontSize: '12px' }}>{spare.model}</div>
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

                            <div className="modal-footer p-[16px] border-t border-[#d1d1d1] flex justify-end gap-[16px]" style={{ background: '#e0e0e0' }}>
                                <button className="btn font-bold px-6"
                                    onClick={closeModal}
                                    style={{
                                        color: '#333',
                                        background: '#ccc',
                                        fontSize: '14px',
                                        padding: '10px 24px',
                                        border: 'none',
                                        borderRadius: '4px'
                                    }}>
                                    Cancel
                                </button>
                                <button
                                    className="btn font-bold px-6"
                                    onClick={handleReplace}
                                    disabled={!selectedSpare || actionLoading}
                                    style={{
                                        background: '#28a745',
                                        color: 'white',
                                        fontSize: '14px',
                                        padding: '10px 24px',
                                        border: 'none',
                                        borderRadius: '4px',
                                        opacity: (!selectedSpare || actionLoading) ? 0.6 : 1
                                    }}
                                >
                                    {actionLoading ? 'Processing...' : 'Confirm Replacement'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default TicketStockPanel;
