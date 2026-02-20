import { useState } from 'react';
import { Link } from 'react-router-dom';
import { User, Mail, Phone, Building2, MessageSquare, Loader, CheckCircle, ArrowLeft, Briefcase } from 'lucide-react';
import TOpsLogo from '../../assets/TicketOps.png';
import './ClientSignup.css';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function ClientSignup() {
    const [form, setForm] = useState({ fullName: '', email: '', phone: '', designation: '', siteName: '', message: '' });
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const { fullName, email, phone, designation, siteName } = form;
        if (!fullName || !email || !phone || !designation || !siteName) {
            setError('Please fill in all required fields.');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/client-registrations/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Submission failed');
            setSubmitted(true);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="signup-page">
            <div className="signup-bg-effects">
                <div className="bg-blob blob-1"></div>
                <div className="bg-blob blob-2"></div>
                <div className="bg-blob blob-3"></div>
            </div>

            <div className="signup-container">
                <div className="signup-card glass-card">
                    <div className="signup-header">
                        <div className="signup-logo">
                            <img src={TOpsLogo} alt="TicketOps" />
                        </div>
                        <h1 className="signup-title">Request Client Access</h1>
                        <p className="signup-subtitle">
                            Submit your details to get access for raising and tracking support tickets at your site.
                        </p>
                    </div>

                    {submitted ? (
                        <div className="signup-success">
                            <div className="success-icon">
                                <CheckCircle size={48} />
                            </div>
                            <h2>Request Submitted!</h2>
                            <p>
                                Your registration request has been received. An administrator will review it and you'll receive
                                an email with your login credentials once approved.
                            </p>
                            <Link to="/login" className="btn btn-primary">
                                <ArrowLeft size={16} /> Back to Login
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="signup-form">
                            <div className="signup-form-row">
                                <div className="form-group">
                                    <label className="form-label">Full Name <span className="required">*</span></label>
                                    <div className="input-with-icon">
                                        <User size={16} />
                                        <input
                                            name="fullName"
                                            type="text"
                                            className="form-input"
                                            placeholder="Your full name"
                                            value={form.fullName}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Email Address <span className="required">*</span></label>
                                    <div className="input-with-icon">
                                        <Mail size={16} />
                                        <input
                                            name="email"
                                            type="email"
                                            className="form-input"
                                            placeholder="you@example.com"
                                            value={form.email}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="signup-form-row">
                                <div className="form-group">
                                    <label className="form-label">Phone Number <span className="required">*</span></label>
                                    <div className="input-with-icon">
                                        <Phone size={16} />
                                        <input
                                            name="phone"
                                            type="tel"
                                            className="form-input"
                                            placeholder="+91 98765 43210"
                                            value={form.phone}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Designation <span className="required">*</span></label>
                                    <div className="input-with-icon">
                                        <Briefcase size={16} />
                                        <input
                                            name="designation"
                                            type="text"
                                            className="form-input"
                                            placeholder="e.g. IT Manager, Facility Head"
                                            value={form.designation}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="signup-form-row">
                                <div className="form-group form-group-full">
                                    <label className="form-label">Site Name <span className="required">*</span></label>
                                    <div className="input-with-icon">
                                        <Building2 size={16} />
                                        <input
                                            name="siteName"
                                            type="text"
                                            className="form-input"
                                            placeholder="Name of your site / premises"
                                            value={form.siteName}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Additional Message <span className="optional">(optional)</span></label>
                                <div className="input-with-icon textarea-wrapper">
                                    <MessageSquare size={16} />
                                    <textarea
                                        name="message"
                                        className="form-input"
                                        placeholder="Any additional context for the admin..."
                                        rows={3}
                                        value={form.message}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            {error && <div className="signup-error">{error}</div>}

                            <button type="submit" className="btn btn-primary btn-lg w-full signup-btn" disabled={loading}>
                                {loading ? (
                                    <><Loader size={18} className="animate-spin" /> Submitting...</>
                                ) : (
                                    'Submit Request'
                                )}
                            </button>

                            <p className="login-link-text">
                                Already have an account? <Link to="/login">Sign In</Link>
                            </p>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
