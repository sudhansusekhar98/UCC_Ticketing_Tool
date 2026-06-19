import { VChart } from '@visactor/react-vchart';
import { FilePlus2 } from 'lucide-react';

function buildSpec(trends) {
    const data = trends.flatMap(d => [
        { date: d.date, type: 'created', count: d.created },
        { date: d.date, type: 'resolved', count: d.resolved },
    ]);

    return {
        type: 'bar',
        data: [{ id: 'barData', values: data }],
        xField: 'date',
        yField: 'count',
        seriesField: 'type',
        padding: [10, 0, 10, 0],
        legends: { visible: false },
        stack: false,
        tooltip: { trigger: ['click', 'hover'] },
        bar: {
            style: { cornerRadius: [6, 6, 6, 6] },
            state: { hover: { outerBorder: { distance: 2, lineWidth: 2 } } },
        },
        color: ['#60C2FB', '#3161F8'],
        axes: [
            {
                orient: 'bottom',
                label: {
                    style: { fontSize: 11 },
                    formatMethod: val => val.slice(5), // show MM-DD only
                },
            },
        ],
    };
}

export default function TicketTrendChart({ trends = [] }) {
    const avgCreated = trends.length
        ? Math.round(trends.reduce((s, d) => s + d.created, 0) / trends.length)
        : 0;
    const avgResolved = trends.length
        ? Math.round(trends.reduce((s, d) => s + d.resolved, 0) / trends.length)
        : 0;

    return (
        <section className="vchart-section trend-chart-section">
            <div className="chart-title-row">
                <FilePlus2 size={16} />
                <span>Ticket Trend</span>
            </div>
            <div className="trend-chart-body">
                <div className="trend-metric-sidebar">
                    <div className="trend-metric">
                        <span className="trend-metric-dot" style={{ background: '#60C2FB' }} />
                        <div>
                            <div className="trend-metric-label">Avg. Created / day</div>
                            <div className="trend-metric-value">{avgCreated}</div>
                        </div>
                    </div>
                    <div className="trend-metric">
                        <span className="trend-metric-dot" style={{ background: '#3161F8' }} />
                        <div>
                            <div className="trend-metric-label">Avg. Resolved / day</div>
                            <div className="trend-metric-value">{avgResolved}</div>
                        </div>
                    </div>
                </div>
                <div className="vchart-canvas trend-chart-canvas">
                    {trends.length > 0
                        ? <VChart spec={buildSpec(trends)} />
                        : <div className="chart-empty">No data for selected range</div>
                    }
                </div>
            </div>
        </section>
    );
}
