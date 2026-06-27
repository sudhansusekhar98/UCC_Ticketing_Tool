import { useId } from 'react';

/**
 * SVG ring gauge. Sweeps to `value`% with an ease-out transition. Children are
 * centered inside the ring (used for the SLA compliance figure).
 */
export default function CircularProgress({
    value = 0,
    size = 132,
    stroke = 12,
    color = '#10B981',
    gradientTo,
    track = 'rgba(148,163,184,0.18)',
    children,
}) {
    const gid = useId();
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const pct = Math.max(0, Math.min(100, Number(value) || 0));
    const offset = c - (pct / 100) * c;

    return (
        <div style={{ position: 'relative', width: size, height: size }}>
            <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
                <defs>
                    <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor={color} />
                        <stop offset="100%" stopColor={gradientTo || color} />
                    </linearGradient>
                </defs>
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    fill="none"
                    stroke={`url(#${gid})`}
                    strokeWidth={stroke}
                    strokeDasharray={c}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(0.22,1,0.36,1)' }}
                />
            </svg>
            <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
            }}>
                {children}
            </div>
        </div>
    );
}
