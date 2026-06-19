import { useParams, Link } from 'react-router-dom';
import { Camera, Plus, UserPlus, Package } from 'lucide-react';
import ProjectSectionLayout from '../ProjectSectionLayout';
import '../fieldops.css';

export default function ProjectDevicesSection() {
    const { id } = useParams();

    return (
        <ProjectSectionLayout sectionTitle="Devices" sectionIcon={<Camera size={16} />}>
            {({ dashboard }) => {
                const allocStats = dashboard?.allocations || {};
                const stats = dashboard?.devices || {};

                const stockInstalled = allocStats.totalInstalled || 0;
                const stockAllocated = allocStats.totalAllocated || 0;
                const stockFaulty = allocStats.totalFaulty || 0;
                const stockRemaining = allocStats.remaining || 0;
                const deviceRecords = stats.total || 0;
                const pendingConfig = Math.max(0, stockInstalled - deviceRecords);

                return (
                    <div className="glass-card">
                        <div className="tab-content">
                            <div style={{ marginBottom: '1rem', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <Link to={`/fieldops/projects/${id}/devices/new`} className="btn btn-primary">
                                    <Plus size={18} /> Add Device
                                </Link>
                                <Link to={`/fieldops/devices/assignment?projectId=${id}`} className="btn btn-ghost">
                                    <UserPlus size={18} /> Assign Devices
                                </Link>
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <h4 style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                                    Installation Progress (Stock-based)
                                </h4>
                                <div className="stats-grid">
                                    <div className="pm-stat-card">
                                        <div className="pm-stat-content">
                                            <h3>{stockInstalled}</h3>
                                            <p>Installed</p>
                                        </div>
                                    </div>
                                    <div className="pm-stat-card">
                                        <div className="pm-stat-content">
                                            <h3>{stockRemaining}</h3>
                                            <p>Remaining</p>
                                        </div>
                                    </div>
                                    <div className="pm-stat-card">
                                        <div className="pm-stat-content">
                                            <h3>{stockFaulty}</h3>
                                            <p>Faulty</p>
                                        </div>
                                    </div>
                                    <div className="pm-stat-card">
                                        <div className="pm-stat-content">
                                            <h3>{stockAllocated}</h3>
                                            <p>Total Allocated</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <h4 style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                                    Configuration Tracking (Device Records)
                                </h4>
                                <div className="stats-grid">
                                    <div className="pm-stat-card">
                                        <div className="pm-stat-content">
                                            <h3>{deviceRecords}</h3>
                                            <p>Device Records</p>
                                        </div>
                                    </div>
                                    <div className="pm-stat-card">
                                        <div className="pm-stat-content">
                                            <h3>{stats.assignedCount || 0}</h3>
                                            <p>Assigned to Engineers</p>
                                        </div>
                                    </div>
                                    {Object.entries(stats.byStatus || {}).map(([status, count]) => (
                                        <div key={status} className="pm-stat-card">
                                            <div className="pm-stat-content">
                                                <h3>{count}</h3>
                                                <p>{status}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {pendingConfig > 0 && (
                                <div
                                    className="glass-card"
                                    style={{
                                        background: 'var(--info-bg)',
                                        border: '1px solid var(--info-color)',
                                        marginBottom: '1rem',
                                        padding: '1rem'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                        <Package size={18} />
                                        <strong>{pendingConfig} installed devices pending configuration</strong>
                                    </div>
                                    <p style={{ marginBottom: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                                        These devices have been marked as installed in stock but don&apos;t have device
                                        records for configuration tracking. You can create device records from the
                                        allocated stock page.
                                    </p>
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '8px' }}>
                                <Link to={`/fieldops/devices?projectId=${id}`} className="btn btn-ghost">
                                    View All Devices
                                </Link>
                                <Link to={`/fieldops/projects/${id}/devices/assigned`} className="btn btn-secondary">
                                    View Assigned Devices List
                                </Link>
                            </div>
                        </div>
                    </div>
                );
            }}
        </ProjectSectionLayout>
    );
}
