import { useCallback, useEffect, useState } from 'react';
import { apiGet } from '../api/http';

const TOKEN_KEY = 'weeb_auth_token';
const USER_CACHE_KEY = 'weeb_user_cache';

// Stage 0 of every page: the route guards and the layout wait on the user. The last known user,
// tied to the token it was fetched with, renders the shell at once while /auth/me revalidates
// behind it. A different token (logout, login as someone else) never sees it.
let cache = readPersistedUser();
let revalidated = false;
let cachedError = null;
let inFlightUserRequest = null;

function readPersistedUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_CACHE_KEY) || 'null');
  } catch {
    return null;
  }
}

function cachedUserForCurrentToken() {
  const token = localStorage.getItem(TOKEN_KEY);
  return token && cache?.token === token ? cache.user : null;
}

/** Call before a reload that must reflect a profile change (account mode, onboarding). */
export function forgetCurrentUser() {
  cache = null;
  revalidated = false;
  try {
    localStorage.removeItem(USER_CACHE_KEY);
  } catch {
    // storage unavailable: the in-memory reset is enough
  }
}

async function requestCurrentUser() {
  if (inFlightUserRequest) {
    return inFlightUserRequest;
  }

  const token = localStorage.getItem(TOKEN_KEY);
  inFlightUserRequest = apiGet('/auth/me')
    .then((response) => {
      const user = response.data || null;
      cache = { token, user };
      revalidated = true;
      cachedError = null;
      try {
        localStorage.setItem(USER_CACHE_KEY, JSON.stringify(cache));
      } catch {
        // storage full or blocked: the in-memory cache still serves this session
      }
      return user;
    })
    .catch((error) => {
      cachedError = error.response?.data?.message || 'User belum bisa dimuat.';
      throw error;
    })
    .finally(() => {
      inFlightUserRequest = null;
    });

  return inFlightUserRequest;
}

export function useCurrentUser() {
  const hasToken = Boolean(localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(() => (hasToken ? cachedUserForCurrentToken() : null));
  const [isLoading, setLoading] = useState(() => hasToken && !cachedUserForCurrentToken());
  const [error, setError] = useState(() => cachedError);

  const loadUser = useCallback(async () => {
    if (!hasToken) {
      setUser(null);
      setError(null);
      setLoading(false);
      return null;
    }

    const cachedUser = cachedUserForCurrentToken();
    if (cachedUser) {
      setUser(cachedUser);
      setError(null);
      setLoading(false);
      if (!revalidated) {
        // Stage 2: refresh behind the already-rendered shell; keep the cached user if offline.
        requestCurrentUser().then(setUser).catch(() => {});
      }
      return cachedUser;
    }

    setLoading(true);
    setError(null);

    try {
      const nextUser = await requestCurrentUser();
      setUser(nextUser);
      return nextUser;
    } catch (err) {
      setUser(null);
      setError(cachedError || err.response?.data?.message || 'User belum bisa dimuat.');
      return null;
    } finally {
      setLoading(false);
    }
  }, [hasToken]);

  useEffect(() => {
    if (!hasToken) {
      setUser(null);
      setError(null);
      setLoading(false);
      return;
    }

    queueMicrotask(() => {
      loadUser();
    });
  }, [hasToken, loadUser]);

  return { user, isLoading, error, reloadUser: loadUser };
}
