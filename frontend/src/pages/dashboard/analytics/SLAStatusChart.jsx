import { SmilePlus, ThumbsUp, Minus, ThumbsDown } from 'lucide-react';

export default function SLAStatusChart({ stats }) {
    const resolved = stats?.totalResolved ?? (stats?.totalClosed ?? 0) + (stats?.resolvedToday ?? 0);
    const inProgress = stats?.inProgressTickets ?? 0;
    const open = stats?.openTickets ?? 0;
    const total = resolved + inProgress + open;

    const pct = v => (total > 0 ? Math.round((v / total) * 100) : 0);

    const items = [
        {
            label: 'Resolved',
            color: '#5fb67a',
            pctVal: pct(resolved),
            icon: <ThumbsUp size={20} style={{ color: '#5fb67a' }} />,
            count: resolved,
        },
        {
            label: 'In Progress',
            color: '#f5c36e',
            pctVal: pct(inProgress),
            icon: <Minus size={20} style={{ color: '#f5c36e' }} />,
            count: inProgress,
        },
        {
            label: 'Open',
            color: '#da6d67',
            pctVal: pct(open),
            icon: <ThumbsDown size={20} style={{ color: '#da6d67' }} />,
            count: open,
        },
    ];

    return (
        <section className="vchart-section">
            <div className="chart-title-row">
                <SmilePlus size={16} />
                <span>Resolution Status</span>
            </div>
            <div className="sla-body">
                <div className="sla-compliance-block">
                    <div className="sla-compliance-label">SLA Compliance</div>
                    <div className="sla-compliance-value">{stats?.slaCompliancePercent ?? 0}%</div>
                    <div className="sla-compliance-sub">
                        {stats?.slaBreached ?? 0} breached · {stats?.slaAtRisk ?? 0} at risk
                    </div>
                </div>
                <div className="sla-progress-list">
                    {items.map(item => (
                        <div key={item.label} className="sla-progress-item">
                            <div className="sla-progress-header">
                                {item.icon}
                                <span className="sla-progress-label">{item.label}</span>
                                <span className="sla-progress-count">{item.count.toLocaleString()}</span>
                                <span className="sla-progress-pct">{item.pctVal}%</span>
                            </div>
                            <div className="sla-progress-bar">
                                <div
                                    className="sla-progress-fill"
                                    style={{ width: `${item.pctVal}%`, background: item.color }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
