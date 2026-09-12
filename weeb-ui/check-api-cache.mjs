/**
 * Self-check for the GET cache + mutation-refresh chain in src/api/http.js.
 * Run: node check-api-cache.mjs   (from weeb-ui/)
 *
 * Guards the money path: a stale cache here shows wrong account balances after a save.
 * Bundles http.js with a stubbed axios (rolldown ships with vite) so it runs under plain node.
 */
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';
import { rolldown } from 'rolldown';

const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'weeb-check-'));
const stub = path.join(tmp, 'stub-axios.js');

await fs.writeFile(stub, `
export const calls = { get: 0 };
export default {
  get: async (url, cfg) => { calls.get += 1; return { data: { url, params: cfg?.params, n: calls.get } }; },
  post: async () => ({ data: { ok: true } }),
  put: async () => ({ data: { ok: true } }),
  delete: async () => ({ data: { ok: true } }),
};
`);

const bundle = await rolldown({
  input: path.resolve('src/api/http.js'),
  external: [stub], // shared instance between bundle and this test
  plugins: [{
    name: 'stub-axios',
    resolveId: (id) => (id.endsWith('lib/axios') ? { id: stub, external: true } : null),
  }],
});
await bundle.write({ file: path.join(tmp, 'http.mjs'), format: 'esm' });

const { cachedGet, apiGet, apiPost, apiPut, apiDelete } = await import(path.join(tmp, 'http.mjs'));
const stubModule = await import(stub);
const { calls } = stubModule;

const DATA_CHANGED_EVENT = 'weeb:data-changed';
const storage = new Map([['weeb_auth_token', 'token-user-a']]);
globalThis.localStorage = { getItem: (k) => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, String(v)) };
let fired = 0;
globalThis.window = new EventTarget();
globalThis.CustomEvent = class extends Event {};
window.addEventListener(DATA_CHANGED_EVENT, () => { fired += 1; });

// 1. concurrent + repeat cachedGet share one request
const [a, b] = await Promise.all([
  cachedGet('/accounts', { per_page: 100 }),
  cachedGet('/accounts', { per_page: 100 }),
]);
assert.equal(calls.get, 1, 'concurrent cachedGet must share one request');
assert.deepEqual(a, b);
await cachedGet('/accounts', { per_page: 100 });
assert.equal(calls.get, 1, 'repeat cachedGet must hit the cache');

// 2. different params are separate entries
await cachedGet('/accounts', { per_page: 100, is_active: true });
assert.equal(calls.get, 2, 'different params must be a separate cache entry');

// 3. a mutation clears the cache BEFORE announcing, so a listener that refetches
//    inside its handler reads fresh data rather than the pre-mutation response
let clearedBeforeEvent = null;
window.addEventListener(DATA_CHANGED_EVENT, () => {
  clearedBeforeEvent = calls.get;
  cachedGet('/accounts', { per_page: 100 });
});
await apiPost('/transactions', { amount: 1 });
assert.equal(fired, 1, 'apiPost must announce exactly once');
assert.equal(calls.get, 3, 'listener refetch after a mutation must not read a stale cache');
assert.equal(clearedBeforeEvent, 2);

// 4. every mutation verb announces
await apiPut('/profile', {});
await apiDelete('/transactions/1');
assert.equal(fired, 3, 'put and delete must announce too');

// 5. plain apiGet stays uncached
const before = calls.get;
await apiGet('/dashboard');
await apiGet('/dashboard');
assert.equal(calls.get, before + 2, 'apiGet must not be cached');

// 6. a rejected cachedGet is evicted, so a retry actually retries
const client = stubModule.default;
const realGet = client.get;
client.get = async () => { throw new Error('boom'); };
await assert.rejects(() => cachedGet('/bills', {}));
client.get = realGet;
const afterFail = calls.get;
await cachedGet('/bills', {});
assert.equal(calls.get, afterFail + 1, 'a rejected cachedGet must be evicted so a retry refetches');

// 7. the cache is scoped to the auth token: a re-login never reuses the previous user's response
await cachedGet('/profile', {});
const beforeSwitch = calls.get;
await cachedGet('/profile', {});
assert.equal(calls.get, beforeSwitch, 'same user: cache hit');
storage.set('weeb_auth_token', 'token-user-b');
await cachedGet('/profile', {});
assert.equal(calls.get, beforeSwitch + 1, "another user must not be served the previous user's cached response");

await fs.rm(tmp, { recursive: true, force: true });
console.log('OK: api cache + mutation-refresh checks passed');
