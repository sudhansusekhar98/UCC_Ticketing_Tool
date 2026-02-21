import { useState, useEffect, useCallback } from 'react';
import { Users, Clock, CheckCircle, XCircle, RefreshCw, Eye, Check, X, Loader, Key, Plus, Edit3, Trash2, RotateCcw, UserPlus, Search, MapPin } from 'lucide-react';
import useAuthStore from '../../context/authStore';
import toast from 'react-hot-toast';
import './ClientRegistrations.css';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const STATUS_BADGE = {
    Pending: { cls: 'badge badge-warning', icon: <Clock size={11} /> },
    Approved: { cls: 'badge badge-success', icon: <CheckCircle size={11} /> },
    Rejected: { cls: 'badge badge-danger', icon: <XCircle size={11} /> },
};

function formatDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Helper: generate random password (client-side)
const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!';
    let pw = '';
    for (let i = 0; i < 10; i++) pw += chars.charAt(Math.floor(Math.random() * chars.length));
    return pw;
};

export default function ClientRegistrations() {
    const { accessToken } = useAuthStore();
    // Top-level view: 'registrations' or 'clients'
    const [view, setView] = useState('registrations');

    // ============= REGISTRATIONS STATE =============
    const [regTab, setRegTab] = useState('Pending');
    const [registrations, setRegistrations] = useState([]);
    const [regLoading, setRegLoading] = useState(true);
    const [regPagination, setRegPagination] = useState({ total: 0, page: 1, pages: 1 });

    // Approve modal
    const [approveModal, setApproveModal] = useState(null);
    const [customPassword, setCustomPassword] = useState('');
    // Reject modal
    const [rejectModal, setRejectModal] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    // ============= CLIENTS STATE =============
    const [clients, setClients] = useState([]);
    const [clientLoading, setClientLoading] = useState(true);
    const [clientSearch, setClientSearch] = useState('');
    const [sites, setSites] = useState([]);
    // Client modals
    const [clientModal, setClientModal] = useState(null); // { mode: 'create'|'edit', data: {...} }
    const [clientForm, setClientForm] = useState({ fullName: '', email: '', phone: '', designation: '', assignedSite: '', tempPassword: '' });
    const [resetModal, setResetModal] = useState(null); // { id, fullName, email }
    const [resetPassword, setResetPassword] = useState('');
    const [deleteModal, setDeleteModal] = useState(null);
    const [credentialsModal, setCredentialsModal] = useState(null); // { username, tempPassword, email }

    const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` };

    // ===================== REGISTRATIONS =====================

    const fetchRegistrations = useCallback(async (tab = regTab, page = 1) => {
        setRegLoading(true);
        try {
            const params = new URLSearchParams({ page, limit: 20 });
            if (tab !== 'All') params.append('status', tab);
            const res = await fetch(`${API_BASE}/client-registrations?${params}`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            const data = await res.json();
            if (data.success) {
                setRegistrations(data.data);
                setRegPagination(data.pagination);
            }
        } catch {
            toast.error('Failed to load registrations');
        } finally {
            setRegLoading(false);
        }
    }, [accessToken]);

    useEffect(() => { if (view === 'registrations') fetchRegistrations(regTab); }, [regTab, view, fetchRegistrations]);

    // Approve flow: Step 1 → Password modal
    const openApproveModal = (reg) => {
        const pwd = generatePassword();
        setCustomPassword(pwd);
        setApproveModal({ id: reg._id, fullName: reg.fullName, email: reg.email, designation: reg.designation, step: 'password' });
    };

    // Approve flow: Step 2 → Call API
    const handleApproveConfirm = async () => {
        if (!customPassword || customPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
        setApproveModal(prev => ({ ...prev, step: 'loading' }));
        setActionLoading(true);
        try {
            const res = await fetch(`${API_BASE}/client-registrations/${approveModal.id}/approve`, {
                method: 'POST', headers: authHeaders,
                body: JSON.stringify({ tempPassword: customPassword })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            setApproveModal(prev => ({ ...prev, username: data.data.username, tempPassword: data.data.tempPassword, step: 'confirm' }));
        } catch (err) {
            toast.error(err.message || 'Approval failed');
            setApproveModal(null);
        } finally { setActionLoading(false); }
    };

    const closeApproveModal = () => { setApproveModal(null); setCustomPassword(''); fetchRegistrations(regTab); };

    // Reject flow
    const openRejectModal = (reg) => { setRejectModal({ id: reg._id, fullName: reg.fullName }); setRejectReason(''); };
    const handleReject = async () => {
        if (!rejectReason.trim()) { toast.error('Please enter a rejection reason'); return; }
        setActionLoading(true);
        try {
            const res = await fetch(`${API_BASE}/client-registrations/${rejectModal.id}/reject`, {
                method: 'POST', headers: authHeaders,
                body: JSON.stringify({ reason: rejectReason })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            toast.success('Registration rejected successfully');
            setRejectModal(null);
            fetchRegistrations(regTab);
        } catch (err) { toast.error(err.message || 'Rejection failed'); }
        finally { setActionLoading(false); }
    };

    const pendingCount = registrations.filter(r => r.status === 'Pending').length;

    // ===================== CLIENTS =====================

    const fetchClients = useCallback(async () => {
        setClientLoading(true);
        try {
            const params = new URLSearchParams({ limit: 100 });
            if (clientSearch.trim()) params.append('search', clientSearch.trim());
            const res = await fetch(`${API_BASE}/client-registrations/clients?${params}`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            const data = await res.json();
            if (data.success) setClients(data.data);
        } catch { toast.error('Failed to load clients'); }
        finally { setClientLoading(false); }
    }, [accessToken, clientSearch]);

    const fetchSites = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/sites`, { headers: { Authorization: `Bearer ${accessToken}` } });
            const data = await res.json();
            if (data.success) setSites(data.data || []);
        } catch { /* silently fail */ }
    }, [accessToken]);

    useEffect(() => { if (view === 'clients') { fetchClients(); fetchSites(); } }, [view, fetchClients, fetchSites]);
    useEffect(() => { if (view === 'clients') fetchClients(); }, [clientSearch, fetchClients]);

    // Create / Edit modal
    const openCreateClient = () => {
        setClientForm({ fullName: '', email: '', phone: '', designation: '', assignedSite: '', tempPassword: generatePassword() });
        setClientModal({ mode: 'create' });
    };
    const openEditClient = (client) => {
        const firstSite = (client.assignedSites || [])[0];
        setClientForm({
            fullName: client.fullName,
            email: client.email,
            phone: client.mobileNumber || '',
            designation: client.designation || '',
            assignedSite: firstSite ? (typeof firstSite === 'object' ? firstSite._id : firstSite) : '',
            tempPassword: ''
        });
        setClientModal({ mode: 'edit', id: client._id });
    };

    const handleClientFormChange = (e) => setClientForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleSiteSelect = (e) => {
        setClientForm(prev => ({ ...prev, assignedSite: e.target.value }));
    };

    const handleClientSave = async () => {
        if (!clientForm.fullName || !clientForm.email) { toast.error('Name and Email are required'); return; }
        setActionLoading(true);
        try {
            const isCreate = clientModal.mode === 'create';
            const url = isCreate ? `${API_BASE}/client-registrations/clients` : `${API_BASE}/client-registrations/clients/${clientModal.id}`;
            const method = isCreate ? 'POST' : 'PUT';
            const body = {
                fullName: clientForm.fullName,
                email: clientForm.email,
                phone: clientForm.phone,
                designation: clientForm.designation,
                assignedSites: clientForm.assignedSite ? [clientForm.assignedSite] : []
            };
            if (isCreate) body.tempPassword = clientForm.tempPassword;

            const res = await fetch(url, { method, headers: authHeaders, body: JSON.stringify(body) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);

            if (isCreate) {
                toast.success('Client created successfully');
                setCredentialsModal({ username: data.data.username, tempPassword: data.data.tempPassword, email: clientForm.email });
            } else {
                toast.success('Client updated successfully');
            }
            setClientModal(null);
            fetchClients();
        } catch (err) { toast.error(err.message || 'Operation failed'); }
        finally { setActionLoading(false); }
    };

    // Delete
    const handleDeleteConfirm = async () => {
        setActionLoading(true);
        try {
            const res = await fetch(`${API_BASE}/client-registrations/clients/${deleteModal.id}`, { method: 'DELETE', headers: authHeaders });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            toast.success('Client deactivated');
            setDeleteModal(null);
            fetchClients();
        } catch (err) { toast.error(err.message); }
        finally { setActionLoading(false); }
    };

    // Reset password
    const openResetModal = (client) => { setResetModal({ id: client._id, fullName: client.fullName, email: client.email }); setResetPassword(generatePassword()); };
    const handleResetConfirm = async () => {
        if (!resetPassword || resetPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
        setActionLoading(true);
        try {
            const res = await fetch(`${API_BASE}/client-registrations/clients/${resetModal.id}/reset-password`, {
                method: 'POST', headers: authHeaders,
                body: JSON.stringify({ tempPassword: resetPassword })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            toast.success('Password reset email sent');
            setCredentialsModal({ username: resetModal.email, tempPassword: data.data.tempPassword, email: resetModal.email, isReset: true });
            setResetModal(null);
        } catch (err) { toast.error(err.message); }
        finally { setActionLoading(false); }
    };

    return (
        <div className="page-container animate-fade-in client-reg-page">
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        <Users size={22} style={{ verticalAlign: 'middle', marginRight: 8 }} />
                        Client Management
                    </h1>
                    <p className="page-subtitle">Manage client registrations, accounts, and access</p>
                </div>
                <div className="header-actions">
                    {view === 'clients' && (
                        <button className="btn btn-primary btn-sm" onClick={openCreateClient}>
                            <UserPlus size={14} /> New Client
                        </button>
                    )}
                    <button className="btn btn-secondary icon-btn-small" onClick={() => view === 'registrations' ? fetchRegistrations(regTab) : fetchClients()} title="Refresh">
                        <RefreshCw size={14} />
                    </button>
                </div>
            </div>

            {/* Top-level view switcher */}
            <div className="cr-view-switcher">
                <button className={`cr-view-btn ${view === 'registrations' ? 'active' : ''}`} onClick={() => setView('registrations')}>
                    <Clock size={15} /> Registrations
                    {pendingCount > 0 && <span className="cr-tab-badge">{pendingCount}</span>}
                </button>
                <button className={`cr-view-btn ${view === 'clients' ? 'active' : ''}`} onClick={() => setView('clients')}>
                    <Users size={15} /> Clients
                </button>
            </div>

            {/* ===================== REGISTRATIONS VIEW ===================== */}
            {view === 'registrations' && (
                <>
                    {/* Sub-tabs */}
                    <div className="cr-tabs glass-card">
                        {['All', 'Pending', 'Approved', 'Rejected'].map(tab => (
                            <button key={tab} className={`cr-tab ${regTab === tab ? 'active' : ''}`} onClick={() => setRegTab(tab)}>
                                {tab}
                                {tab === 'Pending' && pendingCount > 0 && <span className="cr-tab-badge">{pendingCount}</span>}
                            </button>
                        ))}
                    </div>

                    <div className="glass-card cr-table-card">
                        {regLoading ? (
                            <div className="loading-state"><div className="spinner" /><span>Loading registrations...</span></div>
                        ) : registrations.length === 0 ? (
                            <div className="empty-state"><Users size={40} /><p>No {regTab !== 'All' ? regTab.toLowerCase() : ''} registrations found.</p></div>
                        ) : (
                            <div className="table-wrapper">
                                <table className="data-table cr-table">
                                    <thead>
                                        <tr>
                                            <th>Name</th><th>Email</th><th>Phone</th><th>Designation</th>
                                            <th>Site Name</th><th>Submitted</th><th>Status</th>
                                            {regTab !== 'Rejected' && <th>Actions</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {registrations.map(reg => (
                                            <tr key={reg._id}>
                                                <td className="cr-name">
                                                    <strong>{reg.fullName}</strong>
                                                    {reg.message && <span className="cr-message" title={reg.message}><Eye size={11} /> note</span>}
                                                </td>
                                                <td>{reg.email}</td>
                                                <td>{reg.phone}</td>
                                                <td><span className="cr-desig">{reg.designation || '—'}</span></td>
                                                <td>{reg.siteName}</td>
                                                <td><span className="date-text">{formatDate(reg.createdAt)}</span></td>
                                                <td>
                                                    <span className={STATUS_BADGE[reg.status]?.cls || 'badge badge-secondary'}>
                                                        {STATUS_BADGE[reg.status]?.icon}{reg.status}
                                                    </span>
                                                </td>
                                                {regTab !== 'Rejected' && (
                                                    <td>
                                                        {reg.status === 'Pending' ? (
                                                            <div className="cr-actions">
                                                                <button className="btn btn-success btn-sm" onClick={() => openApproveModal(reg)}><Check size={13} /> Approve</button>
                                                                <button className="btn btn-outline-danger btn-sm" onClick={() => openRejectModal(reg)}><X size={13} /> Reject</button>
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted text-xs">
                                                                {reg.status === 'Approved' ? `Approved ${formatDate(reg.approvedAt)}` : ''}
                                                            </span>
                                                        )}
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* ===================== CLIENTS VIEW ===================== */}
            {view === 'clients' && (
                <>
                    <div className="cr-client-toolbar glass-card">
                        <div className="cr-search-box">
                            <Search size={16} />
                            <input
                                type="text" placeholder="Search clients by name, email..."
                                value={clientSearch} onChange={e => setClientSearch(e.target.value)}
                                className="form-input"
                            />
                        </div>
                        <span className="text-muted" style={{ fontSize: '0.8rem' }}>{clients.length} client{clients.length !== 1 ? 's' : ''}</span>
                    </div>

                    <div className="glass-card cr-table-card">
                        {clientLoading ? (
                            <div className="loading-state"><div className="spinner" /><span>Loading clients...</span></div>
                        ) : clients.length === 0 ? (
                            <div className="empty-state"><Users size={40} /><p>No clients found.</p></div>
                        ) : (
                            <div className="table-wrapper">
                                <table className="data-table cr-table">
                                    <thead>
                                        <tr>
                                            <th>Name</th><th>Email</th><th>Username</th><th>Phone</th>
                                            <th>Designation</th><th>Sites</th><th>Status</th><th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {clients.map(c => (
                                            <tr key={c._id} className={!c.isActive ? 'cr-row-inactive' : ''}>
                                                <td><strong>{c.fullName}</strong></td>
                                                <td>{c.email}</td>
                                                <td><code className="cr-username">{c.username}</code></td>
                                                <td>{c.mobileNumber || '—'}</td>
                                                <td>{c.designation || '—'}</td>
                                                <td>
                                                    {c.assignedSites?.length > 0
                                                        ? c.assignedSites.map(s => <span key={s._id || s} className="cr-site-pill"><MapPin size={10} />{s.siteName || s}</span>)
                                                        : <span className="text-muted">—</span>
                                                    }
                                                </td>
                                                <td>
                                                    <span className={`badge ${c.isActive ? 'badge-success' : 'badge-danger'}`}>
                                                        {c.isActive ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="cr-actions">
                                                        <button className="btn btn-secondary btn-sm btn-icon-only" title="Edit" onClick={() => openEditClient(c)}><Edit3 size={13} /></button>
                                                        <button className="btn btn-secondary btn-sm btn-icon-only" title="Reset Password" onClick={() => openResetModal(c)}><RotateCcw size={13} /></button>
                                                        {c.isActive && (
                                                            <button className="btn btn-outline-danger btn-sm btn-icon-only" title="Deactivate" onClick={() => setDeleteModal({ id: c._id, fullName: c.fullName })}><Trash2 size={13} /></button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* ===================== MODALS ===================== */}

            {/* APPROVE MODAL (3-step: password → loading → confirm) */}
            {approveModal && (
                <div className="modal-overlay" onClick={closeApproveModal}>
                    <div className="modal cr-modal" onClick={e => e.stopPropagation()}>
                        {approveModal.step === 'password' && (
                            <>
                                <div className="modal-header"><h3><Key size={18} color="var(--primary-500)" /> Approve Client</h3></div>
                                <div className="modal-body">
                                    <p>Approve registration for <strong>{approveModal.fullName}</strong> (<strong>{approveModal.email}</strong>).</p>
                                    {approveModal.designation && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>Designation: <strong>{approveModal.designation}</strong></p>}
                                    <div className="form-group" style={{ marginTop: 16 }}>
                                        <label className="form-label">Temporary Password</label>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <input className="form-input" value={customPassword} onChange={e => setCustomPassword(e.target.value)} placeholder="Min 6 characters" style={{ flex: 1, fontFamily: 'monospace' }} />
                                            <button className="btn btn-secondary btn-sm" type="button" onClick={() => setCustomPassword(generatePassword())} title="Generate"><RefreshCw size={14} /> Generate</button>
                                        </div>
                                        <p className="text-muted" style={{ fontSize: '0.78rem', marginTop: 6 }}>This will be emailed and logged in Notification Logs.</p>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button className="btn btn-secondary" onClick={closeApproveModal}>Cancel</button>
                                    <button className="btn btn-success" onClick={handleApproveConfirm} disabled={actionLoading || !customPassword || customPassword.length < 6}><Check size={14} /> Approve & Create Account</button>
                                </div>
                            </>
                        )}
                        {approveModal.step === 'loading' && <div className="modal-loading"><div className="spinner" /><p>Creating account and sending email...</p></div>}
                        {approveModal.step === 'confirm' && (
                            <>
                                <div className="modal-header"><h3><CheckCircle size={18} color="var(--success-500)" /> Account Created</h3></div>
                                <div className="modal-body">
                                    <p>Account for <strong>{approveModal.fullName}</strong> created. Email sent to <strong>{approveModal.email}</strong>.</p>
                                    <div className="credentials-box">
                                        <div className="credential-row"><span className="cred-label">Username</span><code className="cred-value">{approveModal.username}</code></div>
                                        <div className="credential-row"><span className="cred-label">Temp Password</span><code className="cred-value">{approveModal.tempPassword}</code></div>
                                    </div>
                                    <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: 8 }}>Credentials saved in Notification Logs for retrieval.</p>
                                </div>
                                <div className="modal-footer"><button className="btn btn-primary" onClick={closeApproveModal}>Done</button></div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* REJECT MODAL */}
            {rejectModal && (
                <div className="modal-overlay" onClick={() => setRejectModal(null)}>
                    <div className="modal cr-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h3><XCircle size={18} color="var(--danger-500)" /> Reject Registration</h3></div>
                        <div className="modal-body">
                            <p>Rejecting request from <strong>{rejectModal.fullName}</strong>. Provide a reason:</p>
                            <div className="form-group" style={{ marginTop: 12 }}>
                                <label className="form-label">Rejection Reason <span style={{ color: 'var(--danger-500)' }}>*</span></label>
                                <textarea className="form-input" rows={3} placeholder="e.g., Could not verify the site association..." value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setRejectModal(null)}>Cancel</button>
                            <button className="btn btn-danger" onClick={handleReject} disabled={actionLoading}>
                                {actionLoading ? <Loader size={14} className="animate-spin" /> : <X size={14} />} Reject & Notify
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CREATE / EDIT CLIENT MODAL */}
            {clientModal && (
                <div className="modal-overlay" onClick={() => setClientModal(null)}>
                    <div className="modal cr-modal cr-modal-lg" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{clientModal.mode === 'create' ? <><UserPlus size={18} color="var(--primary-500)" /> New Client</> : <><Edit3 size={18} color="var(--primary-500)" /> Edit Client</>}</h3>
                        </div>
                        <div className="modal-body">
                            <div className="cr-form-grid">
                                <div className="form-group">
                                    <label className="form-label">Full Name <span style={{ color: 'var(--danger-500)' }}>*</span></label>
                                    <input className="form-input" name="fullName" value={clientForm.fullName} onChange={handleClientFormChange} placeholder="Client's full name" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Email <span style={{ color: 'var(--danger-500)' }}>*</span></label>
                                    <input className="form-input" name="email" type="email" value={clientForm.email} onChange={handleClientFormChange} placeholder="client@example.com" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Phone</label>
                                    <input className="form-input" name="phone" value={clientForm.phone} onChange={handleClientFormChange} placeholder="+91 98765 43210" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Designation</label>
                                    <input className="form-input" name="designation" value={clientForm.designation} onChange={handleClientFormChange} placeholder="e.g. IT Manager" />
                                </div>
                            </div>

                            {clientModal.mode === 'create' && (
                                <div className="form-group" style={{ marginTop: 8 }}>
                                    <label className="form-label">Temporary Password</label>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <input className="form-input" value={clientForm.tempPassword} onChange={e => setClientForm(p => ({ ...p, tempPassword: e.target.value }))} style={{ flex: 1, fontFamily: 'monospace' }} />
                                        <button className="btn btn-secondary btn-sm" type="button" onClick={() => setClientForm(p => ({ ...p, tempPassword: generatePassword() }))}><RefreshCw size={14} /> Generate</button>
                                    </div>
                                </div>
                            )}

                            {/* Site assignment */}
                            <div className="form-group" style={{ marginTop: 12 }}>
                                <label className="form-label">Assigned Site <span style={{ color: 'var(--danger-500)' }}>*</span></label>
                                <select
                                    className="form-input cr-site-dropdown"
                                    value={clientForm.assignedSite}
                                    onChange={handleSiteSelect}
                                >
                                    <option value="">— Select a site —</option>
                                    {sites.map(site => (
                                        <option key={site._id} value={site._id}>{site.siteName}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setClientModal(null)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleClientSave} disabled={actionLoading}>
                                {actionLoading ? <Loader size={14} className="animate-spin" /> : <Check size={14} />}
                                {clientModal.mode === 'create' ? ' Create Client' : ' Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* RESET PASSWORD MODAL */}
            {resetModal && (
                <div className="modal-overlay" onClick={() => setResetModal(null)}>
                    <div className="modal cr-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h3><RotateCcw size={18} color="var(--warning-500)" /> Reset Password</h3></div>
                        <div className="modal-body">
                            <p>Reset password for <strong>{resetModal.fullName}</strong> (<strong>{resetModal.email}</strong>).</p>
                            <div className="form-group" style={{ marginTop: 12 }}>
                                <label className="form-label">New Temporary Password</label>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <input className="form-input" value={resetPassword} onChange={e => setResetPassword(e.target.value)} placeholder="Min 6 characters" style={{ flex: 1, fontFamily: 'monospace' }} />
                                    <button className="btn btn-secondary btn-sm" type="button" onClick={() => setResetPassword(generatePassword())}><RefreshCw size={14} /> Generate</button>
                                </div>
                                <p className="text-muted" style={{ fontSize: '0.78rem', marginTop: 6 }}>A reset email will be sent and logged in Notification Logs.</p>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setResetModal(null)}>Cancel</button>
                            <button className="btn btn-warning" onClick={handleResetConfirm} disabled={actionLoading || !resetPassword || resetPassword.length < 6}>
                                {actionLoading ? <Loader size={14} className="animate-spin" /> : <RotateCcw size={14} />} Reset & Send Email
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* DELETE (DEACTIVATE) MODAL */}
            {deleteModal && (
                <div className="modal-overlay" onClick={() => setDeleteModal(null)}>
                    <div className="modal cr-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h3><Trash2 size={18} color="var(--danger-500)" /> Deactivate Client</h3></div>
                        <div className="modal-body">
                            <p>Are you sure you want to deactivate <strong>{deleteModal.fullName}</strong>?</p>
                            <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: 8 }}>The client will no longer be able to log in. This can be undone by editing the client and setting them as active.</p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setDeleteModal(null)}>Cancel</button>
                            <button className="btn btn-danger" onClick={handleDeleteConfirm} disabled={actionLoading}>
                                {actionLoading ? <Loader size={14} className="animate-spin" /> : <Trash2 size={14} />} Deactivate
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CREDENTIALS RESULT MODAL (after create or reset) */}
            {credentialsModal && (
                <div className="modal-overlay" onClick={() => setCredentialsModal(null)}>
                    <div className="modal cr-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3><CheckCircle size={18} color="var(--success-500)" /> {credentialsModal.isReset ? 'Password Reset' : 'Client Created'}</h3>
                        </div>
                        <div className="modal-body">
                            <p>{credentialsModal.isReset ? 'Password has been reset' : 'Account created'} for <strong>{credentialsModal.email}</strong>. An email has been sent.</p>
                            <div className="credentials-box">
                                <div className="credential-row"><span className="cred-label">{credentialsModal.isReset ? 'Email' : 'Username'}</span><code className="cred-value">{credentialsModal.username}</code></div>
                                <div className="credential-row"><span className="cred-label">Temp Password</span><code className="cred-value">{credentialsModal.tempPassword}</code></div>
                            </div>
                            <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: 8 }}>Credentials saved in Notification Logs for retrieval.</p>
                        </div>
                        <div className="modal-footer"><button className="btn btn-primary" onClick={() => setCredentialsModal(null)}>Done</button></div>
                    </div>
                </div>
            )}
        </div>
    );
}
