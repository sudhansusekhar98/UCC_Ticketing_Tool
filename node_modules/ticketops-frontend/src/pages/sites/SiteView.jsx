import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ArrowLeft,
    Edit,
    MapPin,
    Info,
    Calendar,
    Phone,
    User,
    Building2,
    Warehouse,
    CheckCircle2,
    XCircle,
    Monitor,
    Clock
} from 'lucide-react';
import { sitesApi, assetsApi } from '../../services/api';
import useAuthStore from '../../context/authStore';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import './Sites.css';

export default function SiteView() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { hasRole } = useAuthStore();

    const [site, setSite] = useState(null);
    const [assets, setAssets] = useState([]);
    const [totalAssets, setTotalAssets] = useState(0);
    const [statusCounts, setStatusCounts] = useState({ online: 0, offline: 0, passive: 0 });
    const [loading, setLoading] = useState(true);
    const [assetsLoading, setAssetsLoading] = useState(false);
    const [slaPolicies, setSlaPolicies] = useState([]);
    const [slaSource, setSlaSource] = useState('global');

    useEffect(() => {
        if (id) {
            loadSite();
            loadAssets();
            loadSLA();
        }
    }, [id]);

    const loadSLA = async () => {
        try {
            const response = await sitesApi.getSLA(id);
            setSlaPolicies(response.data.data || []);
            setSlaSource(response.data.source || 'global');
        } catch (error) {
            console.error('Failed to load SLA', error);
        }
    };

    const formatMin = (min) => {
        if (!min && min !== 0) return '—';
        if (min < 60) return `${min}m`;
        const h = Math.floor(min / 60);
        const m = min % 60;
        return m > 0 ? `${h}h ${m}m` : `${h}h`;
    };

    const PRIORITY_COLORS = {
        P1: '#ef4444', P2: '#f59e0b', P3: '#3b82f6', P4: '#6b7280'
    };
    const PRIORITY_LABELS = {
        P1: 'Critical', P2: 'High', P3: 'Medium', P4: 'Low'
    };

    const loadSite = async () => {
        setLoading(true);
        try {
            const response = await sitesApi.getById(id);
            setSite(response.data.data);
        } catch (error) {
            toast.error('Failed to load site information');
            navigate('/sites');
        } finally {
            setLoading(false);
        }
    };

    const loadAssets = async () => {
        setAssetsLoading(true);
        try {
            // Fetch first 10 assets for the preview but get full counts
            const response = await assetsApi.getAll({ siteId: id, limit: 10 });
            setAssets(response.data.data || []);
            setTotalAssets(response.data.pagination?.total || 0);
            setStatusCounts(response.data.statusCounts || { online: 0, offline: 0, passive: 0 });
        } catch (error) {
            console.error('Failed to load site assets', error);
        } finally {
            setAssetsLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="loading-state">
                <div className="spinner"></div>
            </div>
        );
    }

    if (!site) {
        return (
            <div className="page-container">
                <div className="text-center" style={{ padding: '3rem 0' }}>
                    <h2>Site not found</h2>
                    <Link to="/sites" className="btn btn-primary mt-4">Back to Sites</Link>
                </div>
            </div>
        );
    }

    const canEdit = hasRole(['Admin', 'Supervisor']);

    return (
        <div className="page-container form-view site-view-page animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">{site.siteName}</h1>
                    <p className="page-subtitle">
                        {site.city} {site.zone ? `| ${site.zone}` : ''} {site.ward ? `| ${site.ward}` : ''}
                    </p>
                </div>
                <div className="flex gap-2">
                    {canEdit && (
                        <Link to={`/sites/${id}/edit`} className="btn btn-primary">
                            <Edit size={18} />
                            Edit Site
                        </Link>
                    )}
                    <Link to="/sites" className="btn btn-secondary">
                        <ArrowLeft size={18} />
                        Back to Sites
                    </Link>
                </div>
            </div>

            <div className="view-grid">
                {/* Site Details Card */}
                <div className="info-card glass-card">
                    <h2 className="section-title">
                        <Building2 size={20} />
                        Site Information
                    </h2>

                    <div className="view-details-grid">
                        <div className="detail-item">
                            <label>Site Unique ID</label>
                            <p className="font-mono">{site.siteUniqueID}</p>
                        </div>
                        <div className="detail-item">
                            <label>Type</label>
                            <p>
                                {site.isHeadOffice ? (
                                    <span className="badge badge-info flex items-center gap-1 w-fit">
                                        <Warehouse size={12} />
                                        Head Office
                                    </span>
                                ) : 'Regular Site'}
                            </p>
                        </div>
                        <div className="detail-item">
                            <label>Status</label>
                            <p>
                                <span className={`badge ${site.isActive ? 'badge-success' : 'badge-danger'}`}>
                                    {site.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </p>
                        </div>
                        <div className="detail-item">
                            <label>Added On</label>
                            <p>{format(new Date(site.createdAt), 'MMM dd, yyyy')}</p>
                        </div>
                    </div>

                    {/* <div className="separator"></div> */}

                    <h3 className="section-subtitle">
                        <MapPin size={16} />
                        Location Details
                    </h3>
                    <div className="view-details-grid">
                        <div className="detail-item full-width">
                            <label>Full Address</label>
                            <p>{site.address || 'No address provided'}</p>
                        </div>
                        <div className="detail-item">
                            <label>City</label>
                            <p>{site.city}</p>
                        </div>
                        <div className="detail-item">
                            <label>Zone / Ward</label>
                            <p>{site.zone}{site.ward ? ` / ${site.ward}` : '' || '—'}</p>
                        </div>
                        <div className="detail-item">
                            <label>Coordinates</label>
                            <p>{site.latitude && site.longitude ? `${site.latitude}, ${site.longitude}` : '—'}</p>
                        </div>
                    </div>
                </div>

                {/* Contact & Statistics Sidebars */}
                <div className="sidebar-col">
                    <div className="info-card glass-card">
                        <h2 className="section-title">
                            <User size={20} />
                            Primary Contact
                        </h2>
                        {site.contactPerson ? (
                            <div className="contact-card-mini">
                                <div className="detail-item">
                                    <label>Contact Name</label>
                                    <p className="font-semibold">{site.contactPerson}</p>
                                </div>
                                <div className="detail-item" style={{ marginTop: '0.75rem' }}>
                                    <label>Phone Number</label>
                                    <p className="flex items-center gap-2 font-mono">
                                        <Phone size={14} className="text-muted" />
                                        {site.contactPhone || '—'}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-muted text-sm italic">No contact information assigned</p>
                        )}
                    </div>

                    <div className="info-card glass-card">
                        <h2 className="section-title">
                            <Monitor size={20} />
                            Site Assets
                        </h2>
                        <div className="stats-mini">
                            <div className="stat-box">
                                <span className="stat-value">{totalAssets}</span>
                                <span className="stat-label">Total Assets</span>
                            </div>

                            <div className="stat-breakdown">
                                <div className="breakdown-item online">
                                    <span className="breakdown-value">{statusCounts.online}</span>
                                    <span className="breakdown-label">Online</span>
                                </div>
                                <div className="breakdown-item offline">
                                    <span className="breakdown-value">{statusCounts.offline}</span>
                                    <span className="breakdown-label">Offline</span>
                                </div>
                                <div className="breakdown-item passive">
                                    <span className="breakdown-value">{statusCounts.passive}</span>
                                    <span className="breakdown-label">Passive</span>
                                </div>
                            </div>

                            <Link to={`/assets?siteId=${id}`} className="btn btn-outline-primary btn-sm w-full mt-4">
                                View Technical Inventory
                            </Link>
                        </div>
                    </div>

                    {/* SLA Policies Card */}
                    <div className="info-card glass-card">
                        <h2 className="section-title">
                            <Clock size={20} />
                            SLA Policies
                        </h2>
                        {slaSource === 'site' ? (
                            <div>
                                <span className="badge badge-info" style={{ fontSize: '0.68rem', marginBottom: '0.75rem', display: 'inline-block' }}>
                                    ✦ Custom SLA
                                </span>
                                <div style={{ display: 'grid', gap: '0.5rem' }}>
                                    {slaPolicies.map(p => (
                                        <div key={p.priority} style={{
                                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                                            padding: '0.5rem 0.625rem', borderRadius: '0.5rem',
                                            background: 'var(--bg-secondary)'
                                        }}>
                                            <span style={{
                                                fontSize: '0.6rem', fontWeight: 800, color: '#fff',
                                                background: PRIORITY_COLORS[p.priority],
                                                padding: '1px 6px', borderRadius: '3px'
                                            }}>{p.priority}</span>
                                            <span style={{ fontSize: '0.72rem', fontWeight: 600, flex: 1 }}>
                                                {PRIORITY_LABELS[p.priority]}
                                            </span>
                                            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                                Resp: {formatMin(p.responseTimeMinutes)}
                                            </span>
                                            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                                Rest: {formatMin(p.restoreTimeMinutes)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <p className="text-muted text-sm italic" style={{ padding: '0.5rem 0' }}>
                                Using global default SLA policies
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Assets Preview Section */}
            {/* <div className="info-card glass-card">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="section-title">
                        <Monitor size={20} />
                        Installed Assets
                    </h2>
                    <span className="text-xs text-muted">Showing recent 10 of {totalAssets} assets</span>
                </div>

                {assetsLoading ? (
                    <div style={{ padding: '2rem 0', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }}></div></div>
                ) : assets.length === 0 ? (
                    <div className="text-muted" style={{ padding: '3rem 0', textAlign: 'center' }}>No assets found at this site.</div>
                ) : (
                    <div className="table-mini-wrapper">
                        <table className="data-table compact">
                            <thead>
                                <tr>
                                    <th>Asset Code</th>
                                    <th>Type</th>
                                    <th>Device</th>
                                    <th>Status</th>
                                    <th>IP Address</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {assets.map(asset => (
                                    <tr key={asset._id}>
                                        <td><span className="font-mono font-bold">{asset.assetCode}</span></td>
                                        <td>{asset.assetType}</td>
                                        <td>{asset.deviceType}</td>
                                        <td>
                                            <span className={`badge ${asset.status === 'Operational' || asset.status === 'Online' ? 'badge-success' : 'badge-danger'}`}>
                                                {asset.status}
                                            </span>
                                        </td>
                                        <td><span className="font-mono text-xs">{asset.ipAddress || '—'}</span></td>
                                        <td className="text-right">
                                            <Link to={`/assets/${asset._id}`} className="btn btn-icon btn-ghost btn-sm" title="View Asset">
                                                <Info size={14} />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div> */}
        </div >
    );
}
