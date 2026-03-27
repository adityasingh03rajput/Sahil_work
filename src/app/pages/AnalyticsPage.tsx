import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  TrendingUp, 
  DollarSign, 
  FileText, 
  Users, 
  Calendar,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../config/api';
import { toast } from 'sonner';
import { TraceLoader } from '../components/TraceLoader';
import { AnalyticsPageSkeleton } from '../components/PageSkeleton';

function readAnalyticsCacheSync(key: string): any | null {
  try {
    const entry = localStorage.getItem(key);
    if (!entry) return null;
    const parsed = JSON.parse(entry);
    return parsed?.data ?? null;
  } catch { return null; }
}

export function AnalyticsPage() {
  const currentProfile = JSON.parse(localStorage.getItem('currentProfile') || '{}');
  const profileId = currentProfile?.id;
  const ANALYTICS_CACHE_KEY = profileId ? `cache:analytics:${profileId}` : '';
  const ANALYTICS_CACHE_TTL = 5 * 60 * 1000;

  const _initAnalytics = ANALYTICS_CACHE_KEY ? readAnalyticsCacheSync(ANALYTICS_CACHE_KEY) : null;
  const [analytics, setAnalytics] = useState<any>(_initAnalytics);
  const [loading, setLoading] = useState(!_initAnalytics);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [applyingRange, setApplyingRange] = useState(false);
  const { accessToken, deviceId } = useAuth();

  const apiUrl = API_URL;

  const writeAnalyticsCache = (data: any, sd: string, ed: string) => {
    // Only cache the default (no date range) view
    if (sd || ed || !ANALYTICS_CACHE_KEY) return;
    try {
      localStorage.setItem(ANALYTICS_CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
    } catch { /* ignore */ }
  };

  useEffect(() => {
    // Serve cache immediately, revalidate in background
    const cached = ANALYTICS_CACHE_KEY ? readAnalyticsCacheSync(ANALYTICS_CACHE_KEY) : null;
    if (cached) {
      setAnalytics(cached);
      setLoading(false);
      loadAnalytics(); // background revalidate
    } else {
      loadAnalytics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAnalytics = async (opts?: { startDate?: string; endDate?: string }) => {
    try {
      const sd = (opts?.startDate ?? startDate).trim();
      const ed = (opts?.endDate ?? endDate).trim();
      const params = new URLSearchParams();
      if (sd) params.set('startDate', sd);
      if (ed) params.set('endDate', ed);

      const url = params.toString() ? `${apiUrl}/analytics?${params.toString()}` : `${apiUrl}/analytics`;
      const response = await fetch(url, {
        headers: { 
          'Authorization': `Bearer ${accessToken}`, 
          'X-Device-ID': deviceId,
          'X-Profile-ID': profileId,
        },
      });
      const data = await response.json();
      if (data.error) {
        toast.error(data.error);
      } else {
        setAnalytics(data);
        writeAnalyticsCache(data, sd, ed);
      }
    } catch (error) {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const applyDateRange = async () => {
    setApplyingRange(true);
    setLoading(true);
    await loadAnalytics({ startDate, endDate });
    setApplyingRange(false);
  };

  const pad2 = (n: number) => String(n).padStart(2, '0');
  const formatDateInput = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

  const getPresetRange = (preset: 'today' | 'this_week' | 'this_month' | 'last_month') => {
    const today = new Date();
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    if (preset === 'today') {
      const start = new Date(end);
      return { startDate: formatDateInput(start), endDate: formatDateInput(end) };
    }

    if (preset === 'this_week') {
      // Monday as start of week
      const day = end.getDay(); // 0..6 (Sun..Sat)
      const diff = (day + 6) % 7; // days since Monday
      const start = new Date(end);
      start.setDate(end.getDate() - diff);
      return { startDate: formatDateInput(start), endDate: formatDateInput(end) };
    }

    if (preset === 'this_month') {
      const start = new Date(end.getFullYear(), end.getMonth(), 1);
      return { startDate: formatDateInput(start), endDate: formatDateInput(end) };
    }

    // last_month
    const start = new Date(end.getFullYear(), end.getMonth() - 1, 1);
    const lastDayPrevMonth = new Date(end.getFullYear(), end.getMonth(), 0);
    return { startDate: formatDateInput(start), endDate: formatDateInput(lastDayPrevMonth) };
  };

  const applyPreset = async (preset: 'today' | 'this_week' | 'this_month' | 'last_month') => {
    const range = getPresetRange(preset);
    setStartDate(range.startDate);
    setEndDate(range.endDate);

    setApplyingRange(true);
    setLoading(true);
    await loadAnalytics(range);
    setApplyingRange(false);
  };

  const downloadItemsCsv = () => {
    const rows: any[] = Array.isArray(analytics?.topItems) ? analytics.topItems : [];
    if (rows.length === 0) {
      toast.error('No rows to export');
      return;
    }

    const header = ['Item', 'Quantity', 'Revenue', 'Cost', 'Profit', 'AvgPerUnit'];
    const lines = [header.join(',')];
    rows.forEach((r) => {
      const qty = Number(r.quantity || 0);
      const revenue = Number(r.revenue || 0);
      const cost = Number(r.cost || 0);
      const profit = Number(r.profit || 0);
      const avg = qty > 0 ? revenue / qty : 0;

      const itemName = String(r.name ?? '').replace(/"/g, '""');
      lines.push([
        `"${itemName}"`,
        qty,
        revenue,
        cost,
        profit,
        Number(avg.toFixed(2)),
      ].join(','));
    });

    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const rangeSuffix = `${startDate || 'all'}_to_${endDate || 'all'}`;
    const filename = `item-wise-sales_${rangeSuffix}.csv`;

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

  // Removed top-level full-page component swap `if (loading) return <AnalyticsPageSkeleton />`
  // so the page never flickers and maintains its exact React structural identity instantly.

  // Prepare monthly revenue chart data
  const monthlyRevenueData = analytics?.monthlyRevenue 
    ? Object.entries(analytics.monthlyRevenue).map(([month, revenue]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
        revenue: revenue
      }))
    : [];

  // Prepare top items pie chart data
  const topItemsData = analytics?.topItems?.slice(0, 5).map((item: any) => ({
    name: item.name,
    value: item.revenue
  })) || [];

  return (
    <>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
              <p className="text-muted-foreground mt-1">Business insights and performance metrics</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 w-full sm:w-auto">
              <div>
                <div className="text-xs text-muted-foreground mb-1">From</div>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
                />
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">To</div>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
                />
              </div>
              <div className="flex sm:justify-end">
                <button
                  type="button"
                  disabled={loading}
                  onClick={applyDateRange}
                  className="h-10 px-4 rounded-md bg-primary text-primary-foreground font-semibold disabled:opacity-50"
                >
                  {loading ? 'Loading...' : 'Apply'}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => applyPreset('today')}
                disabled={applyingRange}
                className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground hover:bg-muted disabled:opacity-60"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => applyPreset('this_week')}
                disabled={applyingRange}
                className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground hover:bg-muted disabled:opacity-60"
              >
                This week
              </button>
              <button
                type="button"
                onClick={() => applyPreset('this_month')}
                disabled={applyingRange}
                className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground hover:bg-muted disabled:opacity-60"
              >
                This month
              </button>
              <button
                type="button"
                onClick={() => applyPreset('last_month')}
                disabled={applyingRange}
                className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground hover:bg-muted disabled:opacity-60"
              >
                Last month
              </button>
            </div>

            <div className="sm:ml-auto">
              <button
                type="button"
                onClick={downloadItemsCsv}
                className="h-9 w-full sm:w-auto rounded-md border border-border bg-background px-3 text-sm text-foreground hover:bg-muted"
              >
                Download CSV
              </button>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription>Total Revenue</CardDescription>
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {formatCurrency(analytics?.totalSales || 0)}
              </div>
              <div className="flex items-center gap-1 mt-2 text-sm text-green-600">
                <ArrowUp className="h-4 w-4" />
                <span>All time sales</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription>Outstanding</CardDescription>
                <FileText className="h-5 w-5 text-orange-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {formatCurrency(analytics?.outstanding || 0)}
              </div>
              <div className="flex items-center gap-1 mt-2 text-sm text-orange-600">
                <span>{analytics?.unpaidInvoices || 0} unpaid invoices</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription>Total Invoices</CardDescription>
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {analytics?.totalInvoices || 0}
              </div>
              <div className="flex items-center gap-1 mt-2 text-sm text-blue-600">
                <span>{analytics?.paidInvoices || 0} paid</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription>Conversion Rate</CardDescription>
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {analytics?.conversionRate || 0}%
              </div>
              <div className="flex items-center gap-1 mt-2 text-sm text-green-600">
                <span>Quote to Invoice</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Monthly Revenue Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Revenue Trend</CardTitle>
              <CardDescription>Revenue breakdown by month</CardDescription>
            </CardHeader>
            <CardContent>
              {monthlyRevenueData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={monthlyRevenueData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(value: any) => formatCurrency(value)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      name="Revenue"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Calendar className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                    <p>No revenue data yet</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Items Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Top Items by Revenue</CardTitle>
              <CardDescription>Best performing products/services</CardDescription>
            </CardHeader>
            <CardContent>
              {topItemsData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={topItemsData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={90}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {topItemsData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => formatCurrency(value)} />
                    <Legend
                      layout="vertical"
                      align="right"
                      verticalAlign="middle"
                      iconType="circle"
                      iconSize={8}
                      formatter={(value) => (
                        <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>
                          {String(value).length > 14 ? String(value).slice(0, 14) + '…' : value}
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <FileText className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                    <p>No sales data yet</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Items Table */}
        <Card>
          <CardHeader>
            <CardTitle>Item-wise Sales</CardTitle>
            <CardDescription>
              Revenue, cost and profit per item{startDate || endDate ? ' (filtered)' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {analytics?.topItems && analytics.topItems.length > 0 ? (
              <div className="w-full overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b">
                      <th className="py-2 pr-3 min-w-[220px]">Item</th>
                      <th className="py-2 pr-3 text-right min-w-[90px]">Qty</th>
                      <th className="py-2 pr-3 text-right min-w-[140px]">Revenue</th>
                      <th className="py-2 pr-3 text-right min-w-[140px]">Cost</th>
                      <th className="py-2 pr-3 text-right min-w-[140px]">Profit</th>
                      <th className="py-2 text-right min-w-[120px]">Avg/Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.topItems.map((row: any, index: number) => {
                      const qty = Number(row.quantity || 0);
                      const revenue = Number(row.revenue || 0);
                      const cost = Number(row.cost || 0);
                      const profit = Number(row.profit || 0);
                      const avg = qty > 0 ? revenue / qty : 0;

                      return (
                        <tr key={`${row.name}-${index}`} className="border-b last:border-b-0">
                          <td className="py-3 pr-3">
                            <div className="font-medium text-foreground">{row.name}</div>
                          </td>
                          <td className="py-3 pr-3 text-right tabular-nums">{qty}</td>
                          <td className="py-3 pr-3 text-right tabular-nums text-blue-600 font-semibold">
                            {formatCurrency(revenue)}
                          </td>
                          <td className="py-3 pr-3 text-right tabular-nums">
                            {formatCurrency(cost)}
                          </td>
                          <td className={`py-3 pr-3 text-right tabular-nums font-semibold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(profit)}
                          </td>
                          <td className="py-3 text-right tabular-nums">
                            ₹{avg.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <p>No sales data available</p>
                <p className="text-sm mt-1">Create and mark invoices as paid to see analytics</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Document Statistics */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Document Statistics</CardTitle>
            <CardDescription>Overview of all business documents</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-700 mb-1">Total Quotations</p>
                <p className="text-3xl font-bold text-green-900">{analytics?.totalQuotations || 0}</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700 mb-1">Total Invoices</p>
                <p className="text-3xl font-bold text-blue-900">{analytics?.totalInvoices || 0}</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-700 mb-1">Paid Invoices</p>
                <p className="text-3xl font-bold text-green-900">{analytics?.paidInvoices || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
