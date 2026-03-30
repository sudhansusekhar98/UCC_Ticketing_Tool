import { useState, useEffect } from 'react';
import { Package, AlertCircle, Plus } from 'lucide-react';
import { stockApi } from '../../services/api';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function AllocatedStockTab({ projectId, allocStats }) {
    const [allocations, setAllocations] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAllocations();
    }, [projectId]);

    const loadAllocations = async () => {
        try {
            const res = await stockApi.getAllocations({ projectId });
            setAllocations(res.data.data || []);
        } catch {
            toast.error('Failed to load allocations');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="loading-state">
                <div className="spinner"></div>
                <p>Loading allocations...</p>
            </div>
        );
    }

    return (
        <div>
            {/* Summary Stats */}
            <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
                <div className="pm-stat-card">
                    <div className="pm-stat-icon primary">
                        <Package size={24} />
                    </div>
                    <div className="pm-stat-content">
                        <h3>{allocStats?.totalAllocated || 0}</h3>
                        <p>Total Allocated</p>
                    </div>
                </div>
                <div className="pm-stat-card">
                    <div className="pm-stat-icon success">
                        <Package size={24} />
                    </div>
                    <div className="pm-stat-content">
                        <h3>{allocStats?.totalInstalled || 0}</h3>
                        <p>Installed</p>
                    </div>
                </div>
                <div className="pm-stat-card">
                    <div className="pm-stat-icon warning">
                        <Package size={24} />
                    </div>
                    <div className="pm-stat-content">
                        <h3>{allocStats?.remaining || 0}</h3>
                        <p>Remaining</p>
                    </div>
                </div>
                <div className="pm-stat-card">
                    <div className="pm-stat-icon danger">
                        <AlertCircle size={24} />
                    </div>
                    <div className="pm-stat-content">
                        <h3>{allocStats?.totalFaulty || 0}</h3>
                        <p>Faulty</p>
                    </div>
                </div>
            </div>

            {/* Allocations Table */}
            {allocations.length === 0 ? (
                <div className="empty-state">
                    <Package size={48} />
                    <h3>No stock allocated</h3>
                    <p>Allocate stock from the Inventory page or via bulk upload with Project Number.</p>
                    <Link to="/stock" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                        <Package size={18} /> Go to Inventory
                    </Link>
                </div>
            ) : (
                <div className="table-responsive">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Item</th>
                                <th style={{ textAlign: 'center', width: '100px', padding: '1rem' }}>Allocated</th>
                                <th style={{ textAlign: 'center', width: '100px', padding: '1rem' }}>Installed</th>
                                <th style={{ textAlign: 'center', width: '100px', padding: '1rem' }}>Faulty</th>
                                <th style={{ textAlign: 'center', width: '100px', padding: '1rem' }}>Remaining</th>
                                <th style={{ textAlign: 'center', width: '140px', padding: '1rem' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allocations.map(alloc => {
                                const remaining = (alloc.allocatedQty || 0) - (alloc.installedQty || 0) - (alloc.faultyQty || 0);
                                const stockItem = alloc.stockItemId || {};
                                return (
                                    <tr key={alloc._id}>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>
                                                {stockItem.deviceType || stockItem.assetType || 'Unknown'}
                                            </div>
                                            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                                                {stockItem.make} {stockItem.model}
                                                {stockItem.serialNumber && ` · S/N: ${stockItem.serialNumber}`}
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'center', fontWeight: 600, padding: '1rem' }}>
                                            {Number((alloc.allocatedQty || 0).toFixed(2))}
                                        </td>
                                        <td style={{ textAlign: 'center', color: 'var(--success-400)', padding: '1rem' }}>
                                            {Number((alloc.installedQty || 0).toFixed(2))}
                                        </td>
                                        <td style={{ textAlign: 'center', color: (alloc.faultyQty || 0) > 0 ? 'var(--error-400)' : 'inherit', padding: '1rem' }}>
                                            {Number((alloc.faultyQty || 0).toFixed(2))}
                                        </td>
                                        <td style={{
                                            textAlign: 'center',
                                            fontWeight: 600,
                                            padding: '1rem',
                                            color: remaining > 0 ? 'var(--warning-400)' : 'var(--success-400)'
                                        }}>
                                            {Number(remaining.toFixed(2))}
                                        </td>
                                        <td style={{ textAlign: 'center', padding: '1rem' }}>
                                            <span className={`status-badge ${
                                                alloc.status === 'FullyInstalled' ? 'status-badge-success' :
                                                alloc.status === 'PartiallyInstalled' ? 'status-badge-warning' : 'status-badge-info'
                                            }`}>
                                                {alloc.status === 'FullyInstalled' ? 'Fully Installed' :
                                                 alloc.status === 'PartiallyInstalled' ? 'Partially Installed' : 'Allocated'}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem' }}>
                <Link to={`/fieldops/projects/${projectId}/stock`} className="btn btn-primary">
                    <Package size={18} /> View Full Stock List
                </Link>
                <Link to={`/fieldops/projects/${projectId}/devices/new`} className="btn btn-secondary">
                    <Plus size={18} /> Install Device
                </Link>
                <Link to="/stock" className="btn btn-ghost">
                    <Package size={18} /> View Inventory
                </Link>
            </div>
        </div>
    );
}
