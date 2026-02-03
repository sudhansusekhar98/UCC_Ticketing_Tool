import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { rmaApi, assetUpdateRequestApi, stockApi, sitesApi } from '../../services/api';
import { toast } from 'react-hot-toast';
import { Package, Truck, CheckCircle, AlertTriangle, Clock, Server, FileText, History, Hash, Info, Settings, RefreshCw, Trash2, MessageSquare, Cpu } from 'lucide-react';
import useAuthStore from '../../context/authStore';

const RMASection = ({ ticketId, siteId, assetId, ticketStatus, isLocked, onUpdate }) => {
    const navigate = useNavigate();
    const { user, hasRole, hasRight } = useAuthStore();
    const [rma, setRma] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [showProcessModal, setShowProcessModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);

    // Form States
    const [requestReason, setRequestReason] = useState('');
    const [shippingDetails, setShippingDetails] = useState({ address: '', trackingNumber: '', carrier: '' });
    const [vendorDetails, setVendorDetails] = useState({ vendorName: '', orderId: '', cost: '' });
    const [actionRemark, setActionRemark] = useState('');
    const [isSiteStockUsed, setIsSiteStockUsed] = useState(false);
    const [faultyItemAction, setFaultyItemAction] = useState('Repair');
    const [deliveredItemDestination, setDeliveredItemDestination] = useState('SiteInstalled');
    const [repairedItemDestination, setRepairedItemDestination] = useState('BackToSite');

    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [installationStatus, setInstallationStatus] = useState('Installed & Working');
    const [confirmRemark, setConfirmRemark] = useState('');

    const [rmaHistory, setRmaHistory] = useState([]);
    const [replacementSource, setReplacementSource] = useState('Market');
    const [availableStock, setAvailableStock] = useState({ localSpares: [], hoSpares: [] });
    const [selectedReservedAssetId, setSelectedReservedAssetId] = useState('');
    const [newIpAddress, setNewIpAddress] = useState('');
    const [newUserName, setNewUserName] = useState('');
    const [newPassword, setNewPassword] = useState('');

    const [repairedItemDestinationSiteId, setRepairedItemDestinationSiteId] = useState('');
    const [sites, setSites] = useState([]);

    // Update Asset Modal states (Step 4)
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [updateFields, setUpdateFields] = useState({
        serialNumber: '',
        mac: '',
        ipAddress: '',
        userName: '',
        password: ''
    });
    const [updateToken, setUpdateToken] = useState(null);

    useEffect(() => {
        if (ticketId) loadRMA();
        if (assetId) loadHistory();
        loadSites();
    }, [ticketId, assetId]);

    const loadSites = async () => {
        try {
            const res = await sitesApi.getDropdown();
            setSites(res.data.data || res.data || []);
        } catch (error) {
            console.error('Failed to load sites', error);
        }
    };

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
            const rmaData = res.data.data;
            setRma(rmaData);
            if (rmaData) {
                setDeliveredItemDestination(rmaData.deliveredItemDestination || 'SiteInstalled');
                setRepairedItemDestination(rmaData.repairedItemDestination || 'BackToSite');
            }
        } catch (error) {
            setRma(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (showRequestModal && ticketId) {
            loadStockAvailability();
        }
    }, [showRequestModal, ticketId]);

    const loadStockAvailability = async () => {
        try {
            const res = await stockApi.getAvailability(ticketId);
            setAvailableStock(res.data.data || { localSpares: [], hoSpares: [] });
        } catch (error) {
            console.error('Failed to load stock availability', error);
            setAvailableStock({ localSpares: [], hoSpares: [] });
        }
    };

    const handleRequestRMA = async () => {
        if (!requestReason.trim()) return toast.error('Reason is required');

        // Validate that asset is selected for stock-based replacements
        if ((replacementSource === 'HOStock' || replacementSource === 'SiteStock') && !selectedReservedAssetId) {
            return toast.error(`Please select a device from ${replacementSource === 'HOStock' ? 'HO' : 'Site'} Stock`);
        }

        try {
            await rmaApi.create({
                ticketId,
                requestReason,
                shippingDetails: shippingDetails.address ? shippingDetails : undefined,
                isSiteStockUsed: replacementSource === 'SiteStock',
                faultyItemAction: (replacementSource === 'SiteStock' || replacementSource === 'HOStock') ? faultyItemAction : 'None',
                replacementSource,
                reservedAssetId: (replacementSource === 'HOStock' || replacementSource === 'SiteStock') ? selectedReservedAssetId : undefined
            });
            toast.success('RMA Requested');
            setShowRequestModal(false);
            loadRMA();
            if (onUpdate) onUpdate();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to request RMA');
        }
    };

    const handleUpdateStatus = async (status) => {
        try {
            const data = { status, remarks: actionRemark };
            if (status === 'Ordered') data.vendorDetails = vendorDetails;
            if (status === 'Dispatched') data.shippingDetails = shippingDetails;
            if (status === 'Received') data.deliveredItemDestination = deliveredItemDestination;
            if (status === 'Repaired') {
                data.repairedItemDestination = repairedItemDestination;
                if (repairedItemDestination === 'OtherSite') {
                    data.repairedItemDestinationSiteId = repairedItemDestinationSiteId;
                }
            }

            if (status === 'TransferredToOtherSite') {
                data.repairedItemDestinationSiteId = repairedItemDestinationSiteId;
            }

            await rmaApi.updateStatus(rma._id, data);
            toast.success(`RMA status updated to ${status}`);
            setShowProcessModal(false);
            loadRMA();
            if (onUpdate) onUpdate();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update status');
        }
    };

    const handleInitiateAssetUpdate = async () => {
        try {
            const response = await assetUpdateRequestApi.initiate({
                rmaId: rma._id,
                ticketId: ticketId,
                assetId: assetId
            });

            const { accessToken } = response.data.data;
            setUpdateToken(accessToken);

            // Pre-fill with current rma replacement details or asset details
            setUpdateFields({
                serialNumber: rma.replacementDetails?.serialNumber || '',
                mac: rma.replacementDetails?.mac || '',
                ipAddress: rma.replacementDetails?.ipAddress || '',
                userName: rma.replacementDetails?.userName || '',
                password: ''
            });

            toast.success('Access granted! Opening update form...');
            setShowUpdateModal(true);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to initiate asset update');
        }
    };

    const handleSubmitAssetUpdate = async () => {
        if (!updateToken) return;
        setLoading(true);
        try {
            await assetUpdateRequestApi.submit(updateToken, updateFields);
            toast.success('Asset updates submitted for approval!');
            setShowUpdateModal(false);
            setUpdateToken(null);
            loadRMA(); // Refresh state
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to submit updates');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmInstallation = async () => {
        try {
            await rmaApi.confirmInstallation(rma._id, {
                status: installationStatus,
                remarks: confirmRemark,
                newIpAddress: newIpAddress,
                newUserName: newUserName,
                newPassword: newPassword
            });
            toast.success('Installation status confirmed');
            setShowConfirmModal(false);
            loadRMA();
            if (onUpdate) onUpdate();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to confirm installation');
        }
    };

    // Helper to open installation modal with pre-filled credentials
    const openInstallationModal = () => {
        // Pre-fill with existing asset/RMA data
        setNewIpAddress(rma?.originalDetailsSnapshot?.ipAddress || '');
        setNewUserName(rma?.originalDetailsSnapshot?.userName || '');
        setNewPassword(''); // Don't pre-fill password for security
        setInstallationStatus('Installed & Working');
        setConfirmRemark('');
        setShowConfirmModal(true);
    };

    if (loading) return <div className="p-4 text-center">Loading RMA details...</div>;

    const canManageRMA = hasRole(['Admin', 'Supervisor', 'Dispatcher']);
    const canInstall = hasRole(['Admin', 'Supervisor', 'L1Engineer', 'L2Engineer']);

    // Render Timeline Step
    const renderStep = (status, icon, label, date, active) => (
        <div className={`rma-step ${active ? 'active' : ''}`}>
            <div className="rma-step-icon">
                {icon}
            </div>
            <span className="rma-step-label">{label}</span>
            {date && <span className="rma-step-date">{new Date(date).toLocaleDateString()}</span>}
        </div>
    );

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
                            {renderStep('Requested', <FileText size={14} />, 'Requested', rma.createdAt, true)}
                            {renderStep('Approved', <CheckCircle size={14} />, 'Approved', rma.approvedOn, rma.status !== 'Requested' && rma.status !== 'Rejected')}

                            {/* Market Procurement Flow */}
                            {rma.replacementSource === 'Market' && (
                                <>
                                    {renderStep('Logistics', <Package size={14} />, 'Logistics', null, ['Ordered', 'Dispatched', 'Received', 'Installed', 'TransferredToSiteStore', 'TransferredToHOStock'].includes(rma.status))}
                                    {renderStep('Received', <Truck size={14} />, 'Received', null, ['Received', 'Installed', 'TransferredToSiteStore', 'TransferredToHOStock'].includes(rma.status))}
                                </>
                            )}

                            {/* HO Stock Transfer Flow */}
                            {rma.replacementSource === 'HOStock' && (
                                <>
                                    {renderStep('Transfer', <Truck size={14} />, 'Dispatched', null, ['AwaitingStockTransfer', 'StockInTransit', 'StockReceived', 'InRepair', 'Repaired', 'Installed', 'TransferredToSiteStore', 'TransferredToHOStock'].includes(rma.status))}
                                    {renderStep('StockReceived', <Package size={14} />, 'Received', null, ['StockReceived', 'InRepair', 'Repaired', 'Installed', 'TransferredToSiteStore', 'TransferredToHOStock'].includes(rma.status))}
                                    {renderStep('Installed', <CheckCircle size={14} />, 'Installed', rma.installedOn, (rma.isInstallationConfirmed && rma.installationStatus === 'Installed & Working') || ['Repaired', 'TransferredToSiteStore', 'TransferredToHOStock'].includes(rma.status))}
                                </>
                            )}

                            {/* Repair-only Flow */}
                            {rma.replacementSource === 'Repair' && (
                                <>
                                    {renderStep('InRepair', <AlertTriangle size={14} />, 'In Repair', rma.repairDispatchDate, ['InRepair', 'Repaired', 'RepairedItemEnRoute', 'RepairedItemReceived'].includes(rma.status))}
                                    {renderStep('Repaired', <CheckCircle size={14} />, 'Repaired', rma.repairReceivedDate, ['Repaired', 'RepairedItemEnRoute', 'RepairedItemReceived'].includes(rma.status))}
                                    {renderStep('Returned', <Truck size={14} />, 'Returned', null, ['RepairedItemEnRoute', 'RepairedItemReceived'].includes(rma.status))}
                                </>
                            )}

                            {/* Faulty Item Repair (for Site/HO Stock flows) */}
                            {(rma.replacementSource === 'SiteStock' || rma.replacementSource === 'HOStock') && rma.faultyItemAction === 'Repair' && (
                                <>
                                    {!['Repaired', 'TransferredToSiteStore', 'TransferredToHOStock'].includes(rma.status) &&
                                        renderStep('InRepair', <AlertTriangle size={14} />, 'In Repair', null, rma.status === 'InRepair')}
                                    {['Repaired', 'TransferredToSiteStore', 'TransferredToHOStock'].includes(rma.status) &&
                                        renderStep('Repaired', <CheckCircle size={14} />, 'Repaired', null, true)}
                                </>
                            )}

                            {renderStep('Finished', <CheckCircle size={14} />, 'Finished', rma.installedOn || rma.updatedAt, ['Installed', 'TransferredToSiteStore', 'TransferredToHOStock', 'Discarded', 'RepairedItemReceived'].includes(rma.status))}
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
                                    <span className={`badge badge-${['Installed', 'TransferredToSiteStore', 'TransferredToHOStock'].includes(rma.status) ? 'success' : 'warning'}`}>{rma.status}</span>
                                </div>
                            </div>
                            {rma.isInstallationConfirmed && (
                                <div className="rma-detail-item">
                                    <span className="detail-label"><Settings size={12} /> Installation</span>
                                    <div className="detail-value">
                                        <span className={`badge badge-${rma.installationStatus === 'Installed & Working' ? 'success' : rma.installationStatus === 'Not Installed' ? 'warning' : 'danger'}`}>
                                            {rma.installationStatus}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Group 2: Logic & Logistics */}
                        {(rma.replacementSource || (rma.faultyItemAction && rma.faultyItemAction !== 'None')) && (
                            <div className="rma-info-group">
                                {rma.replacementSource && (
                                    <div className="rma-detail-item">
                                        <span className="detail-label"><RefreshCw size={12} /> Replacement Source</span>
                                        <div className="detail-value text-xs font-bold uppercase">
                                            {rma.replacementSource}
                                        </div>
                                    </div>
                                )}
                                {rma.faultyItemAction && rma.faultyItemAction !== 'None' && (
                                    <div className="rma-detail-item">
                                        <span className="detail-label"><Trash2 size={12} /> Faulty Item Fate</span>
                                        <div className="detail-value text-xs font-bold uppercase">{rma.faultyItemAction}</div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Group 3: Request Context */}
                        <div className="rma-info-group">
                            <div className="rma-detail-item full-width">
                                <span className="detail-label"><MessageSquare size={12} /> Request Reason</span>
                                <div className="detail-value">{rma.requestReason}</div>
                            </div>
                        </div>

                        {/* Group 4: Replacement Specifications */}
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
                                        {rma.replacementDetails.userName && (
                                            <div className="tech-tag">
                                                <span>USER:</span> <span>{rma.replacementDetails.userName}</span>
                                            </div>
                                        )}
                                        {rma.replacementDetails.password && (
                                            <div className="tech-tag">
                                                <span>PASS:</span> <span>••••••••</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Alert: Stock Received - Awaiting Installation */}
                    {rma && rma.status === 'StockReceived' && !rma.isInstallationConfirmed && (
                        <div className="rma-finalization-alert status-received animate-fade-in">
                            <div className="rma-alert-info">
                                <Package size={20} className="text-primary-500" />
                                <div className="rma-alert-text">
                                    <p className="alert-title">Replacement Device Received at Site</p>
                                    <p className="alert-desc">
                                        The replacement device from HO Stock has arrived. Please install the device and update the connectivity credentials to complete this step.
                                    </p>
                                </div>
                            </div>
                            <div className="rma-alert-actions">
                                <button
                                    className="btn btn-sm btn-success shadow-sm flex items-center gap-1 animate-pulse"
                                    onClick={openInstallationModal}
                                >
                                    <Server size={14} /> Install & Update Credentials
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    {rma && rma.isInstallationConfirmed && !rma.isFaultyItemFinalized && (
                        <div className={`rma-finalization-alert ${rma.status === 'Repaired' ? 'status-repaired' : rma.status === 'InRepair' ? 'status-in-repair' : ''}`}>
                            <div className="rma-alert-info">
                                {rma.status === 'InRepair' ? (
                                    <RefreshCw size={20} className="text-warning-500 animate-spin" style={{ animationDuration: '3s' }} />
                                ) : rma.status === 'Repaired' ? (
                                    <CheckCircle size={20} className="text-success-500" />
                                ) : (
                                    <AlertTriangle size={20} />
                                )}
                                <div className="rma-alert-text">
                                    <p className="alert-title">
                                        {rma.status === 'InRepair' ? 'Item Currently In Repair' :
                                            rma.status === 'Repaired' ? 'Repaired Item Ready for Transfer' :
                                                'Faulty Item Finalization Required'}
                                    </p>
                                    <p className="alert-desc">
                                        {rma.status === 'InRepair'
                                            ? 'The faulty device is at the service center. Mark as repaired once received back.'
                                            : rma.status === 'Repaired'
                                                ? 'The device has been successfully repaired. Please specify its next destination.'
                                                : 'Please record the fate of the removed faulty hardware to finalize this RMA.'}
                                    </p>
                                </div>
                            </div>
                            <div className="rma-alert-actions">
                                {rma.status === 'InRepair' ? (
                                    <button className="btn btn-xs btn-success shadow-sm" onClick={() => handleUpdateStatus('Repaired')}>
                                        <CheckCircle size={12} /> Mark as Repaired
                                    </button>
                                ) : (
                                    <>
                                        <button className="btn btn-xs btn-primary shadow-sm" onClick={() => handleUpdateStatus('TransferredToSiteStore')}>Move to Site Store</button>
                                        <button className="btn btn-xs btn-success" onClick={() => handleUpdateStatus('TransferredToHOStock')}>Ship to HO Stock</button>
                                        <button className="btn btn-xs btn-outline-primary" onClick={() => { setRepairedItemDestination('OtherSite'); setShowProcessModal(true); }}>Transfer elsewhere</button>
                                    </>
                                )}
                                <button className="btn btn-xs btn-outline-danger" onClick={() => handleUpdateStatus('Discarded')}>Mark as Discarded</button>
                            </div>
                        </div>
                    )}

                    <div className="rma-actions-wrapper">
                        {canManageRMA && rma.status === 'Requested' && (
                            <>
                                <button className="btn btn-sm btn-danger px-3" onClick={() => handleUpdateStatus('Rejected')}>Reject</button>
                                <button className="btn btn-sm btn-success px-3" onClick={() => handleUpdateStatus('Approved')}>Approve</button>
                            </>
                        )}

                        {canManageRMA && ['Approved', 'Ordered', 'Dispatched', 'Received', 'InRepair', 'Repaired', 'Installed', 'AwaitingStockTransfer', 'StockInTransit', 'RepairedItemEnRoute'].includes(rma.status) && (
                            <button className="btn btn-sm btn-primary flex items-center gap-1" onClick={() => { setActionRemark('Logistics/Status Update'); setShowProcessModal(true); }}>
                                <Truck size={14} /> Update Logistics / Status
                            </button>
                        )}

                        {/* HO Stock Transfer Flow */}
                        {canManageRMA && rma.status === 'AwaitingStockTransfer' && (
                            <button className="btn btn-sm btn-primary flex items-center gap-1" onClick={() => handleUpdateStatus('StockInTransit')}>
                                <Truck size={14} /> Mark Stock Dispatched
                            </button>
                        )}

                        {canManageRMA && rma.status === 'StockInTransit' && (
                            <button className="btn btn-sm btn-success flex items-center gap-1" onClick={() => handleUpdateStatus('StockReceived')}>
                                <CheckCircle size={14} /> Confirm Stock Received at Site
                            </button>
                        )}

                        {/* HO Stock Flow: After Stock Received, Install the device with credentials */}
                        {canInstall && rma.status === 'StockReceived' && !rma.isInstallationConfirmed && (
                            <button className="btn btn-sm btn-success flex items-center gap-1 animate-pulse" onClick={openInstallationModal}>
                                <Server size={14} /> Install & Update Credentials
                            </button>
                        )}

                        {/* Repair-only Flow */}
                        {canManageRMA && rma.status === 'InRepair' && (
                            <button className="btn btn-sm btn-success flex items-center gap-1" onClick={() => handleUpdateStatus('Repaired')}>
                                <CheckCircle size={14} /> Mark as Repaired
                            </button>
                        )}

                        {canManageRMA && rma.status === 'Repaired' && rma.replacementSource === 'Repair' && (
                            <button className="btn btn-sm btn-primary flex items-center gap-1" onClick={() => handleUpdateStatus('RepairedItemEnRoute')}>
                                <Truck size={14} /> Ship Repaired Item
                            </button>
                        )}

                        {canManageRMA && rma.status === 'RepairedItemEnRoute' && (
                            <button className="btn btn-sm btn-success flex items-center gap-1" onClick={() => handleUpdateStatus('RepairedItemReceived')}>
                                <CheckCircle size={14} /> Confirm Repaired Item Received
                            </button>
                        )}

                        {canManageRMA && (rma.status === 'Approved' || (rma.isSiteStockUsed && !['InRepair', 'Repaired', 'Discarded', 'TransferredToSiteStore', 'TransferredToHOStock'].includes(rma.status))) && (
                            <button className="btn btn-sm btn-outline-warning flex items-center gap-1" onClick={() => handleUpdateStatus('InRepair')}>
                                <AlertTriangle size={14} /> Send for Repair
                            </button>
                        )}

                        {canManageRMA && (rma.status === 'Approved' || (rma.isSiteStockUsed && !['Discarded', 'TransferredToSiteStore', 'TransferredToHOStock'].includes(rma.status))) && (
                            <button className="btn btn-sm btn-outline-danger flex items-center gap-1" onClick={() => handleUpdateStatus('Discarded')}>
                                <FileText size={14} /> Mark Discarded
                            </button>
                        )}

                        {canInstall && (['Dispatched', 'Received', 'Ordered'].includes(rma.status) || (rma.isSiteStockUsed && rma.status === 'Approved')) && (
                            <button className="btn btn-sm btn-success flex items-center gap-1" onClick={handleInitiateAssetUpdate}>
                                <Server size={14} /> Update Asset Details
                            </button>
                        )}

                        {canInstall && (rma.status === 'Received' || rma.status === 'Repaired' || rma.status === 'Installed' || rma.status === 'RepairedItemReceived') && !rma.isInstallationConfirmed && (
                            <button className="btn btn-sm btn-primary flex items-center gap-1" onClick={openInstallationModal}>
                                <CheckCircle size={14} /> Confirm Installation
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <div className="text-center py-8 text-muted">
                    <p>No active RMA request for this ticket.</p>
                </div>
            )}

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
                                <label className="form-label">Reason for Replacement *</label>
                                <textarea
                                    className="form-textarea"
                                    rows={3}
                                    value={requestReason}
                                    onChange={e => setRequestReason(e.target.value)}
                                    placeholder="Describe why this device needs replacement..."
                                />
                            </div>
                            <div className="form-group mb-4 flex flex-col gap-3">
                                <label className="form-label text-[10px] uppercase font-bold opacity-70">Replacement Source *</label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    <button
                                        type="button"
                                        className={`btn btn-xs ${replacementSource === 'Market' ? 'btn-primary' : 'btn-outline'}`}
                                        onClick={() => setReplacementSource('Market')}
                                    >
                                        Procure (Market)
                                    </button>
                                    <button
                                        type="button"
                                        className={`btn btn-xs ${replacementSource === 'SiteStock' ? 'btn-primary' : 'btn-outline'}`}
                                        onClick={() => setReplacementSource('SiteStock')}
                                    >
                                        From Site Stock
                                    </button>
                                    <button
                                        type="button"
                                        className={`btn btn-xs ${replacementSource === 'HOStock' ? 'btn-primary' : 'btn-outline'}`}
                                        onClick={() => setReplacementSource('HOStock')}
                                    >
                                        From HO Stock
                                    </button>
                                    <button
                                        type="button"
                                        className={`btn btn-xs ${replacementSource === 'Repair' ? 'btn-warning' : 'btn-outline'}`}
                                        onClick={() => setReplacementSource('Repair')}
                                        title="Send faulty item for repair without replacement (item returns after repair)"
                                    >
                                        Repair Only
                                    </button>
                                </div>

                                {replacementSource === 'HOStock' && (
                                    <div className="animate-fade-in p-3 bg-primary/5 rounded-lg border border-primary/20">
                                        <label className="form-label text-[10px] uppercase font-bold text-primary-600 mb-1 block">Choose Device from HO Stock</label>
                                        <select
                                            className="form-input text-xs"
                                            value={selectedReservedAssetId}
                                            onChange={e => setSelectedReservedAssetId(e.target.value)}
                                        >
                                            <option value="">-- Select a Device --</option>
                                            {availableStock.hoSpares?.map(asset => (
                                                <option key={asset._id} value={asset._id}>
                                                    {asset.serialNumber} ({asset.make} {asset.model})
                                                </option>
                                            ))}
                                        </select>
                                        {availableStock.hoSpares?.length === 0 && (
                                            <p className="text-[10px] text-danger italic mt-1">No items available in HO Stock for this asset type.</p>
                                        )}
                                    </div>
                                )}

                                {replacementSource === 'SiteStock' && (
                                    <div className="animate-fade-in p-3 bg-success/5 rounded-lg border border-success/20">
                                        <label className="form-label text-[10px] uppercase font-bold text-success-600 mb-1 block">Choose Device from Site Stock</label>
                                        <select
                                            className="form-input text-xs"
                                            value={selectedReservedAssetId}
                                            onChange={e => setSelectedReservedAssetId(e.target.value)}
                                        >
                                            <option value="">-- Select a Device --</option>
                                            {availableStock.localSpares?.map(asset => (
                                                <option key={asset._id} value={asset._id}>
                                                    {asset.serialNumber} ({asset.make} {asset.model})
                                                </option>
                                            ))}
                                        </select>
                                        {availableStock.localSpares?.length === 0 && (
                                            <p className="text-[10px] text-danger italic mt-1">No items available in Site Stock for this asset type.</p>
                                        )}
                                    </div>
                                )}

                                {replacementSource === 'Repair' && (
                                    <div className="animate-fade-in p-3 bg-warning/10 rounded-lg border border-warning/30">
                                        <div className="flex items-start gap-2">
                                            <span className="text-xl"></span>
                                            <div>
                                                <p className="text-sm font-bold text-warning-700">Repair Only Mode</p>
                                                <p className="text-[10px] text-warning-600 mt-1">
                                                    The faulty device will be sent to the service center for repair.
                                                    <strong> No replacement</strong> will be issued. Once repaired,
                                                    the same device will be returned to this site for re-installation.
                                                </p>
                                                <p className="text-[10px] text-muted italic mt-2">
                                                    Use this when: No stock is available, or the device can be repaired quickly.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {(replacementSource === 'SiteStock' || replacementSource === 'HOStock') && (
                                    <div className="animate-fade-in p-3 bg-warning/5 rounded-lg border border-warning/20">
                                        <label className="form-label text-[10px] uppercase font-bold text-warning-600 mb-1 block">Fate of faulty item</label>
                                        <select
                                            className="form-input text-xs"
                                            value={faultyItemAction}
                                            onChange={e => setFaultyItemAction(e.target.value)}
                                        >
                                            <option value="Repair">Send for Repair</option>
                                            <option value="Discard">Discard (Completely faulty)</option>
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div className="form-group">
                                <label className="form-label text-[10px] uppercase font-bold opacity-70">Optional: Shipping Address</label>
                                <input
                                    className="form-input text-xs"
                                    value={shippingDetails.address}
                                    onChange={e => setShippingDetails({ ...shippingDetails, address: e.target.value })}
                                    placeholder="Where should the replacement be sent?"
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

            {/* Process/Admin Modal */}
            {showProcessModal && createPortal(
                <div className="modal-overlay animate-fade-in" onClick={() => setShowProcessModal(false)}>
                    <div className="modal glass-card animate-slide-up" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="flex items-center gap-2">
                                <Truck size={16} />
                                Update RMA Logistics
                            </h3>
                        </div>

                        <div className="modal-body">
                            <div className="p-3 bg-secondary/10 rounded-lg mb-4 border border-border/30">
                                <h4 className="text-[10px] font-bold mb-3 uppercase tracking-wider opacity-60 flex items-center gap-2">
                                    <Package size={12} /> Vendor & Order
                                </h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="form-group mb-0">
                                        <label className="form-label text-[10px]">Vendor Name</label>
                                        <input className="form-input" placeholder="Vendor Name" value={vendorDetails.vendorName} onChange={e => setVendorDetails({ ...vendorDetails, vendorName: e.target.value })} />
                                    </div>
                                    <div className="form-group mb-0">
                                        <label className="form-label text-[10px]">Order ID</label>
                                        <input className="form-input" placeholder="Order ID" value={vendorDetails.orderId} onChange={e => setVendorDetails({ ...vendorDetails, orderId: e.target.value })} />
                                    </div>
                                </div>
                            </div>

                            <div className="p-3 bg-secondary/10 rounded-lg border border-border/30">
                                <h4 className="text-[10px] font-bold mb-3 uppercase tracking-wider opacity-60 flex items-center gap-2">
                                    <Truck size={12} /> Shipping & Tracking
                                </h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="form-group mb-0">
                                        <label className="form-label text-[10px]">Carrier</label>
                                        <input className="form-input" placeholder="Carrier" value={shippingDetails.carrier} onChange={e => setShippingDetails({ ...shippingDetails, carrier: e.target.value })} />
                                    </div>
                                    <div className="form-group mb-0">
                                        <label className="form-label text-[10px]">Tracking Number</label>
                                        <input className="form-input" placeholder="Tracking Number" value={shippingDetails.trackingNumber} onChange={e => setShippingDetails({ ...shippingDetails, trackingNumber: e.target.value })} />
                                    </div>
                                </div>
                            </div>

                            {/* Destination Selectors */}
                            {(rma.status === 'Dispatched' || rma.status === 'Ordered') && (
                                <div className="p-3 bg-success/5 rounded-lg border border-success/20 mt-3">
                                    <label className="form-label text-[10px] uppercase font-bold text-success-700 mb-2 block">Item Destination upon receipt</label>
                                    <select
                                        className="form-input text-xs"
                                        value={deliveredItemDestination}
                                        onChange={e => setDeliveredItemDestination(e.target.value)}
                                    >
                                        <option value="SiteInstalled">Install at Site (Standard)</option>
                                        <option value="SiteStore">Move to Site Store (Spare)</option>
                                        <option value="HOStock">Transfer to HO Stock</option>
                                    </select>
                                </div>
                            )}

                            {rma.status === 'InRepair' && (
                                <div className="p-3 bg-warning/5 rounded-lg border border-warning/20 mt-3">
                                    <label className="form-label text-[10px] uppercase font-bold text-warning-700 mb-2 block">Destination after repair</label>
                                    <select
                                        className="form-input text-xs"
                                        value={repairedItemDestination}
                                        onChange={e => setRepairedItemDestination(e.target.value)}
                                    >
                                        <option value="BackToSite">Send back to Site (for Installation)</option>
                                        <option value="SiteStore">Move to Site Store (as Spare)</option>
                                        <option value="HOStock">Transfer to HO Stock</option>
                                        <option value="OtherSite"> Transfer to another Site</option>
                                    </select>
                                </div>
                            )}

                            {(repairedItemDestination === 'OtherSite' || (rma.isInstallationConfirmed && !rma.isFaultyItemFinalized)) && (
                                <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 mt-3 animate-fade-in">
                                    <label className="form-label text-[10px] uppercase font-bold text-primary-700 mb-2 block">Select Target Site</label>
                                    <select
                                        className="form-input text-xs"
                                        value={repairedItemDestinationSiteId}
                                        onChange={e => setRepairedItemDestinationSiteId(e.target.value)}
                                    >
                                        <option value="">-- Choose Site --</option>
                                        {sites.map(s => (
                                            <option key={s._id} value={s._id}>{s.siteName}</option>
                                        ))}
                                    </select>
                                    {repairedItemDestination === 'OtherSite' && (
                                        <p className="text-[10px] text-muted italic mt-1 font-medium">Selecting "Transfer to another Site" will update the asset's ownership record.</p>
                                    )}
                                </div>
                            )}

                            {rma.isInstallationConfirmed && !rma.isFaultyItemFinalized && repairedItemDestinationSiteId && (
                                <div className="mt-4">
                                    <button
                                        className="btn btn-sm btn-primary w-full"
                                        onClick={() => handleUpdateStatus('TransferredToOtherSite')}
                                    >
                                        Complete Transfer to Selected Site
                                    </button>
                                </div>
                            )}

                            <div className="form-group mt-3">
                                <label className="form-label text-[10px] uppercase font-bold opacity-60">Status Remarks</label>
                                <textarea
                                    className="form-input text-xs"
                                    rows={2}
                                    value={actionRemark}
                                    onChange={e => setActionRemark(e.target.value)}
                                    placeholder="Add any notes about this update..."
                                />
                            </div>
                        </div>

                        <div className="modal-footer flex flex-wrap gap-2">
                            <button className="btn btn-ghost" onClick={() => setShowProcessModal(false)}>Cancel</button>

                            {/* Standard Market procurement flow */}
                            {rma.status === 'Approved' && rma.replacementSource === 'Market' && <button className="btn btn-primary" onClick={() => handleUpdateStatus('Ordered')}>Mark Ordered</button>}
                            {(rma.status === 'Ordered' || (rma.status === 'Approved' && rma.replacementSource === 'Market')) && <button className="btn btn-success" onClick={() => handleUpdateStatus('Dispatched')}>Mark Dispatched</button>}
                            {rma.status === 'Dispatched' && <button className="btn btn-success" onClick={() => handleUpdateStatus('Received')}>Mark Received</button>}

                            {/* HO Stock Transfer flow */}
                            {rma.status === 'AwaitingStockTransfer' && <button className="btn btn-primary" onClick={() => handleUpdateStatus('StockInTransit')}>Mark Stock Dispatched</button>}
                            {rma.status === 'StockInTransit' && <button className="btn btn-success" onClick={() => handleUpdateStatus('StockReceived')}>Confirm Stock Received</button>}

                            {/* Repair flow */}
                            {rma.status === 'InRepair' && <button className="btn btn-success" onClick={() => handleUpdateStatus('Repaired')}>Mark Repaired</button>}

                            {/* Repair-only flow shipping */}
                            {rma.status === 'Repaired' && rma.replacementSource === 'Repair' && (
                                <button className="btn btn-primary" onClick={() => handleUpdateStatus('RepairedItemEnRoute')}>Ship Repaired Item</button>
                            )}
                            {rma.status === 'RepairedItemEnRoute' && (
                                <button className="btn btn-success" onClick={() => handleUpdateStatus('RepairedItemReceived')}>Confirm Received</button>
                            )}

                            {(rma.status === 'Received' || rma.status === 'Repaired' || rma.status === 'RepairedItemReceived') && (
                                <>
                                    <button className="btn btn-primary" onClick={() => handleUpdateStatus('TransferredToSiteStore')}>Transfer to Site Store</button>
                                    <button className="btn btn-success" onClick={() => handleUpdateStatus('TransferredToHOStock')}>Transfer to HO Stock</button>
                                </>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Confirm Modal */}
            {showConfirmModal && createPortal(
                <div className="modal-overlay animate-fade-in" onClick={() => setShowConfirmModal(false)}>
                    <div className="modal glass-card animate-slide-up" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="flex items-center gap-2">
                                <CheckCircle size={16} />
                                Confirm Device Installation
                            </h3>
                        </div>
                        <div className="modal-body">
                            {/* Info banner for HO Stock flow */}
                            {rma?.replacementSource === 'HOStock' && rma?.status === 'StockReceived' && (
                                <div className="p-3 bg-primary/10 rounded-lg border border-primary/30 mb-4 animate-fade-in">
                                    <div className="flex items-start gap-2">
                                        <Server size={18} className="text-primary-500 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-bold text-primary-600">Hardware Swap & Installation</p>
                                            <p className="text-[10px] text-muted mt-1">
                                                The replacement device from HO Stock will be installed. The faulty device will be
                                                {rma?.faultyItemAction === 'Repair' ? ' sent for repair.' : ' marked for maintenance.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="form-group">
                                <label className="form-label">Installation Status</label>
                                <select
                                    className="form-input"
                                    value={installationStatus}
                                    onChange={e => setInstallationStatus(e.target.value)}
                                >
                                    <option value="Installed & Working">Installed & Working</option>
                                    <option value="Installed but Not Working">Installed but Not Working</option>
                                    <option value="Not Installed">Not Installed yet</option>
                                </select>
                            </div>

                            {/* Show credentials section for HO Stock (always) or when Installed & Working */}
                            {(installationStatus === 'Installed & Working' || rma?.replacementSource === 'HOStock') && installationStatus !== 'Not Installed' && (
                                <div className="form-group animate-fade-in space-y-3 p-3 bg-success/5 rounded-lg border border-success/20">
                                    <p className="text-[10px] uppercase font-bold text-success-700 mb-2 flex items-center gap-1">
                                        <Settings size={12} /> Device Configuration (Pre-filled - Update if needed)
                                    </p>
                                    <div>
                                        <label className="form-label">IP Address</label>
                                        <input
                                            className="form-input font-mono"
                                            type="text"
                                            placeholder="e.g., 192.168.1.100"
                                            value={newIpAddress}
                                            onChange={e => setNewIpAddress(e.target.value)}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="form-group mb-0">
                                            <label className="form-label">Device Username</label>
                                            <input
                                                className="form-input"
                                                type="text"
                                                placeholder="Enter username"
                                                value={newUserName}
                                                onChange={e => setNewUserName(e.target.value)}
                                            />
                                        </div>
                                        <div className="form-group mb-0">
                                            <label className="form-label">Device Password</label>
                                            <input
                                                className="form-input"
                                                type="password"
                                                placeholder="Enter new password (leave blank to keep existing)"
                                                value={newPassword}
                                                onChange={e => setNewPassword(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-muted italic">These credentials will be saved with the asset. Leave password blank to keep the existing one.</p>
                                </div>
                            )}

                            <div className="form-group">
                                <label className="form-label">Remarks</label>
                                <textarea
                                    className="form-textarea"
                                    rows={2}
                                    value={confirmRemark}
                                    onChange={e => setConfirmRemark(e.target.value)}
                                    placeholder="Add any notes about the installation..."
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowConfirmModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleConfirmInstallation}>
                                {rma?.replacementSource === 'HOStock' && rma?.status === 'StockReceived' ? '🔧 Complete Installation' : 'Confirm Status'}
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
            {/* Update Asset Modal (Step 4) */}
            {showUpdateModal && createPortal(
                <div className="modal-overlay animate-fade-in" onClick={() => setShowUpdateModal(false)}>
                    <div className="modal glass-card animate-slide-up w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="flex items-center gap-2 text-warning-500">
                                <Server size={18} />
                                Update Replacement Device Details
                            </h3>
                        </div>
                        <div className="modal-body space-y-4">
                            <p className="text-xs text-muted mb-4">Provide the physical configuration of the installed unit. Changes require admin approval.</p>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="form-group">
                                    <label className="form-label">Serial Number</label>
                                    <input
                                        className="form-input font-mono text-xs"
                                        placeholder="Device Serial #"
                                        value={updateFields.serialNumber}
                                        onChange={e => setUpdateFields(prev => ({ ...prev, serialNumber: e.target.value }))}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">MAC Address</label>
                                    <input
                                        className="form-input font-mono text-xs"
                                        placeholder="00:00:00:00:00:00"
                                        value={updateFields.mac}
                                        onChange={e => setUpdateFields(prev => ({ ...prev, mac: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">IP Address</label>
                                <input
                                    className="form-input font-mono text-xs"
                                    placeholder="192.168.1.10"
                                    value={updateFields.ipAddress}
                                    onChange={e => setUpdateFields(prev => ({ ...prev, ipAddress: e.target.value }))}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="form-group">
                                    <label className="form-label">Device Username</label>
                                    <input
                                        className="form-input text-xs"
                                        placeholder="Admin/User"
                                        value={updateFields.userName}
                                        onChange={e => setUpdateFields(prev => ({ ...prev, userName: e.target.value }))}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Device Password</label>
                                    <input
                                        type="password"
                                        className="form-input text-xs"
                                        placeholder="••••••••"
                                        value={updateFields.password}
                                        onChange={e => setUpdateFields(prev => ({ ...prev, password: e.target.value }))}
                                        autoComplete="new-password"
                                    />
                                </div>
                            </div>

                            <div className="p-3 bg-warning/5 border border-warning/10 rounded-lg text-[10px] text-warning-700 italic">
                                Note: These credentials will be stored securely with the asset record upon approval.
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowUpdateModal(false)}>Cancel</button>
                            <button className="btn btn-warning" onClick={handleSubmitAssetUpdate} disabled={loading}>
                                {loading ? 'Submitting...' : 'Submit for Approval'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default RMASection;
