import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { TraceLoader } from '../components/TraceLoader';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../config/api';
import { DateRangePicker, DateRange } from '../components/ui/date-range-picker';

interface Transaction {
  id: string;
  date: string;
  type: 'cash_in' | 'bank_in' | 'cash_out' | 'bank_out';
  category: string;
  amount: number;
  description: string;
  party?: string;
  reference?: string;
}

interface Summary {
  openingBalance: number;
  totalIn: number;
  totalOut: number;
  currentBalance: number;
}

interface Party {
  id: string;
  name: string;
  phone?: string;
  type: 'customer' | 'supplier';
}

const formatMoney = (n: number) => `₹${Number(n || 0).toFixed(2)}`;

const formatDate = (value?: string) => {
  if (!value) return '—';
  try {
    const d = new Date(value);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
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

const transactionTypes = [
  { value: 'cash_in', label: 'Cash In', color: 'text-green-600' },
  { value: 'bank_in', label: 'Bank In', color: 'text-green-600' },
  { value: 'cash_out', label: 'Cash Out', color: 'text-red-600' },
  { value: 'bank_out', label: 'Bank Out', color: 'text-red-600' },
];

const categories = {
  cash_in: ['Sales', 'Loan Received', 'Investment', 'Other Income'],
  bank_in: ['Sales', 'Loan Received', 'Investment', 'Other Income'],
  cash_out: ['Purchase', 'Expenses', 'Salary', 'Rent', 'Other'],
  bank_out: ['Purchase', 'Expenses', 'Salary', 'Rent', 'Other'],
};

export function VyaparKhataPage() {
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

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<Summary>({
    openingBalance: 0,
    totalIn: 0,
    totalOut: 0,
    currentBalance: 0,
  });
  const [parties, setParties] = useState<Party[]>([]);

  const [loading, setLoading] = useState(true);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterParty, setFilterParty] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange>({ from: '', to: '' });

  const [newTransaction, setNewTransaction] = useState({
    date: todayISO(),
    type: 'cash_in' as const,
    category: '',
    amount: '',
    description: '',
    party: '',
    reference: '',
  });
  const [saving, setSaving] = useState(false);

  const headers = useMemo(() => {
    const h: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      'X-Device-ID': deviceId,
    };
    if (profileId) h['X-Profile-ID'] = profileId;
    return h;
  }, [accessToken, deviceId, profileId]);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      if (!accessToken || !deviceId || !profileId) return;
      setLoading(true);
      try {
        const dates = (dateRange.from || dateRange.to) ? `?from=${dateRange.from}&to=${dateRange.to}` : '';
        const summaryUrl = `${API_URL}/vyapar-khata/summary${dates}`;
        const transactionsUrl = `${API_URL}/vyapar-khata/transactions${dates}`;

        // Load transactions
        const [transactionsRes, summaryRes, partiesRes] = await Promise.all([
          fetch(transactionsUrl, { headers }),
          fetch(summaryUrl, { headers }),
          fetch(`${API_URL}/vyapar-khata/parties`, { headers }),
        ]);

        const transactionsData = await transactionsRes.json().catch(() => []);
        const summaryData = await summaryRes.json().catch(() => ({}));
        const partiesData = await partiesRes.json().catch(() => []);

        if (transactionsRes.ok) {
          setTransactions(Array.isArray(transactionsData) ? transactionsData : []);
        }
        if (summaryRes.ok) {
          setSummary(summaryData);
        }
        if (partiesRes.ok) {
          setParties(Array.isArray(partiesData) ? partiesData : []);
        }
      } catch (e: any) {
        toast.error(e?.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [accessToken, deviceId, profileId, dateRange, headers]);

  const handleAddTransaction = async () => {
    if (!accessToken || !deviceId || !profileId) return;
    if (!newTransaction.amount || Number(newTransaction.amount) <= 0) {
      toast.error('Enter valid amount');
      return;
    }
    if (!newTransaction.category) {
      toast.error('Select category');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        date: newTransaction.date,
        type: newTransaction.type,
        category: newTransaction.category,
        amount: Number(newTransaction.amount),
        description: newTransaction.description,
        party: newTransaction.party || null,
        reference: newTransaction.reference || null,
      };

      const res = await fetch(`${API_URL}/vyapar-khata/transactions`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to add transaction');

      toast.success('Transaction added successfully');
      setShowAddTransaction(false);
      setNewTransaction({
        date: todayISO(),
        type: 'cash_in',
        category: '',
        amount: '',
        description: '',
        party: '',
        reference: '',
      });

      // Reload data
      const [transactionsRes, summaryRes] = await Promise.all([
        fetch(`${API_URL}/vyapar-khata/transactions`, { headers }),
        fetch(`${API_URL}/vyapar-khata/summary`, { headers }),
      ]);

      if (transactionsRes.ok) {
        const transactionsData = await transactionsRes.json();
        setTransactions(Array.isArray(transactionsData) ? transactionsData : []);
      }
      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        setSummary(summaryData);
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to add transaction');
    } finally {
      setSaving(false);
    }
  };

  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];

    if (filterType !== 'all') {
      filtered = filtered.filter(t => t.type === filterType);
    }

    if (filterParty !== 'all') {
      filtered = filtered.filter(t => t.party === filterParty);
    }

    if (dateRange.from) {
      filtered = filtered.filter(t => t.date >= dateRange.from);
    }

    if (dateRange.to) {
      filtered = filtered.filter(t => t.date <= dateRange.to);
    }

    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, filterType, filterParty, dateRange]);

  const getTypeColor = (type: string) => {
    const found = transactionTypes.find(t => t.value === type);
    return found ? found.color : 'text-gray-600';
  };

  const getTypeLabel = (type: string) => {
    const found = transactionTypes.find(t => t.value === type);
    return found ? found.label : type;
  };

  return (
    <>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Vyapar Khata</h1>
            <p className="text-muted-foreground mt-1">Complete accounting and ledger management</p>
          </div>
          <Button onClick={() => setShowAddTransaction(true)}>
            Add Transaction
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">{formatMoney(summary.openingBalance)}</div>
              <div className="text-sm text-muted-foreground">Opening Balance</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">{formatMoney(summary.totalIn)}</div>
              <div className="text-sm text-muted-foreground">Total In</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600">{formatMoney(summary.totalOut)}</div>
              <div className="text-sm text-muted-foreground">Total Out</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-purple-600">{formatMoney(summary.currentBalance)}</div>
              <div className="text-sm text-muted-foreground">Current Balance</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>Transaction Type</Label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {transactionTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Party</Label>
                <Select value={filterParty} onValueChange={setFilterParty}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Parties</SelectItem>
                    {parties.map(party => (
                      <SelectItem key={party.id} value={party.id}>
                        {party.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label className="mb-1.5 block">Date Range</Label>
                <DateRangePicker range={dateRange} onRangeChange={setDateRange} align="start" className="w-full" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transactions List */}
        <Card>
          <CardHeader>
            <CardTitle>Transactions ({filteredTransactions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <TraceLoader label="Loading transactions..." />
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center text-muted-foreground py-10">
                No transactions found
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div>
                        <div className={`font-medium ${getTypeColor(transaction.type)}`}>
                          {getTypeLabel(transaction.type)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(transaction.date)} • {transaction.category}
                        </div>
                        {transaction.party && (
                          <div className="text-sm text-muted-foreground">Party: {transaction.party}</div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-semibold ${getTypeColor(transaction.type)}`}>
                        {transaction.type.includes('in') ? '+' : '-'}{formatMoney(transaction.amount)}
                      </div>
                      <div className="text-sm text-muted-foreground">{transaction.description}</div>
                      {transaction.reference && (
                        <div className="text-xs text-muted-foreground">Ref: {transaction.reference}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Transaction Modal */}
        {showAddTransaction && (
          <div className="fixed inset-0 z-50 bg-black/20" onClick={() => setShowAddTransaction(false)}>
            <div
              className="absolute right-0 top-0 h-full w-96 bg-background border-l shadow-xl overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Add Transaction</h2>
                  <Button variant="ghost" size="sm" onClick={() => setShowAddTransaction(false)}>
                    ✕
                  </Button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={newTransaction.date}
                    onChange={(e) => setNewTransaction({ ...newTransaction, date: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Type</Label>
                  <Select value={newTransaction.type} onValueChange={(v) => setNewTransaction({ ...newTransaction, type: v as any, category: '' })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {transactionTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Category</Label>
                  <Select value={newTransaction.category} onValueChange={(v) => setNewTransaction({ ...newTransaction, category: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories[newTransaction.type as keyof typeof categories]?.map(cat => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={newTransaction.amount}
                    onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Description</Label>
                  <Input
                    placeholder="Transaction description"
                    value={newTransaction.description}
                    onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Party (Optional)</Label>
                  <Select value={newTransaction.party} onValueChange={(v) => setNewTransaction({ ...newTransaction, party: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select party" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {parties.map(party => (
                        <SelectItem key={party.id} value={party.id}>
                          {party.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Reference (Optional)</Label>
                  <Input
                    placeholder="Transaction reference"
                    value={newTransaction.reference}
                    onChange={(e) => setNewTransaction({ ...newTransaction, reference: e.target.value })}
                  />
                </div>

                <div className="flex space-x-2 pt-4">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowAddTransaction(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleAddTransaction}
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Transaction'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
