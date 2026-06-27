import { VChart } from '@visactor/react-vchart';

const PRIORITY_COLORS = {
    Critical: '#F43F5E',
    High: '#F59E0B',
    Medium: '#6366F1',
    Low: '#10B981',
};
const FALLBACK = ['#4F46E5', '#0EA5E9', '#8B5CF6', '#10B981', '#F59E0B', '#F43F5E'];

export default function PriorityChart({ priorities = [] }) {
    const data = (priorities || []).map((p, i) => ({
        name: p.priority || 'Unknown',
        value: p.count ?? 0,
        fill: PRIORITY_COLORS[p.priority] || FALLBACK[i % FALLBACK.length],
    }));
    const total = data.reduce((s, d) => s + d.value, 0);

    const spec = {
        type: 'pie',
        data: [{ id: 'priority', values: data }],
        valueField: 'value',
        categoryField: 'name',
        outerRadius: 0.88,
        innerRadius: 0.62,
        padAngle: 0.6,
        color: data.map((d) => d.fill),
        pie: { style: { cornerRadius: 4, stroke: '#fff', lineWidth: 2 } },

        /* ── legend with count + % ── */
        legends: [{
            type: 'discrete',
            visible: true,
            orient: 'bottom',
            padding: [12, 0, 0, 0],
            maxRow: 2,
            item: {
                label: {
                    style: { fontSize: 11, fill: '#64748B', fontWeight: 500 },
                },
                value: {
                    style: { fontSize: 11, fill: '#0F172A', fontWeight: 700 },
                    formatMethod: (_t, datum) => {
                        const v = datum?.value ?? 0;
                        const pct = total > 0 ? Math.round((v / total) * 100) : 0;
                        return `${v} (${pct}%)`;
                    },
                },
                shape: { style: { size: 8, symbolType: 'circle' } },
            },
        }],

        label: { visible: false },

        /* ── centred total indicator ── */
        indicator: [
            {
                visible: true,
                offsetY: '-8%',
                title: {
                    style: {
                        text: String(total),
                        fontSize: 26,
                        fontWeight: '800',
                        fill: '#0F172A',
                    },
                },
            },
            {
                visible: true,
                offsetY: '18%',
                title: {
                    style: {
                        text: 'Active',
                        fontSize: 11,
                        fill: '#94A3B8',
                    },
                },
            },
        ],

        tooltip: {
            trigger: ['click', 'hover'],
            mark: {
                title: { visible: false },
                content: [{ key: (d) => d?.name, value: (d) => d?.value }],
            },
        },
        background: 'transparent',
        animationEnter: { easing: 'cubicOut', duration: 600 },
        padding: [6, 6, 4, 6],
        autoFit: true,
    };

    return (
        <div className="vd-chart-fill">
            {data.length > 0 ? <VChart spec={spec} /> : <div className="vd-empty-chart">No data</div>}
        </div>
    );
}
