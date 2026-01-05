import { useEffect, useState } from 'react';
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
} from 'lucide-react';
import { ticketsApi, usersApi, assetsApi } from '../../services/api';
import useAuthStore from '../../context/authStore';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import toast from 'react-hot-toast';
import './Dashboard.css';

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

export default function Dashboard() {
    const [stats, setStats] = useState(null);
    const [engineers, setEngineers] = useState([]);
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const { hasRole } = useAuthStore();
    
    // Permission checks
    const isAdmin = hasRole(['Admin']);
    const canSeeUsers = hasRole(['Admin']);

    const fetchStats = async (showToast = false) => {
        try {
            if (showToast) setRefreshing(true);
            const response = await ticketsApi.getDashboardStats();
            // Handle Express response format (data nested in data.data)
            setStats(response.data.data || response.data);
            if (showToast) toast.success('Dashboard refreshed');
        } catch (error) {
            console.error('Failed to fetch dashboard stats:', error);
            toast.error('Failed to load dashboard data');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchEngineers = async () => {
        try {
            const response = await usersApi.getEngineers();
            const engineerData = response.data.data || response.data || [];
            // Map to expected format with value/label
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
            const response = await assetsApi.getAll({ limit: 50 });
            // Handle both Express (data.data) and .NET (data.items) formats
            let assetData = response.data.data || response.data.items || response.data || [];
            // Map to expected format
            assetData = assetData.map(a => ({
                ...a,
                assetId: a._id || a.assetId,
                assetName: a.assetCode || a.assetName,
                assetTypeName: a.assetType,
                status: a.status === 'Operational' ? 'Online' : 'Offline'
            }));
            setAssets(assetData);
        } catch (error) {
            console.error('Failed to fetch assets:', error);
        }
    };

    useEffect(() => {
        fetchStats();
        fetchEngineers();
        fetchAssets();
        // Refresh every 30 seconds
        const interval = setInterval(() => fetchStats(), 30000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p>Loading dashboard...</p>
            </div>
        );
    }

    return (
        <div className="dashboard animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Dashboard</h1>
                    <p className="page-subtitle">Real-time overview of your ticketing system</p>
                </div>
                <button
                    className="btn btn-secondary"
                    onClick={() => fetchStats(true)}
                    disabled={refreshing}
                >
                    <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* Stats Cards */}
            <div className="stats-grid">
                <div className="stat-card glass-card primary">
                    <div className="stat-header">
                        <Ticket size={24} />
                        <Link to="/tickets" className="stat-link">
                            View All <ArrowUpRight size={14} />
                        </Link>
                    </div>
                    <div className="stat-value">{stats?.openTickets || 0}</div>
                    <div className="stat-label">Open Tickets</div>
                    <div className="stat-footer">
                        <span className="stat-total">{stats?.totalTickets || 0} total</span>
                    </div>
                </div>

                <div className="stat-card glass-card warning">
                    <div className="stat-header">
                        <Activity size={24} />
                    </div>
                    <div className="stat-value">{stats?.inProgressTickets || 0}</div>
                    <div className="stat-label">In Progress</div>
                    <div className="stat-footer">
                        <span className="text-success">+{stats?.resolvedToday || 0} resolved today</span>
                    </div>
                </div>

                <div className="stat-card glass-card danger">
                    <div className="stat-header">
                        <AlertTriangle size={24} />
                    </div>
                    <div className="stat-value">{stats?.slaBreached || 0}</div>
                    <div className="stat-label">SLA Breached</div>
                    <div className="stat-footer">
                        <span className="text-warning">{stats?.slaAtRisk || 0} at risk</span>
                    </div>
                </div>

                <div className="stat-card glass-card success">
                    <div className="stat-header">
                        <TrendingUp size={24} />
                    </div>
                    <div className="stat-value">{stats?.slaCompliancePercent || 0}%</div>
                    <div className="stat-label">SLA Compliance</div>
                    <div className="stat-footer">
                        <span>Target: 95%</span>
                    </div>
                </div>
            </div>

            {/* Second Row - Assets & Engineers */}
            <div className="stats-grid secondary-stats">
                <div className="stat-card glass-card assets-card">
                    <div className="stat-header">
                        <Monitor size={24} />
                        <Link to="/assets" className="stat-link">
                            View All <ArrowUpRight size={14} />
                        </Link>
                    </div>
                    <div className="stat-value">{stats?.totalAssets || 0}</div>
                    <div className="stat-label">Total Assets</div>
                    <div className="stat-footer">
                        <span className="text-danger">{stats?.offlineAssets || 0} offline</span>
                    </div>
                    {assets.length > 0 && (
                        <div className="assets-list">
                            {assets.slice(0, 10).map((asset) => (
                                <div key={asset.assetId} className="asset-item">
                                    <div className={`asset-status-icon ${asset.status === 'Online' ? 'online' : 'offline'}`}>
                                        {asset.status === 'Online' ? <Wifi size={12} /> : <WifiOff size={12} />}
                                    </div>
                                    <div className="asset-info">
                                        <span className="asset-name">{asset.assetName}</span>
                                        <span className="asset-type">{asset.assetTypeName || asset.assetType}</span>
                                    </div>
                                </div>
                            ))}
                            {assets.length > 10 && (
                                <Link to="/assets" className="more-assets">+{assets.length - 10} more</Link>
                            )}
                        </div>
                    )}
                </div>
                

                <div className="stat-card glass-card engineers-card">
                    <div className="stat-header">
                        <Users size={24} />
                        {canSeeUsers && (
                            <Link to="/users" className="stat-link">
                                View All <ArrowUpRight size={14} />
                            </Link>
                        )}
                    </div>
                    <div className="stat-value">{engineers.length || stats?.availableEngineers || 0}</div>
                    <div className="stat-label">Available Engineers</div>
                    {engineers.length > 0 && (
                        <div className="engineers-list">
                            {engineers.map((engineer) => (
                                <div key={engineer.value} className="engineer-item">
                                    <div className="engineer-avatar">
                                        <User size={14} />
                                    </div>
                                    <div className="engineer-info">
                                        <span className="engineer-name">{engineer.label}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Charts Section */}
            <div className="charts-grid">
                {/* Tickets by Priority */}
                <div className="chart-card glass-card">
                    <h3 className="chart-title">Tickets by Priority</h3>
                    <div className="chart-container">
                        {stats?.ticketsByPriority?.length > 0 ? (
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie
                                        data={stats.ticketsByPriority}
                                        dataKey="count"
                                        nameKey="priority"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={70}
                                        innerRadius={45}
                                        paddingAngle={5}
                                        label={({ priority, count }) => `${priority}: ${count}`}
                                        labelLine={{ stroke: 'var(--text-muted)', strokeWidth: 1 }}
                                    >
                                        {stats.ticketsByPriority.map((entry, index) => (
                                            <Cell key={index} fill={PRIORITY_COLORS[entry.priority] || '#6b7280'} />
                                        ))}
                                    </Pie>

                                    <Tooltip
                                        contentStyle={{
                                            background: 'var(--bg-secondary)',
                                            border: '1px solid var(--border-light)',
                                            borderRadius: 'var(--radius-md)',
                                            fontSize: '12px',
                                            color: 'var(--text-primary)'
                                        }}
                                        labelStyle={{ color: 'var(--text-primary)' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="no-data">No active tickets</div>
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
                <div className="chart-card glass-card">
                    <h3 className="chart-title">Tickets by Status</h3>
                    <div className="chart-container">
                        {stats?.ticketsByStatus?.length > 0 ? (
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={stats.ticketsByStatus} layout="vertical" margin={{ left: 10, right: 20 }}>
                                    <XAxis 
                                        type="number" 
                                        stroke="var(--text-muted)" 
                                        tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                                        axisLine={{ stroke: 'var(--border-light)' }}
                                        tickLine={{ stroke: 'var(--border-light)' }}
                                    />
                                    <YAxis
                                        type="category"
                                        dataKey="status"
                                        stroke="var(--text-muted)"
                                        width={90}
                                        tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                                        axisLine={{ stroke: 'var(--border-light)' }}
                                        tickLine={false}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            background: 'var(--bg-secondary)',
                                            border: '1px solid var(--border-light)',
                                            borderRadius: 'var(--radius-md)',
                                            fontSize: '12px',
                                            color: 'var(--text-primary)'
                                        }}
                                        labelStyle={{ color: 'var(--text-primary)' }}
                                    />
                                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                                        {stats.ticketsByStatus.map((entry, index) => (
                                            <Cell key={index} fill={STATUS_COLORS[entry.status] || '#6b7280'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="no-data">No ticket data</div>
                        )}
                    </div>
                </div>


                {/* Tickets by Category */}
                <div className="chart-card glass-card">
                    <h3 className="chart-title">Tickets by Category</h3>
                    <div className="category-list">
                        {stats?.ticketsByCategory?.length > 0 ? (
                            stats.ticketsByCategory.map((cat, index) => (
                                <div key={index} className="category-item">
                                    <div className="category-info">
                                        <span className="category-name">{cat.category}</span>
                                        <span className="category-count">{cat.count}</span>
                                    </div>
                                    <div className="category-bar">
                                        <div
                                            className="category-fill"
                                            style={{
                                                width: `${(cat.count / Math.max(...stats.ticketsByCategory.map(c => c.count))) * 100}%`
                                            }}
                                        ></div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="no-data">No category data</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="quick-actions glass-card">
                <h3 className="section-title">Quick Actions</h3>
                <div className="actions-grid">
                    <Link to="/tickets/new" className="action-card">
                        <div className="action-icon primary">
                            <Ticket size={24} />
                        </div>
                        <span>Create Ticket</span>
                    </Link>
                    <Link to="/assets/new" className="action-card">
                        <div className="action-icon success">
                            <Monitor size={24} />
                        </div>
                        <span>Add Asset</span>
                    </Link>
                    <Link to="/tickets?status=Open" className="action-card">
                        <div className="action-icon warning">
                            <Clock size={24} />
                        </div>
                        <span>Pending Tickets</span>
                    </Link>
                    <Link to="/tickets?slaBreached=true" className="action-card">
                        <div className="action-icon danger">
                            <AlertTriangle size={24} />
                        </div>
                        <span>SLA Breaches</span>
                    </Link>
                </div>
            </div>
        </div>
    );
}
