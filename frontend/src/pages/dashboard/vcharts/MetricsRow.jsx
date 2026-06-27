import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

function calcChange(current, previous) {
    if (!previous) return 0;
    return (current - previous) / previous;
}

function fmt(n) {
    return Number(n).toLocaleString();
}

function ChangeChip({ change }) {
    if (change === 0) return null;
    const up = change > 0;
    const pct = Math.abs(Math.round(change * 100));
    return (
        <span className={`vdb-metric-change ${up ? 'up' : 'down'}`}>
            {up ? '+' : '-'}{pct}%
            {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
        </span>
    );
}

export default function MetricsRow({ stats, trendsData }) {
    const cur = trendsData?.currentStats;
    const prev = trendsData?.previousStats;

    const cards = [
        {
            label: 'Total Created',
            value: fmt(cur?.totalCreated ?? stats?.totalTickets ?? 0),
            change: calcChange(cur?.totalCreated ?? 0, prev?.totalCreated ?? 0),
        },
        {
            label: 'Open Tickets',
            value: fmt(stats?.openTickets ?? 0),
            change: calcChange(cur?.openTickets ?? 0, prev?.openTickets ?? 0),
        },
        {
            label: 'Resolved',
            value: fmt(cur?.totalResolved ?? 0),
            change: calcChange(cur?.totalResolved ?? 0, prev?.totalResolved ?? 0),
        },
        {
            label: 'SLA Compliance',
            value: `${stats?.slaCompliancePercent ?? 0}%`,
            change: 0,
        },
    ];

    return (
        <div className="vdb-metrics">
            {cards.map((c) => (
                <div key={c.label} className="vdb-metric-card">
                    <div className="vdb-metric-label">{c.label}</div>
                    <div className="vdb-metric-value-row">
                        <span className="vdb-metric-value">{c.value}</span>
                        <ChangeChip change={c.change} />
                    </div>
                    <div className="vdb-metric-compare">vs previous period</div>
                </div>
            ))}
        </div>
    );
}
