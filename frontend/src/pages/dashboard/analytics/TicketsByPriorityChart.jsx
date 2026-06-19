import { VChart } from '@visactor/react-vchart';
import { Rss } from 'lucide-react';

function buildSpec(priorities) {
    const total = priorities.reduce((s, p) => s + p.count, 0);
    return {
        type: 'pie',
        legends: [{ type: 'discrete', visible: true, orient: 'bottom' }],
        data: [{
            id: 'id0',
            values: priorities.map(p => ({ type: p.priority || p._id, value: p.count })),
        }],
        valueField: 'value',
        categoryField: 'type',
        outerRadius: 1,
        innerRadius: 0.88,
        startAngle: -180,
        padAngle: 0.6,
        endAngle: 0,
        centerY: '80%',
        layoutRadius: 'auto',
        pie: { style: { cornerRadius: 6 } },
        tooltip: { trigger: ['click', 'hover'] },
        indicator: [
            {
                visible: true,
                offsetY: '38%',
                title: { style: { text: 'Active Tickets', fontSize: 13, opacity: 0.6 } },
            },
            {
                visible: true,
                offsetY: '58%',
                title: { style: { text: String(total), fontSize: 26 } },
            },
        ],
        color: ['#ef4444', '#f97316', '#eab308', '#22c55e'],
    };
}

export default function TicketsByPriorityChart({ priorities = [] }) {
    return (
        <section className="vchart-section">
            <div className="chart-title-row">
                <Rss size={16} />
                <span>Tickets by Priority</span>
            </div>
            <div className="vchart-canvas">
                {priorities.length > 0
                    ? <VChart spec={buildSpec(priorities)} />
                    : <div className="chart-empty">No priority data</div>
                }
            </div>
        </section>
    );
}
