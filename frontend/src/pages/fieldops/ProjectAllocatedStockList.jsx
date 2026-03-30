import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
    ChevronLeft,
    RefreshCw,
    Package,
    AlertCircle,
    Plus,
    Search
} from 'lucide-react';
import { fieldOpsApi, stockApi } from '../../services/api';
import toast from 'react-hot-toast';
import './fieldops.css';

export default function ProjectAllocatedStockList() {
    const { projectId: id } = useParams(); // URL should be /fieldops/projects/:projectId/stock

    const [project, setProject] = useState(null);
    const [allocations, setAllocations] = useState([]);
    const [loading, setLoading] = useState(true);

    const [searchTerm, setSearchTerm] = useState('');
    const [assetTypeFilter, setAssetTypeFilter] = useState('');
    const [deviceTypeFilter, setDeviceTypeFilter] = useState('');

    useEffect(() => {
        if (id) {
            loadProjectDetails();
            loadAllocations();
        }
    }, [id]);

    const loadProjectDetails = async () => {
        try {
            const res = await fieldOpsApi.getProjectById(id);
            setProject(res.data.data);
        } catch (error) {
            console.error('Failed to load project details:', error);
        }
    };

    const loadAllocations = async () => {
        setLoading(true);
        try {
            const res = await stockApi.getAllocations({ projectId: id, limit: 1000 });
            setAllocations(res.data.data || []);
        } catch {
            toast.error('Failed to load allocations');
        } finally {
            setLoading(false);
        }
    };

    const totalAllocated = allocations.reduce((sum, a) => sum + (a.allocatedQty || 0), 0);
    const totalInstalled = allocations.reduce((sum, a) => sum + (a.installedQty || 0), 0);
    const totalFaulty = allocations.reduce((sum, a) => sum + (a.faultyQty || 0), 0);
    const remaining = totalAllocated - totalInstalled - totalFaulty;

    const filteredAllocations = allocations.filter(alloc => {
        const item = alloc.stockItemId || {};

        let matchesSearch = true;
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            matchesSearch = (item.serialNumber && item.serialNumber.toLowerCase().includes(searchLower)) ||
                (item.macAddress && item.macAddress.toLowerCase().includes(searchLower)) ||
                (item.make && item.make.toLowerCase().includes(searchLower)) ||
                (item.model && item.model.toLowerCase().includes(searchLower));
        }

        const matchesAssetType = !assetTypeFilter || (item.assetType === assetTypeFilter);
        const matchesDeviceType = !deviceTypeFilter || (item.deviceType === deviceTypeFilter);

        return matchesSearch && matchesAssetType && matchesDeviceType;
    });

    const uniqueAssetTypes = [...new Set(allocations.map(a => a.stockItemId?.assetType).filter(Boolean))];
    const uniqueDeviceTypes = [...new Set(allocations.map(a => a.stockItemId?.deviceType).filter(Boolean))];

    return (
        <div className="page-container animate-fade-in">
            <div className="page-header">
                <div className="header-left">
                    <Link to={`/fieldops/projects/${id}`} className="back-button" style={{ marginRight: '1rem', display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }}>
                        <ChevronLeft size={24} />
                    </Link>
                    <Package size={28} className="page-icon" />
                    <div>
                        <h1 className="page-title">Allocated Stock</h1>
                        {project && <p className="text-secondary">{project.projectNumber} - {project.projectName}</p>}
                    </div>
                </div>
                <div className="header-actions">
                    <button onClick={loadAllocations} className="btn btn-ghost" title="Refresh">
                        <RefreshCw size={18} />
                    </button>
                    <Link to="/stock" className="btn btn-ghost">
                        <Package size={18} /> View Inventory
                    </Link>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
                <div className="pm-stat-card">
                    <div className="pm-stat-icon primary">
                        <Package size={24} />
                    </div>
                    <div className="pm-stat-content">
                        <h3>{Number(totalAllocated.toFixed(2))}</h3>
                        <p>Total Allocated</p>
                    </div>
                </div>
                <div className="pm-stat-card">
                    <div className="pm-stat-icon success">
                        <Package size={24} />
                    </div>
                    <div className="pm-stat-content">
                        <h3>{Number(totalInstalled.toFixed(2))}</h3>
                        <p>Installed</p>
                    </div>
                </div>
                <div className="pm-stat-card">
                    <div className="pm-stat-icon warning">
                        <Package size={24} />
                    </div>
                    <div className="pm-stat-content">
                        <h3>{Number(remaining.toFixed(2))}</h3>
                        <p>Remaining</p>
                    </div>
                </div>
                <div className="pm-stat-card">
                    <div className="pm-stat-icon danger">
                        <AlertCircle size={24} />
                    </div>
                    <div className="pm-stat-content">
                        <h3>{Number(totalFaulty.toFixed(2))}</h3>
                        <p>Faulty</p>
                    </div>
                </div>
            </div>

            {/* Allocations Table */}
            <div className="glass-card mt-4">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <h3 className="card-title m-0">
                        Stock Items: {filteredAllocations.length} {filteredAllocations.length !== allocations.length && `(filtered from ${allocations.length})`}
                    </h3>
                </div>

                <div className="filters-section" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                    <div className="search-box" style={{ flex: 1, minWidth: '250px' }}>
                        <Search size={18} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search SL, MAC, Make, Model..."
                            className="search-input"
                            style={{ width: '100%', height: '2.5rem' }}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        className="input"
                        style={{ width: '10rem', height: '2.5rem', padding: '0.5rem' }}
                        value={assetTypeFilter}
                        onChange={(e) => setAssetTypeFilter(e.target.value)}
                    >
                        <option value="">All Asset Types</option>
                        {uniqueAssetTypes.map(t => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                    <select
                        className="input"
                        style={{ width: '10rem', height: '2.5rem', padding: '0.5rem' }}
                        value={deviceTypeFilter}
                        onChange={(e) => setDeviceTypeFilter(e.target.value)}
                    >
                        <option value="">All Device Types</option>
                        {uniqueDeviceTypes.map(t => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                </div>

                {loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Loading allocated stock...</p>
                    </div>
                ) : allocations.length === 0 ? (
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
                                {filteredAllocations.map(alloc => {
                                    const itemRemaining = (alloc.allocatedQty || 0) - (alloc.installedQty || 0) - (alloc.faultyQty || 0);
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
                                                    {stockItem.macAddress && ` · MAC: ${stockItem.macAddress}`}
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
                                                color: itemRemaining > 0 ? 'var(--warning-400)' : 'var(--success-400)'
                                            }}>
                                                {Number(itemRemaining.toFixed(2))}
                                            </td>
                                            <td style={{ textAlign: 'center', padding: '1rem' }}>
                                                <span className={`status-badge ${alloc.status === 'FullyInstalled' ? 'status-badge-success' :
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
            </div>
        </div>
    );
}
