import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AlertTriangle, Plus, Clock, User } from 'lucide-react';
import { fieldOpsApi } from '../../../services/api';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import ProjectSectionLayout from '../ProjectSectionLayout';
import '../fieldops.css';

const statusColors = {
    Planning: 'status-badge-info',
    Active: 'status-badge-success',
    OnHold: 'status-badge-warning',
    Completed: 'status-badge-secondary',
    Cancelled: 'status-badge-danger',
    Open: 'status-badge-danger',
    InProgress: 'status-badge-warning',
    Resolved: 'status-badge-success',
    Escalated: 'status-badge-danger'
};

export default function ProjectChallengesSection() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [challenges, setChallenges] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchChallenges = async () => {
            try {
                const res = await fieldOpsApi.getChallengeLogs({ projectId: id });
                setChallenges(res.data.data || []);
            } catch {
                toast.error('Failed to load challenges');
            } finally {
                setLoading(false);
            }
        };
        fetchChallenges();
    }, [id]);

    return (
        <ProjectSectionLayout sectionTitle="Challenges" sectionIcon={<AlertTriangle size={16} />}>
            {({ dashboard }) => {
                const stats = dashboard?.challenges || {};

                return (
                    <div className="glass-card">
                        <div className="tab-content">
                            <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h4 style={{ margin: 0, color: 'var(--text-secondary)' }}>Challenge Statistics</h4>
                                <Link to={`/fieldops/projects/${id}/challenges/new`} className="btn btn-primary">
                                    <Plus size={18} /> Report Challenge
                                </Link>
                            </div>

                            <div className="stats-grid mb-6">
                                {Object.entries(stats.byStatus || {}).map(([status, count]) => (
                                    <div key={status} className="pm-stat-card">
                                        <div className="pm-stat-content">
                                            <h3>{count}</h3>
                                            <p>{status}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div style={{ marginTop: '1.5rem' }}>
                                <h4 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                                    All Challenges
                                </h4>
                                {loading ? (
                                    <div className="loading-state">
                                        <div className="spinner"></div>
                                        <p>Loading challenges...</p>
                                    </div>
                                ) : challenges.length === 0 ? (
                                    <p className="text-muted italic">No challenges reported for this project.</p>
                                ) : (
                                    <div className="log-list">
                                        {challenges.map(challenge => (
                                            <div
                                                key={challenge._id}
                                                className="log-card"
                                                onClick={() => navigate(`/fieldops/projects/${id}/challenges/${challenge._id}`)}
                                                style={{
                                                    borderLeft: `4px solid var(--${
                                                        challenge.severity === 'Critical' ? 'danger' :
                                                        challenge.severity === 'High' ? 'warning' : 'primary'
                                                    }-500)`
                                                }}
                                            >
                                                <div className="log-card-header">
                                                    <span className="log-date">{challenge.challengeNumber}</span>
                                                    <span className={`status-badge ${statusColors[challenge.resolutionStatus] || 'status-badge-info'}`}>
                                                        {challenge.resolutionStatus}
                                                    </span>
                                                </div>
                                                <h5 style={{ margin: '0.5rem 0', fontWeight: 600 }}>{challenge.title}</h5>
                                                <p className="log-summary">
                                                    {challenge.description?.substring(0, 120)}
                                                    {challenge.description?.length > 120 && '...'}
                                                </p>
                                                <div className="log-stats">
                                                    <span className="log-stat">
                                                        <AlertTriangle size={14} /> {challenge.severity}
                                                    </span>
                                                    <span className="log-stat">
                                                        <User size={14} /> {challenge.reportedBy?.fullName}
                                                    </span>
                                                    <span className="log-stat">
                                                        <Clock size={14} /> {formatDistanceToNow(new Date(challenge.createdAt), { addSuffix: true })}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <Link
                                to={`/fieldops/challenges?projectId=${id}`}
                                className="btn btn-ghost"
                                style={{ marginTop: '1rem' }}
                            >
                                View All Challenges
                            </Link>
                        </div>
                    </div>
                );
            }}
        </ProjectSectionLayout>
    );
}
