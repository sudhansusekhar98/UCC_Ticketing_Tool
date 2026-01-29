import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    ArrowRightLeft, Plus, ArrowLeft, CheckCircle2, Truck,
    Clock, User, ChevronRight, Warehouse, MapPin
} from 'lucide-react';
import { stockApi } from '../../services/api';
import toast from 'react-hot-toast';
import './Stock.css';

export default function TransferList() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [transfers, setTransfers] = useState([]);
    const [statusFilter, setStatusFilter] = useState('');
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });

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

    const handleDispatch = async (id) => {
        try {
            await stockApi.dispatchTransfer(id);
            toast.success('Transfer dispatched');
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Dispatch failed');
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
                        <Link to="/stock" className="back-link" style={{ margin: 0 }}>
                            <ArrowLeft size={18} />
                            Back to Dashboard
                        </Link>
                    </div>
                </div>

                {/* Status Filter */}
                <div className="filter-bar">
                    <span className="filter-label">Status:</span>
                    <div className="filter-pills">
                        {['', 'Pending', 'InTransit', 'Completed'].map(status => (
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
                                            <span className="id-label">Transfer</span>
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
                                            <button className="btn btn-primary" onClick={() => handleDispatch(tr._id)}>
                                                <Truck size={14} /> Dispatch
                                            </button>
                                        )}
                                        {tr.status === 'InTransit' && (
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
        </div>
    );
}
