import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    RefreshCw,
    Search,
    ClipboardList,
    MapPin,
    User,
    Calendar,
    Package,
    ExternalLink,
    Link2,
    ChevronRight,
    Filter
} from 'lucide-react';
import { fieldOpsApi } from '../../services/api';
import useAuthStore from '../../context/authStore';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import './fieldops.css';

const STATUS_OPTIONS = ['', 'Completed', 'Approved', 'InProgress', 'Draft', 'Cancelled'];

const statusBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'completed' || s === 'approved') return 'status-badge-success';
    if (s === 'inprogress' || s === 'in progress') return 'status-badge-info';
    if (s === 'draft') return 'status-badge-warning';
    if (s === 'cancelled') return 'status-badge-danger';
    return 'status-badge-secondary';
};

const fmtDate = (d) => {
    if (!d) return '—';
    try { return format(new Date(d), 'dd MMM yyyy'); } catch { return '—'; }
};

export default function SurveyExplorer() {
    const navigate = useNavigate();
    const { hasRole } = useAuthStore();
    const canView = hasRole(['Admin', 'Supervisor']);

    const [surveys, setSurveys] = useState([]);
    const [linkedProjects, setLinkedProjects] = useState({});
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('Completed');

    const [selectedSurvey, setSelectedSurvey] = useState(null);
    const [requirements, setRequirements] = useState([]);
    const [loadingRequirements, setLoadingRequirements] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchTerm), 400);
        return () => clearTimeout(t);
    }, [searchTerm]);

    useEffect(() => {
        if (canView) loadSurveys();
    }, [debouncedSearch, statusFilter, canView]);

    const loadSurveys = async () => {
        try {
            setRefreshing(true);
            const params = { limit: 100 };
            if (debouncedSearch) params.search = debouncedSearch;
            if (statusFilter) params.status = statusFilter;

            const [surveysRes, projectsRes] = await Promise.all([
                fieldOpsApi.getSurveys(params),
                fieldOpsApi.getProjects({ limit: 500 }).catch(() => ({ data: { data: [] } }))
            ]);

            const surveyList = surveysRes.data.data || [];
            setSurveys(surveyList);

            // Build { surveyId -> [projects] } map so we can show "Linked to project"
            const projects = projectsRes.data.data || [];
            const map = {};
            projects.forEach(p => {
                if (p.linkedSurveyId) {
                    const key = String(p.linkedSurveyId);
                    (map[key] = map[key] || []).push(p);
                }
            });
            setLinkedProjects(map);

            // If a selected survey is no longer in the filtered list, clear it
            if (selectedSurvey) {
                const stillThere = surveyList.find(s => String(s.surveyId) === String(selectedSurvey.surveyId));
                if (!stillThere) {
                    setSelectedSurvey(null);
                    setRequirements([]);
                }
            }
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || 'Failed to load surveys from Survey application');
            setSurveys([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleSelectSurvey = async (survey) => {
        setSelectedSurvey(survey);
        setRequirements([]);
        setLoadingRequirements(true);
        try {
            const res = await fieldOpsApi.getSurveyRequirements(survey.surveyId);
            setRequirements(res.data.data || []);
        } catch (err) {
            console.error(err);
            toast.error('Failed to load survey items');
        } finally {
            setLoadingRequirements(false);
        }
    };

    const totals = useMemo(() => {
        const totalRequired = requirements.reduce((sum, r) => sum + (r.totalRequired || 0), 0);
        const totalExisting = requirements.reduce((sum, r) => sum + (r.totalExisting || 0), 0);
        return { totalRequired, totalExisting, itemCount: requirements.length };
    }, [requirements]);

    if (!canView) {
        return (
            <div className="fieldops-page">
                <div className="empty-state">
                    <ClipboardList size={48} />
                    <h3>Access Restricted</h3>
                    <p>Only Admin and Supervisor roles can view surveys.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fieldops-page">
            <div className="page-header">
                <div>
                    <h1><ClipboardList size={24} /> Site Surveys</h1>
                    <p className="subtitle">Surveys and device requirements from the Survey application</p>
                </div>
                <div className="header-actions">
                    <button
                        className="btn btn-secondary"
                        onClick={loadSurveys}
                        disabled={refreshing}
                        title="Refresh from Survey API"
                    >
                        <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
                        Refresh
                    </button>
                </div>
            </div>

            <div className="filters-bar">
                <div className="search-input-wrapper">
                    <Search size={16} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search by name, client, or site..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                </div>
                <div className="filter-group">
                    <Filter size={14} />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="filter-select"
                    >
                        {STATUS_OPTIONS.map(s => (
                            <option key={s || 'all'} value={s}>{s || 'All statuses'}</option>
                        ))}
                    </select>
                </div>
                <span className="muted">{surveys.length} survey{surveys.length === 1 ? '' : 's'}</span>
            </div>

            <div className="survey-explorer-grid">
                {/* Left: Surveys list */}
                <div className="survey-list-panel">
                    {loading ? (
                        <div className="loading-spinner" style={{ margin: '2rem auto' }} />
                    ) : surveys.length === 0 ? (
                        <div className="empty-state small">
                            <ClipboardList size={32} />
                            <p>No surveys found.</p>
                        </div>
                    ) : (
                        <div className="survey-list">
                            {surveys.map(s => {
                                const key = String(s.surveyId);
                                const isSelected = selectedSurvey && String(selectedSurvey.surveyId) === key;
                                const links = linkedProjects[key] || [];
                                return (
                                    <button
                                        key={key}
                                        className={`survey-card ${isSelected ? 'selected' : ''}`}
                                        onClick={() => handleSelectSurvey(s)}
                                        type="button"
                                    >
                                        <div className="survey-card-header">
                                            <div>
                                                <div className="survey-card-title">
                                                    {s.surveyName || s.name || `Survey #${s.surveyId}`}
                                                </div>
                                                <div className="survey-card-meta">
                                                    <span className="muted mono">#{s.surveyId}</span>
                                                    {s.status && (
                                                        <span className={`status-badge ${statusBadge(s.status)}`}>{s.status}</span>
                                                    )}
                                                </div>
                                            </div>
                                            <ChevronRight size={16} className="chevron" />
                                        </div>
                                        <div className="survey-card-body">
                                            {s.clientName && (
                                                <div className="survey-meta-row">
                                                    <User size={12} /> {s.clientName}
                                                </div>
                                            )}
                                            {(s.siteName || s.siteAddress) && (
                                                <div className="survey-meta-row">
                                                    <MapPin size={12} /> {s.siteName || s.siteAddress}
                                                </div>
                                            )}
                                            {(s.completedDate || s.createdDate || s.surveyDate) && (
                                                <div className="survey-meta-row">
                                                    <Calendar size={12} /> {fmtDate(s.completedDate || s.createdDate || s.surveyDate)}
                                                </div>
                                            )}
                                        </div>
                                        {links.length > 0 && (
                                            <div className="survey-linked-pill">
                                                <Link2 size={11} />
                                                Linked to {links.length} project{links.length === 1 ? '' : 's'}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Right: Selected survey items panel */}
                <div className="survey-detail-panel">
                    {!selectedSurvey ? (
                        <div className="empty-state">
                            <Package size={48} />
                            <h3>Select a survey</h3>
                            <p>Pick a survey on the left to see its device requirement items.</p>
                        </div>
                    ) : (
                        <>
                            <div className="survey-detail-header">
                                <div>
                                    <h2>{selectedSurvey.surveyName || selectedSurvey.name || `Survey #${selectedSurvey.surveyId}`}</h2>
                                    <div className="survey-detail-subline">
                                        <span className="mono">#{selectedSurvey.surveyId}</span>
                                        {selectedSurvey.status && (
                                            <span className={`status-badge ${statusBadge(selectedSurvey.status)}`}>
                                                {selectedSurvey.status}
                                            </span>
                                        )}
                                        {selectedSurvey.clientName && <span>• {selectedSurvey.clientName}</span>}
                                    </div>
                                </div>
                            </div>

                            <div className="summary-cards">
                                <div className="summary-card">
                                    <div className="summary-value">{totals.itemCount}</div>
                                    <div className="summary-label">Distinct Items</div>
                                </div>
                                <div className="summary-card">
                                    <div className="summary-value">{totals.totalRequired}</div>
                                    <div className="summary-label">Total Required</div>
                                </div>
                                <div className="summary-card">
                                    <div className="summary-value">{totals.totalExisting}</div>
                                    <div className="summary-label">Total Existing</div>
                                </div>
                            </div>

                            {linkedProjects[String(selectedSurvey.surveyId)]?.length > 0 && (
                                <div className="linked-projects-block">
                                    <div className="block-title"><Link2 size={14} /> Linked TicketOps Projects</div>
                                    <div className="linked-projects-list">
                                        {linkedProjects[String(selectedSurvey.surveyId)].map(p => (
                                            <button
                                                key={p._id}
                                                className="linked-project-pill"
                                                onClick={() => navigate(`/fieldops/projects/${p._id}`)}
                                                type="button"
                                            >
                                                {p.projectNumber} — {p.projectName}
                                                <ExternalLink size={12} />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="block-title" style={{ marginTop: '1.25rem' }}>
                                <Package size={14} /> Device Requirements
                            </div>

                            {loadingRequirements ? (
                                <div className="loading-spinner" style={{ margin: '2rem auto' }} />
                            ) : requirements.length === 0 ? (
                                <div className="empty-state small">
                                    <Package size={24} />
                                    <p>No device requirements returned for this survey.</p>
                                </div>
                            ) : (
                                <div className="table-wrapper">
                                    <table className="fieldops-table">
                                        <thead>
                                            <tr>
                                                <th>Item</th>
                                                <th>Type</th>
                                                <th className="num">Required</th>
                                                <th className="num">Existing</th>
                                                <th className="num">To Install</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {requirements.map((r, idx) => {
                                                const req = r.totalRequired || 0;
                                                const have = r.totalExisting || 0;
                                                const gap = Math.max(0, req - have);
                                                return (
                                                    <tr key={r.itemId || idx}>
                                                        <td>
                                                            <div className="item-name">{r.itemName || '—'}</div>
                                                            {r.itemId && <div className="muted mono tiny">ID: {r.itemId}</div>}
                                                        </td>
                                                        <td>{r.itemTypeName || '—'}</td>
                                                        <td className="num">{req}</td>
                                                        <td className="num">{have}</td>
                                                        <td className="num">
                                                            <span className={`gap-pill ${gap > 0 ? 'gap-pending' : 'gap-complete'}`}>
                                                                {gap}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
