import { useState, useEffect } from 'react';
import {
    Mail,
    Search,
    Filter,
    Loader,
    RefreshCw,
    XCircle,
    CheckCircle,
    ExternalLink
} from 'lucide-react';
import { notificationsApi } from '../../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import './NotificationLogs.css';

export default function NotificationLogs({ embedded = false }) {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        pages: 0
    });

    const categories = [
        'Account',
        'TicketAssignment',
        'TicketEscalation',
        'TicketStatus',
        'RMA',
        'BreachWarning',
        'SLABreach',
        'PasswordReset'
    ];

    useEffect(() => {
        fetchLogs();
    }, [pagination.page, categoryFilter, typeFilter, searchTerm]);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const params = {
                page: pagination.page,
                limit: pagination.limit,
                search: searchTerm,
            };

            if (categoryFilter !== 'all') {
                params.category = categoryFilter;
            }
            if (typeFilter !== 'all') {
                params.type = typeFilter;
            }

            const response = await notificationsApi.getLogs(params);

            if (response.data?.success) {
                setLogs(response.data.data || []);
                if (response.data.pagination) {
                    setPagination(prev => ({
                        ...prev,
                        ...response.data.pagination
                    }));
                }
            }
        } catch (error) {
            toast.error('Failed to load notification logs');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        setPagination(prev => ({ ...prev, page: 1 }));
    };
    const getStatusBadge = (status) => {
        if (status === 'Sent') {
            return <span className="status-badge success"><CheckCircle size={14} /> Sent</span>;
        } else {
            return <span className="status-badge error"><XCircle size={14} /> Failed</span>;
        }
    };

    // Quick method to get category display name
    const formatCategory = (cat) => {
        return cat.replace(/([A-Z])/g, ' $1').trim();
    };

    return (
        <div className={`notification-logs ${embedded ? 'embedded' : ''}`}>
            {!embedded && (
                <div className="page-header">
                    <div className="header-content">
                        <div className="header-icon">
                            <Mail size={24} />
                        </div>
                        <div>
                            <h1>Notification Logs</h1>
                            <p>View history of all emails and system notifications</p>
                        </div>
                    </div>
                    <button className="btn-secondary" onClick={fetchLogs}>
                        <RefreshCw size={18} />
                        Refresh
                    </button>
                </div>
            )}

            {/* Filters */}
            <div className="filters-bar glass-card">
                <form onSubmit={handleSearch} className="search-box">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Search recipient, subject..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </form>

                <div className="filter-controls">
                    <div className="filter-select-wrapper">
                        <Filter size={16} />
                        <select
                            className="filter-select"
                            value={typeFilter}
                            onChange={(e) => {
                                setTypeFilter(e.target.value);
                                setPagination(prev => ({ ...prev, page: 1 }));
                            }}
                        >
                            <option value="all">All Types</option>
                            <option value="Email">Email</option>
                            <option value="System">System</option>
                        </select>
                    </div>

                    <div className="filter-select-wrapper">
                        <Filter size={16} />
                        <select
                            className="filter-select"
                            value={categoryFilter}
                            onChange={(e) => {
                                setCategoryFilter(e.target.value);
                                setPagination(prev => ({ ...prev, page: 1 }));
                            }}
                        >
                            <option value="all">All Categories</option>
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{formatCategory(cat)}</option>
                            ))}
                        </select>
                    </div>

                    <div className="results-count">
                        <span>{pagination.total}</span> logs
                    </div>
                </div>
            </div>

            <div className="logs-container glass-card">
                {loading && logs.length === 0 ? (
                    <div className="loading-state">
                        <Loader size={32} className="animate-spin" />
                        <p>Loading logs...</p>
                    </div>
                ) : logs.length === 0 ? (
                    <div className="empty-state">
                        <Mail size={48} />
                        <h3>No logs found</h3>
                        <p>Try adjusting your search or filters</p>
                    </div>
                ) : (
                    <>
                        <div className="logs-table-wrapper">
                            <table className="logs-table">
                                <thead>
                                    <tr>
                                        <th>Type</th>
                                        <th>Status</th>
                                        <th>Date & Time</th>
                                        <th>Recipient</th>
                                        <th>Category</th>
                                        <th>Subject</th>
                                        <th>Related Ticket</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(logs || []).map(log => (
                                        <tr key={log._id}>
                                            <td>
                                                <span className={`category-badge ${log.type === 'Email' ? 'warning' : 'info'}`} style={{ fontSize: '0.8rem' }}>
                                                    {log.type || 'Email'}
                                                </span>
                                            </td>
                                            <td>{getStatusBadge(log.status)}</td>
                                            <td>
                                                <div className="datetime">
                                                    <span className="date">
                                                        {log.sentAt ? format(new Date(log.sentAt), 'MMM dd, yyyy') : '-'}
                                                    </span>
                                                    <span className="time">
                                                        {log.sentAt ? format(new Date(log.sentAt), 'HH:mm:ss') : ''}
                                                    </span>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="recipient-info">
                                                    <span className="email">{log.recipient}</span>
                                                    {log.recipientId && typeof log.recipientId === 'object' && log.recipientId.fullName && (
                                                        <span className="user-name">{log.recipientId.fullName}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <span className="category-badge">{formatCategory(log.category)}</span>
                                            </td>
                                            <td>
                                                <div className="subject-cell" title={log.subject}>
                                                    {log.subject}
                                                    {log.error && (
                                                        <div className="error-msg">{log.error}</div>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                {log.relatedTicketId ? (
                                                    <Link to={`/tickets/${log.relatedTicketId}`} className="ticket-link">
                                                        <ExternalLink size={14} />
                                                        View Ticket
                                                    </Link>
                                                ) : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="pagination">
                            <span className="page-info">
                                Page {pagination.page} of {pagination.pages} ({pagination.total} logs)
                            </span>
                            <div className="pagination-controls">
                                <button
                                    className="btn-page"
                                    disabled={pagination.page === 1}
                                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                                >
                                    Previous
                                </button>
                                <button
                                    className="btn-page"
                                    disabled={pagination.page === pagination.pages}
                                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </>
                )
                }
            </div >
        </div >
    );
}
