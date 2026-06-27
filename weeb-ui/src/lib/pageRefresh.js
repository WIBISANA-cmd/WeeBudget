export function refreshPageQuickly(delay = 120) {
  if (typeof window === 'undefined') return;

  window.setTimeout(() => {
    window.location.reload();
  }, delay);
}
