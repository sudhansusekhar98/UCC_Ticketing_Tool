import { useEffect, useRef, useState } from 'react';

/**
 * Animates a number from its previous value up to `target` with an ease-out
 * curve. Respects prefers-reduced-motion (jumps straight to the value).
 */
export default function useCountUp(target = 0, duration = 900) {
    const [val, setVal] = useState(0);
    const fromRef = useRef(0);

    useEffect(() => {
        const end = Number(target) || 0;
        const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        if (reduce) { setVal(end); fromRef.current = end; return; }

        const start = fromRef.current;
        const t0 = performance.now();
        let raf;
        const tick = (t) => {
            const p = Math.min((t - t0) / duration, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            setVal(Math.round(start + (end - start) * eased));
            if (p < 1) raf = requestAnimationFrame(tick);
            else fromRef.current = end;
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [target, duration]);

    return val;
}
