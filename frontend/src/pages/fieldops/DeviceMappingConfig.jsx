import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Plus,
    Edit,
    Trash2,
    Save,
    X,
    AlertTriangle
} from 'lucide-react';
import { fieldOpsApi } from '../../services/api';
import toast from 'react-hot-toast';
import './fieldops.css';

const DEVICE_TYPES = [
    'IPCamera', 'NVR', 'DVR', 'PTZ', 'Cable',
    'AccessPoint', 'Switch', 'Router', 'UPS', 'Other'
];

export default function DeviceMappingConfig() {
    const navigate = useNavigate();
    const [mappings, setMappings] = useState([]);
    const [unmappedItems, setUnmappedItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [form, setForm] = useState({ surveyItemName: '', surveyItemTypeName: '', internalDeviceType: '' });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [mappingsRes, unmappedRes] = await Promise.all([
                fieldOpsApi.getDeviceMappings(),
                fieldOpsApi.getUnmappedSurveyItems()
            ]);
            setMappings(mappingsRes.data.data);
            setUnmappedItems(unmappedRes.data.data);
        } catch (error) {
            toast.error('Failed to load mappings');
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!form.surveyItemName || !form.internalDeviceType) {
            toast.error('Survey item name and device type are required');
            return;
        }
        try {
            await fieldOpsApi.createDeviceMapping(form);
            toast.success('Mapping created');
            setForm({ surveyItemName: '', surveyItemTypeName: '', internalDeviceType: '' });
            setShowAddForm(false);
            loadData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to create mapping');
        }
    };

    const handleUpdate = async (id) => {
        if (!form.surveyItemName || !form.internalDeviceType) {
            toast.error('Survey item name and device type are required');
            return;
        }
        try {
            await fieldOpsApi.updateDeviceMapping(id, form);
            toast.success('Mapping updated');
            setEditingId(null);
            setForm({ surveyItemName: '', surveyItemTypeName: '', internalDeviceType: '' });
            loadData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update mapping');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this mapping?')) return;
        try {
            await fieldOpsApi.deleteDeviceMapping(id);
            toast.success('Mapping deleted');
            loadData();
        } catch (error) {
            toast.error('Failed to delete mapping');
        }
    };

    const startEdit = (mapping) => {
        setEditingId(mapping._id);
        setForm({
            surveyItemName: mapping.surveyItemName,
            surveyItemTypeName: mapping.surveyItemTypeName || '',
            internalDeviceType: mapping.internalDeviceType
        });
        setShowAddForm(false);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setForm({ surveyItemName: '', surveyItemTypeName: '', internalDeviceType: '' });
    };

    const quickMap = (item) => {
        setForm({
            surveyItemName: item.itemName,
            surveyItemTypeName: item.itemTypeName || '',
            internalDeviceType: ''
        });
        setShowAddForm(true);
        setEditingId(null);
    };

    if (loading) {
        return <div className="loading-container"><div className="spinner" /></div>;
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button className="btn btn-ghost" onClick={() => navigate(-1)}>
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 style={{ margin: 0 }}>Survey Device Mappings</h1>
                        <p style={{ margin: '0.25rem 0 0', color: 'var(--text-secondary)' }}>
                            Map survey item names to internal device types for reconciliation
                        </p>
                    </div>
                </div>
                <button className="btn btn-primary" onClick={() => { setShowAddForm(true); setEditingId(null); setForm({ surveyItemName: '', surveyItemTypeName: '', internalDeviceType: '' }); }}>
                    <Plus size={16} /> Add Mapping
                </button>
            </div>

            {/* Unmapped Items Warning */}
            {unmappedItems.length > 0 && (
                <div className="recon-warning-box" style={{ marginTop: '1rem' }}>
                    <AlertTriangle size={18} />
                    <div style={{ flex: 1 }}>
                        <strong>{unmappedItems.length} Unmapped Survey Item(s)</strong>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                            {unmappedItems.map((item, idx) => (
                                <button
                                    key={idx}
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => quickMap(item)}
                                    style={{ fontSize: '0.8rem' }}
                                >
                                    <Plus size={14} /> {item.itemName} {item.itemTypeName ? `(${item.itemTypeName})` : ''}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Add Form */}
            {showAddForm && (
                <div className="glass-card" style={{ marginTop: '1rem' }}>
                    <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Add New Mapping</h3>
                    <form onSubmit={handleAdd} className="mapping-form">
                        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr auto', alignItems: 'end' }}>
                            <div className="form-group">
                                <label>Survey Item Name *</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={form.surveyItemName}
                                    onChange={e => setForm(f => ({ ...f, surveyItemName: e.target.value }))}
                                    placeholder="e.g. IP Camera, Bullet Camera"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Survey Item Type</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={form.surveyItemTypeName}
                                    onChange={e => setForm(f => ({ ...f, surveyItemTypeName: e.target.value }))}
                                    placeholder="e.g. Camera, NVR (optional)"
                                />
                            </div>
                            <div className="form-group">
                                <label>Internal Device Type *</label>
                                <select
                                    className="form-control"
                                    value={form.internalDeviceType}
                                    onChange={e => setForm(f => ({ ...f, internalDeviceType: e.target.value }))}
                                    required
                                >
                                    <option value="">Select device type</option>
                                    {DEVICE_TYPES.map(dt => (
                                        <option key={dt} value={dt}>{dt}</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button type="submit" className="btn btn-primary">
                                    <Save size={16} /> Save
                                </button>
                                <button type="button" className="btn btn-ghost" onClick={() => setShowAddForm(false)}>
                                    <X size={16} />
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            {/* Mappings Table */}
            <div className="glass-card" style={{ marginTop: '1rem' }}>
                {mappings.length === 0 ? (
                    <div className="empty-state">
                        <AlertTriangle size={48} />
                        <h3>No mappings configured</h3>
                        <p>Add mappings to link survey item names to internal device types.</p>
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Survey Item Name</th>
                                    <th>Survey Item Type</th>
                                    <th>Internal Device Type</th>
                                    <th>Created By</th>
                                    <th style={{ width: 100 }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {mappings.map(mapping => (
                                    <tr key={mapping._id}>
                                        {editingId === mapping._id ? (
                                            <>
                                                <td>
                                                    <input
                                                        type="text"
                                                        className="form-control form-control-sm"
                                                        value={form.surveyItemName}
                                                        onChange={e => setForm(f => ({ ...f, surveyItemName: e.target.value }))}
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        type="text"
                                                        className="form-control form-control-sm"
                                                        value={form.surveyItemTypeName}
                                                        onChange={e => setForm(f => ({ ...f, surveyItemTypeName: e.target.value }))}
                                                    />
                                                </td>
                                                <td>
                                                    <select
                                                        className="form-control form-control-sm"
                                                        value={form.internalDeviceType}
                                                        onChange={e => setForm(f => ({ ...f, internalDeviceType: e.target.value }))}
                                                    >
                                                        <option value="">Select</option>
                                                        {DEVICE_TYPES.map(dt => (
                                                            <option key={dt} value={dt}>{dt}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td>{mapping.createdBy?.fullName || '-'}</td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                        <button className="btn btn-ghost btn-sm" onClick={() => handleUpdate(mapping._id)}>
                                                            <Save size={14} />
                                                        </button>
                                                        <button className="btn btn-ghost btn-sm" onClick={cancelEdit}>
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td><strong>{mapping.surveyItemName}</strong></td>
                                                <td>{mapping.surveyItemTypeName || '-'}</td>
                                                <td>
                                                    <span className="recon-mini-badge">{mapping.internalDeviceType}</span>
                                                </td>
                                                <td>{mapping.createdBy?.fullName || '-'}</td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                        <button className="btn btn-ghost btn-sm" onClick={() => startEdit(mapping)}>
                                                            <Edit size={14} />
                                                        </button>
                                                        <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(mapping._id)} style={{ color: 'var(--color-danger, #ef4444)' }}>
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
