import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Ticket,
    Monitor,
    MapPin,
    Users,
    Settings,
    LogOut,
    Menu,
    X,
    ChevronDown,
    Search,
    Shield,
    Bell,
    BarChart3,
    HelpCircle,
    Package,
    ClipboardList,
    UserCheck,
    Loader,
} from 'lucide-react';
import useAuthStore from '../../context/authStore';
import { PERMISSIONS } from '../../constants/permissions';
import { ticketsApi, assetsApi, sitesApi, usersApi } from '../../services/api';
import NotificationBell from '../notifications/NotificationBell';
import TOpsLogo from '../../assets/TicketOps.png';
import './Layout.css';

const menuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['Admin', 'Supervisor', 'Dispatcher', 'L1Engineer', 'L2Engineer', 'ClientViewer', 'SiteClient'] },
    { path: '/tickets', icon: Ticket, label: 'Tickets', roles: ['Admin', 'Supervisor', 'Dispatcher', 'L1Engineer', 'L2Engineer', 'ClientViewer', 'SiteClient'] },
    { path: '/reports', icon: BarChart3, label: 'Reports', roles: ['Admin', 'Supervisor', 'Dispatcher'] },
    { path: '/assets', icon: Monitor, label: 'Assets', roles: ['Admin', 'Supervisor', 'Dispatcher', 'ClientViewer', 'L1Engineer', 'L2Engineer'] },
    { path: '/sites', icon: MapPin, label: 'Sites', roles: ['Admin', 'Supervisor', 'Dispatcher', 'L1Engineer', 'L2Engineer'] },
    { path: '/worklog', icon: ClipboardList, label: 'Work Log', roles: ['Admin', 'Supervisor', 'Dispatcher', 'L1Engineer', 'L2Engineer'] },
    { path: '/stock', icon: Package, label: 'Stock', roles: ['Admin', 'Supervisor', 'Dispatcher'], rights: [PERMISSIONS.MANAGE_SITE_STOCK, PERMISSIONS.DIRECT_STOCK_REPLACEMENT] },
    { path: '/users', icon: Users, label: 'Users', roles: ['Admin', 'Supervisor', 'L1Engineer', 'L2Engineer'] },
    { path: '/user-rights', icon: Shield, label: 'User Rights', roles: ['Admin'] },
    { path: '/notifications/manage', icon: Bell, label: 'Notifications', roles: ['Admin'] },
    { path: '/admin/client-registrations', icon: UserCheck, label: 'Client Requests', roles: ['Admin'], badge: true },
    { path: '/help', icon: HelpCircle, label: 'Help Center', roles: ['Admin', 'Supervisor', 'Dispatcher', 'L1Engineer', 'L2Engineer', 'ClientViewer'] },
    { path: '/settings', icon: Settings, label: 'Settings', roles: ['Admin', 'Supervisor', 'Dispatcher', 'L1Engineer', 'L2Engineer', 'ClientViewer', 'SiteClient'] },
];

export default function Layout({ children }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [pendingClientCount, setPendingClientCount] = useState(0);
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout, hasRightForAnySite, hasRole, accessToken } = useAuthStore();
    const userMenuRef = useRef(null);

    // Global search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState(null);
    const [searchLoading, setSearchLoading] = useState(false);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [activeResultIndex, setActiveResultIndex] = useState(-1);
    const searchInputRef = useRef(null);
    const searchContainerRef = useRef(null);
    const searchTimerRef = useRef(null);

    // Fetch pending client registration count for Admin badge
    useEffect(() => {
        if (user?.role !== 'Admin') return;
        const API_BASE = import.meta.env.VITE_API_URL || '/api';
        fetch(`${API_BASE}/client-registrations?status=Pending&limit=1`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        })
            .then(r => r.json())
            .then(d => { if (d.success) setPendingClientCount(d.pagination?.total || 0); })
            .catch(() => { });
    }, [user?.role, accessToken, location.pathname]);

    // Close user menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
                setUserMenuOpen(false);
            }
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
                setShowSearchResults(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Keyboard shortcut: Ctrl+K to focus search
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
            if (e.key === 'Escape') {
                setShowSearchResults(false);
                searchInputRef.current?.blur();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Close search results on navigation
    useEffect(() => {
        setShowSearchResults(false);
        setSearchQuery('');
        setSearchResults(null);
    }, [location.pathname]);

    // Debounced search
    const performSearch = useCallback(async (query) => {
        if (!query || query.trim().length < 2) {
            setSearchResults(null);
            setShowSearchResults(false);
            return;
        }

        setSearchLoading(true);
        setShowSearchResults(true);
        setActiveResultIndex(-1);

        try {
            const searchParam = query.trim();
            const results = { tickets: [], assets: [], sites: [], users: [] };

            // Run searches in parallel — catch individually so one failure doesn't block all
            const [ticketsRes, assetsRes, sitesRes, usersRes] = await Promise.allSettled([
                ticketsApi.getAll({ search: searchParam }),
                assetsApi.getAll({ search: searchParam }),
                sitesApi.getAll({ search: searchParam }),
                hasRole(['Admin', 'Supervisor']) ? usersApi.getAll({ search: searchParam }) : Promise.resolve(null),
            ]);

            if (ticketsRes.status === 'fulfilled' && ticketsRes.value?.data) {
                const data = ticketsRes.value.data.data || ticketsRes.value.data.items || [];
                results.tickets = data.map(t => ({
                    id: t._id || t.ticketId,
                    title: t.ticketNumber || t.ticketId || t._id,
                    subtitle: t.subject || t.description?.slice(0, 60) || '',
                    path: `/tickets/${t._id || t.ticketId}`,
                    status: t.status,
                }));
            }

            if (assetsRes.status === 'fulfilled' && assetsRes.value?.data) {
                const data = assetsRes.value.data.data || assetsRes.value.data.items || [];
                results.assets = data.map(a => ({
                    id: a._id || a.assetId,
                    title: a.assetCode || a.ipAddress || a._id,
                    subtitle: `${a.assetType || ''} ${a.deviceType ? '· ' + a.deviceType : ''} ${a.siteName ? '· ' + a.siteName : ''}`.trim(),
                    path: `/assets/${a._id || a.assetId}`,
                    status: a.status,
                }));
            }

            if (sitesRes.status === 'fulfilled' && sitesRes.value?.data) {
                const data = sitesRes.value.data.data || sitesRes.value.data.items || [];
                results.sites = data.map(s => ({
                    id: s._id || s.siteId,
                    title: s.siteName || s.name,
                    subtitle: `${s.city || ''} ${s.zone ? '· ' + s.zone : ''}`.trim(),
                    path: `/sites/${s._id || s.siteId}`,
                }));
            }

            if (usersRes.status === 'fulfilled' && usersRes.value?.data) {
                const data = usersRes.value.data.data || usersRes.value.data.items || [];
                results.users = data.map(u => ({
                    id: u._id || u.userId,
                    title: u.fullName || u.username,
                    subtitle: `${u.role || ''} ${u.email ? '· ' + u.email : ''}`.trim(),
                    path: `/users/${u._id || u.userId}/edit`,
                }));
            }

            setSearchResults(results);
        } catch (err) {
            console.error('[GlobalSearch] Error:', err);
            setSearchResults({ tickets: [], assets: [], sites: [], users: [] });
        } finally {
            setSearchLoading(false);
        }
    }, [hasRole]);

    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchQuery(value);

        // Clear previous timer
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

        if (!value || value.trim().length < 2) {
            setSearchResults(null);
            setShowSearchResults(false);
            return;
        }

        // Debounce 400ms
        searchTimerRef.current = setTimeout(() => {
            performSearch(value);
        }, 400);
    };

    const handleSearchFocus = () => {
        if (searchResults && searchQuery.trim().length >= 2) {
            setShowSearchResults(true);
        }
    };

    // Flatten results for keyboard navigation
    const flatResults = searchResults
        ? [
            ...searchResults.tickets.map(r => ({ ...r, category: 'tickets' })),
            ...searchResults.assets.map(r => ({ ...r, category: 'assets' })),
            ...searchResults.sites.map(r => ({ ...r, category: 'sites' })),
            ...searchResults.users.map(r => ({ ...r, category: 'users' })),
        ]
        : [];

    const handleSearchKeyDown = (e) => {
        if (!showSearchResults || flatResults.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveResultIndex(prev => (prev + 1) % flatResults.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveResultIndex(prev => (prev <= 0 ? flatResults.length - 1 : prev - 1));
        } else if (e.key === 'Enter' && activeResultIndex >= 0) {
            e.preventDefault();
            const selected = flatResults[activeResultIndex];
            if (selected) {
                navigate(selected.path);
                setShowSearchResults(false);
                setSearchQuery('');
            }
        }
    };

    const handleResultClick = (path) => {
        navigate(path);
        setShowSearchResults(false);
        setSearchQuery('');
    };

    const totalResults = flatResults.length;

    const getCategoryIcon = (category) => {
        switch (category) {
            case 'tickets': return <Ticket size={14} />;
            case 'assets': return <Monitor size={14} />;
            case 'sites': return <MapPin size={14} />;
            case 'users': return <Users size={14} />;
            default: return <Search size={14} />;
        }
    };

    const getCategoryLabel = (category) => {
        switch (category) {
            case 'tickets': return 'Tickets';
            case 'assets': return 'Assets';
            case 'sites': return 'Sites';
            case 'users': return 'Users';
            default: return '';
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    // Filter menu items based on role OR rights
    const filteredMenuItems = menuItems.filter(item => {
        // Check if user has a matching role
        const hasMatchingRole = item.roles.includes(user?.role);

        // Check if user has any of the matching rights
        const hasRight = item.rights?.some(right => hasRightForAnySite(right)) || false;

        return hasMatchingRole || hasRight;
    });

    // Render search results dropdown
    const renderSearchResults = () => {
        if (!showSearchResults) return null;

        return (
            <div className="global-search-dropdown">
                {searchLoading ? (
                    <div className="search-loading">
                        <Loader size={18} className="spin" />
                        <span>Searching...</span>
                    </div>
                ) : searchResults && totalResults === 0 ? (
                    <div className="search-empty">
                        <Search size={20} />
                        <span>No results found for "{searchQuery}"</span>
                    </div>
                ) : searchResults ? (
                    <>
                        {['tickets', 'assets', 'sites', 'users'].map(category => {
                            const items = searchResults[category];
                            if (!items || items.length === 0) return null;

                            return (
                                <div key={category} className="search-category">
                                    <div className="search-category-header">
                                        {getCategoryIcon(category)}
                                        <span>{getCategoryLabel(category)}</span>
                                        <span className="search-category-count">{items.length}</span>
                                    </div>
                                    {items.map((item) => {
                                        const flatIdx = flatResults.findIndex(r => r.id === item.id && r.category === category);
                                        return (
                                            <div
                                                key={item.id}
                                                className={`search-result-item ${flatIdx === activeResultIndex ? 'active' : ''}`}
                                                onClick={() => handleResultClick(item.path)}
                                                onMouseEnter={() => setActiveResultIndex(flatIdx)}
                                            >
                                                <div className="search-result-title">{item.title}</div>
                                                {item.subtitle && <div className="search-result-subtitle">{item.subtitle}</div>}
                                                {item.status && (
                                                    <span className={`search-result-status ${item.status?.toLowerCase().replace(/\s+/g, '-')}`}>
                                                        {item.status}
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </>
                ) : null}
            </div>
        );
    };

    return (
        <div className="layout">
            {/* Sidebar Backdrop for mobile */}
            {sidebarOpen && (
                <div
                    className="sidebar-backdrop"
                    onClick={() => setSidebarOpen(false)}
                ></div>
            )}

            {/* Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
                <div className="sidebar-header">
                    <div className="logo" onClick={() => setSidebarOpen(!sidebarOpen)} style={{ cursor: 'pointer' }}>
                        <div className="logo-icon">
                            <img src={TOpsLogo} alt="TicketOps" width={70} height={55} />
                        </div>
                        {sidebarOpen && <span className="logo-text">TicketOps</span>}
                    </div>
                </div>

                <nav className="sidebar-nav custom-scrollbar">
                    {filteredMenuItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`nav-item ${location.pathname.startsWith(item.path) ? 'active' : ''}`}
                            onClick={() => window.innerWidth <= 1024 && setSidebarOpen(false)}
                        >
                            <item.icon size={20} />
                            {sidebarOpen && <span>{item.label}</span>}
                            {item.badge && pendingClientCount > 0 && (
                                <span className="nav-badge">{pendingClientCount}</span>
                            )}
                        </Link>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <button className="nav-item logout-btn" onClick={handleLogout} aria-label="Logout">
                        <LogOut size={20} aria-hidden="true" />
                        {sidebarOpen && <span>Logout</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="main-wrapper">
                {/* Header */}
                <header className="header">
                    <div className="header-left">
                        <button
                            className="mobile-sidebar-toggle"
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            aria-label="Toggle sidebar navigation"
                            aria-expanded={sidebarOpen}
                        >
                            <Menu size={24} aria-hidden="true" />
                        </button>
                        <div className="search-box" ref={searchContainerRef}>
                            <Search size={18} aria-hidden="true" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                placeholder="Search tickets, assets, sites..."
                                className="search-input"
                                value={searchQuery}
                                onChange={handleSearchChange}
                                onFocus={handleSearchFocus}
                                onKeyDown={handleSearchKeyDown}
                                aria-label="Global search input"
                            />
                            {searchQuery && (
                                <button
                                    className="search-clear-btn"
                                    onClick={() => { setSearchQuery(''); setSearchResults(null); setShowSearchResults(false); }}
                                    aria-label="Clear search"
                                >
                                    <X size={14} aria-hidden="true" />
                                </button>
                            )}
                            <div aria-live="polite">
                                {renderSearchResults()}
                            </div>
                        </div>
                    </div>

                    <div className="header-right">
                        {/* Notifications */}
                        <NotificationBell />

                        {/* User Menu */}
                        <div className="user-menu-container" ref={userMenuRef}>
                            <button
                                className="user-menu-btn"
                                onClick={() => setUserMenuOpen(!userMenuOpen)}
                                aria-label="User menu dropdown"
                                aria-expanded={userMenuOpen}
                            >
                                <div className="user-avatar" aria-hidden="true" data-initial={user?.fullName?.charAt(0).toUpperCase() || 'U'}>
                                    {user?.profilePicture && user.profilePicture !== 'null' && user.profilePicture !== 'undefined' ? (
                                        <img src={user.profilePicture} alt={user.fullName} className="header-avatar-img" width={36} height={36} onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.classList.add('show-initial'); }} />
                                    ) : (
                                        user?.fullName?.charAt(0) || 'U'
                                    )}
                                </div>
                                <div className="user-info">
                                    <span className="user-name">{user?.fullName}</span>
                                    <span className="user-role">{user?.role}</span>
                                </div>
                                <ChevronDown size={16} className={userMenuOpen ? 'rotate' : ''} />
                            </button>

                            {userMenuOpen && (
                                <div className="user-dropdown">
                                    <Link to="/profile" className="dropdown-item">
                                        Profile
                                    </Link>
                                    <Link to="/settings" className="dropdown-item">
                                        Settings
                                    </Link>
                                    <hr />
                                    <button className="dropdown-item danger" onClick={handleLogout}>
                                        Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="main-content">
                    {children}
                </main>
            </div>
        </div>
    );
}

