import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    ClipboardList, ArrowLeft, CheckCircle2, XCircle, Clock,
    Ticket, User, Package, Building2, Warehouse, RefreshCw,
    ArrowRightLeft, Wrench, Send, Box
} from 'lucide-react';
import { stockApi } from '../../services/api';
import toast from 'react-hot-toast';
import './Stock.css';

// Requisition type configurations
const REQUISITION_TYPES = {
    all: { label: 'All', icon: ClipboardList, color: 'var(--primary-color)' },
    StockRequest: { label: 'Stock Requests', icon: Package, color: 'var(--accent-blue)' },
    RMATransfer: { label: 'RMA Transfers', icon: Send, color: 'var(--accent-purple)' },
    RepairedItemTransfer: { label: 'Repaired Items', icon: Wrench, color: 'var(--accent-green)' }
};

const TRANSFER_DIRECTIONS = {
    ToSite: { label: 'To Site', icon: ArrowRightLeft, color: 'var(--accent-blue)' },
    ToHO: { label: 'To HO', icon: Building2, color: 'var(--accent-purple)' },
    SiteToSite: { label: 'Site to Site', icon: ArrowRightLeft, color: 'var(--accent-orange)' },
    None: { label: '-', icon: Box, color: 'var(--text-secondary)' }
};

export default function RequisitionList() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [requisitions, setRequisitions] = useState([]);
    const [statusFilter, setStatusFilter] = useState('Pending');
    const [typeFilter, setTypeFilter] = useState('all');
    const [typeCounts, setTypeCounts] = useState({});
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });

    useEffect(() => {
        fetchData();
    }, [statusFilter, typeFilter]);

    const fetchData = async (page = 1) => {
        try {
            setLoading(true);
            const params = {
                status: statusFilter,
                page,
                limit: pagination.limit
            };
            if (typeFilter !== 'all') {
                params.requisitionType = typeFilter;
            }
            const response = await stockApi.getRequisitions(params);
            setRequisitions(response.data.data);
            setPagination(response.data.pagination);
            if (response.data.typeCounts) {
                setTypeCounts(response.data.typeCounts);
            }
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

    const getRequisitionTypeLabel = (type) => {
        return REQUISITION_TYPES[type]?.label || 'Stock Request';
    };

    const getTypeIcon = (type) => {
        const TypeIcon = REQUISITION_TYPES[type]?.icon || Package;
        return <TypeIcon size={14} />;
    };

    const getTypeBadgeClass = (type) => {
        switch (type) {
            case 'RMATransfer': return 'badge-rma-transfer';
            case 'RepairedItemTransfer': return 'badge-repaired-transfer';
            default: return 'badge-stock-request';
        }
    };

    const getDirectionLabel = (direction) => {
        return TRANSFER_DIRECTIONS[direction]?.label || '-';
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
                            <p className="page-subtitle">Track and manage stock requests, RMA transfers, and repaired item movements</p>
                        </div>
                    </div>

                    <div className="header-actions">
                        <button className="btn btn-secondary" onClick={() => fetchData()} disabled={loading}>
                            <RefreshCw size={16} className={loading ? 'spinning' : ''} />
                            Refresh
                        </button>
                        <Link to="/stock" className="back-link" style={{ margin: 0 }}>
                            <ArrowLeft size={18} />
                            Back to Dashboard
                        </Link>
                    </div>
                </div>

                {/* Type Filter Tabs */}
                <div className="type-filter-tabs">
                    {Object.entries(REQUISITION_TYPES).map(([key, config]) => {
                        const TypeIcon = config.icon;
                        const count = key === 'all'
                            ? Object.values(typeCounts).reduce((a, b) => a + b, 0)
                            : (typeCounts[key] || 0);
                        return (
                            <button
                                key={key}
                                className={`type-filter-tab ${typeFilter === key ? 'active' : ''}`}
                                onClick={() => setTypeFilter(key)}
                                style={{ '--tab-color': config.color }}
                            >
                                <TypeIcon size={16} />
                                <span>{config.label}</span>
                                {count > 0 && <span className="type-count">{count}</span>}
                            </button>
                        );
                    })}
                </div>

                {/* Status Tabs */}
                <div className="status-tabs">
                    {['Pending', 'Approved', 'InTransit', 'Fulfilled', 'Rejected'].map(status => (
                        <button
                            key={status}
                            className={`status-tab ${statusFilter === status ? 'active' : ''}`}
                            onClick={() => setStatusFilter(status)}
                        >
                            {status === 'InTransit' ? 'In Transit' : status}
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
                                <div key={req._id} className={`requisition-card ${req.requisitionType ? `req-type-${req.requisitionType.toLowerCase()}` : ''}`}>
                                    <div className="requisition-header">
                                        <div className="req-id-section">
                                            <div className="req-id">
                                                <ClipboardList size={14} />
                                                <span>{req.requisitionNumber || '#REQ'}</span>
                                            </div>
                                            <span className={`activity-badge ${getTypeBadgeClass(req.requisitionType)}`}>
                                                {getTypeIcon(req.requisitionType)}
                                                {getRequisitionTypeLabel(req.requisitionType)}
                                            </span>
                                        </div>
                                        <div className="req-status-section">
                                            <span className={`activity-badge badge-${req.status.toLowerCase()}`}>
                                                {req.status === 'InTransit' ? 'In Transit' : req.status}
                                            </span>
                                            <div className="req-date">
                                                <Clock size={12} />
                                                <span>{new Date(req.createdAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="requisition-body">
                                        <div className="req-detail">
                                            <div className="req-item">
                                                <Package size={14} />
                                                <span className="item-text">
                                                    {req.assetType}
                                                    {req.assetId && (
                                                        <span className="asset-code"> ({req.assetId.assetCode})</span>
                                                    )}
                                                    {req.quantity > 1 && <span> × {req.quantity}</span>}
                                                </span>
                                            </div>
                                            <div className="req-sub">
                                                <User size={12} />
                                                <span>By: {req.requestedBy?.fullName}</span>
                                            </div>
                                        </div>
                                        <div className="req-detail">
                                            <div className="req-sub">
                                                <Warehouse size={12} />
                                                <span>From: {req.sourceSiteId?.siteName} {req.sourceSiteId?.isHeadOffice && '(HO)'}</span>
                                            </div>
                                            <div className="req-sub">
                                                <Building2 size={12} />
                                                <span>To: {req.siteId?.siteName} {req.siteId?.isHeadOffice && '(HO)'}</span>
                                            </div>
                                            {req.transferDirection && req.transferDirection !== 'None' && (
                                                <div className="req-sub direction-badge">
                                                    <ArrowRightLeft size={12} />
                                                    <span>{getDirectionLabel(req.transferDirection)}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* RMA Info Section */}
                                    {req.rmaId && (
                                        <div className="requisition-rma-info">
                                            <div className="rma-badge">
                                                <Wrench size={12} />
                                                <span>RMA: {req.rmaId.rmaNumber}</span>
                                            </div>
                                            {req.rmaId.replacementSource && (
                                                <span className="rma-source">Source: {req.rmaId.replacementSource}</span>
                                            )}
                                        </div>
                                    )}

                                    {/* Ticket Info */}
                                    {req.ticketId && (
                                        <div className="requisition-ticket-info">
                                            <Ticket size={12} />
                                            <span>Ticket: #{req.ticketId.ticketNumber}</span>
                                            {req.ticketId.title && (
                                                <span className="ticket-title">- {req.ticketId.title}</span>
                                            )}
                                        </div>
                                    )}

                                    {req.comments && (
                                        <div className="requisition-note">
                                            <strong>Note:</strong> {req.comments}
                                        </div>
                                    )}

                                    <div className="requisition-actions">
                                        {req.status === 'Pending' && req.requisitionType !== 'RepairedItemTransfer' && (
                                            <>
                                                <button className="btn btn-primary" onClick={() => handleApprove(req._id)}>
                                                    <CheckCircle2 size={14} /> Approve
                                                </button>
                                                <button className="btn btn-secondary btn-danger" onClick={() => handleReject(req._id)}>
                                                    <XCircle size={14} /> Reject
                                                </button>
                                            </>
                                        )}
                                        {req.status === 'Approved' && req.requisitionType === 'StockRequest' && (
                                            <button
                                                className="btn btn-success"
                                                onClick={() => navigate(`/tickets/${req.ticketId?._id}`)}
                                            >
                                                <Package size={14} /> Fulfill
                                            </button>
                                        )}
                                        {req.ticketId && (
                                            <button
                                                className="btn btn-secondary btn-outline"
                                                onClick={() => navigate(`/tickets/${req.ticketId._id}`)}
                                            >
                                                View Ticket
                                            </button>
                                        )}
                                        {req.rmaId && !req.ticketId && (
                                            <button
                                                className="btn btn-secondary btn-outline"
                                                onClick={() => navigate('/assets/rma')}
                                            >
                                                View RMA Records
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="empty-state-card">
                                <ClipboardList size={32} className="empty-icon" />
                                <p>No {statusFilter.toLowerCase()} {typeFilter !== 'all' ? REQUISITION_TYPES[typeFilter]?.label.toLowerCase() : 'requisitions'}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Pagination */}
                {pagination.pages > 1 && (
                    <div className="pagination-container">
                        <button
                            className="btn btn-secondary"
                            disabled={pagination.page === 1}
                            onClick={() => fetchData(pagination.page - 1)}
                        >
                            Previous
                        </button>
                        <span className="pagination-info">
                            Page {pagination.page} of {pagination.pages}
                        </span>
                        <button
                            className="btn btn-secondary"
                            disabled={pagination.page === pagination.pages}
                            onClick={() => fetchData(pagination.page + 1)}
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
