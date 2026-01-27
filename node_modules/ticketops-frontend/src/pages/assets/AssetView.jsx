import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit, History, Calendar, MapPin, Network, HardDrive, Info, Server } from 'lucide-react';
import { assetsApi, rmaApi } from '../../services/api';
import useAuthStore from '../../context/authStore';
import toast from 'react-hot-toast';
import '../sites/Sites.css';
import './AssetView.css';

export default function AssetView() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { hasRole } = useAuthStore();
    
    const [asset, setAsset] = useState(null);
    const [loading, setLoading] = useState(true);
    const [rmaHistory, setRmaHistory] = useState([]);
    const [showRmaHistory, setShowRmaHistory] = useState(false);

    useEffect(() => {
        if (id) {
            loadAsset();
            loadRMAHistory();
        }
    }, [id]);

    const loadAsset = async () => {
        setLoading(true);
        try {
            const response = await assetsApi.getById(id);
            setAsset(response.data.data || response.data);
        } catch (error) {
            toast.error('Failed to load asset');
            navigate('/assets');
        } finally {
            setLoading(false);
        }
    };

    const loadRMAHistory = async () => {
        try {
            const response = await rmaApi.getHistory(id);
            setRmaHistory(response.data.data || []);
        } catch (error) {
            console.error('Failed to load RMA history', error);
            setRmaHistory([]);
        }
    };

    const getStatusBadgeClass = (status) => {
        const statusMap = {
            'Operational': 'badge-success',
            'Degraded': 'badge-warning',
            'Offline': 'badge-danger',
            'Maintenance': 'badge-info'
        };
        return statusMap[status] || 'badge-secondary';
    };

    const getCriticalityBadge = (level) => {
        const criticalityMap = {
            1: { label: 'Low', class: 'badge-success' },
            2: { label: 'Medium', class: 'badge-warning' },
            3: { label: 'High', class: 'badge-danger' }
        };
        const crit = criticalityMap[level] || criticalityMap[2];
        return <span className={`badge ${crit.class}`}>{crit.label}</span>;
    };

    if (loading) {
        return (
            <div className="loading-state">
                <div className="spinner"></div>
            </div>
        );
    }

    if (!asset) {
        return (
            <div className="page-container">
                <div className="text-center py-12">
                    <h2>Asset not found</h2>
                    <Link to="/assets" className="btn btn-primary mt-4">Back to Assets</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container form-view asset-view-page">
            <Link to="/assets" className="back-link">
                <ArrowLeft size={18} />
                Back to Assets
            </Link>

            <div className="page-header">
                <div>
                    <h1 className="page-title">{asset.assetCode}</h1>
                    <p className="page-subtitle">{asset.assetType} - {asset.deviceType || 'N/A'}</p>
                </div>
                <div className="flex gap-2">
                    {rmaHistory.length > 0 && (
                        <button 
                            className="btn btn-history"
                            onClick={() => setShowRmaHistory(true)}
                        >
                            <History size={18} />
                            RMA History ({rmaHistory.length})
                        </button>
                    )}
                    {(hasRole(['Admin', 'Supervisor']) || hasRole('Dispatcher')) && (
                        <Link to={`/assets/${id}/edit`} className="btn btn-primary">
                            <Edit size={18} />
                            Edit Asset
                        </Link>
                    )}
                </div>
            </div>

            <div className="asset-view-grid">
                {/* Main Information Card */}
                <div className="main-info-col">
                    <div className="info-card">
                        <h2 className="section-title">
                            <Info size={20} />
                            Asset Information
                        </h2>

                        <div className="asset-info-grid">
                            <div className="asset-info-item">
                                <label className="asset-info-label">Asset Code</label>
                                <p className="asset-info-value">{asset.assetCode}</p>
                            </div>

                            <div className="asset-info-item">
                                <label className="asset-info-label">Asset Type</label>
                                <p className="asset-info-value">{asset.assetType}</p>
                            </div>

                            <div className="asset-info-item">
                                <label className="asset-info-label">Device Type</label>
                                <p className="asset-info-value">{asset.deviceType || '—'}</p>
                            </div>

                            <div className="asset-info-item">
                                <label className="asset-info-label">Status</label>
                                <div>
                                    <span className={`badge ${getStatusBadgeClass(asset.status)}`}>
                                        {asset.status}
                                    </span>
                                </div>
                            </div>

                            <div className="asset-info-item">
                                <label className="asset-info-label">Criticality</label>
                                <div>{getCriticalityBadge(asset.criticality)}</div>
                            </div>

                            <div className="asset-info-item">
                                <label className="asset-info-label">Make</label>
                                <p className="asset-info-value">{asset.make || '—'}</p>
                            </div>

                            <div className="asset-info-item">
                                <label className="asset-info-label">Model</label>
                                <p className="asset-info-value">{asset.model || '—'}</p>
                            </div>

                            <div className="asset-info-item">
                                <label className="asset-info-label">Serial Number</label>
                                <p className="asset-info-value font-mono">{asset.serialNumber || '—'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Network Information */}
                    <div className="info-card">
                        <h2 className="section-title">
                            <Network size={20} />
                            Network Information
                        </h2>

                        <div className="asset-info-grid">
                            <div className="asset-info-item">
                                <label className="asset-info-label">IP Address</label>
                                <p className="asset-info-value font-mono">{asset.ipAddress || '—'}</p>
                            </div>

                            <div className="asset-info-item">
                                <label className="asset-info-label">MAC Address</label>
                                <p className="asset-info-value font-mono">{asset.mac || '—'}</p>
                            </div>

                            <div className="asset-info-item">
                                <label className="asset-info-label">VMS Ref ID</label>
                                <p className="asset-info-value">{asset.vmsReferenceId || '—'}</p>
                            </div>

                            <div className="asset-info-item">
                                <label className="asset-info-label">NMS Ref ID</label>
                                <p className="asset-info-value">{asset.nmsReferenceId || '—'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Location Information */}
                    <div className="info-card">
                        <h2 className="section-title">
                            <MapPin size={20} />
                            Location Information
                        </h2>

                        <div className="location-details">
                            <div className="asset-info-item">
                                <label className="asset-info-label">Site</label>
                                <p className="asset-info-value">{asset.siteId?.siteName || '—'}</p>
                            </div>

                            <div className="asset-info-grid">
                                <div className="asset-info-item">
                                    <label className="asset-info-label">Location Name</label>
                                    <p className="asset-info-value">{asset.locationName || '—'}</p>
                                </div>

                                <div className="asset-info-item">
                                    <label className="asset-info-label">Description</label>
                                    <p className="asset-info-value">{asset.locationDescription || '—'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Credentials / Others */}
                    {(asset.userName || asset.remark) && (
                        <div className="info-card">
                            <h2 className="section-title">
                                <Server size={20} />
                                Additional Details
                            </h2>
                            
                            <div className="asset-info-grid">
                                {asset.userName && (
                                    <div className="asset-info-item">
                                        <label className="asset-info-label">Device Username</label>
                                        <p className="asset-info-value font-mono">{asset.userName}</p>
                                    </div>
                                )}
                                
                                {asset.remark && (
                                    <div className="asset-info-item">
                                        <label className="asset-info-label">Remarks</label>
                                        <p className="asset-info-value">{asset.remark}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="sidebar-col">
                    <div className="info-card sidebar-card">
                        <h2 className="section-title">
                            <Calendar size={20} />
                            Lifecycle
                        </h2>

                        <div className="space-y-1">
                            <div className="summary-item">
                                <span className="asset-info-label">Installed</span>
                                <span className="asset-info-value">
                                    {asset.installationDate ? new Date(asset.installationDate).toLocaleDateString() : '—'}
                                </span>
                            </div>

                            <div className="summary-item">
                                <span className="asset-info-label">Warranty Ends</span>
                                <span className="asset-info-value text-warning">
                                    {asset.warrantyEndDate ? new Date(asset.warrantyEndDate).toLocaleDateString() : '—'}
                                </span>
                            </div>

                            <div className="summary-item">
                                <span className="asset-info-label">Last Managed</span>
                                <span className="asset-info-value">
                                    {new Date(asset.updatedAt).toLocaleDateString()}
                                </span>
                            </div>
                        </div>

                        {rmaHistory.length > 0 && (
                            <div className="mt-6 pt-6 border-t border-border">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="font-bold">RMA Impact</span>
                                    <span className="badge badge-primary">{rmaHistory.length} Replacements</span>
                                </div>
                                <button 
                                    className="btn btn-outline-primary w-full btn-sm"
                                    onClick={() => setShowRmaHistory(true)}
                                >
                                    <History size={14} />
                                    View Timeline
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="info-card">
                        <h2 className="section-title">Connectivity</h2>
                        <div className="flex items-center gap-3">
                            <div className={`w-4 h-4 rounded-full ${asset.status === 'Operational' ? 'bg-success' : 'bg-danger'} shadow-sm`}></div>
                            <span className="font-bold">{asset.status}</span>
                        </div>
                        <p className="text-xs text-muted mt-2">
                            Current operational state as per last health check.
                        </p>
                    </div>
                </div>
            </div>


            {/* RMA History Modal */}
            {showRmaHistory && (
                <div className="modal-overlay" onClick={() => setShowRmaHistory(false)}>
                    <div className="modal-content animate-fade-in" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="text-xl font-bold">RMA / Replacement History</h3>
                            <p className="text-sm text-muted">
                                Complete timeline of device replacements for this asset
                            </p>
                        </div>

                        <div className="modal-body">
                            {rmaHistory.length === 0 ? (
                                <div className="text-center py-12 text-muted">
                                    <History size={48} className="mx-auto mb-4 opacity-20" />
                                    <p>No replacement history found for this asset.</p>
                                </div>
                            ) : (
                                rmaHistory.map((rma, index) => (
                                    <div key={rma._id} className="rma-card">
                                        <div className="flex justify-between items-center mb-4">
                                            <div className="flex items-center gap-3">
                                                <span className="font-bold text-primary">
                                                    #{rmaHistory.length - index}
                                                </span>
                                                <span className="text-sm font-semibold px-2 py-1 bg-primary/10 rounded">
                                                    Ticket: {rma.ticketId?.ticketNumber || 'N/A'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className={`badge ${rma.status === 'Installed' ? 'badge-success' : 'badge-warning'}`}>
                                                    {rma.status}
                                                </span>
                                                <span className="text-xs text-muted font-mono">
                                                    {new Date(rma.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="device-diff">
                                            <div className="diff-box removed">
                                                <h4 className="text-xs font-bold text-danger uppercase tracking-wider mb-2">Old Device (Removed)</h4>
                                                <div className="space-y-1 text-sm">
                                                    <div>
                                                        <span className="text-muted">S/N:</span>{' '}
                                                        <span className="font-mono">{rma.originalDetailsSnapshot?.serialNumber || 'N/A'}</span>
                                                    </div>
                                                    {rma.originalDetailsSnapshot?.ipAddress && (
                                                        <div>
                                                            <span className="text-muted">IP:</span>{' '}
                                                            <span className="font-mono">{rma.originalDetailsSnapshot.ipAddress}</span>
                                                        </div>
                                                    )}
                                                    {rma.originalDetailsSnapshot?.mac && (
                                                        <div>
                                                            <span className="text-muted">MAC:</span>{' '}
                                                            <span className="font-mono">{rma.originalDetailsSnapshot.mac}</span>
                                                        </div>
                                                    )}
                                                    {rma.originalDetailsSnapshot?.model && (
                                                        <div>
                                                            <span className="text-muted">Model:</span>{' '}
                                                            <span>{rma.originalDetailsSnapshot.model}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="diff-box added">
                                                <h4 className="text-xs font-bold text-success uppercase tracking-wider mb-2">New Device (Installed)</h4>
                                                <div className="space-y-1 text-sm">
                                                    {rma.replacementDetails?.serialNumber ? (
                                                        <>
                                                            <div>
                                                                <span className="text-muted">S/N:</span>{' '}
                                                                <span className="font-mono font-bold text-success">{rma.replacementDetails.serialNumber}</span>
                                                            </div>
                                                            {rma.replacementDetails?.ipAddress && (
                                                                <div>
                                                                    <span className="text-muted">IP:</span>{' '}
                                                                    <span className="font-mono">{rma.replacementDetails.ipAddress}</span>
                                                                </div>
                                                            )}
                                                            {rma.replacementDetails?.mac && (
                                                                <div>
                                                                    <span className="text-muted">MAC:</span>{' '}
                                                                    <span className="font-mono">{rma.replacementDetails.mac}</span>
                                                                </div>
                                                            )}
                                                            {rma.replacementDetails?.model && (
                                                                <div>
                                                                    <span className="text-muted">Model:</span>{' '}
                                                                    <span>{rma.replacementDetails.model}</span>
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <span className="text-muted italic">Replacement pending installation</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-4 p-3 bg-secondary/30 rounded-lg">
                                            <h4 className="text-xs font-bold text-muted uppercase mb-1">Replacement Reason</h4>
                                            <p className="text-sm italic">"{rma.requestReason}"</p>
                                        </div>

                                        {rma.installedBy && (
                                            <div className="mt-3 flex justify-between items-center text-[10px] text-muted uppercase tracking-tighter">
                                                <span>Installed By: {rma.installedBy?.name || 'Engineer'}</span>
                                                <span>On: {new Date(rma.installedOn).toLocaleString()}</span>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="modal-footer">
                            <button className="btn btn-primary" onClick={() => setShowRmaHistory(false)}>
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
