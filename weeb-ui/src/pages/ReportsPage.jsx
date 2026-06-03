import { useEffect, useState } from 'react';
import { Pie, PieChart, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import LoadingSkeleton from '../components/feedback/LoadingSkeleton';
import ErrorState from '../components/feedback/ErrorState';
import EmptyState from '../components/feedback/EmptyState';
import { apiGet } from '../api/http';
import { formatCurrency } from '../lib/formatters';

const colors = ['#08a0ff', '#FBBF24', '#34D399', '#07A0FF', '#FDE68A', '#6EE7B7'];

export default function ReportsPage() {
  const [report, setReport] = useState(null);
  const [breakdown, setBreakdown] = useState([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    queueMicrotask(async () => {
      try {
        const [monthly, category] = await Promise.all([
          apiGet('/reports/monthly/current'),
          apiGet('/reports/category-breakdown'),
        ]);
        setReport(monthly.data);
        setBreakdown(category.data || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Laporan belum bisa dimuat.');
      } finally {
        setLoading(false);
      }
    });
  }, []);

  if (isLoading) return <LoadingSkeleton rows={5} />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-text-title">Laporan Bulanan</h1>
        <p className="mt-2 text-text-muted">Lihat ringkasan pemasukan, pengeluaran, tabungan, dan kategori terbesar bulan ini.</p>
      </header>
      <div className="grid gap-4 md:grid-cols-4">
        {[
          ['Pemasukan', report?.total_income],
          ['Pengeluaran', report?.total_expense],
          ['Tabungan', report?.total_saving],
          ['Sisa', report?.remaining_amount],
        ].map(([label, value]) => (
          <Card key={label}><CardContent><p className="text-sm text-text-muted">{label}</p><p className="mt-2 text-2xl font-semibold text-text-title">{formatCurrency(value)}</p></CardContent></Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Breakdown Kategori</CardTitle>
          <CardDescription>Kategori pengeluaran terbesar bulan ini.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-[0.8fr_1fr]">
          {breakdown.length === 0 ? <EmptyState title="Belum ada pengeluaran" description="Catat pengeluaran agar laporan kategori muncul." /> : (
            <>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie dataKey="total" data={breakdown} nameKey="category_name" innerRadius={60} outerRadius={100} paddingAngle={3}>
                      {breakdown.map((_, index) => <Cell key={index} fill={colors[index % colors.length]} />)}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatCurrency(value)}
                      contentStyle={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 14, color: '#374151', boxShadow: '0 12px 30px rgba(15,23,42,.12)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                {breakdown.map((item, index) => (
                  <div key={item.category_id || item.category_name} className="flex items-center justify-between rounded-xl bg-surface-200/40 p-3">
                    <div className="flex items-center gap-3"><span className="h-3 w-3 rounded-full" style={{ background: colors[index % colors.length] }} />{item.category_name}</div>
                    <span className="font-semibold text-text-title">{formatCurrency(item.total)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
