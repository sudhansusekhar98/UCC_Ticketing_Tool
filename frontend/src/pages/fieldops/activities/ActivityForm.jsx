import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Plus, X, Zap } from 'lucide-react';
import { fieldOpsApi, usersApi, stockApi } from '../../../services/api';
import toast from 'react-hot-toast';
import '../fieldops.css';

const TYPES      = ['Technical', 'Construction', 'Maintenance'];
const PRIORITIES = ['Low', 'Med', 'High'];

const emptyForm = {
    title: '', description: '', type: 'Technical', priority: 'Med',
    leadEngineer: '', assignees: [],
    plannedStart: '', plannedEnd: '',
    tasks: [],
    requiredDevices: [],
    requiredStockItems: [],
};

export default function ActivityForm() {
    const { id: projectId, activityId } = useParams();
    const navigate = useNavigate();
    const isEditing = Boolean(activityId);

    const [form, setForm]                       = useState(emptyForm);
    const [suggestions, setSuggestions]         = useState([]);
    const [allUsers, setAllUsers]               = useState([]);
    const [allocations, setAllocations]         = useState([]);
    const [assignedAllocationIds, setAssignedAllocationIds] = useState(new Set());
    const [loading, setLoading]                 = useState(true);
    const [saving, setSaving]                   = useState(false);

    useEffect(() => {
        init();
    }, [activityId]);

    const init = async () => {
        try {
            const pid = projectId || (isEditing ? null : null);

            // Load users — backend enforces $nin exclusion; client-side filter is a safety net
            const usersRes = await usersApi.getAll({ isActive: true, limit: 500, roleNotIn: 'Vendor,SiteClient' });
            const userData = (usersRes.data.data || usersRes.data || []);
            const filtered = userData.filter(u => !['Vendor', 'SiteClient'].includes(u.role));
            setAllUsers(filtered);

            if (isEditing) {
                const [actRes] = await Promise.all([
                    fieldOpsApi.getActivityById(activityId),
                ]);
                const a = actRes.data.data;
                const editProjectId = a.projectId?._id || a.projectId;

                // Load allocations + sibling activities for conflict detection
                const [allocRes, activitiesRes] = await Promise.all([
                    stockApi.getAllocations({ projectId: editProjectId, limit: 200 }),
                    fieldOpsApi.getProjectActivities(editProjectId),
                ]);

                const allocs = allocRes.data.data || [];
                setAllocations(allocs);

                const used = new Set();
                (activitiesRes.data.data || []).forEach(act => {
                    if (act._id !== activityId) {
                        (act.requiredDevices || []).forEach(d => { if (d.allocationId) used.add(d.allocationId); });
                    }
                });
                setAssignedAllocationIds(used);

                setForm({
                    title:       a.title || '',
                    description: a.description || '',
                    type:        a.type || 'Technical',
                    priority:    a.priority || 'Med',
                    leadEngineer: a.leadEngineer?._id || a.leadEngineer || '',
                    assignees:   (a.assignees || []).map(u => u._id || u),
                    plannedStart: a.plannedStart ? a.plannedStart.slice(0, 10) : '',
                    plannedEnd:   a.plannedEnd   ? a.plannedEnd.slice(0, 10)   : '',
                    tasks: (a.tasks || []).map(t => ({
                        _id: t._id,
                        title: t.title,
                        plannedEnd: t.plannedEnd ? t.plannedEnd.slice(0, 10) : ''
                    })),
                    requiredDevices: (a.requiredDevices || []).map(d => ({
                        allocationId:   d.allocationId || '',
                        deviceTypeName: d.deviceTypeName || '',
                        qty:            d.qty || 1,
                    })),
                    requiredStockItems: a.requiredStockItems || [],
                });
                await loadSuggestions(a.type || 'Technical');
            } else {
                // Create mode
                const [allocRes, activitiesRes] = await Promise.all([
                    stockApi.getAllocations({ projectId: pid, limit: 200 }),
                    fieldOpsApi.getProjectActivities(pid),
                ]);

                const allocs = allocRes.data.data || [];
                setAllocations(allocs);

                const used = new Set();
                (activitiesRes.data.data || []).forEach(act => {
                    (act.requiredDevices || []).forEach(d => { if (d.allocationId) used.add(d.allocationId); });
                });
                setAssignedAllocationIds(used);

                await loadSuggestions(emptyForm.type);
            }
        } catch {
            toast.error('Failed to load form data');
        } finally {
            setLoading(false);
        }
    };

    const loadSuggestions = async (type) => {
        try {
            const res = await fieldOpsApi.getActivityTaskSuggestions(type);
            setSuggestions(res.data.data || []);
        } catch { /* non-blocking */ }
    };

    const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

    const handleTypeChange = async (newType) => {
        set('type', newType);
        await loadSuggestions(newType);
    };

    const addSuggestion = (title) => {
        if (form.tasks.some(t => t.title === title)) return;
        setForm(f => ({ ...f, tasks: [...f.tasks, { title, plannedEnd: '' }] }));
    };

    const addTask = () => setForm(f => ({ ...f, tasks: [...f.tasks, { title: '', plannedEnd: '' }] }));
    const removeTask = (idx) => setForm(f => ({ ...f, tasks: f.tasks.filter((_, i) => i !== idx) }));
    const updateTask = (idx, field, value) =>
        setForm(f => ({ ...f, tasks: f.tasks.map((t, i) => i === idx ? { ...t, [field]: value } : t) }));

    const addDevice = () =>
        setForm(f => ({ ...f, requiredDevices: [...f.requiredDevices, { allocationId: '', deviceTypeName: '', qty: 1 }] }));
    const removeDevice = (idx) =>
        setForm(f => ({ ...f, requiredDevices: f.requiredDevices.filter((_, i) => i !== idx) }));
    const updateDevice = (idx, field, value) =>
        setForm(f => ({ ...f, requiredDevices: f.requiredDevices.map((d, i) => i === idx ? { ...d, [field]: value } : d) }));

    const addStock = () =>
        setForm(f => ({ ...f, requiredStockItems: [...f.requiredStockItems, { itemName: '', qty: 1 }] }));
    const removeStock = (idx) =>
        setForm(f => ({ ...f, requiredStockItems: f.requiredStockItems.filter((_, i) => i !== idx) }));
    const updateStock = (idx, field, value) =>
        setForm(f => ({ ...f, requiredStockItems: f.requiredStockItems.map((s, i) => i === idx ? { ...s, [field]: value } : s) }));

    const toggleAssignee = (uid) => {
        setForm(f => ({
            ...f,
            assignees: f.assignees.includes(uid)
                ? f.assignees.filter(id => id !== uid)
                : [...f.assignees, uid],
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title.trim())      { toast.error('Title is required'); return; }
        if (!form.leadEngineer)      { toast.error('Lead engineer is required'); return; }

        const payload = {
            title:       form.title.trim(),
            description: form.description.trim(),
            type:        form.type,
            priority:    form.priority,
            leadEngineer: form.leadEngineer,
            assignees:   form.assignees,
            plannedStart: form.plannedStart || undefined,
            plannedEnd:   form.plannedEnd   || undefined,
            tasks: form.tasks.filter(t => t.title.trim()).map((t, idx) => ({
                title:     t.title.trim(),
                order:     idx,
                plannedEnd: t.plannedEnd || undefined,
                ...(t._id ? { _id: t._id } : {})
            })),
            requiredDevices: form.requiredDevices.filter(d => d.allocationId || d.deviceTypeName),
            requiredStockItems: form.requiredStockItems.filter(s => s.itemName),
        };

        try {
            setSaving(true);
            const res = isEditing
                ? await fieldOpsApi.updateActivity(activityId, payload)
                : await fieldOpsApi.createActivity(projectId, payload);
            const saved = res.data.data;
            toast.success(isEditing ? 'Activity updated' : 'Activity created');
            navigate(`/fieldops/activities/${saved._id}`);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save activity');
        } finally {
            setSaving(false);
        }
    };

    const backTo = isEditing
        ? `/fieldops/activities/${activityId}`
        : `/fieldops/projects/${projectId}/activities`;

    if (loading) {
        return (
            <div className="page-container">
                <div className="loading-state"><div className="spinner" /><p>Loading…</p></div>
            </div>
        );
    }

    return (
        <div className="page-container animate-fade-in">
            <div className="project-detail-header">
                <div className="project-info">
                    <div className="header-left">
                        <Link to={backTo} className="btn btn-ghost"><ArrowLeft size={18} /></Link>
                        <h1 style={{ fontSize: '1.2rem' }}>{isEditing ? 'Edit Activity' : 'New Activity'}</h1>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>

                    {/* Basic Info */}
                    <div className="glass-card" style={{ padding: '1rem 1.1rem' }}>
                        <h3 style={{ margin: '0 0 0.875rem', fontSize: '0.9rem', fontWeight: 700 }}>Basic Information</h3>
                        <div className="form-grid">
                            <div className="form-group" style={{ gridColumn: '1/-1' }}>
                                <label className="form-label">Title *</label>
                                <input className="form-input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Activity title" maxLength={200} />
                            </div>
                            <div className="form-group" style={{ gridColumn: '1/-1' }}>
                                <label className="form-label">Description</label>
                                <textarea className="form-input" rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="What needs to be done?" maxLength={2000} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Type</label>
                                <select className="form-select" value={form.type} onChange={e => handleTypeChange(e.target.value)}>
                                    {TYPES.map(t => <option key={t}>{t}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Priority</label>
                                <select className="form-select" value={form.priority} onChange={e => set('priority', e.target.value)}>
                                    {PRIORITIES.map(p => <option key={p}>{p}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Team */}
                    <div className="glass-card" style={{ padding: '1rem 1.1rem' }}>
                        <h3 style={{ margin: '0 0 0.875rem', fontSize: '0.9rem', fontWeight: 700 }}>Team</h3>
                        <div className="form-grid">
                            <div className="form-group">
                                <label className="form-label">Lead Engineer *</label>
                                <select className="form-select" value={form.leadEngineer} onChange={e => set('leadEngineer', e.target.value)}>
                                    <option value="">-- Select Lead Engineer --</option>
                                    {allUsers.map(u => (
                                        <option key={u._id || u.userId} value={u._id || u.userId}>
                                            {u.fullName} ({u.role})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Assignees</label>
                                <div style={{
                                    maxHeight: 200, overflowY: 'auto',
                                    border: '1px solid var(--border-light, rgba(148,163,184,0.2))',
                                    borderRadius: 6, padding: '0.375rem 0.5rem',
                                    background: 'var(--bg-secondary, rgba(148,163,184,0.06))',
                                }}>
                                    {allUsers.filter(u => (u._id || u.userId) !== form.leadEngineer).length === 0 && (
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.25rem 0' }}>No users available</p>
                                    )}
                                    {allUsers
                                        .filter(u => (u._id || u.userId) !== form.leadEngineer)
                                        .map(u => {
                                            const uid = u._id || u.userId;
                                            return (
                                                <label key={uid} style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem',
                                                    padding: '0.3rem 0.25rem',
                                                    margin: 0,
                                                    cursor: 'pointer',
                                                    fontSize: '0.84rem',
                                                    lineHeight: 1.4,
                                                    userSelect: 'none',
                                                    borderRadius: 4,
                                                    transition: 'background 0.1s',
                                                }}
                                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.06)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={form.assignees.includes(uid)}
                                                        onChange={() => toggleAssignee(uid)}
                                                        style={{ flexShrink: 0, width: 15, height: 15, cursor: 'pointer', accentColor: 'var(--primary-400, #60a5fa)' }}
                                                    />
                                                    <span style={{ flex: 1, minWidth: 0 }}>
                                                        {u.fullName}
                                                        <span style={{ marginLeft: '0.35rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>({u.role})</span>
                                                    </span>
                                                </label>
                                            );
                                        })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="glass-card" style={{ padding: '1rem 1.1rem' }}>
                        <h3 style={{ margin: '0 0 0.875rem', fontSize: '0.9rem', fontWeight: 700 }}>Timeline</h3>
                        <div className="form-grid">
                            <div className="form-group">
                                <label className="form-label">Planned Start</label>
                                <input type="date" className="form-input" value={form.plannedStart} onChange={e => set('plannedStart', e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Planned End</label>
                                <input type="date" className="form-input" value={form.plannedEnd} onChange={e => set('plannedEnd', e.target.value)} />
                            </div>
                        </div>
                    </div>

                    {/* Sub-Tasks */}
                    <div className="glass-card" style={{ padding: '1rem 1.1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                            <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700 }}>Sub-Tasks</h3>
                            <button type="button" className="btn btn-ghost" style={{ padding: '0.25rem 0.6rem', fontSize: '0.78rem' }} onClick={addTask}>
                                <Plus size={13} /> Add Task
                            </button>
                        </div>

                        {suggestions.length > 0 && (
                            <div style={{ marginBottom: '0.75rem' }}>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                    <Zap size={11} /> Suggested for {form.type}
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                                    {suggestions.map(s => (
                                        <button
                                            key={s} type="button"
                                            onClick={() => addSuggestion(s)}
                                            disabled={form.tasks.some(t => t.title === s)}
                                            style={{
                                                fontSize: '0.72rem', padding: '0.2rem 0.55rem',
                                                borderRadius: 20, border: '1px solid var(--border-light,rgba(148,163,184,0.2))',
                                                background: form.tasks.some(t => t.title === s)
                                                    ? 'rgba(16,185,129,0.1)' : 'var(--bg-secondary,rgba(148,163,184,0.06))',
                                                color: form.tasks.some(t => t.title === s)
                                                    ? 'var(--success-500,#10b981)' : 'var(--text-secondary)',
                                                cursor: form.tasks.some(t => t.title === s) ? 'default' : 'pointer',
                                            }}
                                        >
                                            {form.tasks.some(t => t.title === s) ? '✓ ' : '+ '}{s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {form.tasks.map((task, idx) => (
                                <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', minWidth: 20, textAlign: 'right' }}>{idx + 1}.</span>
                                    <input
                                        className="form-input"
                                        style={{ flex: 1, padding: '0.35rem 0.6rem', fontSize: '0.85rem' }}
                                        value={task.title}
                                        onChange={e => updateTask(idx, 'title', e.target.value)}
                                        placeholder="Task title"
                                        maxLength={200}
                                    />
                                    <input
                                        type="date"
                                        className="form-input"
                                        style={{ width: 145, padding: '0.35rem 0.6rem', fontSize: '0.82rem' }}
                                        value={task.plannedEnd}
                                        onChange={e => updateTask(idx, 'plannedEnd', e.target.value)}
                                        title="Deadline (optional)"
                                    />
                                    <button type="button" onClick={() => removeTask(idx)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem' }}>
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                            {form.tasks.length === 0 && (
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>
                                    No tasks yet — click chips above or "Add Task"
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Required Resources */}
                    <div className="glass-card" style={{ padding: '1rem 1.1rem' }}>
                        <h3 style={{ margin: '0 0 0.875rem', fontSize: '0.9rem', fontWeight: 700 }}>Required Resources (optional)</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            {/* Devices from project stock */}
                            <div>
                                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                                    Devices (from Project Stock)
                                </div>
                                {form.requiredDevices.map((device, idx) => {
                                    return (
                                        <div key={idx} style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.35rem', alignItems: 'center' }}>
                                            <select
                                                className="form-select"
                                                style={{ flex: 1, padding: '0.3rem 0.5rem', fontSize: '0.8rem' }}
                                                value={device.allocationId || ''}
                                                onChange={e => {
                                                    const alloc = allocations.find(a => a._id === e.target.value);
                                                    updateDevice(idx, 'allocationId', e.target.value);
                                                    updateDevice(idx, 'deviceTypeName', alloc?.stockItemId?.deviceType || '');
                                                }}
                                            >
                                                <option value="">-- Select Device --</option>
                                                {allocations.map(alloc => {
                                                    const isAssigned = assignedAllocationIds.has(alloc._id) && alloc._id !== device.allocationId;
                                                    const remaining = alloc.remainingQty ?? (alloc.allocatedQty - (alloc.installedQty || 0) - (alloc.faultyQty || 0));
                                                    const isOut = remaining <= 0;
                                                    return (
                                                        <option key={alloc._id} value={alloc._id} disabled={isAssigned || isOut}>
                                                            {alloc.stockItemId?.assetType} — {alloc.stockItemId?.deviceType}
                                                            {isAssigned ? ' (Assigned)' : isOut ? ' (Out of Stock)' : ` (Remaining: ${remaining})`}
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                            <input
                                                type="number" min={1} className="form-input"
                                                style={{ width: 70, padding: '0.3rem 0.5rem', fontSize: '0.8rem' }}
                                                value={device.qty}
                                                onChange={e => updateDevice(idx, 'qty', Number(e.target.value))}
                                            />
                                            <button type="button" onClick={() => removeDevice(idx)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={13} /></button>
                                        </div>
                                    );
                                })}
                                {allocations.length === 0 && (
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: '0 0 0.4rem' }}>
                                        No stock allocated to this project yet.
                                    </p>
                                )}
                                <button type="button" className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }} onClick={addDevice}><Plus size={12} /> Add Device</button>
                            </div>
                            {/* Stock */}
                            <div>
                                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Stock Items</div>
                                {form.requiredStockItems.map((s, idx) => (
                                    <div key={idx} style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.35rem' }}>
                                        <input className="form-input" style={{ flex: 1, padding: '0.3rem 0.5rem', fontSize: '0.8rem' }} value={s.itemName} onChange={e => updateStock(idx, 'itemName', e.target.value)} placeholder="Item name" />
                                        <input type="number" className="form-input" style={{ width: 60, padding: '0.3rem 0.5rem', fontSize: '0.8rem' }} value={s.qty} min={1} onChange={e => updateStock(idx, 'qty', Number(e.target.value))} />
                                        <button type="button" onClick={() => removeStock(idx)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={13} /></button>
                                    </div>
                                ))}
                                <button type="button" className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }} onClick={addStock}><Plus size={12} /> Add Item</button>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                        <Link to={backTo} className="btn btn-ghost">Cancel</Link>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? 'Saving…' : isEditing ? 'Update Activity' : 'Create Activity'}
                        </button>
                    </div>

                </div>
            </form>
        </div>
    );
}
