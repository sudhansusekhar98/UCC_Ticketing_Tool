import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader } from 'lucide-react';
import useAuthStore from '../../context/authStore';
import toast from 'react-hot-toast';
import TOpsLogo from '../../assets/TicketOps.png';
import './Login.css';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const { login, isLoading, error, clearError } = useAuthStore();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        clearError();

        if (!username || !password) {
            toast.error('Please enter username and password');
            return;
        }

        const result = await login(username, password);
        if (result.success) {
            toast.success('Welcome back!');
            navigate('/dashboard');
        } else {
            toast.error(result.error || 'Login failed');
        }
    };

    return (
        <div className="login-page">
            <div className="login-bg-effects">
                <div className="bg-blob blob-1"></div>
                <div className="bg-blob blob-2"></div>
                <div className="bg-blob blob-3"></div>
            </div>

            <div className="login-container">
                <div className="login-card glass-card">
                    <div className="login-header">
                        <div className="login-logo">
                            <div className="logo-icon-large">
                                <img src={TOpsLogo} alt="TicketOps" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                            </div>
                        </div>
                        <h1 className="login-title">TicketOps</h1>
                        <p className="login-subtitle">Surveillance Maintenance Platform</p>
                    </div>

                    <form onSubmit={handleSubmit} className="login-form">
                        <div className="form-group">
                            <label className="form-label">Username</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Enter your username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                autoComplete="username"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <div className="password-input-wrapper">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    className="form-input"
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="login-error">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="btn btn-primary btn-lg w-full login-btn"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader size={20} className="animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </form>

                    {/* <div className="login-footer">
                        <p>Default credentials: <code>admin</code> / <code>Admin@123</code></p>
                    </div> */}
                </div>

                <div className="login-features">
                    <div className="feature-item">
                        <div className="feature-icon">📊</div>
                        <div className="feature-text">
                            <h4>Real-time Dashboard</h4>
                            <p>Monitor ticket status & SLA compliance</p>
                        </div>
                    </div>
                    <div className="feature-item">
                        <div className="feature-icon">⚡</div>
                        <div className="feature-text">
                            <h4>Automated Escalation</h4>
                            <p>Never miss an SLA deadline</p>
                        </div>
                    </div>
                    <div className="feature-item">
                        <div className="feature-icon">📍</div>
                        <div className="feature-text">
                            <h4>Asset Tracking</h4>
                            <p>Complete surveillance infrastructure view</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
