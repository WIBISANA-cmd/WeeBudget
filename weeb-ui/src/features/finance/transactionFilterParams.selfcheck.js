// Run: node src/features/finance/transactionFilterParams.selfcheck.js
import assert from 'node:assert/strict';
import { buildTransactionParams, countActiveFilters, emptyFilters, resolvePeriodRange } from './transactionFilterParams.js';

const today = '2026-03-14';

assert.deepEqual(resolvePeriodRange('', {}, today), { date_from: '', date_to: '' });
assert.deepEqual(resolvePeriodRange('this_month', {}, today), { date_from: '2026-03-01', date_to: '2026-03-31' });
assert.deepEqual(resolvePeriodRange('last_month', {}, today), { date_from: '2026-02-01', date_to: '2026-02-28' });
assert.deepEqual(resolvePeriodRange('last_7', {}, today), { date_from: '2026-03-08', date_to: '2026-03-14' });
assert.deepEqual(resolvePeriodRange('last_30', {}, today), { date_from: '2026-02-13', date_to: '2026-03-14' });
assert.deepEqual(
  resolvePeriodRange('custom', { date_from: '2026-01-05', date_to: '2026-01-09' }, today),
  { date_from: '2026-01-05', date_to: '2026-01-09' },
);

// Month-end arithmetic must not roll over: 31 Mar - 1 month is Feb, not Mar 3.
assert.deepEqual(resolvePeriodRange('last_month', {}, '2026-03-31'), { date_from: '2026-02-01', date_to: '2026-02-28' });

// Empty filters send nothing but the base params.
assert.deepEqual(buildTransactionParams(emptyFilters, { per_page: 30 }, today), { per_page: 30 });

assert.deepEqual(
  buildTransactionParams({ ...emptyFilters, search: '  kopi  ', category_id: 4, period: 'this_month' }, { per_page: 30 }, today),
  { per_page: 30, search: 'kopi', category_id: 4, date_from: '2026-03-01', date_to: '2026-03-31' },
);

// A custom period with no dates picked yet is not an active filter.
assert.equal(countActiveFilters(emptyFilters, today), 0);
assert.equal(countActiveFilters({ ...emptyFilters, period: 'custom' }, today), 0);
assert.equal(countActiveFilters({ ...emptyFilters, period: 'last_7', account_id: 2, search: ' ' }, today), 2);

console.log('transactionFilterParams selfcheck OK');
