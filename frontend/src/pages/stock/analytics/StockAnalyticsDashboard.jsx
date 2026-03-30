import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Package, Warehouse, MapPin, TrendingUp, Clock,
  Download, Calendar, ChevronRight, MoreVertical,
  Truck, Video, Router, Cable, History, Inbox
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts';
import { stockApi } from '../../../services/api';
import './StockAnalyticsDashboard.css';

// ─── Color palette matching Stitch design tokens ─────────────────────
const COLORS = ['#2b4bb9', '#4648d4', '#006242', '#ba1a1a', '#f59e0b'];

// ─── Determine icon from asset type ──────────────────────────────────
const ReqIcon = ({ assetType }) => {
  const t = (assetType || '').toLowerCase();
  const size = 18;
  if (t.includes('camera') || t.includes('cctv') || t.includes('dome')) return <Video size={size} />;
  if (t.includes('switch') || t.includes('router') || t.includes('poe')) return <Router size={size} />;
  if (t.includes('cable') || t.includes('cat') || t.includes('wire')) return <Cable size={size} />;
  return <Package size={size} />;
};

// ─── Status badge helper ──────────────────────────────────────────────
const statusClass = (status) => {
  switch ((status || '').toLowerCase()) {
    case 'approved':   return 'sa-badge-approved';
    case 'fulfilled':  return 'sa-badge-approved';
    case 'pending':    return 'sa-badge-pending';
    case 'rejected':   return 'sa-badge-rejected';
    default:           return 'sa-badge-processing';
  }
};

// ─── Main Component ───────────────────────────────────────────────────
export default function StockAnalyticsDashboard() {
  const [loading, setLoading]           = useState(true);
  const [inventory, setInventory]       = useState([]);
  const [locationData, setLocationData] = useState([]);
  const [mixData, setMixData]           = useState([]);
  const [movementData, setMovementData] = useState([]);
  const [transfers, setTransfers]       = useState([]);
  const [requisitions, setRequisitions] = useState([]);
  const [error, setError]               = useState(null);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [invRes, movStatsRes, movLogsRes, reqRes, transRes] = await Promise.allSettled([
        stockApi.getInventory(),
        stockApi.getMovementStats(),
        stockApi.getMovementLogs({ limit: 5 }),
        stockApi.getRequisitions({ limit: 5, sort: '-createdAt' }),
        stockApi.getTransfers({ status: 'Pending,InTransit', limit: 3 }),
      ]);

      // 1. Process inventory → KPIs + Location bars + Mix donut
      if (invRes.status === 'fulfilled') {
        const items = invRes.value?.data?.data || [];
        setInventory(items);

        // Group by site for stacked bars
        const locationMap = {};
        const assetTypeMap = {};

        items.forEach(item => {
          const cnt    = item.count || 0;
          const loc    = item.siteName || 'Unknown';
          const type   = item.assetType || 'Others';

          if (!locationMap[loc]) {
            locationMap[loc] = { name: loc, total: 0, isHO: item.isHeadOffice, camera: 0, display: 0, poe: 0, others: 0 };
          }
          locationMap[loc].total += cnt;
          if (['Camera', 'IP Camera', 'Analog Camera', 'CCTV'].includes(type)) locationMap[loc].camera += cnt;
          else if (['Display', 'Monitor', 'LED TV', 'LED'].includes(type))       locationMap[loc].display += cnt;
          else if (['Switch', 'PoE Switch', 'Router', 'Network Switch'].includes(type)) locationMap[loc].poe += cnt;
          else locationMap[loc].others += cnt;

          assetTypeMap[type] = (assetTypeMap[type] || 0) + cnt;
        });

        // Convert location map to percentage-based for progress bars
        const locs = Object.values(locationMap)
          .sort((a, b) => b.total - a.total)
          .slice(0, 4)
          .map(loc => {
            const total = loc.total || 1;
            return {
              name:    loc.name,
              total:   loc.total,
              isHO:    loc.isHO,
              camera:  Math.round((loc.camera / total) * 100),
              display: Math.round((loc.display / total) * 100),
              poe:     Math.round((loc.poe + loc.others) / total * 100),
            };
          });
        setLocationData(locs);

        // Mix donut — top 3 asset type categories
        const mixTotal = Object.values(assetTypeMap).reduce((s, v) => s + v, 0) || 1;
        const mix = Object.entries(assetTypeMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([name, value], i) => ({
            name,
            pct:   Math.round((value / mixTotal) * 100),
            count: value,
            color: COLORS[i],
          }));
        setMixData(mix);
      }

      // 2. Process movement stats → area chart
      if (movStatsRes.status === 'fulfilled') {
        const raw = movStatsRes.value?.data?.data || movStatsRes.value?.data || [];
        // Expected shape: [{ date, inbound, outbound }, ...]
        if (Array.isArray(raw) && raw.length > 0) {
          setMovementData(raw.map(d => ({
            date:     d.date || d.period || d._id || 'Unknown',
            inbound:  d.inbound || d.in || 0,
            outbound: d.outbound || d.out || 0,
          })));
        }
      }

      // Fallback: build movement series from raw movement logs if stats endpoint is empty
      if ((movStatsRes.status !== 'fulfilled' || !movStatsRes.value?.data?.data?.length) && movLogsRes.status === 'fulfilled') {
        const logs = movLogsRes.value?.data?.data || [];
        const dateMap = {};
        logs.forEach(log => {
          const day = new Date(log.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
          if (!dateMap[day]) dateMap[day] = { date: day, inbound: 0, outbound: 0 };
          if ((log.action || '').toLowerCase().includes('add') || log.movementType === 'IN') {
            dateMap[day].inbound += log.quantity || 0;
          } else {
            dateMap[day].outbound += log.quantity || 0;
          }
        });
        setMovementData(Object.values(dateMap));
      }

      // 3. Transfers
      if (transRes.status === 'fulfilled') {
        setTransfers(transRes.value?.data?.data || []);
      }

      // 4. Requisitions table
      if (reqRes.status === 'fulfilled') {
        setRequisitions(reqRes.value?.data?.data || []);
      }

    } catch (err) {
      console.error('[StockAnalytics] Fatal fetch error:', err);
      setError('Failed to load analytics data. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  // Derived KPI values from real inventory
  const totalInventory  = inventory.reduce((s, i) => s + (i.count || 0), 0);
  const hoStock         = inventory.filter(i => i.isHeadOffice).reduce((s, i) => s + (i.count || 0), 0);
  const siteStock       = totalInventory - hoStock;
  const pendingReqs     = requisitions.filter(r => r.status === 'Pending').length;

  // Active transfer for the map card
  const activeTransfer  = transfers.find(t => t.status === 'InTransit') || transfers[0];

  if (loading) {
    return (
      <div className="sa-container sa-loading">
        <div className="loading-spinner" />
        <p className="sa-loading-text">Loading inventory data…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="sa-container sa-loading">
        <p className="sa-error-text">{error}</p>
        <button className="sa-btn sa-btn-primary" onClick={fetchAll}>Retry</button>
      </div>
    );
  }

  // SVG donut helpers
  const donutTotal = mixData.reduce((s, d) => s + d.pct, 0) || 100;

  return (
    <div className="sa-container sa-animate-in">

      {/* ──── Header ──── */}
      <header className="sa-header">
        <div>
          <h1 className="sa-title">Inventory Intelligence</h1>
          <p className="sa-subtitle">Real-time stock flow across regional hubs.</p>
        </div>
        <div className="sa-header-actions">
          <button className="sa-btn sa-btn-outline">
            <Calendar size={14} />
            Last 30 Days
          </button>
          <Link to="/stock/inventory" className="sa-btn sa-btn-primary">
            <Download size={14} />
            View Full Inventory
          </Link>
        </div>
      </header>

      {/* ──── KPI Row ──── */}
      <section className="sa-kpi-row">
        <KPICard
          title="Total Spares"
          value={totalInventory}
          trend={totalInventory > 0 ? 'In Stock' : 'No Stock'}
          trendUp={totalInventory > 0}
          icon={<Package size={22} />}
          iconBg="sa-icon-blue"
          sparkline
        />
        <KPICard
          title="HO Stock"
          value={hoStock}
          trend="Stable"
          icon={<Warehouse size={22} />}
          iconBg="sa-icon-amber"
        />
        <KPICard
          title="Site Stock"
          value={siteStock}
          trend={siteStock > 0 ? 'Distributed' : 'Empty'}
          trendUp={siteStock > 0}
          icon={<MapPin size={22} />}
          iconBg="sa-icon-emerald"
        />
        <KPICard
          title="Pending Requests"
          value={pendingReqs}
          trend={pendingReqs === 0 ? 'All Clear' : `${pendingReqs} Awaiting`}
          trendUp={pendingReqs === 0}
          icon={<Clock size={22} />}
          iconBg="sa-icon-red"
        />
      </section>

      {/* ──── Bento Row 1: Location Bars + Mix Donut ──── */}
      <section className="sa-bento-row">

        {/* Stock by Location — stacked horizontal progress bars */}
        <div className="sa-card">
          <div className="sa-card-header">
            <h3 className="sa-card-title">Stock by Location</h3>
            <div className="sa-legend">
              <LegendDot color="#2b4bb9" label="Camera" />
              <LegendDot color="#4648d4" label="Display" />
              <LegendDot color="#006242" label="Switch / Others" />
            </div>
          </div>

          {locationData.length === 0 ? (
            <EmptyState label="No inventory data available" />
          ) : (
            <div className="sa-location-bars">
              {locationData.map(loc => (
                <div key={loc.name} className="sa-loc-item">
                  <div className="sa-loc-meta">
                    <span className="sa-loc-name">
                      {loc.name}
                      {loc.isHO && <span className="sa-ho-badge">HO</span>}
                    </span>
                    <span className="sa-loc-count">{loc.total} Items</span>
                  </div>
                  <div className="sa-progress-track">
                    {loc.camera  > 0 && <div className="sa-progress-fill sa-fill-primary"    style={{ width: `${loc.camera}%`  }} />}
                    {loc.display > 0 && <div className="sa-progress-fill sa-fill-secondary"  style={{ width: `${loc.display}%` }} />}
                    {loc.poe     > 0 && <div className="sa-progress-fill sa-fill-tertiary"   style={{ width: `${loc.poe}%`     }} />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Inventory Mix — SVG donut */}
        <div className="sa-card sa-mix-card">
          <h3 className="sa-card-title">Inventory Mix</h3>

          {mixData.length === 0 ? (
            <EmptyState label="No mix data" />
          ) : (
            <>
              <div className="sa-donut-wrapper">
                <svg className="sa-donut" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="16" fill="transparent" stroke="#f2f4f6" strokeWidth="4" />
                  {(() => {
                    let offset = 0;
                    return mixData.map((seg, i) => {
                      const dashArray  = `${seg.pct} ${100 - seg.pct}`;
                      const dashOffset = -offset;
                      offset += seg.pct;
                      return (
                        <circle
                          key={i}
                          cx="18" cy="18" r="16"
                          fill="transparent"
                          stroke={seg.color}
                          strokeWidth="4"
                          strokeDasharray={dashArray}
                          strokeDashoffset={dashOffset}
                          strokeLinecap="round"
                        />
                      );
                    });
                  })()}
                </svg>
                <div className="sa-donut-center">
                  <span className="sa-donut-value">{totalInventory}</span>
                  <span className="sa-donut-label">Total Items</span>
                </div>
              </div>
              <div className="sa-mix-legend">
                {mixData.map(seg => (
                  <div key={seg.name} className="sa-mix-row">
                    <div className="sa-mix-left">
                      <span className="sa-dot" style={{ backgroundColor: seg.color }} />
                      <span>{seg.name}</span>
                    </div>
                    <span className="sa-mix-pct">{seg.pct}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* ──── Bento Row 2: Area Chart + Active Transfers ──── */}
      <section className="sa-bento-row-2">

        {/* Area Chart: Stock Movement Over Time */}
        <div className="sa-card">
          <div className="sa-card-header">
            <h3 className="sa-card-title">Stock Movement Over Time</h3>
            <div className="sa-legend">
              <LegendDot color="#2b4bb9" label="Inbound" />
              <LegendDot color="#006242" label="Outbound" />
            </div>
          </div>

          {movementData.length === 0 ? (
            <EmptyState label="No movement data available" />
          ) : (
            <div className="sa-chart-area">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={movementData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradIn" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2b4bb9" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#2b4bb9" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradOut" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#006242" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#006242" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px rgba(0,0,0,0.1)', fontFamily: 'Inter' }}
                    formatter={(val, name) => [val, name === 'inbound' ? 'Inbound' : 'Outbound']}
                  />
                  <Area type="monotone" dataKey="inbound"  stroke="#2b4bb9" strokeWidth={3} fill="url(#gradIn)"  />
                  <Area type="monotone" dataKey="outbound" stroke="#006242" strokeWidth={3} fill="url(#gradOut)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Active Transfers — dark map card */}
        <div className="sa-card sa-transfer-card">
          <div className="sa-transfer-header">
            <h3 className="sa-card-title sa-text-white">Active Transfers</h3>
            <p className="sa-transfer-sub">Real-time hub connectivity</p>
          </div>

          <div className="sa-map-visual">
            <div className="sa-pulse-dot sa-dot-1" />
            <div className="sa-pulse-dot sa-dot-2" />
            <div className="sa-pulse-dot sa-dot-3" />
            <svg className="sa-map-lines">
              <path d="M60,100 Q120,70 150,65"    fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="4 4" />
              <path d="M150,65 Q200,90 240,110"   fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="4 4" />
            </svg>
          </div>

          {activeTransfer ? (
            <div className="sa-transfer-card-bottom">
              <div className="sa-transfer-info">
                <div className="sa-transfer-icon"><Truck size={14} /></div>
                <div>
                  <p className="sa-transfer-id">
                    {activeTransfer.sourceSiteId?.siteName || 'Transfer'} → {activeTransfer.destinationSiteId?.siteName || '—'}</p>
                  <p className="sa-transfer-meta">{activeTransfer.status} • {activeTransfer.assetIds?.length || 0} items</p>
                </div>
              </div>
              <Link to="/stock/transfers">
                <ChevronRight size={14} className="sa-text-white" />
              </Link>
            </div>
          ) : (
            <div className="sa-transfer-card-bottom">
              <div className="sa-transfer-info">
                <div className="sa-transfer-icon"><Truck size={14} /></div>
                <div>
                  <p className="sa-transfer-id">No active transfers</p>
                  <p className="sa-transfer-meta">All transfers completed</p>
                </div>
              </div>
              <Link to="/stock/transfers">
                <ChevronRight size={14} className="sa-text-white" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ──── Bottom: Requisitions Table ──── */}
      <section className="sa-card sa-table-card">
        <div className="sa-card-header">
          <h3 className="sa-card-title">Recent Stock Requisitions</h3>
          <Link to="/stock/requisitions" className="sa-view-all">View All</Link>
        </div>

        {requisitions.length === 0 ? (
          <EmptyState label="No recent requisitions found" />
        ) : (
          <div className="sa-table-wrap">
            <table className="sa-table">
              <thead>
                <tr>
                  <th>Requisition ID</th>
                  <th>Item Name</th>
                  <th>Destination</th>
                  <th>Requested By</th>
                  <th>Status</th>
                  <th className="sa-th-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {requisitions.map(req => (
                  <tr key={req._id} className="sa-table-row">
                    <td className="sa-td-id">#{req.ticketId?.ticketNumber || req._id?.slice(-6)}</td>
                    <td>
                      <div className="sa-td-item">
                        <div className="sa-td-item-icon">
                          <ReqIcon assetType={req.assetType} />
                        </div>
                        <div>
                          <p className="sa-td-item-name">{req.assetType}</p>
                          <p className="sa-td-item-cat">Qty: {req.quantity}</p>
                        </div>
                      </div>
                    </td>
                    <td className="sa-td-dest">{req.siteId?.siteName || '—'}</td>
                    <td>
                      <div className="sa-td-user">
                        <div className="sa-avatar" />
                        <span>{req.requestedBy?.fullName || req.requestedBy?.username || '—'}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`sa-status-badge ${statusClass(req.status)}`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="sa-td-action">
                      <Link to={`/stock/requisitions`} className="sa-action-btn">
                        <MoreVertical size={16} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────
function KPICard({ title, value, trend, trendUp, icon, iconBg, sparkline }) {
  return (
    <div className="sa-kpi-card">
      <div className="sa-kpi-top">
        <span className="sa-kpi-label">{title}</span>
        <div className={`sa-kpi-icon ${iconBg}`}>{icon}</div>
      </div>
      <div className="sa-kpi-bottom">
        <span className="sa-kpi-value">{value}</span>
        <span className={`sa-kpi-trend ${trendUp ? 'sa-trend-up' : ''}`}>
          {trendUp && <TrendingUp size={12} />}
          {trend}
        </span>
      </div>
      {sparkline && (
        <div className="sa-kpi-sparkline">
          <svg viewBox="0 0 100 40" preserveAspectRatio="none">
            <path d="M0 35 Q 25 35, 50 15 T 100 5" fill="none" stroke="currentColor" strokeWidth="4" />
          </svg>
        </div>
      )}
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <div className="sa-legend-item">
      <span className="sa-legend-dot" style={{ backgroundColor: color }} />
      <span>{label}</span>
    </div>
  );
}

function EmptyState({ label }) {
  return (
    <div className="sa-empty">
      <Inbox size={28} className="sa-empty-icon" />
      <p>{label}</p>
    </div>
  );
}
