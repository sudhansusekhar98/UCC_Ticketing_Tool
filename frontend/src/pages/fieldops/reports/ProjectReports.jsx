import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
    FileText,
    Calendar,
    BarChart3,
    Camera,
    Truck,
    AlertTriangle,
    Clock,
    Filter,
    RefreshCw,
    FileSpreadsheet,
    File,
    Building,
    User,
    MapPin,
    TrendingUp
} from 'lucide-react';
import { fieldOpsApi } from '../../../services/api';
import useAuthStore from '../../../context/authStore';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import '../fieldops.css';
import './ProjectReports.css';

const STATUS_CLASS = {
    Active:    'active',
    Planning:  'planning',
    OnHold:    'onhold',
    Completed: 'completed',
    Cancelled: 'cancelled'
};

const SEVERITY_CLASS = {
    High:     'high',
    Medium:   'medium',
    Low:      'low',
    Critical: 'critical'
};

const RESOLUTION_CLASS = {
    Open:       'open',
    InProgress: 'inprogress',
    Resolved:   'resolved',
    Closed:     'closed',
    Deferred:   'deferred'
};

export default function ProjectReports() {
    const [searchParams] = useSearchParams();
    const projectIdFromUrl = searchParams.get('projectId');
    const { hasRole } = useAuthStore();

    const [projects, setProjects]             = useState([]);
    const [selectedProject, setSelectedProject] = useState(projectIdFromUrl || '');
    const [dateRange, setDateRange]           = useState({ startDate: '', endDate: '' });
    const [reportData, setReportData]         = useState(null);
    const [loading, setLoading]               = useState(false);
    const [exporting, setExporting]           = useState(false);

    const canExport = hasRole(['Admin', 'Supervisor']);

    useEffect(() => { loadProjects(); }, []);

    useEffect(() => {
        if (selectedProject) generateReport();
        else setReportData(null);
    }, [selectedProject, dateRange.startDate, dateRange.endDate]);

    const loadProjects = async () => {
        try {
            const res = await fieldOpsApi.getProjects({ limit: 100 });
            setProjects(res.data.data || []);
        } catch {
            console.error('Failed to load projects');
        }
    };

    const generateReport = async () => {
        if (!selectedProject) return;
        setLoading(true);
        try {
            const params = {};
            if (dateRange.startDate) params.startDate = dateRange.startDate;
            if (dateRange.endDate)   params.endDate   = dateRange.endDate;
            const res = await fieldOpsApi.getProjectReport(selectedProject, params);
            setReportData(res.data.data);
        } catch {
            toast.error('Failed to generate report');
        } finally {
            setLoading(false);
        }
    };

    const handleExportPDF = async () => {
        if (!selectedProject) return toast.error('Please select a project');
        setExporting(true);
        try {
            const params = {};
            if (dateRange.startDate) params.startDate = dateRange.startDate;
            if (dateRange.endDate)   params.endDate   = dateRange.endDate;
            const res = await fieldOpsApi.exportProjectReportPDF(selectedProject, params);
            if (res.data.type === 'application/json') return toast.error('PDF export not yet implemented');
            const blob = new Blob([res.data], { type: 'application/pdf' });
            const url  = window.URL.createObjectURL(blob);
            const a    = document.createElement('a');
            a.href = url;
            a.download = `project-report-${reportData?.project?.projectNumber || 'report'}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast.success('PDF downloaded');
        } catch {
            toast.error('PDF export not yet implemented. Install pdfkit on backend.');
        } finally {
            setExporting(false);
        }
    };

    const handleExportExcel = async () => {
        if (!selectedProject) return toast.error('Please select a project');
        setExporting(true);
        try {
            const params = {};
            if (dateRange.startDate) params.startDate = dateRange.startDate;
            if (dateRange.endDate)   params.endDate   = dateRange.endDate;
            const res = await fieldOpsApi.exportProjectReportExcel(selectedProject, params);
            if (res.data.type === 'application/json') return toast.error('Excel export not yet implemented');
            const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url  = window.URL.createObjectURL(blob);
            const a    = document.createElement('a');
            a.href = url;
            a.download = `project-report-${reportData?.project?.projectNumber || 'report'}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast.success('Excel downloaded');
        } catch {
            toast.error('Excel export not yet implemented. Install exceljs on backend.');
        } finally {
            setExporting(false);
        }
    };

    const progress = reportData?.summary?.latestProgress || 0;
    const devicesByStatus = reportData?.summary?.devicesByStatus || {};

    return (
        <div className="page-container animate-fade-in report-page">

            {/* ── Page Header ── */}
            <div className="page-header" style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: '1rem' }}>
                <div className="header-left">
                    <BarChart3 size={26} className="page-icon" />
                    <h1 className="page-title">Project Reports</h1>
                </div>

                <div className="report-filter-bar-header">
                    <Filter size={16} className="report-filter-icon" />
                    <select
                        value={selectedProject}
                        onChange={e => setSelectedProject(e.target.value)}
                        className="report-filter-project"
                    >
                        <option value="">-- Select Project --</option>
                        {projects.map(p => (
                            <option key={p._id} value={p._id}>
                                {p.projectNumber} – {p.projectName}
                            </option>
                        ))}
                    </select>

                    <div className="report-filter-divider" />

                    <div className="report-filter-date-group">
                        <Calendar size={15} className="report-filter-icon" />
                        <input
                            type="date"
                            className="report-date-input"
                            value={dateRange.startDate}
                            onChange={e => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                        />
                        <span className="report-date-sep">TO</span>
                        <input
                            type="date"
                            className="report-date-input"
                            value={dateRange.endDate}
                            onChange={e => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                        />
                    </div>
                </div>

                <div className="header-actions">
                    <button onClick={generateReport} className="btn btn-ghost" title="Refresh">
                        <RefreshCw size={16} />
                    </button>
                    {canExport && reportData && (
                        <>
                            <button onClick={handleExportPDF} className="btn btn-ghost" disabled={exporting}>
                                <File size={16} /> PDF
                            </button>
                            <button onClick={handleExportExcel} className="btn btn-primary" disabled={exporting}>
                                <FileSpreadsheet size={16} /> Excel
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* ── Empty prompt ── */}
            {!selectedProject && (
                <div className="report-card">
                    <div className="report-empty">
                        <BarChart3 size={52} />
                        <h3>Select a Project</h3>
                        <p>Choose a project above to generate its performance report.</p>
                    </div>
                </div>
            )}

            {/* ── Loading ── */}
            {selectedProject && loading && (
                <div className="report-card">
                    <div className="report-empty">
                        <div className="spinner" />
                        <p>Generating report…</p>
                    </div>
                </div>
            )}

            {/* ── Report Content ── */}
            {selectedProject && !loading && reportData && (
                <>
                    {/* KPI Grid */}
                    <div className="report-kpi-grid">
                        <div className="report-kpi-card">
                            <div className="report-kpi-icon blue"><BarChart3 size={20} /></div>
                            <div className="report-kpi-body">
                                <span className="report-kpi-value">{progress}%</span>
                                <span className="report-kpi-label">Current Progress</span>
                            </div>
                        </div>
                        <div className="report-kpi-card">
                            <div className="report-kpi-icon cyan"><FileText size={20} /></div>
                            <div className="report-kpi-body">
                                <span className="report-kpi-value">{reportData.dailyLogs?.length || 0}</span>
                                <span className="report-kpi-label">Daily Logs</span>
                            </div>
                        </div>
                        <div className="report-kpi-card">
                            <div className="report-kpi-icon green"><Camera size={20} /></div>
                            <div className="report-kpi-body">
                                <span className="report-kpi-value">{reportData.summary?.totalDevices || 0}</span>
                                <span className="report-kpi-label">Devices Installed</span>
                            </div>
                        </div>
                        <div className="report-kpi-card">
                            <div className="report-kpi-icon blue"><Clock size={20} /></div>
                            <div className="report-kpi-body">
                                <span className="report-kpi-value">{reportData.summary?.totalManHours || 0}</span>
                                <span className="report-kpi-label">Man-Hours</span>
                            </div>
                        </div>
                        <div className="report-kpi-card">
                            <div className="report-kpi-icon orange"><Truck size={20} /></div>
                            <div className="report-kpi-body">
                                <span className="report-kpi-value">{reportData.summary?.totalVendorLogs || 0}</span>
                                <span className="report-kpi-label">Vendor Logs</span>
                            </div>
                        </div>
                        <div className="report-kpi-card">
                            <div className="report-kpi-icon red"><AlertTriangle size={20} /></div>
                            <div className="report-kpi-body">
                                <span className="report-kpi-value">{reportData.summary?.openChallenges || 0}</span>
                                <span className="report-kpi-label">Open Challenges</span>
                            </div>
                        </div>
                    </div>

                    {/* Two-column: Summary + Logs */}
                    <div className="report-main-grid">

                        {/* LEFT — Project Summary */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div className="report-card">
                                <div className="report-card-title">
                                    <FileText size={14} /> Project Summary
                                </div>
                                <div className="report-summary-meta">
                                    <div className="report-meta-col">
                                        <div className="report-meta-row">
                                            <span className="report-meta-label">Project</span>
                                            <span className="report-meta-value">
                                                <strong>{reportData.project?.projectNumber}</strong>
                                            </span>
                                        </div>
                                        <div className="report-meta-row">
                                            <span className="report-meta-label">Client</span>
                                            <span className="report-meta-value">{reportData.project?.clientName}</span>
                                        </div>
                                        <div className="report-meta-row">
                                            <span className="report-meta-label">PM</span>
                                            <span className="report-meta-value">
                                                {reportData.project?.assignedPM?.name || 'Unassigned'}
                                            </span>
                                        </div>
                                        {reportData.project?.city && (
                                            <div className="report-meta-row">
                                                <span className="report-meta-label">Site</span>
                                                <span className="report-meta-value" style={{ maxWidth: '180px', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }} title={`${reportData.project.city}${reportData.project.state ? `, ${reportData.project.state}` : ''}`}>
                                                    {reportData.project.city}{reportData.project.state ? `, ${reportData.project.state}` : ''}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="report-meta-col" style={{ alignItems: 'flex-end', textAlign: 'right' }}>
                                        <div className="report-meta-row">
                                            <span className="report-meta-label">Status</span>
                                            <span>
                                                <span className={`report-status-pill ${STATUS_CLASS[reportData.project?.status] || ''}`}>
                                                    {reportData.project?.status}
                                                </span>
                                            </span>
                                        </div>
                                        <div className="report-meta-row">
                                            <span className="report-meta-label">Period</span>
                                            <span className="report-meta-value" style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                                {reportData.project?.contractStartDate
                                                    ? format(new Date(reportData.project.contractStartDate), 'dd MMM yy')
                                                    : '—'}
                                                {' — '}
                                                {reportData.project?.contractEndDate
                                                    ? format(new Date(reportData.project.contractEndDate), 'dd MMM yy')
                                                    : '—'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Progress bar */}
                                <div className="report-progress-section">
                                    <div className="report-progress-header">
                                        <span className="report-progress-label">Overall Progress</span>
                                        <span className="report-progress-pct">{progress}%</span>
                                    </div>
                                    <div className="report-progress-track">
                                        <div className="report-progress-fill" style={{ width: `${progress}%` }} />
                                    </div>
                                </div>
                            </div>

                            {/* Device Summary */}
                            <div className="report-card">
                                <div className="report-card-title">
                                    <Camera size={14} /> Device Installation
                                </div>
                                <div className="report-device-grid">
                                    <div className="report-device-card green">
                                        <span className="report-device-count">{devicesByStatus['Installed'] || 0}</span>
                                        <span className="report-device-label">Installed</span>
                                    </div>
                                    <div className="report-device-card yellow">
                                        <span className="report-device-count">{devicesByStatus['Testing'] || 0}</span>
                                        <span className="report-device-label">Testing</span>
                                    </div>
                                    <div className="report-device-card">
                                        <span className="report-device-count">{devicesByStatus['Pending'] || 0}</span>
                                        <span className="report-device-label">Pending</span>
                                    </div>
                                    <div className="report-device-card red">
                                        <span className="report-device-count">{devicesByStatus['Faulty'] || 0}</span>
                                        <span className="report-device-label">Faulty</span>
                                    </div>
                                </div>
                            </div>

                        </div>

                        {/* RIGHT — Daily Logs Table */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            {reportData.dailyLogs?.length > 0 ? (
                                <div className="report-card" style={{ padding: 0 }}>
                                    <div style={{ padding: '1.375rem 1.375rem 0' }}>
                                        <div className="report-card-title" style={{ marginBottom: '1rem' }}>
                                            <FileText size={14} />
                                            Daily Logs ({reportData.dailyLogs.length})
                                            {reportData.dailyLogs.length > 10 && (
                                                <span className="report-view-all">Export for full data</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="report-table-wrapper" style={{ borderRadius: '0 0 var(--radius-xl) var(--radius-xl)', border: 'none', borderTop: '1px solid var(--border-light)' }}>
                                        <table className="report-table">
                                            <thead>
                                                <tr>
                                                    <th>Date</th>
                                                    <th>Submitted By</th>
                                                    <th>Progress</th>
                                                    <th>Man-Hours</th>
                                                    <th>Team</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {reportData.dailyLogs.slice(0, 10).map(log => (
                                                    <tr key={log._id}>
                                                        <td style={{ whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                                                            {log.logDate && format(new Date(log.logDate), 'dd MMM yyyy')}
                                                        </td>
                                                        <td style={{ fontWeight: 500 }}>
                                                            {log.submittedBy?.name || 'N/A'}
                                                        </td>
                                                        <td>
                                                            <div className="report-table-progress">
                                                                <div className="report-table-progress-bar">
                                                                    <div
                                                                        className="report-table-progress-fill"
                                                                        style={{ width: `${log.progressPercentage || 0}%` }}
                                                                    />
                                                                </div>
                                                                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--primary-400)', fontWeight: 600 }}>
                                                                    {log.progressPercentage}%
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td style={{ fontWeight: 600 }}>{log.manHours}h</td>
                                                        <td style={{ color: 'var(--text-muted)' }}>{log.teamCount}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {reportData.dailyLogs.length > 10 && (
                                            <div className="report-table-footer">
                                                Showing 10 of {reportData.dailyLogs.length} logs. Export for full data.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="report-card">
                                    <div className="report-card-title"><FileText size={14} /> Daily Logs</div>
                                    <div className="report-empty" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
                                        <FileText size={36} />
                                        <p>No daily logs in this period.</p>
                                    </div>
                                </div>
                            )}

                            {/* Challenges */}
                            {reportData.challenges?.length > 0 && (
                                <div className="report-card">
                                    <div className="report-card-title">
                                        <AlertTriangle size={14} /> Challenges ({reportData.challenges.length})
                                    </div>
                                    <div className="report-challenges-list">
                                        {reportData.challenges.slice(0, 5).map(ch => (
                                            <div key={ch._id} className="report-challenge-item">
                                                <span className="report-challenge-number">{ch.challengeNumber}</span>
                                                <span className="report-challenge-title">{ch.title}</span>
                                                <div className="report-challenge-badges">
                                                    <span className={`report-badge ${SEVERITY_CLASS[ch.severity] || ''}`}>
                                                        {ch.severity}
                                                    </span>
                                                    <span className={`report-badge ${RESOLUTION_CLASS[ch.resolutionStatus] || ''}`}>
                                                        {ch.resolutionStatus}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {reportData.challenges.length > 5 && (
                                        <p style={{ textAlign: 'center', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
                                            Showing 5 of {reportData.challenges.length}. Export for full data.
                                        </p>
                                    )}
                                </div>
                            )}

                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
