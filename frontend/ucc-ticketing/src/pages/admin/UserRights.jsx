import { useState, useEffect } from 'react';
import { Shield, Save, Search, Check, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { userRightsApi } from '../../services/api';
import { PERMISSIONS, PERMISSION_LABELS } from '../../constants/permissions';
import './UserRights.css';

export default function UserRights() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedSiteId, setSelectedSiteId] = useState('global');
    const [editedRights, setEditedRights] = useState([]);
    const [saving, setSaving] = useState(false);

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

    const filteredUsers = users.filter(item => 
        item.user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.user.role.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                    <div className="search-bar">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
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
                                        {item.user.fullName.charAt(0)}
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
                                <div className="user-details">
                                    <h2>{selectedUser.user.fullName}</h2>
                                    <p>{selectedUser.user.email}</p>
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
