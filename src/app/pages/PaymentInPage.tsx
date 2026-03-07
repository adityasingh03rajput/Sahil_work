import { useEffect, useMemo, useState } from 'react';
import { AppLayout } from '../components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { API_URL } from '../config/api';
import { useAuth } from '../contexts/AuthContext';
import { TraceLoader } from '../components/TraceLoader';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

type OutstandingDoc = {
  documentId: string;
  documentNumber: string;
  customerName?: string;
  date?: string;
  total?: number;
  paidAmount?: number;
  remaining?: number;
  paymentStatus?: string;
};

const formatCurrency = (amount: number) => {
  const v = Number(amount || 0);
  return `₹${v.toFixed(2)}`;
};

export function PaymentInPage() {
  const { accessToken, deviceId } = useAuth();

  const profileId = useMemo(() => {
    try {
      const raw = localStorage.getItem('currentProfile');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const obj = typeof parsed === 'string' ? JSON.parse(parsed) : parsed;
      return obj?.id ? String(obj.id) : null;
    } catch {
      return null;
    }
  }, []);

  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState<OutstandingDoc[]>([]);
  const [search, setSearch] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<OutstandingDoc | null>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [reference, setReference] = useState('');
  const [saving, setSaving] = useState(false);

  const loadOutstanding = async () => {
    if (!accessToken || !deviceId || !profileId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/payments/outstanding`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Device-ID': deviceId,
          'X-Profile-ID': profileId,
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to load outstanding');
      const rows = Array.isArray(data?.documents) ? data.documents : [];
      setDocs(rows);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load outstanding');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOutstanding();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, deviceId, profileId]);

  const filtered = useMemo(() => {
    const q = String(search || '').trim().toLowerCase();
    if (!q) return docs;
    return docs.filter((d) => {
      const dn = String(d.documentNumber || '').toLowerCase();
      const cn = String(d.customerName || '').toLowerCase();
      return dn.includes(q) || cn.includes(q);
    });
  }, [docs, search]);

  const openFor = (d: OutstandingDoc) => {
    setSelected(d);
    setAmount(String(Math.max(0, Number(d.remaining || 0)).toFixed(2)));
    setMethod('cash');
    setReference('');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!accessToken || !deviceId || !profileId || !selected) return;

    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error('Enter a valid amount');
      return;
    }

    setSaving(true);
    try {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const date = `${yyyy}-${mm}-${dd}`;

      const res = await fetch(`${API_URL}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          'X-Device-ID': deviceId,
          'X-Profile-ID': profileId,
        },
        body: JSON.stringify({
          documentId: selected.documentId,
          amount: amt,
          date,
          method: method || null,
          reference: reference || null,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to save payment');

      toast.success('Payment recorded');
      setDialogOpen(false);
      setSelected(null);
      await loadOutstanding();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save payment');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <TraceLoader label="Loading payments..." />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Payment-In</h1>
            <p className="text-muted-foreground mt-1">Record payments received against outstanding invoices</p>
          </div>
          <Button variant="outline" onClick={() => void loadOutstanding()}>
            Refresh
          </Button>
        </div>

        <Card>
          <CardHeader className="border-b bg-muted/40">
            <CardTitle>Outstanding Invoices</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div className="sm:col-span-2">
                <Label>Search</Label>
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by invoice number or customer..." />
              </div>
              <div>
                <Label>Total Outstanding</Label>
                <div className="h-10 flex items-center font-semibold">
                  {formatCurrency(docs.reduce((sum, d) => sum + Number(d.remaining || 0), 0))}
                </div>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="text-sm text-muted-foreground">No outstanding invoices found.</div>
            ) : (
              <div className="divide-y rounded-md border">
                {filtered.map((d) => (
                  <div key={d.documentId} className="p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-foreground truncate">{d.documentNumber}</div>
                      <div className="text-xs text-muted-foreground truncate">{d.customerName || '—'}</div>
                    </div>
                    <div className="text-sm text-muted-foreground sm:text-right">
                      <div>Remaining</div>
                      <div className="font-semibold text-foreground">{formatCurrency(Number(d.remaining || 0))}</div>
                    </div>
                    <div className="flex justify-end">
                      <Button size="sm" onClick={() => openFor(d)}>
                        Add Payment
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Payment</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="rounded-md border p-3">
                <div className="text-sm font-semibold text-foreground">{selected?.documentNumber || '—'}</div>
                <div className="text-xs text-muted-foreground mt-1">Customer: {selected?.customerName || '—'}</div>
                <div className="text-xs text-muted-foreground">Remaining: {formatCurrency(Number(selected?.remaining || 0))}</div>
              </div>

              <div>
                <Label>Amount</Label>
                <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
              </div>

              <div>
                <Label>Method</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Reference (optional)</Label>
                <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="UTR / Cheque no / Note" />
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
