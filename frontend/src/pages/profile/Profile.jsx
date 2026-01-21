import { useState, useEffect } from 'react';
import {
    User,
    Mail,
    Phone,
    MapPin,
    Shield,
    Calendar,
    Key,
    Save,
    RefreshCw,
    Eye,
    EyeOff,
    CheckCircle,
    AlertCircle,
    Camera,
} from 'lucide-react';
import { authApi } from '../../services/api';
import useAuthStore from '../../context/authStore';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import './Profile.css';

export default function Profile() {
    const { user, setUser } = useAuthStore();
    const [activeSection, setActiveSection] = useState('info');
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    // Profile Info State
    const [profileInfo, setProfileInfo] = useState({
        fullName: '',
        email: '',
        mobileNumber: '',
        username: '',
        role: '',
        siteName: '',
        createdOn: '',
        lastLoginOn: '',
    });

    // Password Change State
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false,
    });
    const [passwordErrors, setPasswordErrors] = useState({});
    const [changingPassword, setChangingPassword] = useState(false);

    // Load profile data
    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        setLoading(true);
        try {
            const response = await authApi.getProfile();
            const data = response.data.data;
            setProfileInfo({
                fullName: data.fullName || '',
                email: data.email || '',
                mobileNumber: data.mobileNumber || '',
                username: data.username || '',
                role: data.role || '',
                siteName: data.siteId?.siteName || '',
                createdOn: data.createdAt || data.createdOn || '',
                lastLoginOn: data.lastLoginOn || '',
            });
        } catch (error) {
            console.error('Failed to load profile', error);
            // Fallback to stored user data
            if (user) {
                setProfileInfo({
                    fullName: user.fullName || '',
                    email: user.email || '',
                    mobileNumber: user.mobileNumber || '',
                    username: user.username || '',
                    role: user.role || '',
                    siteName: user.siteName || '',
                    createdOn: user.createdOn || '',
                    lastLoginOn: user.lastLoginOn || '',
                });
            }
        } finally {
            setLoading(false);
        }
    };

    // Handle password change
    const handlePasswordChange = async (e) => {
        e.preventDefault();

        // Validate
        const errors = {};
        if (!passwordData.currentPassword) {
            errors.currentPassword = 'Current password is required';
        }
        if (!passwordData.newPassword) {
            errors.newPassword = 'New password is required';
        } else if (passwordData.newPassword.length < 8) {
            errors.newPassword = 'Password must be at least 8 characters';
        }
        if (!passwordData.confirmPassword) {
            errors.confirmPassword = 'Please confirm your new password';
        } else if (passwordData.newPassword !== passwordData.confirmPassword) {
            errors.confirmPassword = 'Passwords do not match';
        }

        if (Object.keys(errors).length > 0) {
            setPasswordErrors(errors);
            return;
        }

        setChangingPassword(true);
        setPasswordErrors({});

        try {
            await authApi.changePassword(passwordData.currentPassword, passwordData.newPassword);
            toast.success('Password changed successfully');
            setPasswordData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: '',
            });
        } catch (error) {
            const message = error.response?.data?.message || 'Failed to change password';
            toast.error(message);
            if (message.toLowerCase().includes('current')) {
                setPasswordErrors({ currentPassword: 'Current password is incorrect' });
            }
        } finally {
            setChangingPassword(false);
        }
    };

    // Get initials for avatar
    const getInitials = (name) => {
        if (!name) return 'U';
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    // Get role badge class
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

    if (loading) {
        return (
            <div className="profile-page animate-fade-in">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading profile...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="profile-page animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">My Profile &nbsp;</h1>
                    <p className="page-subtitle">
                        Manage your account information and security
                    </p>
                </div>
            </div>

            <div className="profile-container">
                {/* Profile Card */}
                <div className="profile-card glass-card">
                    <div className="profile-header">
                        <div className="profile-avatar-large">
                            {getInitials(profileInfo.fullName)}
                            <button className="avatar-edit-btn" title="Change Avatar (Coming Soon)" disabled>
                                <Camera size={14} />
                            </button>
                        </div>
                        <div className="profile-header-info">
                            <h2>{profileInfo.fullName}</h2>
                            <span className={`role-badge ${getRoleBadgeClass(profileInfo.role)}`}>
                                <Shield size={12} />
                                {profileInfo.role}
                            </span>
                            {profileInfo.siteName && (
                                <span className="site-info">
                                    <MapPin size={14} />
                                    {profileInfo.siteName}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="profile-nav">
                        <button
                            className={`profile-nav-btn ${activeSection === 'info' ? 'active' : ''}`}
                            onClick={() => setActiveSection('info')}
                        >
                            <User size={16} />
                            Account Info
                        </button>
                        <button
                            className={`profile-nav-btn ${activeSection === 'security' ? 'active' : ''}`}
                            onClick={() => setActiveSection('security')}
                        >
                            <Key size={16} />
                            Security
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="profile-content glass-card">
                    {activeSection === 'info' && (
                        <div className="profile-section">
                            <div className="section-header">
                                <User size={20} />
                                <div>
                                    <h3>Account Information</h3>
                                    <p>Your personal details and account info</p>
                                </div>
                            </div>

                            <div className="info-grid">
                                <div className="info-item">
                                    <label>
                                        <User size={14} />
                                        Full Name
                                    </label>
                                    <span>{profileInfo.fullName}</span>
                                </div>

                                <div className="info-item">
                                    <label>
                                        <User size={14} />
                                        Username
                                    </label>
                                    <span>{profileInfo.username}</span>
                                </div>

                                <div className="info-item">
                                    <label>
                                        <Mail size={14} />
                                        Email Address
                                    </label>
                                    <span>{profileInfo.email || '—'}</span>
                                </div>

                                <div className="info-item">
                                    <label>
                                        <Phone size={14} />
                                        Mobile Number
                                    </label>
                                    <span>{profileInfo.mobileNumber || '—'}</span>
                                </div>

                                <div className="info-item">
                                    <label>
                                        <Shield size={14} />
                                        Role
                                    </label>
                                    <span className={`role-badge ${getRoleBadgeClass(profileInfo.role)}`}>
                                        {profileInfo.role}
                                    </span>
                                </div>

                                <div className="info-item">
                                    <label>
                                        <MapPin size={14} />
                                        Assigned Site
                                    </label>
                                    <span>{profileInfo.siteName || '—'}</span>
                                </div>

                                <div className="info-item">
                                    <label>
                                        <Calendar size={14} />
                                        Account Created
                                    </label>
                                    <span>
                                        {profileInfo.createdOn
                                            ? format(new Date(profileInfo.createdOn), 'MMM dd, yyyy')
                                            : '—'}
                                    </span>
                                </div>

                                <div className="info-item">
                                    <label>
                                        <Calendar size={14} />
                                        Last Login
                                    </label>
                                    <span>
                                        {profileInfo.lastLoginOn
                                            ? format(new Date(profileInfo.lastLoginOn), 'MMM dd, yyyy HH:mm')
                                            : '—'}
                                    </span>
                                </div>
                            </div>

                            <div className="info-note">
                                <AlertCircle size={16} />
                                <span>
                                    Contact your administrator to update your account information.
                                </span>
                            </div>
                        </div>
                    )}

                    {activeSection === 'security' && (
                        <div className="profile-section">
                            <div className="section-header">
                                <Key size={20} />
                                <div>
                                    <h3>Change Password</h3>
                                    <p>Update your password to keep your account secure</p>
                                </div>
                            </div>

                            <form className="password-form" onSubmit={handlePasswordChange}>
                                <div className="form-group">
                                    <label>Current Password</label>
                                    <div className="password-input-wrapper">
                                        <input
                                            type={showPasswords.current ? 'text' : 'password'}
                                            className={`form-input ${passwordErrors.currentPassword ? 'error' : ''}`}
                                            value={passwordData.currentPassword}
                                            onChange={(e) => setPasswordData(prev => ({
                                                ...prev,
                                                currentPassword: e.target.value
                                            }))}
                                            placeholder="Enter your current password"
                                        />
                                        <button
                                            type="button"
                                            className="password-toggle"
                                            onClick={() => setShowPasswords(prev => ({
                                                ...prev,
                                                current: !prev.current
                                            }))}
                                        >
                                            {showPasswords.current ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    {passwordErrors.currentPassword && (
                                        <span className="error-message">{passwordErrors.currentPassword}</span>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label>New Password</label>
                                    <div className="password-input-wrapper">
                                        <input
                                            type={showPasswords.new ? 'text' : 'password'}
                                            className={`form-input ${passwordErrors.newPassword ? 'error' : ''}`}
                                            value={passwordData.newPassword}
                                            onChange={(e) => setPasswordData(prev => ({
                                                ...prev,
                                                newPassword: e.target.value
                                            }))}
                                            placeholder="Enter your new password"
                                        />
                                        <button
                                            type="button"
                                            className="password-toggle"
                                            onClick={() => setShowPasswords(prev => ({
                                                ...prev,
                                                new: !prev.new
                                            }))}
                                        >
                                            {showPasswords.new ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    {passwordErrors.newPassword && (
                                        <span className="error-message">{passwordErrors.newPassword}</span>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label>Confirm New Password</label>
                                    <div className="password-input-wrapper">
                                        <input
                                            type={showPasswords.confirm ? 'text' : 'password'}
                                            className={`form-input ${passwordErrors.confirmPassword ? 'error' : ''}`}
                                            value={passwordData.confirmPassword}
                                            onChange={(e) => setPasswordData(prev => ({
                                                ...prev,
                                                confirmPassword: e.target.value
                                            }))}
                                            placeholder="Confirm your new password"
                                        />
                                        <button
                                            type="button"
                                            className="password-toggle"
                                            onClick={() => setShowPasswords(prev => ({
                                                ...prev,
                                                confirm: !prev.confirm
                                            }))}
                                        >
                                            {showPasswords.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    {passwordErrors.confirmPassword && (
                                        <span className="error-message">{passwordErrors.confirmPassword}</span>
                                    )}
                                </div>

                                <div className="password-requirements">
                                    <h4>Password Requirements:</h4>
                                    <ul>
                                        <li className={passwordData.newPassword.length >= 8 ? 'met' : ''}>
                                            <CheckCircle size={12} />
                                            At least 8 characters
                                        </li>
                                        <li className={/[A-Z]/.test(passwordData.newPassword) ? 'met' : ''}>
                                            <CheckCircle size={12} />
                                            One uppercase letter
                                        </li>
                                        <li className={/[a-z]/.test(passwordData.newPassword) ? 'met' : ''}>
                                            <CheckCircle size={12} />
                                            One lowercase letter
                                        </li>
                                        <li className={/[0-9]/.test(passwordData.newPassword) ? 'met' : ''}>
                                            <CheckCircle size={12} />
                                            One number
                                        </li>
                                        <li className={/[!@#$%^&*]/.test(passwordData.newPassword) ? 'met' : ''}>
                                            <CheckCircle size={12} />
                                            One special character (!@#$%^&*)
                                        </li>
                                    </ul>
                                </div>

                                <div className="form-actions">
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={changingPassword}
                                    >
                                        {changingPassword ? (
                                            <>
                                                <RefreshCw size={16} className="spin" />
                                                Changing Password...
                                            </>
                                        ) : (
                                            <>
                                                <Save size={16} />
                                                Change Password
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
