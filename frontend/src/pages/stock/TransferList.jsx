import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import {
    ArrowRightLeft, Plus, ArrowLeft, CheckCircle2, Truck,
    Clock, User, ChevronRight, Warehouse, MapPin, Tag, Cpu, Send
} from 'lucide-react';
import { stockApi } from '../../services/api';
import toast from 'react-hot-toast';
import './StockCommon.css';
import './StockTransfers.css';

export default function TransferList() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [transfers, setTransfers] = useState([]);
    const [statusFilter, setStatusFilter] = useState('');
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });

    // Dispatch modal state
    const [showDispatchModal, setShowDispatchModal] = useState(false);
    const [dispatchingId, setDispatchingId] = useState(null);
    const [dispatchForm, setDispatchForm] = useState({
        carrier: '',
        trackingNumber: '',
        courierName: '',
        remarks: ''
    });
    const [dispatching, setDispatching] = useState(false);

    useEffect(() => {
        fetchData();
    }, [statusFilter]);

    const fetchData = async (page = 1) => {
        try {
            setLoading(true);
            const response = await stockApi.getTransfers({
                status: statusFilter,
                page,
                limit: pagination.limit
            });
            setTransfers(response.data.data);
            setPagination(response.data.pagination);
        } catch (error) {
            console.error('Failed to fetch transfers:', error);
            toast.error('Failed to load transfers');
        } finally {
            setLoading(false);
        }
    };

    const openDispatchModal = (id) => {
        setDispatchingId(id);
        setDispatchForm({ carrier: '', trackingNumber: '', courierName: '', remarks: '' });
        setShowDispatchModal(true);
    };

    const handleDispatch = async () => {
        try {
            setDispatching(true);
            await stockApi.dispatchTransfer(dispatchingId, dispatchForm);
            toast.success('Transfer dispatched with shipping details');
            setShowDispatchModal(false);
            setDispatchingId(null);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Dispatch failed');
        } finally {
            setDispatching(false);
        }
    };

    const handleReceive = async (id) => {
        try {
            await stockApi.receiveTransfer(id);
            toast.success('Transfer received');
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Receive failed');
        }
    };

    return (
        <div className="stock-container">
            <div className="add-stock-page animate-fade-in" style={{ maxWidth: '1200px' }}>
                <div className="page-header">
                    <div className="flex items-center gap-3">
                        <div className="title-icon">
                            <ArrowRightLeft size={20} />
                        </div>
                        <div>
                            <h1 className="page-title">Stock Transfers</h1>
                            <p className="page-subtitle">Track inter-site asset movements</p>
                        </div>
                    </div>

                    <div className="header-actions">
                        <Link to="/stock/transfers/new" className="btn btn-primary">
                            <Plus size={14} />
                            New Transfer
                        </Link>
                        <Link to="/stock" className="btn btn-secondary">
                            <ArrowLeft size={18} />
                            Back to Dashboard
                        </Link>
                    </div>
                </div>

                {/* Status Filter */}
                <div className="filter-bar">
                    <span className="filter-label">Status:</span>
                    <div className="filter-pills">
                        {['', 'Pending', 'Dispatched', 'InTransit', 'Completed'].map(status => (
                            <button
                                key={status}
                                className={`filter-pill ${statusFilter === status ? 'active' : ''}`}
                                onClick={() => setStatusFilter(status)}
                            >
                                {status || 'All'}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div className="empty-state-card">
                        <div className="loading-spinner"></div>
                        <p>Loading transfers...</p>
                    </div>
                ) : (
                    <div className="transfer-grid">
                        {transfers.length > 0 ? (
                            transfers.map(tr => (
                                <div key={tr._id} className="transfer-card">
                                    <div className="transfer-header">
                                        <div className="transfer-id">
                                            <span className="id-label">{tr.transferName || 'Transfer'}</span>
                                            <span className="id-value">TRF-{tr._id.substring(18).toUpperCase()}</span>
                                        </div>
                                        <span className={`activity-badge badge-${tr.status.toLowerCase()}`}>
                                            {tr.status}
                                        </span>
                                    </div>

                                    <div className="transfer-route">
                                        <div className="route-point">
                                            <Warehouse size={16} />
                                            <span className="route-name">{tr.sourceSiteId?.siteName}</span>
                                            <span className="route-label">Source</span>
                                        </div>
                                        <div className="route-arrow">
                                            <div className="route-line"></div>
                                            <ChevronRight size={14} />
                                            <span className="route-count">{tr.assetIds?.length} Items</span>
                                        </div>
                                        <div className="route-point">
                                            <MapPin size={16} />
                                            <span className="route-name">{tr.destinationSiteId?.siteName}</span>
                                            <span className="route-label">Destination</span>
                                        </div>
                                    </div>

                                    {/* Asset type badges */}
                                    {tr.assetIds && tr.assetIds.length > 0 && (
                                        <div className="transfer-asset-types" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', padding: '0 12px 8px' }}>
                                            {tr.assetIds.slice(0, 4).map(asset => (
                                                <span key={asset._id} className="badge badge-sm badge-outline" style={{ fontSize: '9px', gap: '3px' }}>
                                                    <Tag size={8} /> {asset.assetType}
                                                    {asset.deviceType && <> · {asset.deviceType}</>}
                                                </span>
                                            ))}
                                            {tr.assetIds.length > 4 && (
                                                <span className="badge badge-sm badge-outline" style={{ fontSize: '9px' }}>
                                                    +{tr.assetIds.length - 4} more
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {/* Shipping details (if dispatched) */}
                                    {tr.shippingDetails?.trackingNumber && (
                                        <div style={{ padding: '0 12px 8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                            {tr.shippingDetails.carrier && (
                                                <span className="badge badge-sm badge-info" style={{ fontSize: '9px' }}>
                                                    <Truck size={8} /> {tr.shippingDetails.carrier}
                                                </span>
                                            )}
                                            <span className="badge badge-sm badge-warning" style={{ fontSize: '9px' }}>
                                                🔗 {tr.shippingDetails.trackingNumber}
                                            </span>
                                        </div>
                                    )}

                                    <div className="transfer-meta">
                                        <div className="meta-item">
                                            <User size={12} />
                                            <span>{tr.initiatedBy?.fullName}</span>
                                        </div>
                                        <div className="meta-item">
                                            <Clock size={12} />
                                            <span>{new Date(tr.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>

                                    <div className="transfer-actions">
                                        {tr.status === 'Pending' && (
                                            <button className="btn btn-primary" onClick={() => openDispatchModal(tr._id)}>
                                                <Send size={14} /> Dispatch
                                            </button>
                                        )}
                                        {(tr.status === 'InTransit' || tr.status === 'Dispatched') && (
                                            <button className="btn btn-success" onClick={() => handleReceive(tr._id)}>
                                                <CheckCircle2 size={14} /> Receive
                                            </button>
                                        )}
                                        <button className="btn btn-secondary btn-outline">Details</button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="empty-state-card" style={{ gridColumn: '1 / -1' }}>
                                <ArrowRightLeft size={32} className="empty-icon" />
                                <p>No stock transfers found</p>
                                <Link to="/stock/transfers/new" className="btn btn-primary" style={{ marginTop: '0.75rem' }}>
                                    Initiate Transfer
                                </Link>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ======== Dispatch Modal ======== */}
            {showDispatchModal && createPortal(
                <div className="modal-overlay animate-fade-in" onClick={() => setShowDispatchModal(false)}>
                    <div className="modal glass-card animate-slide-up" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="flex items-center gap-2">
                                <Send size={16} />
                                Dispatch Transfer
                            </h3>
                        </div>
                        <div className="modal-body">
                            <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 mb-4 animate-fade-in">
                                <p className="text-xs font-bold text-primary-700 mb-1">Shipping Details</p>
                                <p className="text-[10px] text-muted">
                                    Enter the carrier and tracking information for this shipment. These details will be visible on the ticket's RMA section.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="form-group mb-0">
                                    <label className="form-label text-[10px]">Carrier / Courier Company</label>
                                    <input
                                        className="form-input"
                                        placeholder="e.g., BlueDart, FedEx"
                                        value={dispatchForm.carrier}
                                        onChange={e => setDispatchForm({ ...dispatchForm, carrier: e.target.value })}
                                    />
                                </div>
                                <div className="form-group mb-0">
                                    <label className="form-label text-[10px]">Tracking Number</label>
                                    <input
                                        className="form-input"
                                        placeholder="AWB / Tracking #"
                                        value={dispatchForm.trackingNumber}
                                        onChange={e => setDispatchForm({ ...dispatchForm, trackingNumber: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="form-group mt-3 mb-0">
                                <label className="form-label text-[10px]">Courier Person Name</label>
                                <input
                                    className="form-input"
                                    placeholder="Name of point-of-contact"
                                    value={dispatchForm.courierName}
                                    onChange={e => setDispatchForm({ ...dispatchForm, courierName: e.target.value })}
                                />
                            </div>
                            <div className="form-group mt-3 mb-0">
                                <label className="form-label text-[10px]">Remarks</label>
                                <textarea
                                    className="form-input text-xs"
                                    rows={2}
                                    value={dispatchForm.remarks}
                                    onChange={e => setDispatchForm({ ...dispatchForm, remarks: e.target.value })}
                                    placeholder="Any additional notes..."
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowDispatchModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleDispatch} disabled={dispatching}>
                                <Truck size={14} /> {dispatching ? 'Dispatching...' : 'Mark as Dispatched'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
