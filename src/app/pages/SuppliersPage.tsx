import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Plus, Search, Building2, Mail, Phone, MapPin, Edit, ChevronLeft, ChevronRight, Trash2, Info, BookOpen, BarChart, FileSpreadsheet, Clock, Landmark } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { API_URL, mkCacheKey } from '../config/api';
import { usePageRefresh } from '../hooks/usePageRefresh';
import {
  hasContactErrors,
  normalizeEmail,
  normalizeGstin,
  normalizePhone,
  validateContactFields,
} from '../utils/contactValidation';
import { PhoneInput, EmailInput, GstinInput, PanInput, AccountNumberInput, IfscInput, UpiInput, AddressInput } from '../components/FormattedInputs';
import { toast } from 'sonner';
import { TraceLoader } from '../components/TraceLoader';
import { CustomersPageSkeleton } from '../components/PageSkeleton';
import { MobileFormSheet, MobileFormSection, MobileFormActions } from '../components/MobileFormSheet';
import { useCurrentProfile } from '../hooks/useCurrentProfile';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '../components/ui/dropdown-menu';

interface Supplier {
  id: string;
  name: string;
  ownerName?: string;
  email?: string;
  phone?: string;
  logoDataUrl?: string | null;
  logoUrl?: string | null;
  address?: string;
  gstin?: string;
  pan?: string;
  bankName?: string;
  bankBranch?: string;
  accountNumber?: string;
  ifscCode?: string;
  upiId?: string;
  openingBalance?: number;
  openingBalanceType?: 'dr' | 'cr';
}

function readSuppliersCacheSync(): Supplier[] {
  return [];
}

export function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState<Partial<Supplier>>({});
  const [formErrors, setFormErrors] = useState<{ gstin?: string; phone?: string; email?: string }>({});
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Supplier>>({});
  const [editFormErrors, setEditFormErrors] = useState<{ gstin?: string; phone?: string; email?: string }>({});
  const [loading, setLoading] = useState(true);
  const [supplierBalances, setSupplierBalances] = useState<Record<string, number>>({});
  const [gstinLoading, setGstinLoading] = useState(false);
  const [gstinLookupLoading, setGstinLookupLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteSupplier, setDeleteSupplier] = useState<Supplier | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { accessToken, deviceId } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { profileId } = useCurrentProfile();

  const apiUrl = API_URL;

  // Reset all state when profile switches to prevent data bleed
  useEffect(() => {
    setSuppliers([]);
    setFilteredSuppliers([]);
    setSearchTerm('');
    setShowCreateDialog(false);
    setFormData({});
    setFormErrors({});
    setShowEditDialog(false);
    setEditingSupplierId(null);
    setEditFormData({});
    setEditFormErrors({});
    setDeleteDialogOpen(false);
    setDeleteSupplier(null);
    setLoading(true);
  }, [profileId]);

  const handleGstinLookupAutofill = async (target: 'create' | 'edit') => {
    if (!accessToken || !deviceId || !profileId) return;
    const current = target === 'edit' ? editFormData : formData;
    const gstin = String(current?.gstin || '').trim().toUpperCase().replace(/\s+/g, '');
    if (!gstin) return;
    if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/.test(gstin)) return;

    setGstinLookupLoading(true);
    try {
      const response = await fetch(`${apiUrl}/suppliers/gstin/lookup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-Device-ID': deviceId,
          'X-Profile-ID': profileId,
        },
        body: JSON.stringify({ gstin }),
      });

      const rawText = await response.text().catch(() => '');
      const data = (() => {
        try {
          return rawText ? JSON.parse(rawText) : null;
        } catch {
          return null;
        }
      })();
      if (!response.ok || data?.error) {
        const serverMsg = String(data?.error || data?.message || '').trim();
        const hint = response.status === 404 ? 'GSTIN lookup endpoint not available on server (deploy backend / restart server).' : '';
        toast.error(serverMsg || hint || `GSTIN lookup failed (${response.status})`);
        return;
      }

      const apply = (prev: Partial<Supplier>) => {
        const next: Partial<Supplier> = { ...prev };
        if (!String(next.name || '').trim() && String(data?.name || '').trim()) next.name = String(data.name);
        if (!String(next.ownerName || '').trim() && String(data?.ownerName || '').trim()) next.ownerName = String(data.ownerName);
        if (!String(next.pan || '').trim() && String(data?.pan || '').trim()) next.pan = String(data.pan);
        if (!String(next.address || '').trim() && String(data?.billingAddress || data?.address || '').trim()) {
          next.address = String(data?.billingAddress || data?.address || '');
        }
        return next;
      };

      if (target === 'edit') {
        setEditFormData((prev) => apply(prev));
      } else {
        setFormData((prev) => apply(prev));
      }
    } catch (e: any) {
      toast.error(e?.message || 'GSTIN lookup failed');
    } finally {
      setGstinLookupLoading(false);
    }
  };

  const clearSuppliersCache = () => {
    // no-op: cache removed
  };

  const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.onload = () => resolve(String(reader.result || ''));
      reader.readAsDataURL(file);
    });

  const uploadLogoToCloudinary = async (dataUrl: string) => {
    if (!accessToken) throw new Error('Not authenticated');
    if (!profileId) throw new Error('Select a business profile first');
    const res = await fetch(`${apiUrl}/uploads/logo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'X-Device-ID': deviceId,
        'X-Profile-ID': profileId,
      },
      body: JSON.stringify({ dataUrl, folder: `hukum/logos/${profileId}/suppliers` }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || 'Failed to upload logo');
    }
    const url = String(data?.url || '').trim();
    if (!url) throw new Error('Failed to upload logo');
    return url;
  };

  useEffect(() => {
    if (!accessToken || !deviceId || !profileId) return;
    loadSuppliers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, deviceId, profileId]);

  usePageRefresh({
    onRefresh: () => { if (accessToken && deviceId && profileId) loadSuppliers({ force: true }); },
    staleTtlMs: 30_000,
    enabled: !!profileId && !!accessToken,
  });

  useEffect(() => {
    const st: any = (location as any)?.state;
    if (st?.openCreateDialog) {
      setShowCreateDialog(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let filtered = [...suppliers];
    
    if (searchTerm) {
      filtered = filtered.filter(s =>
        s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.phone?.includes(searchTerm)
      );
    }

    if (filterStatus === 'unpaid') {
      filtered = filtered.filter(s => (supplierBalances[s.id] || 0) > 0);
    }

    setFilteredSuppliers(filtered);
  }, [searchTerm, suppliers, filterStatus, supplierBalances]);

  const loadSuppliers = async ({ force = false }: { force?: boolean } = {}) => {
    if (!accessToken || !deviceId || !profileId) return;
    setLoading(true);

    try {
      const response = await fetch(`${apiUrl}/suppliers`, {
        headers: { 'Authorization': `Bearer ${accessToken}`, 'X-Device-ID': deviceId, 'X-Profile-ID': profileId },
      });
      const data = await response.json();
      if (!data.error) {
        setSuppliers(data);
        // Load balances after suppliers to show individual payable
        loadOutstandingBalances();
      }
    } catch {
      if (!suppliers.length) toast.error('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  const loadOutstandingBalances = async () => {
    if (!accessToken || !profileId) return;
    try {
      const res = await fetch(`${apiUrl}/payments/outstanding?partyType=supplier`, {
        headers: { Authorization: `Bearer ${accessToken}`, 'X-Device-ID': deviceId, 'X-Profile-ID': profileId },
      });
      const data = await res.json();
      if (!res.ok) return;

      const balances: Record<string, number> = {};
      (data.documents || []).forEach((d: any) => {
        const sid = d.party?.id;
        if (sid) {
          balances[sid] = (balances[sid] || 0) + Number(d.remaining || 0);
        }
      });
      setSupplierBalances(balances);
    } catch {
      // silent fail for balances
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const handleEditClick = (supplier: Supplier) => {
    setEditingSupplierId(supplier.id);
    setEditFormData({ ...supplier });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (supplier: Supplier) => {
    setDeleteSupplier(supplier);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteSupplier?.id) return;
    if (!accessToken) {
      toast.error('Not authenticated');
      return;
    }
    if (!profileId) {
      toast.error('Select a business profile first');
      return;
    }

    setDeleteLoading(true);
    try {
      const response = await fetch(`${apiUrl}/suppliers/${deleteSupplier.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Device-ID': deviceId,
          'X-Profile-ID': profileId,
        },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to delete supplier');
      }

      setSuppliers((prev) => prev.filter((s) => s.id !== deleteSupplier.id));
      setFilteredSuppliers((prev) => prev.filter((s) => s.id !== deleteSupplier.id));
      clearSuppliersCache();
      toast.success('Supplier deleted');
      window.dispatchEvent(new CustomEvent('dashboardRefresh'));
      setDeleteDialogOpen(false);
      setDeleteSupplier(null);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to delete supplier');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleUpdateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingSupplierId) return;

    if (!editFormData.name?.trim()) {
      toast.error('Party name is required');
      return;
    }

    // Owner name is now optional

    const errs = validateContactFields({
      gstin: String(editFormData.gstin || ''),
      phone: String(editFormData.phone || ''),
      email: String(editFormData.email || ''),
    });
    setEditFormErrors(errs);
    if (hasContactErrors(errs)) {
      toast.error('Please fix invalid contact details');
      return;
    }

    try {
      const payload: any = { ...editFormData };

      const addressValue = String(payload.address || '').trim();
      payload.billingAddress = addressValue || undefined;
      payload.shippingAddress = addressValue || undefined;
      payload.address = addressValue || undefined;

      if (typeof payload.email === 'string') payload.email = normalizeEmail(payload.email) || undefined;
      if (typeof payload.phone === 'string') payload.phone = normalizePhone(payload.phone) || undefined;
      if (typeof payload.gstin === 'string') payload.gstin = normalizeGstin(payload.gstin) || undefined;
      if (payload.logoUrl && !String(payload.logoUrl).trim()) payload.logoUrl = null;
      delete payload.logoDataUrl;
      const response = await fetch(`${apiUrl}/suppliers/${editingSupplierId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-Device-ID': deviceId,
          'X-Profile-ID': profileId,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success('Supplier updated successfully!');
        setSuppliers(prev => prev.map(s => (s.id === data.id ? data : s)));
        setShowEditDialog(false);
        setEditingSupplierId(null);
        setEditFormData({});
        window.dispatchEvent(new CustomEvent('dashboardRefresh'));
      }
    } catch {
      toast.error('Failed to update supplier');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name?.trim()) {
      toast.error('Party name is required');
      return;
    }

    // Owner name is now optional

    const errs = validateContactFields({
      gstin: String(formData.gstin || ''),
      phone: String(formData.phone || ''),
      email: String(formData.email || ''),
    });
    setFormErrors(errs);
    if (hasContactErrors(errs)) {
      toast.error('Please fix invalid contact details');
      return;
    }

    try {
      const payload: any = { ...formData };

      const addressValue = String(payload.address || '').trim();
      payload.billingAddress = addressValue || undefined;
      payload.shippingAddress = addressValue || undefined;
      payload.address = addressValue || undefined;
      if (typeof payload.email === 'string') payload.email = normalizeEmail(payload.email) || undefined;
      if (typeof payload.phone === 'string') payload.phone = normalizePhone(payload.phone) || undefined;
      if (typeof payload.gstin === 'string') payload.gstin = normalizeGstin(payload.gstin) || undefined;
      if (payload.logoUrl && !String(payload.logoUrl).trim()) payload.logoUrl = null;
      delete payload.logoDataUrl;
      const response = await fetch(`${apiUrl}/suppliers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-Device-ID': deviceId,
          'X-Profile-ID': profileId,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success('Supplier created successfully!');
        setSuppliers([...suppliers, data]);
        setShowCreateDialog(false);
        setFormData({});
        window.dispatchEvent(new CustomEvent('dashboardRefresh'));

        const st: any = (location as any)?.state;
        if (st?.returnTo) {
          navigate(String(st.returnTo));
        }
      }
    } catch {
      toast.error('Failed to create supplier');
    }
  };

  const handleCreateByGstin = async () => {
    const gstin = String(formData.gstin || '').trim().toUpperCase().replace(/\s+/g, '');
    if (!gstin) {
      toast.error('GSTIN is required');
      return;
    }
    if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/.test(gstin)) {
      toast.error('Invalid GSTIN format');
      return;
    }

    setGstinLoading(true);
    try {
      const response = await fetch(`${apiUrl}/suppliers/gstin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-Device-ID': deviceId,
          'X-Profile-ID': profileId,
        },
        body: JSON.stringify({ gstin }),
      });

      const data = await response.json();
      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success('Supplier created via GSTIN!');
        setSuppliers([...suppliers, data]);
        setShowCreateDialog(false);
        setFormData({});
        window.dispatchEvent(new CustomEvent('dashboardRefresh'));

        const st: any = (location as any)?.state;
        if (st?.returnTo) {
          navigate(String(st.returnTo));
        }
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to create supplier via GSTIN');
    } finally {
      setGstinLoading(false);
    }
  };

  if (loading) {
    return <CustomersPageSkeleton />;
  }

  return (
    <>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Delete Supplier</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                This will permanently delete
                <span className="font-medium text-foreground"> {deleteSupplier?.name || 'this supplier'}</span>.
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleteLoading}>
                  Cancel
                </Button>
                <Button type="button" variant="destructive" onClick={confirmDelete} disabled={deleteLoading}>
                  {deleteLoading ? 'Deleting…' : 'Delete'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/customers')}
                aria-label="Go to Customers"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-3xl font-bold text-foreground">Suppliers</h1>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/customers')}
                aria-label="Go to Customers"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
            <p className="text-muted-foreground mt-1">Parties</p>
          </div>
          <Button className="mt-4 md:mt-0" data-tour-id="cta-add-supplier" onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Supplier
          </Button>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Supplier</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="s-name">Party Name *</Label>
                    <Input id="s-name" required value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Enter name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="s-owner">Owner Name <span className="text-muted-foreground font-normal ml-1">(Optional)</span></Label>
                    <Input id="s-owner" value={String(formData.ownerName || '')} onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })} placeholder="Owner / Proprietor" />
                  </div>
                </div>
                <EmailInput label="Email" value={formData.email || ''} onChange={(v) => setFormData({ ...formData, email: v })} placeholder="supplier@email.com" error={formErrors.email} />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Opening Balance</Label>
                    <Input value={String(formData.openingBalance ?? '')} onChange={(e) => setFormData({ ...formData, openingBalance: Number(e.target.value || 0) })} placeholder="0" inputMode="decimal" />
                  </div>
                  <div className="space-y-2">
                    <Label>Opening Type</Label>
                    <Select value={String(formData.openingBalanceType || 'cr')} onValueChange={(v) => setFormData({ ...formData, openingBalanceType: v as 'dr' | 'cr' })}>
                      <SelectTrigger><SelectValue placeholder="CR" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cr">CR (Payable)</SelectItem>
                        <SelectItem value="dr">DR (Receivable)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-4">
                  <PhoneInput label="Phone" value={formData.phone || ''} onChange={(v) => setFormData({ ...formData, phone: v })} error={formErrors.phone} />
                  <div className="space-y-2">
                    <GstinInput label="GSTIN" value={formData.gstin || ''} onChange={(v) => setFormData({ ...formData, gstin: v })} error={formErrors.gstin} onBlur={() => void handleGstinLookupAutofill('create')} />
                    {gstinLookupLoading && <div className="text-xs text-muted-foreground animate-pulse">Fetching GST details...</div>}
                  </div>
                  <PanInput label="PAN" value={formData.pan || ''} onChange={(v) => setFormData({ ...formData, pan: v })} />
                  <AddressInput label="Address" value={formData.address || ''} onChange={(v) => setFormData({ ...formData, address: v })} />
                </div>

                <div className="space-y-4 border-t pt-4">
                  <div className="flex items-center gap-4">
                    <input id="supplier-logo-create" type="file" accept="image/*" className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]; if (!file) return;
                        try {
                          const dataUrl = await fileToDataUrl(file);
                          setFormData((prev) => ({ ...prev, logoDataUrl: dataUrl }));
                          const url = await uploadLogoToCloudinary(dataUrl);
                          setFormData((prev) => ({ ...prev, logoUrl: url }));
                        } catch { toast.error('Failed to upload logo'); }
                      }}
                    />
                    <Button type="button" variant="outline" asChild>
                      <label htmlFor="supplier-logo-create" className="cursor-pointer">
                        {formData.logoUrl || formData.logoDataUrl ? 'Change Logo' : 'Upload Logo'}
                      </label>
                    </Button>
                    {!!(formData.logoUrl || formData.logoDataUrl) && (
                      <img src={String(formData.logoUrl || formData.logoDataUrl)} alt="Logo" className="h-10 w-10 rounded border object-contain bg-background" />
                    )}
                  </div>
                </div>

                <div className="space-y-4 border-t pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Bank Name</Label>
                      <Input value={formData.bankName || ''} onChange={(e) => setFormData({ ...formData, bankName: e.target.value })} placeholder="Bank name" />
                    </div>
                    <div className="space-y-2">
                      <Label>Branch</Label>
                      <Input value={formData.bankBranch || ''} onChange={(e) => setFormData({ ...formData, bankBranch: e.target.value })} placeholder="Branch" />
                    </div>
                  </div>
                  <AccountNumberInput label="Account Number" value={formData.accountNumber || ''} onChange={(v) => setFormData({ ...formData, accountNumber: v })} />
                  <IfscInput label="IFSC Code" value={formData.ifscCode || ''} onChange={(v) => setFormData({ ...formData, ifscCode: v })} />
                  <UpiInput label="UPI ID" value={formData.upiId || ''} onChange={(v) => setFormData({ ...formData, upiId: v })} />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t sticky bottom-0 bg-background">
                <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
                <Button type="button" variant="secondary" onClick={handleCreateByGstin} disabled={gstinLoading}>{gstinLoading ? 'Creating...' : 'Create via GSTIN'}</Button>
                <Button type="submit">Add Supplier</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search suppliers by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {filteredSuppliers.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {suppliers.length === 0 ? 'No suppliers yet' : 'No matching suppliers'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {suppliers.length === 0
                  ? 'Add your first supplier to get started'
                  : 'Try a different search term'}
              </p>
              {suppliers.length === 0 && (
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Supplier
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSuppliers.map((supplier) => (
              <Card key={supplier.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-3 justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center overflow-hidden border">
                        {supplier.logoUrl || supplier.logoDataUrl ? (
                          <img
                            src={String(supplier.logoUrl || supplier.logoDataUrl)}
                            alt="Logo"
                            className="h-full w-full object-contain bg-white"
                          />
                        ) : (
                          <Building2 className="h-6 w-6 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{supplier.name}</CardTitle>
                        {supplier.gstin && (
                          <p className="text-xs text-muted-foreground font-mono">GSTIN: {supplier.gstin}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            title="Supplier Insight"
                          >
                            <Info className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64">
                          <DropdownMenuLabel className="flex items-center justify-between">
                            <span>Supplier Insight</span>
                            <span className="text-[10px] font-normal px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">V1</span>
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          
                          <DropdownMenuItem 
                            className="cursor-pointer"
                            onClick={() => navigate(`/ledger?partyId=${supplier.id}&partyType=supplier`)}
                          >
                            <BookOpen className="h-4 w-4 mr-2 text-indigo-500" />
                            <span>Register Ledger</span>
                          </DropdownMenuItem>

                          <DropdownMenuItem 
                            className="cursor-pointer"
                            onClick={() => {
                              setSearchTerm(supplier.name);
                              setFilterStatus('unpaid');
                            }}
                          >
                            <Clock className="h-4 w-4 mr-2 text-orange-500" />
                            <span>Payable Analysis</span>
                          </DropdownMenuItem>

                          <DropdownMenuItem 
                            className="cursor-pointer"
                            onClick={() => navigate('/bank-accounts')}
                          >
                            <Landmark className="h-4 w-4 mr-2 text-blue-500" />
                            <span>Manage Bank Accounts</span>
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />
                          <div className="p-2 bg-muted/30 rounded-md m-1">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-1">Quick Stats</p>
                            <div className="flex justify-between items-center text-xs">
                              <span>Payable:</span>
                              <span className={Number(supplierBalances[supplier.id] || 0) > 0 ? 'text-red-600 font-bold' : 'text-green-600'}>
                                {formatCurrency(supplierBalances[supplier.id] || 0)}
                              </span>
                            </div>
                          </div>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditClick(supplier)}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => openDeleteDialog(supplier)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        aria-label="Delete supplier"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {supplier.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span className="truncate">{supplier.email}</span>
                    </div>
                  )}
                  {supplier.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{supplier.phone}</span>
                    </div>
                  )}
                  {supplier.address && (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 mt-0.5" />
                      <span className="line-clamp-2">{supplier.address}</span>
                    </div>
                  )}
                  {supplierBalances[supplier.id] > 0 && (
                    <div className="pt-2 mt-2 border-t flex justify-between items-center">
                      <span className="text-xs font-semibold text-red-600 uppercase tracking-wider">Payable</span>
                      <span className="text-sm font-bold text-red-600">{formatCurrency(supplierBalances[supplier.id])}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Supplier</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateSupplier} className="space-y-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-s-name">Party Name *</Label>
                    <Input id="edit-s-name" required value={editFormData.name || ''} onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })} placeholder="Enter name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-s-owner">Owner Name <span className="text-muted-foreground font-normal ml-1">(Optional)</span></Label>
                    <Input id="edit-s-owner" value={String(editFormData.ownerName || '')} onChange={(e) => setEditFormData({ ...editFormData, ownerName: e.target.value })} placeholder="Owner / Proprietor" />
                  </div>
                </div>
                <EmailInput label="Email" value={editFormData.email || ''} onChange={(v) => setEditFormData({ ...editFormData, email: v })} placeholder="supplier@email.com" error={editFormErrors.email} />
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-4">
                  <PhoneInput label="Phone" value={editFormData.phone || ''} onChange={(v) => setEditFormData({ ...editFormData, phone: v })} error={editFormErrors.phone} />
                  <div className="space-y-2">
                    <GstinInput label="GSTIN" value={editFormData.gstin || ''} onChange={(v) => setEditFormData({ ...editFormData, gstin: v })} error={editFormErrors.gstin} onBlur={() => void handleGstinLookupAutofill('edit')} />
                    {gstinLookupLoading && <div className="text-xs text-muted-foreground animate-pulse">Fetching GST details...</div>}
                  </div>
                  <PanInput label="PAN" value={editFormData.pan || ''} onChange={(v) => setEditFormData({ ...editFormData, pan: v })} />
                  <AddressInput label="Address" value={editFormData.address || ''} onChange={(v) => setEditFormData({ ...editFormData, address: v })} />
                </div>

                <div className="space-y-4 border-t pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Bank Name</Label>
                      <Input value={editFormData.bankName || ''} onChange={(e) => setEditFormData({ ...editFormData, bankName: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Branch</Label>
                      <Input value={editFormData.bankBranch || ''} onChange={(e) => setEditFormData({ ...editFormData, bankBranch: e.target.value })} />
                    </div>
                  </div>
                  <AccountNumberInput label="Account Number" value={editFormData.accountNumber || ''} onChange={(v) => setEditFormData({ ...editFormData, accountNumber: v })} />
                  <IfscInput label="IFSC Code" value={editFormData.ifscCode || ''} onChange={(v) => setEditFormData({ ...editFormData, ifscCode: v })} />
                  <UpiInput label="UPI ID" value={editFormData.upiId || ''} onChange={(v) => setEditFormData({ ...editFormData, upiId: v })} />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t sticky bottom-0 bg-background">
                <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
                <Button type="submit">Save Changes</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {filteredSuppliers.length > 0 && (
          <Card className="mt-6">
            <CardContent className="py-4">
              <p className="text-sm text-muted-foreground">
                Showing {filteredSuppliers.length} of {suppliers.length} suppliers
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
