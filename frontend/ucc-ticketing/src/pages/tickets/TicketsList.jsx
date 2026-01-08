import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import {
    Plus,
    Search,
    Filter,
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

export default function TicketsList() {
    const [tickets, setTickets] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [showFilters, setShowFilters] = useState(false);
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const { hasRole, hasRight } = useAuthStore();

    // Filter states
    const [filters, setFilters] = useState({
        status: searchParams.get('status') || '',
        priority: searchParams.get('priority') || '',
        category: searchParams.get('category') || '',
        assignedTo: searchParams.get('assignedTo') || '',
        siteId: searchParams.get('siteId') || '',
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

    const canCreate = hasRole(['Admin', 'Supervisor', 'Dispatcher']) || hasRight('CREATE_TICKET');

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
        if (filters.searchTerm) params.set('search', filters.searchTerm);
        params.set('page', '1');
        setSearchParams(params);
        setFilters({ ...filters, page: 1 });
    };

    const handleClearFilters = () => {
        setFilters({
            status: '',
            priority: '',
            category: '',
            assignedTo: '',
            siteId: '',
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

    const getSLAStatusClass = (slaStatus) => {
        return `sla-${slaStatus.toLowerCase()}`;
    };

    const totalPages = Math.ceil(totalCount / filters.pageSize);

    return (
        <div className="tickets-page animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Tickets</h1>
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

            {/* Search & Filter Bar */}
            <div className="filter-bar glass-card">
                <div className="search-filter-row">
                    <div className="search-box large">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Search by ticket number, title, or asset..."
                            value={filters.searchTerm}
                            onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        />
                    </div>
                    <button className="btn btn-secondary" onClick={() => setShowFilters(!showFilters)}>
                        <Filter size={18} />
                        Filters
                    </button>
                    <button className="btn btn-secondary" onClick={fetchTickets}>
                        <RefreshCw size={18} />
                    </button>
                </div>

                {showFilters && (
                    <div className="filters-panel">
                        <div className="filters-grid">
                            <div className="filter-group">
                                <label>Status</label>
                                <select
                                    value={filters.status}
                                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                    className="form-select"
                                >
                                    <option value="">All Statuses</option>
                                    {statuses.map((s) => (
                                        <option key={s.value} value={s.value}>{s.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="filter-group">
                                <label>Priority</label>
                                <select
                                    value={filters.priority}
                                    onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                                    className="form-select"
                                >
                                    <option value="">All Priorities</option>
                                    {priorities.map((p) => (
                                        <option key={p.value} value={p.value}>{p.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="filter-group">
                                <label>Category</label>
                                <select
                                    value={filters.category}
                                    onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                                    className="form-select"
                                >
                                    <option value="">All Categories</option>
                                    {categories.map((c) => (
                                        <option key={c.value} value={c.value}>{c.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="filter-group">
                                <label>Assigned To</label>
                                <select
                                    value={filters.assignedTo}
                                    onChange={(e) => setFilters({ ...filters, assignedTo: e.target.value })}
                                    className="form-select"
                                >
                                    <option value="">All Engineers</option>
                                    {engineers.map((e) => (
                                        <option key={e.value} value={e.value}>{e.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="filter-group">
                                <label>Site</label>
                                <select
                                    value={filters.siteId}
                                    onChange={(e) => setFilters({ ...filters, siteId: e.target.value })}
                                    className="form-select"
                                >
                                    <option value="">All Sites</option>
                                    {sites.map((s) => (
                                        <option key={s.value} value={s.value}>{s.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="filter-actions">
                            <button className="btn btn-primary" onClick={handleSearch}>
                                Apply Filters
                            </button>
                            <button className="btn btn-ghost" onClick={handleClearFilters}>
                                Clear All
                            </button>
                        </div>
                    </div>
                )}
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
                        <table className="data-table">
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
                                            <span className="badge badge-primary">{ticket.status}</span>
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
                                                {format(new Date(ticket.createdOn), 'MMM dd, HH:mm')}
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
