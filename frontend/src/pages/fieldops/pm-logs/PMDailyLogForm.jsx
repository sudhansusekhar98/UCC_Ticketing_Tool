import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ArrowLeft,
    Save,
    Camera,
    MapPin,
    Clock,
    Users,
    CheckSquare,
    Plus,
    X,
    Image,
    AlertTriangle,
    Lock
} from 'lucide-react';
import { fieldOpsApi } from '../../../services/api';
import useAuthStore from '../../../context/authStore';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import '../fieldops.css';

export default function PMDailyLogForm() {
    const { projectId, logId } = useParams();
    const navigate = useNavigate();
    useAuthStore();
    const fileInputRef = useRef(null);
    const isEditing = Boolean(logId);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [project, setProject] = useState(null);
    const [gpsLoading, setGpsLoading] = useState(false);

    const [formData, setFormData] = useState({
        projectId: projectId,
        logDate: format(new Date(), 'yyyy-MM-dd'),
        workSummary: '',
        taskChecklist: [],
        progressPercentage: 0,
        manHours: 0,
        teamCount: 0,
        weatherConditions: '',
        issuesFaced: '',
        nextDayPlan: '',
        submissionLocation: null
    });

    const [selectedFiles, setSelectedFiles] = useState([]);
    const [newTask, setNewTask] = useState('');
    const [existingPhotos, setExistingPhotos] = useState([]);
    const [openActivities, setOpenActivities] = useState([]);
    const [activityEntries, setActivityEntries] = useState([]);

    useEffect(() => {
        loadData();
    }, [projectId, logId]);

    const loadData = async () => {
        try {
            // Load project details
            const projectRes = await fieldOpsApi.getProjectById(projectId);
            setProject(projectRes.data.data);

            // If editing, load existing log
            if (isEditing) {
                const logRes = await fieldOpsApi.getPMDailyLogById(logId);
                const log = logRes.data.data;

                if (log.isLocked) {
                    toast.error('This log is locked and cannot be edited');
                    navigate(`/fieldops/projects/${projectId}`);
                    return;
                }

                setFormData({
                    projectId: log.projectId._id || log.projectId,
                    logDate: log.logDate?.split('T')[0] || '',
                    workSummary: log.workSummary || '',
                    taskChecklist: log.taskChecklist || [],
                    progressPercentage: log.progressPercentage || 0,
                    manHours: log.manHours || 0,
                    teamCount: log.teamCount || 0,
                    weatherConditions: log.weatherConditions || '',
                    issuesFaced: log.issuesFaced || '',
                    nextDayPlan: log.nextDayPlan || '',
                    submissionLocation: log.submissionLocation || null
                });
                setExistingPhotos(log.photos || []);
                if (log.activityEntries?.length > 0) {
                    setActivityEntries(log.activityEntries.map(entry => ({
                        activityId: entry.activityId,
                        activityTitle: entry.activityTitle || '',
                        tasksWorked: (entry.tasksWorked || []).map(tw => ({
                            taskId: tw.taskId,
                            taskTitle: tw.taskTitle || '',
                            completed: tw.completed || false,
                            delayReason: tw.delayReason || ''
                        })),
                        progressNote: entry.progressNote || ''
                    })));
                }
            }

            // Load open activities for prefill (non-blocking)
            try {
                const prefillRes = await fieldOpsApi.getDailyLogPrefill(projectId);
                setOpenActivities(prefillRes.data.data || []);
            } catch { /* non-blocking */ }

        } catch (error) {
            toast.error('Failed to load data');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const captureGPS = () => {
        if (!navigator.geolocation) {
            toast.error('Geolocation is not supported by your browser');
            return;
        }

        setGpsLoading(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setFormData(prev => ({
                    ...prev,
                    submissionLocation: {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        capturedAt: new Date().toISOString()
                    }
                }));
                toast.success('Location captured successfully');
                setGpsLoading(false);
            },
            (error) => {
                toast.error('Failed to get location: ' + error.message);
                setGpsLoading(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    };

    const addTask = () => {
        if (!newTask.trim()) return;
        setFormData(prev => ({
            ...prev,
            taskChecklist: [...prev.taskChecklist, { taskName: newTask.trim(), completed: false, notes: '' }]
        }));
        setNewTask('');
    };

    const toggleTask = (index) => {
        setFormData(prev => ({
            ...prev,
            taskChecklist: prev.taskChecklist.map((task, i) =>
                i === index ? { ...task, completed: !task.completed } : task
            )
        }));
    };

    const removeTask = (index) => {
        setFormData(prev => ({
            ...prev,
            taskChecklist: prev.taskChecklist.filter((_, i) => i !== index)
        }));
    };

    // ── Activity helpers ──
    const isTaskOverdue = (task, logDate) =>
        task.plannedEnd && new Date(task.plannedEnd) < new Date(logDate);

    const isActivitySelected = (activityId) =>
        activityEntries.some(e => e.activityId === activityId);

    const toggleActivitySelection = (activity) => {
        if (isActivitySelected(activity._id)) {
            setActivityEntries(prev => prev.filter(e => e.activityId !== activity._id));
        } else {
            setActivityEntries(prev => [...prev, {
                activityId: activity._id,
                activityTitle: activity.title,
                tasksWorked: (activity.tasks || []).map(t => ({
                    taskId: t._id,
                    taskTitle: t.title,
                    completed: false,
                    delayReason: ''
                })),
                progressNote: ''
            }]);
        }
    };

    const toggleActivityTask = (activityId, taskId) => {
        setActivityEntries(prev => prev.map(entry =>
            entry.activityId !== activityId ? entry : {
                ...entry,
                tasksWorked: entry.tasksWorked.map(tw =>
                    tw.taskId !== taskId ? tw : { ...tw, completed: !tw.completed }
                )
            }
        ));
    };

    const setActivityTaskDelayReason = (activityId, taskId, reason) => {
        setActivityEntries(prev => prev.map(entry =>
            entry.activityId !== activityId ? entry : {
                ...entry,
                tasksWorked: entry.tasksWorked.map(tw =>
                    tw.taskId !== taskId ? tw : { ...tw, delayReason: reason }
                )
            }
        ));
    };

    const setActivityProgressNote = (activityId, note) => {
        setActivityEntries(prev => prev.map(entry =>
            entry.activityId !== activityId ? entry : { ...entry, progressNote: note }
        ));
    };

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        if (selectedFiles.length + files.length > 10) {
            toast.error('Maximum 10 photos allowed');
            return;
        }

        const validFiles = files.filter(file => {
            if (file.size > 10 * 1024 * 1024) {
                toast.error(`${file.name} exceeds 10MB limit`);
                return false;
            }
            if (!file.type.startsWith('image/')) {
                toast.error(`${file.name} is not an image`);
                return false;
            }
            return true;
        });

        setSelectedFiles(prev => [...prev, ...validFiles]);
        e.target.value = '';
    };

    const removeFile = (index) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.workSummary.trim()) {
            toast.error('Please enter work summary');
            return;
        }

        // Validate overdue task delay reasons
        const hasOverdueWithoutReason = activityEntries.some(entry => {
            const activity = openActivities.find(a => a._id === entry.activityId);
            return entry.tasksWorked.some(tw => {
                const task = activity?.tasks?.find(t => t._id === tw.taskId);
                return isTaskOverdue(task, formData.logDate) && !tw.completed && !tw.delayReason?.trim();
            });
        });
        if (hasOverdueWithoutReason) {
            toast.error('Provide delay reasons for all overdue incomplete tasks');
            return;
        }

        // Capture GPS if not already captured
        if (!formData.submissionLocation && navigator.geolocation) {
            toast('Capturing your location...', { icon: '📍' });
            await new Promise((resolve) => {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        formData.submissionLocation = {
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude,
                            accuracy: position.coords.accuracy,
                            capturedAt: new Date().toISOString()
                        };
                        resolve();
                    },
                    () => resolve(), // Continue even if GPS fails
                    { enableHighAccuracy: true, timeout: 5000 }
                );
            });
        }

        setSaving(true);
        try {
            let logResponse;
            const payload = { ...formData, activityEntries };
            if (isEditing) {
                logResponse = await fieldOpsApi.updatePMDailyLog(logId, payload);
            } else {
                logResponse = await fieldOpsApi.createPMDailyLog(payload);
            }

            const savedLogId = logResponse.data.data._id || logId;

            // Upload photos if any
            if (selectedFiles.length > 0) {
                const photoFormData = new FormData();
                selectedFiles.forEach(file => {
                    photoFormData.append('photos', file);
                });
                photoFormData.append('photoType', 'Progress');

                await fieldOpsApi.uploadPMLogPhotos(savedLogId, photoFormData);
            }

            toast.success(isEditing ? 'Log updated successfully' : 'Daily log submitted successfully');
            navigate(`/fieldops/projects/${projectId}`);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save log');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="page-container">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    const completedTasks = formData.taskChecklist.filter(t => t.completed).length;
    const totalTasks = formData.taskChecklist.length;

    return (
        <div className="page-container animate-fade-in">
            <div className="page-header">
                <div className="header-left">
                    <Link to={`/fieldops/projects/${projectId}`} className="btn btn-ghost">
                        <ArrowLeft size={18} />
                    </Link>
                    <div>
                        <h1 className="page-title">
                            {isEditing ? 'Edit Daily Log' : 'Submit Daily Log'}
                        </h1>
                        <p className="text-secondary">
                            {project?.projectName} ({project?.projectNumber})
                        </p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="glass-card pm-daily-log-form">
                {/* Date & GPS Section */}
                <div className="form-section">
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Log Date *</label>
                            <input
                                type="date"
                                className="form-input"
                                value={formData.logDate}
                                onChange={(e) => handleChange('logDate', e.target.value)}
                                max={format(new Date(), 'yyyy-MM-dd')}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Your Location</label>
                            <button
                                type="button"
                                onClick={captureGPS}
                                disabled={gpsLoading}
                                className="gps-button"
                            >
                                <MapPin size={18} />
                                {gpsLoading ? 'Capturing...' : formData.submissionLocation ? 'Location Captured' : 'Capture GPS'}
                            </button>
                            {formData.submissionLocation && (
                                <span className="text-sm text-secondary">
                                    {formData.submissionLocation.latitude.toFixed(6)},
                                    {formData.submissionLocation.longitude.toFixed(6)}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Work Summary */}
                <div className="form-section">
                    <h3 className="form-section-title">Work Summary *</h3>
                    <textarea
                        className="form-textarea"
                        value={formData.workSummary}
                        onChange={(e) => handleChange('workSummary', e.target.value)}
                        placeholder="Describe the work completed today..."
                        rows={5}
                        required
                    />
                </div>

                {/* Task Checklist */}
                <div className="form-section">
                    <h3 className="form-section-title">
                        <CheckSquare size={18} /> Task Checklist
                        {totalTasks > 0 && (
                            <span className="task-progress">
                                {completedTasks}/{totalTasks} completed
                            </span>
                        )}
                    </h3>
                    <div className="task-list">
                        {formData.taskChecklist.map((task, index) => (
                            <div key={index} className={`task-item ${task.completed ? 'completed' : ''}`}>
                                <input
                                    type="checkbox"
                                    checked={task.completed}
                                    onChange={() => toggleTask(index)}
                                    className="task-checkbox"
                                />
                                <span className="task-name">{task.taskName}</span>
                                <button
                                    type="button"
                                    onClick={() => removeTask(index)}
                                    className="btn btn-ghost btn-sm"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                    <div className="add-task-row">
                        <input
                            type="text"
                            className="form-input"
                            value={newTask}
                            onChange={(e) => setNewTask(e.target.value)}
                            placeholder="Add a task..."
                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTask())}
                        />
                        <button type="button" onClick={addTask} className="btn btn-ghost">
                            <Plus size={18} />
                        </button>
                    </div>
                </div>

                {/* Activities Worked Today */}
                <div className="form-section">
                    <h3 className="form-section-title">
                        Activities Worked Today
                        {activityEntries.length > 0 && (
                            <span className="task-progress">{activityEntries.length} selected</span>
                        )}
                    </h3>
                    {openActivities.length === 0 ? (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', padding: '0.5rem 0' }}>
                            No open activities for this project.{' '}
                            <Link to={`/fieldops/projects/${projectId}/activities`} style={{ color: 'var(--primary-400,#60a5fa)' }}>
                                Create activities first →
                            </Link>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                            {openActivities.map(activity => {
                                const selected = isActivitySelected(activity._id);
                                const entry = activityEntries.find(e => e.activityId === activity._id);
                                return (
                                    <div key={activity._id} style={{
                                        border: `1px solid ${selected ? 'rgba(59,130,246,0.3)' : 'var(--border-light,rgba(148,163,184,0.14))'}`,
                                        borderRadius: 8,
                                        overflow: 'hidden'
                                    }}>
                                        {/* Activity header row */}
                                        <div
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '0.625rem',
                                                padding: '0.6rem 0.875rem',
                                                background: selected ? 'rgba(59,130,246,0.05)' : 'transparent',
                                                cursor: 'pointer'
                                            }}
                                            onClick={() => toggleActivitySelection(activity)}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selected}
                                                onChange={() => toggleActivitySelection(activity)}
                                                onClick={e => e.stopPropagation()}
                                                style={{ accentColor: 'var(--primary-400,#60a5fa)', width: 15, height: 15, flexShrink: 0 }}
                                            />
                                            <span style={{ fontWeight: 600, fontSize: '0.875rem', flex: 1 }}>{activity.title}</span>
                                            <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: 20, background: 'rgba(59,130,246,0.1)', color: 'var(--primary-400,#60a5fa)' }}>
                                                {activity.type}
                                            </span>
                                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                {(activity.tasks || []).length} tasks
                                            </span>
                                        </div>

                                        {/* Task list (expanded when selected) */}
                                        {selected && entry && (
                                            <div style={{ padding: '0.5rem 0.875rem 0.75rem', borderTop: '1px solid var(--border-light,rgba(148,163,184,0.1))' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                                    {entry.tasksWorked.map(tw => {
                                                        const actTask = activity.tasks?.find(t => t._id === tw.taskId);
                                                        const overdue = isTaskOverdue(actTask, formData.logDate);
                                                        return (
                                                            <div key={tw.taskId}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={tw.completed}
                                                                        onChange={() => toggleActivityTask(activity._id, tw.taskId)}
                                                                        style={{ accentColor: 'var(--success-500,#10b981)', width: 14, height: 14, flexShrink: 0 }}
                                                                    />
                                                                    <span style={{ fontSize: '0.82rem', flex: 1, color: tw.completed ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: tw.completed ? 'line-through' : 'none' }}>
                                                                        {tw.taskTitle}
                                                                    </span>
                                                                    {overdue && !tw.completed && (
                                                                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#ef4444', background: 'rgba(239,68,68,0.1)', padding: '0.1rem 0.35rem', borderRadius: 20 }}>
                                                                            OVERDUE
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {overdue && !tw.completed && (
                                                                    <input
                                                                        type="text"
                                                                        className="form-input"
                                                                        style={{ marginTop: '0.3rem', marginLeft: '1.5rem', fontSize: '0.78rem', padding: '0.3rem 0.5rem', borderColor: !tw.delayReason?.trim() ? '#ef4444' : undefined }}
                                                                        placeholder="Delay reason (required) *"
                                                                        value={tw.delayReason}
                                                                        onChange={e => setActivityTaskDelayReason(activity._id, tw.taskId, e.target.value)}
                                                                    />
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                <textarea
                                                    className="form-textarea"
                                                    style={{ marginTop: '0.5rem', fontSize: '0.8rem', rows: 2, minHeight: 48 }}
                                                    placeholder="Activity progress note (optional)…"
                                                    value={entry.progressNote}
                                                    onChange={e => setActivityProgressNote(activity._id, e.target.value)}
                                                    rows={2}
                                                />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Progress & Manpower */}
                <div className="form-section">
                    <h3 className="form-section-title">Progress & Manpower</h3>
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Overall Progress %</label>
                            <div className="progress-input">
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={formData.progressPercentage}
                                    onChange={(e) => handleChange('progressPercentage', parseInt(e.target.value))}
                                    className="form-range"
                                />
                                <span className="progress-value">{formData.progressPercentage}%</span>
                            </div>
                            <div className="progress-bar-container">
                                <div
                                    className="progress-bar"
                                    style={{ width: `${formData.progressPercentage}%` }}
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">
                                <Clock size={16} /> Man-Hours Today
                            </label>
                            <input
                                type="number"
                                className="form-input"
                                value={formData.manHours}
                                onChange={(e) => handleChange('manHours', parseFloat(e.target.value) || 0)}
                                min="0"
                                step="0.5"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">
                                <Users size={16} /> Team Count
                            </label>
                            <input
                                type="number"
                                className="form-input"
                                value={formData.teamCount}
                                onChange={(e) => handleChange('teamCount', parseInt(e.target.value) || 0)}
                                min="0"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Weather Conditions</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.weatherConditions}
                                onChange={(e) => handleChange('weatherConditions', e.target.value)}
                                placeholder="e.g., Sunny, Rainy, Cloudy"
                            />
                        </div>
                    </div>
                </div>

                {/* Photos */}
                <div className="form-section">
                    <h3 className="form-section-title">
                        <Camera size={18} /> Photos
                    </h3>

                    {/* Existing photos */}
                    {existingPhotos.length > 0 && (
                        <div className="photo-gallery">
                            {existingPhotos.map((photo, index) => (
                                <div key={index} className="photo-item">
                                    <img src={photo.url} alt={photo.caption || 'Photo'} />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* New photos preview */}
                    {selectedFiles.length > 0 && (
                        <div className="selected-files">
                            {selectedFiles.map((file, index) => (
                                <div key={index} className="selected-file">
                                    <Image size={14} />
                                    <span>{file.name}</span>
                                    <button type="button" onClick={() => removeFile(index)}>
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        accept="image/*"
                        multiple
                        hidden
                    />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="btn btn-ghost"
                    >
                        <Camera size={18} />
                        Add Photos
                    </button>
                </div>

                {/* Issues & Next Day Plan */}
                <div className="form-section">
                    <h3 className="form-section-title">
                        <AlertTriangle size={18} /> Issues & Plans
                    </h3>
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Issues Faced Today</label>
                            <textarea
                                className="form-textarea"
                                value={formData.issuesFaced}
                                onChange={(e) => handleChange('issuesFaced', e.target.value)}
                                placeholder="Any blockers or issues encountered..."
                                rows={3}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Plan for Tomorrow</label>
                            <textarea
                                className="form-textarea"
                                value={formData.nextDayPlan}
                                onChange={(e) => handleChange('nextDayPlan', e.target.value)}
                                placeholder="What's planned for the next day..."
                                rows={3}
                            />
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="form-actions">
                    <Link to={`/fieldops/projects/${projectId}`} className="btn btn-ghost">
                        Cancel
                    </Link>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                        {saving ? (
                            <>
                                <div className="spinner-sm"></div>
                                Submitting...
                            </>
                        ) : (
                            <>
                                <Save size={18} />
                                {isEditing ? 'Update Log' : 'Submit Daily Log'}
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
