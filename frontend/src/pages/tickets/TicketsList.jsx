import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import {
    Plus,
    Search,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    AlertTriangle,
    Clock,
    ExternalLink,
} from 'lucide-react';
import { ticketsApi, lookupsApi, sitesApi, usersApi } from '../../services/api';
import useAuthStore from '../../context/authStore';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import './Tickets.css';

const safeFormatDate = (date, formatStr) => {
    try {
        if (!date) return '—';
        const d = new Date(date);
        if (isNaN(d.getTime())) return '—';
        return format(d, formatStr);
    } catch (e) {
        return '—';
    }
};

export default function TicketsList() {
    const [tickets, setTickets] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const { hasRole, hasRightForAnySite } = useAuthStore();

    // Filter states
    const [filters, setFilters] = useState({
        status: searchParams.get('status') || '',
        priority: searchParams.get('priority') || '',
        category: searchParams.get('category') || '',
        assignedTo: searchParams.get('assignedTo') || '',
        siteId: searchParams.get('siteId') || '',
        slaStatus: searchParams.get('slaStatus') || '',
        searchTerm: searchParams.get('search') || '',
        page: parseInt(searchParams.get('page')) || 1,
        pageSize: 20,
    });

    // Dropdown options
    const [statuses, setStatuses] = useState([]);
    const [priorities, setPriorities] = useState([]);
    const [categories, setCategories] = useState([]);
    const [engineers, setEngineers] = useState([]);
    const [sites, setSites] = useState([]);

    const isSiteClient = hasRole('SiteClient');
    const canCreate = hasRole(['Admin', 'Supervisor', 'Dispatcher', 'SiteClient']) || hasRightForAnySite('CREATE_TICKET');

    useEffect(() => {
        loadDropdowns();
    }, []);

    useEffect(() => {
        fetchTickets();
    }, [filters.page, searchParams]);

    const loadDropdowns = async () => {
        try {
            const [statusRes, priorityRes, categoryRes, engineersRes, sitesRes] = await Promise.all([
                lookupsApi.getStatuses(),
                lookupsApi.getPriorities(),
                lookupsApi.getCategories(),
                usersApi.getEngineers(),
                sitesApi.getDropdown(),
            ]);
            // Handle both Express (data.data) and .NET (data) response formats
            setStatuses(statusRes.data.data || statusRes.data || []);
            setPriorities(priorityRes.data.data || priorityRes.data || []);
            setCategories(categoryRes.data.data || categoryRes.data || []);

            // Map engineers to expected format
            const engineerData = engineersRes.data.data || engineersRes.data || [];
            setEngineers(engineerData.map(e => ({
                value: e._id || e.value || e.userId,
                label: e.fullName || e.label
            })));

            // Map sites to expected format
            const siteData = sitesRes.data.data || sitesRes.data || [];
            setSites(siteData.map(s => ({
                value: s._id || s.value || s.siteId,
                label: s.siteName || s.label
            })));
        } catch (error) {
            console.error('Failed to load dropdowns', error);
        }
    };

    const fetchTickets = async () => {
        setLoading(true);
        try {
            const response = await ticketsApi.getAll({
                ...filters,
                limit: filters.pageSize, // Map pageSize to limit for backend
                search: filters.searchTerm, // Map searchTerm to search
                isSLABreached: searchParams.get('slaBreached') === 'true' ? true : undefined,
                isEscalated: searchParams.get('escalated') === 'true' ? true : undefined,
                slaStatus: filters.slaStatus || undefined,
            });
            // Handle both Express.js and .NET response formats
            const ticketData = response.data.data || response.data.items || response.data || [];
            const total = response.data.pagination?.total || response.data.totalCount || ticketData.length;

            // Map Express.js fields to frontend expected fields
            const mappedTickets = Array.isArray(ticketData) ? ticketData.map(t => ({
                ...t,
                ticketId: t._id || t.ticketId,
                createdOn: t.createdAt || t.createdOn,
                assetCode: t.assetId?.assetCode || t.assetCode,
                mac: t.assetId?.mac || '',
                siteName: t.assetId?.siteId?.siteName || t.siteName,
                assignedToName: t.assignedTo?.fullName || t.assignedToName,
                slaStatus: t.isSLARestoreBreached ? 'Breached' :
                    (t.isSLAResponseBreached ? 'AtRisk' : 'OnTrack')
            })) : [];

            setTickets(mappedTickets);
            setTotalCount(total);
        } catch (error) {
            toast.error('Failed to load tickets');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        const params = new URLSearchParams();
        if (filters.status) params.set('status', filters.status);
        if (filters.priority) params.set('priority', filters.priority);
        if (filters.category) params.set('category', filters.category);
        if (filters.assignedTo) params.set('assignedTo', filters.assignedTo);
        if (filters.siteId) params.set('siteId', filters.siteId);
        if (filters.slaStatus) params.set('slaStatus', filters.slaStatus);
        if (filters.searchTerm) params.set('search', filters.searchTerm);
        params.set('page', '1');
        setSearchParams(params);
        setFilters({ ...filters, page: 1 });
    };

    // Accepts an explicit filter snapshot — used by dropdowns so they don't hit stale closure
    const handleSearchWith = (f) => {
        const params = new URLSearchParams();
        if (f.status) params.set('status', f.status);
        if (f.priority) params.set('priority', f.priority);
        if (f.category) params.set('category', f.category);
        if (f.assignedTo) params.set('assignedTo', f.assignedTo);
        if (f.siteId) params.set('siteId', f.siteId);
        if (f.slaStatus) params.set('slaStatus', f.slaStatus);
        if (f.searchTerm) params.set('search', f.searchTerm);
        params.set('page', '1');
        setSearchParams(params);
    };

    const handleClearFilters = () => {
        setFilters({
            status: '',
            priority: '',
            category: '',
            assignedTo: '',
            siteId: '',
            slaStatus: '',
            searchTerm: '',
            page: 1,
            pageSize: 20,
        });
        setSearchParams({});
    };

    const handlePageChange = (newPage) => {
        setFilters({ ...filters, page: newPage });
        const params = new URLSearchParams(searchParams);
        params.set('page', newPage.toString());
        setSearchParams(params);
    };

    const getPriorityClass = (priority) => {
        return `priority-${priority.toLowerCase()}`;
    };

    const getSLAStatusClass = (status) => status ? `sla-${status.toLowerCase()}` : '';

    const getStatusClass = (status) => {
        switch (status) {
            case 'Open': return 'badge-info';
            case 'Assigned': return 'badge-primary';
            case 'Acknowledged': return 'badge-warning';
            case 'InProgress': return 'badge-primary';
            case 'Escalated': return 'badge-danger';
            case 'Resolved': return 'badge-success';
            case 'Verified': return 'badge-success';
            case 'Closed': return 'badge-secondary';
            case 'Cancelled': return 'badge-secondary';
            case 'ResolutionRejected': return 'badge-danger';
            default: return 'badge-primary';
        }
    };

    const totalPages = Math.ceil(totalCount / filters.pageSize);

    return (
        <div className="tickets-page animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Tickets &nbsp;</h1>
                    <p className="page-subtitle">
                        Showing {tickets.length} of {totalCount} tickets
                    </p>
                </div>
                <div className="header-actions">
                    {canCreate && (
                        <Link to="/tickets/new" className="btn btn-primary">
                            <Plus size={18} />
                            New Ticket
                        </Link>
                    )}
                </div>
            </div>

            {/* Search & Filter Bar — always visible, changes apply immediately */}
            <div className="filter-bar glass-card">
                <div className="filter-bar-content">
                    <div className="search-box small">
                        <Search size={16} />
                        <input
                            type="text"
                            placeholder="Search ticket, asset..."
                            value={filters.searchTerm}
                            onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        />
                    </div>

                    <div className="filters-inline">
                        <select
                            value={filters.status}
                            onChange={(e) => { const f = { ...filters, status: e.target.value, page: 1 }; setFilters(f); setTimeout(() => handleSearchWith(f), 0); }}
                            className="form-select filter-select"
                        >
                            <option value="">All Statuses</option>
                            {statuses.map((s) => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                        </select>

                        <select
                            value={filters.priority}
                            onChange={(e) => { const f = { ...filters, priority: e.target.value, page: 1 }; setFilters(f); setTimeout(() => handleSearchWith(f), 0); }}
                            className="form-select filter-select"
                        >
                            <option value="">All Priorities</option>
                            {priorities.map((p) => (
                                <option key={p.value} value={p.value}>{p.label}</option>
                            ))}
                        </select>

                        <select
                            value={filters.category}
                            onChange={(e) => { const f = { ...filters, category: e.target.value, page: 1 }; setFilters(f); setTimeout(() => handleSearchWith(f), 0); }}
                            className="form-select filter-select"
                        >
                            <option value="">All Categories</option>
                            {categories.map((c) => (
                                <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                        </select>

                        {/* Assigned To, Site, and SLA filters - Hidden for SiteClient */}
                        {!isSiteClient && (
                            <>
                                <select
                                    value={filters.assignedTo}
                                    onChange={(e) => { const f = { ...filters, assignedTo: e.target.value, page: 1 }; setFilters(f); setTimeout(() => handleSearchWith(f), 0); }}
                                    className="form-select filter-select"
                                >
                                    <option value="">All Engineers</option>
                                    {engineers.map((e) => (
                                        <option key={e.value} value={e.value}>{e.label}</option>
                                    ))}
                                </select>

                                <select
                                    value={filters.siteId}
                                    onChange={(e) => { const f = { ...filters, siteId: e.target.value, page: 1 }; setFilters(f); setTimeout(() => handleSearchWith(f), 0); }}
                                    className="form-select filter-select"
                                >
                                    <option value="">All Sites</option>
                                    {sites.map((s) => (
                                        <option key={s.value} value={s.value}>{s.label}</option>
                                    ))}
                                </select>

                                <select
                                    value={filters.slaStatus}
                                    onChange={(e) => { const f = { ...filters, slaStatus: e.target.value, page: 1 }; setFilters(f); setTimeout(() => handleSearchWith(f), 0); }}
                                    className="form-select filter-select"
                                >
                                    <option value="">All SLA</option>
                                    <option value="Breached">Breached</option>
                                    <option value="AtRisk">At Risk</option>
                                    <option value="OnTrack">On Track</option>
                                </select>
                            </>
                        )}
                    </div>

                    <div className="filter-actions-inline">
                        <button className="btn btn-secondary icon-btn-small" onClick={fetchTickets} title="Refresh">
                            <RefreshCw size={14} />
                        </button>
                        <button className="btn btn-ghost text-btn-small" onClick={handleClearFilters} title="Clear All Filters">
                            Clear
                        </button>
                    </div>
                </div>
            </div>

            {/* Tickets Table */}
            <div className="table-wrapper glass-card">
                {loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                    </div>
                ) : tickets.length === 0 ? (
                    <div className="empty-state">
                        <p>No tickets found</p>
                        {canCreate && (
                            <Link to="/tickets/new" className="btn btn-primary mt-4">
                                Create First Ticket
                            </Link>
                        )}
                    </div>
                ) : (
                    <>
                        {/* Desktop Table View */}
                        <table className="data-table tickets-table hide-on-mobile">
                            <thead>
                                <tr>
                                    <th>Ticket #</th>
                                    <th>Title</th>
                                    <th>Asset / Site</th>
                                    <th>Category</th>
                                    <th>Priority</th>
                                    <th>Status</th>
                                    <th>Assigned To</th>
                                    <th>SLA</th>
                                    <th>Created</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {tickets.map((ticket) => (
                                    <tr key={ticket.ticketId} onClick={() => navigate(`/tickets/${ticket.ticketId}`)}>
                                        <td>
                                            <span className="ticket-number">{ticket.ticketNumber}</span>
                                        </td>
                                        <td>
                                            <div className="ticket-title">{ticket.title}</div>
                                        </td>
                                        <td>
                                            <div className="asset-info">
                                                {ticket.assetCode && <span className="asset-code">{ticket.assetCode}</span>}
                                                {ticket.mac && <span className="asset-mac text-[10px] font-mono opacity-70">({ticket.mac})</span>}
                                                {ticket.siteName && <span className="site-name">{ticket.siteName}</span>}
                                            </div>
                                        </td>
                                        <td>{ticket.category}</td>
                                        <td>
                                            <span className={`badge ${getPriorityClass(ticket.priority)}`}>
                                                {ticket.priority}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge ${getStatusClass(ticket.status)}`}>
                                                {ticket.status}
                                            </span>
                                        </td>
                                        <td>{ticket.assignedToName || '—'}</td>
                                        <td>
                                            <div className={`sla-indicator ${getSLAStatusClass(ticket.slaStatus)}`}>
                                                {ticket.slaStatus === 'Breached' && <AlertTriangle size={14} />}
                                                {ticket.slaStatus === 'AtRisk' && <Clock size={14} />}
                                                <span>{ticket.slaStatus}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="date-text">
                                                {safeFormatDate(ticket.createdOn, 'MMM dd, HH:mm')}
                                            </span>
                                        </td>
                                        <td>
                                            <Link
                                                to={`/tickets/${ticket.ticketId}`}
                                                className="btn btn-icon btn-ghost"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <ExternalLink size={16} />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Mobile Card View */}
                        <div className="mobile-tickets-list show-on-mobile">
                            {tickets.map((ticket) => (
                                <div
                                    className="ticket-mobile-card glass-card"
                                    key={ticket.ticketId}
                                    onClick={() => navigate(`/tickets/${ticket.ticketId}`)}
                                >
                                    <div className="card-top">
                                        <span className="ticket-number">{ticket.ticketNumber}</span>
                                        <div className="card-badges">
                                            <span className={`badge badge-priority ${getPriorityClass(ticket.priority)}`}>
                                                {ticket.priority}
                                            </span>
                                            <span className={`badge badge-status ${getStatusClass(ticket.status)}`}>
                                                {ticket.status}
                                            </span>
                                        </div>
                                    </div>

                                    <h3 className="card-title">{ticket.title}</h3>

                                    <div className="card-details">
                                        <div className="card-detail-item">
                                            <span className="detail-label">Asset:</span>
                                            <span className="detail-value">{ticket.assetCode || '—'}</span>
                                        </div>
                                        <div className="card-detail-item">
                                            <span className="detail-label">Site:</span>
                                            <span className="detail-value text-truncate">{ticket.siteName || '—'}</span>
                                        </div>
                                    </div>

                                    <div className="card-footer">
                                        <div className={`sla-indicator small ${getSLAStatusClass(ticket.slaStatus)}`}>
                                            <span>SLA: {ticket.slaStatus}</span>
                                        </div>
                                        <span className="card-date">
                                            {safeFormatDate(ticket.createdOn, 'MMM dd, HH:mm')}
                                        </span>
                                    </div>

                                    <div className="card-assigned">
                                        <span className="detail-label">Assigned:</span>
                                        <span className="detail-value">{ticket.assignedToName || 'Unassigned'}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="pagination">
                                <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => handlePageChange(filters.page - 1)}
                                    disabled={filters.page === 1}
                                >
                                    <ChevronLeft size={18} />
                                    Previous
                                </button>
                                <span className="page-info">
                                    Page {filters.page} of {totalPages}
                                </span>
                                <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => handlePageChange(filters.page + 1)}
                                    disabled={filters.page === totalPages}
                                >
                                    Next
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
