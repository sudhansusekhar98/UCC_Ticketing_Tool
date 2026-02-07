import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    Package, Warehouse, ArrowRightLeft, ClipboardList, Plus, Building2, MapPin, Upload, ChevronRight, Inbox, History
} from 'lucide-react';
import { stockApi, sitesApi } from '../../services/api';
import toast from 'react-hot-toast';
import useAuthStore from '../../context/authStore';
import { PERMISSIONS } from '../../constants/permissions';
import './StockCommon.css';
import './StockDashboard.css';


export default function StockDashboard() {
    const [inventory, setInventory] = useState([]);
    const [pendingRequisitions, setPendingRequisitions] = useState([]);
    const [pendingTransfers, setPendingTransfers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sites, setSites] = useState([]);
    const [permissionsLoaded, setPermissionsLoaded] = useState(false);

    // Permission checks - get user from store to react to changes
    const { hasRightForAnySite, hasRole, refreshUserRights, user } = useAuthStore();
    const isAdminOrSupervisor = hasRole(['Admin', 'Supervisor']);
    const canManageStock = isAdminOrSupervisor || hasRightForAnySite(PERMISSIONS.MANAGE_SITE_STOCK);

    // Debug log for troubleshooting
    useEffect(() => {
        if (permissionsLoaded) {
            console.log('Stock Permission Check:', {
                isAdminOrSupervisor,
                canManageStock,
                userRole: user?.role,
                globalRights: user?.rights?.globalRights,
                siteRights: user?.rights?.siteRights?.map(sr => ({
                    siteId: sr.site?._id || sr.site,
                    rights: sr.rights
                }))
            });
        }
    }, [permissionsLoaded, user]);

    useEffect(() => {
        const loadPermissionsAndData = async () => {
            // Refresh user rights on page load to get latest permissions
            await refreshUserRights();
            setPermissionsLoaded(true);
            fetchData();
        };
        loadPermissionsAndData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [invRes, reqRes, transRes, sitesRes] = await Promise.all([
                stockApi.getInventory(),
                stockApi.getRequisitions({ status: 'Pending', limit: 5 }),
                stockApi.getTransfers({ status: 'Pending,InTransit', limit: 5 }),
                sitesApi.getDropdown()
            ]);

            setInventory(invRes.data.data || []);
            setPendingRequisitions(reqRes.data.data || []);
            setPendingTransfers(transRes.data.data || []);
            setSites(sitesRes.data.data || sitesRes.data || []);
        } catch (error) {
            console.error('Failed to fetch stock data:', error);
            toast.error('Failed to load stock data');
        } finally {
            setLoading(false);
        }
    };

    // Group inventory by site
    const inventoryBySite = inventory.reduce((acc, item) => {
        const key = item.siteId;
        if (!acc[key]) {
            acc[key] = { siteName: item.siteName, isHeadOffice: item.isHeadOffice, items: [] };
        }
        acc[key].items.push(item);
        return acc;
    }, {});

    // Calculate totals
    const totalSpare = inventory.reduce((sum, item) => sum + item.count, 0);
    const hoStock = inventory.filter(i => i.isHeadOffice).reduce((sum, item) => sum + item.count, 0);
    const siteStock = totalSpare - hoStock;

    if (loading) {
        return (
            <div className="stock-container">
                <div className="stock-dashboard loading-state">
                    <div className="loading-spinner"></div>
                    <p>Loading stock data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="stock-container">
            <div className="stock-dashboard animate-fade-in">
                {/* Enhanced Page Header */}
                <header className="dashboard-header">
                    <div className="header-left">
                        <div className="header-icon">
                            <Package size={28} />
                        </div>
                        <div className="header-text">
                            <h1>Stock Management</h1>
                            <p>Centralized inventory control and asset movement</p>
                        </div>
                    </div>
                    <div className="header-actions">
                        {permissionsLoaded && canManageStock && (
                            <>
                                <Link to="/stock/bulk" className="btn btn-secondary btn-ghost">
                                    <Upload size={16} />
                                    Bulk Import
                                </Link>
                                <Link to="/stock/add" className="btn btn-primary btn-prominent">
                                    <Plus size={18} />
                                    Add New Stock
                                </Link>
                            </>
                        )}
                    </div>
                </header>

                {/* Enhanced KPI Cards */}
                <section className="kpi-section">
                    <div className="kpi-grid">
                        <div className="kpi-card kpi-total">
                            <div className="kpi-icon-wrapper">
                                <Package size={22} />
                            </div>
                            <div className="kpi-data">
                                <span className="kpi-value">{totalSpare}</span>
                                <span className="kpi-label">Total Spares</span>
                            </div>
                        </div>
                        <div className="kpi-card kpi-ho">
                            <div className="kpi-icon-wrapper">
                                <Warehouse size={22} />
                            </div>
                            <div className="kpi-data">
                                <span className="kpi-value">{hoStock}</span>
                                <span className="kpi-label">HO Stock</span>
                            </div>
                        </div>
                        <div className="kpi-card kpi-sites">
                            <div className="kpi-icon-wrapper">
                                <Building2 size={22} />
                            </div>
                            <div className="kpi-data">
                                <span className="kpi-value">{siteStock}</span>
                                <span className="kpi-label">Site Stock</span>
                            </div>
                        </div>
                        <div className="kpi-card kpi-requests">
                            <div className="kpi-icon-wrapper">
                                <ClipboardList size={22} />
                            </div>
                            <div className="kpi-data">
                                <span className="kpi-value">{pendingRequisitions.length}</span>
                                <span className="kpi-label">Pending Requests</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Enhanced Quick Actions */}
                <section className="quick-actions-section">
                    <Link to="/stock/inventory" className="quick-action-tile">
                        <div className="tile-icon">
                            <Package size={24} />
                        </div>
                        <div className="tile-content">
                            <span className="tile-title">Inventory Catalog</span>
                            <span className="tile-desc">Browse all spare items</span>
                        </div>
                        <ChevronRight size={20} className="tile-arrow" />
                    </Link>
                    <Link to="/stock/requisitions" className="quick-action-tile">
                        <div className="tile-icon">
                            <ClipboardList size={24} />
                        </div>
                        <div className="tile-content">
                            <span className="tile-title">Requisition Orders</span>
                            <span className="tile-desc">Manage stock requests</span>
                        </div>
                        <ChevronRight size={20} className="tile-arrow" />
                    </Link>
                    <Link to="/stock/transfers" className="quick-action-tile">
                        <div className="tile-icon">
                            <ArrowRightLeft size={24} />
                        </div>
                        <div className="tile-content">
                            <span className="tile-title">Stock Transfers</span>
                            <span className="tile-desc">Track inter-site movements</span>
                        </div>
                        <ChevronRight size={20} className="tile-arrow" />
                    </Link>
                    <Link to="/stock/logs" className="quick-action-tile">
                        <div className="tile-icon">
                            <History size={24} />
                        </div>
                        <div className="tile-content">
                            <span className="tile-title">Movement Logs</span>
                            <span className="tile-desc">Complete audit trail</span>
                        </div>
                        <ChevronRight size={20} className="tile-arrow" />
                    </Link>
                </section>

                {/* Main Content Grid */}
                <div className="dashboard-grid">
                    {/* Left Column: Inventory Status */}
                    <section className="dashboard-section">
                        <div className="section-header">
                            <h2>Regional Inventory Status</h2>
                        </div>
                        <div className="inventory-grid">
                            {Object.entries(inventoryBySite).length > 0 ? (
                                Object.entries(inventoryBySite).map(([siteId, data]) => (
                                    <div key={siteId} className={`inventory-card ${data.isHeadOffice ? 'ho-card' : ''}`}>
                                        <div className="inventory-card-header">
                                            {data.isHeadOffice ? (
                                                <Warehouse size={18} className="icon-success" />
                                            ) : (
                                                <MapPin size={18} className="icon-primary" />
                                            )}
                                            <span className="site-name">{data.siteName}</span>
                                            {data.isHeadOffice && <span className="ho-tag">HO</span>}
                                        </div>
                                        <div className="inventory-card-body">
                                            {data.items.slice(0, 5).map((item, idx) => (
                                                <div key={idx} className="inventory-row">
                                                    <span className="asset-type">{item.assetType}</span>
                                                    <span className="asset-count">{item.count}</span>
                                                </div>
                                            ))}
                                            {data.items.length > 5 && (
                                                <div className="inventory-row more-items">
                                                    <span>+{data.items.length - 5} more types</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="empty-state-card">
                                    <Inbox size={32} className="empty-icon" />
                                    <p>No inventory data available</p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Right Column: Activity Feed */}
                    <aside className="dashboard-sidebar">
                        {/* Recent Requests */}
                        <div className="activity-card">
                            <div className="activity-header">
                                <h3>Recent Requests</h3>
                                <Link to="/stock/requisitions" className="view-all-btn">View All</Link>
                            </div>
                            <div className="activity-body">
                                {pendingRequisitions.length > 0 ? (
                                    pendingRequisitions.map(req => (
                                        <div key={req._id} className="activity-item">
                                            <div className="activity-row">
                                                <span className="activity-id">#{req.ticketId?.ticketNumber || 'REQ'}</span>
                                                <span className="activity-badge badge-pending">Pending</span>
                                            </div>
                                            <p className="activity-desc">{req.assetType} (Qty: {req.quantity})</p>
                                            <p className="activity-meta">By {req.requestedBy?.fullName} • To {req.siteId?.siteName}</p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="empty-state-inline">
                                        <Inbox size={20} />
                                        <span>No pending requests</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Active Transfers */}
                        <div className="activity-card">
                            <div className="activity-header">
                                <h3>Active Transfers</h3>
                                <Link to="/stock/transfers" className="view-all-btn">View All</Link>
                            </div>
                            <div className="activity-body">
                                {pendingTransfers.length > 0 ? (
                                    pendingTransfers.map(tr => (
                                        <div key={tr._id} className="activity-item">
                                            <div className="activity-row">
                                                <span className="activity-id">TRF-{tr._id.substring(18)}</span>
                                                <span className={`activity-badge badge-${tr.status.toLowerCase()}`}>{tr.status}</span>
                                            </div>
                                            <p className="activity-desc">{tr.assetIds?.length} Items</p>
                                            <p className="activity-meta">From: {tr.sourceSiteId?.siteName} → To: {tr.destinationSiteId?.siteName}</p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="empty-state-inline">
                                        <Inbox size={20} />
                                        <span>No active transfers</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
}
