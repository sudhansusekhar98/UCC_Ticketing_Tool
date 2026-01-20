import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, ArrowRight, ShieldCheck, MessageSquare } from 'lucide-react';
import { assetUpdateRequestApi } from '../../services/api';
import toast from 'react-hot-toast';
import useAuthStore from '../../context/authStore';

export default function AssetUpdateApproval({ ticketId, onUpdate }) {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);
    const [adminComment, setAdminComment] = useState('');
    const { user } = useAuthStore();

    const isAdmin = ['Admin', 'Supervisor', 'Dispatcher'].includes(user?.role);

    useEffect(() => {
        fetchRequests();
    }, [ticketId]);

    const fetchRequests = async () => {
        try {
            const response = await assetUpdateRequestApi.getPendingByTicket(ticketId);
            // Backend returns a single object, wrap it in array for consistent handling
            const data = response.data.data;
            if (data) {
                setRequests(Array.isArray(data) ? data : [data]);
            } else {
                setRequests([]);
            }
        } catch (error) {
            // 404 means no pending requests, which is fine
            if (error.response?.status !== 404) {
                console.error('Failed to fetch pending asset updates:', error);
            }
            setRequests([]);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (requestId, action) => {
        if (!adminComment.trim() && action === 'reject') {
            toast.error('Please provide a comment for rejection');
            return;
        }

        setProcessingId(requestId);
        try {
            if (action === 'approve') {
                await assetUpdateRequestApi.approve(requestId, { adminComment: adminComment || 'Approved' });
                toast.success('Asset update approved successfully');
            } else {
                await assetUpdateRequestApi.reject(requestId, { adminComment });
                toast.success('Asset update rejected');
            }
            setAdminComment('');
            fetchRequests();
            if (onUpdate) onUpdate();
        } catch (error) {
            toast.error(error.response?.data?.message || `Failed to ${action} update`);
        } finally {
            setProcessingId(null);
        }
    };

    if (loading) return null;
    if (requests.length === 0) return null;

    return (
        <div className="asset-approval-section space-y-4 mb-6">
            <div className="flex items-center gap-2 mb-4">
                <ShieldCheck className="text-primary-500" size={20} />
                <h3 className="section-title mb-0">Pending Asset Updates</h3>
                <span className="badge badge-warning">{requests.length} Pending</span>
            </div>

            {requests.map((req) => (
                <div key={req._id} className="detail-section glass-card border-warning/30">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-muted uppercase tracking-wider">Submitted By:</span>
                            <span className="text-sm font-semibold">{req.requestedBy?.fullName || 'Engineer'}</span>
                            <span className="text-xs text-muted ml-2">({new Date(req.submittedAt).toLocaleString()})</span>
                        </div>
                        <span className="badge badge-warning">Awaiting Approval</span>
                    </div>

                    <div className="update-comparison-grid mb-4">
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Field</th>
                                        <th>Original Value</th>
                                        <th className="text-center">Action</th>
                                        <th>Proposed New Value</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(req.proposedChanges || {}).map(([field, newValue]) => {
                                        const originalValue = req.originalValues?.[field] || '—';
                                        if (newValue === originalValue) return null;
                                        
                                        return (
                                            <tr key={field}>
                                                <td className="font-semibold text-muted text-xs uppercase">{field.replace(/([A-Z])/g, ' $1')}</td>
                                                <td className="text-sm line-through opacity-50">{originalValue}</td>
                                                <td className="text-center text-primary-400">
                                                    <ArrowRight size={14} className="mx-auto" />
                                                </td>
                                                <td className="text-sm font-bold text-success-500 bg-success-500/5 rounded">
                                                    {newValue || '—'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {isAdmin && (
                        <div className="admin-actions bg-secondary/20 p-4 rounded-lg border border-border">
                            <div className="form-group mb-3">
                                <label className="form-label flex items-center gap-2">
                                    <MessageSquare size={14} />
                                    Approval/Rejection Comment
                                </label>
                                <textarea
                                    className="form-textarea"
                                    placeholder="Provide feedback or reason for approval/rejection..."
                                    value={adminComment}
                                    onChange={(e) => setAdminComment(e.target.value)}
                                    rows={2}
                                />
                            </div>
                            <div className="flex gap-3 justify-end">
                                <button 
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => handleAction(req._id, 'reject')}
                                    disabled={processingId === req._id}
                                >
                                    <XCircle size={14} />
                                    Reject Request
                                </button>
                                <button 
                                    className="btn btn-primary btn-sm"
                                    onClick={() => handleAction(req._id, 'approve')}
                                    disabled={processingId === req._id}
                                >
                                    <CheckCircle size={14} />
                                    Approve & Apply Changes
                                </button>
                            </div>
                        </div>
                    )}

                    {!isAdmin && (
                        <div className="p-3 bg-info/5 rounded text-xs text-info-600 flex items-center gap-2 border border-info/10">
                            <AlertCircle size={14} />
                            Your request is currently being reviewed by an administrator.
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
