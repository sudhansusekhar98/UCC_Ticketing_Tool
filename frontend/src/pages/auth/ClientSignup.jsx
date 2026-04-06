import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Link } from 'react-router-dom';
import { User, Mail, Phone, Building2, MessageSquare, Loader, CheckCircle, ArrowLeft, Briefcase } from 'lucide-react';
import TOpsLogo from '../../assets/TicketOps.png';
import './ClientSignup.css';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <button type="submit" className="btn btn-primary btn-lg w-full signup-btn" disabled={pending}>
            {pending ? (
                <><Loader size={18} className="animate-spin" /> Submitting...</>
            ) : (
                'Submit Request'
            )}
        </button>
    );
}

export default function ClientSignup() {
    const [state, formAction] = useActionState(async (prevState, formData) => {
        const fullName = formData.get('fullName')?.trim();
        const email = formData.get('email')?.trim();
        const phone = formData.get('phone')?.trim();
        const designation = formData.get('designation')?.trim();
        const siteName = formData.get('siteName')?.trim();
        const message = formData.get('message')?.trim();

        if (!fullName || !email || !phone || !designation || !siteName) {
            return { error: 'Please fill in all required fields.', submitted: false };
        }

        try {
            const res = await fetch(`${API_BASE}/client-registrations/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fullName, email, phone, designation, siteName, message }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Submission failed');
            return { error: null, submitted: true };
        } catch (err) {
            return { error: err.message, submitted: false };
        }
    }, { error: null, submitted: false });

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

                    {state.submitted ? (
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
                        <form action={formAction} className="signup-form">
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
                                    />
                                </div>
                            </div>

                            {state.error && <div className="signup-error">{state.error}</div>}

                            <SubmitButton />

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
