import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    ClipboardList, ArrowLeft, CheckCircle2, XCircle, Clock,
    Ticket, User, Package, Building2, Warehouse
} from 'lucide-react';
import { stockApi } from '../../services/api';
import toast from 'react-hot-toast';
import './Stock.css';

export default function RequisitionList() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [requisitions, setRequisitions] = useState([]);
    const [statusFilter, setStatusFilter] = useState('Pending');
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });

    useEffect(() => {
        fetchData();
    }, [statusFilter]);

    const fetchData = async (page = 1) => {
        try {
            setLoading(true);
            const response = await stockApi.getRequisitions({
                status: statusFilter,
                page,
                limit: pagination.limit
            });
            setRequisitions(response.data.data);
            setPagination(response.data.pagination);
        } catch (error) {
            console.error('Failed to fetch requisitions:', error);
            toast.error('Failed to load requisitions');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id) => {
        try {
            await stockApi.approveRequisition(id);
            toast.success('Requisition approved');
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Approval failed');
        }
    };

    const handleReject = async (id) => {
        const reason = window.prompt('Enter rejection reason:');
        if (reason === null) return;

        try {
            await stockApi.rejectRequisition(id, { reason });
            toast.success('Requisition rejected');
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Rejection failed');
        }
    };

    return (
        <div className="stock-container">
            <div className="add-stock-page animate-fade-in" style={{ maxWidth: '1200px' }}>
                <div className="page-header">
                    <div className="flex items-center gap-3">
                        <div className="title-icon">
                            <ClipboardList size={20} />
                        </div>
                        <div>
                            <h1 className="page-title">Requisition Orders</h1>
                            <p className="page-subtitle">Track and manage asset fulfillment requests</p>
                        </div>
                    </div>

                    <div className="header-actions">
                        <Link to="/stock" className="back-link" style={{ margin: 0 }}>
                            <ArrowLeft size={18} />
                            Back to Dashboard
                        </Link>
                    </div>
                </div>

                {/* Status Tabs */}
                <div className="status-tabs">
                    {['Pending', 'Approved', 'Fulfilled', 'Rejected'].map(status => (
                        <button
                            key={status}
                            className={`status-tab ${statusFilter === status ? 'active' : ''}`}
                            onClick={() => setStatusFilter(status)}
                        >
                            {status}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="empty-state-card">
                        <div className="loading-spinner"></div>
                        <p>Loading requests...</p>
                    </div>
                ) : (
                    <div className="requisition-list">
                        {requisitions.length > 0 ? (
                            requisitions.map(req => (
                                <div key={req._id} className="requisition-card">
                                    <div className="requisition-header">
                                        <div className="req-id">
                                            <Ticket size={14} />
                                            <span>#{req.ticketId?.ticketNumber || 'REQ'}</span>
                                        </div>
                                        <span className={`activity-badge badge-${req.status.toLowerCase()}`}>
                                            {req.status}
                                        </span>
                                        <div className="req-date">
                                            <Clock size={12} />
                                            <span>{new Date(req.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>

                                    <div className="requisition-body">
                                        <div className="req-detail">
                                            <div className="req-item">
                                                <Package size={14} />
                                                <span className="item-text">{req.assetType} (Qty: {req.quantity})</span>
                                            </div>
                                            <div className="req-sub">
                                                <User size={12} />
                                                <span>By: {req.requestedBy?.fullName}</span>
                                            </div>
                                        </div>
                                        <div className="req-detail">
                                            <div className="req-sub">
                                                <Building2 size={12} />
                                                <span>To: {req.siteId?.siteName}</span>
                                            </div>
                                            <div className="req-sub">
                                                <Warehouse size={12} />
                                                <span>From: {req.sourceSiteId?.siteName}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {req.comments && (
                                        <div className="requisition-note">
                                            <strong>Note:</strong> {req.comments}
                                        </div>
                                    )}

                                    <div className="requisition-actions">
                                        {req.status === 'Pending' && (
                                            <>
                                                <button className="btn btn-primary" onClick={() => handleApprove(req._id)}>
                                                    <CheckCircle2 size={14} /> Approve
                                                </button>
                                                <button className="btn btn-secondary btn-danger" onClick={() => handleReject(req._id)}>
                                                    <XCircle size={14} /> Reject
                                                </button>
                                            </>
                                        )}
                                        {req.status === 'Approved' && (
                                            <button
                                                className="btn btn-success"
                                                onClick={() => navigate(`/tickets/${req.ticketId?._id}`)}
                                            >
                                                <Package size={14} /> Fulfill
                                            </button>
                                        )}
                                        <button
                                            className="btn btn-secondary btn-outline"
                                            onClick={() => navigate(`/tickets/${req.ticketId?._id}`)}
                                        >
                                            View Ticket
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="empty-state-card">
                                <ClipboardList size={32} className="empty-icon" />
                                <p>No {statusFilter.toLowerCase()} requisitions</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
