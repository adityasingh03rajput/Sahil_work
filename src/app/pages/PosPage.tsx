import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { ShoppingCart, Receipt, Trash2, Plus, Minus } from 'lucide-react';
import { API_URL } from '../config/api';
import { useAuth } from '../contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import type { DocumentItem } from '../pdf/types';

export function PosPage() {
  const navigate = useNavigate();
  const { accessToken, deviceId } = useAuth();

  const currentProfile = useMemo(() => {
    try {
      const raw = localStorage.getItem('currentProfile');
      if (!raw) return {} as any;
      const parsed = JSON.parse(raw);
      return typeof parsed === 'string' ? JSON.parse(parsed) : parsed;
    } catch {
      return {} as any;
    }
  }, []);
  const profileId = currentProfile?.id;

  type ItemRow = {
    id: string;
    name: string;
    hsnSac?: string | null;
    unit: string;
    rate: number;
    sellingPrice?: number | null;
    discount?: number;
    cgst?: number;
    sgst?: number;
    igst?: number;
    description?: string | null;
  };

  type CustomerRow = {
    id: string;
    name: string;
    gstin?: string | null;
    billingAddress?: string | null;
    phone?: string | null;
    email?: string | null;
  };

  type CartLine = DocumentItem & { _key: string; itemId?: string | null };

  const [items, setItems] = useState<ItemRow[]>([]);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [itemQuery, setItemQuery] = useState('');
  const [customerId, setCustomerId] = useState<string>('walk-in');

  const [cart, setCart] = useState<CartLine[]>([]);
  const [markPaid, setMarkPaid] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi' | 'card' | 'bank'>('cash');

  const [autoRoundOff, setAutoRoundOff] = useState(true);
  const [roundOff, setRoundOff] = useState(0);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const apiUrl = API_URL;

  const loadData = async () => {
    if (!accessToken || !deviceId || !profileId) return;
    setLoading(true);
    try {
      const [itemsRes, customersRes] = await Promise.all([
        fetch(`${apiUrl}/items`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'X-Device-ID': deviceId,
            'X-Profile-ID': profileId,
          },
        }),
        fetch(`${apiUrl}/customers`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'X-Device-ID': deviceId,
            'X-Profile-ID': profileId,
          },
        }),
      ]);

      const itemsData = await itemsRes.json().catch(() => []);
      const customersData = await customersRes.json().catch(() => []);

      if (!itemsRes.ok) throw new Error(itemsData?.error || 'Failed to load items');
      if (!customersRes.ok) throw new Error(customersData?.error || 'Failed to load customers');

      setItems(Array.isArray(itemsData) ? itemsData : []);
      setCustomers(Array.isArray(customersData) ? customersData : []);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load POS data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, deviceId, profileId]);

  const filteredItems = useMemo(() => {
    const q = String(itemQuery || '').trim().toLowerCase();
    if (!q) return items.slice(0, 20);
    return items
      .filter((it) => String(it.name || '').toLowerCase().includes(q) || String(it.hsnSac || '').toLowerCase().includes(q))
      .slice(0, 20);
  }, [items, itemQuery]);

  const computeLineTotal = (line: DocumentItem) => {
    const qty = Number(line.quantity || 0);
    const rate = Number(line.rate || 0);
    const disc = Number(line.discount || 0);
    const taxable = Math.max(0, qty * rate - (qty * rate * disc) / 100);
    const cgstAmt = (taxable * Number(line.cgst || 0)) / 100;
    const sgstAmt = (taxable * Number(line.sgst || 0)) / 100;
    const igstAmt = (taxable * Number(line.igst || 0)) / 100;
    return Number((taxable + cgstAmt + sgstAmt + igstAmt).toFixed(2));
  };

  const totals = useMemo(() => {
    const itemsWithTotals = cart.map((c) => ({ ...c, total: computeLineTotal(c) }));
    const itemsTotal = itemsWithTotals.reduce((sum, x) => sum + Number(x.total || 0), 0);

    const totalCgst = itemsWithTotals.reduce((sum, item) => {
      const qty = Number(item.quantity || 0);
      const rate = Number(item.rate || 0);
      const disc = Number(item.discount || 0);
      const taxable = Math.max(0, qty * rate - (qty * rate * disc) / 100);
      return sum + (taxable * Number(item.cgst || 0)) / 100;
    }, 0);
    const totalSgst = itemsWithTotals.reduce((sum, item) => {
      const qty = Number(item.quantity || 0);
      const rate = Number(item.rate || 0);
      const disc = Number(item.discount || 0);
      const taxable = Math.max(0, qty * rate - (qty * rate * disc) / 100);
      return sum + (taxable * Number(item.sgst || 0)) / 100;
    }, 0);
    const totalIgst = itemsWithTotals.reduce((sum, item) => {
      const qty = Number(item.quantity || 0);
      const rate = Number(item.rate || 0);
      const disc = Number(item.discount || 0);
      const taxable = Math.max(0, qty * rate - (qty * rate * disc) / 100);
      return sum + (taxable * Number(item.igst || 0)) / 100;
    }, 0);

    const subtotal = itemsTotal;
    const grandTotal = Number((subtotal + Number(roundOff || 0)).toFixed(2));
    return {
      itemsWithTotals,
      itemsTotal: Number(itemsTotal.toFixed(2)),
      subtotal: Number(subtotal.toFixed(2)),
      grandTotal,
      totalCgst: Number(totalCgst.toFixed(2)),
      totalSgst: Number(totalSgst.toFixed(2)),
      totalIgst: Number(totalIgst.toFixed(2)),
    };
  }, [cart, roundOff]);

  useEffect(() => {
    if (!autoRoundOff) return;
    const rounded = Math.round(totals.subtotal);
    const next = Number((rounded - totals.subtotal).toFixed(2));
    setRoundOff(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRoundOff, totals.subtotal]);

  const addToCart = (it: ItemRow) => {
    setCart((prev) => {
      const existing = prev.find((x) => x.itemId === it.id);
      if (existing) {
        return prev.map((x) => (x.itemId === it.id ? { ...x, quantity: Number(x.quantity || 0) + 1 } : x));
      }

      const line: CartLine = {
        _key: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        itemId: it.id,
        name: it.name,
        hsnSac: it.hsnSac || null,
        description: it.description || null,
        sku: null,
        servicePeriod: null,
        quantity: 1,
        unit: it.unit || 'pcs',
        rate: Number(it.sellingPrice ?? it.rate ?? 0),
        currency: 'INR',
        discount: Number(it.discount ?? 0),
        cgst: Number(it.cgst ?? 0),
        sgst: Number(it.sgst ?? 0),
        igst: Number(it.igst ?? 0),
        total: 0,
      };
      return [line, ...prev];
    });
  };

  const updateLine = (key: string, patch: Partial<CartLine>) => {
    setCart((prev) => prev.map((x) => (x._key === key ? { ...x, ...patch } : x)));
  };

  const removeLine = (key: string) => {
    setCart((prev) => prev.filter((x) => x._key !== key));
  };

  const selectedCustomer = useMemo(() => {
    if (customerId === 'walk-in') return null;
    return customers.find((c) => c.id === customerId) || null;
  }, [customerId, customers]);

  const formatMoney = (v: number) => `₹${Number(v || 0).toFixed(2)}`;

  const checkout = async () => {
    if (!accessToken || !deviceId || !profileId) return;
    if (!cart.length) {
      toast.error('Add at least one item');
      return;
    }
    if (cart.some((x) => !String(x.name || '').trim())) {
      toast.error('All cart items must have a name');
      return;
    }

    setCheckoutLoading(true);
    try {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const date = `${yyyy}-${mm}-${dd}`;

      const payload = {
        type: 'invoice',
        customerId: selectedCustomer?.id || null,
        supplierId: null,
        customerName: selectedCustomer?.name || 'Walk-in Customer',
        customerAddress: selectedCustomer?.billingAddress || null,
        customerGstin: selectedCustomer?.gstin || null,
        customerMobile: selectedCustomer?.phone || null,
        customerEmail: selectedCustomer?.email || null,
        date,
        dueDate: '',
        items: totals.itemsWithTotals.map((x) => ({
          name: x.name,
          hsnSac: x.hsnSac || null,
          description: x.description || null,
          sku: x.sku || null,
          servicePeriod: x.servicePeriod || null,
          quantity: Number(x.quantity || 0),
          unit: x.unit || null,
          rate: Number(x.rate || 0),
          currency: 'INR',
          discount: Number(x.discount || 0),
          cgst: Number(x.cgst || 0),
          sgst: Number(x.sgst || 0),
          igst: Number(x.igst || 0),
          total: Number(x.total || 0),
        })),
        transportCharges: 0,
        additionalCharges: 0,
        packingHandlingCharges: 0,
        tcs: 0,
        roundOff: Number(roundOff || 0),
        notes: 'Created via POS',
        internalNotes: 'Created via POS',
        termsConditions: '',
        paymentStatus: markPaid ? 'paid' : 'unpaid',
        paymentMode: markPaid ? paymentMode : null,
        status: 'final',
        itemsTotal: totals.itemsTotal,
        subtotal: totals.subtotal,
        grandTotal: totals.grandTotal,
        totalCgst: totals.totalCgst,
        totalSgst: totals.totalSgst,
        totalIgst: totals.totalIgst,
      };

      const res = await fetch(`${apiUrl}/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          'X-Device-ID': deviceId,
          'X-Profile-ID': profileId,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to create invoice');
      }

      toast.success('Invoice created');
      setCart([]);
      setItemQuery('');
      setCustomerId('walk-in');
      setMarkPaid(false);
      navigate(`/documents/edit/${data.id}`);
    } catch (e: any) {
      toast.error(e?.message || 'Checkout failed');
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <>
      <div className="p-4 sm:p-6 max-w-5xl mx-auto">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Vyapar POS</h1>
              <Badge variant="secondary">POS</Badge>
            </div>
            <p className="text-muted-foreground mt-1">Fast billing for counter sales (items, cart, checkout → invoice)</p>
          </div>
          <Button variant="outline" onClick={() => void loadData()} disabled={loading}>
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader className="border-b bg-muted/40">
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Billing
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div>
                <Label>Customer</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="walk-in">Walk-in Customer</SelectItem>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Payment</Label>
                  <Select value={markPaid ? 'paid' : 'unpaid'} onValueChange={(v) => setMarkPaid(v === 'paid')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unpaid">Unpaid</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Mode</Label>
                  <Select value={paymentMode} onValueChange={(v) => setPaymentMode(v as any)} disabled={!markPaid}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="bank">Bank</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Round Off</Label>
                  <Select value={autoRoundOff ? 'auto' : 'manual'} onValueChange={(v) => setAutoRoundOff(v === 'auto')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Value</Label>
                  <Input
                    value={String(roundOff)}
                    onChange={(e) => setRoundOff(Number(e.target.value || 0))}
                    disabled={autoRoundOff}
                  />
                </div>
              </div>

              <div className="rounded-md border p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{formatMoney(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Round Off</span>
                  <span className="font-medium">{formatMoney(roundOff)}</span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex justify-between">
                  <span className="font-semibold">Grand Total</span>
                  <span className="font-semibold">{formatMoney(totals.grandTotal)}</span>
                </div>
              </div>

              <Button className="w-full" onClick={checkout} disabled={checkoutLoading || !cart.length}>
                {checkoutLoading ? 'Creating Invoice…' : 'Checkout & Create Invoice'}
              </Button>
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardHeader className="border-b bg-muted/40">
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Cart
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div>
                <Label>Search items</Label>
                <Input value={itemQuery} onChange={(e) => setItemQuery(e.target.value)} placeholder="Search by name or HSN..." />
                <div className="mt-2 rounded-md border divide-y max-h-56 overflow-y-auto">
                  {filteredItems.length ? (
                    filteredItems.map((it) => (
                      <div
                        key={it.id}
                        className="px-3 py-2 hover:bg-muted flex items-center justify-between gap-3"
                      >
                        <button
                          type="button"
                          className="flex-1 min-w-0 text-left"
                          onClick={() => addToCart(it)}
                        >
                          <div className="font-medium truncate">{it.name}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {it.hsnSac ? `HSN: ${it.hsnSac}` : ''}{it.unit ? ` • Unit: ${it.unit}` : ''}
                          </div>
                        </button>
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-medium">{formatMoney(Number(it.sellingPrice ?? it.rate ?? 0))}</div>
                          <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={() => addToCart(it)}>
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-sm text-muted-foreground">No items found</div>
                  )}
                </div>
              </div>

              {cart.length === 0 ? (
                <div className="text-sm text-muted-foreground">Cart is empty. Add items from the list above.</div>
              ) : (
                <div className="space-y-3">
                  {totals.itemsWithTotals.map((line) => (
                    <div key={line._key} className="rounded-md border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold truncate">{line.name}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {line.hsnSac ? `HSN: ${line.hsnSac}` : ''}{line.unit ? ` • ${line.unit}` : ''}
                          </div>
                        </div>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeLine(line._key)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-2">
                        <div>
                          <Label className="text-xs">Qty</Label>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateLine(line._key, { quantity: Math.max(1, Number(line.quantity || 1) - 1) })}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <Input
                              value={String(line.quantity)}
                              onChange={(e) => updateLine(line._key, { quantity: Math.max(1, Number(e.target.value || 1)) })}
                              className="h-8"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateLine(line._key, { quantity: Number(line.quantity || 0) + 1 })}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">Rate</Label>
                          <Input
                            value={String(line.rate)}
                            onChange={(e) => updateLine(line._key, { rate: Number(e.target.value || 0) })}
                            className="h-8"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Disc %</Label>
                          <Input
                            value={String(line.discount || 0)}
                            onChange={(e) => updateLine(line._key, { discount: Number(e.target.value || 0) })}
                            className="h-8"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">GST %</Label>
                          <div className="grid grid-cols-3 gap-1">
                            <Input
                              value={String(line.cgst || 0)}
                              onChange={(e) => updateLine(line._key, { cgst: Number(e.target.value || 0) })}
                              className="h-8"
                            />
                            <Input
                              value={String(line.sgst || 0)}
                              onChange={(e) => updateLine(line._key, { sgst: Number(e.target.value || 0) })}
                              className="h-8"
                            />
                            <Input
                              value={String(line.igst || 0)}
                              onChange={(e) => updateLine(line._key, { igst: Number(e.target.value || 0) })}
                              className="h-8"
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">Line Total</Label>
                          <div className="h-8 flex items-center font-semibold">{formatMoney(Number(line.total || 0))}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
