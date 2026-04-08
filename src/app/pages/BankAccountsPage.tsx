import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { TraceLoader } from '../components/TraceLoader';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../config/api';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, RefreshCw } from 'lucide-react';
import { MobileFormSheet, MobileFormSection, MobileFormActions } from '../components/MobileFormSheet';
import { FeatureInfo } from '../components/FeatureInfo';
import { useCurrentProfile } from '../hooks/useCurrentProfile';

function formatInr(amount: number) {
  const val = Number(amount || 0);
  return `₹${val.toFixed(2)}`;
}

const EMPTY_FORM = { label: '', bankName: '', bankBranch: '', accountNumber: '', ifscCode: '', upiId: '', upiQrText: '', isDefault: false };

export function BankAccountsPage() {
  const navigate = useNavigate();
  const { accessToken, deviceId } = useAuth();
  const apiUrl = API_URL;

  const today = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const { profile: currentProfile } = useCurrentProfile();
  const accounts: any[] = Array.isArray(currentProfile?.bankAccounts) ? currentProfile.bankAccounts : [];

  const legacy = useMemo(() => {
    const bankName = String(currentProfile?.bankName || '').trim();
    const bankBranch = String(currentProfile?.bankBranch || '').trim();
    const accountNumber = String(currentProfile?.accountNumber || '').trim();
    const ifscCode = String(currentProfile?.ifscCode || '').trim();
    const upiId = String(currentProfile?.upiId || '').trim();
    const hasLegacy = !!(bankName || bankBranch || accountNumber || ifscCode || upiId);
    return { hasLegacy, label: bankName || 'Primary Bank', bankName, bankBranch, accountNumber, ifscCode, upiId, upiQrText: '' };
  }, [currentProfile]);

  const defaultId = String(currentProfile?.defaultBankAccountId || '').trim();
  const fallbackDefault = accounts.find((a: any) => a?.isDefault && a?._id) || null;
  const resolvedDefaultId = defaultId || String(fallbackDefault?._id || '').trim();

  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>('');
  
  // Initialize selection when profile loads or switches
  useEffect(() => {
    if (resolvedDefaultId || legacy.hasLegacy) {
      setSelectedBankAccountId(resolvedDefaultId || "__null__");
    } else {
      setSelectedBankAccountId("");
    }
  }, [currentProfile?.id, resolvedDefaultId, legacy.hasLegacy]);
  const [loading, setLoading] = useState(false);
  const [payments, setPayments] = useState<any[]>([]);
  const [manualCredits, setManualCredits] = useState<any[]>([]);

  const [manualDate, setManualDate] = useState<string>(today);
  const [manualAmount, setManualAmount] = useState<string>('');
  const [manualDescription, setManualDescription] = useState<string>('');
  const [savingManual, setSavingManual] = useState(false);

  // ── Add / Edit bank account dialog ────────────────────────────────────────
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null); // null = add new
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [savingAccount, setSavingAccount] = useState(false);

  const openAdd = () => { setEditIndex(null); setForm({ ...EMPTY_FORM }); setDialogOpen(true); };
  const openEdit = (idx: number) => {
    const a = accounts[idx];
    setEditIndex(idx);
    setForm({
      label: String(a?.label || ''),
      bankName: String(a?.bankName || ''),
      bankBranch: String(a?.bankBranch || ''),
      accountNumber: String(a?.accountNumber || ''),
      ifscCode: String(a?.ifscCode || ''),
      upiId: String(a?.upiId || ''),
      upiQrText: String(a?.upiQrText || ''),
      isDefault: !!a?.isDefault,
    });
    setDialogOpen(true);
  };

  const saveAccount = async () => {
    const profileId = String(currentProfile?.id || '').trim();
    if (!profileId || !accessToken || !deviceId) { toast.error('No profile selected'); return; }
    if (!form.bankName.trim() && !form.accountNumber.trim() && !form.label.trim()) {
      toast.error('Enter at least a bank name or account number');
      return;
    }
    setSavingAccount(true);
    try {
      const next = [...accounts];
      const entry: any = {
        ...(editIndex !== null ? (next[editIndex] || {}) : {}),
        label: form.label.trim() || undefined,
        bankName: form.bankName.trim() || undefined,
        bankBranch: form.bankBranch.trim() || undefined,
        accountNumber: form.accountNumber.trim() || undefined,
        ifscCode: form.ifscCode.trim() || undefined,
        upiId: form.upiId.trim() || undefined,
        upiQrText: form.upiQrText.trim() || undefined,
        isDefault: form.isDefault,
      };
      if (form.isDefault) next.forEach((a) => { a.isDefault = false; });
      if (editIndex !== null) { next[editIndex] = entry; } else { next.push(entry); }

      const res = await fetch(`${apiUrl}/profiles/${profileId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}`, 'X-Device-ID': deviceId, 'X-Profile-ID': profileId },
        body: JSON.stringify({ bankAccounts: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to save');

      // Update localStorage so the page reflects immediately
      const updated = { ...currentProfile, bankAccounts: data.bankAccounts ?? next };
      localStorage.setItem('currentProfile', JSON.stringify(updated));
      // Notify other tabs and components that profile changed
      window.dispatchEvent(new CustomEvent('profileRefreshed', { detail: updated }));
      setDialogOpen(false);
      toast.success(editIndex !== null ? 'Bank account updated' : 'Bank account added');
    } catch (e: any) { toast.error(e.message || 'Failed to save bank account'); }
    finally { setSavingAccount(false); }
  };

  const deleteAccount = async (idx: number) => {
    const profileId = String(currentProfile?.id || '').trim();
    if (!profileId || !accessToken || !deviceId) return;
    const next = accounts.filter((_, i) => i !== idx);
    try {
      const res = await fetch(`${apiUrl}/profiles/${profileId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}`, 'X-Device-ID': deviceId, 'X-Profile-ID': profileId },
        body: JSON.stringify({ bankAccounts: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to delete');
      const updated = { ...currentProfile, bankAccounts: data.bankAccounts ?? next };
      localStorage.setItem('currentProfile', JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('profileRefreshed', { detail: updated }));
      toast.success('Bank account removed');
    } catch (e: any) { toast.error(e.message || 'Failed to remove'); }
  };

  const loadTransactions = async () => {
    if (!accessToken || !deviceId) return;
    const profileId = String(currentProfile?.id || '').trim();
    if (!profileId) return;
    const bankAccountId = String(selectedBankAccountId || '').trim();
    if (!bankAccountId) {
      setPayments([]);
      setManualCredits([]);
      return;
    }

    setLoading(true);
    
    // Separate fetch for payments to avoid blocking bank transactions on failure
    try {
      const payRes = await fetch(`${apiUrl}/payments?bankAccountId=${encodeURIComponent(bankAccountId)}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Device-ID': deviceId,
          'X-Profile-ID': profileId,
        },
      });
      const payData = await payRes.json().catch(() => []);
      if (payRes.ok) setPayments(Array.isArray(payData) ? payData : []);
    } catch {
      setPayments([]);
    }

    // Separate fetch for manual credits (bank transactions)
    try {
      const manualRes = await fetch(`${apiUrl}/bank-transactions?bankAccountId=${encodeURIComponent(bankAccountId)}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Device-ID': deviceId,
          'X-Profile-ID': profileId,
        },
      });
      const manualData = await manualRes.json().catch(() => []);
      if (manualRes.ok) setManualCredits(Array.isArray(manualData) ? manualData : []);
    } catch {
      setManualCredits([]);
    }

    setLoading(false);
  };

  useEffect(() => {
    void loadTransactions();
  }, [accessToken, apiUrl, currentProfile?.id, deviceId, selectedBankAccountId]);

  const handleAddManualCredit = async () => {
    if (!accessToken || !deviceId) return;
    const profileId = String(currentProfile?.id || '').trim();
    if (!profileId) return;
    const bankAccountId = String(selectedBankAccountId || '').trim();
    if (!bankAccountId) return;

    const amount = Number(manualAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    if (!String(manualDate || '').trim()) return;

    setSavingManual(true);
    try {
      const res = await fetch(`${apiUrl}/bank-transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          'X-Device-ID': deviceId,
          'X-Profile-ID': profileId,
        },
        body: JSON.stringify({
          bankAccountId,
          date: manualDate,
          amount,
          description: String(manualDescription || '').trim() || null,
          currency: 'INR',
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Failed to add manual credit');

      setManualAmount('');
      setManualDescription('');

      // Refresh manual list (and keep payments as is)
      const refreshed = await fetch(`${apiUrl}/bank-transactions?bankAccountId=${encodeURIComponent(bankAccountId)}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Device-ID': deviceId,
          'X-Profile-ID': profileId,
        },
      });
      const refreshedData = await refreshed.json().catch(() => []);
      if (refreshed.ok) setManualCredits(Array.isArray(refreshedData) ? refreshedData : []);
    } catch {
      // ignore
    } finally {
      setSavingManual(false);
    }
  };

  const selectedAccount = useMemo(() => {
    const id = String(selectedBankAccountId || '').trim();
    if (!id) return null;
    if (id === '__null__') return legacy;
    return accounts.find((a: any) => String(a?._id || '') === id) || null;
  }, [accounts, legacy, selectedBankAccountId]);

  const unified = useMemo(() => {
    const payRows = (payments || []).map((p: any) => ({
      id: `payment:${String(p?.id || p?._id)}`,
      date: String(p?.date || ''),
      kind: 'payment' as const,
      method: String(p?.method || ''),
      details:
        String(p?.reference || '').trim() ||
        String(p?.notes || '').trim() ||
        (p?.documentId ? `Document: ${String(p.documentId)}` : ''),
      amount: Number(p?.amount || 0),
      createdAt: p?.createdAt,
    }));

    const manualRows = (manualCredits || []).map((t: any) => ({
      id: `manual:${String(t?.id || t?._id)}`,
      date: String(t?.date || ''),
      kind: 'manual_credit' as const,
      method: 'Manual Credit',
      details: String(t?.description || '').trim(),
      amount: Number(t?.amount || 0),
      createdAt: t?.createdAt,
    }));

    const all = [...manualRows, ...payRows];
    all.sort((a, b) => {
      const ad = String(a.date || '');
      const bd = String(b.date || '');
      if (ad !== bd) return bd.localeCompare(ad);
      return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
    });
    return all;
  }, [manualCredits, payments]);

  const totals = useMemo(() => {
    const sum = (unified || []).reduce((s, r) => s + (Number(r?.amount) || 0), 0);
    return { totalAmount: sum, count: (unified || []).length };
  }, [unified]);

  return (
    <>
      <div className="space-y-4 pb-48 md:pb-10">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="text-xl font-semibold">Bank Accounts</div>
              <FeatureInfo 
                title="Bank Account Management"
                steps={[
                  "Add your Bank Name, Branch, and IFSC for professional invoices.",
                  "Enter your UPI ID to auto-generate QR codes on digital bills.",
                  "Transactions are automatically synced from linked Payment records.",
                  "Use 'Manual Credit' to record opening balances or non-invoice deposits."
                ]}
              />
            </div>
            <div className="text-sm text-muted-foreground">{String(currentProfile?.businessName || '').trim() || 'Select a business profile'}</div>
          </div>
          <div className="flex gap-2">
            <Button type="button" onClick={openAdd}>
              <Plus className="w-4 h-4 mr-1" /> Add Bank Account
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate('/profiles')}>
              Manage in Profile
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Saved Accounts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {accounts.length === 0 && !legacy.hasLegacy ? (
                <div className="text-sm text-muted-foreground">No bank accounts found in this profile.</div>
              ) : (
                <>
                  {legacy.hasLegacy ? (
                    <div className="rounded-lg border p-4 bg-background/60">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold">{legacy.label}</div>
                      </div>

                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        <div className="text-muted-foreground">Bank</div>
                        <div>{legacy.bankName || '—'}</div>

                        <div className="text-muted-foreground">Branch</div>
                        <div>{legacy.bankBranch || '—'}</div>

                        <div className="text-muted-foreground">Account Number</div>
                        <div>{legacy.accountNumber || '—'}</div>

                        <div className="text-muted-foreground">IFSC</div>
                        <div>{legacy.ifscCode || '—'}</div>

                        <div className="text-muted-foreground">UPI ID</div>
                        <div>{legacy.upiId || '—'}</div>
                      </div>
                    </div>
                  ) : null}

                  {accounts.map((a: any, idx: number) => (
                    <div key={String(a?._id || idx)} className="rounded-lg border p-4 bg-background/60">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold">
                          {String(a?.label || a?.bankName || 'Bank Account')}
                          {a?.isDefault ? <span className="ml-2 text-xs text-muted-foreground">(Default)</span> : null}
                        </div>
                        <div className="flex gap-1">
                          <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(idx)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteAccount(idx)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        <div className="text-muted-foreground">Bank</div>
                        <div>{String(a?.bankName || '').trim() || '—'}</div>

                        <div className="text-muted-foreground">Branch</div>
                        <div>{String(a?.bankBranch || '').trim() || '—'}</div>

                        <div className="text-muted-foreground">Account Number</div>
                        <div>{String(a?.accountNumber || '').trim() || '—'}</div>

                        <div className="text-muted-foreground">IFSC</div>
                        <div>{String(a?.ifscCode || '').trim() || '—'}</div>

                        <div className="text-muted-foreground">UPI ID</div>
                        <div>{String(a?.upiId || '').trim() || '—'}</div>

                        <div className="text-muted-foreground">UPI QR Text</div>
                        <div>{String(a?.upiQrText || '').trim() || '—'}</div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Transactions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
                <div className="space-y-2">
                  <Label>Bank Account</Label>
                  <Select value={selectedBankAccountId || ''} onValueChange={setSelectedBankAccountId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {legacy.hasLegacy ? <SelectItem value="__null__">{legacy.label}</SelectItem> : null}
                      {accounts.map((a: any, idx: number) => (
                        <SelectItem key={String(a?._id || idx)} value={String(a?._id || '')}>
                          {String(a?.label || a?.bankName || 'Bank Account')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedAccount ? (
                    <div className="text-xs text-muted-foreground">
                      {String(selectedAccount?.bankName || '').trim() || '—'}
                      {String(selectedAccount?.accountNumber || '').trim() ? ` • ${String(selectedAccount.accountNumber).trim()}` : ''}
                      {String(selectedAccount?.ifscCode || '').trim() ? ` • ${String(selectedAccount.ifscCode).trim()}` : ''}
                    </div>
                  ) : null}
                </div>

                <div className="rounded-lg border p-3 bg-background/60">
                  <div className="flex items-center justify-between text-sm">
                    <div className="text-muted-foreground">Transactions</div>
                    <div className="font-medium">{totals.count}</div>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <div className="text-muted-foreground">Total</div>
                    <div className="font-semibold">{formatInr(totals.totalAmount)}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border p-4 bg-background/60 space-y-3">
                <div className="text-sm font-semibold">Add Manual Credit</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input type="date" value={manualDate} onChange={(e) => setManualDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <Input value={manualAmount} onChange={(e) => setManualAmount(e.target.value)} placeholder="0.00" />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input value={manualDescription} onChange={(e) => setManualDescription(e.target.value)} placeholder="Optional" />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={loadTransactions} disabled={loading}>
                    <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                    Show Credits
                  </Button>
                  <Button type="button" onClick={handleAddManualCredit} disabled={savingManual}>
                    {savingManual ? 'Saving...' : 'Add Credit'}
                  </Button>
                </div>
              </div>

              {loading ? (
                <div className="py-6">
                  <TraceLoader label="Loading transactions..." />
                </div>
              ) : unified.length === 0 ? (
                <div className="text-sm text-muted-foreground">No transactions found for this bank account.</div>
              ) : (
                <div className="rounded-lg border overflow-x-auto">
                  <div className="min-w-[560px]">
                    <div className="grid grid-cols-[110px_130px_1fr_110px] gap-0 bg-muted/50 text-xs font-semibold text-muted-foreground">
                      <div className="px-3 py-2">Date</div>
                      <div className="px-3 py-2">Type</div>
                      <div className="px-3 py-2">Details</div>
                      <div className="px-3 py-2 text-right">Amount</div>
                    </div>
                    {(unified || []).map((r: any) => (
                      <div key={String(r?.id)} className="grid grid-cols-[110px_130px_1fr_110px] gap-0 border-t text-sm">
                        <div className="px-3 py-2">{String(r?.date || '').trim() || '—'}</div>
                        <div className="px-3 py-2">{String(r?.method || '').trim() || '—'}</div>
                        <div className="px-3 py-2 text-muted-foreground break-words">{String(r?.details || '').trim() || '—'}</div>
                        <div className="px-3 py-2 text-right font-medium">{formatInr(Number(r?.amount || 0))}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <MobileFormSheet open={dialogOpen} onClose={() => setDialogOpen(false)} title={editIndex !== null ? 'Edit Bank Account' : 'Add Bank Account'}>
        <div className="space-y-3">
          <MobileFormSection label="Account Info">
            <div>
              <Label>Label</Label>
              <Input placeholder="e.g. Main Account" value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Bank Name</Label>
                <Input placeholder="e.g. SBI" value={form.bankName} onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))} />
              </div>
              <div>
                <Label>Branch</Label>
                <Input placeholder="Branch name" value={form.bankBranch} onChange={(e) => setForm((f) => ({ ...f, bankBranch: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Account Number</Label>
              <Input placeholder="Account number" value={form.accountNumber} onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value }))} />
            </div>
            <div>
              <Label>IFSC Code</Label>
              <Input placeholder="IFSC" value={form.ifscCode} onChange={(e) => setForm((f) => ({ ...f, ifscCode: e.target.value }))} />
            </div>
          </MobileFormSection>

          <MobileFormSection label="UPI">
            <div>
              <Label>UPI ID</Label>
              <Input placeholder="name@bank" value={form.upiId} onChange={(e) => setForm((f) => ({ ...f, upiId: e.target.value }))} />
            </div>
            <div>
              <Label>UPI QR Text</Label>
              <Input placeholder="Optional QR text" value={form.upiQrText} onChange={(e) => setForm((f) => ({ ...f, upiQrText: e.target.value }))} />
            </div>
          </MobileFormSection>

          <label className="flex items-center gap-2 text-sm cursor-pointer text-foreground">
            <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))} />
            Set as default account
          </label>
        </div>
        <MobileFormActions>
          <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button type="button" onClick={saveAccount} disabled={savingAccount}>{savingAccount ? 'Saving...' : 'Save'}</Button>
        </MobileFormActions>
      </MobileFormSheet>
    </>
  );
}
