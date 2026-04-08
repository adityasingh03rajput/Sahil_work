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
import { TraceLoader } from '../components/TraceLoader';
import { GenericPageSkeleton } from '../components/PageSkeleton';
import { useCurrentProfile } from '../hooks/useCurrentProfile';
import { getCurrentFiscalYearRange } from '../utils/fiscal';
import { DateRangePicker, DateRange } from '../components/ui/date-range-picker';
import { toast } from 'sonner';
import { FeatureInfo } from '../components/FeatureInfo';
import { saveCsvWithDialog } from '../utils/saveFile';

export function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>({ from: '', to: '' });
  const [applyingRange, setApplyingRange] = useState(false);
  const { accessToken, deviceId } = useAuth();
  const { profileId } = useCurrentProfile();

  const apiUrl = API_URL;

  // Reset all state when profile switches to prevent data bleed
  useEffect(() => {
    setAnalytics(null);
    setLoading(true);
    // Note: We deliberately DON'T reset dateRange here because user wants it remembered 
    // even after profile switches or logouts.
  }, [profileId]);

  useEffect(() => {
    if (profileId) loadAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId, accessToken]);

  const loadAnalytics = async (range?: DateRange) => {
    if (!accessToken || !profileId) return;
    setLoading(true);
    try {
      const r = range || dateRange;
      const sd = (r.from || '').trim();
      const ed = (r.to || '').trim();
      const params = new URLSearchParams();
      if (sd) params.set('from', sd);
      if (ed) params.set('to', ed);

      const url = params.toString() ? `${apiUrl}/analytics?${params.toString()}` : `${apiUrl}/analytics`;
      const response = await fetch(url, {
        headers: { 
          'Authorization': `Bearer ${accessToken}`, 
          'X-Device-ID': deviceId,
          'X-Profile-ID': profileId,
          'Cache-Control': 'no-cache',
        },
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        toast.error(err?.error || `Failed to load analytics (${response.status})`);
        return;
      }
      const data = await response.json();
      if (data.error) {
        toast.error(data.error);
      } else {
        setAnalytics(data);
      }
    } catch {
      toast.error('Failed to load analytics — check your connection');
    } finally {
      setLoading(false);
    }
  };

  const applyDateRange = async (newRange: DateRange) => {
    setDateRange(newRange);
    setLoading(true);
    await loadAnalytics(newRange);
  };

  // Removed legacy preset logic, handled by DateRangePicker internally


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
    const rangeSuffix = `${dateRange.from || 'all'}_to_${dateRange.to || 'all'}`;
    const filename = `item-wise-sales_${rangeSuffix}.csv`;

    void saveCsvWithDialog(csv, filename);
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
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
                <FeatureInfo 
                  title="Business Analytics"
                  steps={[
                    "Summary cards fetch data from Finalized documents only (Sales & Purchase).",
                    "Use the Date Filter to see trends over a specific fiscal range.",
                    "Conversion Rate = (Total Invoices / Total Quotations) * 100.",
                    "Item-wise profit is calculated as (Revenue - Total Item Purchase Cost)."
                  ]}
                />
              </div>
              <p className="text-muted-foreground mt-1">Business insights and performance metrics</p>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
              <DateRangePicker range={dateRange} onRangeChange={applyDateRange} persistenceKey="analytics" />
              <button
                type="button"
                onClick={downloadItemsCsv}
                className="h-9 w-full sm:w-auto px-4 rounded-md border border-border bg-background text-sm text-foreground hover:bg-muted font-medium"
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
                <DollarSign className="h-5 w-5 text-secondary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {formatCurrency(analytics?.totalSales || 0)}
              </div>
              <div className="flex items-center gap-1 mt-2 text-sm text-secondary">
                <ArrowUp className="h-4 w-4" />
                <span>All time sales</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription>Outstanding</CardDescription>
                <FileText className="h-5 w-5 text-orange-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {formatCurrency(analytics?.outstanding || 0)}
              </div>
              <div className="flex items-center gap-1 mt-2 text-sm text-orange-500">
                <span>{analytics?.unpaidInvoices || 0} unpaid invoices</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription>Total Invoices</CardDescription>
                <FileText className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {analytics?.totalInvoices || 0}
              </div>
              <div className="flex items-center gap-1 mt-2 text-sm text-primary">
                <span>{analytics?.paidInvoices || 0} paid</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription>Conversion Rate</CardDescription>
                <TrendingUp className="h-5 w-5 text-secondary" />
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
                      stroke="var(--primary)"
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
              Revenue, cost and profit per item{dateRange.from || dateRange.to ? ' (filtered)' : ''}
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
                          <td className="py-3 pr-3 text-right tabular-nums text-primary font-semibold">
                            {formatCurrency(revenue)}
                          </td>
                          <td className="py-3 pr-3 text-right tabular-nums">
                            {formatCurrency(cost)}
                          </td>
                          <td className={`py-3 pr-3 text-right tabular-nums font-semibold ${profit >= 0 ? 'text-secondary' : 'text-destructive'}`}>
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
              <div className="text-center p-4 bg-muted/30 border border-border rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Total Quotations</p>
                <p className="text-3xl font-bold text-foreground">{analytics?.totalQuotations || 0}</p>
              </div>
              <div className="text-center p-4 bg-primary/10 border border-primary/20 rounded-lg">
                <p className="text-sm text-primary mb-1">Total Invoices</p>
                <p className="text-3xl font-bold text-primary">{analytics?.totalInvoices || 0}</p>
              </div>
              <div className="text-center p-4 bg-secondary/10 border border-secondary/20 rounded-lg">
                <p className="text-sm text-secondary mb-1">Paid Invoices</p>
                <p className="text-3xl font-bold text-secondary">{analytics?.paidInvoices || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
