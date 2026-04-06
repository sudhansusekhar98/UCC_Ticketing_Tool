import { useActionState, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useFormStatus } from 'react-dom';
import { Eye, EyeOff, Loader } from 'lucide-react';
import useAuthStore from '../../context/authStore';
import TOpsLogo from '../../assets/TicketOps.png';
import './Login.css';

// Separate component so useFormStatus can read the parent form's pending state
function LoginButton() {
    const { pending } = useFormStatus();
    return (
        <button
            type="submit"
            className="btn btn-primary btn-lg w-full login-btn"
            disabled={pending}
        >
            {pending ? (
                <>
                    <Loader size={20} className="animate-spin" />
                    Signing in...
                </>
            ) : (
                'Sign In'
            )}
        </button>
    );
}

export default function Login() {
    const [showPassword, setShowPassword] = useState(false);
    const { login } = useAuthStore();
    const navigate = useNavigate();

    const [state, formAction] = useActionState(async (prevState, formData) => {
        const username = formData.get('username')?.trim();
        const password = formData.get('password');

        if (!username || !password) {
            return { error: 'Please enter username and password' };
        }

        const result = await login(username, password);
        if (result.success) {
            navigate('/dashboard');
            return { error: null };
        }
        return { error: result.error || 'Login failed' };
    }, { error: null });

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

                    <form action={formAction} className="login-form">
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

                        {state.error && (
                            <div className="login-error">
                                {state.error}
                            </div>
                        )}

                        <LoginButton />
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
