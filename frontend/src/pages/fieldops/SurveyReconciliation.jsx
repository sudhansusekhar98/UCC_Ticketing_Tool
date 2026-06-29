import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ArrowLeft,
    RefreshCw,
    Download,
    ChevronDown,
    ChevronRight,
    AlertTriangle,
    Activity,
    BarChart3,
    ExternalLink
} from 'lucide-react';
import { fieldOpsApi } from '../../services/api';
import useAuthStore from '../../context/authStore';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import './fieldops.css';

export default function SurveyReconciliation() {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const { hasRole } = useAuthStore();
    const canEdit = hasRole(['Admin', 'Supervisor']);

    const [project, setProject] = useState(null);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [expandedRows, setExpandedRows] = useState({});
    const [rowDevices, setRowDevices] = useState({});
    const [loadingDevices, setLoadingDevices] = useState({});

    useEffect(() => {
        loadData();
    }, [projectId]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [projectRes, reconRes] = await Promise.all([
                fieldOpsApi.getProjectById(projectId),
                fieldOpsApi.getReconciliation(projectId)
            ]);
            setProject(projectRes.data.data);
            setData(reconRes.data.data);
        } catch (error) {
            toast.error('Failed to load reconciliation data');
            navigate('/fieldops/projects');
        } finally {
            setLoading(false);
        }
    };

    const handleResync = async () => {
        try {
            setSyncing(true);
            await fieldOpsApi.resyncSurveyRequirements(projectId);
            toast.success('Survey requirements re-synced');
            loadData();
        } catch (error) {
            toast.error('Failed to re-sync survey requirements');
        } finally {
            setSyncing(false);
        }
    };

    const toggleRow = useCallback(async (idx, deviceType) => {
        const isExpanding = !expandedRows[idx];
        setExpandedRows(prev => ({ ...prev, [idx]: isExpanding }));

        if (isExpanding && !rowDevices[idx] && deviceType) {
            try {
                setLoadingDevices(prev => ({ ...prev, [idx]: true }));
                const res = await fieldOpsApi.getReconciliationDevices(projectId, { deviceType });
                setRowDevices(prev => ({ ...prev, [idx]: res.data.data }));
            } catch {
                toast.error('Failed to load device details');
            } finally {
                setLoadingDevices(prev => ({ ...prev, [idx]: false }));
            }
        }
    }, [expandedRows, rowDevices, projectId]);

    const exportCSV = () => {
        if (!data) return;

        const headers = ['Survey Item', 'Type', 'Existing', 'Required', 'Net Required', 'Deployed', 'Variance', 'Status'];
        const rows = data.items.map(item => [
            item.surveyItemName,
            item.surveyItemTypeName,
            item.surveyExisting,
            item.surveyRequired,
            item.netRequired,
            item.deployed,
            item.variance,
            item.status
        ]);

        // Add unmapped device types section
        if (data.unmappedDeviceTypes?.length > 0) {
            rows.push([]);
            rows.push(['Extra Installed Devices (not in survey)']);
            rows.push(['Device Type', 'Quantity']);
            data.unmappedDeviceTypes.forEach(dt => {
                rows.push([dt.deviceType, dt.totalQty]);
            });
        }

        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `reconciliation-${project?.projectNumber || projectId}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const getProgressColor = (pct) => {
        if (pct >= 100) return 'var(--color-success, #22c55e)';
        if (pct >= 50) return 'var(--color-warning, #f59e0b)';
        return 'var(--color-danger, #ef4444)';
    };

    const getStatusBadge = (status, variance) => {
        const classes = {
            Match: 'recon-badge-match',
            Under: 'recon-badge-under',
            Over: 'recon-badge-over',
            Unmapped: 'recon-badge-unmapped'
        };
        const labels = {
            Match: 'Matched',
            Under: `Under (${variance})`,
            Over: `Over (+${variance})`,
            Unmapped: 'Unmapped'
        };
        return <span className={`recon-badge ${classes[status] || ''}`}>{labels[status] || status}</span>;
    };

    if (loading) {
        return <div className="loading-container"><div className="spinner" /></div>;
    }

    if (!data || !project) return null;

    const { items, unmappedDeviceTypes, summary } = data;
    const totalRequired = items.reduce((sum, i) => sum + (i.netRequired || 0), 0);
    const totalDeployed = items.reduce((sum, i) => sum + (i.deployed || 0), 0);
    const overallVariance = totalDeployed - totalRequired;
    const completionPct = totalRequired > 0 ? Math.min(Math.round((totalDeployed / totalRequired) * 100), 999) : 0;

    return (
        <div className="page-container recon-page">
            {/* Header */}
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button className="btn btn-ghost" onClick={() => navigate(`/fieldops/projects/${projectId}`)}>
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 style={{ margin: 0 }}>
                            <BarChart3 size={24} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                            Survey vs Actual Reconciliation
                        </h1>
                        <p style={{ margin: '0.25rem 0 0', color: 'var(--text-secondary)' }}>
                            {project.projectNumber} - {project.projectName}
                            {project.linkedSurveyName && ` | Survey: ${project.linkedSurveyName}`}
                        </p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button className="btn btn-ghost" onClick={loadData}>
                        <RefreshCw size={16} /> Refresh
                    </button>
                    {canEdit && project.linkedSurveyId && (
                        <button className="btn btn-ghost" onClick={handleResync} disabled={syncing}>
                            <RefreshCw size={16} className={syncing ? 'spin' : ''} /> Re-sync Survey
                        </button>
                    )}
                    <button className="btn btn-primary" onClick={exportCSV}>
                        <Download size={16} /> Export CSV
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="recon-summary-grid" style={{ marginTop: '1.5rem' }}>
                <div className="recon-summary-card">
                    <div className="recon-summary-value" style={{ color: 'var(--color-primary, #3b82f6)' }}>{totalRequired}</div>
                    <div className="recon-summary-label">Net Required</div>
                </div>
                <div className="recon-summary-card">
                    <div className="recon-summary-value" style={{ color: 'var(--color-success, #22c55e)' }}>{totalDeployed}</div>
                    <div className="recon-summary-label">Total Deployed</div>
                </div>
                <div className="recon-summary-card">
                    <div className="recon-summary-value" style={{ color: overallVariance >= 0 ? 'var(--color-success, #22c55e)' : 'var(--color-danger, #ef4444)' }}>
                        {overallVariance >= 0 ? `+${overallVariance}` : overallVariance}
                    </div>
                    <div className="recon-summary-label">Variance</div>
                </div>
                <div className="recon-summary-card">
                    <div className="recon-summary-value" style={{ color: getProgressColor(completionPct) }}>{completionPct}%</div>
                    <div className="recon-summary-label">Completion</div>
                </div>
            </div>

            {/* Status summary */}
            <div style={{ display: 'flex', gap: '0.75rem', margin: '1.25rem 0', flexWrap: 'wrap' }}>
                {summary.matched > 0 && <span className="recon-badge recon-badge-match">{summary.matched} Matched</span>}
                {summary.under > 0 && <span className="recon-badge recon-badge-under">{summary.under} Under</span>}
                {summary.over > 0 && <span className="recon-badge recon-badge-over">{summary.over} Over</span>}
                {summary.unmapped > 0 && <span className="recon-badge recon-badge-unmapped">{summary.unmapped} Unmapped</span>}
            </div>

            {/* Reconciliation Table with expandable rows */}
            <div className="glass-card" style={{ marginTop: '1rem' }}>
                <div className="table-responsive">
                    <table className="data-table recon-table">
                        <thead>
                            <tr>
                                <th style={{ width: 30 }}></th>
                                <th>Survey Item</th>
                                <th>Type</th>
                                <th style={{ textAlign: 'center' }}>Existing</th>
                                <th style={{ textAlign: 'center' }}>Required</th>
                                <th style={{ textAlign: 'center' }}>Net Required</th>
                                <th style={{ textAlign: 'center' }}>Deployed</th>
                                <th>Status Breakdown</th>
                                <th style={{ textAlign: 'center' }}>Variance</th>
                                <th style={{ width: 140 }}>Progress</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, idx) => {
                                const pct = item.netRequired > 0 ? Math.round((item.deployed / item.netRequired) * 100) : 0;
                                const isExpanded = expandedRows[idx];
                                const devices = rowDevices[idx] || [];
                                const isLoadingDevices = loadingDevices[idx];

                                return (
                                    <React.Fragment key={idx}>
                                        <tr
                                            className={`recon-row ${isExpanded ? 'recon-row-expanded' : ''}`}
                                            onClick={() => item.internalDeviceType && toggleRow(idx, item.internalDeviceType)}
                                            style={{ cursor: item.internalDeviceType ? 'pointer' : 'default' }}
                                        >
                                            <td>
                                                {item.internalDeviceType ? (
                                                    isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                                                ) : null}
                                            </td>
                                            <td>
                                                <strong>{item.surveyItemName}</strong>
                                                {item.internalDeviceType && (
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                        Maps to: {item.internalDeviceType}
                                                    </div>
                                                )}
                                            </td>
                                            <td>{item.surveyItemTypeName}</td>
                                            <td style={{ textAlign: 'center' }}>{item.surveyExisting}</td>
                                            <td style={{ textAlign: 'center' }}>{item.surveyRequired}</td>
                                            <td style={{ textAlign: 'center', fontWeight: 600 }}>{item.netRequired}</td>
                                            <td style={{ textAlign: 'center', fontWeight: 600 }}>{item.deployed}</td>
                                            <td>
                                                <div className="recon-status-breakdown">
                                                    {Object.entries(item.deployedByStatus || {}).map(([status, count]) => (
                                                        <span key={status} className="recon-mini-badge">{status}: {count}</span>
                                                    ))}
                                                    {Object.keys(item.deployedByStatus || {}).length === 0 && (
                                                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>-</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td style={{
                                                textAlign: 'center',
                                                fontWeight: 600,
                                                color: item.variance > 0 ? 'var(--color-success, #22c55e)' : item.variance < 0 ? 'var(--color-danger, #ef4444)' : 'var(--text-primary)'
                                            }}>
                                                {item.status === 'Unmapped' ? '-' : (item.variance > 0 ? `+${item.variance}` : item.variance)}
                                            </td>
                                            <td>
                                                {item.status !== 'Unmapped' && item.netRequired > 0 ? (
                                                    <div className="recon-progress-bar">
                                                        <div
                                                            className="recon-progress-fill"
                                                            style={{
                                                                width: `${Math.min(pct, 100)}%`,
                                                                backgroundColor: getProgressColor(pct)
                                                            }}
                                                        />
                                                        <span className="recon-progress-label">{pct}%</span>
                                                    </div>
                                                ) : '-'}
                                            </td>
                                            <td>{getStatusBadge(item.status, item.variance)}</td>
                                        </tr>

                                        {/* Expanded device detail rows */}
                                        {isExpanded && (
                                            <tr className="recon-detail-row">
                                                <td colSpan={11}>
                                                    {isLoadingDevices ? (
                                                        <div style={{ padding: '1rem', textAlign: 'center' }}><div className="spinner" /></div>
                                                    ) : devices.length === 0 ? (
                                                        <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                                            No devices installed for this type yet
                                                        </div>
                                                    ) : (
                                                        <table className="data-table recon-inner-table">
                                                            <thead>
                                                                <tr>
                                                                    <th>Serial #</th>
                                                                    <th>Zone</th>
                                                                    <th>Location</th>
                                                                    <th>Qty</th>
                                                                    <th>Status</th>
                                                                    <th>Installed By</th>
                                                                    <th>Date</th>
                                                                    <th></th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {devices.map(device => (
                                                                    <tr key={device._id}>
                                                                        <td>{device.serialNumber || '-'}</td>
                                                                        <td>{device.zoneId?.zoneName || '-'}</td>
                                                                        <td>{device.installationLocation?.description || device.installationLocation?.poleWallId || '-'}</td>
                                                                        <td>{device.quantity}</td>
                                                                        <td>
                                                                            <span className={`status-badge status-badge-${device.status?.toLowerCase() || 'pending'}`}>
                                                                                {device.status}
                                                                            </span>
                                                                        </td>
                                                                        <td>{device.installedBy?.fullName || '-'}</td>
                                                                        <td>{device.installedAt ? format(new Date(device.installedAt), 'dd MMM yyyy') : device.createdAt ? format(new Date(device.createdAt), 'dd MMM yyyy') : '-'}</td>
                                                                        <td>
                                                                            <Link
                                                                                to={`/fieldops/devices/${device._id}`}
                                                                                className="btn btn-ghost btn-sm"
                                                                                onClick={e => e.stopPropagation()}
                                                                            >
                                                                                <ExternalLink size={14} />
                                                                            </Link>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    )}
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Unmapped Survey Items Warning */}
            {data.unmappedSurveyItems?.length > 0 && (
                <div className="recon-warning-box" style={{ marginTop: '1.25rem' }}>
                    <AlertTriangle size={18} />
                    <div>
                        <strong>Unmapped Survey Items</strong>
                        <p style={{ margin: '0.25rem 0 0' }}>
                            {data.unmappedSurveyItems.length} survey item(s) have no mapping to internal device types.{' '}
                            <Link to="/fieldops/settings/device-mappings">Configure Mappings</Link>
                        </p>
                    </div>
                </div>
            )}

            {/* Extra Installed Devices */}
            {unmappedDeviceTypes?.length > 0 && (
                <div className="recon-info-box" style={{ marginTop: '0.75rem' }}>
                    <Activity size={18} />
                    <div>
                        <strong>Extra Installed Devices</strong> (not in survey)
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                            {unmappedDeviceTypes.map(dt => (
                                <span key={dt.deviceType} className="recon-mini-badge">
                                    {dt.deviceType}: {dt.totalQty}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
