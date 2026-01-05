import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    Plus,
    Search,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    Users,
    Edit,
    Trash2,
    Shield,
    Mail,
    Phone,
} from 'lucide-react';
import { usersApi, lookupsApi, sitesApi } from '../../services/api';
import useAuthStore from '../../context/authStore';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import '../sites/Sites.css';
import './Users.css';

const getRoleBadgeClass = (role) => {
    switch (role) {
        case 'Admin': return 'role-admin';
        case 'Supervisor': return 'role-supervisor';
        case 'Dispatcher': return 'role-dispatcher';
        case 'L1Engineer': return 'role-l1';
        case 'L2Engineer': return 'role-l2';
        case 'ClientViewer': return 'role-client';
        default: return '';
    }
};

export default function UsersList() {
    const [users, setUsers] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [roles, setRoles] = useState([]);
    const [page, setPage] = useState(1);
    const pageSize = 15;
    const { hasRole, user: currentUser } = useAuthStore();

    const canCreate = hasRole(['Admin']);
    const canEdit = hasRole(['Admin']);
    const canDelete = hasRole(['Admin']);

    useEffect(() => {
        loadRoles();
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [page, roleFilter, statusFilter]);

    const loadRoles = async () => {
        try {
            const response = await lookupsApi.getRoles();
            // Handle Express response format
            setRoles(response.data.data || response.data || []);
        } catch (error) {
            console.error('Failed to load roles', error);
        }
    };

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await usersApi.getAll({
                page,
                limit: pageSize,
                role: roleFilter || undefined,
                isActive: statusFilter === '' ? undefined : statusFilter === 'true',
            });
            // Handle Express response format
            const userData = response.data.data || response.data.items || response.data || [];
            const total = response.data.pagination?.total || response.data.totalCount || userData.length;
            
            // Map to expected format
            const mappedUsers = userData.map(u => ({
                ...u,
                userId: u._id || u.userId,
                siteName: u.siteId?.siteName || u.siteName
            }));
            
            setUsers(mappedUsers);
            setTotalCount(total);
        } catch (error) {
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id, name) => {
        if (id === currentUser?.userId) {
            toast.error('You cannot delete your own account');
            return;
        }
        if (!confirm(`Are you sure you want to delete user "${name}"?`)) return;

        try {
            await usersApi.delete(id);
            toast.success('User deleted successfully');
            fetchUsers();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete user');
        }
    };

    const filteredUsers = users.filter(user =>
        user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPages = Math.ceil(totalCount / pageSize);

    return (
        <div className="page-container animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Users</h1>
                    <p className="page-subtitle">
                        {totalCount} total users
                    </p>
                </div>
                {canCreate && (
                    <Link to="/users/new" className="btn btn-primary">
                        <Plus size={18} />
                        Add User
                    </Link>
                )}
            </div>

            {/* Filters */}
            <div className="filter-bar glass-card compact">
                <div className="search-filter-row">
                    <div className="search-box large">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Search by name, email, or username..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        className="form-select compact-select"
                        value={roleFilter}
                        onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
                    >
                        <option value="">All Roles</option>
                        {roles.map(role => (
                            <option key={role.value} value={role.value}>{role.label}</option>
                        ))}
                    </select>
                    <select
                        className="form-select compact-select"
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                    >
                        <option value="">All Status</option>
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                    </select>
                    <button className="btn btn-secondary btn-icon" onClick={fetchUsers}>
                        <RefreshCw size={18} />
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="table-wrapper glass-card">
                {loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="empty-state">
                        <Users size={48} />
                        <p>No users found</p>
                    </div>
                ) : (
                    <>
                        <table className="data-table compact">
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Username</th>
                                    <th>Role</th>
                                    <th>Contact</th>
                                    <th>Site</th>
                                    <th>Last Login</th>
                                    <th>Status</th>
                                    <th className="actions-col">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map((user) => (
                                    <tr key={user.userId}>
                                        <td>
                                            <div className="user-cell">
                                                <div className="user-avatar">
                                                    {user.fullName.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="user-info">
                                                    <span className="user-name">{user.fullName}</span>
                                                    <span className="user-email">{user.email}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="username">{user.username}</span>
                                        </td>
                                        <td>
                                            <span className={`role-badge ${getRoleBadgeClass(user.role)}`}>
                                                <Shield size={12} />
                                                {user.role}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="contact-cell">
                                                {user.mobileNumber && (
                                                    <span className="contact-item">
                                                        <Phone size={12} />
                                                        {user.mobileNumber}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <span className="cell-secondary">{user.siteName || '—'}</span>
                                        </td>
                                        <td>
                                            <span className="cell-secondary">
                                                {user.lastLoginOn
                                                    ? format(new Date(user.lastLoginOn), 'MMM dd, HH:mm')
                                                    : 'Never'
                                                }
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge ${user.isActive ? 'badge-success' : 'badge-danger'}`}>
                                                {user.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="actions-col">
                                            <div className="action-buttons">
                                                {canEdit && (
                                                    <Link to={`/users/${user.userId}/edit`} className="btn btn-icon btn-ghost" title="Edit">
                                                        <Edit size={16} />
                                                    </Link>
                                                )}
                                                {canDelete && user.userId !== currentUser?.userId && (
                                                    <button
                                                        className="btn btn-icon btn-ghost text-danger"
                                                        onClick={() => handleDelete(user.userId, user.fullName)}
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {totalPages > 1 && (
                            <div className="pagination">
                                <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => setPage(p => p - 1)}
                                    disabled={page === 1}
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                <span className="page-info">
                                    Page {page} of {totalPages}
                                </span>
                                <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => setPage(p => p + 1)}
                                    disabled={page === totalPages}
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
