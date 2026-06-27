const DEFAULT_ERROR_PATTERN = /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i;

export function lazyWithRetry(importer, key = 'default') {
  return async () => {
    try {
      const module = await importer();
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(`lazy-retry:${key}`);
      }
      return module;
    } catch (error) {
      const message = String(error?.message || error || '');
      const shouldRetry = DEFAULT_ERROR_PATTERN.test(message);

      if (typeof window !== 'undefined' && shouldRetry) {
        const storageKey = `lazy-retry:${key}`;
        const hasRetried = window.sessionStorage.getItem(storageKey) === '1';

        if (!hasRetried) {
          window.sessionStorage.setItem(storageKey, '1');
          window.location.reload();
          return new Promise(() => {});
        }
      }

      throw error;
    }
  };
}
