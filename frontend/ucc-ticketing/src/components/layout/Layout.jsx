import { useState } from 'react';
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
} from 'lucide-react';
import useAuthStore from '../../context/authStore';
import NotificationBell from '../notifications/NotificationBell';
import TOpsLogo from '../../assets/TOps.svg';
import './Layout.css';

const menuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['Admin', 'Supervisor', 'Dispatcher', 'L1Engineer', 'L2Engineer', 'ClientViewer'] },
    { path: '/tickets', icon: Ticket, label: 'Tickets', roles: ['Admin', 'Supervisor', 'Dispatcher', 'L1Engineer', 'L2Engineer', 'ClientViewer'] },
    { path: '/reports', icon: BarChart3, label: 'Reports', roles: ['Admin', 'Supervisor', 'Dispatcher'] },
    { path: '/assets', icon: Monitor, label: 'Assets', roles: ['Admin', 'Supervisor', 'Dispatcher', 'ClientViewer', 'L1Engineer', 'L2Engineer'] },
    { path: '/sites', icon: MapPin, label: 'Sites', roles: ['Admin', 'Supervisor', 'Dispatcher', 'L1Engineer', 'L2Engineer'] },
    { path: '/users', icon: Users, label: 'Users', roles: ['Admin', 'Supervisor', 'L1Engineer', 'L2Engineer'] },
    { path: '/user-rights', icon: Shield, label: 'User Rights', roles: ['Admin'] },
    { path: '/notifications/manage', icon: Bell, label: 'Notifications', roles: ['Admin'] },
    { path: '/settings', icon: Settings, label: 'Settings', roles: ['Admin', 'Supervisor', 'Dispatcher', 'L1Engineer', 'L2Engineer', 'ClientViewer'] },
];

export default function Layout({ children }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuthStore();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const filteredMenuItems = menuItems.filter(item =>
        item.roles.includes(user?.role)
    );

    return (
        <div className="layout">
            {/* Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
                <div className="sidebar-header">
                    <div className="logo" onClick={() => setSidebarOpen(!sidebarOpen)} style={{ cursor: 'pointer' }}>
                        <div className="logo-icon">
                            <img src={TOpsLogo} alt="TicketOps" width={56} height={56} />
                        </div>
                        {sidebarOpen && <span className="logo-text">TicketOps</span>}
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {filteredMenuItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`nav-item ${location.pathname.startsWith(item.path) ? 'active' : ''}`}
                        >
                            <item.icon size={20} />
                            {sidebarOpen && <span>{item.label}</span>}
                        </Link>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <button className="nav-item logout-btn" onClick={handleLogout}>
                        <LogOut size={20} />
                        {sidebarOpen && <span>Logout</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="main-wrapper">
                {/* Header */}
                <header className="header">
                    <div className="header-left">
                        <div className="search-box">
                            <Search size={18} />
                            <input
                                type="text"
                                placeholder="Search tickets, assets..."
                                className="search-input"
                            />
                        </div>
                    </div>

                    <div className="header-right">
                        {/* Notifications */}
                        <NotificationBell />

                        {/* User Menu */}
                        <div className="user-menu-container">
                            <button
                                className="user-menu-btn"
                                onClick={() => setUserMenuOpen(!userMenuOpen)}
                            >
                                <div className="user-avatar">
                                    {user?.fullName?.charAt(0) || 'U'}
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
