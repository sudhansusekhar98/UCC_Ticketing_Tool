const PALETTE = ['#4F46E5', '#0EA5E9', '#8B5CF6', '#10B981', '#F59E0B', '#F43F5E'];

export default function CategoryChart({ categories = [] }) {
    const data = [...(categories || [])]
        .map((c) => ({ name: c.category || 'Uncategorized', value: c.count ?? 0 }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);
    const total = data.reduce((s, d) => s + d.value, 0);
    const max = Math.max(...data.map((d) => d.value), 1);

    if (data.length === 0) {
        return <div className="vd-chart-fill"><div className="vd-empty-chart">No data</div></div>;
    }

    return (
        <div className="vd-catbars">
            {data.map((d, i) => {
                const color = PALETTE[i % PALETTE.length];
                const pct = total ? Math.round((d.value / total) * 100) : 0;
                return (
                    <div key={d.name} className="vd-catbar-row">
                        <div className="vd-catbar-head">
                            <span className="vd-catbar-name" title={d.name}>{d.name}</span>
                            <span className="vd-catbar-val">{d.value} <span className="vd-catbar-pct">· {pct}%</span></span>
                        </div>
                        <div className="vd-catbar-track">
                            <div
                                className="vd-catbar-fill"
                                style={{ width: `${(d.value / max) * 100}%`, background: color }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
