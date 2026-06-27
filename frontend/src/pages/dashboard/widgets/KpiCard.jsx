import { Link } from 'react-router-dom';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import useCountUp from './useCountUp';
import Sparkline from './Sparkline';

/**
 * Premium KPI tile: gradient icon chip, animated count-up, an optional signed
 * delta chip (coloured by whether the movement is good or bad), and an optional
 * sparkline footer.
 *
 *  - delta:     signed % vs previous period (omit to hide the chip)
 *  - invert:    true when "up" is bad (e.g. open tickets, breaches)
 *  - series:    numeric array for the sparkline (omit to hide)
 */
export default function KpiCard({
    to,
    icon: Icon,
    label,
    value = 0,
    accent = '#4F46E5',
    delta,
    invert = false,
    series,
    sub,
}) {
    const animated = useCountUp(value);
    const hasDelta = Number.isFinite(delta);
    const up = hasDelta && delta > 0;
    const flat = hasDelta && delta === 0;
    const good = invert ? delta < 0 : delta > 0;
    const deltaColor = flat ? 'var(--vd-t3)' : good ? 'var(--vd-emerald)' : 'var(--vd-rose)';
    const Arrow = up ? ArrowUpRight : ArrowDownRight;

    const Wrapper = to ? Link : 'div';
    const wrapperProps = to ? { to } : {};

    return (
        <Wrapper {...wrapperProps} className="vd-kpi" style={{ '--vd-accent': accent }}>
            <div className="vd-kpi-top">
                <span className="vd-kpi-icon"><Icon size={17} /></span>
                {hasDelta && (
                    <span className="vd-kpi-delta" style={{ color: deltaColor, background: `color-mix(in srgb, ${'currentColor'} 12%, transparent)` }}>
                        {!flat && <Arrow size={12} strokeWidth={2.5} />}
                        {Math.abs(delta)}%
                    </span>
                )}
            </div>

            <div className="vd-kpi-body">
                <span className="vd-kpi-value">{animated.toLocaleString()}</span>
                <span className="vd-kpi-label">{label}</span>
            </div>

            {series && series.length > 1 ? (
                <div className="vd-kpi-spark">
                    <Sparkline data={series} color={accent} width={150} height={34} />
                </div>
            ) : sub ? (
                <span className="vd-kpi-sub">{sub}</span>
            ) : null}
        </Wrapper>
    );
}
