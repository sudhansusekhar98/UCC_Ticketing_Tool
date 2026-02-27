import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    RotateCcw,
    RefreshCw,
    Search,
    ChevronLeft,
    ChevronRight,
    Clock,
    CheckCircle,
    XCircle,
    Package,
    Truck,
    Download,
    ArrowLeft,
    ExternalLink,
    AlertCircle,
    LayoutGrid,
    List,
    Send,
    Building,
    MapPin,
    Settings
} from 'lucide-react';
import { rmaApi, sitesApi } from '../../services/api';
import useAuthStore from '../../context/authStore';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import './RMARecords.css';

const RMA_STATUS_CONFIG = {
    'Requested': { color: 'warning', icon: Clock, label: 'Awaiting Approval' },
    'Approved': { color: 'info', icon: CheckCircle, label: 'Approved' },
    'Rejected': { color: 'danger', icon: XCircle, label: 'Rejected' },
    // New simplified workflow
    'SentToServiceCenter': { color: 'primary', icon: Send, label: 'Sent to Service Center' },
    'SentToHO': { color: 'warning', icon: Building, label: 'Sent to HO' },
    'ReceivedAtHO': { color: 'info', icon: Package, label: 'Received at HO' },
    'SentForRepairFromHO': { color: 'primary', icon: Send, label: 'Sent to SC from HO' },
    'ItemRepairedAtHO': { color: 'info', icon: CheckCircle, label: 'Repaired (at HO)' },
    'ReturnShippedToSite': { color: 'primary', icon: Truck, label: 'Shipped to Site' },
    'ReceivedAtSite': { color: 'info', icon: MapPin, label: 'Received at Site' },
    'RepairedReceivedAtSite': { color: 'info', icon: MapPin, label: 'Repaired (at Site)' },
    'AddToSiteStock': { color: 'success', icon: Package, label: 'Added to Site Stock' },
    'Installed': { color: 'success', icon: Settings, label: 'Installed' },
    // Replacement workflow
    'ReplacementRequisitionRaised': { color: 'info', icon: Package, label: 'Requisition Raised' },
    'ReplacementDispatched': { color: 'primary', icon: Truck, label: 'Replacement Dispatched' },
    'ReplacementReceivedAtSite': { color: 'info', icon: MapPin, label: 'Replacement Received' },
    // Legacy statuses (backward compat)
    'Ordered': { color: 'primary', icon: Package, label: 'Ordered from Vendor' },
    'Dispatched': { color: 'primary', icon: Truck, label: 'In Transit' },
    'Received': { color: 'info', icon: Download, label: 'Received' },
    'AwaitingStockTransfer': { color: 'warning', icon: Clock, label: 'Awaiting HO Transfer' },
    'StockInTransit': { color: 'primary', icon: Truck, label: 'Stock In Transit' },
    'StockReceived': { color: 'info', icon: Download, label: 'Stock Received' },
    'InRepair': { color: 'warning', icon: RefreshCw, label: 'In Repair' },
    'Repaired': { color: 'info', icon: CheckCircle, label: 'Repaired' },
    'RepairedItemEnRoute': { color: 'primary', icon: Truck, label: 'Repaired Item En Route' },
    'RepairedItemReceived': { color: 'info', icon: Download, label: 'Repaired Item Received' },
    'TransferredToSiteStore': { color: 'success', icon: Package, label: 'Transferred to Site' },
    'TransferredToHOStock': { color: 'success', icon: Package, label: 'Transferred to HO' },
    'Discarded': { color: 'danger', icon: XCircle, label: 'Discarded' }
};

export default function RMARecords() {
    const [rmas, setRmas] = useState([]);
    const [ongoingRmas, setOngoingRmas] = useState([]);
    const [completedRmas, setCompletedRmas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [siteFilter, setSiteFilter] = useState('');
    const [sites, setSites] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [activeTab, setActiveTab] = useState('ongoing');
    const [viewMode, setViewMode] = useState(localStorage.getItem('rmaViewMode') || 'grid');
    const navigate = useNavigate();
    const { hasRole } = useAuthStore();

    useEffect(() => {
        localStorage.setItem('rmaViewMode', viewMode);
    }, [viewMode]);

    useEffect(() => {
        loadSites();
    }, []);

    useEffect(() => {
        fetchRMAs();
    }, [page, statusFilter, siteFilter]);

    const loadSites = async () => {
        try {
            const response = await sitesApi.getDropdown();
            const siteData = response.data.data || response.data || [];
            setSites(siteData.map(s => ({
                value: s._id || s.value || s.siteId,
                label: s.siteName || s.label
            })));
        } catch (error) {
            console.error('Failed to load sites', error);
        }
    };

    const COMPLETED_STATUSES = ['Installed', 'Rejected', 'Discarded'];

    const fetchRMAs = async () => {
        setLoading(true);
        try {
            const response = await rmaApi.getAll({
                page,
                limit: 50,
                status: statusFilter || undefined,
                siteId: siteFilter || undefined
            });

            const data = response.data;
            const allRmas = data.data || [];
            setRmas(allRmas);

            // Split into ongoing and completed client-side
            const ongoing = allRmas.filter(r => !COMPLETED_STATUSES.includes(r.status));
            const completed = allRmas.filter(r => COMPLETED_STATUSES.includes(r.status));
            setOngoingRmas(ongoing);
            setCompletedRmas(completed);

            setTotalCount(data.pagination?.total || 0);
            setTotalPages(data.pagination?.pages || 1);
        } catch (error) {
            toast.error('Failed to load RMA records');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        const config = RMA_STATUS_CONFIG[status] || { color: 'secondary', icon: Clock, label: status };
        const Icon = config.icon;
        return (
            <span className={`badge badge-${config.color} rma-status-badge`}>
                <Icon size={12} />
                {config.label}
            </span>
        );
    };

    const filteredRmas = activeTab === 'ongoing' ? ongoingRmas : completedRmas;

    const searchedRmas = searchTerm
        ? filteredRmas.filter(rma =>
            rma.ticketId?.ticketNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            rma.originalAssetId?.assetCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            rma.originalAssetId?.ipAddress?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            rma.siteId?.siteName?.toLowerCase().includes(searchTerm.toLowerCase())
        )
        : filteredRmas;

    return (
        <div className="rma-records-page animate-fade-in">
            <div className="page-header">
                <div className="header-left">
                    <div>
                        <h1 className="page-title">RMA Records &nbsp;</h1>
                        <p className="page-subtitle">
                            {totalCount} total RMA requests
                        </p>
                    </div>
                </div>
                <div className="header-actions">
                    <div className="view-toggle">
                        <button
                            className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                            onClick={() => setViewMode('grid')}
                            title="Grid View"
                        >
                            <LayoutGrid size={18} />
                        </button>
                        <button
                            className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                            onClick={() => setViewMode('list')}
                            title="List View"
                        >
                            <List size={18} />
                        </button>
                    </div>
                    <Link to="/assets" className="btn btn-secondary">
                        <ArrowLeft size={18} />
                        Back to Assets
                    </Link>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="rma-stats-row">
                <div className="rma-stat-card ongoing">
                    <div className="stat-icon">
                        <Clock size={24} />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{ongoingRmas.length}</div>
                        <div className="stat-label">Ongoing RMAs</div>
                    </div>
                </div>
                <div className="rma-stat-card completed">
                    <div className="stat-icon">
                        <CheckCircle size={24} />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{completedRmas.filter(r => r.status === 'Installed').length}</div>
                        <div className="stat-label">Completed</div>
                    </div>
                </div>
                <div className="rma-stat-card rejected">
                    <div className="stat-icon">
                        <XCircle size={24} />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{completedRmas.filter(r => r.status === 'Rejected').length}</div>
                        <div className="stat-label">Rejected</div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="rma-tabs">
                <button
                    className={`rma-tab ${activeTab === 'ongoing' ? 'active' : ''}`}
                    onClick={() => setActiveTab('ongoing')}
                >
                    <Clock size={16} />
                    Ongoing ({ongoingRmas.length})
                </button>
                <button
                    className={`rma-tab ${activeTab === 'history' ? 'active' : ''}`}
                    onClick={() => setActiveTab('history')}
                >
                    <RotateCcw size={16} />
                    History ({completedRmas.length})
                </button>
            </div>

            {/* Filters */}
            <div className="filter-bar glass-card compact">
                <div className="filter-bar-content">
                    <div className="search-box small">
                        <Search size={16} />
                        <input
                            type="text"
                            placeholder="Search by ticket, asset, or site..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="filters-inline">
                        <select
                            className="filter-select"
                            value={siteFilter}
                            onChange={(e) => { setSiteFilter(e.target.value); setPage(1); }}
                        >
                            <option value="">All Sites</option>
                            {sites.map(site => (
                                <option key={site.value} value={site.value}>{site.label}</option>
                            ))}
                        </select>
                        <select
                            className="filter-select"
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                        >
                            <option value="">All Statuses</option>
                            <optgroup label="Workflow">
                                <option value="Requested">Requested</option>
                                <option value="Approved">Approved</option>
                                <option value="SentToServiceCenter">Sent to Service Center</option>
                                <option value="SentToHO">Sent to HO</option>
                                <option value="ReceivedAtHO">Received at HO</option>
                                <option value="SentForRepairFromHO">Sent to SC from HO</option>
                                <option value="ItemRepairedAtHO">Repaired (at HO)</option>
                                <option value="ReturnShippedToSite">Shipped to Site</option>
                                <option value="ReceivedAtSite">Received at Site</option>
                                <option value="Installed">Installed</option>
                                <option value="ReplacementRequisitionRaised">Requisition Raised</option>
                                <option value="ReplacementDispatched">Replacement Dispatched</option>
                                <option value="ReplacementReceivedAtSite">Replacement Received</option>
                                <option value="Rejected">Rejected</option>
                            </optgroup>
                            <optgroup label="Legacy">
                                <option value="Ordered">Ordered</option>
                                <option value="Dispatched">Dispatched</option>
                                <option value="Received">Received</option>
                                <option value="InRepair">In Repair</option>
                                <option value="Repaired">Repaired</option>
                            </optgroup>
                        </select>
                    </div>
                    <div className="filter-actions-inline">
                        <button className="btn btn-secondary icon-btn-small" onClick={fetchRMAs} title="Refresh">
                            <RefreshCw size={14} />
                        </button>
                    </div>
                </div>
            </div>

            {/* RMA List */}
            <div className="rma-list glass-card">
                {loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                    </div>
                ) : searchedRmas.length === 0 ? (
                    <div className="empty-state">
                        <RotateCcw size={48} />
                        <p>No {activeTab === 'ongoing' ? 'ongoing' : 'historical'} RMA records found</p>
                    </div>
                ) : viewMode === 'list' ? (
                    /* LIST VIEW */
                    <div className="rma-list-view">
                        {searchedRmas.map((rma) => (
                            <div key={rma._id} className="rma-list-item" onClick={() => navigate(`/tickets/${rma.ticketId?._id}`)}>
                                <div className="list-col">
                                    <span className="list-label">Ticket</span>
                                    <span className="ticket-pill">{rma.ticketId?.ticketNumber || 'N/A'}</span>
                                    <span className="list-value" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                        {format(new Date(rma.createdAt), 'MMM dd, yyyy')}
                                    </span>
                                </div>

                                <div className="list-col">
                                    <span className="list-label">Asset / Site</span>
                                    <span className="list-value">{rma.originalAssetId?.assetCode || 'N/A'} ({rma.originalAssetId?.assetType})</span>
                                    <span className="list-value" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                        {rma.siteId?.siteName}
                                    </span>
                                </div>

                                <div className="list-col">
                                    <span className="list-label">Location</span>
                                    <span className="list-value">
                                        {rma.originalAssetId?.locationName || rma.originalAssetId?.locationDescription || 'N/A'}
                                    </span>
                                </div>

                                <div className="list-col">
                                    <span className="list-label">Status</span>
                                    {getStatusBadge(rma.status)}
                                </div>

                                <div className="rma-list-actions">
                                    <button
                                        className="btn btn-ghost btn-sm"
                                        onClick={(e) => { e.stopPropagation(); navigate(`/tickets/${rma.ticketId?._id}`); }}
                                    >
                                        <ExternalLink size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    /* GRID VIEW */
                    <div className="rma-cards">
                        {searchedRmas.map((rma) => (
                            <div
                                key={rma._id}
                                className="rma-card"
                                onClick={() => navigate(`/tickets/${rma.ticketId?._id}`)}
                            >
                                <div className="rma-card-header">
                                    <div className="rma-ticket-info">
                                        <span className="ticket-number">
                                            {rma.ticketId?.ticketNumber || 'N/A'}
                                        </span>
                                        {getStatusBadge(rma.status)}
                                    </div>
                                    <div className="rma-date">
                                        {format(new Date(rma.createdAt), 'MMM dd, yyyy')}
                                    </div>
                                </div>

                                <div className="rma-card-body">
                                    <div className="rma-asset-info">
                                        <div className="info-header">Asset Details</div>
                                        <div className="info-row">
                                            <span className="label">Code</span>
                                            <span className="value">{rma.originalAssetId?.assetCode || 'N/A'}</span>
                                        </div>
                                        <div className="info-row">
                                            <span className="label">Type</span>
                                            <span className="value">{rma.originalAssetId?.assetType || 'N/A'}</span>
                                        </div>
                                        <div className="info-row">
                                            <span className="label">IP Addr</span>
                                            <span className="value monospace">{rma.originalDetailsSnapshot?.ipAddress || 'N/A'}</span>
                                        </div>
                                        <div className="info-row">
                                            <span className="label">Serial No</span>
                                            <span className="value monospace">{rma.originalDetailsSnapshot?.serialNumber || 'N/A'}</span>
                                        </div>
                                    </div>

                                    <div className="rma-site-info">
                                        <div className="info-header">Location Info</div>
                                        <div className="info-row">
                                            <span className="label">Site</span>
                                            <span className="value" title={rma.siteId?.siteName}>{rma.siteId?.siteName || 'N/A'}</span>
                                        </div>
                                        <div className="info-row">
                                            <span className="label">Location</span>
                                            <span className="value">{rma.originalAssetId?.locationName || rma.originalAssetId?.locationDescription || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Timeline preview at bottom */}
                                <div className="rma-timeline-preview">
                                    {rma.timeline?.slice(-5).map((step, idx) => (
                                        <div
                                            key={idx}
                                            className={`timeline-dot ${step.status.toLowerCase()} ${idx === rma.timeline.length - 1 ? 'active' : ''}`}
                                            title={`${step.status} - ${step.changedBy?.fullName || ''}`}
                                        >
                                        </div>
                                    ))}
                                </div>

                                <div className="rma-card-footer">
                                    <div className="rma-reason">
                                        <AlertCircle size={14} />
                                        <span>{rma.requestReason || 'No reason provided'}</span>
                                    </div>

                                    <Link
                                        to={`/tickets/${rma.ticketId?._id}`}
                                        className="rma-view-link"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        View Ticket <ExternalLink size={14} />
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="pagination">
                    <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setPage(p => p - 1)}
                        disabled={page === 1}
                    >
                        <ChevronLeft size={18} />
                        Previous
                    </button>
                    <span className="page-info">
                        Page {page} of {totalPages}
                    </span>
                    <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setPage(p => p + 1)}
                        disabled={page === totalPages}
                    >
                        Next
                        <ChevronRight size={18} />
                    </button>
                </div>
            )}
        </div>
    );
}
