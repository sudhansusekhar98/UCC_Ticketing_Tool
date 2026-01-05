import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Plus,
    Search,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    MapPin,
    Edit,
    Trash2,
    ExternalLink,
} from 'lucide-react';
import { sitesApi } from '../../services/api';
import useAuthStore from '../../context/authStore';
import toast from 'react-hot-toast';
import './Sites.css';

export default function SitesList() {
    const [sites, setSites] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [cityFilter, setCityFilter] = useState('');
    const [cities, setCities] = useState([]);
    const [page, setPage] = useState(1);
    const pageSize = 15;
    const navigate = useNavigate();
    const { hasRole } = useAuthStore();

    const canCreate = hasRole(['Admin', 'Supervisor']);
    const canEdit = hasRole(['Admin', 'Supervisor']);
    const canDelete = hasRole(['Admin']);

    useEffect(() => {
        loadCities();
    }, []);

    useEffect(() => {
        fetchSites();
    }, [page, cityFilter]);

    const loadCities = async () => {
        try {
            const response = await sitesApi.getCities();
            // Handle Express response format
            setCities(response.data.data || response.data || []);
        } catch (error) {
            console.error('Failed to load cities', error);
        }
    };

    const fetchSites = async () => {
        setLoading(true);
        try {
            const response = await sitesApi.getAll({
                page,
                limit: pageSize,
                city: cityFilter || undefined,
                isActive: true,
            });
            // Handle Express response format
            const siteData = response.data.data || response.data.items || response.data || [];
            const total = response.data.pagination?.total || response.data.totalCount || siteData.length;
            
            // Map to expected format
            const mappedSites = siteData.map(s => ({
                ...s,
                siteId: s._id || s.siteId
            }));
            
            setSites(mappedSites);
            setTotalCount(total);
        } catch (error) {
            toast.error('Failed to load sites');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        setPage(1);
        fetchSites();
    };

    const handleDelete = async (id, name) => {
        if (!confirm(`Are you sure you want to delete site "${name}"?`)) return;

        try {
            await sitesApi.delete(id);
            toast.success('Site deleted successfully');
            fetchSites();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete site');
        }
    };

    const filteredSites = sites.filter(site =>
        site.siteName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        site.city.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPages = Math.ceil(totalCount / pageSize);

    return (
        <div className="page-container animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Sites</h1>
                    <p className="page-subtitle">
                        {totalCount} total sites
                    </p>
                </div>
                {canCreate && (
                    <Link to="/sites/new" className="btn btn-primary">
                        <Plus size={18} />
                        Add Site
                    </Link>
                )}
            </div>

            {/* Filters */}
            <div className="filter-bar glass-card compact">
                <div className="search-filter-row">
                    <div className="search-box large">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Search sites..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        className="form-select compact-select"
                        value={cityFilter}
                        onChange={(e) => { setCityFilter(e.target.value); setPage(1); }}
                    >
                        <option value="">All Cities</option>
                        {cities.map(city => (
                            <option key={city} value={city}>{city}</option>
                        ))}
                    </select>
                    <button className="btn btn-secondary btn-icon" onClick={fetchSites}>
                        <RefreshCw size={18} />
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="table-wrapper glass-card">
                {loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                    </div>
                ) : filteredSites.length === 0 ? (
                    <div className="empty-state">
                        <MapPin size={48} />
                        <p>No sites found</p>
                    </div>
                ) : (
                    <>
                        <table className="data-table compact">
                            <thead>
                                <tr>
                                    <th>Site Name</th>
                                    <th>Site Unique ID</th>
                                    <th>City</th>
                                    <th>Zone / Ward</th>
                                    <th>Address</th>
                                    <th>Contact</th>
                                    <th>Status</th>
                                    <th className="actions-col">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSites.map((site) => (
                                    <tr key={site.siteId}>
                                        <td>
                                            <div className="cell-primary">{site.siteName}</div>
                                        </td>
                                        <td>
                                            <div className="cell-primary">{site.siteUniqueID}</div>
                                        </td>
                                        <td>{site.city}</td>
                                        <td>
                                            <span className="cell-secondary">
                                                {site.zone && `${site.zone}`}
                                                {site.ward && ` / ${site.ward}`}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="cell-truncate">{site.address || '—'}</span>
                                        </td>
                                        <td>
                                            <div className="contact-cell">
                                                {site.contactPerson && <span>{site.contactPerson}</span>}
                                                {site.contactPhone && <span className="cell-secondary">{site.contactPhone}</span>}
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge ${site.isActive ? 'badge-success' : 'badge-danger'}`}>
                                                {site.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="actions-col">
                                            <div className="action-buttons">
                                                {canEdit && (
                                                    <Link to={`/sites/${site.siteId}/edit`} className="btn btn-icon btn-ghost" title="Edit">
                                                        <Edit size={16} />
                                                    </Link>
                                                )}
                                                {canDelete && (
                                                    <button
                                                        className="btn btn-icon btn-ghost text-danger"
                                                        onClick={() => handleDelete(site.siteId, site.siteName)}
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {totalPages > 1 && (
                            <div className="pagination">
                                <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => setPage(p => p - 1)}
                                    disabled={page === 1}
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                <span className="page-info">
                                    Page {page} of {totalPages}
                                </span>
                                <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => setPage(p => p + 1)}
                                    disabled={page === totalPages}
                                >
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
