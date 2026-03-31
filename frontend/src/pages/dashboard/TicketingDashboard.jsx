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
    Bell,
    HelpCircle,
    PlusCircle,
    Wrench,
    Clock,
    Package,
    Circle,
} from 'lucide-react';
import { ticketsApi, usersApi, assetsApi, sitesApi } from '../../services/api';
import useAuthStore from '../../context/authStore';
import {
    PieChart, Pie, Cell, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import toast from 'react-hot-toast';
import './TicketingDashboard.css';

const PRIORITY_COLORS = {
    P1: '#ba1a1a',
    P2: '#2b4bb9',
    P3: '#6063ee',
    P4: '#007d55',
};

const STATUS_COLORS = {
    'CLOSED':       '#006242',
    'IN PROGRESS':  '#4648d4',
    'OPEN':         '#737686',
    'ESCALATED':    '#ba1a1a',
};

function LoadingSkeleton() {
    return (
        <div className="td-container">
            <div className="td-skeleton-header">
                <div className="td-skeleton td-skeleton-title"></div>
                <div className="td-skeleton td-skeleton-badge"></div>
            </div>
            <div className="td-kpi-grid">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="td-kpi-card td-skeleton-card">
                        <div className="td-skeleton td-skeleton-icon"></div>
                        <div style={{ flex: 1 }}>
                            <div className="td-skeleton td-skeleton-label"></div>
                            <div className="td-skeleton td-skeleton-value"></div>
                        </div>
                    </div>
                ))}
            </div>
            <div className="td-bento-grid">
                <div className="td-bento-col-4">
                    <div className="td-card td-skeleton-card" style={{ height: '200px' }}></div>
                </div>
                <div className="td-bento-col-8">
                    <div className="td-card td-skeleton-card" style={{ height: '200px' }}></div>
                </div>
            </div>
        </div>
    );
}

function ActiveUsersBadge({ count }) {
    return (
        <span className="td-active-users-badge">
            <Circle size={8} className="td-online-dot-icon" fill="currentColor" />
            {count} online
        </span>
    );
}

export default function TicketingDashboard() {
    const [stats, setStats] = useState(null);
    const [engineers, setEngineers] = useState([]);
    const [assets, setAssets] = useState([]);
    const [sites, setSites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeUsers, setActiveUsers] = useState([]);
    const heartbeatRef = useRef(null);
    const { user } = useAuthStore();

    const fetchActiveUsers = async () => {
        try {
            const res = await usersApi.getActiveUsers();
            setActiveUsers(res.data.data || []);
        } catch {
            // silent – non-critical
        }
    };

    const sendHeartbeat = async () => {
        try {
            await usersApi.heartbeat();
        } catch {
            // silent
        }
    };

    const fetchData = async (showToast = false) => {
        try {
            if (showToast) toast.loading('Refreshing…', { id: 'dash-refresh' });

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

            if (showToast) toast.success('Dashboard updated', { id: 'dash-refresh' });
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
            if (showToast) toast.error('Failed to refresh data', { id: 'dash-refresh' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        fetchActiveUsers();

        // Send initial heartbeat immediately
        sendHeartbeat();

        // Heartbeat + active-users refresh every 30s
        heartbeatRef.current = setInterval(() => {
            sendHeartbeat();
            fetchActiveUsers();
        }, 30000);

        // Dashboard data refresh every 60s
        const dashInterval = setInterval(() => fetchData(), 60000);

        return () => {
            clearInterval(heartbeatRef.current);
            clearInterval(dashInterval);
        };
    }, []);

    if (loading) return <LoadingSkeleton />;

    const priorityData = stats?.ticketsByPriority?.map(p => ({
        name: p.priority,
        value: p.count,
        fill: PRIORITY_COLORS[p.priority] || '#737686'
    })) || [];

    const totalTicketsAcrossPriority = priorityData.reduce((acc, curr) => acc + curr.value, 0);

    const statusData = [
        { name: 'Closed',      count: stats?.totalClosed || 0,          fill: STATUS_COLORS['CLOSED'] },
        { name: 'In Progress', count: stats?.inProgressTickets || 0,    fill: STATUS_COLORS['IN PROGRESS'] },
        { name: 'Open',        count: stats?.openTickets || 0,          fill: STATUS_COLORS['OPEN'] },
        { name: 'Escalated',   count: stats?.escalatedTickets || 0,     fill: STATUS_COLORS['ESCALATED'] },
    ];

    const CATEGORY_COLORS = ['#2b4bb9', '#4648d4', '#006242', '#f97316', '#ba1a1a', '#6063ee', '#737686', '#007d55'];
    const categoryData = (stats?.ticketsByCategory || []).map((c, i) => ({
        name: c.category,
        count: c.count,
        fill: CATEGORY_COLORS[i % CATEGORY_COLORS.length]
    }));

    return (
        <div className="td-container animate-enter">
            <div className="td-header">
                <div className="td-header-titles">
                    <h2>System Overview</h2>
                    <p>Real-time performance monitoring and ticket distribution.</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    {activeUsers.length > 0 && <ActiveUsersBadge count={activeUsers.length} />}
                    <div className="td-live-indicator">
                        <span className="td-live-dot"></span>
                        Live Updates
                    </div>
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
                {/* Left Column */}
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
                                            <div className="td-team-role">{eng.role}</div>
                                        </div>
                                    </div>
                                    <div className="td-status-dot"></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column: Charts */}
                <div className="td-bento-col-8">
                    <div className="td-charts-grid" style={{ marginBottom: '2rem' }}>
                        <div className="td-card fade-in delay-1">
                            <h3 className="td-card-title" style={{ marginBottom: '1.5rem' }}>Tickets by Priority</h3>
                            <div className="td-chart-container">
                                <div style={{ width: '130px', height: '130px', position: 'relative' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={priorityData} cx="50%" cy="50%" innerRadius={45} outerRadius={60} paddingAngle={5} dataKey="value">
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

            {/* Active Users Panel */}
            <div className="td-card td-active-users-card fade-in delay-5">
                <div className="td-card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <h3 className="td-card-title">Active Users</h3>
                        <ActiveUsersBadge count={activeUsers.length} />
                    </div>
                    <Link to="/users" className="td-card-link">View All</Link>
                </div>
                {activeUsers.length === 0 ? (
                    <div className="td-active-users-empty">
                        <Users size={20} />
                        <span>No users currently online</span>
                    </div>
                ) : (
                    <div className="td-active-users-grid">
                        {activeUsers.map(u => {
                            const minutesAgo = Math.floor((Date.now() - new Date(u.lastActivityAt).getTime()) / 60000);
                            const siteNames = u.assignedSites?.map(s => s.siteName).join(', ') || '—';
                            return (
                                <div key={u._id} className="td-active-user-item">
                                    <div className="td-active-user-avatar">
                                        {u.profilePicture && u.profilePicture !== 'null' ? (
                                            <img src={u.profilePicture} alt={u.fullName} />
                                        ) : (
                                            <span>{u.fullName?.charAt(0) || 'U'}</span>
                                        )}
                                        <span className="td-online-indicator"></span>
                                    </div>
                                    <div className="td-active-user-info">
                                        <div className="td-active-user-name">{u.fullName}</div>
                                        <div className="td-active-user-meta">
                                            <span className="td-active-user-role">{u.role}</span>
                                            {u.assignedSites?.length > 0 && (
                                                <span className="td-active-user-site" title={siteNames}>· {siteNames}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="td-active-user-time">
                                        {minutesAgo < 1 ? 'just now' : `${minutesAgo}m ago`}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
