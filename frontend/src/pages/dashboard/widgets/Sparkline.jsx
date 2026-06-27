import { useId } from 'react';

/**
 * Lightweight inline-SVG sparkline (area + line). No chart dependency, so it
 * stays razor-sharp at any size and is cheap to render inside KPI cards.
 */
export default function Sparkline({
    data = [],
    color = '#4F46E5',
    width = 120,
    height = 36,
    strokeWidth = 2,
    fill = true,
}) {
    const gid = useId();
    if (!Array.isArray(data) || data.length < 2) {
        return <svg width={width} height={height} aria-hidden="true" />;
    }

    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min || 1;
    const stepX = width / (data.length - 1);
    const pad = 3;
    const pts = data.map((d, i) => [
        i * stepX,
        height - pad - ((d - min) / range) * (height - pad * 2),
    ]);
    const line = pts
        .map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`)
        .join(' ');
    const area = `${line} L${width},${height} L0,${height} Z`;

    return (
        <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
            style={{ display: 'block', overflow: 'visible' }}
            aria-hidden="true"
        >
            <defs>
                <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.26" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            {fill && <path d={area} fill={`url(#${gid})`} />}
            <path
                d={line}
                fill="none"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}
