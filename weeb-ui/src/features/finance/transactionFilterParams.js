import dayjs from 'dayjs';

const DATE_FORMAT = 'YYYY-MM-DD';

export const periodOptions = [
  { value: '', label: 'Semua periode' },
  { value: 'this_month', label: 'Bulan ini' },
  { value: 'last_month', label: 'Bulan lalu' },
  { value: 'last_7', label: '7 hari terakhir' },
  { value: 'last_30', label: '30 hari terakhir' },
  { value: 'custom', label: 'Rentang kustom' },
];

export const emptyFilters = {
  search: '',
  category_id: '',
  account_id: '',
  need_type: '',
  period: '',
  date_from: '',
  date_to: '',
};

/** Turns a period preset into a concrete date range. `today` is injectable for testing. */
export function resolvePeriodRange(period, custom = {}, today = undefined) {
  const now = dayjs(today);

  switch (period) {
    case 'this_month':
      return { date_from: now.startOf('month').format(DATE_FORMAT), date_to: now.endOf('month').format(DATE_FORMAT) };
    case 'last_month': {
      const previous = now.subtract(1, 'month');
      return { date_from: previous.startOf('month').format(DATE_FORMAT), date_to: previous.endOf('month').format(DATE_FORMAT) };
    }
    case 'last_7':
      return { date_from: now.subtract(6, 'day').format(DATE_FORMAT), date_to: now.format(DATE_FORMAT) };
    case 'last_30':
      return { date_from: now.subtract(29, 'day').format(DATE_FORMAT), date_to: now.format(DATE_FORMAT) };
    case 'custom':
      return { date_from: custom.date_from || '', date_to: custom.date_to || '' };
    default:
      return { date_from: '', date_to: '' };
  }
}

/** Only sends the filters that are actually set — the API ignores empty values anyway, but this keeps URLs readable. */
export function buildTransactionParams(filters, baseParams = {}, today = undefined) {
  const { date_from, date_to } = resolvePeriodRange(filters.period, filters, today);
  const params = { ...baseParams };
  const search = (filters.search || '').trim();

  if (search) params.search = search;
  if (filters.category_id) params.category_id = filters.category_id;
  if (filters.account_id) params.account_id = filters.account_id;
  if (filters.need_type) params.need_type = filters.need_type;
  if (date_from) params.date_from = date_from;
  if (date_to) params.date_to = date_to;

  return params;
}

export function countActiveFilters(filters, today = undefined) {
  const { date_from, date_to } = resolvePeriodRange(filters.period, filters, today);

  return [
    (filters.search || '').trim(),
    filters.category_id,
    filters.account_id,
    filters.need_type,
    date_from || date_to,
  ].filter(Boolean).length;
}
