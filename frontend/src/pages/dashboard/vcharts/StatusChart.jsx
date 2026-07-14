const STATUS_COLORS = {
    Open: '#0EA5E9',
    Assigned: '#8B5CF6',
    InProgress: '#F59E0B',
    Resolved: '#10B981',
    Escalated: '#F43F5E',
    Closed: '#94A3B8',
    Cancelled: '#CBD5E1',
};
const STATUS_LABELS = { InProgress: 'In Progress' };

export default function StatusChart({ statuses = [] }) {
    const data = (statuses || [])
        .filter((s) => s.status !== 'Closed') // Closed counts hidden
        .map((s) => ({
            name: s.status || 'Unknown',
            value: s.count ?? 0,
        }));
    const max = Math.max(...data.map((d) => d.value), 1);

    if (data.length === 0) {
        return <div className="vd-chart-fill"><div className="vd-empty-chart">No data</div></div>;
    }

    return (
        <div className="vd-statusbars">
            {data.map((d) => {
                const color = STATUS_COLORS[d.name] || '#4F46E5';
                return (
                    <div key={d.name} className="vd-statusbar-col">
                        <span className="vd-statusbar-count">{d.value}</span>
                        <div className="vd-statusbar-track">
                            <div
                                className="vd-statusbar-fill"
                                style={{ height: `${Math.max((d.value / max) * 100, 4)}%`, background: color }}
                            />
                        </div>
                        <span className="vd-statusbar-label">{STATUS_LABELS[d.name] || d.name}</span>
                    </div>
                );
            })}
        </div>
    );
}
