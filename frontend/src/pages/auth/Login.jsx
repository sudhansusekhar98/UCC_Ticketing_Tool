import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Eye, EyeOff, Loader } from 'lucide-react';
import useAuthStore from '../../context/authStore';
import TOpsLogo from '../../assets/TicketOps.png';
import './Login.css';

export default function Login() {
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState(null);
    const [isPending, setIsPending] = useState(false);
    const { login } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();
    const redirectTo = location.state?.from || '/dashboard';

    const handleSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const username = formData.get('username')?.trim();
        const password = formData.get('password');

        if (!username || !password) {
            setError('Please enter username and password');
            return;
        }

        setError(null);
        setIsPending(true);

        const result = await login(username, password);

        setIsPending(false);

        if (result.success) {
            navigate(redirectTo, { replace: true });
        } else {
            setError(result.error || 'Login failed');
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
                                name="username"
                                className="form-input"
                                placeholder="Enter your username"
                                autoComplete="username"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <div className="password-input-wrapper">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    className="form-input"
                                    placeholder="Enter your password"
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
                            disabled={isPending}
                        >
                            {isPending ? (
                                <>
                                    <Loader size={20} className="animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </form>

                    <div className="login-client-link">
                        <span>Site customer?</span>
                        <Link to="/signup">Request client access →</Link>
                    </div>
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
