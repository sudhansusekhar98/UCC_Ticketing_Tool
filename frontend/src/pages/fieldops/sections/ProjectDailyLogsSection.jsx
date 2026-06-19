import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FileText, Plus, BarChart3, Clock, Users, User } from 'lucide-react';
import { fieldOpsApi } from '../../../services/api';
import useAuthStore from '../../../context/authStore';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import ProjectSectionLayout from '../ProjectSectionLayout';
import '../fieldops.css';

export default function ProjectDailyLogsSection() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, hasRole } = useAuthStore();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const res = await fieldOpsApi.getPMDailyLogs({ projectId: id });
                setLogs(res.data.data || []);
            } catch {
                toast.error('Failed to load daily logs');
            } finally {
                setLoading(false);
            }
        };
        fetchLogs();
    }, [id]);

    return (
        <ProjectSectionLayout sectionTitle="Daily Logs" sectionIcon={<FileText size={16} />}>
            {({ project }) => {
                const isAssignedPM = project.assignedPM?._id === user?._id ||
                    project.teamMembers?.some(tm => tm._id === user?._id);
                const canEdit = hasRole(['Admin', 'Supervisor']);
                const canAdd = (isAssignedPM || canEdit) && project.status === 'Active';

                return (
                    <div className="glass-card">
                        <div className="tab-content">
                            {canAdd && (
                                <div style={{ marginBottom: '1rem' }}>
                                    <Link to={`/fieldops/projects/${id}/daily-log`} className="btn btn-primary">
                                        <Plus size={18} /> Submit Daily Log
                                    </Link>
                                </div>
                            )}

                            {loading ? (
                                <div className="loading-state">
                                    <div className="spinner"></div>
                                    <p>Loading logs...</p>
                                </div>
                            ) : logs.length === 0 ? (
                                <div className="empty-state">
                                    <FileText size={48} />
                                    <h3>No daily logs yet</h3>
                                    <p>Start tracking daily progress by submitting a log.</p>
                                </div>
                            ) : (
                                <div className="log-list">
                                    {logs.map(log => (
                                        <div
                                            key={log._id}
                                            className="log-card"
                                            onClick={() => navigate(`/fieldops/pm-logs/${log._id}`)}
                                        >
                                            <div className="log-card-header">
                                                <span className="log-date">
                                                    {format(new Date(log.logDate), 'EEEE, dd MMM yyyy')}
                                                </span>
                                                <span className="log-number">{log.logNumber}</span>
                                            </div>
                                            <p className="log-summary">
                                                {log.workSummary?.substring(0, 150)}
                                                {log.workSummary?.length > 150 && '...'}
                                            </p>
                                            <div className="log-stats">
                                                <span className="log-stat">
                                                    <BarChart3 size={14} /> {log.progressPercentage}%
                                                </span>
                                                <span className="log-stat">
                                                    <Clock size={14} /> {log.manHours}h
                                                </span>
                                                <span className="log-stat">
                                                    <Users size={14} /> {log.teamCount} workers
                                                </span>
                                                <span className="log-stat">
                                                    <User size={14} /> {log.submittedBy?.fullName}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* <Link
                                to={`/fieldops/pm-logs?projectId=${id}`}
                                className="btn btn-ghost"
                                style={{ marginTop: '1rem' }}
                            >
                                View All Logs
                            </Link> */}

                        </div>
                    </div>
                );
            }}
        </ProjectSectionLayout>
    );
}
