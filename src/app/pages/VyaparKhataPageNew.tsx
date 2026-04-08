import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Plus } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { TraceLoader } from '../components/TraceLoader';
import { useAuth } from '../contexts/AuthContext';
import { useIsNative } from '../hooks/useIsNative';
import { API_URL } from '../config/api';
import { FeatureInfo } from '../components/FeatureInfo';

type PartyType = 'customer' | 'supplier';

interface PartyRow {
  id: string;
  name: string;
  phone?: string;
  net: number;
  lastAt?: string | null;
}

interface PartyDetails {
  id: string;
  name: string;
  phone?: string | null;
  net: number;
}

interface EntryRow {
  id: string;
  date: string;
  direction: 'gave' | 'got';
  amount: number;
  method?: string | null;
  reference?: string | null;
  notes?: string | null;
}

const formatDate = (value?: string) => {
  if (!value) return '—';
  try {
    const d = new Date(value);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return String(value || '—');
  }
};

const todayISO = () => {
  const t = new Date();
  const yyyy = t.getFullYear();
  const mm = String(t.getMonth() + 1).padStart(2, '0');
  const dd = String(t.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const money = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const initials = (name: string) => {
  const s = String(name || '').trim();
  if (!s) return '?';
  return s[0]?.toLowerCase() || '?';
};

const relativeTime = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / (60 * 1000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} minutes ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hours ago`;
  const days = Math.floor(hrs / 24);
  return `${days} days ago`;
};

export function VyaparKhataPageNew() {
  const { accessToken, deviceId } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const readCurrentProfile = () => {
    const raw = localStorage.getItem('currentProfile');
    if (!raw) return {} as any;
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'string') {
        try {
          return JSON.parse(parsed);
        } catch {
          return {} as any;
        }
      }
      return parsed || ({} as any);
    } catch {
      return {} as any;
    }
  };

  const profileId = (() => {
    const p = readCurrentProfile();
    return p?.id ? String(p.id) : null;
  })();

  const [partyType, setPartyType] = useState<PartyType>('customer');

  const [loadingLeft, setLoadingLeft] = useState(true);
  const [loadingRight, setLoadingRight] = useState(false);

  const [leftLoadError, setLeftLoadError] = useState<string | null>(null);

  const [youWillGive, setYouWillGive] = useState(0);
  const [youWillGet, setYouWillGet] = useState(0);

  const [q, setQ] = useState('');
  const [filterBy, setFilterBy] = useState('all');
  const [sortBy, setSortBy] = useState<'recent' | 'amount' | 'name'>('recent');

  const [partyRows, setPartyRows] = useState<PartyRow[]>([]);
  const [selectedPartyId, setSelectedPartyId] = useState<string>('');
  const [selectedParty, setSelectedParty] = useState<PartyDetails | null>(null);
  const [entries, setEntries] = useState<EntryRow[]>([]);

  const [addPartyOpen, setAddPartyOpen] = useState(false);
  const [addPartyType, setAddPartyType] = useState<PartyType>('customer');
  const [addPartyExpanded, setAddPartyExpanded] = useState(false);
  const [addPartySaving, setAddPartySaving] = useState(false);
  const [addPartyGstinLookupLoading, setAddPartyGstinLookupLoading] = useState(false);
  const [addPartyForm, setAddPartyForm] = useState({
    name: '',
    phone: '',
    openingBalance: '',
    openingBalanceLabel: 'gave' as 'gave' | 'got',
    gstin: '',
    pan: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
  });

  const [entrySheetOpen, setEntrySheetOpen] = useState(false);
  const [entryDirection, setEntryDirection] = useState<'gave' | 'got'>('gave');
  const [entryAmount, setEntryAmount] = useState('');
  const [entryDate, setEntryDate] = useState(todayISO());
  const [entryMethod, setEntryMethod] = useState('cash');
  const [entryReference, setEntryReference] = useState('');
  const [entryNotes, setEntryNotes] = useState('');
  const [savingEntry, setSavingEntry] = useState(false);

  const headers = useMemo(() => {
    const h: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      'X-Device-ID': deviceId,
    };
    if (profileId) h['X-Profile-ID'] = profileId;
    return h;
  }, [accessToken, deviceId, profileId]);

  const updatePartyDueDate = async (days: number | string) => {
    if (!selectedPartyId || !accessToken || !deviceId || !profileId) return;
    let finalDate = '';
    const now = new Date();
    if (typeof days === 'number') {
      now.setDate(now.getDate() + days);
      finalDate = now.toISOString().split('T')[0];
    } else {
      finalDate = days as string;
    }

    try {
      const url = partyType === 'customer' ? `${API_URL}/customers/${selectedPartyId}` : `${API_URL}/suppliers/${selectedPartyId}`;
      const res = await fetch(url, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ dueDate: finalDate })
      });
      if (!res.ok) throw new Error('Failed to update due date');
      toast.success(`Due date set to ${formatDate(finalDate)}`);
      void loadRight(selectedPartyId);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleSelectDate = () => {
    const input = document.createElement('input');
    input.type = 'date';
    input.onchange = (e: any) => {
      const val = e.target.value;
      if (val) void updatePartyDueDate(val);
    };
    input.click();
  };

  const loadLeft = async (partyTypeOverride?: PartyType) => {
    if (!accessToken || !deviceId) {
      toast.error('Not authenticated');
      return;
    }
    if (!profileId) {
      toast.error('Select a business profile first');
      return;
    }
    setLoadingLeft(true);
    try {
      const pt = partyTypeOverride || partyType;
      const qs = new URLSearchParams({ partyType: pt, q }).toString();
      const [sumRes, partiesRes] = await Promise.all([
        fetch(`${API_URL}/vyapar-khata/summary?partyType=${pt}`, { headers }),
        fetch(`${API_URL}/vyapar-khata/parties?${qs}`, { headers }),
      ]);

      const sum = await sumRes.json().catch(() => ({}));
      if (!sumRes.ok) {
        throw new Error(sum?.error || 'Failed to load summary');
      }

      const parties = await partiesRes.json().catch(() => ([]));
      if (!partiesRes.ok) {
        throw new Error(parties?.error || 'Failed to load parties');
      }

      setYouWillGive(Number(sum?.youWillGive || 0));
      setYouWillGet(Number(sum?.youWillGet || 0));
      setPartyRows(Array.isArray(parties) ? parties : []);
      setLeftLoadError(null);
    } catch (e: any) {
      const msg = e?.message || 'Failed to load parties';
      toast.error(msg);
      setLeftLoadError(msg);
    } finally {
      setLoadingLeft(false);
    }
  };

  const loadRight = async (pid: string) => {
    if (!accessToken || !deviceId) {
      toast.error('Not authenticated');
      return;
    }
    if (!profileId) {
      toast.error('Select a business profile first');
      return;
    }
    if (!pid) return;
    setLoadingRight(true);
    try {
      const [pRes, eRes] = await Promise.all([
        fetch(`${API_URL}/vyapar-khata/party/${pid}?partyType=${partyType}`, { headers }),
        fetch(`${API_URL}/vyapar-khata/party/${pid}/entries?partyType=${partyType}`, { headers }),
      ]);
      const p = await pRes.json().catch(() => ({}));
      const e = await eRes.json().catch(() => []);
      if (!pRes.ok) throw new Error(p?.error || 'Failed to load party');
      setSelectedParty(p as PartyDetails);
      setEntries(Array.isArray(e) ? (e as EntryRow[]) : []);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load entries');
      setSelectedParty(null);
      setEntries([]);
    } finally {
      setLoadingRight(false);
    }
  };

  useEffect(() => {
    void loadLeft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, deviceId, profileId, partyType]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void loadLeft();
    }, 250);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  useEffect(() => {
    if (!selectedPartyId) {
      setSelectedParty(null);
      setEntries([]);
      return;
    }
    void loadRight(selectedPartyId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPartyId, partyType]);

  const viewRows = useMemo(() => {
    let rows = [...partyRows];
    if (filterBy === 'give') rows = rows.filter((r) => r.net < 0);
    if (filterBy === 'get') rows = rows.filter((r) => r.net > 0);

    if (sortBy === 'amount') rows.sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
    if (sortBy === 'name') rows.sort((a, b) => String(a.name).localeCompare(String(b.name)));
    if (sortBy === 'recent') rows.sort((a, b) => String(b.lastAt || '').localeCompare(String(a.lastAt || '')));
    return rows;
  }, [partyRows, filterBy, sortBy]);

  const openEntry = (dir: 'gave' | 'got') => {
    if (!selectedPartyId) {
      toast.error(`Select a ${partyType === 'customer' ? 'customer' : 'supplier'} first`);
      return;
    }
    setEntryDirection(dir);
    setEntryAmount('');
    setEntryDate(todayISO());
    setEntryMethod('cash');
    setEntryReference('');
    setEntryNotes('');
    setEntrySheetOpen(true);
  };

  const saveEntry = async () => {
    if (!accessToken || !deviceId) {
      toast.error('Not authenticated');
      return;
    }
    if (!profileId) {
      toast.error('Select a business profile first');
      return;
    }
    if (!selectedPartyId) return;
    const amt = Number(entryAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error('Enter valid amount');
      return;
    }
    setSavingEntry(true);
    try {
      const res = await fetch(`${API_URL}/vyapar-khata/entries`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          partyType,
          partyId: selectedPartyId,
          direction: entryDirection,
          amount: amt,
          date: entryDate,
          method: 'cash',
          reference: null,
          notes: entryNotes || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to save entry');
      setEntrySheetOpen(false);
      await Promise.all([loadLeft(), loadRight(selectedPartyId)]);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save entry');
    } finally {
      setSavingEntry(false);
    }
  };

  const openAddParty = () => {
    setAddPartyType(partyType);
    setAddPartyExpanded(false);
    setAddPartyForm({
      name: '',
      phone: '',
      openingBalance: '',
      openingBalanceLabel: 'gave',
      gstin: '',
      pan: '',
      address: '',
      city: '',
      state: '',
      postalCode: '',
    });
    setAddPartyOpen(true);
  };

  const saveNewParty = async () => {
    if (!accessToken || !deviceId) {
      toast.error('Not authenticated');
      return;
    }
    if (!profileId) {
      toast.error('Select a business profile first');
      return;
    }
    const name = String(addPartyForm.name || '').trim();
    if (!name) {
      toast.error('Enter party name');
      return;
    }

    const openingBalance = Number(addPartyForm.openingBalance || 0);
    const openingBalanceType = addPartyForm.openingBalanceLabel === 'gave' ? 'dr' : 'cr';

    setAddPartySaving(true);
    try {
      const url = addPartyType === 'customer' ? `${API_URL}/customers` : `${API_URL}/suppliers`;

      const basePayload: any = {
        name,
        phone: String(addPartyForm.phone || '').trim() || null,
        openingBalance: Number.isFinite(openingBalance) ? openingBalance : 0,
        openingBalanceType,
      };

      if (addPartyExpanded) {
        basePayload.gstin = String(addPartyForm.gstin || '').trim() || null;
        basePayload.pan = String(addPartyForm.pan || '').trim() || null;

        const addr = String(addPartyForm.address || '').trim() || null;
        basePayload.billingAddress = addr;
        basePayload.billingCity = String(addPartyForm.city || '').trim() || null;
        basePayload.billingState = String(addPartyForm.state || '').trim() || null;
        basePayload.billingPostalCode = String(addPartyForm.postalCode || '').trim() || null;
        basePayload.address = addr;
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(basePayload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to add party');

      const newId = String(data?.id || data?._id || '');
      setAddPartyOpen(false);
      setPartyType(addPartyType);
      if (newId) setSelectedPartyId(newId);
      await loadLeft(addPartyType);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to add party');
    } finally {
      setAddPartySaving(false);
    }
  };

  const isNative = useIsNative();

  return (
    <>
      <div className={`flex ${isNative ? 'flex-col' : ''} h-[calc(100vh-4rem)]`}>
        {/* ── MOBILE VIEW ── */}
        {isNative && (
          <div className="flex-1 flex flex-col bg-background/95 backdrop-blur-xl overflow-hidden">
            {!selectedPartyId ? (
              <>
                {/* Mobile Header / Stats */}
                <div className="p-4 space-y-4 bg-gradient-to-b from-primary/10 to-transparent border-b">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-black tracking-tight text-foreground/90">Vyapar Khata</h2>
                    <Button variant="ghost" size="sm" className="rounded-xl" onClick={() => loadLeft()}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 backdrop-blur-md">
                      <div className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-1">You'll Give</div>
                      <div className="text-lg font-black text-red-600 truncate">{money(youWillGive)}</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-green-500/10 border border-green-500/20 backdrop-blur-md">
                      <div className="text-[10px] font-bold text-green-500 uppercase tracking-widest mb-1">You'll Get</div>
                      <div className="text-lg font-black text-green-600 truncate">{money(youWillGet)}</div>
                    </div>
                  </div>

                  <div className="flex p-1 bg-muted/50 rounded-xl border border-border/50">
                    <button
                      onClick={() => { setPartyType('customer'); setSelectedPartyId(''); }}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${partyType === 'customer' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`}
                    >
                      Customers
                    </button>
                    <button
                      onClick={() => { setPartyType('supplier'); setSelectedPartyId(''); }}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${partyType === 'supplier' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`}
                    >
                      Suppliers
                    </button>
                  </div>

                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                    <Input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder={`Search ${partyType}s...`}
                      className="pl-10 h-11 bg-muted/30 border-none rounded-xl"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-auto px-4 py-2">
                  {loadingLeft ? (
                    <div className="flex items-center justify-center py-20"><TraceLoader label="Loading..." /></div>
                  ) : viewRows.length === 0 ? (
                    <div className="text-center py-20 opacity-50">No {partyType}s found</div>
                  ) : (
                    <div className="space-y-2 pb-24">
                      {viewRows.map((r) => {
                        const netAbs = Math.abs(Number(r.net || 0));
                        const willGet = r.net > 0;
                        return (
                          <button
                            key={r.id}
                            onClick={() => setSelectedPartyId(r.id)}
                            className="w-full p-4 flex items-center gap-4 bg-muted/20 border border-border/40 rounded-2xl active:scale-[0.97] transition-transform"
                          >
                            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-primary flex items-center justify-center font-bold text-lg shadow-inner ring-1 ring-primary/20">
                              {initials(r.name)}
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                              <div className="font-bold text-sm truncate text-foreground/90">{r.name}</div>
                              <div className="text-[10px] text-muted-foreground uppercase tracking-tight">{relativeTime(r.lastAt)}</div>
                            </div>
                            <div className="text-right">
                              <div className={`font-black text-sm ${willGet ? 'text-red-500' : 'text-green-500'}`}>{money(netAbs)}</div>
                              <div className="text-[9px] font-bold opacity-70 uppercase tracking-tighter">{willGet ? "You'll Get" : "You'll Give"}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="fixed bottom-24 right-6">
                  <Button
                    onClick={openAddParty}
                    className="h-14 w-14 rounded-2xl shadow-xl shadow-primary/20 flex items-center justify-center p-0 active:scale-90 transition-transform bg-primary text-primary-foreground"
                  >
                    <Plus className="w-7 h-7" />
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="p-4 bg-gradient-to-b from-primary/10 to-transparent border-b">
                   <div className="flex items-center gap-4 mb-4">
                    <Button variant="ghost" size="sm" className="p-0 h-10 w-10 rounded-xl bg-background/50 border shadow-sm" onClick={() => setSelectedPartyId('')}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
                    </Button>
                    <div className="flex-1 min-w-0">
                      <div className="font-black text-lg truncate leading-tight text-foreground/90">{selectedParty?.name}</div>
                      <div className="text-xs text-muted-foreground font-medium">{selectedParty?.phone || 'No phone'}</div>
                    </div>
                   </div>

                   <div className="p-4 rounded-2xl bg-background/60 border shadow-sm flex items-center justify-between backdrop-blur-md">
                     <div>
                       <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Net Balance</div>
                       <div className={`text-xl font-black ${ (selectedParty?.net || 0) > 0 ? 'text-red-600' : (selectedParty?.net || 0) < 0 ? 'text-green-600' : 'text-foreground' }`}>
                          {money(Math.abs(selectedParty?.net || 0))}
                       </div>
                     </div>
                     <div className="text-right">
                        <div className="text-[10px] font-bold opacity-60 uppercase tracking-tighter mb-1">Status</div>
                        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${ (selectedParty?.net || 0) > 0 ? 'bg-red-500/10 text-red-600' : (selectedParty?.net || 0) < 0 ? 'bg-green-500/10 text-green-600' : 'bg-muted text-muted-foreground' }`}>
                          { (selectedParty?.net || 0) > 0 ? "You'll Get" : (selectedParty?.net || 0) < 0 ? "You'll Give" : "Settled" }
                        </div>
                     </div>
                   </div>
                </div>

                <div className="flex-1 overflow-auto px-4 py-4 space-y-4">
                  {loadingRight ? (
                    <div className="flex items-center justify-center py-20"><TraceLoader label="Loading..." /></div>
                  ) : entries.length === 0 ? (
                    <div className="text-center py-20 opacity-50">No entries recorded</div>
                  ) : (
                    <div className="space-y-4 pb-20">
                      {entries.map((e) => (
                        <div key={e.id} className="group">
                           <div className="flex items-center gap-2 mb-1 px-1">
                             <div className="text-[10px] font-black opacity-30 uppercase tracking-widest">{formatDate(e.date)}</div>
                             <div className="h-px flex-1 bg-border/40" />
                             <div className="text-[10px] font-bold opacity-30">{new Date(e.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</div>
                           </div>
                           <div className="p-4 bg-muted/10 border border-border/40 rounded-2xl flex items-center justify-between active:bg-muted/20 transition-colors">
                              <div className="flex-1 min-w-0 pr-4">
                                <div className="text-xs font-bold text-foreground/70 line-clamp-2 leading-relaxed">{e.notes || 'Transaction Entry'}</div>
                                <div className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mt-1 opacity-50">{e.method || 'Cash'}</div>
                              </div>
                              <div className="text-right">
                                <div className={`text-base font-black ${e.direction === 'gave' ? 'text-red-600' : 'text-green-600'}`}>
                                  {e.direction === 'gave' ? '-' : '+'}{money(e.amount)}
                                </div>
                              </div>
                           </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-4 bg-background/80 backdrop-blur-2xl border-t grid grid-cols-2 gap-4 pb-8">
                   <Button
                    onClick={() => openEntry('gave')}
                    className="h-12 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl shadow-lg shadow-red-600/20 border-none active:scale-95 transition-transform"
                   >
                     You Gave ₹
                   </Button>
                   <Button
                    onClick={() => openEntry('got')}
                    className="h-12 bg-green-600 hover:bg-green-700 text-white font-black rounded-xl shadow-lg shadow-green-600/20 border-none active:scale-95 transition-transform"
                   >
                     You Got ₹
                   </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── DESKTOP VIEW ── */}
        {!isNative && (
          <>
            <div className="w-[420px] border-r bg-background flex flex-col">
              <div className="border-b">
                <div className="flex items-center gap-4 px-4 pt-4">
                  <button
                    type="button"
                    className={`text-sm font-semibold pb-2 border-b-2 ${partyType === 'customer' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}
                    onClick={() => {
                      setPartyType('customer');
                      setSelectedPartyId('');
                    }}
                  >
                    Customers
                  </button>
                  <button
                    type="button"
                    className={`text-sm font-semibold pb-2 border-b-2 ${partyType === 'supplier' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}
                    onClick={() => {
                      setPartyType('supplier');
                      setSelectedPartyId('');
                    }}
                  >
                    Suppliers
                  </button>
                  
                  <FeatureInfo 
                    title="Vyapar Khata (Credit Register)"
                    steps={[
                      "Use this for manual credit/debit tracking without full invoices.",
                      "'You Gave' (Red) = money you paid out or credit you gave.",
                      "'You Got' (Green) = money you received or credit cleared.",
                      "Net Balance = Total Got - Total Gave (Automatically tracked per party)."
                    ]}
                  />

                  <div className="ml-auto">
                    <Button type="button" variant="outline" size="sm" onClick={() => loadLeft()}>
                      Refresh
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 px-4 py-3">
                  <div className="text-sm min-w-0">
                    <div className="text-muted-foreground">You'll Give:</div>
                    <div className="font-semibold text-red-600 truncate" title={money(youWillGive)}>{money(youWillGive)}</div>
                  </div>
                  <div className="text-sm min-w-0">
                    <div className="text-muted-foreground">You'll Get:</div>
                    <div className="font-semibold text-green-600 truncate" title={money(youWillGet)}>{money(youWillGet)}</div>
                  </div>
                  <div className="flex justify-end items-center">
                    <Button type="button" variant="outline" size="sm" onClick={openAddParty}>
                      Add {partyType === 'customer' ? 'Customer' : 'Supplier'}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="px-4 py-3 space-y-3 border-b">
                <div className="grid grid-cols-1 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Search for {partyType === 'customer' ? 'customers' : 'suppliers'}</Label>
                    <Input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="Name or phone"
                      className="h-9"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Filter By</Label>
                    <Select value={filterBy} onValueChange={setFilterBy}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="give">You'll Give</SelectItem>
                        <SelectItem value="get">You'll Get</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Sort By</Label>
                    <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="recent">Recent</SelectItem>
                        <SelectItem value="amount">Amount</SelectItem>
                        <SelectItem value="name">Name</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-auto">
                <div className="grid grid-cols-2 text-xs text-muted-foreground px-4 py-2 border-b">
                  <div>NAME</div>
                  <div className="text-right">AMOUNT</div>
                </div>

                {loadingLeft ? (
                  <div className="flex items-center justify-center py-10">
                    <TraceLoader label="Loading..." />
                  </div>
                ) : viewRows.length === 0 ? (
                  <div className="text-sm text-muted-foreground px-4 py-10">
                    {leftLoadError ? leftLoadError : 'No parties found.'}
                  </div>
                ) : (
                  <div>
                    {viewRows.map((r) => {
                      const isSelected = r.id === selectedPartyId;
                      const netAbs = Math.abs(Number(r.net || 0));
                      const willGet = r.net > 0;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          className={`w-full text-left px-4 py-3 border-b hover:bg-muted/20 ${isSelected ? 'bg-muted/20' : ''}`}
                          onClick={() => setSelectedPartyId(r.id)}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-10 w-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-semibold">
                              {initials(r.name)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-sm truncate">{r.name}</div>
                              <div className="text-xs text-muted-foreground">{relativeTime(r.lastAt)}</div>
                            </div>
                            <div className="text-right min-w-0 max-w-[170px]">
                              <div
                                className={`font-semibold truncate ${willGet ? 'text-red-600' : 'text-green-600'}`}
                                title={money(netAbs)}
                              >
                                {money(netAbs)}
                              </div>
                              <div className="text-[10px] text-muted-foreground uppercase">{willGet ? "YOU'LL GET" : "YOU'LL GIVE"}</div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="border-t px-4 py-3 flex justify-center gap-2">
                <Button type="button" variant="outline" className="w-[180px]" onClick={openAddParty}>
                  Bulk Upload
                </Button>
                <Button type="button" className="w-[180px]" onClick={openAddParty}>
                  Add {partyType === 'customer' ? 'Customer' : 'Supplier'}
                </Button>
              </div>
            </div>

            <div className="flex-1 bg-background flex flex-col">
              {!selectedPartyId ? (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                  <div className="text-5xl mb-3">👥</div>
                  <div className="text-sm font-semibold">No {partyType === 'customer' ? 'customer' : 'supplier'} selected</div>
                </div>
              ) : loadingRight ? (
                <div className="flex-1 flex items-center justify-center">
                  <TraceLoader label="Loading..." />
                </div>
              ) : !selectedParty ? (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                  <div className="text-sm">Failed to load party.</div>
                </div>
              ) : (
                <>
                  <div className="border-b px-5 py-4 flex items-start gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-semibold">
                      {initials(selectedParty.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate" title={selectedParty.name}>{selectedParty.name}</div>
                      <div className="text-xs text-muted-foreground">{selectedParty.phone || ''}</div>

                      <div className="mt-3 flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Set Due Date:</span>
                        <Button type="button" size="sm" variant="outline" onClick={() => updatePartyDueDate(7)}>7 days</Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => updatePartyDueDate(14)}>14 days</Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => updatePartyDueDate(30)}>30 days</Button>
                        <Button type="button" size="sm" variant="outline" onClick={handleSelectDate}>Select Date</Button>
                      </div>
                    </div>

                    <div className="text-right min-w-0">
                      <div className="text-xs text-muted-foreground">NET BALANCE:</div>
                      <div className="text-sm min-w-0">
                        {selectedParty.net > 0 ? (
                          <span className="text-red-600 font-semibold truncate inline-block max-w-[220px] align-top" title={`You'll Get: ${money(Math.abs(selectedParty.net))}`}>You'll Get: {money(Math.abs(selectedParty.net))}</span>
                        ) : selectedParty.net < 0 ? (
                          <span className="text-green-600 font-semibold truncate inline-block max-w-[220px] align-top" title={`You'll Give: ${money(Math.abs(selectedParty.net))}`}>You'll Give: {money(Math.abs(selectedParty.net))}</span>
                        ) : (
                          <span className="font-semibold">Settled</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="px-5 py-3 border-b flex items-center justify-between sticky top-0 bg-background z-10">
                    <div className="text-sm font-semibold">ENTRIES</div>
                    <div className="text-xs text-muted-foreground grid grid-cols-2 gap-8">
                      <div className="text-right">YOU GAVE</div>
                      <div className="text-right">YOU GOT</div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-auto">
                    {entries.length === 0 ? (
                      <div className="text-sm text-muted-foreground px-5 py-10">No entries yet.</div>
                    ) : (
                      <div className="divide-y">
                        {entries.map((e) => (
                          <div key={e.id} className="px-5 py-3 flex items-start gap-4">
                            <div className="flex-1">
                              <div className="text-sm font-semibold">{formatDate(e.date)} • {new Date(e.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</div>
                              <div className="text-xs text-muted-foreground">Balance: —</div>
                              <div className="text-xs text-muted-foreground">{e.notes || e.method || ''}</div>
                            </div>
                            <div className="w-[220px] grid grid-cols-2 gap-8 text-sm">
                              <div className="text-right">
                                {e.direction === 'gave' ? (
                                  <span className="text-red-600 font-semibold truncate inline-block max-w-[100px]" title={money(e.amount)}>
                                    {money(e.amount)}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </div>
                              <div className="text-right">
                                {e.direction === 'got' ? (
                                  <span className="text-green-600 font-semibold truncate inline-block max-w-[100px]" title={money(e.amount)}>
                                    {money(e.amount)}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="border-t px-5 py-4 flex gap-3">
                    <Button type="button" className="flex-1 bg-red-100 text-red-700 hover:bg-red-200" variant="secondary" onClick={() => openEntry('gave')}>
                      You Gave ₹
                    </Button>
                    <Button type="button" className="flex-1 bg-green-100 text-green-700 hover:bg-green-200" variant="secondary" onClick={() => openEntry('got')}>
                      You Got ₹
                    </Button>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {entrySheetOpen && (
        <div className="fixed inset-0 z-50 bg-black/20" onClick={() => setEntrySheetOpen(false)}>
          <div className={`absolute right-0 top-0 h-full ${isNative ? 'w-full' : 'w-96'} bg-background border-l shadow-xl overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b flex items-center justify-between">
              <div className="font-semibold text-foreground">Add New Entry</div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setEntrySheetOpen(false)}>
                ✕
              </Button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <Label>Amount</Label>
                <Input type="number" placeholder="₹ Enter Amount" value={entryAmount} onChange={(e) => setEntryAmount(e.target.value)} />
              </div>
              <div>
                <Label>Description</Label>
                <textarea
                  className="w-full min-h-[160px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Enter Details (Item Name, Bill No, Quantity, etc)"
                  value={entryNotes}
                  onChange={(e) => setEntryNotes(e.target.value)}
                />
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setEntrySheetOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" className="flex-1" onClick={saveEntry} disabled={savingEntry}>
                  {savingEntry ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {addPartyOpen && (
        <div className="fixed inset-0 z-50 bg-black/20" onClick={() => setAddPartyOpen(false)}>
          <div className={`absolute right-0 top-0 h-full ${isNative ? 'w-full' : 'w-96'} bg-background border-l shadow-xl overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b flex items-center justify-between">
              <div className="font-semibold text-foreground">Add New Party</div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setAddPartyOpen(false)}>
                ✕
              </Button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <Label>Party Name</Label>
                <Input
                  value={addPartyForm.name}
                  onChange={(e) => setAddPartyForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Enter Party Name"
                />
              </div>

              <div>
                <Label>Phone Number (optional)</Label>
                <Input
                  value={addPartyForm.phone}
                  onChange={(e) => setAddPartyForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="+91 Enter Phone Number"
                />
              </div>

              <div>
                <Label>Opening Balance (optional)</Label>
                <div className="flex gap-2">
                  <Input
                    value={addPartyForm.openingBalance}
                    onChange={(e) => setAddPartyForm((p) => ({ ...p, openingBalance: e.target.value }))}
                    placeholder="₹ Enter amount"
                    type="number"
                  />
                  <Select
                    value={addPartyForm.openingBalanceLabel}
                    onValueChange={(v) => setAddPartyForm((p) => ({ ...p, openingBalanceLabel: v as any }))}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gave">You Gave</SelectItem>
                      <SelectItem value="got">You Got</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Who are they?</Label>
                <div className="flex items-center gap-4 pt-1">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      checked={addPartyType === 'customer'}
                      onChange={() => setAddPartyType('customer')}
                    />
                    Customer
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      checked={addPartyType === 'supplier'}
                      onChange={() => setAddPartyType('supplier')}
                    />
                    Supplier
                  </label>
                </div>
              </div>

              <div className="pt-2 border-t">
                <button
                  type="button"
                  className="text-sm text-primary font-semibold"
                  onClick={() => setAddPartyExpanded((v) => !v)}
                >
                  Add GSTIN & Address (Optional)
                </button>
              </div>

              {addPartyExpanded && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>GSTIN</Label>
                      <Input
                        value={addPartyForm.gstin}
                        onChange={(e) => setAddPartyForm((p) => ({ ...p, gstin: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>PAN</Label>
                      <Input value={addPartyForm.pan} onChange={(e) => setAddPartyForm((p) => ({ ...p, pan: e.target.value }))} />
                    </div>
                  </div>

                  <div>
                    <Label>Address</Label>
                    <Input value={addPartyForm.address} onChange={(e) => setAddPartyForm((p) => ({ ...p, address: e.target.value }))} />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label>City</Label>
                      <Input value={addPartyForm.city} onChange={(e) => setAddPartyForm((p) => ({ ...p, city: e.target.value }))} />
                    </div>
                    <div>
                      <Label>State</Label>
                      <Input value={addPartyForm.state} onChange={(e) => setAddPartyForm((p) => ({ ...p, state: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Pincode</Label>
                      <Input value={addPartyForm.postalCode} onChange={(e) => setAddPartyForm((p) => ({ ...p, postalCode: e.target.value }))} />
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-6">
                <Button type="button" className="w-full" onClick={saveNewParty} disabled={addPartySaving}>
                  {addPartySaving ? 'Saving...' : addPartyType === 'customer' ? 'Add Customer' : 'Add Supplier'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
