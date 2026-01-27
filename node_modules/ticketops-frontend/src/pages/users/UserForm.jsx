import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, Loader, Eye, EyeOff } from 'lucide-react';
import { usersApi, sitesApi, lookupsApi } from '../../services/api';
import useAuthStore from '../../context/authStore';
import toast from 'react-hot-toast';
import '../sites/Sites.css';
import './Users.css';

export default function UserForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditing = Boolean(id);
    const { user: currentUser } = useAuthStore();

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [sites, setSites] = useState([]);
    const [roles, setRoles] = useState([]);

    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        username: '',
        password: '',
        confirmPassword: '',
        role: 'L1Engineer',
        mobileNumber: '',
        designation: '',
        siteId: '',
        assignedSites: [],
        isActive: true,
    });

    const [errors, setErrors] = useState({});

    useEffect(() => {
        loadDropdowns();
        if (isEditing) {
            loadUser();
        }
    }, [id]);

    const loadDropdowns = async () => {
        try {
            const [sitesRes, rolesRes] = await Promise.all([
                sitesApi.getDropdown(),
                lookupsApi.getRoles(),
            ]);
            // Handle Express response format
            const siteData = sitesRes.data.data || sitesRes.data || [];
            setSites(siteData.map(s => ({
                value: s._id || s.value || s.siteId,
                label: s.siteName || s.label
            })));
            
            const roleData = rolesRes.data.data || rolesRes.data || [];
            setRoles(roleData);
        } catch (error) {
            console.error('Failed to load dropdowns', error);
        }
    };

    const loadUser = async () => {
        setLoading(true);
        try {
            const response = await usersApi.getById(id);
            const user = response.data.data || response.data;
            // Get siteId - could be object or string
            const siteIdValue = typeof user.siteId === 'object' ? user.siteId?._id : user.siteId;
            setFormData({
                fullName: user.fullName,
                email: user.email,
                username: user.username,
                password: '',
                confirmPassword: '',
                role: user.role,
                mobileNumber: user.mobileNumber || '',
                designation: user.designation || '',
                siteId: siteIdValue || '',
                assignedSites: user.assignedSites?.map(s => typeof s === 'object' ? s._id : s) || [],
                isActive: user.isActive,
            });
        } catch (error) {
            toast.error('Failed to load user');
            navigate('/users');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field, value) => {
        setFormData({ ...formData, [field]: value });
        // Clear error when field is modified
        if (errors[field]) {
            setErrors({ ...errors, [field]: null });
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.fullName.trim()) {
            newErrors.fullName = 'Full name is required';
        }

        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Invalid email format';
        }

        if (!formData.username.trim()) {
            newErrors.username = 'Username is required';
        } else if (formData.username.length < 3) {
            newErrors.username = 'Username must be at least 3 characters';
        }

        if (!isEditing) {
            if (!formData.password) {
                newErrors.password = 'Password is required';
            } else if (formData.password.length < 6) {
                newErrors.password = 'Password must be at least 6 characters';
            }

            if (formData.password !== formData.confirmPassword) {
                newErrors.confirmPassword = 'Passwords do not match';
            }
        } else if (formData.password && formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }

        if (!formData.role) {
            newErrors.role = 'Role is required';
        }

        if (formData.role !== 'Admin' && (!formData.assignedSites || formData.assignedSites.length === 0)) {
            newErrors.assignedSites = 'At least one site must be assigned for non-admin users';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            toast.error('Please fix the form errors');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                fullName: formData.fullName,
                email: formData.email,
                username: formData.username,
                role: formData.role,
                mobileNumber: formData.mobileNumber || null,
                designation: formData.designation || null,
                siteId: formData.siteId || null,
                assignedSites: formData.assignedSites,
                isActive: formData.isActive,
            };

            if (!isEditing) {
                payload.password = formData.password;
            } else if (formData.password) {
                payload.password = formData.password;
            }

            if (isEditing) {
                await usersApi.update(id, payload);
                toast.success('User updated successfully');
            } else {
                await usersApi.create(payload);
                toast.success('User created successfully');
            }
            navigate('/users');
        } catch (error) {
            const message = error.response?.data?.message || 'Failed to save user';
            toast.error(message);
        } finally {
            setSaving(false);
        }
    };

    const isEditingSelf = isEditing && id === currentUser?.userId;

    if (loading) {
        return (
            <div className="loading-state">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="page-container animate-fade-in">
            <Link to="/users" className="back-link">
                <ArrowLeft size={18} />
                Back to Users
            </Link>

            <div className="page-header">
                <h1 className="page-title">
                    {isEditing ? 'Edit User' : 'Add New User'}
                </h1>
            </div>

            <form onSubmit={handleSubmit} className="form-card glass-card">
                <div className="form-grid">
                    {/* Full Name */}
                    <div className="form-group">
                        <label className="form-label">Full Name *</label>
                        <input
                            type="text"
                            className={`form-input ${errors.fullName ? 'error' : ''}`}
                            value={formData.fullName}
                            onChange={(e) => handleChange('fullName', e.target.value)}
                            placeholder="Enter full name"
                        />
                        {errors.fullName && <span className="form-error">{errors.fullName}</span>}
                    </div>

                    {/* Email */}
                    <div className="form-group">
                        <label className="form-label">Email *</label>
                        <input
                            type="email"
                            className={`form-input ${errors.email ? 'error' : ''}`}
                            value={formData.email}
                            onChange={(e) => handleChange('email', e.target.value)}
                            placeholder="Enter email address"
                        />
                        {errors.email && <span className="form-error">{errors.email}</span>}
                    </div>

                    {/* Username */}
                    <div className="form-group">
                        <label className="form-label">Username *</label>
                        <input
                            type="text"
                            className={`form-input ${errors.username ? 'error' : ''}`}
                            value={formData.username}
                            onChange={(e) => handleChange('username', e.target.value)}
                            placeholder="Enter username"
                            disabled={isEditing}
                        />
                        {errors.username && <span className="form-error">{errors.username}</span>}
                        {isEditing && <span className="form-hint">Username cannot be changed</span>}
                    </div>

                    {/* Role */}
                    <div className="form-group">
                        <label className="form-label">Role *</label>
                        <select
                            className={`form-select ${errors.role ? 'error' : ''}`}
                            value={formData.role}
                            onChange={(e) => handleChange('role', e.target.value)}
                            disabled={isEditingSelf}
                        >
                            {roles.map(role => (
                                <option key={role.value} value={role.value}>{role.label}</option>
                            ))}
                        </select>
                        {errors.role && <span className="form-error">{errors.role}</span>}
                        {isEditingSelf && <span className="form-hint">You cannot change your own role</span>}
                    </div>

                    {/* Password */}
                    <div className="form-group">
                        <label className="form-label">
                            {isEditing ? 'New Password (leave blank to keep current)' : 'Password *'}
                        </label>
                        <div className="password-input">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                className={`form-input ${errors.password ? 'error' : ''}`}
                                value={formData.password}
                                onChange={(e) => handleChange('password', e.target.value)}
                                placeholder={isEditing ? 'Enter new password' : 'Enter password'}
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        {errors.password && <span className="form-error">{errors.password}</span>}
                    </div>

                    {/* Confirm Password */}
                    <div className="form-group">
                        <label className="form-label">Confirm Password</label>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
                            value={formData.confirmPassword}
                            onChange={(e) => handleChange('confirmPassword', e.target.value)}
                            placeholder="Confirm password"
                        />
                        {errors.confirmPassword && <span className="form-error">{errors.confirmPassword}</span>}
                    </div>

                    {/* Mobile Number */}
                    <div className="form-group">
                        <label className="form-label">Mobile Number</label>
                        <input
                            type="tel"
                            className="form-input"
                            value={formData.mobileNumber}
                            onChange={(e) => handleChange('mobileNumber', e.target.value)}
                            placeholder="Enter mobile number"
                        />
                    </div>

                    {/* Designation */}
                    <div className="form-group">
                        <label className="form-label">Designation</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.designation}
                            onChange={(e) => handleChange('designation', e.target.value)}
                            placeholder="e.g., Field Technician"
                        />
                    </div>

                    {/* Multi-Site Selection */}
                    <div className="sites-selection-container">
                        <div className="flex justify-between items-center">
                            <label className="form-label">Site Access *</label>
                            <div className="flex gap-2">
                                <button 
                                    type="button" 
                                    className="btn btn-ghost btn-xs"
                                    onClick={() => handleChange('assignedSites', sites.map(s => s.value))}
                                >
                                    Select All
                                </button>
                                <button 
                                    type="button" 
                                    className="btn btn-ghost btn-xs"
                                    onClick={() => handleChange('assignedSites', [])}
                                >
                                    Clear All
                                </button>
                            </div>
                        </div>
                        <div className="sites-selection-grid">
                            {sites.map(site => (
                                <label key={site.value} className="site-checkbox-item">
                                    <input
                                        type="checkbox"
                                        checked={formData.assignedSites.includes(site.value)}
                                        onChange={(e) => {
                                            const newSites = e.target.checked
                                                ? [...formData.assignedSites, site.value]
                                                : formData.assignedSites.filter(id => id !== site.value);
                                            handleChange('assignedSites', newSites);
                                        }}
                                    />
                                    <span title={site.label}>{site.label}</span>
                                </label>
                            ))}
                        </div>
                        {errors.assignedSites && <span className="form-error">{errors.assignedSites}</span>}
                        <span className="form-hint">Assign user to one or more sites to control their visibility scope</span>
                    </div>

                    {/* Status */}
                    {isEditing && (
                        <div className="form-group">
                            <label className="form-label">Status</label>
                            <select
                                className="form-select"
                                value={formData.isActive}
                                onChange={(e) => handleChange('isActive', e.target.value === 'true')}
                                disabled={isEditingSelf}
                            >
                                <option value="true">Active</option>
                                <option value="false">Inactive</option>
                            </select>
                            {isEditingSelf && <span className="form-hint">You cannot deactivate your own account</span>}
                        </div>
                    )}
                </div>

                {/* Role Description */}
                <div className="role-info">
                    <h4>Role Permissions</h4>
                    <div className="role-descriptions">
                        <div className="role-desc">
                            <strong>Admin:</strong> Full system access, user management, all operations
                        </div>
                        <div className="role-desc">
                            <strong>Supervisor:</strong> Manage sites, assets, tickets, view reports
                        </div>
                        <div className="role-desc">
                            <strong>Dispatcher:</strong> Create/assign tickets, manage workflow
                        </div>
                        <div className="role-desc">
                            <strong>L1 Engineer:</strong> Handle assigned tickets, update status
                        </div>
                        <div className="role-desc">
                            <strong>L2 Engineer:</strong> Handle escalated tickets, complex issues
                        </div>
                        <div className="role-desc">
                            <strong>Client Viewer:</strong> View-only access to tickets and assets
                        </div>
                    </div>
                </div>

                <div className="form-actions">
                    <Link to="/users" className="btn btn-ghost">Cancel</Link>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                        {saving ? (
                            <>
                                <Loader size={18} className="animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save size={18} />
                                {isEditing ? 'Update User' : 'Create User'}
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
