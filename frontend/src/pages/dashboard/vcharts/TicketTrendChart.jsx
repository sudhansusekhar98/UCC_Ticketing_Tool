import { VChart } from '@visactor/react-vchart';

const CREATED_COLOR     = '#6366F1';   // vibrant indigo
const RESOLVED_COLOR    = '#10B981';   // emerald
const IN_PROGRESS_COLOR = '#F59E0B';   // amber

function buildSpec(trends) {
    const flatData = trends.flatMap((d) => [
        { date: d.date, series: 'Created',     count: d.created    ?? 0 },
        { date: d.date, series: 'Resolved',    count: d.resolved   ?? 0 },
        { date: d.date, series: 'In Progress', count: d.inProgress ?? 0 },
    ]);

    return {
        type:        'area',
        data:        [{ id: 'trend', values: flatData }],
        xField:      'date',
        yField:      'count',
        seriesField: 'series',
        stack:       false,
        smooth:      true,
        color:       [CREATED_COLOR, RESOLVED_COLOR, IN_PROGRESS_COLOR],
        legends:     { visible: false },

        /* ── lines ── */
        line: {
            style: {
                lineWidth:      2.5,
                shadowBlur:     8,
                shadowColor:    (d) => {
                    if (d?.series === 'Resolved') return 'rgba(16,185,129,.35)';
                    if (d?.series === 'In Progress') return 'rgba(245,158,11,.35)';
                    return 'rgba(99,102,241,.35)';
                },
                shadowOffsetY:  3,
            },
        },

        /* ── filled area with gradient ── */
        area: {
            style: {
                fillOpacity: 1,
                fill: (d) => {
                    const base = d?.series === 'Resolved'
                        ? RESOLVED_COLOR
                        : d?.series === 'In Progress'
                            ? IN_PROGRESS_COLOR
                            : CREATED_COLOR;
                    return {
                        gradient: 'linear',
                        x0: 0, y0: 0, x1: 0, y1: 1,
                        stops: [
                            { offset: 0,   color: base, opacity: 0.28 },
                            { offset: 0.6, color: base, opacity: 0.07 },
                            { offset: 1,   color: base, opacity: 0    },
                        ],
                    };
                },
            },
        },

        /* ── hover points ── */
        point: {
            visible:  false,
            style:    { size: 6, fillOpacity: 1, stroke: '#fff', lineWidth: 2 },
            state: {
                hover: {
                    size:        8,
                    fillOpacity: 1,
                    stroke:      '#fff',
                    lineWidth:   2.5,
                },
            },
        },

        /* ── crosshair ── */
        crosshair: {
            xField: {
                visible: true,
                line: {
                    type:  'rect',
                    style: {
                        fill:        '#6366F1',
                        fillOpacity: 0.06,
                        cornerRadius: 4,
                    },
                },
            },
        },

        /* ── tooltip ── */
        tooltip: {
            trigger: ['click', 'hover'],
            style:   {
                panel: {
                    shadow:       '0 8px 24px rgba(16,24,40,.14)',
                    borderRadius: 10,
                    border:       '1px solid #EAEDF4',
                },
            },
            dimension: {
                title:   { visible: false },
                content: [{
                    hasShape:  true,
                    shapeType: 'circle',
                    key:       (d) => d.series,
                    value:     (d) => d.count,
                }],
            },
        },

        /* ── axes ── */
        axes: [
            {
                orient:     'bottom',
                domainLine: { visible: false },
                tick:       { visible: false },
                label: {
                    style: {
                        fontSize:   10.5,
                        fill:       '#94A3B8',
                        fontWeight: 500,
                    },
                    formatMethod: (val) =>
                        typeof val === 'string' ? val.slice(5) : val,
                },
            },
            {
                orient:     'left',
                domainLine: { visible: false },
                tick:       { visible: false },
                grid: {
                    style: {
                        stroke:    '#EDF0F7',
                        lineWidth: 1,
                        lineDash:  [4, 4],
                    },
                },
                label: { style: { fontSize: 10.5, fill: '#94A3B8' } },
            },
        ],

        background:     'transparent',
        animationEnter: { easing: 'cubicOut', duration: 700 },
        padding:        [12, 12, 6, 4],
        autoFit:        true,
    };
}

export default function TicketTrendChart({ trends = [], loading }) {
    if (!Array.isArray(trends)) trends = trends?.trends ?? [];

    return (
        <div className="vd-chart-fill">
            {loading ? (
                <div className="vd-empty-chart">Loading…</div>
            ) : trends.length > 0 ? (
                <VChart spec={buildSpec(trends)} />
            ) : (
                <div className="vd-empty-chart">No data for the selected range</div>
            )}
        </div>
    );
}
