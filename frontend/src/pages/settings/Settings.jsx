import { useState, useEffect } from 'react';
import {
    Settings as SettingsIcon,
    Building,
    Bell,
    Shield,
    Clock,
    Mail,
    Save,
    RefreshCw,
    AlertTriangle,
    CheckCircle,
    Info,
    Palette,
    Globe,
    Key,
    Sun,
    Moon,
    Monitor,
} from 'lucide-react';
import { settingsApi, authApi } from '../../services/api';
import useAuthStore from '../../context/authStore';
import useThemeStore from '../../context/themeStore';
import toast from 'react-hot-toast';
import './Settings.css';

// Settings Tabs
const settingsTabs = [
    { id: 'general', label: 'General', icon: SettingsIcon },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'sla', label: 'SLA Policies', icon: Clock },
    { id: 'email', label: 'Email', icon: Mail },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'appearance', label: 'Appearance', icon: Palette },
];

// Helper to parse setting value based on type
const parseValue = (value, defaultValue) => {
    if (value === undefined || value === null) return defaultValue;
    if (typeof defaultValue === 'boolean') {
        return value === 'true' || value === true;
    }
    if (typeof defaultValue === 'number') {
        const parsed = parseInt(value, 10);
        return isNaN(parsed) ? defaultValue : parsed;
    }
    return value;
};

// Helper to convert value to string for API
const stringifyValue = (value) => {
    if (typeof value === 'boolean') return value.toString();
    if (typeof value === 'number') return value.toString();
    return value;
};

export default function Settings() {
    const { user, setUserPreferences } = useAuthStore();
    const isAdmin = user?.role === 'Admin';

    // Filter tabs based on role
    const visibleTabs = isAdmin
        ? settingsTabs
        : settingsTabs.filter(tab => ['general', 'appearance'].includes(tab.id));

    const [activeTab, setActiveTab] = useState('general');
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [hasChanges, setHasChanges] = useState(false);


    // General Settings State - Initialize regional fields from user preferences if available
    const [generalSettings, setGeneralSettings] = useState(() => ({
        companyName: 'TicketOps',
        companyAddress: '',
        timezone: user?.preferences?.timezone || 'Asia/Kolkata',
        dateFormat: user?.preferences?.dateFormat || 'DD/MM/YYYY',
        timeFormat: user?.preferences?.timeFormat || '24h',
        language: user?.preferences?.language || 'en',
        autoRefreshInterval: user?.preferences?.autoRefreshInterval ?? 30,
    }));

    // Notification Settings State
    const [notificationSettings, setNotificationSettings] = useState({
        emailNotifications: true,
        ticketCreated: true,
        ticketAssigned: true,
        ticketUpdated: true,
        ticketResolved: true,
        slaWarning: true,
        slaBreach: true,
        dailyDigest: false,
    });

    // SLA Settings State (Note: SLA is handled by SLAPolicy table, but we keep UI for reference)
    const [slaSettings, setSlaSettings] = useState({
        criticalResponseTime: 15,
        criticalRestoreTime: 60,
        highResponseTime: 30,
        highRestoreTime: 120,
        mediumResponseTime: 60,
        mediumRestoreTime: 240,
        lowResponseTime: 120,
        lowRestoreTime: 480,
        enableAutoEscalation: true,
        escalationL1Time: 30,
        escalationL2Time: 60,
    });

    // Email Settings State
    const [emailSettings, setEmailSettings] = useState({
        smtpServer: '',
        smtpPort: 587,
        smtpUsername: '',
        smtpPassword: '',
        smtpUseTLS: true,
        senderName: 'TicketOps',
        senderEmail: 'noreply@example.com',
        emailFooter: 'This is an automated message from TicketOps.',
    });

    // Security Settings State
    const [securitySettings, setSecuritySettings] = useState({
        passwordMinLength: 8,
        passwordRequireUppercase: true,
        passwordRequireLowercase: true,
        passwordRequireNumber: true,
        passwordRequireSpecial: true,
        sessionTimeout: 60,
        maxLoginAttempts: 5,
        lockoutDuration: 15,
        enableTwoFactor: false,
        forcePasswordChange: 90,
    });

    // Appearance Settings State - Initialize from user preferences if available
    const [appearanceSettings, setAppearanceSettings] = useState(() => ({
        theme: user?.preferences?.theme || 'light',
        compactMode: user?.preferences?.compactMode ?? false,
        showWelcomeMessage: user?.preferences?.showWelcomeMessage ?? true,
        dashboardLayout: user?.preferences?.dashboardLayout || 'default',
    }));

    // Key mapping from backend PascalCase to frontend camelCase
    const keyMappings = {
        General: {
            CompanyName: 'companyName',
            CompanyAddress: 'companyAddress',
            Timezone: 'timezone',
            DateFormat: 'dateFormat',
            TimeFormat: 'timeFormat',
            Language: 'language',
            AutoRefreshInterval: 'autoRefreshInterval',
        },
        Notifications: {
            EmailNotifications: 'emailNotifications',
            TicketCreated: 'ticketCreated',
            TicketAssigned: 'ticketAssigned',
            TicketUpdated: 'ticketUpdated',
            TicketResolved: 'ticketResolved',
            SLAWarning: 'slaWarning',
            SLABreach: 'slaBreach',
            DailyDigest: 'dailyDigest',
        },
        Email: {
            SmtpServer: 'smtpServer',
            SmtpPort: 'smtpPort',
            SmtpUsername: 'smtpUsername',
            SmtpPassword: 'smtpPassword',
            SmtpUseTLS: 'smtpUseTLS',
            SenderName: 'senderName',
            SenderEmail: 'senderEmail',
            EmailFooter: 'emailFooter',
        },
        Security: {
            PasswordMinLength: 'passwordMinLength',
            PasswordRequireUppercase: 'passwordRequireUppercase',
            PasswordRequireLowercase: 'passwordRequireLowercase',
            PasswordRequireNumber: 'passwordRequireNumber',
            PasswordRequireSpecial: 'passwordRequireSpecial',
            SessionTimeout: 'sessionTimeout',
            MaxLoginAttempts: 'maxLoginAttempts',
            LockoutDuration: 'lockoutDuration',
            EnableTwoFactor: 'enableTwoFactor',
            ForcePasswordChange: 'forcePasswordChange',
        },
        Appearance: {
            Theme: 'theme',
            CompactMode: 'compactMode',
            ShowWelcomeMessage: 'showWelcomeMessage',
            DashboardLayout: 'dashboardLayout',
        },
    };

    // Get theme store
    const { setTheme, theme: currentTheme } = useThemeStore();

    // Load settings on mount and when user preferences change
    useEffect(() => {
        loadSettings();
    }, [user?.userId, user?.preferences]);

    const loadSettings = async () => {
        setLoading(true);
        try {
            // Load global settings
            const response = await settingsApi.getAll();
            const data = response.data.data;

            // Helper to map backend data to frontend state
            const mapSettings = (apiData, mapping, defaults) => {
                const result = { ...defaults };
                if (apiData) {
                    for (const [apiKey, stateKey] of Object.entries(mapping)) {
                        if (apiData[apiKey] !== undefined) {
                            result[stateKey] = parseValue(apiData[apiKey], defaults[stateKey]);
                        }
                    }
                }
                return result;
            };

            // 1. Set from Global Settings
            if (data.General) {
                setGeneralSettings(prev => mapSettings(data.General, keyMappings.General, prev));
            }
            if (data.Notifications) {
                setNotificationSettings(prev => mapSettings(data.Notifications, keyMappings.Notifications, prev));
            }
            if (data.Email) {
                setEmailSettings(prev => mapSettings(data.Email, keyMappings.Email, prev));
            }
            if (data.Security) {
                setSecuritySettings(prev => mapSettings(data.Security, keyMappings.Security, prev));
            }
            if (data.Appearance) {
                const appearanceData = mapSettings(data.Appearance, keyMappings.Appearance, appearanceSettings);
                setAppearanceSettings(appearanceData);

                // Fallback sync theme if no user preference
                if (!user?.preferences?.theme && appearanceData.theme && appearanceData.theme !== currentTheme) {
                    setTheme(appearanceData.theme);
                }
            }

            // 2. Override with User Preferences if available
            if (user?.preferences) {
                const prefs = user.preferences;

                // Appearance preferences
                setAppearanceSettings(prev => ({
                    ...prev,
                    theme: prefs.theme || prev.theme,
                    compactMode: prefs.compactMode !== undefined ? prefs.compactMode : prev.compactMode,
                    showWelcomeMessage: prefs.showWelcomeMessage !== undefined ? prefs.showWelcomeMessage : prev.showWelcomeMessage,
                    dashboardLayout: prefs.dashboardLayout || prev.dashboardLayout,
                }));

                // Regional/General preferences stored in user profile
                setGeneralSettings(prev => ({
                    ...prev,
                    timezone: prefs.timezone || prev.timezone,
                    dateFormat: prefs.dateFormat || prev.dateFormat,
                    timeFormat: prefs.timeFormat || prev.timeFormat,
                    language: prefs.language || prev.language,
                    autoRefreshInterval: prefs.autoRefreshInterval !== undefined ? prefs.autoRefreshInterval : prev.autoRefreshInterval,
                }));

                // Apply theme from user preferences immediately
                if (prefs.theme && prefs.theme !== currentTheme) {
                    setTheme(prefs.theme);
                }
            }

        } catch (error) {
            console.error('Failed to load settings', error);
            // toast.error('Failed to load settings');
        } finally {
            setLoading(false);
        }
    };


    // Handle setting changes
    const handleChange = (category, field, value) => {
        setHasChanges(true);
        switch (category) {
            case 'general':
                setGeneralSettings(prev => ({ ...prev, [field]: value }));
                break;
            case 'notifications':
                setNotificationSettings(prev => ({ ...prev, [field]: value }));
                break;
            case 'sla':
                setSlaSettings(prev => ({ ...prev, [field]: value }));
                break;
            case 'email':
                setEmailSettings(prev => ({ ...prev, [field]: value }));
                break;
            case 'security':
                setSecuritySettings(prev => ({ ...prev, [field]: value }));
                break;
            case 'appearance':
                setAppearanceSettings(prev => ({ ...prev, [field]: value }));
                // Apply theme immediately when changed
                if (field === 'theme') {
                    // Add transitioning class for smooth animation
                    document.documentElement.classList.add('theme-transitioning');
                    setTheme(value);
                    // Remove transitioning class after animation
                    setTimeout(() => {
                        document.documentElement.classList.remove('theme-transitioning');
                    }, 300);
                }
                break;
        }
    };

    // Convert state to API format (camelCase to PascalCase)
    const buildSettingsPayload = () => {
        const convertToApi = (stateObj, mapping) => {
            const result = {};
            // Reverse the mapping (camelCase -> PascalCase)
            const reverseMapping = {};
            for (const [apiKey, stateKey] of Object.entries(mapping)) {
                reverseMapping[stateKey] = apiKey;
            }
            for (const [key, value] of Object.entries(stateObj)) {
                const apiKey = reverseMapping[key] || key;
                result[apiKey] = stringifyValue(value);
            }
            return result;
        };

        return {
            General: convertToApi(generalSettings, keyMappings.General),
            Notifications: convertToApi(notificationSettings, keyMappings.Notifications),
            Email: convertToApi(emailSettings, keyMappings.Email),
            Security: convertToApi(securitySettings, keyMappings.Security),
            Appearance: convertToApi(appearanceSettings, keyMappings.Appearance),
        };
    };

    // Save settings
    const handleSave = async () => {
        setSaving(true);
        try {
            // For 'general' or 'appearance' tabs, always save user preferences
            // These tabs contain user-specific settings that should be persisted per user
            if (activeTab === 'appearance' || activeTab === 'general') {
                const preferences = {
                    // Appearance fields
                    theme: appearanceSettings.theme,
                    compactMode: appearanceSettings.compactMode,
                    showWelcomeMessage: appearanceSettings.showWelcomeMessage,
                    dashboardLayout: appearanceSettings.dashboardLayout,
                    // Regional fields (from generalSettings)
                    timezone: generalSettings.timezone,
                    dateFormat: generalSettings.dateFormat,
                    timeFormat: generalSettings.timeFormat,
                    language: generalSettings.language,
                    autoRefreshInterval: generalSettings.autoRefreshInterval
                };

                const response = await authApi.updatePreferences(preferences);

                if (response.data.success) {
                    setUserPreferences(preferences);
                }

                // If Admin is on 'general' tab, also save organization-level settings
                if (isAdmin && activeTab === 'general') {
                    const payload = buildSettingsPayload();
                    await settingsApi.update(payload);
                }
            }
            // If Admin saving other tabs (notifications, sla, email, security), update Global Settings
            else if (isAdmin) {
                const payload = buildSettingsPayload();
                await settingsApi.update(payload);
            } else {
                // Non-admin trying to save read-only tab? Should not happen if UI is consistent
                return;
            }

            toast.success('Settings saved successfully');
            setHasChanges(false);
        } catch (error) {
            console.error('Failed to save settings', error);
            toast.error('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    // Reset to defaults
    const handleReset = async () => {
        if (!confirm('Are you sure you want to reload all settings from server?')) return;
        await loadSettings();
        toast.success('Settings reloaded from server');
        setHasChanges(false);
    };

    // Render General Settings Tab
    const renderGeneralSettings = () => (
        <div className="settings-section">
            <div className="section-header">
                <Building size={20} />
                <div>
                    <h3>Organization Settings </h3>
                    <p>Configure your organization details and preferences</p>
                </div>
            </div>

            <div className="settings-grid">
                <div className="form-group">
                    <label>Company Name</label>
                    <input
                        type="text"
                        className="form-input"
                        value={generalSettings.companyName}
                        onChange={(e) => handleChange('general', 'companyName', e.target.value)}
                        disabled={!isAdmin}
                    />
                </div>
                <div className="form-group">
                    <label>Company Address</label>
                    <input
                        type="text"
                        className="form-input"
                        value={generalSettings.companyAddress}
                        onChange={(e) => handleChange('general', 'companyAddress', e.target.value)}
                        placeholder="Enter company address"
                        disabled={!isAdmin}
                    />
                </div>
            </div>

            {!isAdmin && (
                <div className="info-note mt-6">
                    <Info size={16} />
                    <span>Only administrators can modify organization details.</span>
                </div>
            )}
        </div>
    );

    // Render Notification Settings Tab
    const renderNotificationSettings = () => (
        <div className="settings-section">
            <div className="section-header">
                <Bell size={20} />
                <div>
                    <h3>Email Notifications</h3>
                    <p>Configure which events trigger email notifications</p>
                </div>
            </div>

            <div className="toggle-group">
                <div className="toggle-item">
                    <div className="toggle-info">
                        <span className="toggle-label">Email Notifications</span>
                        <span className="toggle-description">Enable or disable all email notifications</span>
                    </div>
                    <label className="toggle-switch">
                        <input
                            type="checkbox"
                            checked={notificationSettings.emailNotifications}
                            onChange={(e) => handleChange('notifications', 'emailNotifications', e.target.checked)}
                        />
                        <span className="toggle-slider"></span>
                    </label>
                </div>

                <div className="toggle-item">
                    <div className="toggle-info">
                        <span className="toggle-label">Ticket Created</span>
                        <span className="toggle-description">Notify when a new ticket is created</span>
                    </div>
                    <label className="toggle-switch">
                        <input
                            type="checkbox"
                            checked={notificationSettings.ticketCreated}
                            onChange={(e) => handleChange('notifications', 'ticketCreated', e.target.checked)}
                        />
                        <span className="toggle-slider"></span>
                    </label>
                </div>

                <div className="toggle-item">
                    <div className="toggle-info">
                        <span className="toggle-label">Ticket Assigned</span>
                        <span className="toggle-description">Notify when a ticket is assigned to you</span>
                    </div>
                    <label className="toggle-switch">
                        <input
                            type="checkbox"
                            checked={notificationSettings.ticketAssigned}
                            onChange={(e) => handleChange('notifications', 'ticketAssigned', e.target.checked)}
                        />
                        <span className="toggle-slider"></span>
                    </label>
                </div>

                <div className="toggle-item">
                    <div className="toggle-info">
                        <span className="toggle-label">Ticket Updated</span>
                        <span className="toggle-description">Notify when a ticket you're involved with is updated</span>
                    </div>
                    <label className="toggle-switch">
                        <input
                            type="checkbox"
                            checked={notificationSettings.ticketUpdated}
                            onChange={(e) => handleChange('notifications', 'ticketUpdated', e.target.checked)}
                        />
                        <span className="toggle-slider"></span>
                    </label>
                </div>

                <div className="toggle-item">
                    <div className="toggle-info">
                        <span className="toggle-label">Ticket Resolved</span>
                        <span className="toggle-description">Notify when a ticket is resolved</span>
                    </div>
                    <label className="toggle-switch">
                        <input
                            type="checkbox"
                            checked={notificationSettings.ticketResolved}
                            onChange={(e) => handleChange('notifications', 'ticketResolved', e.target.checked)}
                        />
                        <span className="toggle-slider"></span>
                    </label>
                </div>
            </div>

            <div className="section-header">
                <AlertTriangle size={20} />
                <div>
                    <h3>SLA Alerts</h3>
                    <p>Configure SLA warning and breach notifications</p>
                </div>
            </div>

            <div className="toggle-group">
                <div className="toggle-item">
                    <div className="toggle-info">
                        <span className="toggle-label">SLA Warning</span>
                        <span className="toggle-description">Notify when a ticket is approaching SLA deadline</span>
                    </div>
                    <label className="toggle-switch">
                        <input
                            type="checkbox"
                            checked={notificationSettings.slaWarning}
                            onChange={(e) => handleChange('notifications', 'slaWarning', e.target.checked)}
                        />
                        <span className="toggle-slider"></span>
                    </label>
                </div>

                <div className="toggle-item">
                    <div className="toggle-info">
                        <span className="toggle-label">SLA Breach</span>
                        <span className="toggle-description">Notify when a ticket has breached its SLA</span>
                    </div>
                    <label className="toggle-switch">
                        <input
                            type="checkbox"
                            checked={notificationSettings.slaBreach}
                            onChange={(e) => handleChange('notifications', 'slaBreach', e.target.checked)}
                        />
                        <span className="toggle-slider"></span>
                    </label>
                </div>

                <div className="toggle-item">
                    <div className="toggle-info">
                        <span className="toggle-label">Daily Digest</span>
                        <span className="toggle-description">Receive a daily summary of ticket activity</span>
                    </div>
                    <label className="toggle-switch">
                        <input
                            type="checkbox"
                            checked={notificationSettings.dailyDigest}
                            onChange={(e) => handleChange('notifications', 'dailyDigest', e.target.checked)}
                        />
                        <span className="toggle-slider"></span>
                    </label>
                </div>
            </div>
        </div>
    );

    // Render SLA Settings Tab
    const renderSLASettings = () => (
        <div className="settings-section">
            <div className="section-header">
                <Clock size={20} />
                <div>
                    <h3>Response Time Targets</h3>
                    <p>Configure SLA response time targets by priority (in minutes)</p>
                </div>
            </div>

            <div className="sla-grid">
                <div className="sla-card critical">
                    <div className="sla-priority">
                        <span className="priority-badge critical">CRITICAL</span>
                    </div>
                    <div className="sla-inputs">
                        <div className="form-group">
                            <label>Response Time (min)</label>
                            <input
                                type="number"
                                className="form-input"
                                value={slaSettings.criticalResponseTime}
                                onChange={(e) => handleChange('sla', 'criticalResponseTime', parseInt(e.target.value))}
                            />
                        </div>
                        <div className="form-group">
                            <label>Restore Time (min)</label>
                            <input
                                type="number"
                                className="form-input"
                                value={slaSettings.criticalRestoreTime}
                                onChange={(e) => handleChange('sla', 'criticalRestoreTime', parseInt(e.target.value))}
                            />
                        </div>
                    </div>
                </div>

                <div className="sla-card high">
                    <div className="sla-priority">
                        <span className="priority-badge high">HIGH</span>
                    </div>
                    <div className="sla-inputs">
                        <div className="form-group">
                            <label>Response Time (min)</label>
                            <input
                                type="number"
                                className="form-input"
                                value={slaSettings.highResponseTime}
                                onChange={(e) => handleChange('sla', 'highResponseTime', parseInt(e.target.value))}
                            />
                        </div>
                        <div className="form-group">
                            <label>Restore Time (min)</label>
                            <input
                                type="number"
                                className="form-input"
                                value={slaSettings.highRestoreTime}
                                onChange={(e) => handleChange('sla', 'highRestoreTime', parseInt(e.target.value))}
                            />
                        </div>
                    </div>
                </div>

                <div className="sla-card medium">
                    <div className="sla-priority">
                        <span className="priority-badge medium">MEDIUM</span>
                    </div>
                    <div className="sla-inputs">
                        <div className="form-group">
                            <label>Response Time (min)</label>
                            <input
                                type="number"
                                className="form-input"
                                value={slaSettings.mediumResponseTime}
                                onChange={(e) => handleChange('sla', 'mediumResponseTime', parseInt(e.target.value))}
                            />
                        </div>
                        <div className="form-group">
                            <label>Restore Time (min)</label>
                            <input
                                type="number"
                                className="form-input"
                                value={slaSettings.mediumRestoreTime}
                                onChange={(e) => handleChange('sla', 'mediumRestoreTime', parseInt(e.target.value))}
                            />
                        </div>
                    </div>
                </div>

                <div className="sla-card low">
                    <div className="sla-priority">
                        <span className="priority-badge low">LOW</span>
                    </div>
                    <div className="sla-inputs">
                        <div className="form-group">
                            <label>Response Time (min)</label>
                            <input
                                type="number"
                                className="form-input"
                                value={slaSettings.lowResponseTime}
                                onChange={(e) => handleChange('sla', 'lowResponseTime', parseInt(e.target.value))}
                            />
                        </div>
                        <div className="form-group">
                            <label>Restore Time (min)</label>
                            <input
                                type="number"
                                className="form-input"
                                value={slaSettings.lowRestoreTime}
                                onChange={(e) => handleChange('sla', 'lowRestoreTime', parseInt(e.target.value))}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="section-header">
                <AlertTriangle size={20} />
                <div>
                    <h3>Escalation Settings</h3>
                    <p>Configure automatic ticket escalation rules</p>
                </div>
            </div>

            <div className="toggle-group">
                <div className="toggle-item">
                    <div className="toggle-info">
                        <span className="toggle-label">Enable Auto-Escalation</span>
                        <span className="toggle-description">Automatically escalate tickets based on SLA timers</span>
                    </div>
                    <label className="toggle-switch">
                        <input
                            type="checkbox"
                            checked={slaSettings.enableAutoEscalation}
                            onChange={(e) => handleChange('sla', 'enableAutoEscalation', e.target.checked)}
                        />
                        <span className="toggle-slider"></span>
                    </label>
                </div>
            </div>

            <div className="settings-grid">
                <div className="form-group">
                    <label>Level 1 Escalation (minutes after SLA warning)</label>
                    <input
                        type="number"
                        className="form-input"
                        value={slaSettings.escalationL1Time}
                        onChange={(e) => handleChange('sla', 'escalationL1Time', parseInt(e.target.value))}
                    />
                </div>
                <div className="form-group">
                    <label>Level 2 Escalation (minutes after L1)</label>
                    <input
                        type="number"
                        className="form-input"
                        value={slaSettings.escalationL2Time}
                        onChange={(e) => handleChange('sla', 'escalationL2Time', parseInt(e.target.value))}
                    />
                </div>
            </div>
        </div>
    );

    // Render Email Settings Tab
    const renderEmailSettings = () => (
        <div className="settings-section">
            <div className="section-header">
                <Mail size={20} />
                <div>
                    <h3>SMTP Configuration</h3>
                    <p>Configure your email server settings</p>
                </div>
            </div>

            <div className="settings-grid">
                <div className="form-group">
                    <label>SMTP Server</label>
                    <input
                        type="text"
                        className="form-input"
                        value={emailSettings.smtpServer}
                        onChange={(e) => handleChange('email', 'smtpServer', e.target.value)}
                        placeholder="smtp.example.com"
                    />
                </div>
                <div className="form-group">
                    <label>SMTP Port</label>
                    <input
                        type="number"
                        className="form-input"
                        value={emailSettings.smtpPort}
                        onChange={(e) => handleChange('email', 'smtpPort', parseInt(e.target.value))}
                    />
                </div>
                <div className="form-group">
                    <label>SMTP Username</label>
                    <input
                        type="text"
                        className="form-input"
                        value={emailSettings.smtpUsername}
                        onChange={(e) => handleChange('email', 'smtpUsername', e.target.value)}
                        placeholder="username@example.com"
                    />
                </div>
                <div className="form-group">
                    <label>SMTP Password</label>
                    <input
                        type="password"
                        className="form-input"
                        value={emailSettings.smtpPassword}
                        onChange={(e) => handleChange('email', 'smtpPassword', e.target.value)}
                        placeholder="••••••••"
                    />
                </div>
            </div>

            <div className="toggle-group">
                <div className="toggle-item">
                    <div className="toggle-info">
                        <span className="toggle-label">Use TLS/SSL</span>
                        <span className="toggle-description">Enable secure connection to SMTP server</span>
                    </div>
                    <label className="toggle-switch">
                        <input
                            type="checkbox"
                            checked={emailSettings.smtpUseTLS}
                            onChange={(e) => handleChange('email', 'smtpUseTLS', e.target.checked)}
                        />
                        <span className="toggle-slider"></span>
                    </label>
                </div>
            </div>

            <div className="section-header">
                <Info size={20} />
                <div>
                    <h3>Sender Information</h3>
                    <p>Configure outgoing email details</p>
                </div>
            </div>

            <div className="settings-grid">
                <div className="form-group">
                    <label>Sender Name</label>
                    <input
                        type="text"
                        className="form-input"
                        value={emailSettings.senderName}
                        onChange={(e) => handleChange('email', 'senderName', e.target.value)}
                    />
                </div>
                <div className="form-group">
                    <label>Sender Email</label>
                    <input
                        type="email"
                        className="form-input"
                        value={emailSettings.senderEmail}
                        onChange={(e) => handleChange('email', 'senderEmail', e.target.value)}
                    />
                </div>
            </div>

            <div className="form-group full-width">
                <label>Email Footer</label>
                <textarea
                    className="form-input form-textarea"
                    value={emailSettings.emailFooter}
                    onChange={(e) => handleChange('email', 'emailFooter', e.target.value)}
                    rows={3}
                />
            </div>

            <div className="action-bar">
                <button className="btn btn-secondary">
                    <Mail size={16} />
                    Send Test Email
                </button>
            </div>
        </div>
    );

    // Render Security Settings Tab
    const renderSecuritySettings = () => (
        <div className="settings-section">
            <div className="section-header">
                <Key size={20} />
                <div>
                    <h3>Password Policy</h3>
                    <p>Configure password requirements for all users</p>
                </div>
            </div>

            <div className="settings-grid">
                <div className="form-group">
                    <label>Minimum Password Length</label>
                    <input
                        type="number"
                        className="form-input"
                        value={securitySettings.passwordMinLength}
                        onChange={(e) => handleChange('security', 'passwordMinLength', parseInt(e.target.value))}
                        min="6"
                        max="32"
                    />
                </div>
                <div className="form-group">
                    <label>Force Password Change (days)</label>
                    <input
                        type="number"
                        className="form-input"
                        value={securitySettings.forcePasswordChange}
                        onChange={(e) => handleChange('security', 'forcePasswordChange', parseInt(e.target.value))}
                        min="0"
                        max="365"
                    />
                    <small className="form-hint">Set to 0 to disable</small>
                </div>
            </div>

            <div className="toggle-group">
                <div className="toggle-item">
                    <div className="toggle-info">
                        <span className="toggle-label">Require Uppercase Letter</span>
                        <span className="toggle-description">Password must contain at least one uppercase letter</span>
                    </div>
                    <label className="toggle-switch">
                        <input
                            type="checkbox"
                            checked={securitySettings.passwordRequireUppercase}
                            onChange={(e) => handleChange('security', 'passwordRequireUppercase', e.target.checked)}
                        />
                        <span className="toggle-slider"></span>
                    </label>
                </div>

                <div className="toggle-item">
                    <div className="toggle-info">
                        <span className="toggle-label">Require Lowercase Letter</span>
                        <span className="toggle-description">Password must contain at least one lowercase letter</span>
                    </div>
                    <label className="toggle-switch">
                        <input
                            type="checkbox"
                            checked={securitySettings.passwordRequireLowercase}
                            onChange={(e) => handleChange('security', 'passwordRequireLowercase', e.target.checked)}
                        />
                        <span className="toggle-slider"></span>
                    </label>
                </div>

                <div className="toggle-item">
                    <div className="toggle-info">
                        <span className="toggle-label">Require Number</span>
                        <span className="toggle-description">Password must contain at least one number</span>
                    </div>
                    <label className="toggle-switch">
                        <input
                            type="checkbox"
                            checked={securitySettings.passwordRequireNumber}
                            onChange={(e) => handleChange('security', 'passwordRequireNumber', e.target.checked)}
                        />
                        <span className="toggle-slider"></span>
                    </label>
                </div>

                <div className="toggle-item">
                    <div className="toggle-info">
                        <span className="toggle-label">Require Special Character</span>
                        <span className="toggle-description">Password must contain at least one special character</span>
                    </div>
                    <label className="toggle-switch">
                        <input
                            type="checkbox"
                            checked={securitySettings.passwordRequireSpecial}
                            onChange={(e) => handleChange('security', 'passwordRequireSpecial', e.target.checked)}
                        />
                        <span className="toggle-slider"></span>
                    </label>
                </div>
            </div>

            <div className="section-header">
                <Shield size={20} />
                <div>
                    <h3>Session & Login Security</h3>
                    <p>Configure session timeout and login attempt limits</p>
                </div>
            </div>

            <div className="settings-grid">
                <div className="form-group">
                    <label>Session Timeout (minutes)</label>
                    <input
                        type="number"
                        className="form-input"
                        value={securitySettings.sessionTimeout}
                        onChange={(e) => handleChange('security', 'sessionTimeout', parseInt(e.target.value))}
                        min="5"
                        max="480"
                    />
                </div>
                <div className="form-group">
                    <label>Max Login Attempts</label>
                    <input
                        type="number"
                        className="form-input"
                        value={securitySettings.maxLoginAttempts}
                        onChange={(e) => handleChange('security', 'maxLoginAttempts', parseInt(e.target.value))}
                        min="3"
                        max="10"
                    />
                </div>
                <div className="form-group">
                    <label>Lockout Duration (minutes)</label>
                    <input
                        type="number"
                        className="form-input"
                        value={securitySettings.lockoutDuration}
                        onChange={(e) => handleChange('security', 'lockoutDuration', parseInt(e.target.value))}
                        min="5"
                        max="60"
                    />
                </div>
            </div>

            <div className="toggle-group">
                <div className="toggle-item">
                    <div className="toggle-info">
                        <span className="toggle-label">Two-Factor Authentication</span>
                        <span className="toggle-description">Require 2FA for all user logins (Coming Soon)</span>
                    </div>
                    <label className="toggle-switch">
                        <input
                            type="checkbox"
                            checked={securitySettings.enableTwoFactor}
                            onChange={(e) => handleChange('security', 'enableTwoFactor', e.target.checked)}
                            disabled
                        />
                        <span className="toggle-slider"></span>
                    </label>
                </div>
            </div>
        </div>
    );

    // Render Appearance Settings Tab
    const renderAppearanceSettings = () => (
        <div className="settings-section">
            <div className="section-header">
                <Palette size={20} />
                <div>
                    <h3>Theme Settings</h3>
                    <p>Customize the look and feel of the application</p>
                </div>
            </div>

            <div className="settings-grid">
                <div className="form-group">
                    <label>Color Theme</label>
                    <div className="theme-selector">
                        <button
                            className={`theme-option ${appearanceSettings.theme === 'light' ? 'active' : ''}`}
                            onClick={() => handleChange('appearance', 'theme', 'light')}
                        >
                            <Sun size={20} />
                            <span>Light</span>
                        </button>
                        <button
                            className={`theme-option ${appearanceSettings.theme === 'dark' ? 'active' : ''}`}
                            onClick={() => handleChange('appearance', 'theme', 'dark')}
                        >
                            <Moon size={20} />
                            <span>Dark</span>
                        </button>
                    </div>
                </div>

                <div className="form-group">
                    <label>Dashboard Layout</label>
                    <select
                        className="form-select"
                        value={appearanceSettings.dashboardLayout}
                        onChange={(e) => handleChange('appearance', 'dashboardLayout', e.target.value)}
                    >
                        <option value="default">Default</option>
                        <option value="compact">Compact</option>
                        <option value="expanded">Expanded</option>
                    </select>
                </div>
            </div>

            <div className="toggle-group mt-6">
                <div className="toggle-item">
                    <div className="toggle-info">
                        <span className="toggle-label">Compact Sidebar Mode</span>
                        <span className="toggle-description">Reduce the sidebar width for more screen interface</span>
                    </div>
                    <label className="toggle-switch">
                        <input
                            type="checkbox"
                            checked={appearanceSettings.compactMode}
                            onChange={(e) => handleChange('appearance', 'compactMode', e.target.checked)}
                        />
                        <span className="toggle-slider"></span>
                    </label>
                </div>

                <div className="toggle-item">
                    <div className="toggle-info">
                        <span className="toggle-label">Show Welcome Message</span>
                        <span className="toggle-description">Display welcome banner on dashboard login</span>
                    </div>
                    <label className="toggle-switch">
                        <input
                            type="checkbox"
                            checked={appearanceSettings.showWelcomeMessage}
                            onChange={(e) => handleChange('appearance', 'showWelcomeMessage', e.target.checked)}
                        />
                        <span className="toggle-slider"></span>
                    </label>
                </div>
            </div>

            <div className="section-header mt-8">
                <Globe size={20} />
                <div>
                    <h3>Regional Settings</h3>
                    <p>Set your timezone, date and time formats</p>
                </div>
            </div>

            <div className="settings-grid">
                <div className="form-group">
                    <label>Timezone</label>
                    <select
                        className="form-select"
                        value={generalSettings.timezone}
                        onChange={(e) => handleChange('general', 'timezone', e.target.value)}
                    >
                        <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                        <option value="UTC">UTC</option>
                        <option value="America/New_York">America/New_York (EST)</option>
                        <option value="Europe/London">Europe/London (GMT)</option>
                        <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                    </select>
                </div>
                <div className="form-group">
                    <label>Date Format</label>
                    <select
                        className="form-select"
                        value={generalSettings.dateFormat}
                        onChange={(e) => handleChange('general', 'dateFormat', e.target.value)}
                    >
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                </div>
                <div className="form-group">
                    <label>Time Format</label>
                    <select
                        className="form-select"
                        value={generalSettings.timeFormat}
                        onChange={(e) => handleChange('general', 'timeFormat', e.target.value)}
                    >
                        <option value="24h">24-hour</option>
                        <option value="12h">12-hour (AM/PM)</option>
                    </select>
                </div>
                <div className="form-group">
                    <label>Language</label>
                    <select
                        className="form-select"
                        value={generalSettings.language}
                        onChange={(e) => handleChange('general', 'language', e.target.value)}
                    >
                        <option value="en">English</option>
                        <option value="hi">Hindi</option>
                    </select>
                </div>
            </div>

            <div className="section-header mt-8">
                <RefreshCw size={20} />
                <div>
                    <h3>Auto-Refresh</h3>
                    <p>Configure automatic data refresh intervals</p>
                </div>
            </div>

            <div className="settings-grid">
                <div className="form-group">
                    <label>Dashboard Refresh Interval (seconds)</label>
                    <input
                        type="number"
                        className="form-input"
                        value={generalSettings.autoRefreshInterval}
                        onChange={(e) => {
                            const value = parseInt(e.target.value, 10);
                            handleChange('general', 'autoRefreshInterval', isNaN(value) ? 30 : value);
                        }}
                        min="10"
                        max="300"
                    />
                    <small className="form-hint">Set between 10-300 seconds</small>
                </div>
            </div>
        </div>
    );

    // Render active tab content
    const renderTabContent = () => {
        switch (activeTab) {
            case 'general':
                return renderGeneralSettings();
            case 'notifications':
                return renderNotificationSettings();
            case 'sla':
                return renderSLASettings();
            case 'email':
                return renderEmailSettings();
            case 'security':
                return renderSecuritySettings();
            case 'appearance':
                return renderAppearanceSettings();
            default:
                return renderGeneralSettings();
        }
    };

    return (
        <div className="settings-page animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Settings &nbsp;</h1>
                    <p className="page-subtitle">
                        Manage system configuration and preferences
                    </p>
                </div>
                <div className="header-actions">
                    <button
                        className="btn btn-secondary"
                        onClick={handleReset}
                        disabled={saving}
                    >
                        <RefreshCw size={16} />
                        Reset to Defaults
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleSave}
                        disabled={saving || !hasChanges}
                    >
                        {saving ? (
                            <>
                                <RefreshCw size={16} className="spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save size={16} />
                                Save Changes
                            </>
                        )}
                    </button>
                </div>
            </div>

            <div className="settings-container">
                {/* Settings Navigation */}
                <div className="settings-nav glass-card">
                    {visibleTabs.map((tab) => (
                        <button
                            key={tab.id}
                            className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            <tab.icon size={18} />
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Settings Content */}
                <div className="settings-content glass-card">
                    {renderTabContent()}
                </div>
            </div>

            {/* Unsaved Changes Warning */}
            {hasChanges && (
                <div className="unsaved-warning">
                    <AlertTriangle size={16} />
                    <span>You have unsaved changes</span>
                </div>
            )}
        </div>
    );
}
