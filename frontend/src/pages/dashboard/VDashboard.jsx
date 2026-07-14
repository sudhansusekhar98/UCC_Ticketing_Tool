import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
    Ticket, FolderOpen, Loader2, Flame, CheckCircle2, ShieldCheck,
    Users, Plus, Server, BarChart3, Package, ArrowRight,
    Camera, HardDrive, Cpu, Wifi, Monitor, Activity, Clock, MapPin,
} from 'lucide-react';
import { ticketsApi, usersApi, assetsApi, sitesApi } from '../../services/api';
import KpiCard from './widgets/KpiCard';
import TicketTrendChart from './vcharts/TicketTrendChart';
import PriorityChart from './vcharts/PriorityChart';
import CategoryChart from './vcharts/CategoryChart';
import StatusChart from './vcharts/StatusChart';
import SLAOverview from './vcharts/SLAOverview';
import './VDashboard.css';

/* ── date helpers ─────────────────────────────────────────── */
const fmtDate = (d) => d.toISOString().split('T')[0];
const today = () => fmtDate(new Date());
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return fmtDate(d); };

function timeAgo(date) {
    if (!date) return '';
    const s = (Date.now() - new Date(date).getTime()) / 1000;
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
}

const pctDelta = (cur, prev) => {
    if (prev == null || prev === 0) return cur > 0 ? 100 : null;
    return Math.round(((cur - prev) / prev) * 100);
};

/* Guard: suppress a positive delta badge when the displayed KPI value is 0
   (e.g. "0 Open tickets ↑250%" is misleading - the % comes from a different denominator) */
const safeDelta = (displayedValue, deltaValue) =>
    displayedValue === 0 && (deltaValue ?? 0) > 0 ? null : deltaValue;

/* ── avatar helpers ───────────────────────────────────────── */
const ACCENT_COLORS = ['#4F46E5', '#0EA5E9', '#10B981', '#8B5CF6', '#F59E0B'];
function initials(name) {
    if (!name) return '?';
    return name.split(' ').map((n) => n[0] || '').join('').slice(0, 2).toUpperCase();
}
function avatarColor(name) {
    let h = 0;
    for (let i = 0; i < (name || '').length; i++) h = (h * 31 + (name || '').charCodeAt(i)) & 0xffff;
    return ACCENT_COLORS[h % ACCENT_COLORS.length];
}

/* ── online user hover card ───────────────────────────────── */
function UserHoverCard({ user }) {
    const [visible, setVisible] = useState(false);
    const name = user.fullName || user.name || 'Unknown';
    return (
        <span
            className="vd-presence-ava"
            style={{ background: avatarColor(name) }}
            onMouseEnter={() => setVisible(true)}
            onMouseLeave={() => setVisible(false)}
        >
            {user.profilePicture ? <img src={user.profilePicture} alt="" /> : initials(name)}
            {visible && (
                <span className="vd-user-popup">
                    <span className="vd-user-popup-ava" style={{ background: avatarColor(name) }}>
                        {user.profilePicture ? <img src={user.profilePicture} alt="" /> : initials(name)}
                    </span>
                    <span className="vd-user-popup-info">
                        <span className="vd-user-popup-name">{name}</span>
                        {user.role && <span className="vd-user-popup-role">{user.role}</span>}
                    </span>
                    <span className="vd-user-popup-dot" />
                </span>
            )}
        </span>
    );
}

/* ── asset / priority mappings ────────────────────────────── */
const ASSET_ICONS = {
    'IP Camera': Camera, Camera: Camera, NVR: HardDrive, DVR: HardDrive,
    Server: Server, Switch: Wifi, Router: Wifi, Workstation: Monitor, default: Cpu,
};
const PRIORITY_DOT = { Critical: '#F43F5E', High: '#F59E0B', Medium: '#6366F1', Low: '#10B981' };

function assetStatusTone(status) {
    const s = (status || '').toLowerCase();
    if (s === 'online' || s === 'operational') return 'good';
    if (s === 'offline' || s === 'down') return 'bad';
    return 'warn';
}

/* ── small presentational helper ──────────────────────────── */
function CardHead({ icon: Icon, title, to, action }) {
    return (
        <div className="vd-cardhead">
            <span className="vd-cardhead-title">
                {Icon && <Icon size={14} className="vd-cardhead-ic" />}
                {title}
            </span>
            {to && <Link to={to} className="vd-cardhead-link">{action || 'View all'} <ArrowRight size={12} /></Link>}
        </div>
    );
}

export default function VDashboard() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [engineers, setEngineers] = useState([]);
    const [assets, setAssets] = useState([]);
    const [sites, setSites] = useState([]);
    const [recent, setRecent] = useState([]);
    const [activeUsers, setActiveUsers] = useState([]);
    const [trends, setTrends] = useState([]);
    const [trendMeta, setTrendMeta] = useState({});
    const [trendLoading, setTrendLoading] = useState(false);
    const [range, setRange] = useState(30);
    const [dateFrom, setDateFrom] = useState(() => daysAgo(29));
    const [dateTo, setDateTo] = useState(() => today());

    const refreshRef = useRef(null);
    const heartbeatRef = useRef(null);

    const fetchCore = useCallback(async () => {
        try {
            const [statsRes, engRes, assetRes, siteRes, recentRes] = await Promise.all([
                ticketsApi.getDashboardStats(),
                usersApi.getEngineers(),
                assetsApi.getAll({ limit: 6 }),
                sitesApi.getDropdown(),
                ticketsApi.getAll({ limit: 6 }),
            ]);
            setStats(statsRes.data?.data ?? statsRes.data ?? null);
            setEngineers((engRes.data?.data ?? engRes.data ?? []).slice(0, 6));
            setAssets((assetRes.data?.data ?? assetRes.data?.assets ?? assetRes.data ?? []).slice(0, 6));
            setSites((siteRes.data?.data ?? siteRes.data ?? []).slice(0, 6));
            setRecent((recentRes.data?.data ?? recentRes.data?.items ?? recentRes.data ?? []).slice(0, 6));
        } catch (err) {
            console.error('[VDashboard] fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchTrends = useCallback(async () => {
        setTrendLoading(true);
        try {
            const res = await ticketsApi.getTrends({ startDate: dateFrom, endDate: dateTo });
            const payload = res.data?.data ?? res.data ?? [];
            setTrends(Array.isArray(payload) ? payload : (payload.trends ?? []));
            setTrendMeta(Array.isArray(payload) ? {} : payload);
        } catch (e) {
            console.error('[VDashboard] trends error:', e);
        } finally {
            setTrendLoading(false);
        }
    }, [dateFrom, dateTo]);

    const fetchActiveUsers = useCallback(async () => {
        try {
            const res = await usersApi.getActiveUsers();
            setActiveUsers(res.data?.data ?? res.data ?? []);
        } catch (e) { /* silent */ }
    }, []);

    useEffect(() => {
        fetchCore();
        fetchActiveUsers();
        refreshRef.current = setInterval(() => { fetchCore(); fetchTrends(); }, 60_000);
        heartbeatRef.current = setInterval(fetchActiveUsers, 30_000);
        return () => { clearInterval(refreshRef.current); clearInterval(heartbeatRef.current); };
    }, [fetchCore, fetchTrends, fetchActiveUsers]);

    useEffect(() => { fetchTrends(); }, [fetchTrends]);

    const setPreset = (n) => { setRange(n); setDateFrom(daysAgo(n - 1)); setDateTo(today()); };

    /* ── derived ──────────────────────────────────────────── */
    const cur = trendMeta.currentStats || {};
    const prev = trendMeta.previousStats || {};
    const createdSeries = trends.map((d) => d.created ?? 0);
    const resolvedSeries = trends.map((d) => d.resolved ?? 0);

    const activeIds = useMemo(
        () => new Set(activeUsers.map((u) => u._id)),
        [activeUsers]
    );

    const criticalCount = useMemo(() => {
        // Prefer the new combined field (priority=Critical OR slaBreached) from backend
        if (stats?.criticalTickets != null) return stats.criticalTickets;
        const p = stats?.ticketsByPriority ?? stats?.byPriority ?? [];
        return (p.find((x) => x.priority === 'Critical')?.count ?? 0) + (stats?.slaBreached ?? 0);
    }, [stats]);

    const statusData = stats?.ticketsByStatus ?? stats?.byStatus ?? [];
    const priorityData = stats?.ticketsByPriority ?? stats?.byPriority ?? [];
    const categoryData = stats?.ticketsByCategory ?? stats?.byCategory ?? [];

    if (loading) {
        return (
            <div className="vd-page">
                <div className="vd-skel-head">
                    <div className="vd-skeleton" style={{ width: 240, height: 26 }} />
                    <div className="vd-skeleton" style={{ width: 300, height: 34, borderRadius: 999 }} />
                </div>
                <div className="vd-kpi-grid">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="vd-skeleton" style={{ height: 132, borderRadius: 18 }} />
                    ))}
                </div>
                <div className="vd-grid-main">
                    <div className="vd-skeleton" style={{ height: 320, borderRadius: 18 }} />
                    <div className="vd-skeleton" style={{ height: 320, borderRadius: 18 }} />
                </div>
                <div className="vd-grid-3">
                    {[0, 1, 2].map((i) => <div key={i} className="vd-skeleton" style={{ height: 240, borderRadius: 18 }} />)}
                </div>
            </div>
        );
    }

    return (
        <div className="vd-page">
            {/* ── Header ─────────────────────────────────────── */}
            <header className="vd-head">
                <div className="vd-head-titles">
                    <h1 className="vd-title">Operations Dashboard</h1>
                    <p className="vd-subtitle">Live overview of tickets, SLA health and field activity</p>
                </div>
                <div className="vd-head-tools">
                    <div className="vd-presence">
                        <div className="vd-presence-avatars">
                            {activeUsers.slice(0, 4).map((u) => (
                                <UserHoverCard key={u._id} user={u} />
                            ))}
                        </div>
                        <span className="vd-presence-txt">
                            <span className="vd-live-dot" />{activeUsers.length} online
                        </span>
                    </div>
                    <div className="vd-presets">
                        {[7, 30, 90].map((n) => (
                            <button key={n} className={`vd-preset ${range === n ? 'is-active' : ''}`} onClick={() => setPreset(n)}>
                                {n}d
                            </button>
                        ))}
                    </div>
                    <div className="vd-daterange">
                        <input type="date" className="vd-date-input" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setRange(0); }} />
                        <span className="vd-date-sep">–</span>
                        <input type="date" className="vd-date-input" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setRange(0); }} />
                    </div>
                </div>
            </header>

            {/* ── KPI grid ───────────────────────────────────── */}
            <section className="vd-kpi-grid">
                <KpiCard to="/tickets" icon={Ticket} label="Total Tickets" value={stats?.totalTickets ?? 0}
                    accent="#4F46E5" delta={pctDelta(cur.totalCreated, prev.totalCreated)} series={createdSeries} />
                <KpiCard to="/tickets?status=Open,Assigned" icon={FolderOpen} label="Open"
                    value={stats?.openTickets ?? 0}
                    accent="#0EA5E9"
                    delta={safeDelta(stats?.openTickets ?? 0, pctDelta(cur.openTickets, prev.openTickets))}
                    invert />
                <KpiCard to="/tickets?status=InProgress" icon={Loader2} label="In Progress" value={stats?.inProgressTickets ?? 0}
                    accent="#F59E0B" sub="Currently being worked" />
                <KpiCard to="/tickets?slaStatus=Breached" icon={Flame} label="Critical" value={criticalCount}
                    accent="#F43F5E" invert sub={criticalCount > 0 ? `${stats?.slaBreached ?? 0} SLA breached` : 'Needs immediate attention'} />
                <KpiCard to="/tickets?status=Resolved" icon={CheckCircle2} label="Resolved"
                    value={stats?.totalResolved ?? 0}
                    accent="#10B981"
                    delta={pctDelta(cur.totalResolved, prev.totalResolved)}
                    series={resolvedSeries} />
                <KpiCard to="/tickets?slaStatus=Issues" icon={ShieldCheck} label="SLA Compliance"
                    value={stats?.slaCompliancePercent ?? 0}
                    valueSuffix={stats?.slaCompliancePercent != null ? '%' : ''}
                    accent="#8B5CF6"
                    sub={stats?.slaCompliancePercent == null ? 'No SLA-tracked closed tickets' : stats.slaCompliancePercent >= 95 ? 'Target met (95%)' : 'Below target GOAL: 95%'} />
            </section>

            {/* ── Trend + SLA ────────────────────────────────── */}
            <section className="vd-grid-main">
                <div className="vd-card">
                    <CardHead icon={Activity} title="Ticket Trend" />
                    <div className="vd-trend-legend">
                        <span><i style={{ background: '#4F46E5' }} />Created</span>
                        <span><i style={{ background: '#10B981' }} />Resolved</span>
                        <span><i style={{ background: '#F59E0B' }} />In Progress</span>
                    </div>
                    <TicketTrendChart trends={trends} loading={trendLoading} />
                </div>
                <div className="vd-card">
                    <CardHead icon={ShieldCheck} title="SLA Overview" />
                    <SLAOverview stats={stats} />
                </div>
            </section>

            {/* ── Priority / Category / Status ───────────────── */}
            <section className="vd-grid-3">
                <div className="vd-card">
                    <CardHead icon={Flame} title="By Priority" />
                    <PriorityChart priorities={priorityData} />
                </div>
                <div className="vd-card">
                    <CardHead icon={BarChart3} title="By Category" />
                    <CategoryChart categories={categoryData} />
                </div>
                <div className="vd-card">
                    <CardHead icon={Activity} title="By Status" />
                    <StatusChart statuses={statusData} />
                </div>
            </section>

            {/* ── Assets / Team / Activity ───────────────────── */}
            <section className="vd-grid-3">
                <div className="vd-card">
                    <CardHead icon={Server} title="Assets" to="/assets" />
                    <div className="vd-asset-list">
                        {assets.length ? assets.map((a) => {
                            const Icon = ASSET_ICONS[a.assetType] || ASSET_ICONS.default;
                            const tone = assetStatusTone(a.status);
                            return (
                                <Link key={a._id} to={`/assets/${a._id}`} className="vd-asset">
                                    <span className="vd-asset-ic"><Icon size={15} /></span>
                                    <div className="vd-asset-body">
                                        <span className="vd-asset-name">{a.hostname || a.assetCode || a.name || 'Unnamed'}</span>
                                        <span className="vd-asset-meta">{a.assetType || 'Device'}{a.ipAddress ? ` · ${a.ipAddress}` : ''}</span>
                                    </div>
                                    <span className={`vd-dot vd-dot-${tone}`} title={a.status} />
                                </Link>
                            );
                        }) : <p className="vd-empty-txt">No assets yet</p>}
                    </div>
                </div>

                <div className="vd-card">
                    <CardHead icon={Users} title="Team" to="/users" />
                    <div className="vd-team-list">
                        {engineers.length ? engineers.map((u) => {
                            const online = activeIds.has(u._id);
                            return (
                                <div key={u._id} className="vd-team">
                                    <span className="vd-team-ava" style={{ background: avatarColor(u.fullName || u.name) }}>
                                        {u.profilePicture ? <img src={u.profilePicture} alt="" /> : initials(u.fullName || u.name)}
                                        {online && <span className="vd-team-presence" />}
                                    </span>
                                    <div className="vd-team-body">
                                        <span className="vd-team-name">{u.fullName || u.name || u.username}</span>
                                        <span className="vd-team-role">{u.role}</span>
                                    </div>
                                    <span className={`vd-team-status ${online ? 'is-online' : ''}`}>{online ? 'Online' : 'Away'}</span>
                                </div>
                            );
                        }) : <p className="vd-empty-txt">No engineers</p>}
                    </div>
                </div>

                <div className="vd-card">
                    <CardHead icon={Clock} title="Recent Tickets" to="/tickets" />
                    <div className="vd-activity">
                        {recent.length ? recent.map((t) => (
                            <Link key={t._id} to={`/tickets/${t._id}`} className="vd-act">
                                <span className="vd-act-dot" style={{ background: PRIORITY_DOT[t.priority] || '#94A3B8' }} />
                                <div className="vd-act-body">
                                    <span className="vd-act-title">{t.subject || t.ticketNumber || 'Ticket'}</span>
                                    <span className="vd-act-meta">{t.ticketNumber} · {t.status}</span>
                                </div>
                                <span className="vd-act-time">{timeAgo(t.createdAt)}</span>
                            </Link>
                        )) : <p className="vd-empty-txt">No recent tickets</p>}
                    </div>
                </div>
            </section>

            {/* ── Quick actions + Sites ──────────────────────── */}
            <section className="vd-grid-bottom">
                <div className="vd-card">
                    <CardHead icon={Plus} title="Quick Actions" />
                    <div className="vd-actions">
                        <Link to="/tickets/new" className="vd-action vd-action-primary">
                            <span className="vd-action-ic"><Plus size={15} /></span>
                            <span className="vd-action-body">
                                <span className="vd-action-tt">New Ticket</span>
                                <span className="vd-action-sub">Log an incident</span>
                            </span>
                        </Link>
                        <Link to="/assets/new" className="vd-action">
                            <span className="vd-action-ic"><Server size={15} /></span>
                            <span className="vd-action-body">
                                <span className="vd-action-tt">Register Asset</span>
                                <span className="vd-action-sub">Add to inventory</span>
                            </span>
                        </Link>
                        <Link to="/reports" className="vd-action">
                            <span className="vd-action-ic"><BarChart3 size={15} /></span>
                            <span className="vd-action-body">
                                <span className="vd-action-tt">Reports</span>
                                <span className="vd-action-sub">Generate insights</span>
                            </span>
                        </Link>
                        <Link to="/stock" className="vd-action">
                            <span className="vd-action-ic"><Package size={15} /></span>
                            <span className="vd-action-body">
                                <span className="vd-action-tt">Stock</span>
                                <span className="vd-action-sub">Manage inventory</span>
                            </span>
                        </Link>
                    </div>
                </div>

                <div className="vd-card">
                    <CardHead icon={MapPin} title="Sites" to="/sites" />
                    <div className="vd-site-list">
                        {sites.length ? sites.map((s, i) => (
                            <Link key={s._id ?? i} to={s._id ? `/sites/${s._id}` : '/sites'} className="vd-site">
                                <span className="vd-site-accent" style={{ background: ACCENT_COLORS[i % ACCENT_COLORS.length] }} />
                                <span className="vd-site-name">{s.siteName || s.name || s.label}</span>
                                <ArrowRight size={13} className="vd-site-arrow" />
                            </Link>
                        )) : <p className="vd-empty-txt">No sites</p>}
                    </div>
                </div>
            </section>
        </div>
    );
}
