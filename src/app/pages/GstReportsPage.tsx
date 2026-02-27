import { useEffect, useMemo, useState } from 'react';
import { AppLayout } from '../components/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../config/api';
import { toast } from 'sonner';

type GstReport = {
  range: { from: string | null; to: string | null };
  summary: {
    totalInvoices: number;
    taxableValue: number;
    totalCgst: number;
    totalSgst: number;
    totalIgst: number;
    totalTax: number;
  };
  hsnSummary: Array<{ hsnSac: string; taxableValue: number; cgst: number; sgst: number; igst: number }>;
  outward: Array<{
    id: string;
    documentNumber: string;
    date: string;
    customerName: string;
    subtotal: number;
    totalCgst: number;
    totalSgst: number;
    totalIgst: number;
    grandTotal: number;
  }>;
};

function todayStr() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function monthStartStr() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}-01`;
}

export function GstReportsPage() {
  const { accessToken, deviceId } = useAuth();
  const apiUrl = API_URL;
  const currentProfile = JSON.parse(localStorage.getItem('currentProfile') || '{}');
  const profileId = currentProfile?.id;

  const [from, setFrom] = useState(monthStartStr());
  const [to, setTo] = useState(todayStr());
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<GstReport | null>(null);

  const fmt = useMemo(() => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
  }, []);

  const load = async () => {
    if (!accessToken) return;
    if (!profileId) {
      toast.error('Select a business profile first');
      return;
    }

    setLoading(true);
    try {
      const url = new URL(`${apiUrl}/reports/gst`);
      if (from) url.searchParams.set('from', from);
      if (to) url.searchParams.set('to', to);

      const res = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Device-ID': deviceId,
          'X-Profile-ID': profileId,
        },
      });

      const data = await res.json();
      if (data?.error) throw new Error(data.error);
      setReport(data);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load GST report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">GST Reports</h1>
            <p className="text-muted-foreground mt-1">Basic GST and HSN summary from invoices</p>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Date Range</CardTitle>
            <CardDescription>Filter invoices by date (YYYY-MM-DD)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4 items-end">
              <div>
                <Label>From</Label>
                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div>
                <Label>To</Label>
                <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
              <div>
                <Button onClick={load} disabled={loading} className="w-full">
                  {loading ? 'Loading…' : 'Apply'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Invoices</CardDescription>
              <CardTitle className="text-2xl">{report?.summary?.totalInvoices ?? 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Taxable Value</CardDescription>
              <CardTitle className="text-2xl">{fmt.format(report?.summary?.taxableValue ?? 0)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Tax</CardDescription>
              <CardTitle className="text-2xl">{fmt.format(report?.summary?.totalTax ?? 0)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>IGST</CardDescription>
              <CardTitle className="text-2xl">{fmt.format(report?.summary?.totalIgst ?? 0)}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>HSN/SAC Summary</CardTitle>
              <CardDescription>Tax break-up aggregated by HSN/SAC from invoice items</CardDescription>
            </CardHeader>
            <CardContent>
              {!report || report.hsnSummary.length === 0 ? (
                <div className="text-sm text-muted-foreground">No data</div>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <div className="grid grid-cols-5 bg-muted text-xs font-semibold text-muted-foreground px-4 py-2">
                    <div>HSN</div>
                    <div className="text-right">Taxable</div>
                    <div className="text-right">CGST</div>
                    <div className="text-right">SGST</div>
                    <div className="text-right">IGST</div>
                  </div>
                  {report.hsnSummary.map((r) => (
                    <div key={r.hsnSac} className="grid grid-cols-5 px-4 py-3 border-t text-sm">
                      <div className="font-medium text-foreground truncate">{r.hsnSac}</div>
                      <div className="text-right">{fmt.format(r.taxableValue)}</div>
                      <div className="text-right">{fmt.format(r.cgst)}</div>
                      <div className="text-right">{fmt.format(r.sgst)}</div>
                      <div className="text-right">{fmt.format(r.igst)}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Outward Supplies</CardTitle>
              <CardDescription>Invoice list with tax totals</CardDescription>
            </CardHeader>
            <CardContent>
              {!report || report.outward.length === 0 ? (
                <div className="text-sm text-muted-foreground">No invoices in range</div>
              ) : (
                <div className="space-y-3">
                  {report.outward.slice(0, 20).map((inv) => (
                    <div key={inv.id} className="rounded-md border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-foreground">{inv.documentNumber}</div>
                          <div className="text-xs text-muted-foreground mt-1">{inv.customerName} • {inv.date}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold">{fmt.format(inv.grandTotal)}</div>
                          <div className="text-xs text-muted-foreground">Tax: {fmt.format(inv.totalCgst + inv.totalSgst + inv.totalIgst)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {report.outward.length > 20 && (
                    <div className="text-xs text-muted-foreground">Showing first 20 invoices</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
