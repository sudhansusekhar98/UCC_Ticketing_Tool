import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { stockApi, ticketsApi } from '../../services/api';
import toast from 'react-hot-toast';
import { Cable, Plus, History, AlertTriangle, CheckCircle, X, Loader } from 'lucide-react';
import useAuthStore from '../../context/authStore';
import { format } from 'date-fns';

const safeFormat = (date) => {
    try {
        return format(new Date(date), 'dd MMM yyyy, HH:mm');
    } catch {
        return '-';
    }
};

const TicketCablePanel = ({ ticketId, siteId, ticketStatus, isLocked, onUpdate }) => {
    const { user, hasRole } = useAuthStore();
    const [cables, setCables] = useState([]);
    const [usageHistory, setUsageHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    const [selectedCable, setSelectedCable] = useState('');
    const [quantityUsed, setQuantityUsed] = useState('');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const canRecord = !isLocked && (
        hasRole(['Admin', 'Supervisor', 'L1Engineer', 'L2Engineer', 'Dispatcher'])
    );

    useEffect(() => {
        loadData();
    }, [ticketId, siteId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [cableRes, historyRes] = await Promise.all([
                stockApi.getCableStock(siteId),
                stockApi.getCableUsage(ticketId),
            ]);
            setCables(cableRes.data.data || []);
            setUsageHistory(historyRes.data.data || []);
        } catch {
            // silently fail - panel won't block the rest of the page
        } finally {
            setLoading(false);
        }
    };

    const selectedCableObj = cables.find(c => c._id === selectedCable);
    const maxQty = selectedCableObj?.quantity ?? 0;
    const unit = selectedCableObj?.unit || 'units';

    const openModal = () => {
        setSelectedCable('');
        setQuantityUsed('');
        setNotes('');
        setShowModal(true);
    };

    const closeModal = () => setShowModal(false);

    const handleSubmit = async () => {
        if (!selectedCable) return toast.error('Select a cable item');
        const qty = parseFloat(quantityUsed);
        if (!qty || qty <= 0) return toast.error('Enter a valid quantity');
        if (qty > maxQty) return toast.error(`Only ${maxQty} ${unit} available`);

        setSubmitting(true);
        try {
            await stockApi.recordCableUsage({ ticketId, cableAssetId: selectedCable, quantityUsed: qty, notes });

            // Auto-post a ticket comment summarising the cable usage
            const cableName = selectedCableObj
                ? [selectedCableObj.deviceType || selectedCableObj.assetType, selectedCableObj.make, selectedCableObj.model]
                    .filter(Boolean).join(' ')
                : 'Cable';
            const commentText = `Cable/Wire Usage Recorded: ${qty} ${unit} of ${cableName} deducted from site stock.${notes ? ` Notes: ${notes}` : ''}`;
            try {
                await ticketsApi.addActivity(ticketId, { content: commentText, activityType: 'Comment', isInternal: true });
            } catch {
                // comment failure is non-critical; main usage already saved
            }

            toast.success(`${qty} ${unit} deducted from stock`);
            closeModal();
            await loadData();
            if (onUpdate) onUpdate();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to record usage');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="p-4 text-center text-sm text-gray-400 flex items-center justify-center gap-2">
                <Loader size={14} className="animate-spin" /> Checking cable stock...
            </div>
        );
    }

    const totalUsed = usageHistory.reduce((sum, log) => sum + Math.abs(log.quantityChange || 0), 0);

    return (
        <div
            className="shadow-[0_2px_12px_rgba(0,0,0,0.08)] border p-4 mt-4 animate-fade-in"
            style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', borderRadius: '12px', border: '1px solid var(--border-light)' }}
        >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                    <Cable size={19} className="text-gray-400" />
                    <h3 className="text-[17px] font-semibold m-0" style={{ color: 'var(--text-primary)' }}>
                        Cable / Wire Usage
                    </h3>
                </div>
                {canRecord && (
                    <button
                        onClick={openModal}
                        className="flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-lg transition-all"
                        style={{ backgroundColor: 'var(--primary-500)', color: '#fff' }}
                    >
                        <Plus size={13} /> Record Usage
                    </button>
                )}
            </div>

            <div style={{ borderTop: '1px solid var(--border-light)', marginBottom: '12px' }}></div>

            {/* Available cable stock */}
            {cables.length === 0 ? (
                <div
                    className="flex items-center gap-2 text-xs p-2.5 rounded-lg border mb-3"
                    style={{ backgroundColor: 'rgba(245,158,11,0.1)', color: 'var(--warning-500)', borderColor: 'rgba(245,158,11,0.25)' }}
                >
                    <AlertTriangle size={13} />
                    No cable/wire items found in stock for this site.
                </div>
            ) : (
                <div className="mb-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: '#94a3b8' }}>
                        Available at Site
                    </p>
                    <div className="grid gap-1.5">
                        {cables.map(c => (
                            <div
                                key={c._id}
                                className="flex items-center justify-between px-3 py-2 rounded-lg border"
                                style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-light)', fontSize: '12px' }}
                            >
                                <div>
                                    <span className="font-bold text-gray-700">
                                        {c.deviceType || c.assetType}
                                    </span>
                                    {(c.make || c.model) && (
                                        <span className="ml-2 text-gray-400">{c.make} {c.model}</span>
                                    )}
                                    {c.assetCode && (
                                        <span className="ml-2 text-gray-400">({c.assetCode})</span>
                                    )}
                                </div>
                                <span
                                    className="font-bold text-[13px] ml-4 shrink-0"
                                    style={{ color: c.quantity > 0 ? 'var(--success-500)' : 'var(--border-medium)' }}
                                >
                                    {c.quantity} {c.unit}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Usage history */}
            {usageHistory.length > 0 && (
                <div>
                    <div style={{ borderTop: '1px solid var(--border-light)', marginBottom: '10px' }}></div>
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                            <History size={11} className="inline mr-1" /> Usage History
                        </p>
                        <span className="text-[11px] font-bold" style={{ color: 'var(--accent-cyan)' }}>
                            Total used: {totalUsed}
                        </span>
                    </div>
                    <div className="grid gap-1.5">
                        {usageHistory.map(log => (
                            <div
                                key={log._id}
                                className="flex items-center justify-between px-3 py-2 rounded-lg border"
                                style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-light)', fontSize: '11px' }}
                            >
                                <div>
                                    <span className="font-bold text-gray-700">
                                        {log.assetSnapshot?.assetType || 'Cable'}
                                    </span>
                                    {log.notes && (
                                        <span className="ml-2 text-gray-400 italic">- {log.notes}</span>
                                    )}
                                    <div className="text-gray-400 mt-0.5">
                                        {log.performedBy?.name || 'Unknown'} · {safeFormat(log.createdAt)}
                                    </div>
                                </div>
                                <span className="font-bold shrink-0 ml-3" style={{ color: '#dc2626' }}>
                                    −{Math.abs(log.quantityChange || 0)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Record Usage Modal */}
            {showModal && createPortal(
                <div className="modal-overlay animate-fade-in" onClick={closeModal}>
                    <div className="modal glass-card animate-slide-up w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="flex items-center gap-2">
                                <Cable size={16} /> Record Cable Usage
                            </h3>
                            <button className="btn btn-ghost btn-sm" onClick={closeModal}>
                                <X size={14} />
                            </button>
                        </div>

                        <div className="modal-body space-y-4">
                            {/* Cable selector */}
                            <div className="form-group">
                                <label className="form-label">Cable / Wire Item</label>
                                <select
                                    className="form-input"
                                    value={selectedCable}
                                    onChange={e => { setSelectedCable(e.target.value); setQuantityUsed(''); }}
                                >
                                    <option value="">- Select item -</option>
                                    {cables.map(c => (
                                        <option key={c._id} value={c._id} disabled={c.quantity <= 0}>
                                            {c.deviceType || c.assetType}
                                            {c.make ? ` (${c.make}${c.model ? ' ' + c.model : ''})` : ''}
                                            {' - '}
                                            {c.quantity} {c.unit} available
                                            {c.quantity <= 0 ? ' [Out of stock]' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Quantity */}
                            <div className="form-group">
                                <label className="form-label">
                                    Quantity Used
                                    {selectedCableObj && (
                                        <span className="ml-1 text-gray-400 font-normal">
                                            (max: {maxQty} {unit})
                                        </span>
                                    )}
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        className="form-input pr-16"
                                        min="0.01"
                                        step="0.01"
                                        max={maxQty}
                                        value={quantityUsed}
                                        onChange={e => setQuantityUsed(e.target.value)}
                                        placeholder="0"
                                        disabled={!selectedCable}
                                    />
                                    {selectedCableObj && (
                                        <span
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold"
                                            style={{ color: '#94a3b8' }}
                                        >
                                            {unit}
                                        </span>
                                    )}
                                </div>
                                {selectedCableObj && quantityUsed && parseFloat(quantityUsed) > maxQty && (
                                    <p className="text-[11px] mt-1" style={{ color: '#dc2626' }}>
                                        Exceeds available stock ({maxQty} {unit})
                                    </p>
                                )}
                            </div>

                            {/* Notes */}
                            <div className="form-group">
                                <label className="form-label">Notes (optional)</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="e.g. replaced 10m at junction box B"
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    maxLength={300}
                                />
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={closeModal} disabled={submitting}>
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary flex items-center gap-2"
                                onClick={handleSubmit}
                                disabled={submitting || !selectedCable || !quantityUsed || parseFloat(quantityUsed) <= 0 || parseFloat(quantityUsed) > maxQty}
                            >
                                {submitting ? (
                                    <><Loader size={13} className="animate-spin" /> Saving...</>
                                ) : (
                                    <><CheckCircle size={13} /> Confirm</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default TicketCablePanel;
