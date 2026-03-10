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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

type ExtraExpenseDto = {
  id: string;
  date: string;
  category?: string | null;
  amount: number;
  method?: string | null;
  reference?: string | null;
  notes?: string | null;
};

const todayISO = () => {
  const t = new Date();
  const yyyy = t.getFullYear();
  const mm = String(t.getMonth() + 1).padStart(2, '0');
  const dd = String(t.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const formatMoney = (n: number) => `₹${Number(n || 0).toFixed(2)}`;

const safeIsoDate = (value?: string) => {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d;
};

const formatDate = (value?: string) => {
  const d = safeIsoDate(value);
  if (!d) return '—';
  try {
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
  } catch {
    return String(value || '—');
  }
};

export function ExtraExpensesPage() {
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
  const [rows, setRows] = useState<ExtraExpenseDto[]>([]);

  const [date, setDate] = useState(todayISO());
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!accessToken || !deviceId || !profileId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/extra-expenses`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Device-ID': deviceId,
          'X-Profile-ID': profileId,
        },
      });
      const data = await res.json().catch(() => []);
      if (!res.ok) throw new Error((data as any)?.error || 'Failed to load expenses');
      setRows(Array.isArray(data) ? (data as ExtraExpenseDto[]) : []);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load expenses');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, deviceId, profileId]);

  const totals = useMemo(() => {
    const all = rows.reduce((sum, r) => sum + Number(r.amount || 0), 0);

    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const monthTotal = rows.reduce((sum, r) => {
      const d = safeIsoDate(r.date);
      if (!d) return sum;
      if (d.getFullYear() === y && d.getMonth() === m) return sum + Number(r.amount || 0);
      return sum;
    }, 0);

    return { all, monthTotal };
  }, [rows]);

  const createExpense = async () => {
    if (!accessToken || !deviceId || !profileId) return;

    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    const d = String(date || '').trim();
    if (!d) {
      toast.error('Date is required');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/extra-expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          'X-Device-ID': deviceId,
          'X-Profile-ID': profileId,
        },
        body: JSON.stringify({
          date: d,
          category: String(category || '').trim() || null,
          amount: amt,
          method: String(method || '').trim() || null,
          reference: String(reference || '').trim() || null,
          notes: String(notes || '').trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any)?.error || 'Failed to save expense');

      toast.success('Expense added');
      setAmount('');
      setReference('');
      setNotes('');
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save expense');
    } finally {
      setSaving(false);
    }
  };

  const deleteExpense = async (id: string) => {
    if (!accessToken || !deviceId || !profileId) return;
    const ok = window.confirm('Delete this expense?');
    if (!ok) return;

    try {
      const res = await fetch(`${API_URL}/extra-expenses/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Device-ID': deviceId,
          'X-Profile-ID': profileId,
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any)?.error || 'Failed to delete expense');
      toast.success('Expense deleted');
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to delete expense');
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <TraceLoader label="Loading expenses..." />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Extra Expense</h1>
            <p className="text-muted-foreground mt-1">Add and track extra expenses like food, bonus, travel, etc.</p>
          </div>
          <Button variant="outline" onClick={() => void load()}>
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="border-b bg-muted/40">
                <CardTitle>Add Expense</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Date</Label>
                    <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                  </div>
                  <div>
                    <Label>Amount</Label>
                    <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" inputMode="decimal" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Category</Label>
                    <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Food / Bonus / Fuel..." />
                  </div>
                  <div>
                    <Label>Payment method</Label>
                    <Select value={method} onValueChange={setMethod}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                        <SelectItem value="online">Online</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Reference (optional)</Label>
                    <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="UTR / Cheque no" />
                  </div>
                  <div>
                    <Label>Notes (optional)</Label>
                    <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any details..." />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={createExpense} disabled={saving}>
                    {saving ? 'Saving...' : 'Add Expense'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b bg-muted/40">
                <CardTitle>Recent Expenses</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {rows.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground">No expenses yet.</div>
                ) : (
                  <div className="divide-y">
                    {rows.map((r) => (
                      <div key={r.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-foreground truncate">{r.category || 'Expense'}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatDate(r.date)}{r.method ? ` • ${r.method}` : ''}{r.reference ? ` • ${r.reference}` : ''}
                          </div>
                          {r.notes ? <div className="text-xs text-muted-foreground mt-1 truncate">{r.notes}</div> : null}
                        </div>
                        <div className="text-sm sm:text-right">
                          <div className="text-muted-foreground">Amount</div>
                          <div className="font-semibold text-foreground">{formatMoney(Number(r.amount || 0))}</div>
                        </div>
                        <div className="flex justify-end">
                          <Button variant="outline" size="sm" onClick={() => void deleteExpense(r.id)}>
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground">This month</div>
                <div className="text-2xl font-bold text-foreground mt-1">{formatMoney(totals.monthTotal)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground">All time</div>
                <div className="text-2xl font-bold text-foreground mt-1">{formatMoney(totals.all)}</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
