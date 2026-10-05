import dayjs from 'dayjs';
import { resolvePeriodRange } from '../finance/transactionFilterParams';

const DATE_FORMAT = 'YYYY-MM-DD';

export const RANGES = [
  { value: 'payday', label: 'Gajian' },
  { value: '7d', label: '7H' },
  { value: '30d', label: '30H' },
  { value: '90d', label: '90H' },
];

export const RANGE_DAYS = { '7d': 7, '30d': 30, '90d': 90 };

/** The default range is the running payday cycle: the latest payday set in /profile up to today. */
export function resolveRange(key, paydayDay) {
  const today = dayjs();
  const end = today.format(DATE_FORMAT);

  if (key === 'payday') {
    return { start: resolvePeriodRange('payday', {}, undefined, paydayDay).date_from, end };
  }

  return { start: today.subtract(RANGE_DAYS[key] - 1, 'day').format(DATE_FORMAT), end };
}

/** Parsed by hand: new Date('YYYY-MM-DD') is UTC and can land on the previous day. */
function asLocalDate(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export const shortDate = (value) => asLocalDate(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
export const longDate = (value) => asLocalDate(value).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

/**
 * Turns the daily flow into chart points.
 *
 * Income and expense accumulate across the range, so all three lines live on one scale and the
 * balance is always "what was there, plus what came in, minus what went out". The balance is
 * anchored to the real figure today and walked backwards, so the line ends on the headline.
 */
export function buildPoints(series, currentBalance) {
  let income = 0;
  let expense = 0;
  const net = series.reduce((sum, day) => sum + Number(day.total_income || 0) - Number(day.total_expense || 0), 0);
  let balance = currentBalance - net;
  const openingBalance = balance;

  const points = series.map((day) => {
    income += Number(day.total_income || 0);
    expense += Number(day.total_expense || 0);
    balance += Number(day.total_income || 0) - Number(day.total_expense || 0);

    return { date: day.period, label: shortDate(day.period), balance, income, expense };
  });

  return { points, income, expense, net, openingBalance };
}
