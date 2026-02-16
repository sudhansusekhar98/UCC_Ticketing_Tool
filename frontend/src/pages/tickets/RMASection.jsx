import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { rmaApi } from '../../services/api';
import { toast } from 'react-hot-toast';
import { Package, Truck, CheckCircle, Clock, Server, FileText, History, Hash, Info, Settings, RefreshCw, MessageSquare, Cpu, MapPin, Building, Send, ShoppingBag, ArrowDownToLine } from 'lucide-react';
import useAuthStore from '../../context/authStore';

const RMASection = ({ ticketId, siteId, assetId, ticketStatus, isLocked, onUpdate }) => {
    const navigate = useNavigate();
    const { user, hasRole, hasRight } = useAuthStore();
    const [rma, setRma] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [showProcessModal, setShowProcessModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [showSendItemModal, setShowSendItemModal] = useState(false);
    const [showLogisticsModal, setShowLogisticsModal] = useState(false);

    // Form States
    const [requestReason, setRequestReason] = useState('');
    const [actionRemark, setActionRemark] = useState('');
    const [replacementSource, setReplacementSource] = useState('RepairOnly');

    // Logistics states
    const [itemSendRoute, setItemSendRoute] = useState('ToHO');
    const [logisticsCarrier, setLogisticsCarrier] = useState('');
    const [logisticsTracking, setLogisticsTracking] = useState('');
    const [logisticsCourier, setLogisticsCourier] = useState('');
    const [logisticsRemarks, setLogisticsRemarks] = useState('');
    const [serviceCenterTicketRef, setServiceCenterTicketRef] = useState('');

    // Installation states
    const [showInstallModal, setShowInstallModal] = useState(false);
    const [installIpAddress, setInstallIpAddress] = useState('');
    const [installUserName, setInstallUserName] = useState('');
    const [installPassword, setInstallPassword] = useState('');
    const [installRemarks, setInstallRemarks] = useState('');

    const [rmaHistory, setRmaHistory] = useState([]);
    const [shippingDetails, setShippingDetails] = useState({ address: '', trackingNumber: '', carrier: '' });

    // Target status for the process/logistics modal
    const [targetStatus, setTargetStatus] = useState('');

    // Replacement workflow states (Admin only)
    const [showReplacementModal, setShowReplacementModal] = useState(false);
    const [showReplacementDispatchModal, setShowReplacementDispatchModal] = useState(false);
    const [replacementStockSource, setReplacementStockSource] = useState('HOStock');
    const [replacementSourceSiteId, setReplacementSourceSiteId] = useState('');
    const [replLogisticsCarrier, setReplLogisticsCarrier] = useState('');
    const [replLogisticsTracking, setReplLogisticsTracking] = useState('');
    const [replLogisticsRemarks, setReplLogisticsRemarks] = useState('');

    useEffect(() => {
        if (ticketId) loadRMA();
        if (assetId) loadHistory();
    }, [ticketId, assetId]);

    const loadHistory = async () => {
        try {
            const res = await rmaApi.getHistory(assetId);
            setRmaHistory(res.data.data || []);
        } catch (error) {
            console.error('Failed to load history', error);
            setRmaHistory([]);
        }
    };

    const loadRMA = async () => {
        setLoading(true);
        try {
            const res = await rmaApi.getByTicket(ticketId);
            setRma(res.data.data);
        } catch (error) {
            setRma(null);
        } finally {
            setLoading(false);
        }
    };

    // ==========================================
    // HANDLERS
    // ==========================================

    const handleRequestRMA = async () => {
        if (!requestReason.trim()) return toast.error('Reason is required');

        try {
            await rmaApi.create({
                ticketId,
                requestReason,
                replacementSource,
                faultyItemAction: 'Repair',
                shippingDetails: shippingDetails.address ? shippingDetails : undefined,
            });
            toast.success('RMA Requested');
            setShowRequestModal(false);
            loadRMA();
            if (onUpdate) onUpdate();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to request RMA');
        }
    };

    const handleUpdateStatus = async (status, extraData = {}) => {
        try {
            const data = { status, remarks: actionRemark, ...extraData };
            await rmaApi.updateStatus(rma._id, data);
            toast.success(`RMA status updated to ${status}`);
            setShowProcessModal(false);
            setShowSendItemModal(false);
            setShowLogisticsModal(false);
            setActionRemark('');
            loadRMA();
            if (onUpdate) onUpdate();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update status');
        }
    };

    // Send item to HO or Service Center
    const handleSendItem = async () => {
        const logisticsData = {
            carrier: logisticsCarrier,
            trackingNumber: logisticsTracking,
            courierName: logisticsCourier,
            remarks: logisticsRemarks
        };

        if (itemSendRoute === 'DirectToServiceCenter') {
            await handleUpdateStatus('SentToServiceCenter', {
                itemSendRoute: 'DirectToServiceCenter',
                logisticsToServiceCenter: logisticsData,
                shippingDetails: { carrier: logisticsCarrier, trackingNumber: logisticsTracking }
            });
        } else {
            await handleUpdateStatus('SentToHO', {
                itemSendRoute: 'ToHO',
                logisticsToHO: logisticsData,
                shippingDetails: { carrier: logisticsCarrier, trackingNumber: logisticsTracking }
            });
        }
        setShowSendItemModal(false);
    };

    // Admin: Ship item from HO to service center
    const handleSendForRepairFromHO = async () => {
        await handleUpdateStatus('SentForRepairFromHO', {
            logisticsToServiceCenter: {
                carrier: logisticsCarrier,
                trackingNumber: logisticsTracking,
                courierName: logisticsCourier,
                remarks: logisticsRemarks,
                serviceCenterTicketRef
            },
            serviceCenterTicketRef
        });
        setShowLogisticsModal(false);
    };

    // Admin: Ship repaired item back to site
    const handleShipReturnToSite = async () => {
        await handleUpdateStatus('ReturnShippedToSite', {
            logisticsReturnToSite: {
                carrier: logisticsCarrier,
                trackingNumber: logisticsTracking,
                courierName: logisticsCourier,
                remarks: logisticsRemarks
            },
            shippingDetails: { carrier: logisticsCarrier, trackingNumber: logisticsTracking }
        });
        setShowLogisticsModal(false);
    };

    // Install device
    const handleInstallDevice = async () => {
        try {
            await rmaApi.confirmInstallation(rma._id, {
                status: 'Installed & Working',
                remarks: installRemarks,
                newIpAddress: installIpAddress,
                newUserName: installUserName,
                newPassword: installPassword
            });
            toast.success('Device installed successfully');
            setShowInstallModal(false);
            loadRMA();
            if (onUpdate) onUpdate();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to confirm installation');
        }
    };

    // Open install modal with pre-filled data
    const openInstallModal = () => {
        setInstallIpAddress(rma?.originalDetailsSnapshot?.ipAddress || '');
        setInstallUserName(rma?.originalDetailsSnapshot?.userName || '');
        setInstallPassword('');
        setInstallRemarks('');
        setShowInstallModal(true);
    };

    // Reset logistics form
    const resetLogisticsForm = () => {
        setLogisticsCarrier('');
        setLogisticsTracking('');
        setLogisticsCourier('');
        setLogisticsRemarks('');
        setServiceCenterTicketRef('');
    };

    const handleRaiseReplacementRequisition = async () => {
        try {
            const data = {
                status: 'ReplacementRequisitionRaised',
                replacementStockSource,
                replacementSourceSiteId: replacementStockSource === 'SiteStock' ? replacementSourceSiteId : undefined,
                remarks: actionRemark || `Replacement requisition raised — Source: ${replacementStockSource}`
            };
            await rmaApi.updateStatus(rma._id, data);
            toast.success('Replacement requisition raised');
            setShowReplacementModal(false);
            setActionRemark('');
            loadRMA();
            if (onUpdate) onUpdate();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to raise requisition');
        }
    };

    const handleDispatchReplacement = async () => {
        try {
            const data = {
                status: 'ReplacementDispatched',
                logisticsReplacementToSite: {
                    carrier: replLogisticsCarrier,
                    trackingNumber: replLogisticsTracking,
                    remarks: replLogisticsRemarks
                },
                remarks: actionRemark || 'Replacement dispatched to site'
            };
            await rmaApi.updateStatus(rma._id, data);
            toast.success('Replacement dispatched');
            setShowReplacementDispatchModal(false);
            setReplLogisticsCarrier('');
            setReplLogisticsTracking('');
            setReplLogisticsRemarks('');
            setActionRemark('');
            loadRMA();
            if (onUpdate) onUpdate();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to dispatch replacement');
        }
    };

    if (loading) return <div className="p-4 text-center">Loading RMA details...</div>;

    const canManageRMA = hasRole(['Admin', 'Supervisor', 'Dispatcher']);
    const canInstall = hasRole(['Admin', 'Supervisor', 'L1Engineer', 'L2Engineer']);
    const isL1 = hasRole(['L1Engineer', 'L2Engineer']);

    // ==========================================
    // STATUS FLOW HELPER
    // ==========================================
    const getStatusFlow = () => {
        if (!rma) return [];

        const isViaHO = rma.itemSendRoute === 'ToHO';
        const isDirectSC = rma.itemSendRoute === 'DirectToServiceCenter';

        // Base flow
        const steps = [
            { key: 'Requested', label: 'Requested', icon: <FileText size={14} />, active: true, date: rma.createdAt },
            { key: 'Approved', label: 'Approved', icon: <CheckCircle size={14} />, active: rma.status !== 'Requested' && rma.status !== 'Rejected', date: rma.approvedOn },
        ];

        if (rma.status === 'Rejected') {
            steps.push({ key: 'Rejected', label: 'Rejected', icon: <AlertTriangle size={14} />, active: true, date: null });
            return steps;
        }

        // After approval - item sent
        if (isDirectSC) {
            steps.push({ key: 'SentToServiceCenter', label: 'Sent to SC', icon: <Send size={14} />, active: ['SentToServiceCenter', 'ItemRepairedAtHO', 'ReturnShippedToSite', 'ReceivedAtSite', 'Installed'].includes(rma.status), date: rma.repairDispatchDate });
        } else if (isViaHO) {
            steps.push(
                { key: 'SentToHO', label: 'Sent to HO', icon: <Building size={14} />, active: ['SentToHO', 'ReceivedAtHO', 'SentForRepairFromHO', 'ItemRepairedAtHO', 'ReturnShippedToSite', 'ReceivedAtSite', 'Installed'].includes(rma.status), date: rma.logisticsToHO?.dispatchDate },
                { key: 'ReceivedAtHO', label: 'Received at HO', icon: <Package size={14} />, active: ['ReceivedAtHO', 'SentForRepairFromHO', 'ItemRepairedAtHO', 'ReturnShippedToSite', 'ReceivedAtSite', 'Installed'].includes(rma.status), date: rma.receivedAtHODate },
                { key: 'SentForRepairFromHO', label: 'Sent to SC', icon: <Send size={14} />, active: ['SentForRepairFromHO', 'ItemRepairedAtHO', 'ReturnShippedToSite', 'ReceivedAtSite', 'Installed'].includes(rma.status), date: rma.logisticsToServiceCenter?.dispatchDate },
            );
        } else {
            // Not yet decided route - show generic "Send Item" step
            if (['Approved'].includes(rma.status)) {
                steps.push({ key: 'send', label: 'Send Item', icon: <Send size={14} />, active: false, date: null });
            }
        }

        // Return from repair (only shown if RepairOnly or the repair leg of RepairAndReplace)
        const afterRepairStatuses = ['ItemRepairedAtHO', 'ReturnShippedToSite', 'ReceivedAtSite', 'Installed'];
        steps.push(
            { key: 'ItemRepairedAtHO', label: 'Repaired (at HO)', icon: <CheckCircle size={14} />, active: afterRepairStatuses.includes(rma.status), date: rma.repairedItemReceivedAtHODate },
            { key: 'ReturnShippedToSite', label: 'Shipped to Site', icon: <Truck size={14} />, active: ['ReturnShippedToSite', 'ReceivedAtSite', 'Installed'].includes(rma.status), date: rma.logisticsReturnToSite?.dispatchDate },
            { key: 'ReceivedAtSite', label: 'Received', icon: <MapPin size={14} />, active: ['ReceivedAtSite', 'Installed'].includes(rma.status), date: rma.logisticsReturnToSite?.receivedDate },
        );

        // Replacement track (only for RepairAndReplace)
        if (rma.replacementSource === 'RepairAndReplace') {
            const replStatuses = ['ReplacementRequisitionRaised', 'ReplacementDispatched', 'ReplacementReceivedAtSite', 'Installed'];
            steps.push(
                { key: 'ReplacementRequisitionRaised', label: 'Requisition', icon: <ShoppingBag size={14} />, active: replStatuses.includes(rma.status), date: rma.replacementArrangedOn },
                { key: 'ReplacementDispatched', label: 'Repl. Dispatched', icon: <Truck size={14} />, active: ['ReplacementDispatched', 'ReplacementReceivedAtSite', 'Installed'].includes(rma.status), date: rma.logisticsReplacementToSite?.dispatchDate },
                { key: 'ReplacementReceivedAtSite', label: 'Repl. Received', icon: <ArrowDownToLine size={14} />, active: ['ReplacementReceivedAtSite', 'Installed'].includes(rma.status), date: rma.logisticsReplacementToSite?.receivedDate },
            );
        }

        steps.push(
            { key: 'Installed', label: 'Installed', icon: <Settings size={14} />, active: rma.status === 'Installed', date: rma.installedOn },
        );

        return steps;
    };

    const renderStep = (step) => (
        <div key={step.key} className={`rma-step ${step.active ? 'active' : ''}`}>
            <div className="rma-step-icon">{step.icon}</div>
            <span className="rma-step-label">{step.label}</span>
            {step.date && <span className="rma-step-date">{new Date(step.date).toLocaleDateString()}</span>}
        </div>
    );

    // ==========================================
    // RENDER
    // ==========================================
    return (
        <div className="detail-section glass-card rma-section p-3">
            <div className="flex justify-between items-center mb-4">
                <h3 className="section-title flex items-center gap-2">
                    <Package size={18} />
                    Device Replacement / RMA
                    {rmaHistory?.length > 0 && (
                        <span className="badge badge-sm badge-outline text-xs ml-2">
                            {rmaHistory.length} Replacement{rmaHistory.length !== 1 ? 's' : ''}
                        </span>
                    )}
                </h3>
                <div className="flex items-center gap-2">
                    {rmaHistory?.length > 0 && (
                        <button className="btn btn-sm btn-ghost" onClick={() => setShowHistoryModal(true)}>
                            <History size={16} />
                        </button>
                    )}
                    {!rma && !isLocked && ticketStatus === 'InProgress' && (
                        <button
                            className="btn btn-sm btn-primary"
                            onClick={() => setShowRequestModal(true)}
                        >
                            {hasRight('DIRECT_RMA_GENERATE', siteId) ? 'Direct RMA Creation' : 'Request RMA'}
                        </button>
                    )}
                    {!rma && !isLocked && ticketStatus !== 'InProgress' && (
                        <div className="text-xs text-muted italic flex items-center gap-1">
                            <Clock size={12} />
                            Start work to enable RMA
                        </div>
                    )}
                </div>
            </div>

            {rma ? (
                <div className="space-y-4">
                    {/* Status Tracker */}
                    <div className="rma-timeline-tracker">
                        <div className="rma-timeline-line"></div>
                        <div className="rma-timeline-steps">
                            {getStatusFlow().map(step => renderStep(step))}
                        </div>
                    </div>

                    {/* Details Container */}
                    <div className="rma-details-container">
                        {/* Group 1: Tracking & Status */}
                        <div className="rma-info-group">
                            <div className="rma-detail-item">
                                <span className="detail-label"><Hash size={12} /> RMA Number</span>
                                <div className="detail-value">
                                    <span className="font-mono text-primary-500 font-bold">{rma.rmaNumber || 'Pending'}</span>
                                </div>
                            </div>
                            <div className="rma-detail-item">
                                <span className="detail-label"><Info size={12} /> Current Status</span>
                                <div className="detail-value">
                                    <span className={`badge badge-${['Installed', 'ReceivedAtSite'].includes(rma.status) ? 'success' : rma.status === 'Rejected' ? 'danger' : 'warning'}`}>
                                        {rma.status.replace(/([A-Z])/g, ' $1').trim()}
                                    </span>
                                </div>
                            </div>
                            <div className="rma-detail-item">
                                <span className="detail-label"><RefreshCw size={12} /> Type</span>
                                <div className="detail-value text-xs font-bold uppercase">
                                    {rma.replacementSource === 'RepairOnly' || rma.replacementSource === 'Repair' ? '🔧 Repair Only' : '🔄 Repair & Replace'}
                                </div>
                            </div>
                        </div>

                        {/* Group 2: Request Context */}
                        <div className="rma-info-group">
                            <div className="rma-detail-item full-width">
                                <span className="detail-label"><MessageSquare size={12} /> Request Reason</span>
                                <div className="detail-value">{rma.requestReason}</div>
                            </div>
                        </div>

                        {/* Group 3: Logistics Info (if available) */}
                        {(rma.logisticsToHO?.trackingNumber || rma.logisticsToServiceCenter?.trackingNumber || rma.logisticsReturnToSite?.trackingNumber) && (
                            <div className="rma-info-group">
                                <div className="rma-detail-item full-width">
                                    <span className="detail-label"><Truck size={12} /> Logistics</span>
                                    <div className="tech-details-flex mt-2">
                                        {rma.logisticsToHO?.trackingNumber && (
                                            <div className="tech-tag">
                                                <span>To HO:</span> <span>{rma.logisticsToHO.trackingNumber}</span>
                                            </div>
                                        )}
                                        {rma.logisticsToServiceCenter?.trackingNumber && (
                                            <div className="tech-tag">
                                                <span>To SC:</span> <span>{rma.logisticsToServiceCenter.trackingNumber}</span>
                                            </div>
                                        )}
                                        {rma.logisticsReturnToSite?.trackingNumber && (
                                            <div className="tech-tag">
                                                <span>Return:</span> <span>{rma.logisticsReturnToSite.trackingNumber}</span>
                                            </div>
                                        )}
                                        {rma.logisticsToServiceCenter?.serviceCenterTicketRef && (
                                            <div className="tech-tag">
                                                <span>SC Ref:</span> <span>{rma.logisticsToServiceCenter.serviceCenterTicketRef}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Group 4: Replacement Specs (if installed) */}
                        {rma.replacementDetails?.serialNumber && (
                            <div className="rma-info-group">
                                <div className="rma-detail-item full-width">
                                    <span className="detail-label"><Cpu size={12} /> Replacement Unit Specs</span>
                                    <div className="tech-details-flex mt-2">
                                        <div className="tech-tag">
                                            <span>S/N:</span> <span>{rma.replacementDetails.serialNumber}</span>
                                        </div>
                                        {rma.replacementDetails.ipAddress && (
                                            <div className="tech-tag">
                                                <span>IP:</span> <span>{rma.replacementDetails.ipAddress}</span>
                                            </div>
                                        )}
                                        {rma.replacementDetails.mac && (
                                            <div className="tech-tag">
                                                <span>MAC:</span> <span>{rma.replacementDetails.mac}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ========================================
                        CONTEXTUAL ACTION ALERTS
                       ======================================== */}

                    {/* STEP 2: After Approval - L1 needs to send item */}
                    {rma.status === 'Approved' && (isL1 || canManageRMA) && (
                        <div className="rma-finalization-alert status-received animate-fade-in">
                            <div className="rma-alert-info">
                                <Send size={20} className="text-primary-500" />
                                <div className="rma-alert-text">
                                    <p className="alert-title">RMA Approved — Send Item for Repair</p>
                                    <p className="alert-desc">
                                        Send the faulty item either <strong>directly to the service center</strong> or <strong>to the Head Office (HO)</strong>. Update logistics details (carrier, tracking number).
                                    </p>
                                </div>
                            </div>
                            <div className="rma-alert-actions">
                                <button
                                    className="btn btn-sm btn-primary shadow-sm flex items-center gap-1"
                                    onClick={() => { resetLogisticsForm(); setShowSendItemModal(true); }}
                                >
                                    <Send size={14} /> Send Item
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 3a: Item at HO - Admin acknowledges */}
                    {rma.status === 'SentToHO' && canManageRMA && (
                        <div className="rma-finalization-alert status-received animate-fade-in">
                            <div className="rma-alert-info">
                                <Building size={20} className="text-warning-500" />
                                <div className="rma-alert-text">
                                    <p className="alert-title">Item in Transit to HO</p>
                                    <p className="alert-desc">
                                        The faulty item has been dispatched to HO. Acknowledge receipt once it arrives.
                                    </p>
                                </div>
                            </div>
                            <div className="rma-alert-actions">
                                <button
                                    className="btn btn-sm btn-success shadow-sm flex items-center gap-1"
                                    onClick={() => handleUpdateStatus('ReceivedAtHO')}
                                >
                                    <CheckCircle size={14} /> Acknowledge Receipt at HO
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 3b: At HO - Admin sends to Service Center */}
                    {rma.status === 'ReceivedAtHO' && canManageRMA && (
                        <div className="rma-finalization-alert status-in-repair animate-fade-in">
                            <div className="rma-alert-info">
                                <RefreshCw size={20} className="text-warning-500" />
                                <div className="rma-alert-text">
                                    <p className="alert-title">Item at HO — Send to Service Center</p>
                                    <p className="alert-desc">
                                        Item is at HO. Forward it to the service center for repair. Optionally add / reference a service center ticket.
                                    </p>
                                </div>
                            </div>
                            <div className="rma-alert-actions">
                                <button
                                    className="btn btn-sm btn-primary shadow-sm flex items-center gap-1"
                                    onClick={() => { resetLogisticsForm(); setTargetStatus('SentForRepairFromHO'); setShowLogisticsModal(true); }}
                                >
                                    <Send size={14} /> Send to Service Center
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: Repair done - Admin confirms receipt back at HO */}
                    {(rma.status === 'SentToServiceCenter' || rma.status === 'SentForRepairFromHO') && canManageRMA && (
                        <div className="rma-finalization-alert status-in-repair animate-fade-in">
                            <div className="rma-alert-info">
                                <RefreshCw size={20} className="text-warning-500 animate-spin" style={{ animationDuration: '3s' }} />
                                <div className="rma-alert-text">
                                    <p className="alert-title">Item at Service Center</p>
                                    <p className="alert-desc">
                                        The item is currently at the service center for repair. Once you receive the repaired item back at HO, confirm below.
                                    </p>
                                </div>
                            </div>
                            <div className="rma-alert-actions">
                                <button
                                    className="btn btn-sm btn-success shadow-sm flex items-center gap-1"
                                    onClick={() => handleUpdateStatus('ItemRepairedAtHO')}
                                >
                                    <CheckCircle size={14} /> Yes — Repaired Item Received at HO
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 5: Admin ships repaired item back to site */}
                    {rma.status === 'ItemRepairedAtHO' && canManageRMA && (
                        <div className="rma-finalization-alert status-repaired animate-fade-in">
                            <div className="rma-alert-info">
                                <CheckCircle size={20} className="text-success-500" />
                                <div className="rma-alert-text">
                                    <p className="alert-title">Repaired Item Ready — Ship to Site</p>
                                    <p className="alert-desc">
                                        The repaired item has been received at HO. Ship it back to the site for installation.
                                    </p>
                                </div>
                            </div>
                            <div className="rma-alert-actions">
                                <button
                                    className="btn btn-sm btn-primary shadow-sm flex items-center gap-1"
                                    onClick={() => { resetLogisticsForm(); setTargetStatus('ReturnShippedToSite'); setShowLogisticsModal(true); }}
                                >
                                    <Truck size={14} /> Ship to Site
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 6a: Item shipped - awaiting receipt at site */}
                    {rma.status === 'ReturnShippedToSite' && (isL1 || canManageRMA) && (
                        <div className="rma-finalization-alert status-received animate-fade-in">
                            <div className="rma-alert-info">
                                <Truck size={20} className="text-primary-500" />
                                <div className="rma-alert-text">
                                    <p className="alert-title">Item Shipped to Site</p>
                                    <p className="alert-desc">
                                        The repaired item is on its way to your site. Mark as received once it arrives.
                                    </p>
                                </div>
                            </div>
                            <div className="rma-alert-actions">
                                <button
                                    className="btn btn-sm btn-success shadow-sm flex items-center gap-1"
                                    onClick={() => handleUpdateStatus('ReceivedAtSite')}
                                >
                                    <MapPin size={14} /> Mark Received at Site
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 6b: Received at site - install device */}
                    {(rma.status === 'ReceivedAtSite' || rma.status === 'ReplacementReceivedAtSite') && (canInstall) && (
                        <div className="rma-finalization-alert status-received animate-fade-in">
                            <div className="rma-alert-info">
                                <Server size={20} className="text-success-500" />
                                <div className="rma-alert-text">
                                    <p className="alert-title">Item Received — Install Device</p>
                                    <p className="alert-desc">
                                        {rma.status === 'ReplacementReceivedAtSite'
                                            ? 'The replacement item has arrived at the site. Install the device and update its current details (IP, credentials).'
                                            : 'The repaired item has arrived at the site. Install the device and update its current details (IP, credentials).'}
                                    </p>
                                </div>
                            </div>
                            <div className="rma-alert-actions">
                                <button
                                    className="btn btn-sm btn-success shadow-sm flex items-center gap-1 animate-pulse"
                                    onClick={openInstallModal}
                                >
                                    <Settings size={14} /> Install & Update Details
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ========================================
                        REPLACEMENT WORKFLOW ALERTS (Admin/Escalation only)
                       ======================================== */}

                    {/* REPLACEMENT STEP 1: After approval of RepairAndReplace — Admin raises requisition */}
                    {rma.status === 'Approved' && rma.replacementSource === 'RepairAndReplace' && canManageRMA && (
                        <div className="rma-finalization-alert status-received animate-fade-in" style={{ borderLeft: '4px solid var(--info-500)' }}>
                            <div className="rma-alert-info">
                                <ShoppingBag size={20} className="text-info-500" />
                                <div className="rma-alert-text">
                                    <p className="alert-title">Replacement Required — Raise Requisition</p>
                                    <p className="alert-desc">
                                        This RMA requires a replacement device. Raise a stock transfer requisition from HO or another site's stock.
                                    </p>
                                </div>
                            </div>
                            <div className="rma-alert-actions">
                                <button
                                    className="btn btn-sm btn-info shadow-sm flex items-center gap-1"
                                    onClick={() => setShowReplacementModal(true)}
                                >
                                    <ShoppingBag size={14} /> Raise Requisition
                                </button>
                            </div>
                        </div>
                    )}

                    {/* REPLACEMENT STEP 2: Requisition raised — Admin dispatches replacement */}
                    {rma.status === 'ReplacementRequisitionRaised' && canManageRMA && (
                        <div className="rma-finalization-alert status-received animate-fade-in" style={{ borderLeft: '4px solid var(--primary-500)' }}>
                            <div className="rma-alert-info">
                                <Truck size={20} className="text-primary-500" />
                                <div className="rma-alert-text">
                                    <p className="alert-title">Requisition Raised — Dispatch Replacement</p>
                                    <p className="alert-desc">
                                        Stock requisition has been raised{rma.replacementStockSource ? ` (from ${rma.replacementStockSource === 'HOStock' ? 'HO Stock' : rma.replacementStockSource === 'SiteStock' ? 'Site Stock' : 'Market'})` : ''}. Dispatch the replacement item to the site.
                                    </p>
                                </div>
                            </div>
                            <div className="rma-alert-actions">
                                <button
                                    className="btn btn-sm btn-primary shadow-sm flex items-center gap-1"
                                    onClick={() => setShowReplacementDispatchModal(true)}
                                >
                                    <Truck size={14} /> Dispatch Replacement
                                </button>
                            </div>
                        </div>
                    )}

                    {/* REPLACEMENT STEP 3: Dispatched — L1/ticket owner confirms receipt */}
                    {rma.status === 'ReplacementDispatched' && (isL1 || canManageRMA) && (
                        <div className="rma-finalization-alert status-received animate-fade-in" style={{ borderLeft: '4px solid var(--success-500)' }}>
                            <div className="rma-alert-info">
                                <ArrowDownToLine size={20} className="text-success-500" />
                                <div className="rma-alert-text">
                                    <p className="alert-title">Replacement Dispatched — Confirm Receipt</p>
                                    <p className="alert-desc">
                                        The replacement item is on its way. Confirm receipt once it arrives at the site.
                                        {rma.logisticsReplacementToSite?.trackingNumber && ` (Tracking: ${rma.logisticsReplacementToSite.trackingNumber})`}
                                    </p>
                                </div>
                            </div>
                            <div className="rma-alert-actions">
                                <button
                                    className="btn btn-sm btn-success shadow-sm flex items-center gap-1"
                                    onClick={() => handleUpdateStatus('ReplacementReceivedAtSite')}
                                >
                                    <MapPin size={14} /> Confirm Received
                                </button>
                            </div>
                        </div>
                    )}

                    {/* COMPLETED */}
                    {rma.status === 'Installed' && (
                        <div className="rma-finalization-alert status-repaired animate-fade-in">
                            <div className="rma-alert-info">
                                <CheckCircle size={20} className="text-success-500" />
                                <div className="rma-alert-text">
                                    <p className="alert-title">RMA Completed</p>
                                    <p className="alert-desc">
                                        The device has been successfully repaired, returned, and installed. This RMA is finalized.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Admin quick approve/reject */}
                    <div className="rma-actions-wrapper">
                        {canManageRMA && rma.status === 'Requested' && (
                            <>
                                <button className="btn btn-sm btn-danger px-3" onClick={() => handleUpdateStatus('Rejected')}>Reject</button>
                                <button className="btn btn-sm btn-success px-3" onClick={() => handleUpdateStatus('Approved')}>Approve</button>
                            </>
                        )}
                    </div>
                </div>
            ) : (
                <div className="text-center py-8 text-muted">
                    <p>No active RMA request for this ticket.</p>
                </div>
            )}

            {/* ========================================
                MODALS
               ======================================== */}

            {/* Request Modal */}
            {showRequestModal && createPortal(
                <div className="modal-overlay animate-fade-in" onClick={() => setShowRequestModal(false)}>
                    <div className="modal glass-card animate-slide-up" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="flex items-center gap-2">
                                <Package size={16} />
                                {hasRight('DIRECT_RMA_GENERATE', siteId) ? 'Direct RMA Creation' : 'Initiate RMA Request'}
                            </h3>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Reason for RMA *</label>
                                <textarea
                                    className="form-textarea"
                                    rows={3}
                                    value={requestReason}
                                    onChange={e => setRequestReason(e.target.value)}
                                    placeholder="Describe why this device needs repair/replacement..."
                                />
                            </div>
                            <div className="form-group mb-4 flex flex-col gap-3">
                                <label className="form-label text-[10px] uppercase font-bold opacity-70">RMA Type *</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        className={`btn btn-sm ${replacementSource === 'RepairOnly' ? 'btn-warning' : 'btn-outline'}`}
                                        onClick={() => setReplacementSource('RepairOnly')}
                                    >
                                        🔧 Repair Only
                                    </button>
                                    <button
                                        type="button"
                                        className={`btn btn-sm ${replacementSource === 'RepairAndReplace' ? 'btn-primary' : 'btn-outline'}`}
                                        onClick={() => setReplacementSource('RepairAndReplace')}
                                    >
                                        🔄 Repair & Site Replacement
                                    </button>
                                </div>

                                {replacementSource === 'RepairOnly' && (
                                    <div className="animate-fade-in p-3 bg-warning/10 rounded-lg border border-warning/30">
                                        <div className="flex items-start gap-2">
                                            <span className="text-xl">🔧</span>
                                            <div>
                                                <p className="text-sm font-bold text-warning-700">Repair Only</p>
                                                <p className="text-[10px] text-warning-600 mt-1">
                                                    The faulty device will be sent for repair. Once repaired,
                                                    the same device will be returned to this site for re-installation.
                                                    <strong> No replacement device</strong> will be sent.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {replacementSource === 'RepairAndReplace' && (
                                    <div className="animate-fade-in p-3 bg-primary/5 rounded-lg border border-primary/20">
                                        <div className="flex items-start gap-2">
                                            <span className="text-xl">🔄</span>
                                            <div>
                                                <p className="text-sm font-bold text-primary-700">Send for Repair & Site Replacement</p>
                                                <p className="text-[10px] text-primary-600 mt-1">
                                                    The faulty device will be sent for repair <strong>and</strong> a replacement device
                                                    will be arranged from HO / another site by the Admin.
                                                    <strong> L1 does not choose the stock source.</strong>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="form-group">
                                <label className="form-label text-[10px] uppercase font-bold opacity-70">Optional: Shipping Address</label>
                                <input
                                    className="form-input text-xs"
                                    value={shippingDetails.address}
                                    onChange={e => setShippingDetails({ ...shippingDetails, address: e.target.value })}
                                    placeholder="Where should the item be sent?"
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowRequestModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleRequestRMA}>
                                {hasRight('DIRECT_RMA_GENERATE', siteId) ? 'Create RMA' : 'Submit Request'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Send Item Modal (Step 2 - L1 sends item) */}
            {showSendItemModal && createPortal(
                <div className="modal-overlay animate-fade-in" onClick={() => setShowSendItemModal(false)}>
                    <div className="modal glass-card animate-slide-up" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="flex items-center gap-2">
                                <Send size={16} />
                                Send Item for Repair
                            </h3>
                        </div>
                        <div className="modal-body">
                            <div className="form-group mb-4">
                                <label className="form-label text-[10px] uppercase font-bold opacity-70">Where are you sending the item?</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        className={`btn btn-sm ${itemSendRoute === 'DirectToServiceCenter' ? 'btn-primary' : 'btn-outline'}`}
                                        onClick={() => setItemSendRoute('DirectToServiceCenter')}
                                    >
                                        📦 Direct to Service Center
                                    </button>
                                    <button
                                        type="button"
                                        className={`btn btn-sm ${itemSendRoute === 'ToHO' ? 'btn-warning' : 'btn-outline'}`}
                                        onClick={() => setItemSendRoute('ToHO')}
                                    >
                                        🏢 Send to Head Office
                                    </button>
                                </div>

                                {itemSendRoute === 'DirectToServiceCenter' && (
                                    <div className="animate-fade-in p-3 bg-primary/5 rounded-lg border border-primary/20 mt-3">
                                        <p className="text-[10px] text-primary-600">
                                            The item will be sent directly to the service center. Raise a ticket from the service center end, or mention the existing reference.
                                        </p>
                                    </div>
                                )}
                                {itemSendRoute === 'ToHO' && (
                                    <div className="animate-fade-in p-3 bg-warning/10 rounded-lg border border-warning/30 mt-3">
                                        <p className="text-[10px] text-warning-600">
                                            The item will be sent to the Head Office. Admin will acknowledge receipt and then forward it to the service center.
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="p-3 bg-secondary/10 rounded-lg border border-border/30">
                                <h4 className="text-[10px] font-bold mb-3 uppercase tracking-wider opacity-60 flex items-center gap-2">
                                    <Truck size={12} /> Logistics Details
                                </h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="form-group mb-0">
                                        <label className="form-label text-[10px]">Carrier / Courier</label>
                                        <input className="form-input" placeholder="e.g., BlueDart, FedEx" value={logisticsCarrier} onChange={e => setLogisticsCarrier(e.target.value)} />
                                    </div>
                                    <div className="form-group mb-0">
                                        <label className="form-label text-[10px]">Tracking Number</label>
                                        <input className="form-input" placeholder="AWB / Tracking #" value={logisticsTracking} onChange={e => setLogisticsTracking(e.target.value)} />
                                    </div>
                                </div>
                                <div className="form-group mt-3 mb-0">
                                    <label className="form-label text-[10px]">Remarks</label>
                                    <textarea className="form-input text-xs" rows={2} value={logisticsRemarks} onChange={e => setLogisticsRemarks(e.target.value)} placeholder="Any additional notes..." />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowSendItemModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSendItem}>
                                <Send size={14} /> {itemSendRoute === 'DirectToServiceCenter' ? 'Send to Service Center' : 'Send to HO'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Logistics Modal (generic - for admin shipping steps) */}
            {showLogisticsModal && createPortal(
                <div className="modal-overlay animate-fade-in" onClick={() => setShowLogisticsModal(false)}>
                    <div className="modal glass-card animate-slide-up" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="flex items-center gap-2">
                                <Truck size={16} />
                                {targetStatus === 'SentForRepairFromHO' ? 'Send to Service Center' : 'Ship to Site'}
                            </h3>
                        </div>
                        <div className="modal-body">
                            <div className="p-3 bg-secondary/10 rounded-lg border border-border/30">
                                <h4 className="text-[10px] font-bold mb-3 uppercase tracking-wider opacity-60 flex items-center gap-2">
                                    <Truck size={12} /> Shipping Details
                                </h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="form-group mb-0">
                                        <label className="form-label text-[10px]">Carrier / Courier</label>
                                        <input className="form-input" placeholder="e.g., BlueDart, FedEx" value={logisticsCarrier} onChange={e => setLogisticsCarrier(e.target.value)} />
                                    </div>
                                    <div className="form-group mb-0">
                                        <label className="form-label text-[10px]">Tracking Number</label>
                                        <input className="form-input" placeholder="AWB / Tracking #" value={logisticsTracking} onChange={e => setLogisticsTracking(e.target.value)} />
                                    </div>
                                </div>
                                {targetStatus === 'SentForRepairFromHO' && (
                                    <div className="form-group mt-3 mb-0">
                                        <label className="form-label text-[10px]">Service Center Ticket Reference (if any)</label>
                                        <input className="form-input" placeholder="Ticket # from service center" value={serviceCenterTicketRef} onChange={e => setServiceCenterTicketRef(e.target.value)} />
                                    </div>
                                )}
                                <div className="form-group mt-3 mb-0">
                                    <label className="form-label text-[10px]">Remarks</label>
                                    <textarea className="form-input text-xs" rows={2} value={logisticsRemarks} onChange={e => setLogisticsRemarks(e.target.value)} placeholder="Any additional notes..." />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowLogisticsModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={targetStatus === 'SentForRepairFromHO' ? handleSendForRepairFromHO : handleShipReturnToSite}>
                                <Send size={14} /> {targetStatus === 'SentForRepairFromHO' ? 'Send for Repair' : 'Ship to Site'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Install Device Modal */}
            {showInstallModal && createPortal(
                <div className="modal-overlay animate-fade-in" onClick={() => setShowInstallModal(false)}>
                    <div className="modal glass-card animate-slide-up" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="flex items-center gap-2">
                                <Settings size={16} />
                                Install Device & Update Details
                            </h3>
                        </div>
                        <div className="modal-body">
                            <div className="p-3 bg-success/5 rounded-lg border border-success/20 mb-4 animate-fade-in">
                                <p className="text-xs font-bold text-success-700 mb-1">Device Installation</p>
                                <p className="text-[10px] text-muted">
                                    Update the current details of the device after installation. These will be saved with the asset record.
                                </p>
                            </div>

                            <div className="form-group">
                                <label className="form-label">IP Address</label>
                                <input
                                    className="form-input font-mono"
                                    type="text"
                                    placeholder="e.g., 192.168.1.100"
                                    value={installIpAddress}
                                    onChange={e => setInstallIpAddress(e.target.value)}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="form-group mb-0">
                                    <label className="form-label">Device Username</label>
                                    <input
                                        className="form-input"
                                        type="text"
                                        placeholder="Enter username"
                                        value={installUserName}
                                        onChange={e => setInstallUserName(e.target.value)}
                                    />
                                </div>
                                <div className="form-group mb-0">
                                    <label className="form-label">Device Password</label>
                                    <input
                                        className="form-input"
                                        type="password"
                                        placeholder="Enter new password"
                                        value={installPassword}
                                        onChange={e => setInstallPassword(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="form-group mt-3">
                                <label className="form-label">Remarks</label>
                                <textarea
                                    className="form-textarea"
                                    rows={2}
                                    value={installRemarks}
                                    onChange={e => setInstallRemarks(e.target.value)}
                                    placeholder="Add any notes about the installation..."
                                />
                            </div>
                            <p className="text-[10px] text-muted italic mt-2">
                                Leave password blank to keep the existing one. Credentials are stored securely.
                            </p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowInstallModal(false)}>Cancel</button>
                            <button className="btn btn-success" onClick={handleInstallDevice}>
                                <Settings size={14} /> Complete Installation
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Replacement Requisition Modal (Admin only) */}
            {showReplacementModal && createPortal(
                <div className="modal-overlay animate-fade-in" onClick={() => setShowReplacementModal(false)}>
                    <div className="modal glass-card animate-slide-up" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="flex items-center gap-2">
                                <ShoppingBag size={16} />
                                Raise Replacement Requisition
                            </h3>
                        </div>
                        <div className="modal-body">
                            <div className="p-3 bg-info/5 rounded-lg border border-info/20 mb-4 animate-fade-in">
                                <p className="text-xs font-bold text-info-700 mb-1">Stock Transfer Requisition</p>
                                <p className="text-[10px] text-muted">
                                    Select the source of the replacement stock. A requisition and stock transfer will be created automatically.
                                </p>
                            </div>

                            <div className="form-group mb-4">
                                <label className="form-label text-[10px] uppercase font-bold opacity-70">Replacement Source *</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        type="button"
                                        className={`btn btn-sm ${replacementStockSource === 'HOStock' ? 'btn-primary' : 'btn-outline'}`}
                                        onClick={() => setReplacementStockSource('HOStock')}
                                    >
                                        🏢 HO Stock
                                    </button>
                                    <button
                                        type="button"
                                        className={`btn btn-sm ${replacementStockSource === 'SiteStock' ? 'btn-warning' : 'btn-outline'}`}
                                        onClick={() => setReplacementStockSource('SiteStock')}
                                    >
                                        📦 Site Stock
                                    </button>
                                    <button
                                        type="button"
                                        className={`btn btn-sm ${replacementStockSource === 'Market' ? 'btn-info' : 'btn-outline'}`}
                                        onClick={() => setReplacementStockSource('Market')}
                                    >
                                        🛒 Market
                                    </button>
                                </div>

                                {replacementStockSource === 'HOStock' && (
                                    <div className="animate-fade-in p-3 bg-primary/5 rounded-lg border border-primary/20 mt-3">
                                        <p className="text-[10px] text-primary-600">
                                            Replacement will be sourced from Head Office stock. A stock transfer requisition will be created for HO → Site.
                                        </p>
                                    </div>
                                )}
                                {replacementStockSource === 'SiteStock' && (
                                    <div className="animate-fade-in p-3 bg-warning/10 rounded-lg border border-warning/30 mt-3">
                                        <p className="text-[10px] text-warning-600 mb-2">
                                            Replacement will be sourced from another site's stock. A site-to-site stock transfer will be created.
                                        </p>
                                        <div className="form-group mb-0">
                                            <label className="form-label text-[10px]">Source Site ID</label>
                                            <input
                                                className="form-input text-xs"
                                                placeholder="Enter source site ID..."
                                                value={replacementSourceSiteId}
                                                onChange={e => setReplacementSourceSiteId(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                )}
                                {replacementStockSource === 'Market' && (
                                    <div className="animate-fade-in p-3 bg-info/5 rounded-lg border border-info/20 mt-3">
                                        <p className="text-[10px] text-info-600">
                                            Replacement will be purchased from the market. Proceed with dispatch once the item is procured.
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="form-group">
                                <label className="form-label text-[10px] uppercase font-bold opacity-70">Remarks</label>
                                <textarea
                                    className="form-textarea text-xs"
                                    rows={2}
                                    value={actionRemark}
                                    onChange={e => setActionRemark(e.target.value)}
                                    placeholder="Any additional notes about the requisition..."
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowReplacementModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleRaiseReplacementRequisition}>
                                <ShoppingBag size={14} /> Raise Requisition
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Replacement Dispatch Modal (Admin only) */}
            {showReplacementDispatchModal && createPortal(
                <div className="modal-overlay animate-fade-in" onClick={() => setShowReplacementDispatchModal(false)}>
                    <div className="modal glass-card animate-slide-up" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="flex items-center gap-2">
                                <Truck size={16} />
                                Dispatch Replacement to Site
                            </h3>
                        </div>
                        <div className="modal-body">
                            <div className="p-3 bg-secondary/10 rounded-lg border border-border/30">
                                <h4 className="text-[10px] font-bold mb-3 uppercase tracking-wider opacity-60 flex items-center gap-2">
                                    <Truck size={12} /> Shipping Details
                                </h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="form-group mb-0">
                                        <label className="form-label text-[10px]">Carrier / Courier</label>
                                        <input className="form-input" placeholder="e.g., BlueDart, FedEx" value={replLogisticsCarrier} onChange={e => setReplLogisticsCarrier(e.target.value)} />
                                    </div>
                                    <div className="form-group mb-0">
                                        <label className="form-label text-[10px]">Tracking Number</label>
                                        <input className="form-input" placeholder="AWB / Tracking #" value={replLogisticsTracking} onChange={e => setReplLogisticsTracking(e.target.value)} />
                                    </div>
                                </div>
                                <div className="form-group mt-3 mb-0">
                                    <label className="form-label text-[10px]">Remarks</label>
                                    <textarea className="form-input text-xs" rows={2} value={replLogisticsRemarks} onChange={e => setReplLogisticsRemarks(e.target.value)} placeholder="Any notes about the shipment..." />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowReplacementDispatchModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleDispatchReplacement}>
                                <Truck size={14} /> Dispatch
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* History Modal */}
            {showHistoryModal && createPortal(
                <div className="modal-overlay animate-fade-in" onClick={() => setShowHistoryModal(false)}>
                    <div className="modal glass-card animate-slide-up max-w-xl" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="flex items-center gap-2">
                                <History size={20} />
                                Replacement History
                            </h3>
                        </div>
                        <div className="modal-body">
                            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                                {rmaHistory?.map((h) => (
                                    <div key={h._id} className="p-3 bg-secondary/10 rounded-lg border border-border/30 hover:border-primary-500/30 transition-all">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-xs text-primary-500">Ticket: {h.ticketId?.ticketNumber || 'N/A'}</span>
                                                <span className="font-mono text-[10px] text-muted">{h.rmaNumber}</span>
                                            </div>
                                            <span className="text-[9px] uppercase font-bold text-muted bg-secondary/50 px-2 py-0.5 rounded-full">
                                                {new Date(h.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 text-xs">
                                            <div>
                                                <span className="block text-[10px] text-muted mb-1 uppercase tracking-wider opacity-60">Original S/N</span>
                                                <span className="font-mono text-[11px]">{h.originalDetailsSnapshot?.serialNumber || 'N/A'}</span>
                                            </div>
                                            <div>
                                                <span className="block text-[10px] text-muted mb-1 uppercase tracking-wider opacity-60">New S/N</span>
                                                <span className="font-mono text-[11px] text-success-500 font-bold">{h.replacementDetails?.serialNumber || 'Pending'}</span>
                                            </div>
                                            <div className="col-span-2 pt-2 border-t border-border/20">
                                                <span className="block text-[10px] text-muted mb-1 uppercase tracking-wider opacity-60">Reason</span>
                                                <span className="italic text-xs">"{h.requestReason}"</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {(!rmaHistory || rmaHistory.length === 0) && (
                                    <div className="text-center py-8 text-muted italic text-sm">No history found.</div>
                                )}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowHistoryModal(false)}>Close</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default RMASection;
