import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

function ChangeIndicator({ change }) {
    const isPositive = change >= 0;
    return (
        <span className={`change-indicator ${isPositive ? 'positive' : 'negative'}`}>
            {isPositive ? '+' : ''}{Math.round(change * 100)}%
            {isPositive
                ? <ArrowUpRight size={11} className="change-arrow" />
                : <ArrowDownRight size={11} className="change-arrow" />}
        </span>
    );
}

export default function MetricCard({ title, value, change, className = '' }) {
    return (
        <section className={`metric-card ${className}`}>
            <h2 className="metric-card-title">{title}</h2>
            <div className="metric-card-value-row">
                <span className="metric-card-value">{value}</span>
                {change !== undefined && <ChangeIndicator change={change} />}
            </div>
            <div className="metric-card-subtitle">Compare to last period</div>
        </section>
    );
}
