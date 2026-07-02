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
    Tag,
    Info,
    Activity,
    Database,
    Building2,
    Calendar,
    User,
    Shield,
    Package,
    Hash,
    Cpu,
    MapPin,
} from 'lucide-react';
import { ticketsApi, usersApi } from '../../services/api';
import socketService from '../../services/socket';
import useAuthStore from '../../context/authStore';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import ActivitySection from './ActivitySection';
import RMASection from './RMASection';
import TicketStockPanel from './TicketStockPanel';
import TicketCablePanel from './TicketCablePanel';
import AssetUpdateApproval from './AssetUpdateApproval';
import { createPortal } from 'react-dom';
import './Tickets.css';

const Modal = ({ icon: Icon, title, onClose, footer, children }) => createPortal(
    <div className="modal-overlay animate-fade-in" onClick={onClose}>
        <div className="modal glass-card animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
                <h3 className="flex items-center gap-2">
                    {Icon && <Icon size={16} />}
                    {title}
                </h3>
            </div>
            <div className="modal-body">{children}</div>
            <div className="modal-footer">{footer}</div>
        </div>
    </div>,
    document.body
);

const safeFormatDate = (date, formatStr) => {
    try {
        if (!date) return '-';
        const d = new Date(date);
        if (isNaN(d.getTime())) return '-';
        return format(d, formatStr);
    } catch (e) {
        return '-';
    }
};

export default function TicketDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, hasRole, hasRight } = useAuthStore();
    const isSiteClient = hasRole('SiteClient');
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
    const [showRequestExtensionModal, setShowRequestExtensionModal] = useState(false);
    const [extensionReason, setExtensionReason] = useState('');
    const [showReviewExtensionModal, setShowReviewExtensionModal] = useState(false);
    const [newSlaDateTime, setNewSlaDateTime] = useState('');
    const [extensionRejectionReason, setExtensionRejectionReason] = useState('');

    const FINAL_STATUSES = ['Resolved', 'Verified', 'Closed', 'Cancelled'];
    const isLocked = ['InProgress', 'OnHold', 'Installed', 'Repaired', 'Replaced', 'SentToSite', 'Resolved', 'ResolutionRejected', 'Verified', 'Closed', 'Cancelled'].includes(ticket?.status);
    const CABLE_KEYWORDS = ['fibre', 'fiber', 'cable cut', 'cable damage', 'cable'];
    const isCableCutTicket = ticket && CABLE_KEYWORDS.some(kw => (ticket.subCategory || '').toLowerCase().includes(kw));
    // Get the site ID from the ticket directly or via asset
    const ticketSiteId = ticket?.siteId?._id || ticket?.siteId || ticket?.assetId?.siteId?._id || ticket?.assetId?.siteId;
    const canEdit = (hasRole(['Admin', 'Supervisor', 'Dispatcher']) || hasRight('EDIT_TICKET', ticketSiteId)) && !isLocked;

    // Compare using string IDs for MongoDB - must be declared BEFORE canAssign
    const assignedToId = typeof ticket?.assignedTo === 'object' ? ticket?.assignedTo?._id : ticket?.assignedTo;
    const isAssignedToMe = assignedToId && assignedToId === user?.userId;
    const isAdmin = hasRole('Admin');

    // Only Admin/Supervisor/Dispatcher can assign tickets via the Assign button
    const canAssign = hasRole(['Admin', 'Supervisor', 'Dispatcher']);
    // The current assignee (e.g. L1 engineer) can reassign their own ticket
    const canReassign = isAssignedToMe && !hasRole(['Admin', 'Supervisor', 'Dispatcher']);

    // Any user assigned to the ticket can acknowledge
    const canAcknowledge = isAssignedToMe;
    const canRejectResolution = hasRole(['Admin', 'Supervisor', 'Dispatcher']) || hasRight('EDIT_TICKET', ticketSiteId);
    const canAcknowledgeRejection = isAssignedToMe;
    const canReopen = hasRole(['Admin', 'Supervisor', 'Dispatcher']) || hasRight('EDIT_TICKET', ticketSiteId) || hasRight('CREATE_TICKET', ticketSiteId);

    // Escalation-specific logic: If escalation is accepted, only the escalation user (current assignee) and Admin can resolve/close
    const isEscalationAccepted = !!ticket?.escalationAcceptedBy;

    // RMA state helpers
    const hasActiveRma = !!(ticket?.rmaId || ticket?.rmaNumber) && !ticket?.rmaFinalized;
    const isRmaCompleted = !!(ticket?.rmaId || ticket?.rmaNumber) && (ticket?.rmaFinalized === true || ticket?.rmaVerified === true);

    const canResolve = (isAdmin || isAssignedToMe || (isEscalationAccepted
        ? false
        : hasRole(['L1Engineer', 'L2Engineer', 'Supervisor'])))
        && (!ticket?.rmaNumber || ticket?.rmaVerified || ticket?.rmaFinalized);
    const canClose = isAdmin || hasRole(['Supervisor', 'Dispatcher']) || (isEscalationAccepted ? isAssignedToMe : hasRight('DELETE_TICKET', ticketSiteId));
    const canEscalate = ticket?.escalationLevel < 3 && ticket?.status !== 'Escalated' && !FINAL_STATUSES.includes(ticket?.status) && (isAssignedToMe || hasRole(['Admin', 'Supervisor', 'Dispatcher']));
    const canAcceptEscalation = ticket?.status === 'Escalated' && (
        hasRole(['Admin', 'Supervisor', 'Dispatcher']) ||
        (ticket?.escalationLevel === 1 && (hasRight('ESCALATION_L1', ticketSiteId) || hasRight('ESCALATION_L2', ticketSiteId) || hasRight('ESCALATION_L3', ticketSiteId))) ||
        (ticket?.escalationLevel === 2 && (hasRight('ESCALATION_L2', ticketSiteId) || hasRight('ESCALATION_L3', ticketSiteId))) ||
        (ticket?.escalationLevel === 3 && hasRight('ESCALATION_L3', ticketSiteId))
    );
    const canDelegateEscalation = hasRole(['Admin', 'Supervisor', 'Dispatcher']);

    // SLA extension: requestable by the assignee or management once breached; reviewable by Admin/Supervisor
    const canRequestSlaExtension = (isAssignedToMe || hasRole(['Admin', 'Supervisor', 'Dispatcher']))
        && ticket?.isSLARestoreBreached && ticket?.slaExtension?.status !== 'Pending' && !FINAL_STATUSES.includes(ticket?.status);
    const canReviewSlaExtension = hasRole(['Admin', 'Supervisor']) && ticket?.slaExtension?.status === 'Pending';

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
                serialNumber: ticketData.assetId?.serialNumber || ticketData.serialNumber,
                mac: ticketData.assetId?.mac || ticketData.mac,
                locationName: ticketData.assetId?.locationName || ticketData.locationName,
                siteName: ticketData.siteId?.siteName || ticketData.assetId?.siteId?.siteName || ticketData.siteName,
                siteId: ticketData.siteId?._id || ticketData.siteId || ticketData.assetId?.siteId?._id || ticketData.assetId?.siteId,
                createdByName: ticketData.createdBy?.fullName || ticketData.createdByName,
                assignedToName: ticketData.assignedTo?.fullName || ticketData.assignedToName,
                assignedTo: typeof ticketData.assignedTo === 'object' ? ticketData.assignedTo?._id : ticketData.assignedTo,
                slaStatus: (() => {
                    const restoreDue = ticketData.slaRestoreDue ? new Date(ticketData.slaRestoreDue) : null;
                    const now = new Date();
                    if (ticketData.isSLARestoreBreached || (restoreDue && restoreDue < now)) return 'Breached';
                    if (ticketData.isSLAResponseBreached || (restoreDue && restoreDue < new Date(now.getTime() + 4 * 60 * 60 * 1000))) return 'AtRisk';
                    return 'OnTrack';
                })()
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
            const response = await usersApi.getDropdown();
            const userData = response.data.data || response.data || [];
            setEngineers(userData.map(e => ({
                value: e._id || e.value || e.userId,
                label: `${e.fullName || e.label}${e.role ? ` (${e.role})` : ''}`
            })));
        } catch (error) {
            console.error('Failed to load employees', error);
        }
    };

    // Shared runner for ticket actions: handles loading state, success/error toasts, and refresh.
    const runAction = async (apiCall, { successMsg, errorMsg, onSuccess, useServerError } = {}) => {
        setActionLoading(true);
        try {
            await apiCall();
            toast.success(successMsg);
            onSuccess?.();
            fetchTicket();
            fetchAuditTrail();
        } catch (error) {
            toast.error(useServerError ? (error.response?.data?.message || errorMsg) : errorMsg);
        } finally {
            setActionLoading(false);
        }
    };

    const handleAssign = () => {
        if (!assignData.assignedTo) return toast.error('Please select an employee');
        runAction(() => ticketsApi.assign(id, assignData), {
            successMsg: 'Ticket assigned successfully',
            errorMsg: 'Failed to assign ticket',
            onSuccess: () => setShowAssignModal(false)
        });
    };

    const handleAcknowledge = () => runAction(() => ticketsApi.acknowledge(id), {
        successMsg: 'Ticket acknowledged',
        errorMsg: 'Failed to acknowledge ticket'
    });

    const handleStart = () => runAction(() => ticketsApi.start(id), {
        successMsg: 'Work started on ticket',
        errorMsg: 'Failed to start ticket'
    });

    const handleResolve = () => {
        if (!resolveData.rootCause || !resolveData.resolutionSummary) return toast.error('Please fill in root cause and resolution');
        runAction(() => ticketsApi.resolve(id, resolveData), {
            successMsg: 'Ticket resolved',
            errorMsg: 'Failed to resolve ticket',
            onSuccess: () => setShowResolveModal(false)
        });
    };

    const handleClose = () => runAction(() => ticketsApi.close(id, {}), {
        successMsg: 'Ticket closed',
        errorMsg: 'Failed to close ticket'
    });

    const handleReopen = () => {
        if (!reopenReason.trim()) return toast.error('Please provide a reason for reopening');
        runAction(() => ticketsApi.reopen(id, reopenReason.trim()), {
            successMsg: 'Ticket reopened',
            errorMsg: 'Failed to reopen ticket',
            onSuccess: () => { setShowReopenModal(false); setReopenReason(''); }
        });
    };

    const handleRejectResolution = () => {
        if (!rejectReason.trim()) return toast.error('Please provide a reason for rejecting the resolution');
        runAction(() => ticketsApi.rejectResolution(id, rejectReason.trim()), {
            successMsg: 'Resolution rejected. The assigned user has been notified.',
            errorMsg: 'Failed to reject resolution',
            onSuccess: () => { setShowRejectModal(false); setRejectReason(''); }
        });
    };

    const handleAcknowledgeRejection = () => runAction(() => ticketsApi.acknowledgeRejection(id), {
        successMsg: 'Rejection acknowledged. You can now resume work on this ticket.',
        errorMsg: 'Failed to acknowledge rejection'
    });

    const handleEscalate = () => {
        if (!escalationReason.trim()) return toast.error('Please provide a reason for escalation');
        runAction(() => ticketsApi.escalate(id, { reason: escalationReason.trim(), assignedTo: selectedEscalationUser }), {
            successMsg: 'Ticket escalated successfully',
            errorMsg: 'Failed to escalate ticket',
            useServerError: true,
            onSuccess: () => { setShowEscalateModal(false); setEscalationReason(''); setSelectedEscalationUser(''); }
        });
    };

    const loadEscalationUsers = async (level = null) => {
        try {
            const targetLevel = level || (ticket?.escalationLevel || 0) + 1;
            const response = await usersApi.getEscalationUsers(ticketSiteId, targetLevel);
            const usersData = response.data.data || [];
            setEscalationUsers(usersData.map(u => ({
                value: u._id,
                label: `${u.fullName} (${u.role})`
            })));
        } catch (error) {
            console.error('Failed to load escalation users', error);
        }
    };

    const handleAcceptEscalation = (assignedTo = null) => runAction(
        () => ticketsApi.acceptEscalation(id, assignedTo ? { assignedTo } : {}),
        {
            successMsg: assignedTo ? 'Escalation accepted and assigned' : 'Escalation accepted. You are now assigned.',
            errorMsg: 'Failed to accept escalation',
            useServerError: true,
            onSuccess: () => setShowAcceptEscalationModal(false)
        }
    );

    const handleRequestSlaExtension = () => {
        if (!extensionReason.trim()) return toast.error('Please provide a reason for the delay');
        runAction(() => ticketsApi.requestSlaExtension(id, extensionReason.trim()), {
            successMsg: 'SLA extension request submitted',
            errorMsg: 'Failed to submit SLA extension request',
            useServerError: true,
            onSuccess: () => { setShowRequestExtensionModal(false); setExtensionReason(''); }
        });
    };

    const handleApproveSlaExtension = () => {
        if (!newSlaDateTime) return toast.error('Please select a new SLA deadline');
        runAction(() => ticketsApi.approveSlaExtension(id, new Date(newSlaDateTime).toISOString()), {
            successMsg: 'SLA extension approved',
            errorMsg: 'Failed to approve SLA extension',
            useServerError: true,
            onSuccess: () => { setShowReviewExtensionModal(false); setNewSlaDateTime(''); }
        });
    };

    const handleRejectSlaExtension = () => {
        if (!extensionRejectionReason.trim()) return toast.error('Please provide a reason for rejecting the request');
        runAction(() => ticketsApi.rejectSlaExtension(id, extensionRejectionReason.trim()), {
            successMsg: 'SLA extension rejected',
            errorMsg: 'Failed to reject SLA extension',
            useServerError: true,
            onSuccess: () => { setShowReviewExtensionModal(false); setExtensionRejectionReason(''); }
        });
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
            case 'Installed': return 'badge-success';
            case 'Repaired': return 'badge-success';
            case 'Replaced': return 'badge-info';
            case 'SentToSite': return 'badge-warning';
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
            <div className="ticket-header">
                <div className="ticket-header-left">
                    <div className="ticket-meta">
                        <span className="ticket-number">{ticket.ticketNumber}</span>
                        <span className={`badge ${getPriorityClass(ticket.priority)}`}>
                            {ticket.priority}
                        </span>
                        <span className={`badge ${getStatusClass(ticket.status)}`}>{ticket.status}</span>
                        {ticket.rmaNumber && (
                            <span className="badge badge-outline border-primary-500 text-primary-500 flex items-center gap-1">
                                <Package size={12} />
                                {ticket.rmaNumber}
                            </span>
                        )}
                        {hasActiveRma ? (
                            <span className="sla-indicator sla-ontrack" style={{ opacity: 0.8 }}>
                                <Clock size={14} />
                                TAT Paused (RMA)
                            </span>
                        ) : (
                            <span className={`sla-indicator ${getSLAStatusClass(ticket.slaStatus)}`}>
                                {ticket.slaStatus === 'Breached' && <AlertTriangle size={14} />}
                                {ticket.slaStatus === 'AtRisk' && <Clock size={14} />}
                                SLA: {ticket.slaStatus}
                            </span>
                        )}
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

                    {/* Admin/Supervisor/Dispatcher: Assign any ticket */}
                    {canAssign && (ticket.status === 'Open' || ticket.status === 'Assigned') && (
                        <button className="btn btn-primary" onClick={() => setShowAssignModal(true)}>
                            <UserPlus size={14} />
                            Assign
                        </button>
                    )}

                    {/* Current assignee (non-admin): Reassign their own ticket */}
                    {canReassign && ticket.status === 'Assigned' && (
                        <button className="btn btn-secondary" onClick={() => setShowAssignModal(true)}>
                            <UserPlus size={14} />
                            Reassign
                        </button>
                    )}

                    {canAcknowledge && ticket.status === 'Assigned' && (
                        <button className="btn btn-success" onClick={handleAcknowledge} disabled={actionLoading}>
                            <CheckCircle size={14} />
                            Acknowledge
                        </button>
                    )}

                    {canResolve && ticket.status === 'Acknowledged' && (
                        <button className="btn btn-primary" onClick={handleStart} disabled={actionLoading}>
                            <Play size={14} />
                            Start Work
                        </button>
                    )}

                    {canResolve && (['InProgress', 'Installed', 'Repaired', 'Replaced'].includes(ticket.status) || (isRmaCompleted && !FINAL_STATUSES.includes(ticket.status))) && (
                        <button className="btn btn-success" onClick={() => setShowResolveModal(true)}>
                            <CheckCircle size={14} />
                            Resolve
                        </button>
                    )}

                    {canRejectResolution && ticket.status === 'Resolved' && (
                        <button className="btn btn-danger" onClick={() => setShowRejectModal(true)} disabled={actionLoading}>
                            <XCircle size={14} />
                            Reject Resolution
                        </button>
                    )}

                    {canEscalate && (
                        <button
                            className="btn btn-warning"
                            onClick={() => {
                                loadEscalationUsers();
                                setShowEscalateModal(true);
                            }}
                        >
                            <AlertTriangle size={14} />
                            Escalate
                        </button>
                    )}

                    {canRequestSlaExtension && (
                        <button className="btn btn-warning" onClick={() => setShowRequestExtensionModal(true)}>
                            <Clock size={14} />
                            Request SLA Extension
                        </button>
                    )}

                    {canReviewSlaExtension && (
                        <button className="btn btn-warning" onClick={() => setShowReviewExtensionModal(true)}>
                            <AlertTriangle size={14} />
                            Review Extension Request
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
                            <CheckCircle size={14} />
                            {canDelegateEscalation ? 'Manage Escalation' : 'Accept Escalation'}
                        </button>
                    )}

                    {canClose && (ticket.status === 'Resolved' || ticket.status === 'Verified') && (
                        <button className="btn btn-success" onClick={handleClose} disabled={actionLoading}>
                            <CheckCircle size={14} />
                            Verify & Close
                        </button>
                    )}

                    {/* Admin can close directly when RMA is completed */}
                    {canClose && isRmaCompleted && !FINAL_STATUSES.includes(ticket.status) && (
                        <button className="btn btn-success" onClick={handleClose} disabled={actionLoading}>
                            <CheckCircle size={14} />
                            Close Ticket
                        </button>
                    )}

                    {canAcknowledgeRejection && ticket.status === 'ResolutionRejected' && (
                        <button className="btn btn-warning" onClick={handleAcknowledgeRejection} disabled={actionLoading}>
                            <CheckCircle size={14} />
                            Acknowledge & Resume Work
                        </button>
                    )}

                    {canReopen && ticket.status === 'Closed' && (
                        <button className="btn btn-warning" onClick={() => setShowReopenModal(true)}>
                            <RotateCcw size={14} />
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
                            <span className="detail-label">
                                <Tag size={12} />
                                Category
                            </span>
                            <span className="detail-value">{ticket.category} {ticket.subCategory && `/ ${ticket.subCategory}`}</span>
                        </div>

                        <div className="detail-row">
                            <span className="detail-label">
                                <Info size={12} />
                                Description
                            </span>
                            <span className="detail-value">{ticket.description || '-'}</span>
                        </div>

                        {/* Impact/Urgency and Source - Hidden for SiteClient */}
                        {!isSiteClient && (
                            <>
                                <div className="detail-row">
                                    <span className="detail-label">
                                        <Activity size={12} />
                                        Impact / Urgency
                                    </span>
                                    <span className="detail-value">{ticket.impact} / {ticket.urgency} (Score: {ticket.priorityScore})</span>
                                </div>

                                <div className="detail-row">
                                    <span className="detail-label">
                                        <Database size={12} />
                                        Source
                                    </span>
                                    <span className="detail-value">{ticket.source}</span>
                                </div>

                                {ticket.tags && (
                                    <div className="detail-row">
                                        <span className="detail-label">Tags</span>
                                        <span className="detail-value">{ticket.tags}</span>
                                    </div>
                                )}
                            </>
                        )}

                        <div className="detail-row">
                            <span className="detail-label">
                                <Building2 size={12} />
                                Site
                            </span>
                            <span className="detail-value">{ticket.siteName || '-'}</span>
                        </div>

                        <div className="detail-row">
                            <span className="detail-label">
                                <MapPin size={12} />
                                Location
                            </span>
                            <span className="detail-value">{ticket.locationName || '-'}</span>
                        </div>
                    </div>

                    {/* Asset Information, Stock, RMA, Asset Update - Hidden for SiteClient */}
                    {!isSiteClient && (
                        <>
                            {/* Asset Information */}
                            {ticket.assetId && (
                                <div className="detail-section glass-card">
                                    <div className="section-header">
                                        <h3 className="section-title">Asset Information</h3>
                                    </div>

                                    <div className="detail-row">
                                        <span className="detail-label">
                                            <Tag size={12} />
                                            Asset Code
                                        </span>
                                        <span className="detail-value font-bold text-primary-500">{ticket.assetId?.assetCode || ticket.assetCode}</span>
                                    </div>

                                    <div className="detail-row">
                                        <span className="detail-label">
                                            <MapPin size={12} />
                                            Location Name
                                        </span>
                                        <span className="detail-value">{ticket.assetId?.locationName || ticket.locationName || '-'}</span>
                                    </div>

                                    <div className="detail-row">
                                        <span className="detail-label">
                                            <Cpu size={12} />
                                            MAC Address
                                        </span>
                                        <span className="detail-value font-mono">{ticket.assetId?.mac || '-'}</span>
                                    </div>

                                    <div className="detail-row">
                                        <span className="detail-label">
                                            <Activity size={12} />
                                            Serial Number
                                        </span>
                                        <span className="detail-value font-mono">{ticket.assetId?.serialNumber || '-'}</span>
                                    </div>

                                    <div className="detail-row">
                                        <span className="detail-label">
                                            <Database size={12} />
                                            Asset Type
                                        </span>
                                        <span className="detail-value">{ticket.assetId?.assetType || ticket.assetType}</span>
                                    </div>


                                </div>
                            )}

                            {/* Stock Availability & Replacement */}
                            {ticket.assetId && (
                                <TicketStockPanel
                                    ticketId={ticket.ticketId}
                                    siteId={ticketSiteId}
                                    assetId={ticket.assetId?._id || ticket.assetId}
                                    ticketStatus={ticket.status}
                                    isLocked={FINAL_STATUSES.includes(ticket.status)}
                                    onUpdate={() => {
                                        fetchTicket();
                                        fetchAuditTrail();
                                    }}
                                />
                            )}

                            {/* Cable / Wire Usage Panel */}
                            {isCableCutTicket && (
                                <TicketCablePanel
                                    ticketId={ticket.ticketId}
                                    siteId={ticketSiteId}
                                    ticketStatus={ticket.status}
                                    isLocked={FINAL_STATUSES.includes(ticket.status)}
                                    onUpdate={() => {
                                        fetchTicket();
                                        fetchAuditTrail();
                                    }}
                                />
                            )}

                            {/* RMA Information */}
                            {ticket.assetId && (
                                <RMASection
                                    ticketId={ticket.ticketId}
                                    siteId={ticketSiteId}
                                    assetId={ticket.assetId?._id || ticket.assetId}
                                    ticketStatus={ticket.status}
                                    isLocked={FINAL_STATUSES.includes(ticket.status)}
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
                        </>
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
                                    <span className="detail-value">{safeFormatDate(ticket.resolvedOn, 'PPpp')}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="detail-sidebar">
                    {/* SLA & Timeline */}
                    <div className="detail-section glass-card compact-section">
                        <div className="section-header">
                            <h3 className="section-title">
                                <Clock size={12} />
                                SLA & Milestone Tracker
                            </h3>
                        </div>

                        <div className="sla-timeline">
                            {/* Milestone 1: Creation */}
                            <div className="timeline-milestone active">
                                <div className="milestone-dot">
                                    <CheckCircle size={14} />
                                </div>
                                <div className="milestone-content">
                                    <div className="milestone-label">Ticket Created</div>
                                    <div className="milestone-time">{safeFormatDate(ticket.createdOn, 'PPpp')}</div>
                                </div>
                            </div>

                            {/* Milestone 2: Acknowledged */}
                            {ticket.acknowledgedOn && (
                                <div className="timeline-milestone active">
                                    <div className="milestone-dot">
                                        <CheckCircle size={14} />
                                    </div>
                                    <div className="milestone-content">
                                        <div className="milestone-label">Acknowledged</div>
                                        <div className="milestone-time">{safeFormatDate(ticket.acknowledgedOn, 'PPpp')}</div>
                                    </div>
                                </div>
                            )}

                            {/* Target: Response Due */}
                            {!ticket.acknowledgedOn && (
                                <div className={`timeline-milestone ${ticket.isSLAResponseBreached ? 'breached' : 'active'}`}>
                                    <div className="milestone-dot">
                                        <Clock size={14} />
                                    </div>
                                    <div className="milestone-content">
                                        <div className="milestone-label">
                                            Response Target
                                            {ticket.isSLAResponseBreached && <span className="badge badge-danger milestone-status">Breached</span>}
                                        </div>
                                        <div className="milestone-time">
                                            {ticket.slaResponseDue ? safeFormatDate(ticket.slaResponseDue, 'PPpp') : 'No Target Set'}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Milestone 3: Started */}
                            {ticket.startedOn && (
                                <div className="timeline-milestone active">
                                    <div className="milestone-dot">
                                        <CheckCircle size={14} />
                                    </div>
                                    <div className="milestone-content">
                                        <div className="milestone-label">Work Started</div>
                                        <div className="milestone-time">{safeFormatDate(ticket.startedOn, 'PPpp')}</div>
                                    </div>
                                </div>
                            )}

                            {/* Milestone 4: Resolved */}
                            {ticket.resolvedOn && (
                                <div className="timeline-milestone active">
                                    <div className="milestone-dot">
                                        <CheckCircle size={14} />
                                    </div>
                                    <div className="milestone-content">
                                        <div className="milestone-label">Resolved</div>
                                        <div className="milestone-time">{safeFormatDate(ticket.resolvedOn, 'PPpp')}</div>
                                    </div>
                                </div>
                            )}

                            {/* Target: Resolution Due */}
                            {!ticket.resolvedOn && (
                                <div className={`timeline-milestone ${ticket.isSLARestoreBreached ? 'breached' : (ticket.status === 'InProgress' ? 'active' : '')}`}>
                                    <div className="milestone-dot">
                                        <AlertTriangle size={14} />
                                    </div>
                                    <div className="milestone-content">
                                        <div className="milestone-label">
                                            Resolution Target
                                            {ticket.isSLARestoreBreached && <span className="badge badge-danger milestone-status">Breached</span>}
                                        </div>
                                        <div className="milestone-time">
                                            {ticket.slaRestoreDue ? safeFormatDate(ticket.slaRestoreDue, 'PPpp') : 'No Target Set'}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* RMA Active - TAT Paused Indicator */}
                        {hasActiveRma && (
                            <div className="timeline-milestone" style={{
                                background: 'rgba(245, 158, 11, 0.08)',
                                border: '1px solid rgba(245, 158, 11, 0.2)',
                                borderRadius: 'var(--radius-lg)',
                                padding: 'var(--space-2) var(--space-3)',
                                marginTop: 'var(--space-2)'
                            }}>
                                <div className="milestone-dot" style={{ color: 'var(--warning-500)' }}>
                                    <Clock size={14} />
                                </div>
                                <div className="milestone-content">
                                    <div className="milestone-label" style={{ color: 'var(--warning-500)', fontWeight: 700 }}>
                                        TAT Paused - RMA Active
                                    </div>
                                    <div className="milestone-time" style={{ fontSize: '10px' }}>
                                        SLA/TAT does not apply while device replacement is in progress
                                    </div>
                                </div>
                            </div>
                        )}

                        {isRmaCompleted && (
                            <div className="timeline-milestone active" style={{
                                background: 'rgba(34, 197, 94, 0.08)',
                                border: '1px solid rgba(34, 197, 94, 0.2)',
                                borderRadius: 'var(--radius-lg)',
                                padding: 'var(--space-2) var(--space-3)',
                                marginTop: 'var(--space-2)'
                            }}>
                                <div className="milestone-dot" style={{ color: 'var(--success-500)' }}>
                                    <CheckCircle size={14} />
                                </div>
                                <div className="milestone-content">
                                    <div className="milestone-label" style={{ color: 'var(--success-500)', fontWeight: 700 }}>
                                        RMA Completed
                                    </div>
                                    <div className="milestone-time" style={{ fontSize: '10px' }}>
                                        Device replacement finalized. Ticket can now be resolved/closed.
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="sla-policy-info">
                            <div className="policy-details">
                                <span className="policy-name">
                                    <Shield size={12} />
                                    Policy: {ticket.slaPolicyId?.policyName || 'Standard Policy'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Audit Trail - Compact */}
                    <div className="detail-section glass-card compact-section">
                        <div className="section-header">
                            <h3 className="section-title">
                                <History size={14} />
                                History
                            </h3>
                        </div>

                        <div className="audit-timeline compact">
                            {auditTrail.slice(0, 5).map((audit) => (
                                <div key={audit.auditId} className="audit-item">
                                    <div className="audit-icon">
                                        <FileText size={10} />
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
                                        {safeFormatDate(audit.performedOn, 'MMM dd, HH:mm')}
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
                <Modal
                    icon={UserPlus}
                    title="Assign Ticket"
                    onClose={() => setShowAssignModal(false)}
                    footer={<>
                        <button className="btn btn-ghost" onClick={() => setShowAssignModal(false)}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleAssign} disabled={actionLoading}>
                            {actionLoading ? 'Assigning...' : 'Assign'}
                        </button>
                    </>}
                >
                    <div className="form-group">
                        <label className="form-label">Select Employee</label>
                        <select
                            className="form-select"
                            value={assignData.assignedTo}
                            onChange={(e) => setAssignData({ ...assignData, assignedTo: e.target.value })}
                        >
                            <option value="">Choose employee...</option>
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
                </Modal>
            )}

            {/* Resolve Modal */}
            {showResolveModal && (
                <Modal
                    icon={CheckCircle}
                    title="Resolve Ticket"
                    onClose={() => setShowResolveModal(false)}
                    footer={<>
                        <button className="btn btn-ghost" onClick={() => setShowResolveModal(false)}>Cancel</button>
                        <button className="btn btn-success" onClick={handleResolve} disabled={actionLoading}>
                            {actionLoading ? 'Resolving...' : 'Resolve Ticket'}
                        </button>
                    </>}
                >
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
                </Modal>
            )}

            {/* Re-open Modal */}
            {showReopenModal && (
                <Modal
                    icon={RotateCcw}
                    title="Re-open Ticket"
                    onClose={() => setShowReopenModal(false)}
                    footer={<>
                        <button className="btn btn-ghost" onClick={() => setShowReopenModal(false)}>Cancel</button>
                        <button className="btn btn-warning" onClick={handleReopen} disabled={actionLoading}>
                            {actionLoading ? 'Re-opening...' : 'Re-open Ticket'}
                        </button>
                    </>}
                >
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
                </Modal>
            )}

            {/* Reject Resolution Modal */}
            {showRejectModal && (
                <Modal
                    icon={XCircle}
                    title="Reject Resolution"
                    onClose={() => setShowRejectModal(false)}
                    footer={<>
                        <button className="btn btn-ghost" onClick={() => setShowRejectModal(false)}>Cancel</button>
                        <button className="btn btn-danger" onClick={handleRejectResolution} disabled={actionLoading}>
                            {actionLoading ? 'Rejecting...' : 'Reject Resolution'}
                        </button>
                    </>}
                >
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
                </Modal>
            )}

            {/* Escalate Modal */}
            {showEscalateModal && (
                <Modal
                    icon={AlertTriangle}
                    title="Escalate Ticket"
                    onClose={() => setShowEscalateModal(false)}
                    footer={<>
                        <button className="btn btn-ghost" onClick={() => setShowEscalateModal(false)}>Cancel</button>
                        <button className="btn btn-warning" onClick={handleEscalate} disabled={actionLoading}>
                            {actionLoading ? 'Escalating...' : 'Escalate Ticket'}
                        </button>
                    </>}
                >
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

                    <div className="form-group mt-4">
                        <label className="form-label">Assign To (Escalation User)</label>
                        <select
                            className="form-select"
                            value={selectedEscalationUser}
                            onChange={(e) => setSelectedEscalationUser(e.target.value)}
                        >
                            <option value="">Awaiting Acceptance (Open Escalation)</option>
                            {escalationUsers.map((u) => (
                                <option key={u.value} value={u.value}>{u.label}</option>
                            ))}
                        </select>
                        <p className="text-xs text-muted mt-1 italic">
                            Leave blank if you want any available escalation user to accept it.
                        </p>
                    </div>
                </Modal>
            )}

            {/* Accept Escalation Modal */}
            {showAcceptEscalationModal && (
                <Modal
                    title={`Manage Escalation (Level ${ticket?.escalationLevel})`}
                    onClose={() => setShowAcceptEscalationModal(false)}
                    footer={<button className="btn btn-ghost" onClick={() => setShowAcceptEscalationModal(false)}>Cancel</button>}
                >
                    <p className="modal-description">
                        You can either accept this escalated ticket yourself or assign it to a specialized escalation user.
                    </p>

                    <div className="escalation-options space-y-6">
                        <div className="option-section p-4 bg-secondary/10 rounded-lg">
                            <h4 className="text-sm font-bold mb-3 uppercase tracking-wider opacity-70">Option 1: Work on it yourself</h4>
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
                                <div className="relative py-2">
                                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border"></div></div>
                                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-bg-card px-2 text-muted">OR</span></div>
                                </div>

                                <div className="option-section p-4 bg-secondary/10 rounded-lg">
                                    <h4 className="text-sm font-bold mb-3 uppercase tracking-wider opacity-70">Option 2: Assign to escalation user</h4>
                                    <div className="form-group mb-4">
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
                </Modal>
            )}

            {/* Request SLA Extension Modal */}
            {showRequestExtensionModal && (
                <Modal
                    icon={Clock}
                    title="Request SLA Extension"
                    onClose={() => setShowRequestExtensionModal(false)}
                    footer={<>
                        <button className="btn btn-ghost" onClick={() => setShowRequestExtensionModal(false)}>Cancel</button>
                        <button className="btn btn-warning" onClick={handleRequestSlaExtension} disabled={actionLoading}>
                            {actionLoading ? 'Submitting...' : 'Submit Request'}
                        </button>
                    </>}
                >
                    <p className="modal-description">
                        This ticket has breached its SLA resolution deadline. Explain the reason for the delay —
                        Admins and Supervisors will be notified and can approve a new deadline.
                    </p>
                    <div className="form-group">
                        <label className="form-label">Reason for Delay *</label>
                        <textarea
                            className="form-textarea"
                            value={extensionReason}
                            onChange={(e) => setExtensionReason(e.target.value)}
                            placeholder="Explain why the ticket could not be resolved within the SLA window..."
                            rows={4}
                        />
                    </div>
                </Modal>
            )}

            {/* Review SLA Extension Request Modal */}
            {showReviewExtensionModal && (
                <Modal
                    icon={AlertTriangle}
                    title="Review SLA Extension Request"
                    onClose={() => setShowReviewExtensionModal(false)}
                    footer={<button className="btn btn-ghost" onClick={() => setShowReviewExtensionModal(false)}>Cancel</button>}
                >
                    <p className="modal-description">
                        <strong>{ticket?.slaExtension?.requestedBy?.fullName || 'The assignee'}</strong> requested more time on this ticket:
                    </p>
                    <div className="form-group">
                        <p className="detail-value" style={{ whiteSpace: 'pre-wrap' }}>{ticket?.slaExtension?.reason}</p>
                    </div>

                    <div className="escalation-options space-y-6">
                        <div className="option-section p-4 bg-secondary/10 rounded-lg">
                            <h4 className="text-sm font-bold mb-3 uppercase tracking-wider opacity-70">Approve &amp; Set New Deadline</h4>
                            <div className="form-group mb-4">
                                <label className="form-label">New SLA Resolution Deadline *</label>
                                <input
                                    type="datetime-local"
                                    className="form-input"
                                    value={newSlaDateTime}
                                    onChange={(e) => setNewSlaDateTime(e.target.value)}
                                />
                            </div>
                            <button
                                className="btn btn-success w-full"
                                onClick={handleApproveSlaExtension}
                                disabled={actionLoading || !newSlaDateTime}
                            >
                                Approve Extension
                            </button>
                        </div>

                        <div className="relative py-2">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border"></div></div>
                            <div className="relative flex justify-center text-xs uppercase"><span className="bg-bg-card px-2 text-muted">OR</span></div>
                        </div>

                        <div className="option-section p-4 bg-secondary/10 rounded-lg">
                            <h4 className="text-sm font-bold mb-3 uppercase tracking-wider opacity-70">Reject Request</h4>
                            <div className="form-group mb-4">
                                <label className="form-label">Reason for Rejection *</label>
                                <textarea
                                    className="form-textarea"
                                    value={extensionRejectionReason}
                                    onChange={(e) => setExtensionRejectionReason(e.target.value)}
                                    placeholder="Explain why the extension isn't warranted..."
                                    rows={3}
                                />
                            </div>
                            <button
                                className="btn btn-danger w-full"
                                onClick={handleRejectSlaExtension}
                                disabled={actionLoading || !extensionRejectionReason.trim()}
                            >
                                Reject Extension
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
