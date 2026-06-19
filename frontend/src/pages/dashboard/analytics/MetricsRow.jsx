import MetricCard from './MetricCard';

function calcChange(current, previous) {
    if (!previous || previous === 0) return 0;
    return (current - previous) / previous;
}

export default function MetricsRow({ stats, trendsData }) {
    const curr = trendsData?.currentStats || {};
    const prev = trendsData?.previousStats || {};

    const metrics = [
        {
            title: 'Total Tickets Created',
            value: (curr.totalCreated ?? stats?.totalTickets ?? 0).toLocaleString(),
            change: calcChange(curr.totalCreated ?? 0, prev.totalCreated ?? 0),
        },
        {
            title: 'Open Tickets',
            // Negate: fewer open tickets is better, so invert direction
            value: (curr.openTickets ?? stats?.openTickets ?? 0).toLocaleString(),
            change: calcChange(curr.openTickets ?? 0, prev.openTickets ?? 0) * -1,
        },
        {
            title: 'Tickets Resolved',
            value: (curr.totalResolved ?? stats?.resolvedToday ?? 0).toLocaleString(),
            change: calcChange(curr.totalResolved ?? 0, prev.totalResolved ?? 0),
        },
        {
            title: 'SLA Compliance',
            value: `${stats?.slaCompliancePercent ?? 0}%`,
            change: undefined,
        },
    ];

    return (
        <div className="metrics-row">
            {metrics.map(m => (
                <MetricCard key={m.title} {...m} />
            ))}
        </div>
    );
}
