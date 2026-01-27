import { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
    Ticket,
    AlertTriangle,
    Clock,
    CheckCircle,
    TrendingUp,
    Monitor,
    Users,
    Activity,
    ArrowUpRight,
    RefreshCw,
    User,
    Wifi,
    WifiOff,
    Zap,
    BarChart2,
    PieChart as PieChartIcon,
    Layers,
    Plus,
    FileText,
    Settings,
    Bell,
    Inbox,
    Package,
    MapPin,
    Search,
    ChevronDown,
    Building2
} from 'lucide-react';
import { ticketsApi, usersApi, assetsApi, sitesApi } from '../../services/api';
import useAuthStore from '../../context/authStore';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, AreaChart, Area, CartesianGrid } from 'recharts';
import toast from 'react-hot-toast';
import './Dashboard.css';

// Animated Counter Hook
const useAnimatedCounter = (endValue, duration = 1000) => {
    const [count, setCount] = useState(0);
    const countRef = useRef(0);
    const startTimeRef = useRef(null);

    useEffect(() => {
        if (endValue === 0 || endValue === null || endValue === undefined) {
            setCount(0);
            return;
        }

        const animate = (timestamp) => {
            if (!startTimeRef.current) startTimeRef.current = timestamp;
            const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 3); // Cubic ease-out
            const currentCount = Math.floor(easeOut * endValue);

            setCount(currentCount);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                setCount(endValue);
            }
        };

        startTimeRef.current = null;
        requestAnimationFrame(animate);
    }, [endValue, duration]);

    return count;
};

// Animated Stat Value Component
const AnimatedStatValue = ({ value, suffix = '' }) => {
    const animatedValue = useAnimatedCounter(value, 800);
    return <>{animatedValue}{suffix}</>;
};

const PRIORITY_COLORS = {
    P1: '#ef4444',
    P2: '#f97316',
    P3: '#eab308',
    P4: '#22c55e',
};

const STATUS_COLORS = {
    Open: '#3b82f6',
    Assigned: '#8b5cf6',
    Acknowledged: '#06b6d4',
    InProgress: '#f59e0b',
    Resolved: '#10b981',
    Closed: '#6b7280',
};

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="custom-tooltip">
                <p className="custom-tooltip-label">{label || payload[0].name}</p>
                {payload.map((entry, index) => (
                    <p key={index} className="custom-tooltip-item" style={{ color: entry.color || entry.payload.fill }}>
                        {entry.name}: {entry.value}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

// Empty State Component
const EmptyState = ({ icon: Icon, title, description }) => (
    <div className="empty-state">
        <div className="empty-state-icon">
            <Icon size={32} strokeWidth={1.5} />
        </div>
        <p className="empty-state-title">{title}</p>
        {description && <p className="empty-state-description">{description}</p>}
    </div>
);

// Live Pulse Indicator
const LiveIndicator = () => (
    <div className="live-indicator">
        <span className="live-dot"></span>
        <span className="live-text">Live</span>
    </div>
);

const DashboardSkeleton = () => (
    <div className="dashboard">
        <div className="page-header">
            <div className="header-content" style={{ width: '100%' }}>
                <div className="skeleton skeleton-text" style={{ width: '180px', maxWidth: '100%', height: '16px' }}></div>
                <div className="skeleton skeleton-title" style={{ width: '280px', maxWidth: '100%', height: '36px', marginTop: '8px' }}></div>
                <div className="skeleton skeleton-text" style={{ width: '320px', maxWidth: '100%', height: '14px', marginTop: '8px' }}></div>
            </div>
        </div>
        <div className="stats-grid">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="skeleton skeleton-card" style={{ animationDelay: `${i * 100}ms` }}></div>
            ))}
        </div>
        <div className="stats-grid secondary-stats">
            {[1, 2].map(i => (
                <div key={i} className="skeleton skeleton-card" style={{ height: '280px', animationDelay: `${400 + i * 100}ms` }}></div>
            ))}
        </div>
        <div className="charts-grid">
            {[1, 2, 3].map(i => (
                <div key={i} className="skeleton skeleton-chart" style={{ animationDelay: `${600 + i * 100}ms` }}></div>
            ))}
        </div>
    </div>
);

export default function Dashboard() {
    const [stats, setStats] = useState(null);
    const [engineers, setEngineers] = useState([]);
    const [assets, setAssets] = useState([]);
    const [selectedSite, setSelectedSite] = useState('');
    const [sites, setSites] = useState([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [siteSearchTerm, setSiteSearchTerm] = useState('');
    const dropdownRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const { user, hasRole } = useAuthStore();

    // Permission checks
    const isAdmin = hasRole(['Admin']);
    const canSeeUsers = hasRole(['Admin']);

    // Greeting Logic
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 18) return 'Good Afternoon';
        return 'Good Evening';
    };

    const fetchStats = async (showToast = false) => {
        try {
            if (showToast) setRefreshing(true);
            const params = selectedSite ? { siteId: selectedSite } : {};
            const response = await ticketsApi.getDashboardStats(params);
            setStats(response.data.data || response.data);
            if (showToast) toast.success('Dashboard refreshed');
        } catch (error) {
            console.error('Failed to fetch dashboard stats:', error);
            // Don't show error toast on initial load to avoid clutter if offline
            if (showToast) toast.error('Failed to load dashboard data');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchSites = async () => {
        try {
            const response = await sitesApi.getDropdown();
            setSites(response.data.data || response.data || []);
        } catch (error) {
            console.error('Failed to fetch sites:', error);
        }
    };

    const fetchEngineers = async () => {
        try {
            const response = await usersApi.getEngineers();
            const engineerData = response.data.data || response.data || [];
            setEngineers(engineerData.map(e => ({
                value: e._id || e.userId || e.value,
                label: e.fullName || e.label
            })));
        } catch (error) {
            console.error('Failed to fetch engineers:', error);
        }
    };

    const fetchAssets = async () => {
        try {
            const params = { limit: 50 };
            if (selectedSite) params.siteId = selectedSite;
            const response = await assetsApi.getAll(params);
            let assetData = response.data.data || response.data.items || response.data || [];
            assetData = assetData.map(a => ({
                ...a,
                assetId: a._id || a.assetId,
                assetName: a.assetCode || a.assetName,
                assetTypeName: a.assetType,
                status: a.status === 'Operational' ? 'Online' : (a.status === 'Not Installed' ? 'Not Installed' : 'Offline')
            }));
            setAssets(assetData);
        } catch (error) {
            console.error('Failed to fetch assets:', error);
        }
    };

    useEffect(() => {
        fetchSites();
        fetchEngineers();
    }, []);

    useEffect(() => {
        fetchStats();
        fetchAssets();
        const interval = setInterval(() => fetchStats(), 30000); // 30s auto-refresh
        return () => clearInterval(interval);
    }, [selectedSite]);

    if (loading) return <DashboardSkeleton />;

    return (
        <div className="dashboard">
            <div className="page-header animate-enter">
                <div className="header-content">
                    <div className="greeting-row">
                        <span className="greeting-text">
                            {getGreeting()}, {user?.fullName || user?.firstName || 'there'}!
                        </span>
                        <LiveIndicator />
                    </div>
                    <div className="dashboard-header-titles">
                        <h1 className="page-title">Dashboard Overview</h1>
                        <p className="page-subtitle">Real-time insights into your workspace activity</p>
                    </div>
                </div>
                <div className="header-actions">
                    <div className="custom-dropdown site-dropdown" ref={dropdownRef}>
                        <div
                            className={`dropdown-trigger ${isDropdownOpen ? 'active' : ''}`}
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        >
                            <MapPin size={16} className="trigger-icon" />
                            <div className="trigger-text">
                                {selectedSite
                                    ? sites.find(s => s._id === selectedSite)?.siteName || 'Unknown Site'
                                    : 'All Assigned Sites'}
                            </div>
                            <ChevronDown size={16} className={`chevron-icon ${isDropdownOpen ? 'rotate' : ''}`} />
                        </div>

                        {isDropdownOpen && (
                            <div className="dropdown-menu animate-slide-in">
                                <div className="dropdown-search">
                                    <Search size={14} className="search-icon" />
                                    <input
                                        type="text"
                                        placeholder="Search sites..."
                                        value={siteSearchTerm}
                                        onChange={(e) => setSiteSearchTerm(e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        autoFocus
                                    />
                                </div>
                                <div className="dropdown-options">
                                    <div
                                        className={`dropdown-option ${!selectedSite ? 'selected' : ''}`}
                                        onClick={() => {
                                            setSelectedSite('');
                                            setIsDropdownOpen(false);
                                            setSiteSearchTerm('');
                                        }}
                                    >
                                        <div className="option-info">
                                            <span className="option-label">All Assigned Sites</span>
                                            <span className="option-subtext">Global overview</span>
                                        </div>
                                        {!selectedSite && <CheckCircle size={14} className="check-icon" />}
                                    </div>
                                    <div className="dropdown-divider"></div>
                                    {sites
                                        .filter(s => s.siteName.toLowerCase().includes(siteSearchTerm.toLowerCase()) ||
                                            s.siteUniqueID.toLowerCase().includes(siteSearchTerm.toLowerCase()))
                                        .map(site => (
                                            <div
                                                key={site._id}
                                                className={`dropdown-option ${selectedSite === site._id ? 'selected' : ''}`}
                                                onClick={() => {
                                                    setSelectedSite(site._id);
                                                    setIsDropdownOpen(false);
                                                    setSiteSearchTerm('');
                                                }}
                                            >
                                                <div className="option-info">
                                                    <span className="option-label">{site.siteName}</span>
                                                    <span className="option-subtext">{site.siteUniqueID}</span>
                                                </div>
                                                {selectedSite === site._id && <CheckCircle size={14} className="check-icon" />}
                                            </div>
                                        ))}
                                    {sites.filter(s => s.siteName.toLowerCase().includes(siteSearchTerm.toLowerCase()) ||
                                        s.siteUniqueID.toLowerCase().includes(siteSearchTerm.toLowerCase())).length === 0 && (
                                            <div className="dropdown-no-results">No sites found</div>
                                        )}
                                </div>
                            </div>
                        )}
                    </div>
                    <button
                        className={`btn btn-secondary dashboard-refresh-btn ${refreshing ? 'refreshing' : ''}`}
                        onClick={() => fetchStats(true)}
                        disabled={refreshing}
                        title="Refresh Data"
                    >
                        <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
                        <span className="btn-text">Refresh</span>
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="dashboard-stats-grid">
                <Link to="/tickets?status=Open" className="stat-card primary animate-enter delay-100">
                    <div className="stat-card-bg-blob"></div>
                    <div className="stat-header">
                        <div className="stat-icon-wrapper">
                            <Ticket size={20} />
                        </div>
                        <span className="stat-link">
                            View All <ArrowUpRight size={14} />
                        </span>
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">
                            <AnimatedStatValue value={stats?.totalTickets || 0} />
                        </div>
                        <div className="stat-label">Total Tickets</div>
                    </div>
                    <div className="stat-footer">
                        <span className="stat-total">
                            <AnimatedStatValue value={stats?.totalTickets || 0} /> total
                        </span>
                    </div>
                </Link>

                {/* <Link to="/tickets?status=Open" className="stat-card primary animate-enter delay-100">
                    <div className="stat-card-bg-blob"></div>
                    <div className="stat-header">
                        <div className="stat-icon-wrapper">
                            <Ticket size={20} />
                        </div>
                        <span className="stat-link">
                            View All <ArrowUpRight size={14} />
                        </span>
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">
                            <AnimatedStatValue value={stats?.openTickets || 0} />
                        </div>
                        <div className="stat-label">Open Tickets</div>
                    </div>
                    <div className="stat-footer">
                        <span className="stat-total">
                            <AnimatedStatValue value={stats?.totalTickets || 0} /> total
                        </span>
                    </div>
                </Link> */}


                <Link to="/tickets?slaBreached=true" className="stat-card danger animate-enter delay-300">
                    <div className="stat-card-bg-blob"></div>
                    <div className="stat-header">
                        <div className="stat-icon-wrapper">
                            <AlertTriangle size={20} />
                        </div>
                        <span className="stat-link">
                            View All <ArrowUpRight size={14} />
                        </span>
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">
                            <AnimatedStatValue value={stats?.openTickets || 0} />
                        </div>
                        <div className="stat-label">Open Tickets</div>
                    </div>
                    <div className="stat-footer">
                        <span className="stat-total"><AnimatedStatValue value={stats?.totalTickets || 0} /> total</span>
                    </div>
                </Link>

                <Link to="/tickets?status=InProgress" className="stat-card warning animate-enter delay-200">
                    <div className="stat-card-bg-blob"></div>
                    <div className="stat-header">
                        <div className="stat-icon-wrapper">
                            <Activity size={20} />
                        </div>
                        <span className="stat-link">
                            View All <ArrowUpRight size={14} />
                        </span>
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">
                            <AnimatedStatValue value={stats?.inProgressTickets || 0} />
                        </div>
                        <div className="stat-label">In Progress</div>
                    </div>
                    <div className="stat-footer">
                        <span className="text-success">+<AnimatedStatValue value={stats?.resolvedToday || 0} /> resolved today</span>
                    </div>
                </Link>
                <Link to="/tickets?status=Escalated" className="stat-card primary animate-enter delay-100">
                    <div className="stat-card-bg-blob"></div>
                    <div className="stat-header">
                        <div className="stat-icon-wrapper">
                            <Ticket size={20} />
                        </div>
                        <span className="stat-link">
                            View All <ArrowUpRight size={14} />
                        </span>
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">
                            <AnimatedStatValue value={stats?.escalatedTickets || 0} />
                        </div>
                        <div className="stat-label">Escalated Tickets</div>
                    </div>
                    <div className="stat-footer">
                        <span className="stat-total">
                            <AnimatedStatValue value={stats?.totalTickets || 0} /> total
                        </span>
                    </div>
                </Link>
                <Link to="/tickets?slaBreached=true" className="stat-card danger animate-enter delay-300">
                    <div className="stat-card-bg-blob"></div>
                    <div className="stat-header">
                        <div className="stat-icon-wrapper">
                            <AlertTriangle size={20} />
                        </div>
                        <span className="stat-link">
                            View All <ArrowUpRight size={14} />
                        </span>
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">
                            <AnimatedStatValue value={stats?.slaBreached || 0} />
                        </div>
                        <div className="stat-label">SLA Breached</div>
                    </div>
                    <div className="stat-footer">
                        <span className="text-warning"><AnimatedStatValue value={stats?.slaAtRisk || 0} /> at risk</span>
                    </div>
                </Link>

                <Link to="/tickets?status=Resolved" className="stat-card success animate-enter delay-400">
                    <div className="stat-card-bg-blob"></div>
                    <div className="stat-header">
                        <div className="stat-icon-wrapper">
                            <TrendingUp size={20} />
                        </div>
                        <span className="stat-link">
                            View All <ArrowUpRight size={14} />
                        </span>
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">
                            <AnimatedStatValue value={stats?.slaCompliancePercent || 0} suffix="%" />
                        </div>
                        <div className="stat-label">SLA Compliance</div>
                    </div>
                    <div className="stat-footer">
                        <div className="compliance-bar">
                            <div className="compliance-fill" style={{ width: `${stats?.slaCompliancePercent || 0}%` }}></div>
                        </div>
                        <span>Target: 95%</span>
                    </div>
                </Link>
            </div>

            {/* Second Row - Assets & Engineers */}
            <div className="dashboard-stats-grid secondary-stats animate-enter delay-200">
                <div className="stat-card assets-card">
                    <div className="stat-header">
                        <div className="stat-icon-wrapper" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>
                            <Monitor size={20} />
                        </div>
                        <Link to="/assets" className="stat-link">
                            Manage Assets <ArrowUpRight size={14} />
                        </Link>
                    </div>
                    <div className="stat-value" style={{ fontSize: '2.5rem', background: 'none', WebkitTextFillColor: 'var(--text-primary)' }}>
                        {stats?.totalAssets || 0}
                    </div>
                    <div className="stat-label">Total Assets Monitored</div>

                    {assets.length > 0 ? (
                        <div className="assets-list">
                            {assets.slice(0, 5).map((asset, index) => (
                                <div key={asset.assetId} className="asset-item" style={{ animationDelay: `${index * 50}ms` }}>
                                    <div className={`asset-status-icon ${asset.status === 'Online' ? 'online' : (asset.status === 'Not Installed' ? 'not-installed' : 'offline')}`}>
                                        {asset.status === 'Online' ? <Wifi size={12} /> : (asset.status === 'Not Installed' ? <Package size={12} /> : <WifiOff size={12} />)}
                                    </div>
                                    <div className="asset-info">
                                        <span className="asset-name">{asset.assetName}</span>
                                        <span className="asset-type">{asset.assetTypeName || asset.assetType}</span>
                                    </div>
                                    <span className={`asset-status-badge ${asset.status.replace(/\s+/g, '-').toLowerCase()}`}>{asset.status}</span>
                                </div>
                            ))}
                            {(stats?.totalAssets || assets.length) > 5 && (
                                <Link to="/assets" className="view-more-link">+{(stats?.totalAssets || assets.length) - 5} more assets</Link>
                            )}
                        </div>
                    ) : (
                        <EmptyState icon={Monitor} title="No assets found" description="Add your first asset to start monitoring" />
                    )}
                </div>

                <div className="stat-card engineers-card">
                    <div className="stat-header">
                        <div className="stat-icon-wrapper" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>
                            <Users size={20} />
                        </div>
                        {canSeeUsers && (
                            <Link to="/users" className="stat-link">
                                Manage Team <ArrowUpRight size={14} />
                            </Link>
                        )}
                    </div>
                    <div className="stat-value" style={{ fontSize: '2.5rem', background: 'none', WebkitTextFillColor: 'var(--text-primary)' }}>
                        {engineers.length || stats?.availableEngineers || 0}
                    </div>
                    <div className="stat-label">Active Engineers</div>

                    {engineers.length > 0 ? (
                        <div className="engineers-list">
                            {engineers.slice(0, 5).map((engineer, index) => (
                                <div key={engineer.value} className="engineer-item" style={{ animationDelay: `${index * 50}ms` }}>
                                    <div className="engineer-avatar">
                                        <User size={14} />
                                    </div>
                                    <div className="engineer-info">
                                        <span className="engineer-name">{engineer.label}</span>
                                        <span className="engineer-role">Field Engineer</span>
                                    </div>
                                    <div className="engineer-status online"></div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <EmptyState icon={Users} title="No engineers available" description="Team members will appear here" />
                    )}
                </div>

                <div className="stat-card sites-card">
                    <div className="stat-header">
                        <div className="stat-icon-wrapper" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>
                            <Building2 size={20} />
                        </div>
                        {isAdmin && (
                            <Link to="/sites" className="stat-link">
                                Manage Sites <ArrowUpRight size={14} />
                            </Link>
                        )}
                    </div>
                    <div className="stat-value" style={{ fontSize: '2.5rem', background: 'none', WebkitTextFillColor: 'var(--text-primary)' }}>
                        {sites.length || 0}
                    </div>
                    <div className="stat-label">Active Sites</div>

                    {sites.length > 0 ? (
                        <div className="sites-list">
                            {sites.slice(0, 5).map((site, index) => (
                                <div key={site._id} className="site-item" style={{ animationDelay: `${index * 50}ms` }}>
                                    <div className="site-icon">
                                        <MapPin size={14} />
                                    </div>
                                    <div className="site-info">
                                        <span className="site-name">{site.siteName}</span>
                                        <span className="site-city">{site.city || site.siteUniqueID}</span>
                                    </div>
                                    <span className="site-status-badge active">Active</span>
                                </div>
                            ))}
                            {sites.length > 5 && (
                                <Link to="/sites" className="view-more-link">+{sites.length - 5} more sites</Link>
                            )}
                        </div>
                    ) : (
                        <EmptyState icon={Building2} title="No sites found" description="Add sites to manage locations" />
                    )}
                </div>
            </div>

            {/* Charts Section */}
            <div className="dashboard-charts-grid animate-enter delay-300">
                {/* Tickets by Priority */}
                <div className="dashboard-chart-card">
                    <h3 className="chart-title"><Zap size={18} className="text-warning-500" /> Tickets by Priority</h3>
                    <div className="chart-container">
                        {stats?.ticketsByPriority?.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={stats.ticketsByPriority}
                                        dataKey="count"
                                        nameKey="priority"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={80}
                                        innerRadius={55}
                                        paddingAngle={5}
                                        label={({ priority, percent }) => `${priority} ${(percent * 100).toFixed(0)}%`}
                                        labelLine={false}
                                    >
                                        {stats.ticketsByPriority.map((entry, index) => (
                                            <Cell key={index} fill={PRIORITY_COLORS[entry.priority] || '#6b7280'} strokeWidth={0} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <EmptyState icon={PieChartIcon} title="No active tickets" description="Create a ticket to see priority distribution" />
                        )}
                    </div>
                    <div className="chart-legend">
                        {Object.entries(PRIORITY_COLORS).map(([key, color]) => (
                            <div key={key} className="legend-item">
                                <span className="legend-color" style={{ background: color }}></span>
                                <span>{key}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Tickets by Status */}
                <div className="dashboard-chart-card">
                    <h3 className="chart-title"><BarChart2 size={18} className="text-primary-500" /> Tickets by Status</h3>
                    <div className="chart-container">
                        {stats?.ticketsByStatus?.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.ticketsByStatus} layout="vertical" margin={{ left: 0, right: 10, top: 10 }}>
                                    <XAxis type="number" hide />
                                    <YAxis
                                        type="category"
                                        dataKey="status"
                                        width={100}
                                        tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg-tertiary)', opacity: 0.4 }} />
                                    <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
                                        {stats.ticketsByStatus.map((entry, index) => (
                                            <Cell key={index} fill={STATUS_COLORS[entry.status] || '#6b7280'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <EmptyState icon={BarChart2} title="No ticket data" description="Status distribution will appear here" />
                        )}
                    </div>
                </div>

                {/* Tickets by Category */}
                <div className="dashboard-chart-card">
                    <h3 className="chart-title"><Layers size={18} className="text-secondary" /> Ticket Categories</h3>
                    <div className="category-list">
                        {stats?.ticketsByCategory?.length > 0 ? (
                            stats.ticketsByCategory.slice(0, 5).map((cat, index) => (
                                <div key={index} className="category-item" style={{ animationDelay: `${index * 100}ms` }}>
                                    <div className="category-info">
                                        <span className="category-name">{cat.category}</span>
                                        <span className="category-count">{cat.count}</span>
                                    </div>
                                    <div className="category-bar">
                                        <div
                                            className="category-fill animated"
                                            style={{
                                                width: `${(cat.count / Math.max(...stats.ticketsByCategory.map(c => c.count))) * 100}%`,
                                                animationDelay: `${index * 100 + 200}ms`
                                            }}
                                        ></div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <EmptyState icon={Layers} title="No category data" description="Categories will appear as tickets are created" />
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="quick-actions animate-enter delay-400">
                <h3 className="section-title">
                    <Zap size={20} className="text-warning" />
                    Quick Actions
                </h3>
                <div className="actions-grid">
                    <Link to="/tickets/new" className="action-card">
                        <div className="action-icon primary">
                            <Plus strokeWidth={2} size={24} />
                        </div>
                        <span className="action-label">Create Ticket</span>
                        <span className="action-desc">Log a new issue</span>
                    </Link>
                    <Link to="/assets/new" className="action-card">
                        <div className="action-icon success">
                            <Monitor strokeWidth={1.5} size={24} />
                        </div>
                        <span className="action-label">Add Asset</span>
                        <span className="action-desc">Register device</span>
                    </Link>
                    <Link to="/tickets?status=Open" className="action-card">
                        <div className="action-icon warning">
                            <Inbox strokeWidth={1.5} size={24} />
                        </div>
                        <span className="action-label">Open Tickets</span>
                        <span className="action-desc">View pending</span>
                    </Link>
                    <Link to="/tickets?slaBreached=true" className="action-card">
                        <div className="action-icon danger">
                            <AlertTriangle strokeWidth={1.5} size={24} />
                        </div>
                        <span className="action-label">SLA Breaches</span>
                        <span className="action-desc">Urgent items</span>
                    </Link>
                </div>
            </div>
        </div>
    );
}
