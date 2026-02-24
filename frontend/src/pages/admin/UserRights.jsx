import { useState, useEffect, useMemo } from 'react';
import { Shield, Save, Search, Check, AlertCircle, Filter, ArrowUpDown, RefreshCw, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { userRightsApi } from '../../services/api';
import { PERMISSIONS, PERMISSION_LABELS } from '../../constants/permissions';
import useAuthStore from '../../context/authStore';
import './UserRights.css';

export default function UserRights() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [rightsFilter, setRightsFilter] = useState('');
    const [sortBy, setSortBy] = useState('name-asc');
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedSiteId, setSelectedSiteId] = useState('global');
    const [editedRights, setEditedRights] = useState([]);
    const [saving, setSaving] = useState(false);
    const { user: currentUser, setUserPermissions } = useAuthStore();

    // Extract unique roles from loaded users
    const availableRoles = useMemo(() => {
        const roles = [...new Set(users.map(u => u.user?.role).filter(Boolean))];
        return roles.sort();
    }, [users]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await userRightsApi.getAll();
            if (response.data.success) {
                setUsers(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching user rights:', error);
            toast.error('Failed to load user rights');
        } finally {
            setLoading(false);
        }
    };

    const handleUserSelect = (userData) => {
        setSelectedUser(userData);
        setSelectedSiteId('global');
        setEditedRights(userData.globalRights || []);
    };

    const handleSiteChange = (siteId) => {
        if (!selectedUser) return;

        const sIdStr = siteId?.toString();
        setSelectedSiteId(sIdStr);
        if (sIdStr === 'global') {
            setEditedRights(selectedUser.globalRights || []);
        } else {
            const siteRight = selectedUser.siteRights.find(sr => (sr.site?._id || sr.site || sr).toString() === sIdStr);
            setEditedRights(siteRight ? siteRight.rights : []);
        }
    };

    const handleRightToggle = (rightKey) => {
        setEditedRights(prev => {
            if (prev.includes(rightKey)) {
                return prev.filter(r => r !== rightKey);
            } else {
                return [...prev, rightKey];
            }
        });
    };

    const handleSave = async () => {
        if (!selectedUser) return;

        try {
            setSaving(true);
            const response = await userRightsApi.update(selectedUser.user._id, editedRights, selectedSiteId);

            if (response.data.success) {
                toast.success('User rights updated successfully');

                // Update local state
                // Update local state and current selection
                const updatedUserMap = (u) => {
                    if (u.user._id === selectedUser.user._id) {
                        const sIdStr = selectedSiteId?.toString();
                        let updated;
                        if (sIdStr === 'global') {
                            updated = { ...u, globalRights: editedRights };
                        } else {
                            const newSiteRights = [...u.siteRights];
                            const siteIndex = newSiteRights.findIndex(sr => (sr.site?._id || sr.site || sr).toString() === sIdStr);
                            if (siteIndex > -1) {
                                newSiteRights[siteIndex] = { ...newSiteRights[siteIndex], rights: editedRights };
                            } else {
                                newSiteRights.push({ site: selectedSiteId, rights: editedRights });
                            }
                            updated = { ...u, siteRights: newSiteRights };
                        }
                        setSelectedUser(updated);

                        // If we just updated rights for the CURRENT logged-in user, sync with authStore
                        if (u.user._id === currentUser?.userId) {
                            if (sIdStr === 'global') {
                                setUserPermissions({ ...currentUser.rights, globalRights: editedRights });
                            } else {
                                const newSiteRights = [...(currentUser.rights?.siteRights || [])];
                                const siteIndex = newSiteRights.findIndex(sr => (sr.site?._id || sr.site || sr).toString() === sIdStr);
                                if (siteIndex > -1) {
                                    newSiteRights[siteIndex] = { ...newSiteRights[siteIndex], rights: editedRights };
                                } else {
                                    newSiteRights.push({ site: selectedSiteId, rights: editedRights });
                                }
                                setUserPermissions({ ...currentUser.rights, siteRights: newSiteRights });
                            }
                        }

                        return updated;
                    }
                    return u;
                };

                setUsers(prevUsers => prevUsers.map(updatedUserMap));
            }
        } catch (error) {
            console.error('Error updating rights:', error);
            toast.error(error.response?.data?.message || 'Failed to update rights');
        } finally {
            setSaving(false);
        }
    };

    const filteredUsers = useMemo(() => {
        let result = users.filter(item => {
            if (!item || !item.user) return false;

            // Text search
            const search = searchTerm.toLowerCase();
            const matchesSearch = !search ||
                (item.user.fullName?.toLowerCase().includes(search)) ||
                (item.user.email?.toLowerCase().includes(search)) ||
                (item.user.role?.toLowerCase().includes(search));
            if (!matchesSearch) return false;

            // Role filter
            if (roleFilter && item.user.role !== roleFilter) return false;

            // Rights status filter
            const totalRights = (item.globalRights?.length || 0) +
                (item.siteRights?.reduce((sum, sr) => sum + (sr.rights?.length || 0), 0) || 0);
            if (rightsFilter === 'has-rights' && totalRights === 0) return false;
            if (rightsFilter === 'no-rights' && totalRights > 0) return false;

            return true;
        });

        // Sort
        result.sort((a, b) => {
            switch (sortBy) {
                case 'name-asc':
                    return (a.user.fullName || '').localeCompare(b.user.fullName || '');
                case 'name-desc':
                    return (b.user.fullName || '').localeCompare(a.user.fullName || '');
                case 'role':
                    return (a.user.role || '').localeCompare(b.user.role || '');
                case 'most-rights': {
                    const aRights = (a.globalRights?.length || 0) + (a.siteRights?.reduce((s, sr) => s + (sr.rights?.length || 0), 0) || 0);
                    const bRights = (b.globalRights?.length || 0) + (b.siteRights?.reduce((s, sr) => s + (sr.rights?.length || 0), 0) || 0);
                    return bRights - aRights;
                }
                case 'least-rights': {
                    const aRights = (a.globalRights?.length || 0) + (a.siteRights?.reduce((s, sr) => s + (sr.rights?.length || 0), 0) || 0);
                    const bRights = (b.globalRights?.length || 0) + (b.siteRights?.reduce((s, sr) => s + (sr.rights?.length || 0), 0) || 0);
                    return aRights - bRights;
                }
                default:
                    return 0;
            }
        });

        return result;
    }, [users, searchTerm, roleFilter, rightsFilter, sortBy]);

    const activeFilterCount = [roleFilter, rightsFilter].filter(Boolean).length;

    const clearAllFilters = () => {
        setSearchTerm('');
        setRoleFilter('');
        setRightsFilter('');
        setSortBy('name-asc');
    };

    return (
        <div className="user-rights-page">
            <div className="page-header user-rights-header">
                <div>
                    <h1>User Rights Management</h1>
                    <p>Manage specific capabilities and overrides for users</p>
                </div>
            </div>

            <div className="rights-container">
                {/* Users List */}
                <div className="users-list-section">
                    <div className="ur-filter-toolbar">
                        <div className="ur-search-row">
                            <div className="ur-search-box">
                                <Search size={16} />
                                <input
                                    type="text"
                                    placeholder="Search by name, email..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                {searchTerm && (
                                    <button className="ur-search-clear" onClick={() => setSearchTerm('')}>
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                            <button
                                className="ur-toolbar-btn"
                                onClick={fetchData}
                                title="Refresh"
                            >
                                <RefreshCw size={14} />
                            </button>
                        </div>

                        <div className="ur-filters-row">
                            <div className="ur-filter-select-wrap">
                                <Filter size={12} className="ur-select-icon" />
                                <select
                                    className="ur-filter-select"
                                    value={roleFilter}
                                    onChange={(e) => setRoleFilter(e.target.value)}
                                >
                                    <option value="">All Roles</option>
                                    {availableRoles.map(role => (
                                        <option key={role} value={role}>{role}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="ur-filter-select-wrap">
                                <Shield size={12} className="ur-select-icon" />
                                <select
                                    className="ur-filter-select"
                                    value={rightsFilter}
                                    onChange={(e) => setRightsFilter(e.target.value)}
                                >
                                    <option value="">All Users</option>
                                    <option value="has-rights">Has Rights</option>
                                    <option value="no-rights">No Rights</option>
                                </select>
                            </div>

                            <div className="ur-filter-select-wrap">
                                <ArrowUpDown size={12} className="ur-select-icon" />
                                <select
                                    className="ur-filter-select"
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                >
                                    <option value="name-asc">Name A–Z</option>
                                    <option value="name-desc">Name Z–A</option>
                                    <option value="role">By Role</option>
                                    <option value="most-rights">Most Rights</option>
                                    <option value="least-rights">Least Rights</option>
                                </select>
                            </div>
                        </div>

                        {activeFilterCount > 0 && (
                            <div className="ur-active-filters">
                                <span className="ur-filter-count">{activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active</span>
                                <button className="ur-clear-btn" onClick={clearAllFilters}>
                                    <X size={12} />
                                    Clear all
                                </button>
                            </div>
                        )}

                        <div className="ur-results-count">
                            {filteredUsers.length} of {users.length} users
                        </div>
                    </div>

                    <div className="users-list">
                        {loading ? (
                            <div className="loading">Loading users...</div>
                        ) : filteredUsers.length === 0 ? (
                            <div className="no-result">No users found</div>
                        ) : (
                            filteredUsers.map((item) => (
                                <div
                                    key={item.user._id}
                                    className={`user-item ${selectedUser?.user._id === item.user._id ? 'active' : ''}`}
                                    onClick={() => handleUserSelect(item)}
                                >
                                    <div className="user-avatar-small">
                                        {item.user.profilePicture ? (
                                            <img src={item.user.profilePicture} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                        ) : (
                                            item.user.fullName.charAt(0)
                                        )}
                                    </div>
                                    <div className="user-info">
                                        <div className="name">{item.user.fullName}</div>
                                        <div className="meta">
                                            <span className="role-badge">{item.user.role}</span>
                                            {(item.globalRights?.length > 0 || item.siteRights?.length > 0) && (
                                                <span className="rights-count">
                                                    {[
                                                        item.globalRights?.length > 0 ? 'Global' : null,
                                                        item.siteRights?.length > 0 ? `${item.siteRights.length} Sites` : null
                                                    ].filter(Boolean).join(' + ')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Rights Editor */}
                <div className="rights-editor-section">
                    {selectedUser ? (
                        <div className="editor-content">
                            <div className="editor-header">
                                <div className="user-details-premium">
                                    <div className="user-avatar-premium">
                                        {selectedUser.user.profilePicture ? (
                                            <img src={selectedUser.user.profilePicture} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                        ) : (
                                            selectedUser.user.fullName.charAt(0)
                                        )}
                                    </div>
                                    <div className="user-meta-compact">
                                        <h2>{selectedUser.user.fullName}</h2>
                                        <p>{selectedUser.user.email}</p>
                                    </div>
                                </div>
                                <div className="editor-actions">
                                    <button className="save-btn" onClick={handleSave} disabled={saving}>
                                        {saving ? 'Saving...' : (
                                            <>
                                                <Save size={18} />
                                                Save Changes
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="editor-scroll">
                                <div className="site-selection-wrapper">
                                    <div className="site-selection-header">
                                        <label className="section-label">Select Scope:</label>
                                        <span className="section-hint">Choose global or a specific site to manage its overrides</span>
                                    </div>
                                    <div className="site-tabs-modern">
                                        <button
                                            className={`site-btn-modern ${selectedSiteId === 'global' ? 'active' : ''}`}
                                            onClick={() => handleSiteChange('global')}
                                        >
                                            <Shield size={16} />
                                            <span>Global Rights</span>
                                        </button>

                                        {selectedUser.user.assignedSites?.length > 0 && (
                                            <div className="site-divider"></div>
                                        )}

                                        {selectedUser.user.assignedSites?.map(site => {
                                            const siteId = (site._id || site.siteId || site).toString();
                                            const siteName = site.siteName || site.siteUniqueID || 'Site ' + siteId.substring(siteId.length - 4);
                                            return (
                                                <button
                                                    key={siteId}
                                                    className={`site-btn-modern ${selectedSiteId?.toString() === siteId ? 'active' : ''}`}
                                                    onClick={() => handleSiteChange(siteId)}
                                                    title={siteName}
                                                >
                                                    <Check size={14} className="status-icon" />
                                                    <span>{siteName}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="permissions-grid">
                                    {Object.entries(PERMISSIONS).map(([key, value]) => (
                                        <div
                                            key={key}
                                            className={`permission-card ${editedRights.includes(value) ? 'enabled' : ''}`}
                                            onClick={() => handleRightToggle(value)}
                                        >
                                            <div className="checkbox">
                                                {editedRights.includes(value) && <Check size={16} />}
                                            </div>
                                            <div className="permission-info">
                                                <span className="label">{PERMISSION_LABELS[value]}</span>
                                                <span className="code">{value}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="info-box">
                                    <AlertCircle size={18} />
                                    <p>Permissions granted here add to the user's role capabilities. They generally do not restrict role-based defaults unless explicitly programmed.</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="empty-state">
                            <Shield size={48} />
                            <h3>Select a user to manage rights</h3>
                            <p>Choose a user from the list to view and edit their specific permissions.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
