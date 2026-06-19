import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, FileText, Building, MapPin, User } from 'lucide-react';
import { fieldOpsApi } from '../../services/api';
import toast from 'react-hot-toast';
import './fieldops.css';

const statusColors = {
    Planning: 'status-badge-info',
    Active: 'status-badge-success',
    OnHold: 'status-badge-warning',
    Completed: 'status-badge-secondary',
    Cancelled: 'status-badge-danger'
};

export default function ProjectSectionLayout({ sectionTitle, sectionIcon, children }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const [project, setProject] = useState(null);
    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const [projRes, dashRes] = await Promise.all([
                    fieldOpsApi.getProjectById(id),
                    fieldOpsApi.getProjectDashboard(id)
                ]);
                setProject(projRes.data.data);
                setDashboard(dashRes.data.data);
            } catch {
                toast.error('Failed to load project');
                navigate('/fieldops/projects');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id]);

    if (loading) {
        return (
            <div className="page-container">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading project...</p>
                </div>
            </div>
        );
    }

    if (!project) return null;

    return (
        <div className="page-container animate-fade-in">
            <div className="project-detail-header">
                <div className="project-info">
                    <div className="header-left">
                        <Link to={`/fieldops/projects/${id}`} className="btn btn-ghost">
                            <ArrowLeft size={18} />
                        </Link>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1>{project.projectName}</h1>
                                <span className={`status-badge ${statusColors[project.status]}`}>
                                    {project.status}
                                </span>
                            </div>
                            <div className="project-meta">
                                <span className="project-meta-item">
                                    <FileText size={14} /> {project.projectNumber}
                                </span>
                                <span className="project-meta-item">
                                    <Building size={14} /> {project.clientName}
                                </span>
                                <span className="project-meta-item">
                                    <MapPin size={14} /> {project.city || project.siteAddress}
                                </span>
                                <span className="project-meta-item">
                                    <User size={14} /> PM: {project.assignedPM?.fullName || 'Unassigned'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                {sectionTitle && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        {sectionIcon}
                        <span>{sectionTitle}</span>
                    </div>
                )}
            </div>
            {children({ project, dashboard })}
        </div>
    );
}
