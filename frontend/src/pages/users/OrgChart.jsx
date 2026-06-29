import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Users, GitBranch, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { usersApi } from '../../services/api';
import toast from 'react-hot-toast';
import '../sites/Sites.css';
import './Users.css';

const NODE_W = 160;
const NODE_H = 72;
const H_GAP = 40;
const V_GAP = 60;
const ROW_H = NODE_H + V_GAP;

const MIN_ZOOM = 0.15;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.15;

const roleBadge = {
    Admin: 'role-admin', Supervisor: 'role-supervisor',
    Dispatcher: 'role-dispatcher', L1Engineer: 'role-l1',
    L2Engineer: 'role-l2', ClientViewer: 'role-client',
    SiteClient: 'role-client', Vendor: 'role-vendor',
};

function buildTree(users) {
    const byId = {};
    users.forEach(u => { byId[u._id || u.userId] = u; });

    const childrenOf = {};
    users.forEach(u => {
        const pid = u.reportsTo?._id || u.reportsTo;
        if (pid && byId[pid]) {
            if (!childrenOf[pid]) childrenOf[pid] = [];
            childrenOf[pid].push(u._id || u.userId);
        }
    });

    const rootIds = users
        .filter(u => {
            const pid = u.reportsTo?._id || u.reportsTo;
            return !pid || !byId[pid];
        })
        .map(u => u._id || u.userId);

    return { byId, childrenOf, rootIds };
}

function computeLayout(users) {
    if (!users.length) return { flatNodes: [], edges: [], canvasW: 800, canvasH: 400 };

    const { byId, childrenOf, rootIds } = buildTree(users);
    const nodes = [];

    function subtreeWidth(id) {
        const kids = childrenOf[id] || [];
        if (!kids.length) return NODE_W;
        const total = kids.reduce((sum, cid) => sum + subtreeWidth(cid), 0);
        return Math.max(NODE_W, total + (kids.length - 1) * H_GAP);
    }

    function place(id, depth, left) {
        const kids = childrenOf[id] || [];
        const sw = subtreeWidth(id);
        const cx = left + sw / 2;
        nodes.push({ id, x: cx - NODE_W / 2, y: depth * ROW_H, user: byId[id] });
        let childLeft = left;
        kids.forEach(cid => {
            const csw = subtreeWidth(cid);
            place(cid, depth + 1, childLeft);
            childLeft += csw + H_GAP;
        });
    }

    let xOffset = 0;
    rootIds.forEach(rid => {
        const sw = subtreeWidth(rid);
        place(rid, 0, xOffset);
        xOffset += sw + H_GAP;
    });

    const nodeMap = {};
    nodes.forEach(n => { nodeMap[n.id] = n; });

    const edges = [];
    nodes.forEach(n => {
        const pid = n.user?.reportsTo?._id || n.user?.reportsTo;
        if (pid && nodeMap[pid]) {
            const p = nodeMap[pid];
            edges.push({
                x1: p.x + NODE_W / 2,
                y1: p.y + NODE_H,
                x2: n.x + NODE_W / 2,
                y2: n.y,
            });
        }
    });

    const maxX = nodes.reduce((m, n) => Math.max(m, n.x + NODE_W), 0);
    const maxY = nodes.reduce((m, n) => Math.max(m, n.y + NODE_H), 0);

    return { flatNodes: nodes, edges, canvasW: maxX + 48, canvasH: maxY + 48 };
}

export default function OrgChart() {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [dragging, setDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
    const containerRef = useRef(null);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await usersApi.getAll({ isActive: true, limit: 500 });
                const all = res.data.data || [];
                setEmployees(all.filter(u => u.role !== 'Vendor'));
            } catch {
                toast.error('Failed to load users');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const { flatNodes, edges, canvasW, canvasH } = useMemo(
        () => computeLayout(employees),
        [employees]
    );

    const fitToScreen = useCallback(() => {
        const el = containerRef.current;
        if (!el || !canvasW || !canvasH) return;
        const rect = el.getBoundingClientRect();
        const padding = 40;
        const scaleX = (rect.width - padding * 2) / canvasW;
        const scaleY = (rect.height - padding * 2) / canvasH;
        const newZoom = Math.min(Math.max(Math.min(scaleX, scaleY), MIN_ZOOM), MAX_ZOOM);
        const offsetX = (rect.width - canvasW * newZoom) / 2;
        const offsetY = padding;
        setZoom(newZoom);
        setPan({ x: offsetX, y: offsetY });
    }, [canvasW, canvasH]);

    useEffect(() => {
        if (!loading && employees.length > 0) {
            requestAnimationFrame(fitToScreen);
        }
    }, [loading, employees.length, fitToScreen]);

    const handleWheel = useCallback((e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
        setZoom(z => {
            const newZ = Math.min(Math.max(z + delta, MIN_ZOOM), MAX_ZOOM);
            const rect = containerRef.current?.getBoundingClientRect();
            if (rect) {
                const cx = e.clientX - rect.left;
                const cy = e.clientY - rect.top;
                setPan(p => ({
                    x: cx - (cx - p.x) * (newZ / z),
                    y: cy - (cy - p.y) * (newZ / z),
                }));
            }
            return newZ;
        });
    }, []);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        el.addEventListener('wheel', handleWheel, { passive: false });
        return () => el.removeEventListener('wheel', handleWheel);
    }, [handleWheel]);

    const onPointerDown = (e) => {
        if (e.target.closest('.org-node')) return;
        setDragging(true);
        dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e) => {
        if (!dragging) return;
        setPan({
            x: dragStart.current.panX + (e.clientX - dragStart.current.x),
            y: dragStart.current.panY + (e.clientY - dragStart.current.y),
        });
    };

    const onPointerUp = () => setDragging(false);

    return (
        <div className="page-container animate-fade-in">
            <div className="page-header">
                <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Link to="/users" className="btn btn-ghost">
                        <ArrowLeft size={18} />
                    </Link>
                    <div>
                        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <GitBranch size={22} /> Organisation Chart
                        </h1>
                        <p className="page-subtitle">{employees.length} employees</p>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div className="org-chart-zoom-controls">
                        <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setZoom(z => Math.max(z - ZOOM_STEP, MIN_ZOOM))}
                            title="Zoom out"
                        >
                            <ZoomOut size={16} />
                        </button>
                        <span className="org-chart-zoom-label">{Math.round(zoom * 100)}%</span>
                        <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setZoom(z => Math.min(z + ZOOM_STEP, MAX_ZOOM))}
                            title="Zoom in"
                        >
                            <ZoomIn size={16} />
                        </button>
                        <button
                            className="btn btn-ghost btn-sm"
                            onClick={fitToScreen}
                            title="Fit to screen"
                        >
                            <Maximize size={16} />
                        </button>
                    </div>
                    <Link to="/users" className="btn btn-ghost btn-sm">
                        Back to Users
                    </Link>
                </div>
            </div>

            {loading ? (
                <div className="loading-state"><div className="spinner" /><p>Loading…</p></div>
            ) : employees.length === 0 ? (
                <div className="glass-card empty-state" style={{ padding: '3rem', textAlign: 'center' }}>
                    <Users size={48} style={{ margin: '0 auto 1rem', color: 'var(--text-muted)' }} />
                    <h3>No employees found</h3>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                        Set "Reports To" on user profiles to build the hierarchy.
                    </p>
                    <Link to="/users" className="btn btn-primary btn-sm">Go to Users</Link>
                </div>
            ) : (
                <>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                        Scroll to zoom, drag to pan. Click any node to edit.
                    </div>
                    <div
                        ref={containerRef}
                        className="glass-card org-chart-viewport"
                        onPointerDown={onPointerDown}
                        onPointerMove={onPointerMove}
                        onPointerUp={onPointerUp}
                        style={{ cursor: dragging ? 'grabbing' : 'grab' }}
                    >
                        <div
                            style={{
                                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                                transformOrigin: '0 0',
                                position: 'relative',
                                width: canvasW,
                                height: canvasH,
                            }}
                        >
                            <svg
                                style={{ position: 'absolute', inset: 0, width: canvasW, height: canvasH, pointerEvents: 'none' }}
                            >
                                {edges.map((e, i) => (
                                    <path
                                        key={i}
                                        d={`M ${e.x1} ${e.y1} C ${e.x1} ${(e.y1 + e.y2) / 2}, ${e.x2} ${(e.y1 + e.y2) / 2}, ${e.x2} ${e.y2}`}
                                        fill="none"
                                        stroke="rgba(148,163,184,0.45)"
                                        strokeWidth={1.5}
                                    />
                                ))}
                            </svg>
                            {flatNodes.map(n => (
                                <Link
                                    key={n.id}
                                    to={`/users/${n.id}/edit`}
                                    className="org-node"
                                    style={{ left: n.x, top: n.y }}
                                    title={`${n.user?.fullName} - click to edit`}
                                >
                                    <div className="org-node-avatar">
                                        {n.user?.profilePicture ? (
                                            <img
                                                src={n.user.profilePicture}
                                                alt={n.user.fullName}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                        ) : (
                                            n.user?.fullName?.[0]?.toUpperCase()
                                        )}
                                    </div>
                                    <div className="org-node-name">{n.user?.fullName}</div>
                                    <span className={`role-badge org-node-role ${roleBadge[n.user?.role] || ''}`}>
                                        {n.user?.role}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
