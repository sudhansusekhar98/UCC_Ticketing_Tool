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
        setEditedRights(userData.rights || []);
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
            const response = await userRightsApi.update(selectedUser.user._id, editedRights);
            
            if (response.data.success) {
                toast.success('User rights updated successfully');
                
                // Update local state
                setUsers(prevUsers => prevUsers.map(u => {
                    if (u.user._id === selectedUser.user._id) {
                        return { ...u, rights: editedRights };
                    }
                    return u;
                }));
                
                setSelectedUser(null);
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
                                            {item.rights.length > 0 && (
                                                <span className="rights-count">{item.rights.length} rights</span>
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
                                <button className="save-btn" onClick={handleSave} disabled={saving}>
                                    {saving ? 'Saving...' : (
                                        <>
                                            <Save size={18} />
                                            Save Changes
                                        </>
                                    )}
                                </button>
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
