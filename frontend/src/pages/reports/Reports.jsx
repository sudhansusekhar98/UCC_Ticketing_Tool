import React, { useState, useEffect } from 'react';
import { reportingApi, sitesApi } from '../../services/api';
import ReportFilters from '../../components/reporting/ReportFilters';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { FileDown, Activity, AlertCircle, CheckCircle, Package, RefreshCw, RotateCcw, Monitor, Users, HardDrive, FileText, ChevronDown, Download, Building2 } from 'lucide-react';
import './Reports.css';
import toast from 'react-hot-toast';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7c43'];
const RMA_COLORS = {
    'Requested': '#f59e0b',
    'Approved': '#3b82f6',
    'Ordered': '#8b5cf6',
    'Dispatched': '#06b6d4',
    'Received': '#14b8a6',
    'Installed': '#22c55e',
    'Rejected': '#ef4444'
};

const REPORT_TYPES = [
    { id: 'tickets', label: 'Tickets Report', icon: FileText, description: 'Export all tickets with status, priority, and SLA information' },
    { id: 'employees', label: 'Employee Status Report', icon: Users, description: 'Export employee details with assigned tickets summary' },
    { id: 'assets', label: 'Asset Status Report', icon: HardDrive, description: 'Export all assets with status, location, and RMA history' },
    { id: 'rma', label: 'RMA Report', icon: RotateCcw, description: 'Export RMA requests with timeline and status details' },
];

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="custom-tooltip">
                <p className="tooltip-label">{label}</p>
                {payload.map((entry, index) => (
                    <p key={index} className="tooltip-item" style={{ color: entry.color }}>
                        {entry.name}: {entry.value}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

export default function Reports() {
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        siteId: ''
    });
    
    const [ticketStats, setTicketStats] = useState(null);
    const [slaStats, setSlaStats] = useState(null);
    const [assetStats, setAssetStats] = useState(null);
    const [rmaStats, setRmaStats] = useState(null);
    
    // Export modal state
    const [showExportPanel, setShowExportPanel] = useState(false);
    const [selectedReportType, setSelectedReportType] = useState('tickets');
    const [exportSiteId, setExportSiteId] = useState('all');
    const [sites, setSites] = useState([]);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        fetchData();
        fetchSites();
    }, [filters]);

    const fetchSites = async () => {
        try {
            const response = await sitesApi.getDropdown();
            setSites(response.data.data || []);
        } catch (error) {
            console.error('Error fetching sites:', error);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        
        try {
            // Use allSettled to allow partial data loading
            const results = await Promise.allSettled([
                reportingApi.getTicketStats(filters),
                reportingApi.getSLAPerformance(filters),
                reportingApi.getAssetStats(filters),
                reportingApi.getRMAStats(filters)
            ]);

            const [ticketsRes, slaRes, assetsRes, rmaRes] = results;

            // Handle Tickets Stats
            if (ticketsRes.status === 'fulfilled') {
                setTicketStats(ticketsRes.value.data.data);
            } else {
                console.error('Tickets stats failed:', ticketsRes.reason);
                toast.error('Failed to load tickets data: ' + (ticketsRes.reason.response?.data?.message || ticketsRes.reason.message));
            }

            // Handle SLA Stats
            if (slaRes.status === 'fulfilled') {
                setSlaStats(slaRes.value.data.data);
            } else {
                console.error('SLA stats failed:', slaRes.reason);
            }

            // Handle Asset Stats
            if (assetsRes.status === 'fulfilled') {
                setAssetStats(assetsRes.value.data.data);
            } else {
                console.error('Asset stats failed:', assetsRes.reason);
            }

            // Handle RMA Stats
            if (rmaRes.status === 'fulfilled') {
                setRmaStats(rmaRes.value.data.data);
            } else {
                console.error('RMA stats failed:', rmaRes.reason);
            }

        } catch (error) {
            console.error('Error fetching reports:', error);
            toast.error('Unexpected error loading reports');
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (newFilters) => {
        setFilters(newFilters);
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            let response;
            let filename;
            const exportParams = { 
                siteId: exportSiteId,
                startDate: filters.startDate,
                endDate: filters.endDate
            };

            switch (selectedReportType) {
                case 'employees':
                    response = await reportingApi.exportEmployeeStatus(exportParams);
                    filename = `employee_status_report_${new Date().toISOString().slice(0, 10)}.xlsx`;
                    break;
                case 'assets':
                    response = await reportingApi.exportAssetStatus(exportParams);
                    filename = `asset_status_report_${new Date().toISOString().slice(0, 10)}.xlsx`;
                    break;
                case 'rma':
                    response = await reportingApi.exportRMA(exportParams);
                    filename = `rma_report_${new Date().toISOString().slice(0, 10)}.xlsx`;
                    break;
                case 'tickets':
                default:
                    response = await reportingApi.exportReport(exportParams);
                    filename = `tickets_report_${new Date().toISOString().slice(0, 10)}.xlsx`;
                    break;
            }
            
            // Create download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            
            toast.success('Report exported successfully!');
            setShowExportPanel(false);
        } catch (error) {
            console.error('Export failed:', error);
            toast.error('Failed to export report');
        } finally {
            setExporting(false);
        }
    };

    if (loading && !ticketStats) {
        return <div className="loading-container"><div className="spinner"></div></div>;
    }

    const selectedReport = REPORT_TYPES.find(r => r.id === selectedReportType);

    return (
        <div className="reports-page animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Reports & Analytics</h1>
                    <p className="page-subtitle">Overview of system performance and metrics</p>
                </div>
                <div className="flex gap-3">
                    <button className="btn btn-outline flex items-center gap-2" onClick={fetchData}>
                        <RefreshCw size={18} />
                        Refresh
                    </button>
                    <button 
                        className="btn btn-primary flex items-center gap-2" 
                        onClick={() => setShowExportPanel(!showExportPanel)}
                    >
                        <FileDown size={18} />
                        Export Reports
                        <ChevronDown size={16} className={`export-chevron ${showExportPanel ? 'rotated' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Export Panel */}
            {showExportPanel && (
                <div className="export-panel">
                    <div className="export-panel-header">
                        <h3><Download size={20} /> Export Reports</h3>
                        <p>Select a report type and choose filtering options to generate your export</p>
                    </div>
                    
                    <div className="export-panel-content">
                        <div className="export-report-types">
                            {REPORT_TYPES.map((report) => {
                                const IconComponent = report.icon;
                                return (
                                    <div 
                                        key={report.id}
                                        className={`export-report-card ${selectedReportType === report.id ? 'selected' : ''}`}
                                        onClick={() => setSelectedReportType(report.id)}
                                    >
                                        <div className="export-report-icon">
                                            <IconComponent size={24} />
                                        </div>
                                        <div className="export-report-info">
                                            <h4>{report.label}</h4>
                                            <p>{report.description}</p>
                                        </div>
                                        <div className="export-report-check">
                                            {selectedReportType === report.id && (
                                                <CheckCircle size={20} />
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="export-filters">
                            <div className="export-filter-group">
                                <label>
                                    <Building2 size={16} />
                                    Filter by Site
                                </label>
                                <select 
                                    value={exportSiteId} 
                                    onChange={(e) => setExportSiteId(e.target.value)}
                                    className="export-select"
                                >
                                    <option value="all">All Sites</option>
                                    {sites.map((site) => (
                                        <option key={site._id} value={site._id}>
                                            {site.siteName} {site.siteCode ? `(${site.siteCode})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="export-actions">
                            <button 
                                className="btn btn-outline" 
                                onClick={() => setShowExportPanel(false)}
                            >
                                Cancel
                            </button>
                            <button 
                                className="btn btn-primary export-btn" 
                                onClick={handleExport}
                                disabled={exporting}
                            >
                                {exporting ? (
                                    <>
                                        <span className="btn-spinner"></span>
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Download size={18} />
                                        Download {selectedReport?.label}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ReportFilters filters={filters} onFilterChange={handleFilterChange} />

            {/* Summary Cards */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon bg-blue-100 text-blue-600">
                        <Activity size={24} />
                    </div>
                    <div className="stat-info">
                        <h3>Total Tickets</h3>
                        <p className="stat-value">
                            {ticketStats?.status?.reduce((acc, curr) => acc + curr.count, 0) || 0}
                        </p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon bg-red-100 text-red-600">
                        <AlertCircle size={24} />
                    </div>
                    <div className="stat-info">
                        <h3>SLA Breached</h3>
                        <p className="stat-value">{slaStats?.breached || 0}</p>
                        <span className="stat-sub">
                            {slaStats?.total ? ((slaStats.breached / slaStats.total) * 100).toFixed(1) : 0}% of total
                        </span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon bg-green-100 text-green-600">
                        <CheckCircle size={24} />
                    </div>
                    <div className="stat-info">
                        <h3>SLA Target Met</h3>
                        <p className="stat-value">{slaStats?.met || 0}</p>
                    </div>
                </div>
                 
                <div className="stat-card">
                    <div className="stat-icon bg-purple-100 text-purple-600">
                        <Package size={24} />
                    </div>
                    <div className="stat-info">
                        <h3>Total Assets</h3>
                        <p className="stat-value">
                           {assetStats?.byType?.reduce((acc, curr) => acc + curr.count, 0) || 0}
                        </p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon bg-orange-100 text-orange-600">
                        <RotateCcw size={24} />
                    </div>
                    <div className="stat-info">
                        <h3>Total RMAs</h3>
                        <p className="stat-value">{rmaStats?.summary?.total || 0}</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon bg-cyan-100 text-cyan-600">
                        <Monitor size={24} />
                    </div>
                    <div className="stat-info">
                        <h3>Assets Operational</h3>
                        <p className="stat-value">
                           {assetStats?.byStatus?.find(s => s._id === 'Operational')?.count || 0}
                        </p>
                    </div>
                </div>
            </div>

            <div className="charts-grid">
                {/* Tickets by Status */}
                <div className="chart-card">
                    <h3>Tickets by Status</h3>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={ticketStats?.status}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="_id" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(59, 130, 246, 0.1)'}} />
                                <Bar dataKey="count" fill="#3b82f6" name="Tickets" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Tickets by Category */}
                <div className="chart-card">
                    <h3>Tickets by Category</h3>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={ticketStats?.category}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="count"
                                    nameKey="_id"
                                >
                                    {ticketStats?.category?.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Tickets by Priority */}
                <div className="chart-card">
                    <h3>Tickets by Priority</h3>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={ticketStats?.priority} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} stroke="#e2e8f0" />
                                <XAxis type="number" axisLine={false} tickLine={false} />
                                <YAxis dataKey="_id" type="category" width={80} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(245, 158, 11, 0.1)'}} />
                                <Bar dataKey="count" fill="#f59e0b" name="Tickets" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* SLA Overview */}
                <div className="chart-card">
                    <h3>SLA Overview</h3>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={[
                                        { name: 'Breached', value: slaStats?.breached || 0 },
                                        { name: 'Met', value: slaStats?.met || 0 }
                                    ]}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                    paddingAngle={5}
                                >
                                    <Cell fill="#ef4444" />
                                    <Cell fill="#22c55e" />
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Asset Status Distribution */}
                <div className="chart-card">
                    <h3>Asset Status Distribution</h3>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={assetStats?.byStatus}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ _id, percent }) => `${_id} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="count"
                                    nameKey="_id"
                                >
                                    {assetStats?.byStatus?.map((entry, index) => {
                                        const statusColors = {
                                            'Operational': '#22c55e',
                                            'Degraded': '#f59e0b',
                                            'Offline': '#ef4444',
                                            'Maintenance': '#8b5cf6'
                                        };
                                        return <Cell key={`cell-${index}`} fill={statusColors[entry._id] || COLORS[index % COLORS.length]} />;
                                    })}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Asset by Type */}
                <div className="chart-card">
                    <h3>Assets by Type</h3>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={assetStats?.byType} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} stroke="#e2e8f0" />
                                <XAxis type="number" axisLine={false} tickLine={false} />
                                <YAxis dataKey="_id" type="category" width={100} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(139, 92, 246, 0.1)'}} />
                                <Bar dataKey="count" fill="#8b5cf6" name="Assets" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* RMA by Status */}
                <div className="chart-card">
                    <h3>RMA Requests by Status</h3>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={rmaStats?.byStatus}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="_id" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(249, 115, 22, 0.1)'}} />
                                <Bar dataKey="count" name="RMAs" radius={[4, 4, 0, 0]}>
                                    {rmaStats?.byStatus?.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={RMA_COLORS[entry._id] || COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* RMA Trend */}
                <div className="chart-card">
                    <h3>RMA Trend (Monthly)</h3>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={rmaStats?.trend}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area 
                                    type="monotone" 
                                    dataKey="count" 
                                    stroke="#f97316" 
                                    fill="url(#rmaGradient)" 
                                    name="RMAs"
                                    strokeWidth={2}
                                />
                                <defs>
                                    <linearGradient id="rmaGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
