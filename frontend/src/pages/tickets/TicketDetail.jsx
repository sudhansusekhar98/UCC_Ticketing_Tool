import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Edit,
    UserPlus,
    CheckCircle,
    Play,
    XCircle,
    AlertTriangle,
    Clock,
    History,
    Paperclip,
    FileText,
    RotateCcw,
} from 'lucide-react';
import { ticketsApi, usersApi } from '../../services/api';
import socketService from '../../services/socket';
import useAuthStore from '../../context/authStore';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import ActivitySection from './ActivitySection';
import RMASection from './RMASection';
import AssetUpdateApproval from './AssetUpdateApproval';
import './Tickets.css';

export default function TicketDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, hasRole, hasRight } = useAuthStore();
    const [ticket, setTicket] = useState(null);
    const [auditTrail, setAuditTrail] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    // Modal states
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showResolveModal, setShowResolveModal] = useState(false);
    const [showReopenModal, setShowReopenModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [engineers, setEngineers] = useState([]);
    const [assignData, setAssignData] = useState({ assignedTo: '', remarks: '' });
    const [resolveData, setResolveData] = useState({ rootCause: '', resolutionSummary: '' });
    const [reopenReason, setReopenReason] = useState('');
    const [rejectReason, setRejectReason] = useState('');
    const [showEscalateModal, setShowEscalateModal] = useState(false);
    const [escalationReason, setEscalationReason] = useState('');
    const [showAcceptEscalationModal, setShowAcceptEscalationModal] = useState(false);
    const [escalationUsers, setEscalationUsers] = useState([]);
    const [selectedEscalationUser, setSelectedEscalationUser] = useState('');

    const isLocked = ['InProgress', 'OnHold', 'Resolved', 'ResolutionRejected', 'Verified', 'Closed', 'Cancelled'].includes(ticket?.status);
    // Get the site ID from the ticket's asset
    // Get the site ID from the ticket directly or via asset
    const ticketSiteId = ticket?.siteId?._id || ticket?.siteId || ticket?.assetId?.siteId?._id || ticket?.assetId?.siteId;
    const canEdit = (hasRole(['Admin', 'Supervisor', 'Dispatcher']) || hasRight('EDIT_TICKET', ticketSiteId)) && !isLocked;
    const canAssign = hasRole(['Admin', 'Supervisor', 'Dispatcher']) || hasRight('EDIT_TICKET', ticketSiteId);
    // Compare using string IDs for MongoDB
    const assignedToId = typeof ticket?.assignedTo === 'object' ? ticket?.assignedTo?._id : ticket?.assignedTo;
    const isAssignedToMe = assignedToId && assignedToId === user?.userId;
    // Any user assigned to the ticket can acknowledge, or users with engineer/supervisor roles
    const canAcknowledge = isAssignedToMe || (hasRole(['L1Engineer', 'L2Engineer', 'Supervisor']) && assignedToId === user?.userId);
    const canRejectResolution = hasRole(['Admin', 'Supervisor', 'Dispatcher']) || hasRight('EDIT_TICKET', ticketSiteId);
    const canAcknowledgeRejection = isAssignedToMe;
    const canReopen = hasRole(['Admin', 'Supervisor', 'Dispatcher']) || hasRight('EDIT_TICKET', ticketSiteId) || hasRight('CREATE_TICKET', ticketSiteId);
    
    // Escalation-specific logic: If escalation is accepted, only the escalation user (current assignee) and Admin can resolve/close
    const isEscalationAccepted = !!ticket?.escalationAcceptedBy;
    const isAdmin = hasRole('Admin');
    
    const canResolve = isEscalationAccepted 
        ? (isAssignedToMe || isAdmin)
        : (isAssignedToMe || hasRole(['L1Engineer', 'L2Engineer', 'Supervisor']));
        
    const canClose = isEscalationAccepted
        ? (isAssignedToMe || isAdmin)
        : (hasRole(['Admin', 'Supervisor', 'Dispatcher']) || hasRight('DELETE_TICKET', ticketSiteId));
    const canEscalate = ticket?.escalationLevel < 3 && ticket?.status !== 'Escalated' && !['Resolved', 'Verified', 'Closed', 'Cancelled'].includes(ticket?.status) && (isAssignedToMe || hasRole(['Admin', 'Supervisor', 'Dispatcher']));
    const canAcceptEscalation = ticket?.status === 'Escalated' && (
        hasRole(['Admin', 'Supervisor', 'Dispatcher']) || 
        (ticket?.escalationLevel === 1 && (hasRight('ESCALATION_L1', ticketSiteId) || hasRight('ESCALATION_L2', ticketSiteId) || hasRight('ESCALATION_L3', ticketSiteId))) ||
        (ticket?.escalationLevel === 2 && (hasRight('ESCALATION_L2', ticketSiteId) || hasRight('ESCALATION_L3', ticketSiteId))) ||
        (ticket?.escalationLevel === 3 && hasRight('ESCALATION_L3', ticketSiteId))
    );
    const canDelegateEscalation = hasRole(['Admin', 'Supervisor', 'Dispatcher']);

    useEffect(() => {
        fetchTicket();
        fetchAuditTrail();
        loadEngineers();

        // Connect to socket and join room
        socketService.connect();
        socketService.joinTicketRoom(id);

        const handleRealtimeUpdate = (data) => {
            // Check if update is for this ticket
            if (data.ticketId === id || data.ticketId === ticket?._id) {
                console.log('🔔 Notification: Real-time update for ticket', id);
                fetchTicket();
                fetchAuditTrail();
            }
        };

        socketService.onActivityCreated(handleRealtimeUpdate);

        return () => {
            socketService.leaveTicketRoom(id);
            socketService.offActivityCreated(handleRealtimeUpdate);
        };
    }, [id]);

    const fetchTicket = async () => {
        try {
            const response = await ticketsApi.getById(id);
            const ticketData = response.data.data || response.data;
            // Map fields for Express response
            setTicket({
                ...ticketData,
                ticketId: ticketData._id || ticketData.ticketId,
                createdOn: ticketData.createdAt || ticketData.createdOn,
                assetCode: ticketData.assetId?.assetCode || ticketData.assetCode,
                assetType: ticketData.assetId?.assetType || ticketData.assetType,
                siteName: ticketData.siteId?.siteName || ticketData.assetId?.siteId?.siteName || ticketData.siteName,
                siteId: ticketData.siteId?._id || ticketData.siteId || ticketData.assetId?.siteId?._id || ticketData.assetId?.siteId,
                createdByName: ticketData.createdBy?.fullName || ticketData.createdByName,
                assignedToName: ticketData.assignedTo?.fullName || ticketData.assignedToName,
                assignedTo: typeof ticketData.assignedTo === 'object' ? ticketData.assignedTo?._id : ticketData.assignedTo,
                slaStatus: ticketData.isSLARestoreBreached ? 'Breached' : 
                           (ticketData.isSLAResponseBreached ? 'AtRisk' : 'OnTrack')
            });
        } catch (error) {
            toast.error('Failed to load ticket');
            navigate('/tickets');
        } finally {
            setLoading(false);
        }
    };

    const fetchAuditTrail = async () => {
        try {
            const response = await ticketsApi.getAuditTrail(id);
            const activities = response.data.data || response.data || [];
            // Map fields for Express response
            setAuditTrail(activities.map(a => ({
                ...a,
                auditId: a._id || a.auditId || a.activityId,
                action: a.activityType || a.action,
                performedOn: a.createdOn || a.performedOn || a.createdAt,
                remarks: a.content || a.remarks
            })));
        } catch (error) {
            console.error('Failed to load audit trail', error);
        }
    };

    const loadEngineers = async () => {
        try {
            const response = await usersApi.getEngineers();
            const engData = response.data.data || response.data || [];
            setEngineers(engData.map(e => ({
                value: e._id || e.value || e.userId,
                label: e.fullName || e.label
            })));
        } catch (error) {
            console.error('Failed to load engineers', error);
        }
    };

    const handleAssign = async () => {
        if (!assignData.assignedTo) {
            toast.error('Please select an engineer');
            return;
        }
        setActionLoading(true);
        try {
            await ticketsApi.assign(id, assignData);
            toast.success('Ticket assigned successfully');
            setShowAssignModal(false);
            fetchTicket();
            fetchAuditTrail();
        } catch (error) {
            toast.error('Failed to assign ticket');
        } finally {
            setActionLoading(false);
        }
    };

    const handleAcknowledge = async () => {
        setActionLoading(true);
        try {
            await ticketsApi.acknowledge(id);
            toast.success('Ticket acknowledged');
            fetchTicket();
            fetchAuditTrail();
        } catch (error) {
            toast.error('Failed to acknowledge ticket');
        } finally {
            setActionLoading(false);
        }
    };

    const handleStart = async () => {
        setActionLoading(true);
        try {
            await ticketsApi.start(id);
            toast.success('Work started on ticket');
            fetchTicket();
            fetchAuditTrail();
        } catch (error) {
            toast.error('Failed to start ticket');
        } finally {
            setActionLoading(false);
        }
    };

    const handleResolve = async () => {
        if (!resolveData.rootCause || !resolveData.resolutionSummary) {
            toast.error('Please fill in root cause and resolution');
            return;
        }
        setActionLoading(true);
        try {
            await ticketsApi.resolve(id, resolveData);
            toast.success('Ticket resolved');
            setShowResolveModal(false);
            fetchTicket();
            fetchAuditTrail();
        } catch (error) {
            toast.error('Failed to resolve ticket');
        } finally {
            setActionLoading(false);
        }
    };

    const handleClose = async () => {
        setActionLoading(true);
        try {
            await ticketsApi.close(id, {});
            toast.success('Ticket closed');
            fetchTicket();
            fetchAuditTrail();
        } catch (error) {
            toast.error('Failed to close ticket');
        } finally {
            setActionLoading(false);
        }
    };

    const handleReopen = async () => {
        if (!reopenReason.trim()) {
            toast.error('Please provide a reason for reopening');
            return;
        }
        setActionLoading(true);
        try {
            await ticketsApi.reopen(id, reopenReason.trim());
            toast.success('Ticket reopened');
            setShowReopenModal(false);
            setReopenReason('');
            fetchTicket();
            fetchAuditTrail();
        } catch (error) {
            toast.error('Failed to reopen ticket');
        } finally {
            setActionLoading(false);
        }
    };

    const handleRejectResolution = async () => {
        if (!rejectReason.trim()) {
            toast.error('Please provide a reason for rejecting the resolution');
            return;
        }
        setActionLoading(true);
        try {
            await ticketsApi.rejectResolution(id, rejectReason.trim());
            toast.success('Resolution rejected. The assigned user has been notified.');
            setShowRejectModal(false);
            setRejectReason('');
            fetchTicket();
            fetchAuditTrail();
        } catch (error) {
            toast.error('Failed to reject resolution');
        } finally {
            setActionLoading(false);
        }
    };

    const handleAcknowledgeRejection = async () => {
        setActionLoading(true);
        try {
            await ticketsApi.acknowledgeRejection(id);
            toast.success('Rejection acknowledged. You can now resume work on this ticket.');
            fetchTicket();
            fetchAuditTrail();
        } catch (error) {
            toast.error('Failed to acknowledge rejection');
        } finally {
            setActionLoading(false);
        }
    };

    const handleEscalate = async () => {
        if (!escalationReason.trim()) {
            toast.error('Please provide a reason for escalation');
            return;
        }
        setActionLoading(true);
        try {
            await ticketsApi.escalate(id, escalationReason.trim());
            toast.success('Ticket escalated successfully');
            setShowEscalateModal(false);
            setEscalationReason('');
            fetchTicket();
            fetchAuditTrail();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to escalate ticket');
        } finally {
            setActionLoading(false);
        }
    };

    const loadEscalationUsers = async () => {
        try {
            const response = await usersApi.getEscalationUsers(ticketSiteId, ticket?.escalationLevel);
            const usersData = response.data.data || [];
            setEscalationUsers(usersData.map(u => ({
                value: u._id,
                label: `${u.fullName} (${u.role})`
            })));
        } catch (error) {
            console.error('Failed to load escalation users', error);
        }
    };

    const handleAcceptEscalation = async (assignedTo = null) => {
        setActionLoading(true);
        try {
            await ticketsApi.acceptEscalation(id, assignedTo ? { assignedTo } : {});
            toast.success(assignedTo ? 'Escalation accepted and assigned' : 'Escalation accepted. You are now assigned.');
            setShowAcceptEscalationModal(false);
            fetchTicket();
            fetchAuditTrail();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to accept escalation');
        } finally {
            setActionLoading(false);
        }
    };

    const getPriorityClass = (priority) => priority ? `priority-${priority.toLowerCase()}` : '';
    const getSLAStatusClass = (status) => status ? `sla-${status.toLowerCase()}` : '';

    const getStatusClass = (status) => {
        switch (status) {
            case 'Open': return 'badge-info';
            case 'Assigned': return 'badge-primary';
            case 'Acknowledged': return 'badge-warning';
            case 'InProgress': return 'badge-primary';
            case 'Escalated': return 'badge-danger';
            case 'Resolved': return 'badge-success';
            case 'Verified': return 'badge-success';
            case 'Closed': return 'badge-secondary';
            case 'Cancelled': return 'badge-secondary';
            case 'ResolutionRejected': return 'badge-danger';
            default: return 'badge-primary';
        }
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
            </div>
        );
    }

    if (!ticket) return null;

    return (
        <div className="ticket-detail-page animate-fade-in">
            <Link to="/tickets" className="back-link">
                <ArrowLeft size={18} />
                Back to Tickets
            </Link>

            <div className="ticket-header">
                <div className="ticket-header-left">
                    <div className="ticket-meta">
                        <span className="ticket-number">{ticket.ticketNumber}</span>
                        <span className={`badge ${getPriorityClass(ticket.priority)}`}>
                            {ticket.priority}
                        </span>
                        <span className={`badge ${getStatusClass(ticket.status)}`}>{ticket.status}</span>
                        <span className={`sla-indicator ${getSLAStatusClass(ticket.slaStatus)}`}>
                            {ticket.slaStatus === 'Breached' && <AlertTriangle size={14} />}
                            {ticket.slaStatus === 'AtRisk' && <Clock size={14} />}
                            SLA: {ticket.slaStatus}
                        </span>
                    </div>
                    <h1 className="page-title">{ticket.title}</h1>
                </div>

                <div className="ticket-actions">
                    {canEdit && ticket.status !== 'Closed' && (
                        <Link to={`/tickets/${id}/edit`} className="btn btn-secondary">
                            <Edit size={18} />
                            Edit
                        </Link>
                    )}

                    {canAssign && (ticket.status === 'Open' || ticket.status === 'Assigned') && (
                        <button className="btn btn-primary" onClick={() => setShowAssignModal(true)}>
                            <UserPlus size={18} />
                            Assign
                        </button>
                    )}

                    {canAcknowledge && ticket.status === 'Assigned' && (
                        <button className="btn btn-success" onClick={handleAcknowledge} disabled={actionLoading}>
                            <CheckCircle size={18} />
                            Acknowledge
                        </button>
                    )}

                    {canResolve && ticket.status === 'Acknowledged' && (
                        <button className="btn btn-primary" onClick={handleStart} disabled={actionLoading}>
                            <Play size={18} />
                            Start Work
                        </button>
                    )}

                    {canResolve && ticket.status === 'InProgress' && (
                        <button className="btn btn-success" onClick={() => setShowResolveModal(true)}>
                            <CheckCircle size={18} />
                            Resolve
                        </button>
                    )}

                    {canRejectResolution && ticket.status === 'Resolved' && (
                        <button className="btn btn-danger" onClick={() => setShowRejectModal(true)} disabled={actionLoading}>
                            <XCircle size={18} />
                            Reject Resolution
                        </button>
                    )}

                    {canEscalate && (
                        <button className="btn btn-warning" onClick={() => setShowEscalateModal(true)}>
                            <AlertTriangle size={18} />
                            Escalate
                        </button>
                    )}

                    {canAcceptEscalation && (
                        <button 
                            className="btn btn-success" 
                            onClick={() => {
                                if (canDelegateEscalation) {
                                    loadEscalationUsers();
                                    setShowAcceptEscalationModal(true);
                                } else {
                                    handleAcceptEscalation();
                                }
                            }}
                            disabled={actionLoading}
                        >
                            <CheckCircle size={18} />
                            {canDelegateEscalation ? 'Manage Escalation' : 'Accept Escalation'}
                        </button>
                    )}

                    {canClose && (ticket.status === 'Resolved' || ticket.status === 'Verified') && (
                        <button className="btn btn-success" onClick={handleClose} disabled={actionLoading}>
                            <CheckCircle size={18} />
                            Verify & Close
                        </button>
                    )}

                    {canAcknowledgeRejection && ticket.status === 'ResolutionRejected' && (
                        <button className="btn btn-warning" onClick={handleAcknowledgeRejection} disabled={actionLoading}>
                            <CheckCircle size={18} />
                            Acknowledge & Resume Work
                        </button>
                    )}

                    {canReopen && ticket.status === 'Closed' && (
                        <button className="btn btn-warning" onClick={() => setShowReopenModal(true)}>
                            <RotateCcw size={18} />
                            Re-open Ticket
                        </button>
                    )}
                </div>
            </div>

            <div className="detail-grid">
                <div className="detail-main">
                    {/* Ticket Information */}
                    <div className="detail-section glass-card">
                        <div className="section-header">
                            <h3 className="section-title">Ticket Information</h3>
                        </div>

                        <div className="detail-row">
                            <span className="detail-label">Category</span>
                            <span className="detail-value">{ticket.category} {ticket.subCategory && `/ ${ticket.subCategory}`}</span>
                        </div>

                        <div className="detail-row">
                            <span className="detail-label">Description</span>
                            <span className="detail-value">{ticket.description || '—'}</span>
                        </div>

                        <div className="detail-row">
                            <span className="detail-label">Impact / Urgency</span>
                            <span className="detail-value">{ticket.impact} / {ticket.urgency} (Score: {ticket.priorityScore})</span>
                        </div>

                        <div className="detail-row">
                            <span className="detail-label">Source</span>
                            <span className="detail-value">{ticket.source}</span>
                        </div>

                        {ticket.tags && (
                            <div className="detail-row">
                                <span className="detail-label">Tags</span>
                                <span className="detail-value">{ticket.tags}</span>
                            </div>
                        )}
                    </div>

                    {/* Asset Information */}
                    {ticket.assetId && (
                        <div className="detail-section glass-card">
                            <div className="section-header">
                                <h3 className="section-title">Asset Information</h3>
                            </div>

                            <div className="detail-row">
                                <span className="detail-label">Asset Code</span>
                                <span className="detail-value">{ticket.assetCode}</span>
                            </div>

                            <div className="detail-row">
                                <span className="detail-label">Asset Type</span>
                                <span className="detail-value">{ticket.assetType}</span>
                            </div>

                            <div className="detail-row">
                                <span className="detail-label">Site</span>
                                <span className="detail-value">{ticket.siteName}</span>
                            </div>
                        </div>
                    )}

                    {/* RMA Information */}
                    {ticket.assetId && (
                        <RMASection 
                            ticketId={ticket.ticketId} 
                            siteId={ticket.siteId}
                            assetId={ticket.assetId?._id || ticket.assetId} // Correctly pass asset ID
                            ticketStatus={ticket.status}
                            isLocked={['Resolved', 'Verified', 'Closed', 'Cancelled'].includes(ticket.status)}
                            onUpdate={() => {
                                fetchTicket();
                                fetchAuditTrail();
                            }}
                        />
                    )}

                    {/* Asset Update Approval */}
                    {ticket.ticketId && (
                        <AssetUpdateApproval 
                            ticketId={ticket.ticketId}
                            onUpdate={() => {
                                fetchTicket();
                                fetchAuditTrail();
                            }}
                        />
                    )}

                    {/* Resolution */}
                    {ticket.resolutionSummary && (
                        <div className="detail-section glass-card">
                            <div className="section-header">
                                <h3 className="section-title">Resolution</h3>
                            </div>

                            <div className="detail-row">
                                <span className="detail-label">Root Cause</span>
                                <span className="detail-value">{ticket.rootCause}</span>
                            </div>

                            <div className="detail-row">
                                <span className="detail-label">Resolution</span>
                                <span className="detail-value">{ticket.resolutionSummary}</span>
                            </div>

                            {ticket.resolvedOn && (
                                <div className="detail-row">
                                    <span className="detail-label">Resolved On</span>
                                    <span className="detail-value">{format(new Date(ticket.resolvedOn), 'PPpp')}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="detail-sidebar">
                    {/* SLA & Timeline */}
                    <div className="detail-section glass-card compact-section">
                        <div className="section-header">
                            <h3 className="section-title">SLA & Timeline</h3>
                        </div>

                        <div className="detail-row">
                            <span className="detail-label">Created</span>
                            <span className="detail-value">{format(new Date(ticket.createdOn), 'PPpp')}</span>
                        </div>

                        <div className="detail-row">
                            <span className="detail-label">Created By</span>
                            <span className="detail-value">{ticket.createdByName}</span>
                        </div>

                        <div className="detail-row">
                            <span className="detail-label">Assigned To</span>
                            <span className="detail-value">{ticket.assignedToName || '—'}</span>
                        </div>

                        {ticket.slaResponseDue && (
                            <div className="detail-row">
                                <span className="detail-label">Response Due</span>
                                <span className={`detail-value ${ticket.isSLAResponseBreached ? 'text-danger' : ''}`}>
                                    {format(new Date(ticket.slaResponseDue), 'PPpp')}
                                    {ticket.isSLAResponseBreached && ' (Breached)'}
                                </span>
                            </div>
                        )}

                        {ticket.slaRestoreDue && (
                            <div className="detail-row">
                                <span className="detail-label">Restore Due</span>
                                <span className={`detail-value ${ticket.isSLARestoreBreached ? 'text-danger' : ''}`}>
                                    {format(new Date(ticket.slaRestoreDue), 'PPpp')}
                                    {ticket.isSLARestoreBreached && ' (Breached)'}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Audit Trail - Compact */}
                    <div className="detail-section glass-card compact-section">
                        <div className="section-header">
                            <h3 className="section-title">
                                <History size={16} />
                                History
                            </h3>
                        </div>

                        <div className="audit-timeline compact">
                            {auditTrail.slice(0, 5).map((audit) => (
                                <div key={audit.auditId} className="audit-item">
                                    <div className="audit-icon">
                                        <FileText size={12} />
                                    </div>
                                    <div className="audit-content">
                                        <div className="audit-action">{audit.action}</div>
                                        <div className="audit-details">
                                            {audit.newValue && `${audit.oldValue ? audit.oldValue + ' → ' : ''}${audit.newValue}`}
                                        </div>
                                        {audit.remarks && (
                                            <div className="audit-remarks">{audit.remarks}</div>
                                        )}
                                    </div>
                                    <div className="audit-time">
                                        {format(new Date(audit.performedOn), 'MMM dd, HH:mm')}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Activity Section - Right Side */}
                <div className="detail-activity">
                    <ActivitySection ticketId={id} ticketStatus={ticket.status} />
                </div>
            </div>

            {/* Assign Modal */}
            {showAssignModal && (
                <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
                    <div className="modal glass-card" onClick={(e) => e.stopPropagation()}>
                        <h3>Assign Ticket</h3>
                        <div className="form-group">
                            <label className="form-label">Select Engineer</label>
                            <select
                                className="form-select"
                                value={assignData.assignedTo}
                                onChange={(e) => setAssignData({ ...assignData, assignedTo: e.target.value })}
                            >
                                <option value="">Choose engineer...</option>
                                {engineers.map((eng) => (
                                    <option key={eng.value} value={eng.value}>{eng.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Remarks (optional)</label>
                            <textarea
                                className="form-textarea"
                                value={assignData.remarks}
                                onChange={(e) => setAssignData({ ...assignData, remarks: e.target.value })}
                                placeholder="Add any notes..."
                            />
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-ghost" onClick={() => setShowAssignModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleAssign} disabled={actionLoading}>
                                {actionLoading ? 'Assigning...' : 'Assign'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Resolve Modal */}
            {showResolveModal && (
                <div className="modal-overlay" onClick={() => setShowResolveModal(false)}>
                    <div className="modal glass-card" onClick={(e) => e.stopPropagation()}>
                        <h3>Resolve Ticket</h3>
                        <div className="form-group">
                            <label className="form-label">Root Cause *</label>
                            <input
                                type="text"
                                className="form-input"
                                value={resolveData.rootCause}
                                onChange={(e) => setResolveData({ ...resolveData, rootCause: e.target.value })}
                                placeholder="What caused the issue?"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Resolution Summary *</label>
                            <textarea
                                className="form-textarea"
                                value={resolveData.resolutionSummary}
                                onChange={(e) => setResolveData({ ...resolveData, resolutionSummary: e.target.value })}
                                placeholder="Describe how the issue was resolved..."
                            />
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-ghost" onClick={() => setShowResolveModal(false)}>Cancel</button>
                            <button className="btn btn-success" onClick={handleResolve} disabled={actionLoading}>
                                {actionLoading ? 'Resolving...' : 'Resolve Ticket'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Re-open Modal */}
            {showReopenModal && (
                <div className="modal-overlay" onClick={() => setShowReopenModal(false)}>
                    <div className="modal glass-card" onClick={(e) => e.stopPropagation()}>
                        <h3>Re-open Ticket</h3>
                        <p className="modal-description">
                            This ticket is currently closed. Provide a reason to re-open it for further action.
                        </p>
                        <div className="form-group">
                            <label className="form-label">Reason for Re-opening *</label>
                            <textarea
                                className="form-textarea"
                                value={reopenReason}
                                onChange={(e) => setReopenReason(e.target.value)}
                                placeholder="Why does this ticket need to be re-opened?"
                                rows={3}
                            />
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-ghost" onClick={() => setShowReopenModal(false)}>Cancel</button>
                            <button className="btn btn-warning" onClick={handleReopen} disabled={actionLoading}>
                                {actionLoading ? 'Re-opening...' : 'Re-open Ticket'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Resolution Modal */}
            {showRejectModal && (
                <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
                    <div className="modal glass-card" onClick={(e) => e.stopPropagation()}>
                        <h3>Reject Resolution</h3>
                        <p className="modal-description">
                            The issue is still ongoing. Rejecting the resolution will notify the assigned user
                            to reinvestigate and provide an update.
                        </p>
                        <div className="form-group">
                            <label className="form-label">Reason for Rejection *</label>
                            <textarea
                                className="form-textarea"
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="Explain why the resolution is being rejected and what needs to be investigated..."
                                rows={4}
                            />
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-ghost" onClick={() => setShowRejectModal(false)}>Cancel</button>
                            <button className="btn btn-danger" onClick={handleRejectResolution} disabled={actionLoading}>
                                {actionLoading ? 'Rejecting...' : 'Reject Resolution'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Escalate Modal */}
            {showEscalateModal && (
                <div className="modal-overlay" onClick={() => setShowEscalateModal(false)}>
                    <div className="modal glass-card" onClick={(e) => e.stopPropagation()}>
                        <h3>Escalate Ticket</h3>
                        <p className="modal-description">
                            Escalating this ticket will notify the specialized Escalation Team. 
                            Please provide a clear reason describing why this issue requires higher-level expertise.
                        </p>
                        <div className="form-group">
                            <label className="form-label">Reason for Escalation *</label>
                            <textarea
                                className="form-textarea"
                                value={escalationReason}
                                onChange={(e) => setEscalationReason(e.target.value)}
                                placeholder="Describe the technical complexity or roadblock requiring escalation..."
                                rows={4}
                            />
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-ghost" onClick={() => setShowEscalateModal(false)}>Cancel</button>
                            <button className="btn btn-warning" onClick={handleEscalate} disabled={actionLoading}>
                                {actionLoading ? 'Escalating...' : `Escalate to Level ${(ticket?.escalationLevel || 0) + 1}`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Accept Escalation Modal */}
            {showAcceptEscalationModal && (
                <div className="modal-overlay" onClick={() => setShowAcceptEscalationModal(false)}>
                    <div className="modal glass-card" onClick={(e) => e.stopPropagation()}>
                        <h3>Manage Escalation (Level {ticket?.escalationLevel})</h3>
                        <p className="modal-description">
                            You can either accept this escalated ticket yourself or assign it to a specialized escalation user.
                        </p>
                        
                        <div className="escalation-options">
                            <div className="option-section">
                                <h4>Option 1: Work on it yourself</h4>
                                <button 
                                    className="btn btn-primary w-full" 
                                    onClick={() => handleAcceptEscalation()}
                                    disabled={actionLoading}
                                >
                                    Accept & Start Working
                                </button>
                            </div>

                            {canDelegateEscalation && (
                                <>
                                    <div className="option-divider">
                                        <span>OR</span>
                                    </div>

                                    <div className="option-section">
                                        <h4>Option 2: Assign to escalation user</h4>
                                        <div className="form-group">
                                            <label className="form-label">Select Escalation User</label>
                                            <select
                                                className="form-select"
                                                value={selectedEscalationUser}
                                                onChange={(e) => setSelectedEscalationUser(e.target.value)}
                                            >
                                                <option value="">Choose user...</option>
                                                {escalationUsers.map((u) => (
                                                    <option key={u.value} value={u.value}>{u.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <button 
                                            className="btn btn-success w-full" 
                                            onClick={() => handleAcceptEscalation(selectedEscalationUser)}
                                            disabled={actionLoading || !selectedEscalationUser}
                                        >
                                            Assign & Acknowledge
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="modal-actions mt-4">
                            <button className="btn btn-ghost" onClick={() => setShowAcceptEscalationModal(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
