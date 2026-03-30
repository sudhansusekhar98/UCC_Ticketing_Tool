import { Construction } from 'lucide-react';
import './ComingSoon.css';

export default function ComingSoon() {
    return (
        <div className="coming-soon-container">
            <div className="coming-soon-card">
                <div className="coming-soon-icon">
                    <Construction size={48} />
                </div>
                <h1 className="coming-soon-title">Coming Soon</h1>
                <p className="coming-soon-text">
                    This page is currently under development. Stay tuned for updates!
                </p>
                <div className="coming-soon-dots">
                    <span className="dot"></span>
                    <span className="dot"></span>
                    <span className="dot"></span>
                </div>
            </div>
        </div>
    );
}
