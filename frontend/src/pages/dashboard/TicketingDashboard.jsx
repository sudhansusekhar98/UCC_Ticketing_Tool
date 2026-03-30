import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
    Ticket,
    Activity,
    AlertTriangle,
    ShieldCheck,
    Monitor,
    Users,
    MapPin,
    ArrowRight,
    Search,
    Bell,
    HelpCircle,
    PlusCircle,
    Wrench,
    Clock,
    TrendingUp,
    Play,
    CheckCircle,
    User,
    Wifi,
    WifiOff,
    Package
} from 'lucide-react';
import { ticketsApi, usersApi, assetsApi, sitesApi } from '../../services/api';
import useAuthStore from '../../context/authStore';
import {
    PieChart, Pie, Cell, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend
} from 'recharts';
import toast from 'react-hot-toast';
import './TicketingDashboard.css';

const PRIORITY_COLORS = {
    P1: '#ba1a1a', // Error red
    P2: '#2b4bb9', // Primary blue
    P3: '#6063ee', // Secondary
    P4: '#007d55', // Success green
};

const STATUS_COLORS = {
    'RESOLVED': '#006242',
    'IN PROGRESS': '#4648d4',
    'ASSIGNED': '#2b4bb9',
    'ESCALATED': '#ba1a1a',
    'OPEN': '#737686'
};

export default function TicketingDashboard() {
    const [stats, setStats] = useState(null);
    const [engineers, setEngineers] = useState([]);
    const [assets, setAssets] = useState([]);
    const [sites, setSites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const { user } = useAuthStore();

    const fetchData = async (showToast = false) => {
        try {
            if (showToast) setRefreshing(true);

            const [statsRes, engineersRes, assetsRes, sitesRes] = await Promise.all([
                ticketsApi.getDashboardStats(),
                usersApi.getEngineers(),
                assetsApi.getAll({ limit: 5 }),
                sitesApi.getDropdown()
            ]);

            setStats(statsRes.data.data || statsRes.data);

            const engData = engineersRes.data.data || engineersRes.data || [];
            setEngineers(engData.slice(0, 3));

            const assetData = assetsRes.data.data || assetsRes.data.items || [];
            setAssets(assetData.slice(0, 3));

            setSites(sitesRes.data.data || sitesRes.data || []);

            if (showToast) toast.success('Dashboard updated');
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
            if (showToast) toast.error('Failed to refresh data');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(() => fetchData(), 60000); // Auto-refresh every minute
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return <div className="td-container"><div className="td-loading">Initializing Premium Dashboard...</div></div>;
    }

    const priorityData = stats?.ticketsByPriority?.map(p => ({
        name: p.priority,
        value: p.count,
        fill: PRIORITY_COLORS[p.priority] || '#737686'
    })) || [];

    const totalTicketsAcrossPriority = priorityData.reduce((acc, curr) => acc + curr.value, 0);

    const statusData = [
        { name: 'Resolved', count: stats?.resolvedTickets || 0, fill: STATUS_COLORS['RESOLVED'] },
        { name: 'In Progress', count: stats?.inProgressTickets || 0, fill: STATUS_COLORS['IN PROGRESS'] },
        { name: 'Assigned', count: stats?.assignedTickets || 0, fill: STATUS_COLORS['ASSIGNED'] },
        { name: 'Escalated', count: stats?.escalatedTickets || 0, fill: STATUS_COLORS['ESCALATED'] },
    ];

    const CATEGORY_COLORS = ['#2b4bb9', '#4648d4', '#006242', '#f97316', '#ba1a1a', '#6063ee', '#737686', '#007d55'];
    const categoryData = (stats?.ticketsByCategory || []).map((c, i) => ({
        name: c.category,
        count: c.count,
        fill: CATEGORY_COLORS[i % CATEGORY_COLORS.length]
    }));

    return (
        <div className="td-container animate-enter">
            {/* Top Toolbar (Floating in Layout header usually, but we can add some local breadcrumbs) */}

            <div className="td-header">
                <div className="td-header-titles">
                    <h2>System Overview</h2>
                    <p>Real-time performance monitoring and ticket distribution.</p>
                </div>
                <div className="td-live-indicator">
                    <span className="td-live-dot"></span>
                    Live Updates
                </div>
            </div>

            {/* KPI Grid */}
            <div className="td-kpi-grid">
                <Link to="/tickets" className="td-kpi-card stagger-1" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="td-kpi-icon-wrapper"><Ticket size={24} /></div>
                    <div>
                        <div className="td-kpi-label">Total Tickets</div>
                        <div className="td-kpi-value">{stats?.totalTickets || 0}</div>
                    </div>
                </Link>
                <Link to="/tickets?status=Open" className="td-kpi-card stagger-2" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="td-kpi-icon-wrapper"><HelpCircle size={24} /></div>
                    <div>
                        <div className="td-kpi-label">Open Tickets</div>
                        <div className="td-kpi-value">{stats?.openTickets || 0}</div>
                    </div>
                </Link>
                <Link to="/tickets?status=InProgress" className="td-kpi-card stagger-3" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="td-kpi-icon-wrapper secondary"><Activity size={24} /></div>
                    <div>
                        <div className="td-kpi-label">In Progress</div>
                        <div className="td-kpi-value secondary">{stats?.inProgressTickets || 0}</div>
                    </div>
                </Link>
                <Link to="/tickets?status=Escalated" className="td-kpi-card stagger-4" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="td-kpi-icon-wrapper error"><AlertTriangle size={24} /></div>
                    <div>
                        <div className="td-kpi-label">Escalated</div>
                        <div className="td-kpi-value error">{stats?.escalatedTickets || 0}</div>
                    </div>
                </Link>
                <Link to="/tickets?slaBreached=true" className="td-kpi-card stagger-5" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="td-kpi-icon-wrapper warning"><Bell size={24} /></div>
                    <div>
                        <div className="td-kpi-label">SLA Breached</div>
                        <div className="td-kpi-value">{stats?.slaBreached || 0}</div>
                        <div className="td-kpi-subtext" style={{ color: 'var(--sd-tertiary)' }}>{stats?.slaAtRisk || 0} at risk</div>
                    </div>
                </Link>
                <Link to="/tickets?slaStatus=OnTrack" className="td-kpi-card highlight stagger-6" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="td-kpi-icon-wrapper white"><ShieldCheck size={24} /></div>
                    <div>
                        <div className="td-kpi-label">Compliance</div>
                        <div className="td-kpi-value">{stats?.slaCompliancePercent || 0}%</div>
                        <div className="td-kpi-subtext" style={{ color: 'rgba(255,255,255,0.7)' }}>Target: 95%</div>
                    </div>
                </Link>
            </div>

            {/* Bento Layout */}
            <div className="td-bento-grid">
                {/* Left Column: Management */}
                <div className="td-bento-col-4">
                    <div className="td-card fade-in delay-2" style={{ marginBottom: '2rem' }}>
                        <div className="td-card-header">
                            <h3 className="td-card-title">Manage Assets</h3>
                            <Link to="/assets" className="td-card-link">View All</Link>
                        </div>
                        <div className="td-list">
                            {assets.map(asset => (
                                <Link key={asset._id} to={`/assets/${asset._id}`} className="td-item" style={{ textDecoration: 'none', color: 'inherit' }}>
                                    <div className="td-item-left">
                                        <Monitor size={18} className="td-item-icon" />
                                        <span className="td-item-name">{asset.assetCode || asset.assetName}</span>
                                    </div>
                                    <span className={`td-badge ${asset.status === 'Operational' ? 'online' : ''}`}>
                                        {asset.status === 'Operational' ? 'ONLINE' : 'OFFLINE'}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </div>

                    <div className="td-card fade-in delay-3">
                        <div className="td-card-header">
                            <h3 className="td-card-title">Manage Team</h3>
                            <span className="td-badge secondary" style={{ background: 'rgba(70, 72, 212, 0.1)', color: 'var(--sd-secondary)' }}>
                                {engineers.length} Active
                            </span>
                        </div>
                        <div className="td-list">
                            {engineers.map(eng => (
                                <div key={eng._id} className="td-item">
                                    <div className="td-team-item">
                                        <div className="td-avatar-placeholder" style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--sd-outline-variant)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>
                                            {eng.profilePicture && eng.profilePicture !== 'null' ? (
                                                <img src={eng.profilePicture} alt={eng.fullName} className="td-avatar" />
                                            ) : (
                                                <span>{eng.fullName?.charAt(0) || 'U'}</span>
                                            )}
                                        </div>
                                        <div className="td-team-info">
                                            <div className="td-team-name">{eng.fullName}</div>
                                            <div className="td-team-role">L2 Network Engineer</div>
                                        </div>
                                    </div>
                                    <div className="td-status-dot"></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column: Analytics */}
                <div className="td-bento-col-8">
                    <div className="td-charts-grid" style={{ marginBottom: '2rem' }}>
                        <div className="td-card fade-in delay-1">
                            <h3 className="td-card-title" style={{ marginBottom: '1.5rem' }}>Tickets by Priority</h3>
                            <div className="td-chart-container">
                                <div style={{ width: '130px', height: '130px', position: 'relative' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={priorityData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={45}
                                                outerRadius={60}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {priorityData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                                ))}
                                            </Pie>
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                        <span style={{ fontSize: '1.25rem', fontWeight: '900' }}>{totalTicketsAcrossPriority}</span>
                                        <span style={{ fontSize: '0.625rem', fontWeight: '700', textTransform: 'uppercase', color: '#94a3b8' }}>Total</span>
                                    </div>
                                </div>
                                <div className="td-priority-legend" style={{ marginLeft: '1.5rem' }}>
                                    {priorityData.map(p => (
                                        <div key={p.name} className="td-legend-item">
                                            <span className="td-legend-dot" style={{ backgroundColor: p.fill }}></span>
                                            {p.name} ({p.value})
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="td-card fade-in delay-2">
                            <h3 className="td-card-title" style={{ marginBottom: '1.5rem' }}>Categories</h3>
                            <div className="td-chart-container">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={categoryData} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} width={60} />
                                        <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                                        <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={16}>
                                            {categoryData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    <div className="td-card fade-in delay-3">
                        <h3 className="td-card-title" style={{ marginBottom: '1.5rem' }}>Tickets by Status</h3>
                        <div className="td-chart-container" style={{ height: '220px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={statusData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dx={-10} />
                                    <Tooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                                    <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={40}>
                                        {statusData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Row */}
            <div className="td-bento-grid">
                <div className="td-bento-col-4">
                    <div className="td-card fade-in delay-4">
                        <div className="td-card-header">
                            <h3 className="td-card-title">Manage Sites</h3>
                            <MapPin size={18} className="td-item-icon" />
                        </div>
                        <div className="td-list">
                            {sites.slice(0, 3).map(site => (
                                <Link key={site._id} to={`/sites/${site._id}`} className="td-item" style={{ borderLeft: '4px solid var(--sd-primary)', borderRadius: '0 0.5rem 0.5rem 0' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span className="td-item-name">{site.siteName}</span>
                                        <span style={{ fontSize: '10px', color: '#64748b' }}>{site.city || site.siteUniqueID}</span>
                                    </div>
                                    <span className="td-badge online">ACTIVE</span>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="td-bento-col-8">
                    <div className="td-actions-grid fade-in delay-5">
                        <Link to="/tickets/new" className="td-action-btn featured">
                            <div className="td-action-icon">
                                <PlusCircle size={24} />
                            </div>
                            <div>
                                <div className="td-action-btn-title">Create Ticket</div>
                                <div className="td-action-btn-desc">Log a new incident or service request instantly.</div>
                            </div>
                        </Link>
                        <Link to="/assets/new" className="td-action-btn">
                            <div className="td-action-icon">
                                <Wrench size={24} />
                            </div>
                            <div>
                                <div className="td-action-btn-title">Add Asset</div>
                                <div className="td-action-btn-desc">Onboard new hardware or network devices to tracking.</div>
                            </div>
                        </Link>
                        <Link to="/tickets?status=Open" className="td-action-btn">
                            <div className="td-action-icon" style={{ backgroundColor: 'rgba(70, 72, 212, 0.1)', color: 'var(--sd-secondary)' }}>
                                <Clock size={24} />
                            </div>
                            <div>
                                <div className="td-action-btn-title">Open Tickets</div>
                                <div className="td-action-btn-desc">Review all active issues requiring immediate attention.</div>
                            </div>
                        </Link>
                        <Link to="/tickets?slaBreached=true" className="td-action-btn danger">
                            <div className="td-action-icon">
                                <AlertTriangle size={24} />
                            </div>
                            <div>
                                <div className="td-action-btn-title">SLA Breaches</div>
                                <div className="td-action-btn-desc">Audit critical misses and service level deviations.</div>
                            </div>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
