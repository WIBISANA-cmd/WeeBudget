import { useCallback, useEffect, useMemo, useState } from 'react';

/**
 * Time-of-day periods with their hour boundaries, theme, and sky image.
 *
 * | Period   | Range          | Theme | Sky           |
 * |----------|----------------|-------|---------------|
 * | morning  | 06:00 – 11:59  | light | sunrise       |
 * | afternoon| 12:00 – 15:59  | light | bright blue   |
 * | evening  | 16:00 – 18:29  | light | sunset orange |
 * | night    | 18:30 – 05:59  | dark  | starry night  |
 */

const SKY_IMAGES = {
  morning: '/sky/morning.jpg',
  afternoon: '/sky/afternoon.jpg',
  evening: '/sky/evening.jpg',
  night: '/sky/night.jpg',
};

/**
 * Resolve the current time-of-day period from the device clock.
 * Uses hours + minutes to handle the 18:30 boundary precisely.
 */
function resolvePeriod() {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  const totalMinutes = h * 60 + m;

  // 06:00 (360) – 11:59 (719)
  if (totalMinutes >= 360 && totalMinutes <= 719) return 'morning';
  // 12:00 (720) – 15:59 (959)
  if (totalMinutes >= 720 && totalMinutes <= 959) return 'afternoon';
  // 16:00 (960) – 18:29 (1109)
  if (totalMinutes >= 960 && totalMinutes <= 1109) return 'evening';
  // 18:30 (1110) – 05:59 (359)  → everything else
  return 'night';
}

/**
 * Hook that returns the current time-of-day context.
 *
 * - `period`     — 'morning' | 'afternoon' | 'evening' | 'night'
 * - `theme`      — 'light' | 'dark'
 * - `skyImage`   — public path to the sky background image
 * - `greeting`   — Indonesian greeting string
 *
 * Recalculates every 60 s to stay in sync while the tab is open,
 * and on visibility change when the user switches back to the tab.
 */
export function useTimeOfDay() {
  const [period, setPeriod] = useState(resolvePeriod);

  const sync = useCallback(() => {
    setPeriod((prev) => {
      const next = resolvePeriod();
      return next === prev ? prev : next;
    });
  }, []);

  // Tick every 60 s
  useEffect(() => {
    const id = setInterval(sync, 60_000);
    return () => clearInterval(id);
  }, [sync]);

  // Re-sync when the tab becomes visible again (e.g. laptop resume)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') sync();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [sync]);

  return useMemo(() => {
    const theme = period === 'night' ? 'dark' : 'light';
    const skyImage = SKY_IMAGES[period];

    const greetings = {
      morning: 'Selamat pagi',
      afternoon: 'Selamat siang',
      evening: 'Selamat sore',
      night: 'Selamat malam',
    };

    return { period, theme, skyImage, greeting: greetings[period] };
  }, [period]);
}
