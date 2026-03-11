import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { AppLayout } from '../components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Plus, Search, Building2, Mail, Phone, MapPin, Edit, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../config/api';
import { toast } from 'sonner';
import { TraceLoader } from '../components/TraceLoader';

interface Supplier {
  id: string;
  name: string;
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

export function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState<Partial<Supplier>>({});
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Supplier>>({});
  const [loading, setLoading] = useState(true);
  const [gstinLoading, setGstinLoading] = useState(false);
  const [gstinLookupLoading, setGstinLookupLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteSupplier, setDeleteSupplier] = useState<Supplier | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { accessToken, deviceId } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const apiUrl = API_URL;
  const currentProfile = JSON.parse(localStorage.getItem('currentProfile') || '{}');
  const profileId = currentProfile?.id;

  const suppliersCacheKey = profileId ? `cache:suppliers:${profileId}` : null;
  const SUPPLIERS_CACHE_TTL_MS = 60 * 1000;

  const readSuppliersCache = () => {
    if (!suppliersCacheKey) return null;
    try {
      const raw = sessionStorage.getItem(suppliersCacheKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const ts = Number(parsed?.ts || 0);
      const data = Array.isArray(parsed?.data) ? parsed.data : null;
      if (!data || !ts) return null;
      return { ts, data } as { ts: number; data: Supplier[] };
    } catch {
      return null;
    }
  };

  const writeSuppliersCache = (data: Supplier[]) => {
    if (!suppliersCacheKey) return;
    try {
      sessionStorage.setItem(suppliersCacheKey, JSON.stringify({ ts: Date.now(), data }));
    } catch {
      // ignore
    }
  };

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
    if (!suppliersCacheKey) return;
    try {
      sessionStorage.removeItem(suppliersCacheKey);
    } catch {
      // ignore
    }
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

  useEffect(() => {
    const st: any = (location as any)?.state;
    if (st?.openCreateDialog) {
      setShowCreateDialog(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (searchTerm) {
      setFilteredSuppliers(
        suppliers.filter(s =>
          s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.phone?.includes(searchTerm)
        )
      );
    } else {
      setFilteredSuppliers(suppliers);
    }
  }, [searchTerm, suppliers]);

  const loadSuppliers = async ({ force = false }: { force?: boolean } = {}) => {
    if (!accessToken || !deviceId || !profileId) return;

    const cached = force ? null : readSuppliersCache();
    const isFresh = cached ? Date.now() - cached.ts < SUPPLIERS_CACHE_TTL_MS : false;

    if (cached?.data?.length) {
      setSuppliers(cached.data);
      if (isFresh) {
        setLoading(false);
        return;
      }
    }

    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/suppliers`, {
        headers: { 'Authorization': `Bearer ${accessToken}`, 'X-Device-ID': deviceId, 'X-Profile-ID': profileId },
      });
      const data = await response.json();
      if (!data.error) {
        setSuppliers(data);
        if (Array.isArray(data)) writeSuppliersCache(data);
      }
    } catch {
      toast.error('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
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
      toast.error('Supplier name is required');
      return;
    }

    try {
      const payload: any = { ...editFormData };
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
      }
    } catch {
      toast.error('Failed to update supplier');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name?.trim()) {
      toast.error('Supplier name is required');
      return;
    }

    try {
      const payload: any = { ...formData };
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
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <TraceLoader label="Loading suppliers..." />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
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
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="mt-4 md:mt-0" data-tour-id="cta-add-supplier">
                <Plus className="h-4 w-4 mr-2" />
                Add Supplier
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Supplier</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Supplier Name *</Label>
                    <Input
                      required
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter name"
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="supplier@email.com"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Opening Balance</Label>
                    <Input
                      value={String(formData.openingBalance ?? '')}
                      onChange={(e) => setFormData({ ...formData, openingBalance: Number(e.target.value || 0) })}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label>Opening Type</Label>
                    <Select
                      value={String(formData.openingBalanceType || 'cr')}
                      onValueChange={(value) => setFormData({ ...formData, openingBalanceType: value as 'dr' | 'cr' })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="CR" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cr">CR (Payable)</SelectItem>
                        <SelectItem value="dr">DR (Receivable)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Phone</Label>
                    <Input
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+91 99999 99999"
                    />
                  </div>
                  <div>
                    <Label>GSTIN</Label>
                    <Input
                      value={formData.gstin || ''}
                      onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                      onBlur={() => {
                        void handleGstinLookupAutofill('create');
                      }}
                      placeholder="22AAAAA0000A1Z5"
                    />
                    {gstinLookupLoading ? (
                      <div className="text-xs text-muted-foreground mt-1">Fetching GST details...</div>
                    ) : null}
                  </div>
                </div>
                <div>
                  <Label>PAN</Label>
                  <Input
                    value={formData.pan || ''}
                    onChange={(e) => setFormData({ ...formData, pan: e.target.value })}
                    placeholder="AAAAA0000A"
                  />
                </div>
                <div>
                  <Label>Address</Label>
                  <Textarea
                    value={formData.address || ''}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Enter supplier address"
                    rows={3}
                  />
                </div>

                <div>
                  <Label>Logo</Label>
                  <div className="flex items-center gap-3">
                    <input
                      id="supplier-logo-create"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const dataUrl = await fileToDataUrl(file);
                          setFormData((prev) => ({ ...prev, logoDataUrl: dataUrl }));
                          const url = await uploadLogoToCloudinary(dataUrl);
                          setFormData((prev) => ({ ...prev, logoUrl: url }));
                        } catch {
                          toast.error('Failed to upload logo');
                        }
                      }}
                    />
                    <Button type="button" variant="outline" asChild>
                      <label htmlFor="supplier-logo-create" style={{ cursor: 'pointer' }}>
                        {formData.logoUrl || formData.logoDataUrl ? 'Change Logo' : 'Upload Logo'}
                      </label>
                    </Button>
                    {!!(formData.logoUrl || formData.logoDataUrl) && (
                      <img
                        src={String(formData.logoUrl || formData.logoDataUrl)}
                        alt="Logo"
                        className="h-10 w-10 rounded border object-contain bg-white"
                      />
                    )}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Bank Name</Label>
                    <Input
                      value={formData.bankName || ''}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      placeholder="Bank name"
                    />
                  </div>
                  <div>
                    <Label>Branch</Label>
                    <Input
                      value={formData.bankBranch || ''}
                      onChange={(e) => setFormData({ ...formData, bankBranch: e.target.value })}
                      placeholder="Branch"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Account Number</Label>
                    <Input
                      value={formData.accountNumber || ''}
                      onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                      placeholder="Account number"
                    />
                  </div>
                  <div>
                    <Label>IFSC Code</Label>
                    <Input
                      value={formData.ifscCode || ''}
                      onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value })}
                      placeholder="IFSC"
                    />
                  </div>
                </div>

                <div>
                  <Label>UPI ID</Label>
                  <Input
                    value={formData.upiId || ''}
                    onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                    placeholder="supplier@upi"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="button" variant="secondary" onClick={handleCreateByGstin} disabled={gstinLoading}>
                    {gstinLoading ? 'Creating...' : 'Create via GSTIN'}
                  </Button>
                  <Button type="submit">Add Supplier</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

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

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditClick(supplier)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => openDeleteDialog(supplier)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Delete supplier"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Supplier</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateSupplier} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Supplier Name *</Label>
                  <Input
                    required
                    value={editFormData.name || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    placeholder="Enter name"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={editFormData.email || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    placeholder="supplier@email.com"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Opening Balance</Label>
                  <Input
                    value={String(editFormData.openingBalance ?? '')}
                    onChange={(e) => setEditFormData({ ...editFormData, openingBalance: Number(e.target.value || 0) })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label>Opening Type</Label>
                  <Select
                    value={String(editFormData.openingBalanceType || 'cr')}
                    onValueChange={(value) => setEditFormData({ ...editFormData, openingBalanceType: value as 'dr' | 'cr' })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="CR" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cr">CR (Payable)</SelectItem>
                      <SelectItem value="dr">DR (Receivable)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={editFormData.phone || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    placeholder="+91 99999 99999"
                  />
                </div>
                <div>
                  <Label>GSTIN</Label>
                  <Input
                    value={editFormData.gstin || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, gstin: e.target.value })}
                    onBlur={() => {
                      void handleGstinLookupAutofill('edit');
                    }}
                    placeholder="22AAAAA0000A1Z5"
                  />
                  {gstinLookupLoading ? (
                    <div className="text-xs text-muted-foreground mt-1">Fetching GST details...</div>
                  ) : null}
                </div>
              </div>
              <div>
                <Label>PAN</Label>
                <Input
                  value={editFormData.pan || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, pan: e.target.value })}
                  placeholder="AAAAA0000A"
                />
              </div>
              <div>
                <Label>Address</Label>
                <Textarea
                  value={editFormData.address || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                  placeholder="Enter supplier address"
                  rows={3}
                />
              </div>

              <div>
                <Label>Logo</Label>
                <div className="flex items-center gap-3">
                  <input
                    id="supplier-logo-edit"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const dataUrl = await fileToDataUrl(file);
                        setEditFormData((prev) => ({ ...prev, logoDataUrl: dataUrl }));
                        const url = await uploadLogoToCloudinary(dataUrl);
                        setEditFormData((prev) => ({ ...prev, logoUrl: url }));
                      } catch {
                        toast.error('Failed to upload logo');
                      }
                    }}
                  />
                  <Button type="button" variant="outline" asChild>
                    <label htmlFor="supplier-logo-edit" style={{ cursor: 'pointer' }}>
                      {editFormData.logoUrl || editFormData.logoDataUrl ? 'Change Logo' : 'Upload Logo'}
                    </label>
                  </Button>
                  {!!(editFormData.logoUrl || editFormData.logoDataUrl) && (
                    <img
                      src={String(editFormData.logoUrl || editFormData.logoDataUrl)}
                      alt="Logo"
                      className="h-10 w-10 rounded border object-contain bg-white"
                    />
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Bank Name</Label>
                  <Input
                    value={editFormData.bankName || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, bankName: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Branch</Label>
                  <Input
                    value={editFormData.bankBranch || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, bankBranch: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Account Number</Label>
                  <Input
                    value={editFormData.accountNumber || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, accountNumber: e.target.value })}
                  />
                </div>
                <div>
                  <Label>IFSC Code</Label>
                  <Input
                    value={editFormData.ifscCode || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, ifscCode: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>UPI ID</Label>
                <Input
                  value={editFormData.upiId || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, upiId: e.target.value })}
                  placeholder="supplier@upi"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                  Cancel
                </Button>
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
    </AppLayout>
  );
}
