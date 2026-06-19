import { FileText } from 'lucide-react';
import { format } from 'date-fns';
import ProjectSectionLayout from '../ProjectSectionLayout';
import '../fieldops.css';

export default function ProjectOverviewSection() {
    return (
        <ProjectSectionLayout sectionTitle="Overview" sectionIcon={<FileText size={16} />}>
            {({ project }) => <OverviewContent project={project} />}
        </ProjectSectionLayout>
    );
}

function OverviewContent({ project }) {
    return (
        <div className="glass-card">
            <div className="tab-content">
                <div className="overview-content">
                    <div className="form-grid">
                        <div className="info-section">
                            <h4>Project Details</h4>
                            <div className="info-item">
                                <span className="label">Description</span>
                                <span className="value">{project.description || 'No description'}</span>
                            </div>
                            <div className="info-item">
                                <span className="label">Contract Period</span>
                                <span className="value">
                                    {format(new Date(project.contractStartDate), 'dd MMM yyyy')} –{' '}
                                    {format(new Date(project.contractEndDate), 'dd MMM yyyy')}
                                </span>
                            </div>
                            {project.contractValue && (
                                <div className="info-item">
                                    <span className="label">Contract Value</span>
                                    <span className="value">{project.contractValue.toLocaleString()}</span>
                                </div>
                            )}
                            {project.linkedSiteId && (
                                <div className="info-item">
                                    <span className="label">Linked Site</span>
                                    <span className="value">
                                        {project.linkedSiteId.siteName}
                                        {project.linkedSiteId.siteUniqueID && (
                                            <span className="text-secondary" style={{ marginLeft: '6px' }}>
                                                ({project.linkedSiteId.siteUniqueID})
                                            </span>
                                        )}
                                    </span>
                                </div>
                            )}
                            {project.linkedSurveyName && (
                                <div className="info-item">
                                    <span className="label">Linked Survey</span>
                                    <span className="value">{project.linkedSurveyName}</span>
                                </div>
                            )}
                        </div>

                        <div className="info-section">
                            <h4>Location</h4>
                            <div className="info-item">
                                <span className="label">Address</span>
                                <span className="value">{project.siteAddress}</span>
                            </div>
                            <div className="info-item">
                                <span className="label">City / State</span>
                                <span className="value">{project.city}, {project.state}</span>
                            </div>
                            {project.latitude && project.longitude && (
                                <div className="info-item">
                                    <span className="label">GPS</span>
                                    <span className="value">{project.latitude}, {project.longitude}</span>
                                </div>
                            )}
                        </div>

                        <div className="info-section">
                            <h4>Team</h4>
                            <div className="info-item">
                                <span className="label">Project Manager</span>
                                <span className="value">{project.assignedPM?.fullName || 'Unassigned'}</span>
                            </div>
                            {project.teamMembers?.length > 0 && (
                                <div className="info-item">
                                    <span className="label">Team Members</span>
                                    <span className="value">
                                        {project.teamMembers.map(m => m.fullName).join(', ')}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {project.surveyDeviceRequirements?.length > 0 && (
                        <div className="info-section" style={{ marginTop: '1.5rem' }}>
                            <h4>Survey Device Requirements</h4>
                            <div className="table-responsive">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Device Name</th>
                                            <th>Type</th>
                                            <th style={{ textAlign: 'center' }}>Existing Qty</th>
                                            <th style={{ textAlign: 'center' }}>Required Qty</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {project.surveyDeviceRequirements.map((item, idx) => (
                                            <tr key={item.itemId || idx}>
                                                <td>{item.itemName}</td>
                                                <td>{item.itemTypeName}</td>
                                                <td style={{ textAlign: 'center' }}>{item.totalExisting}</td>
                                                <td style={{ textAlign: 'center', fontWeight: 600 }}>{item.totalRequired}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
