import { useState, useEffect } from 'react';
import { X, Package, Save, AlertCircle } from 'lucide-react';
import { stockApi, fieldOpsApi } from '../../services/api';
import toast from 'react-hot-toast';

export default function ProjectAllocationModal({ asset, onClose, onSuccess }) {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [existingAllocations, setExistingAllocations] = useState([]);

    const [form, setForm] = useState({
        projectId: '',
        allocatedQty: 1,
        notes: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            // Filter projects by the asset's site (linkedSiteId) so only relevant projects show
            const siteId = asset.siteId?._id || asset.siteId;
            const [projectsRes, allocRes] = await Promise.all([
                fieldOpsApi.getProjects({ limit: 100, status: 'Active,Planning', linkedSiteId: siteId }),
                stockApi.getAllocations({ stockItemId: asset._id })
            ]);
            setProjects(projectsRes.data.data || []);
            setExistingAllocations(allocRes.data.data || []);
        } catch {
            toast.error('Failed to load projects');
        } finally {
            setLoading(false);
        }
    };

    const totalAllocated = existingAllocations.reduce(
        (sum, a) => sum + (a.allocatedQty - (a.installedQty || 0) - (a.faultyQty || 0)),
        0
    );
    const stockQty = asset.quantity || 1;
    const availableQty = stockQty - totalAllocated;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.projectId) return toast.error('Select a project');
        if (form.allocatedQty < 1) return toast.error('Quantity must be at least 1');
        if (form.allocatedQty > availableQty) return toast.error(`Only ${availableQty} available`);

        setSaving(true);
        try {
            await stockApi.allocateToProject({
                stockItemId: asset._id,
                projectId: form.projectId,
                allocatedQty: parseInt(form.allocatedQty),
                notes: form.notes
            });
            toast.success('Stock allocated to project');
            onSuccess?.();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to allocate');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={() => !saving && onClose()}>
            <div className="modal-content asset-view-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px' }}>
                <div className="modal-header">
                    <div className="modal-title">
                        <Package size={20} />
                        <h2>Allocate to Project</h2>
                    </div>
                    <button className="modal-close" onClick={() => !saving && onClose()} disabled={saving}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {/* Stock item summary */}
                        <div style={{
                            background: 'var(--bg-primary)',
                            border: '1px solid var(--border-light)',
                            borderRadius: 'var(--radius-lg)',
                            padding: '0.875rem 1rem',
                            marginBottom: '1.25rem',
                            fontSize: 'var(--text-sm)'
                        }}>
                            <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                                {asset.deviceType || asset.assetType || asset.groupAssetType}
                                {asset.make && ` — ${asset.make}`}
                                {asset.model && ` ${asset.model}`}
                            </div>
                            <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                                Total: <strong>{stockQty}</strong> · Allocated: <strong>{totalAllocated}</strong> · Available: <strong style={{ color: availableQty > 0 ? 'var(--success-400)' : 'var(--error-400)' }}>{availableQty}</strong>
                            </div>
                        </div>

                        {availableQty <= 0 ? (
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: 'var(--error-400)', padding: '1rem 0' }}>
                                <AlertCircle size={18} />
                                <span>All stock is already allocated. Adjust existing allocations first.</span>
                            </div>
                        ) : projects.length === 0 && !loading ? (
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: 'var(--warning-400)', padding: '1rem 0' }}>
                                <AlertCircle size={18} />
                                <span>No active projects found linked to this site. Create a project linked to this site first.</span>
                            </div>
                        ) : (
                            <div className="asset-detail-grid">
                                {/* Existing allocations summary */}
                                {existingAllocations.length > 0 && (
                                    <div className="detail-item full-width" style={{ marginBottom: '0.5rem' }}>
                                        <label>Existing Allocations</label>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: 'var(--text-xs)' }}>
                                            {existingAllocations.map(a => (
                                                <div key={a._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', borderBottom: '1px solid var(--border-light)' }}>
                                                    <span>{a.projectId?.projectNumber} – {a.projectId?.projectName}</span>
                                                    <span style={{ fontWeight: 600 }}>{a.allocatedQty} allocated ({a.installedQty || 0} installed)</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="detail-item full-width">
                                    <label htmlFor="alloc-project">Project *</label>
                                    <select
                                        id="alloc-project"
                                        className="form-select"
                                        value={form.projectId}
                                        onChange={e => setForm(prev => ({ ...prev, projectId: e.target.value }))}
                                        required
                                        disabled={loading}
                                    >
                                        <option value="">-- Select Project --</option>
                                        {projects.map(p => (
                                            <option key={p._id} value={p._id}>
                                                {p.projectNumber} – {p.projectName}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="detail-item">
                                    <label htmlFor="alloc-qty">Quantity * (max: {availableQty})</label>
                                    <input
                                        id="alloc-qty"
                                        type="number"
                                        className="form-input"
                                        min={1}
                                        max={availableQty}
                                        value={form.allocatedQty}
                                        onChange={e => setForm(prev => ({ ...prev, allocatedQty: e.target.value }))}
                                        required
                                    />
                                </div>

                                <div className="detail-item full-width">
                                    <label htmlFor="alloc-notes">Notes</label>
                                    <textarea
                                        id="alloc-notes"
                                        className="form-input"
                                        rows={2}
                                        maxLength={500}
                                        value={form.notes}
                                        onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                                        placeholder="Optional allocation notes..."
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
                            Cancel
                        </button>
                        {availableQty > 0 && projects.length > 0 && (
                            <button type="submit" className="btn btn-primary" disabled={saving || loading}>
                                <Save size={16} />
                                {saving ? 'Allocating...' : 'Allocate'}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}
