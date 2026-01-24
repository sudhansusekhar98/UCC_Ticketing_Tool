import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { rmaApi, assetUpdateRequestApi } from '../../services/api';
import { toast } from 'react-hot-toast';
import { Package, Truck, CheckCircle, AlertTriangle, Clock, Server, FileText, History } from 'lucide-react';
import useAuthStore from '../../context/authStore';

const RMASection = ({ ticketId, siteId, assetId, ticketStatus, isLocked, onUpdate }) => {
    const navigate = useNavigate();
    const { user, hasRole } = useAuthStore();
    const [rma, setRma] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [showProcessModal, setShowProcessModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);

    // Form States
    const [requestReason, setRequestReason] = useState('');
    const [shippingDetails, setShippingDetails] = useState({ address: '', trackingNumber: '', carrier: '' });
    const [vendorDetails, setVendorDetails] = useState({ vendorName: '', orderId: '', cost: '' });
    const [actionRemark, setActionRemark] = useState('');

    const [rmaHistory, setRmaHistory] = useState([]);

    useEffect(() => {
        if (ticketId) loadRMA();
        if (assetId) loadHistory();
    }, [ticketId, assetId]);

    const loadHistory = async () => {
        try {
            const res = await rmaApi.getHistory(assetId);
            setRmaHistory(res.data.data);
        } catch (error) {
            console.error('Failed to load history', error);
        }
    };

    const loadRMA = async () => {
        setLoading(true);
        try {
            const res = await rmaApi.getByTicket(ticketId);
            setRma(res.data.data);
        } catch (error) {
            // Ignore 404 (no RMA)
            setRma(null);
        } finally {
            setLoading(false);
        }
    };

    const handleRequestRMA = async () => {
        if (!requestReason.trim()) return toast.error('Reason is required');
        try {
            await rmaApi.create({
                ticketId,
                requestReason,
                shippingDetails: shippingDetails.address ? shippingDetails : undefined
            });
            toast.success('RMA Requested');
            setShowRequestModal(false);
            loadRMA();
            if (onUpdate) onUpdate();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to request RMA');
        }
    };

    const handleUpdateStatus = async (status) => {
        try {
            const data = { status, remarks: actionRemark };
            if (status === 'Ordered') data.vendorDetails = vendorDetails;
            if (status === 'Dispatched') data.shippingDetails = shippingDetails;

            await rmaApi.updateStatus(rma._id, data);
            toast.success(`RMA status updated to ${status}`);
            setShowProcessModal(false);
            loadRMA();
            if (onUpdate) onUpdate();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update status');
        }
    };

    // New handler for initiating asset update (replaces old handleUpdateStatus for 'Installed')
    const handleInitiateAssetUpdate = async () => {
        try {
            const response = await assetUpdateRequestApi.initiate({
                rmaId: rma._id,
                ticketId: ticketId,
                assetId: assetId
            });

            const { accessToken } = response.data.data;

            toast.success('Access granted for 30 minutes!');

            // Redirect to asset edit page with access token
            setTimeout(() => {
                navigate(`/assets/${assetId}/edit?updateToken=${accessToken}`);
            }, 500);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to initiate asset update');
        }
    };

    if (loading) return <div className="p-4 text-center">Loading RMA details...</div>;

    const canManageRMA = hasRole(['Admin', 'Supervisor', 'Dispatcher']);
    const canInstall = hasRole(['Admin', 'Supervisor', 'L1Engineer', 'L2Engineer']);

    // Render Timeline Step
    const renderStep = (status, icon, label, date, active) => (
        <div className={`rma-step ${active ? 'active' : ''}`}>
            <div className="rma-step-icon">
                {icon}
            </div>
            <span className="rma-step-label">{label}</span>
            {date && <span className="rma-step-date">{new Date(date).toLocaleDateString()}</span>}
        </div>
    );

    return (
        <div className="detail-section glass-card rma-section p-3">
            <div className="flex justify-between items-center mb-4">
                <h3 className="section-title flex items-center gap-2">
                    <Package size={18} />
                    Device Replacement / RMA
                    {rmaHistory.length > 0 && (
                        <span className="badge badge-sm badge-outline text-xs ml-2">
                            {rmaHistory.length} Replacement{rmaHistory.length !== 1 ? 's' : ''}
                        </span>
                    )}
                </h3>
                <div className="flex gap-2">
                    {rmaHistory.length > 0 && (
                        <button className="btn btn-sm btn-ghost" onClick={() => setShowHistoryModal(true)}>
                            <History size={16} />
                        </button>
                    )}
                    {!rma && !isLocked && ticketStatus === 'InProgress' && (
                        <button className="btn btn-sm btn-outline-warning" onClick={() => setShowRequestModal(true)}>
                            Request RMA
                        </button>
                    )}
                    {!rma && !isLocked && ticketStatus !== 'InProgress' && (
                        <div className="text-xs text-muted italic flex items-center gap-1">
                            <Clock size={12} />
                            Start work to enable RMA
                        </div>
                    )}
                </div>
            </div>

            {rma ? (
                <div className="space-y-4">
                    {/* Status Tracker */}
                    <div className="rma-timeline-tracker">
                        <div className="rma-timeline-line"></div>
                        <div className="rma-timeline-steps">
                            {renderStep('Requested', <FileText size={14} />, 'Requested', rma.createdAt, true)}
                            {renderStep('Approved', <CheckCircle size={14} />, 'Approved', rma.approvedOn, ['Approved', 'Ordered', 'Dispatched', 'Received', 'Installed'].includes(rma.status))}
                            {renderStep('Ordered', <Package size={14} />, 'Ordered', null, ['Ordered', 'Dispatched', 'Received', 'Installed'].includes(rma.status))}
                            {renderStep('Dispatched', <Truck size={14} />, 'Dispatched', null, ['Dispatched', 'Received', 'Installed'].includes(rma.status))}
                            {renderStep('Installed', <Server size={14} />, 'Installed', rma.installedOn, ['Installed'].includes(rma.status))}
                        </div>
                    </div>

                    {/* Details Card */}
                    <div className="rma-details-grid">
                        <div className="rma-detail-item">
                            <span className="detail-label">Current Status</span>
                            <div className="detail-value">
                                <span className={`badge badge-${rma.status === 'Installed' ? 'success' : 'warning'}`}>{rma.status}</span>
                            </div>
                        </div>
                        <div className="rma-detail-item full-width">
                            <span className="detail-label">Request Reason</span>
                            <div className="detail-value">{rma.requestReason}</div>
                        </div>
                        {rma.replacementDetails?.serialNumber && (
                            <div className="rma-detail-item full-width">
                                <span className="detail-label">New Device Details</span>
                                <div className="detail-value">
                                    <div className="flex gap-2">
                                        <span className="badge badge-outline">S/N: {rma.replacementDetails.serialNumber}</span>
                                        {rma.replacementDetails.ipAddress && <span className="badge badge-outline">IP: {rma.replacementDetails.ipAddress}</span>}
                                        {rma.replacementDetails.mac && <span className="badge badge-outline">MAC: {rma.replacementDetails.mac}</span>}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-2">
                        {canManageRMA && rma.status === 'Requested' && (
                            <>
                                <button className="btn btn-sm btn-danger" onClick={() => handleUpdateStatus('Rejected')}>Reject</button>
                                <button className="btn btn-sm btn-success" onClick={() => handleUpdateStatus('Approved')}>Approve</button>
                            </>
                        )}

                        {canManageRMA && rma.status === 'Approved' && (
                            <button className="btn btn-sm btn-primary" onClick={() => { setActionRemark('Procurement started'); setShowProcessModal(true); }}>
                                Update Order Details
                            </button>
                        )}

                        {canManageRMA && (rma.status === 'Ordered' || rma.status === 'Dispatched') && (
                            <button className="btn btn-sm btn-primary" onClick={() => { setActionRemark('Shipment update'); setShowProcessModal(true); }}>
                                Update Shipping
                            </button>
                        )}

                        {canInstall && (rma.status === 'Dispatched' || rma.status === 'Received' || rma.status === 'Ordered') && (
                            <button style={{ marginTop: '9px' }} className="btn btn-sm btn-success" onClick={handleInitiateAssetUpdate}>
                                Complete Installation (Update Asset)
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <div className="text-center py-8 text-muted">
                    <p>No active RMA request for this ticket.</p>
                </div>
            )}

            {/* Request Modal */}
            {showRequestModal && (
                <div className="modal-overlay" onClick={() => setShowRequestModal(false)}>
                    <div className="modal glass-card" onClick={(e) => e.stopPropagation()}>
                        <h3>Initiate RMA Request</h3>
                        <div className="form-group">
                            <label className="form-label">Reason for Replacement *</label>
                            <textarea
                                className="form-textarea"
                                rows={3}
                                value={requestReason}
                                onChange={e => setRequestReason(e.target.value)}
                                placeholder="Describe why this device needs replacement..."
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Shipping Address (Optional)</label>
                            <input
                                className="form-input"
                                value={shippingDetails.address}
                                onChange={e => setShippingDetails({ ...shippingDetails, address: e.target.value })}
                                placeholder="Where should the replacement be sent?"
                            />
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-ghost" onClick={() => setShowRequestModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleRequestRMA}>Submit Request</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Process/Admin Modal */}
            {showProcessModal && (
                <div className="modal-overlay" onClick={() => setShowProcessModal(false)}>
                    <div className="modal glass-card" onClick={(e) => e.stopPropagation()}>
                        <h3>Update RMA Logistics</h3>

                        {/* Vendor Fields */}
                        <div className="p-3 bg-secondary/20 rounded mb-3">
                            <h4 className="text-sm font-bold mb-2">Vendor & Order</h4>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="form-group mb-0">
                                    <label className="form-label text-xs">Vendor Name</label>
                                    <input className="form-input" placeholder="Vendor Name" value={vendorDetails.vendorName} onChange={e => setVendorDetails({ ...vendorDetails, vendorName: e.target.value })} />
                                </div>
                                <div className="form-group mb-0">
                                    <label className="form-label text-xs">Order ID</label>
                                    <input className="form-input" placeholder="Order ID" value={vendorDetails.orderId} onChange={e => setVendorDetails({ ...vendorDetails, orderId: e.target.value })} />
                                </div>
                            </div>
                        </div>

                        {/* Shipping Fields */}
                        <div className="p-3 bg-secondary/20 rounded mb-3">
                            <h4 className="text-sm font-bold mb-2">Shipping & Tracking</h4>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="form-group mb-0">
                                    <label className="form-label text-xs">Carrier</label>
                                    <input className="form-input" placeholder="Carrier" value={shippingDetails.carrier} onChange={e => setShippingDetails({ ...shippingDetails, carrier: e.target.value })} />
                                </div>
                                <div className="form-group mb-0">
                                    <label className="form-label text-xs">Tracking Number</label>
                                    <input className="form-input" placeholder="Tracking Number" value={shippingDetails.trackingNumber} onChange={e => setShippingDetails({ ...shippingDetails, trackingNumber: e.target.value })} />
                                </div>
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button className="btn btn-ghost" onClick={() => setShowProcessModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={() => handleUpdateStatus('Ordered')}>Mark Ordered</button>
                            <button className="btn btn-primary" onClick={() => handleUpdateStatus('Dispatched')}>Mark Dispatched</button>
                        </div>
                    </div>
                </div>
            )}
            {/* History Modal */}
            {showHistoryModal && (
                <div className="modal-overlay" onClick={() => setShowHistoryModal(false)}>
                    <div className="modal glass-card" onClick={(e) => e.stopPropagation()}>
                        <h3>Replacement History</h3>
                        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                            {rmaHistory.map((h) => (
                                <div key={h._id} className="p-3 bg-secondary/20 rounded border border-border">
                                    <div className="flex justify-between mb-2">
                                        <span className="font-bold text-sm">RMA via Ticket: {h.ticketId?.ticketNumber || 'N/A'}</span>
                                        <span className="text-xs text-muted">{new Date(h.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div>
                                            <span className="block text-muted">Original S/N</span>
                                            <span>{h.originalDetailsSnapshot?.serialNumber || 'N/A'}</span>
                                        </div>
                                        <div>
                                            <span className="block text-muted">New S/N</span>
                                            <span>{h.replacementDetails?.serialNumber || 'Pending'}</span>
                                        </div>
                                        <div className="col-span-2">
                                            <span className="block text-muted">Reason</span>
                                            <span>{h.requestReason}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="modal-actions mt-4">
                            <button className="btn btn-ghost" onClick={() => setShowHistoryModal(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RMASection;
