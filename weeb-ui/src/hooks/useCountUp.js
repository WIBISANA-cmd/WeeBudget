import { useEffect, useRef, useState } from 'react';

const prefersReducedMotion = () => typeof window !== 'undefined'
  && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Eases a displayed number from where it was to `target`, so a figure settles instead of jumping. */
export function useCountUp(target, duration = 700) {
  const value = Number(target) || 0;
  const [display, setDisplay] = useState(0);
  const shown = useRef(0);

  useEffect(() => {
    const from = shown.current;
    if (from === value) return undefined;

    if (prefersReducedMotion()) {
      shown.current = value;
      const frame = requestAnimationFrame(() => setDisplay(value));
      return () => cancelAnimationFrame(frame);
    }

    let frame;
    const startedAt = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      shown.current = from + (value - from) * eased;
      setDisplay(shown.current);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return display;
}
