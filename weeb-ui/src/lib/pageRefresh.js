/**
 * Fired once by every mutation (see api/http.js). Mounted resources and option lists
 * listen and refetch themselves.
 *
 * This replaces refreshPageQuickly(), which called window.location.reload() after every
 * save — rebooting the whole SPA (re-download, re-auth, re-fetch everything) each time.
 */
export const DATA_CHANGED_EVENT = 'weeb:data-changed';
