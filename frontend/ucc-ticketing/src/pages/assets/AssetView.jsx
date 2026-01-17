import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit, History, Calendar, MapPin, Network, HardDrive, Info, Server } from 'lucide-react';
import { assetsApi, rmaApi } from '../../services/api';
import useAuthStore from '../../context/authStore';
import toast from 'react-hot-toast';
import '../sites/Sites.css';

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
        <div className="page-container animate-fade-in">
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
                            className="btn btn-outline-secondary"
                            onClick={() => setShowRmaHistory(true)}
                        >
                            <History size={18} />
                            RMA History ({rmaHistory.length})
                        </button>
                    )}
                    {hasRole(['Admin', 'Supervisor']) && (
                        <Link to={`/assets/${id}/edit`} className="btn btn-primary">
                            <Edit size={18} />
                            Edit Asset
                        </Link>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Information Card */}
                <div className="lg:col-span-2">
                    <div className="glass-card p-6">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <Info size={20} />
                            Asset Information
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Basic Info */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-muted mb-1">Asset Code</label>
                                    <p className="text-lg font-semibold">{asset.assetCode}</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-muted mb-1">Asset Type</label>
                                    <p className="text-lg">{asset.assetType}</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-muted mb-1">Device Type</label>
                                    <p className="text-lg">{asset.deviceType || 'N/A'}</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-muted mb-1">Status</label>
                                    <span className={`badge ${getStatusBadgeClass(asset.status)}`}>
                                        {asset.status}
                                    </span>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-muted mb-1">Criticality</label>
                                    {getCriticalityBadge(asset.criticality)}
                                </div>
                            </div>

                            {/* Technical Details */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-muted mb-1">Make</label>
                                    <p className="text-lg">{asset.make || 'N/A'}</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-muted mb-1">Model</label>
                                    <p className="text-lg">{asset.model || 'N/A'}</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-muted mb-1">Serial Number</label>
                                    <p className="text-lg font-mono">{asset.serialNumber || 'N/A'}</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-muted mb-1">Used For</label>
                                    <p className="text-lg">{asset.usedFor || 'N/A'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Network Information */}
                    <div className="glass-card p-6 mt-6">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <Network size={20} />
                            Network Information
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-muted mb-1">IP Address</label>
                                <p className="text-lg font-mono">{asset.ipAddress || 'N/A'}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-muted mb-1">MAC Address</label>
                                <p className="text-lg font-mono">{asset.mac || 'N/A'}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-muted mb-1">VMS Reference ID</label>
                                <p className="text-lg">{asset.vmsReferenceId || 'N/A'}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-muted mb-1">NMS Reference ID</label>
                                <p className="text-lg">{asset.nmsReferenceId || 'N/A'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Location Information */}
                    <div className="glass-card p-6 mt-6">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <MapPin size={20} />
                            Location Information
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-muted mb-1">Site</label>
                                <p className="text-lg">{asset.siteId?.siteName || 'N/A'}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-muted mb-1">Location Name</label>
                                <p className="text-lg">{asset.locationName || 'N/A'}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-muted mb-1">Location Description</label>
                                <p className="text-lg">{asset.locationDescription || 'N/A'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Device Credentials */}
                    {(asset.userName || asset.password) && (
                        <div className="glass-card p-6 mt-6">
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <Server size={20} />
                                Device Credentials
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-muted mb-1">Username</label>
                                    <p className="text-lg font-mono">{asset.userName || 'N/A'}</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-muted mb-1">Password</label>
                                    <p className="text-lg">••••••••</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Remarks */}
                    {asset.remark && (
                        <div className="glass-card p-6 mt-6">
                            <h2 className="text-xl font-bold mb-4">Additional Notes</h2>
                            <p className="text-lg whitespace-pre-wrap">{asset.remark}</p>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Dates Card */}
                    <div className="glass-card p-6">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <Calendar size={20} />
                            Important Dates
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-muted mb-1">Installation Date</label>
                                <p className="text-lg">
                                    {asset.installationDate 
                                        ? new Date(asset.installationDate).toLocaleDateString() 
                                        : 'N/A'}
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-muted mb-1">Warranty End Date</label>
                                <p className="text-lg">
                                    {asset.warrantyEndDate 
                                        ? new Date(asset.warrantyEndDate).toLocaleDateString() 
                                        : 'N/A'}
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-muted mb-1">Created At</label>
                                <p className="text-sm text-muted">
                                    {new Date(asset.createdAt).toLocaleString()}
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-muted mb-1">Last Updated</label>
                                <p className="text-sm text-muted">
                                    {new Date(asset.updatedAt).toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* RMA History Summary */}
                    {rmaHistory.length > 0 && (
                        <div className="glass-card p-6">
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <HardDrive size={20} />
                                RMA Summary
                            </h2>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-muted">Total Replacements</span>
                                    <span className="badge badge-primary">{rmaHistory.length}</span>
                                </div>

                                <div className="flex justify-between items-center">
                                    <span className="text-muted">Last Replacement</span>
                                    <span className="text-sm">
                                        {new Date(rmaHistory[0].createdAt).toLocaleDateString()}
                                    </span>
                                </div>

                                <button 
                                    className="btn btn-outline-primary w-full mt-3"
                                    onClick={() => setShowRmaHistory(true)}
                                >
                                    <History size={16} />
                                    View Full History
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Active Status */}
                    <div className="glass-card p-6">
                        <h2 className="text-xl font-bold mb-4">Status</h2>
                        <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${asset.isActive ? 'bg-success' : 'bg-danger'}`}></div>
                            <span className="text-lg">{asset.isActive ? 'Active' : 'Inactive'}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* RMA History Modal */}
            {showRmaHistory && (
                <div className="modal-overlay" onClick={() => setShowRmaHistory(false)}>
                    <div className="modal glass-card" onClick={(e) => e.stopPropagation()}>
                        <h3>RMA / Replacement History</h3>
                        <p className="text-sm text-muted mb-4">
                            Complete history of device replacements for this asset
                        </p>

                        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                            {rmaHistory.length === 0 ? (
                                <div className="text-center py-8 text-muted">
                                    <p>No replacement history found for this asset.</p>
                                </div>
                            ) : (
                                rmaHistory.map((rma, index) => (
                                    <div key={rma._id} className="p-4 bg-secondary/20 rounded border border-border">
                                        <div className="flex justify-between items-center mb-3">
                                            <div className="flex items-center gap-2">
                                                <span className="badge badge-outline">#{rmaHistory.length - index}</span>
                                                <span className="font-bold text-sm">
                                                    Ticket: {rma.ticketId?.ticketNumber || 'N/A'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`badge badge-${rma.status === 'Installed' ? 'success' : 'warning'}`}>
                                                    {rma.status}
                                                </span>
                                                <span className="text-xs text-muted">
                                                    {new Date(rma.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 mb-3">
                                            <div className="p-3 bg-danger/10 rounded">
                                                <h4 className="text-xs font-bold text-muted mb-2">Old Device (Replaced)</h4>
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
                                                    {rma.originalDetailsSnapshot?.make && (
                                                        <div>
                                                            <span className="text-muted">Make:</span>{' '}
                                                            <span>{rma.originalDetailsSnapshot.make}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="p-3 bg-success/10 rounded">
                                                <h4 className="text-xs font-bold text-muted mb-2">New Device (Installed)</h4>
                                                <div className="space-y-1 text-sm">
                                                    {rma.replacementDetails?.serialNumber ? (
                                                        <>
                                                            <div>
                                                                <span className="text-muted">S/N:</span>{' '}
                                                                <span className="font-mono">{rma.replacementDetails.serialNumber}</span>
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
                                                            {rma.replacementDetails?.make && (
                                                                <div>
                                                                    <span className="text-muted">Make:</span>{' '}
                                                                    <span>{rma.replacementDetails.make}</span>
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <span className="text-muted italic">Installation pending</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-3 bg-warning/10 rounded">
                                            <h4 className="text-xs font-bold text-muted mb-1">Replacement Reason</h4>
                                            <p className="text-sm">{rma.requestReason}</p>
                                        </div>

                                        {rma.installedBy && (
                                            <div className="mt-2 text-xs text-muted">
                                                Installed on: {new Date(rma.installedOn).toLocaleString()}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="modal-actions mt-4">
                            <button className="btn btn-ghost" onClick={() => setShowRmaHistory(false)}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
