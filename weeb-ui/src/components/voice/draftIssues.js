/** What stops a draft from being saved (`blocking`) and what is merely worth a second look. */
export function getDraftIssues(draft) {
  const blocking = [];
  const advisory = [];

  if (!(Number(draft.amount) > 0)) blocking.push('Nominal belum diisi');
  if (!draft.account_id) blocking.push('Rekening belum dipilih');
  if (!draft.transaction_date) blocking.push('Tanggal belum diisi');
  if (!draft.category_id) advisory.push('Belum ada kategori');
  if (draft.confidence === 'low') advisory.push('AI kurang yakin, mohon dicek');

  return { blocking, advisory };
}
