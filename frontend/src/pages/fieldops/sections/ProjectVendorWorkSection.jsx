import { useParams, Link } from 'react-router-dom';
import { Truck, Plus } from 'lucide-react';
import ProjectSectionLayout from '../ProjectSectionLayout';
import '../fieldops.css';

export default function ProjectVendorWorkSection() {
    const { id } = useParams();

    return (
        <ProjectSectionLayout sectionTitle="Vendor Work" sectionIcon={<Truck size={16} />}>
            {({ dashboard }) => {
                const stats = dashboard?.vendorWork || {};

                return (
                    <div className="glass-card">
                        <div className="tab-content">
                            <div style={{ marginBottom: '1rem' }}>
                                <Link to={`/fieldops/projects/${id}/vendor-logs/new`} className="btn btn-primary">
                                    <Plus size={18} /> Add Vendor Work Log
                                </Link>
                            </div>

                            <div className="stats-grid">
                                <div className="pm-stat-card">
                                    <div className="pm-stat-content">
                                        <h3>{stats.totalLogs || 0}</h3>
                                        <p>Total Logs</p>
                                    </div>
                                </div>
                                <div className="pm-stat-card">
                                    <div className="pm-stat-content">
                                        <h3>{stats.totalCrewCount || 0}</h3>
                                        <p>Total Crew</p>
                                    </div>
                                </div>
                                <div className="pm-stat-card">
                                    <div className="pm-stat-content">
                                        <h3>{stats.totalLengthMeters || 0}m</h3>
                                        <p>Work Length</p>
                                    </div>
                                </div>
                            </div>

                            <Link
                                to={`/fieldops/vendor-logs?projectId=${id}`}
                                className="btn btn-ghost"
                                style={{ marginTop: '1rem' }}
                            >
                                View All Vendor Logs
                            </Link>
                        </div>
                    </div>
                );
            }}
        </ProjectSectionLayout>
    );
}
