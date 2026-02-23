import { useState, useEffect, useCallback, useRef } from 'react';
import {
    Clock,
    Calendar as CalendarIcon,
    Plus,
    Trash2,
    Camera,
    FileText,
    CheckCircle,
    History,
    ChevronLeft,
    ChevronRight,
    MapPin,
    Tag,
    X,
    LayoutDashboard,
    Edit3,
    CheckSquare,
    Users,
    User,
    Send,
    Shield
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { worklogApi, sitesApi, ticketsApi, usersApi } from '../../services/api';
import useAuthStore from '../../context/authStore';
import './WorkLog.css';

// Backend-accepted categories for manual entries
const MANUAL_CATEGORIES = [
    { value: 'SiteVisit', label: 'Site Visit' },
    { value: 'MaintenanceWork', label: 'Maintenance Work' },
    { value: 'Documentation', label: 'Documentation' },
    { value: 'Upgradation', label: 'Upgradation' },
    { value: 'AdminWork', label: 'Admin Work' },
    { value: 'Coordination', label: 'Coordination' },
    { value: 'Training', label: 'Training' },
    { value: 'Investigation', label: 'Investigation' },
    { value: 'Other', label: 'Other' }
];

// Friendly labels for all categories (auto + manual)
const CATEGORY_LABELS = {
    Login: 'Login',
    TicketCreated: 'Ticket Created',
    TicketUpdated: 'Ticket Updated',
    TicketResolved: 'Ticket Resolved',
    TicketEscalated: 'Ticket Escalated',
    TicketClosed: 'Ticket Closed',
    TicketAssigned: 'Ticket Assigned',
    TicketAcknowledged: 'Ticket Acknowledged',
    TicketStarted: 'Ticket Started',
    TicketVerified: 'Ticket Verified',
    TicketReopened: 'Ticket Reopened',
    AssetCreated: 'Asset Created',
    AssetUpdated: 'Asset Updated',
    AssetImported: 'Asset Imported',
    AssetDeleted: 'Asset Deleted',
    StockAdded: 'Stock Added',
    StockTransferred: 'Stock Transferred',
    StockDeleted: 'Stock Deleted',
    RequisitionCreated: 'Requisition Created',
    RMACreated: 'RMA Created',
    RMAStatusChanged: 'RMA Status Changed',
    UserCreated: 'User Created',
    UserUpdated: 'User Updated',
    UserDeleted: 'User Deleted',
    NotificationCreated: 'Notification Created',
    SiteCreated: 'Site Created',
    SiteUpdated: 'Site Updated',
    SiteDeleted: 'Site Deleted',
    SiteVisit: 'Site Visit',
    MaintenanceWork: 'Maintenance Work',
    Documentation: 'Documentation',
    Upgradation: 'Upgradation',
    AdminWork: 'Admin Work',
    Coordination: 'Coordination',
    Training: 'Training',
    Investigation: 'Investigation',
    Other: 'Other'
};

export default function WorkLog() {
    const { user } = useAuthStore();
    const isAdmin = user?.role === 'Admin' || user?.role === 'Supervisor';

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [log, setLog] = useState(null);
    const [summary, setSummary] = useState('');
    const [isSavingSummary, setIsSavingSummary] = useState(false);

    // Admin: team view
    const [viewMode, setViewMode] = useState('my'); // 'my' | 'team'
    const [teamLogs, setTeamLogs] = useState([]);
    const [teamUsers, setTeamUsers] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState('');

    // Manual Entry Form State
    const [entryForm, setEntryForm] = useState({
        category: 'SiteVisit',
        description: '',
        duration: '',
        ticketRef: '',
        siteId: '',
        policeStation: '',
        attachments: []
    });

    // Selection Options
    const [sites, setSites] = useState([]);
    const [tickets, setTickets] = useState([]);
    const fileInputRef = useRef(null);

    const isToday = selectedDate === new Date().toISOString().split('T')[0];

    // Fetch individual log (my or selected user)
    const fetchLog = useCallback(async () => {
        try {
            setLoading(true);
            const dateStr = selectedDate;

            if (viewMode === 'my' || !isAdmin) {
                const response = await worklogApi.getMyLogs({
                    startDate: dateStr,
                    endDate: dateStr
                });
                if (response.data.data && response.data.data.length > 0) {
                    setLog(response.data.data[0]);
                    setSummary(response.data.data[0].dailySummary || '');
                } else {
                    setLog(null);
                    setSummary('');
                }
            } else if (viewMode === 'team' && selectedUserId) {
                const response = await worklogApi.getUserLogs(selectedUserId, {
                    startDate: dateStr,
                    endDate: dateStr
                });
                if (response.data.data && response.data.data.length > 0) {
                    setLog(response.data.data[0]);
                    setSummary(response.data.data[0].dailySummary || '');
                } else {
                    setLog(null);
                    setSummary('');
                }
            } else if (viewMode === 'team' && !selectedUserId) {
                // Fetch all team logs for the date
                const response = await worklogApi.getTeamLogs({
                    startDate: dateStr,
                    endDate: dateStr,
                    limit: 50
                });
                setTeamLogs(response.data.data || []);
                setLog(null);
                setSummary('');
            }
        } catch (error) {
            console.error('Failed to fetch work log:', error);
            toast.error('Failed to load work log');
        } finally {
            setLoading(false);
        }
    }, [selectedDate, viewMode, selectedUserId, isAdmin]);

    const fetchOptions = useCallback(async () => {
        try {
            const promises = [
                sitesApi.getDropdown(),
                ticketsApi.getAll({ status: 'Open,In Progress,Pending', limit: 100 })
            ];
            if (isAdmin) {
                promises.push(usersApi.getAll({ limit: 200 }));
            }
            const results = await Promise.all(promises);
            setSites(results[0].data.data || []);
            setTickets(results[1].data.data || []);
            if (isAdmin && results[2]) {
                setTeamUsers(results[2].data.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch options:', error);
        }
    }, [isAdmin]);

    useEffect(() => {
        fetchLog();
    }, [fetchLog]);

    useEffect(() => {
        fetchOptions();
    }, [fetchOptions]);

    const handleSummaryUpdate = async () => {
        if (!isToday || viewMode !== 'my') return;
        try {
            setIsSavingSummary(true);
            await worklogApi.updateSummary(summary);
            toast.success('Summary updated');
            fetchLog();
        } catch (error) {
            toast.error('Failed to update summary');
        } finally {
            setIsSavingSummary(false);
        }
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length + entryForm.attachments.length > 5) {
            toast.error('Maximum 5 attachments allowed');
            return;
        }
        const validFiles = files.filter(file => {
            const isValidType = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
            const isValidSize = file.size <= 5 * 1024 * 1024;
            if (!isValidType) toast.error(`${file.name} is not a supported image type`);
            if (!isValidSize) toast.error(`${file.name} is too large (max 5MB)`);
            return isValidType && isValidSize;
        });
        setEntryForm(prev => ({
            ...prev,
            attachments: [...prev.attachments, ...validFiles]
        }));
    };

    const removeAttachment = (index) => {
        setEntryForm(prev => ({
            ...prev,
            attachments: prev.attachments.filter((_, i) => i !== index)
        }));
    };

    const handleAddEntry = async (e) => {
        e.preventDefault();
        if (!entryForm.description.trim()) {
            toast.error('Please enter a description');
            return;
        }
        if (entryForm.category === 'Investigation' && !entryForm.policeStation.trim()) {
            toast.error('Please enter the Police Station');
            return;
        }
        try {
            setSubmitting(true);
            const formData = new FormData();
            formData.append('category', entryForm.category);
            formData.append('description', entryForm.description);
            if (entryForm.duration) formData.append('duration', entryForm.duration);
            if (entryForm.ticketRef) formData.append('ticketRef', entryForm.ticketRef);
            if (entryForm.siteId) formData.append('siteId', entryForm.siteId);
            if (entryForm.category === 'Investigation' && entryForm.policeStation) formData.append('policeStation', entryForm.policeStation);
            entryForm.attachments.forEach(file => {
                formData.append('attachments', file);
            });
            await worklogApi.addManualEntry(formData);
            toast.success('Activity logged successfully');
            setEntryForm({
                category: 'SiteVisit',
                description: '',
                duration: '',
                ticketRef: '',
                siteId: '',
                policeStation: '',
                attachments: []
            });
            fetchLog();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to add entry');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteEntry = async (activityId) => {
        if (!window.confirm('Are you sure you want to delete this activity?')) return;
        try {
            await worklogApi.deleteManualEntry(activityId);
            toast.success('Activity deleted');
            fetchLog();
        } catch (error) {
            toast.error('Failed to delete activity');
        }
    };

    const changeDate = (days) => {
        const date = new Date(selectedDate);
        date.setDate(date.getDate() + days);
        setSelectedDate(date.toISOString().split('T')[0]);
    };

    const getCategoryLabel = (cat) => CATEGORY_LABELS[cat] || cat;

    // Stats for the current log
    const stats = log?.stats || {};
    const totalActivities = (log?.activities?.length) || 0;

    // Render activity timeline
    const renderTimeline = (activities, canDelete = false) => {
        if (!activities || activities.length === 0) {
            return (
                <div className="wl-empty-state">
                    <History size={28} color="var(--text-muted)" />
                    <span>No activities logged for this date</span>
                </div>
            );
        }
        return (
            <div className="wl-timeline">
                {activities.map((activity) => (
                    <div key={activity._id} className={`wl-timeline-item ${activity.type}`}>
                        <div className="wl-tl-dot-col">
                            <div className={`wl-tl-dot ${activity.category === 'Login' ? 'login' : activity.type}`} />
                        </div>
                        <div className="wl-tl-content">
                            <div className="wl-tl-row">
                                <span className={`wl-tl-badge ${activity.type}`}>
                                    {getCategoryLabel(activity.category)}
                                </span>
                                <div className="wl-tl-actions">
                                    <span className="wl-tl-time">
                                        {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {canDelete && activity.type === 'manual' && (
                                        <button className="wl-delete-btn" onClick={() => handleDeleteEntry(activity._id)}>
                                            <Trash2 size={13} />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <p className="wl-tl-desc">{activity.description}</p>
                            {(activity.duration || activity.siteId || activity.ticketRef || activity.policeStation) && (
                                <div className="wl-tl-meta">
                                    {activity.duration && (
                                        <span><Clock size={11} /> {activity.duration}m</span>
                                    )}
                                    {activity.policeStation && (
                                        <span><Shield size={11} /> {activity.policeStation}</span>
                                    )}
                                    {activity.siteId && (
                                        <span><MapPin size={11} /> {activity.siteId.siteName || activity.siteId.siteUniqueID || 'Site'}</span>
                                    )}
                                    {activity.ticketRef && (
                                        <span>
                                            <Tag size={11} />
                                            <a href={`/tickets/${activity.ticketRef._id || activity.ticketRef}`}>
                                                #{activity.ticketRef.ticketNumber || 'Ticket'}
                                            </a>
                                        </span>
                                    )}
                                </div>
                            )}
                            {activity.attachments && activity.attachments.length > 0 && (
                                <div className="wl-tl-imgs">
                                    {activity.attachments.map((att, idx) => (
                                        <a key={idx} href={att.url} target="_blank" rel="noreferrer">
                                            <img src={att.url} alt="Attachment" />
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="wl-page">
            {/* Header Bar */}
            <header className="wl-header">
                <div className="wl-header-left">
                    <h1>Work Log</h1>
                    {isToday && viewMode === 'my' && <span className="wl-live-badge">LIVE</span>}
                </div>

                <div className="wl-header-center">
                    {isAdmin && (
                        <div className="wl-view-toggle">
                            <button
                                className={`wl-toggle-btn ${viewMode === 'my' ? 'active' : ''}`}
                                onClick={() => { setViewMode('my'); setSelectedUserId(''); }}
                            >
                                <User size={14} /> My Log
                            </button>
                            <button
                                className={`wl-toggle-btn ${viewMode === 'team' ? 'active' : ''}`}
                                onClick={() => setViewMode('team')}
                            >
                                <Users size={14} /> Team
                            </button>
                        </div>
                    )}

                    {viewMode === 'team' && isAdmin && (
                        <select
                            className="wl-user-select"
                            value={selectedUserId}
                            onChange={(e) => setSelectedUserId(e.target.value)}
                        >
                            <option value="">All Employees</option>
                            {teamUsers.map(u => (
                                <option key={u._id} value={u._id}>{u.fullName} ({u.role})</option>
                            ))}
                        </select>
                    )}
                </div>

                <div className="wl-date-nav">
                    <button onClick={() => changeDate(-1)} className="wl-nav-btn">
                        <ChevronLeft size={18} />
                    </button>
                    <div className="wl-date-display">
                        <CalendarIcon size={14} />
                        <input
                            type="date"
                            value={selectedDate}
                            max={new Date().toISOString().split('T')[0]}
                            onChange={(e) => setSelectedDate(e.target.value)}
                        />
                    </div>
                    <button onClick={() => changeDate(1)} className="wl-nav-btn" disabled={isToday}>
                        <ChevronRight size={18} />
                    </button>
                </div>
            </header>

            {/* Main Content - Single Screen Layout */}
            <div className="wl-body">
                {/* My Log or Selected User Log */}
                {(viewMode === 'my' || (viewMode === 'team' && selectedUserId)) ? (
                    <>
                        {/* Stats Row */}
                        <div className="wl-stats-row">
                            <div className="wl-stat blue">
                                <LayoutDashboard size={16} />
                                <span className="wl-stat-val">{totalActivities}</span>
                                <span className="wl-stat-lbl">Activities</span>
                            </div>
                            <div className="wl-stat green">
                                <Edit3 size={16} />
                                <span className="wl-stat-val">{stats.manualEntries || 0}</span>
                                <span className="wl-stat-lbl">Manual</span>
                            </div>
                            <div className="wl-stat purple">
                                <Plus size={16} />
                                <span className="wl-stat-val">{stats.ticketsCreated || 0}</span>
                                <span className="wl-stat-lbl">Created</span>
                            </div>
                            <div className="wl-stat orange">
                                <CheckSquare size={16} />
                                <span className="wl-stat-val">{stats.ticketsUpdated || 0}</span>
                                <span className="wl-stat-lbl">Updated</span>
                            </div>
                            <div className="wl-stat teal">
                                <CheckCircle size={16} />
                                <span className="wl-stat-val">{stats.ticketsResolved || 0}</span>
                                <span className="wl-stat-lbl">Resolved</span>
                            </div>
                        </div>

                        {/* Two Column: Form + Timeline in same viewport */}
                        <div className="wl-content-grid">
                            {/* Left: Form + Summary */}
                            <div className="wl-col-left">
                                {/* Summary */}
                                <div className="wl-card wl-summary-card">
                                    <h3><FileText size={15} /> Daily Summary</h3>
                                    <textarea
                                        ref={(el) => {
                                            if (el) {
                                                el.style.height = 'auto';
                                                el.style.height = el.scrollHeight + 'px';
                                            }
                                        }}
                                        placeholder="Write a brief summary of your work today..."
                                        value={summary}
                                        onChange={(e) => {
                                            setSummary(e.target.value);
                                            e.target.style.height = 'auto';
                                            e.target.style.height = e.target.scrollHeight + 'px';
                                        }}
                                        disabled={!isToday || viewMode !== 'my'}
                                        rows={1}
                                    />
                                    {isToday && viewMode === 'my' && (
                                        <button
                                            className="wl-save-btn"
                                            onClick={handleSummaryUpdate}
                                            disabled={isSavingSummary || !summary}
                                        >
                                            <Send size={13} />
                                            {isSavingSummary ? 'Saving...' : 'Save'}
                                        </button>
                                    )}
                                </div>

                                {/* Manual Entry Form */}
                                {isToday && viewMode === 'my' && (
                                    <div className="wl-card wl-form-card">
                                        <h3><Plus size={15} /> Log Activity</h3>
                                        <form onSubmit={handleAddEntry} className="wl-form">
                                            <div className="wl-form-row-2">
                                                <div className="wl-field">
                                                    <label>Category</label>
                                                    <select
                                                        value={entryForm.category}
                                                        onChange={(e) => setEntryForm({ ...entryForm, category: e.target.value })}
                                                    >
                                                        {MANUAL_CATEGORIES.map(cat => (
                                                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="wl-field">
                                                    <label>Duration (mins)</label>
                                                    <input
                                                        type="number"
                                                        placeholder="30"
                                                        value={entryForm.duration}
                                                        onChange={(e) => setEntryForm({ ...entryForm, duration: e.target.value })}
                                                    />
                                                </div>
                                            </div>

                                            {entryForm.category === 'Investigation' && (
                                                <div className="wl-field">
                                                    <label><Shield size={13} /> Police Station <span style={{ color: 'var(--danger)' }}>*</span></label>
                                                    <input
                                                        type="text"
                                                        placeholder="Enter Police Station name"
                                                        value={entryForm.policeStation}
                                                        onChange={(e) => setEntryForm({ ...entryForm, policeStation: e.target.value })}
                                                        required
                                                    />
                                                </div>
                                            )}

                                            <div className="wl-field">
                                                <label>Description</label>
                                                <textarea
                                                    placeholder="What did you do?"
                                                    value={entryForm.description}
                                                    onChange={(e) => setEntryForm({ ...entryForm, description: e.target.value })}
                                                    required
                                                    rows={2}
                                                />
                                            </div>

                                            <div className="wl-form-row-2">
                                                <div className="wl-field">
                                                    <label>Site</label>
                                                    <select
                                                        value={entryForm.siteId}
                                                        onChange={(e) => setEntryForm({ ...entryForm, siteId: e.target.value })}
                                                    >
                                                        <option value="">None</option>
                                                        {sites.map(site => (
                                                            <option key={site._id} value={site._id}>{site.siteName}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="wl-field">
                                                    <label>Ticket</label>
                                                    <select
                                                        value={entryForm.ticketRef}
                                                        onChange={(e) => setEntryForm({ ...entryForm, ticketRef: e.target.value })}
                                                    >
                                                        <option value="">None</option>
                                                        {tickets.map(ticket => (
                                                            <option key={ticket._id} value={ticket._id}>
                                                                #{ticket.ticketNumber} - {ticket.title?.substring(0, 30)}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="wl-form-footer">
                                                <button
                                                    type="button"
                                                    className="wl-attach-btn"
                                                    onClick={() => fileInputRef.current.click()}
                                                >
                                                    <Camera size={14} />
                                                    <span>Attach ({entryForm.attachments.length}/5)</span>
                                                    <input
                                                        type="file"
                                                        hidden
                                                        ref={fileInputRef}
                                                        multiple
                                                        accept="image/*"
                                                        onChange={handleFileChange}
                                                    />
                                                </button>
                                                <button type="submit" className="wl-submit-btn" disabled={submitting}>
                                                    <Plus size={14} />
                                                    {submitting ? 'Logging...' : 'Log Activity'}
                                                </button>
                                            </div>

                                            {entryForm.attachments.length > 0 && (
                                                <div className="wl-thumbs">
                                                    {entryForm.attachments.map((file, idx) => (
                                                        <div key={`att-${idx}`} className="wl-thumb">
                                                            <img src={URL.createObjectURL(file)} alt="preview" />
                                                            <button type="button" onClick={() => removeAttachment(idx)}>
                                                                <X size={10} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </form>
                                    </div>
                                )}
                            </div>

                            {/* Right: Timeline */}
                            <div className="wl-col-right">
                                <div className="wl-card wl-timeline-card">
                                    <h3><History size={15} /> Activity Timeline</h3>
                                    {loading ? (
                                        <div className="wl-empty-state">Loading...</div>
                                    ) : (
                                        renderTimeline(log?.activities, isToday && viewMode === 'my')
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    /* Team Overview - All employees for selected date */
                    <div className="wl-team-view">
                        {loading ? (
                            <div className="wl-empty-state">Loading team logs...</div>
                        ) : teamLogs.length === 0 ? (
                            <div className="wl-empty-state">
                                <Users size={28} color="var(--text-muted)" />
                                <span>No team activity logged for this date</span>
                            </div>
                        ) : (
                            <div className="wl-team-grid">
                                {teamLogs.map((tl) => (
                                    <div key={tl._id} className="wl-team-card" onClick={() => {
                                        setSelectedUserId(tl.userId?._id || '');
                                    }}>
                                        <div className="wl-tc-header">
                                            <div className="wl-tc-avatar">
                                                {tl.userId?.profilePicture ? (
                                                    <img src={tl.userId.profilePicture} alt="" />
                                                ) : (
                                                    <span>{(tl.userId?.fullName || '?')[0]}</span>
                                                )}
                                            </div>
                                            <div className="wl-tc-info">
                                                <strong>{tl.userId?.fullName || 'Unknown'}</strong>
                                                <span className="wl-tc-role">{tl.userId?.role || ''}</span>
                                            </div>
                                            <span className="wl-tc-count">{tl.activities?.length || 0} activities</span>
                                        </div>
                                        {tl.dailySummary && (
                                            <p className="wl-tc-summary">{tl.dailySummary}</p>
                                        )}
                                        <div className="wl-tc-stats">
                                            <span className="wl-tc-stat"><Edit3 size={12} /> {tl.stats?.manualEntries || 0} manual</span>
                                            <span className="wl-tc-stat"><CheckSquare size={12} /> {tl.stats?.ticketsUpdated || 0} tickets</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
