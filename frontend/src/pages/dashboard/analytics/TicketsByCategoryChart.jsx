import { VChart } from '@visactor/react-vchart';
import { CirclePercent } from 'lucide-react';

function buildSpec(categories) {
    return {
        type: 'circlePacking',
        data: [{
            id: 'data',
            values: categories.map(c => ({
                name: c.category || c._id || 'Other',
                value: c.count,
            })),
        }],
        categoryField: 'name',
        valueField: 'value',
        drill: true,
        padding: 0,
        layoutPadding: 5,
        label: {
            style: {
                fill: 'white',
                stroke: false,
                visible: d => d.depth === 0,
                text: d => String(d.value),
                fontSize: d => Math.max(d.radius / 2, 10),
                dy: d => d.radius / 8,
            },
        },
        legends: [{ visible: true, orient: 'top', position: 'start', padding: 0 }],
        tooltip: { trigger: ['click', 'hover'] },
        animationEnter: { easing: 'cubicInOut' },
        animationExit: { easing: 'cubicInOut' },
        animationUpdate: { easing: 'cubicInOut' },
    };
}

export default function TicketsByCategoryChart({ categories = [] }) {
    const total = categories.reduce((s, c) => s + c.count, 0);

    return (
        <section className="vchart-section">
            <div className="chart-title-row">
                <CirclePercent size={16} />
                <span>Tickets by Category</span>
            </div>
            <div className="category-total">
                <span className="category-total-value">{total.toLocaleString()}</span>
                <span className="category-total-label"> Tickets</span>
            </div>
            <div className="vchart-canvas">
                {categories.length > 0
                    ? <VChart spec={buildSpec(categories)} />
                    : <div className="chart-empty">No category data</div>
                }
            </div>
        </section>
    );
}
