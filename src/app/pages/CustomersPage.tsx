import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Plus, Search, User, Mail, Phone, MapPin, Edit, ChevronLeft, ChevronRight, Trash2, Info, BookOpen, BarChart, FileSpreadsheet, ExternalLink, Clock, Landmark } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { API_URL, mkCacheKey } from '../config/api';
import { usePageRefresh } from '../hooks/usePageRefresh';
import { INDIAN_STATES } from '../utils/indianStates';
import {
  hasContactErrors,
  normalizeEmail,
  normalizeGstin,
  normalizePhone,
  validateContactFields,
} from '../utils/contactValidation';
import { PhoneInput, EmailInput, GstinInput, PanInput, PostalCodeInput, AddressInput } from '../components/FormattedInputs';
import { toast } from 'sonner';
import { CustomersPageSkeleton } from '../components/PageSkeleton';
import { MobileFormSheet, MobileFormSection, MobileFormActions } from '../components/MobileFormSheet';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '../components/ui/dropdown-menu';
import { useCurrentProfile } from '../hooks/useCurrentProfile';
import { FeatureInfo } from '../components/FeatureInfo';

interface Customer {
  id: string;
  name: string;
  ownerName?: string;
  email?: string;
  phone?: string;
  logoDataUrl?: string | null;
  logoUrl?: string | null;
  billingAddress?: string;
  shippingAddress?: string;
  billingCity?: string;
  billingState?: string;
  billingPostalCode?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingPostalCode?: string;
  gstin?: string;
  pan?: string;
  openingBalance?: number;
  openingBalanceType?: 'dr' | 'cr';
}

function readCustomersCacheSync(): Customer[] {
  return [];
}

export function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState<Partial<Customer>>({});
  const [formErrors, setFormErrors] = useState<{ gstin?: string; phone?: string; email?: string }>({});
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Customer>>({});
  const [editFormErrors, setEditFormErrors] = useState<{ gstin?: string; phone?: string; email?: string }>({});
  const [loading, setLoading] = useState(true);
  const [customerBalances, setCustomerBalances] = useState<Record<string, number>>({});
  const [gstinLoading, setGstinLoading] = useState(false);
  const [gstinLookupLoading, setGstinLookupLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteCustomer, setDeleteCustomer] = useState<Customer | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [outstandingOpen, setOutstandingOpen] = useState(false);
  const [outstandingLoading, setOutstandingLoading] = useState(false);
  const [outstandingTotal, setOutstandingTotal] = useState(0);
  const [outstandingByCustomer, setOutstandingByCustomer] = useState<Array<{ customerName: string; amount: number }>>([]);
  const { accessToken, deviceId } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { profileId } = useCurrentProfile();

  const apiUrl = API_URL;

  // Reset all state when profile switches to prevent data bleed
  useEffect(() => {
    setCustomers([]);
    setFilteredCustomers([]);
    setSearchTerm('');
    setShowCreateDialog(false);
    setFormData({});
    setFormErrors({});
    setShowEditDialog(false);
    setEditingCustomerId(null);
    setEditFormData({});
    setEditFormErrors({});
    setDeleteDialogOpen(false);
    setDeleteCustomer(null);
    setOutstandingOpen(false);
    setOutstandingTotal(0);
    setOutstandingByCustomer([]);
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
      const response = await fetch(`${apiUrl}/customers/gstin/lookup`, {
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

      const apply = (prev: Partial<Customer>) => {
        const next: Partial<Customer> = { ...prev };
        if (!String(next.name || '').trim() && String(data?.name || '').trim()) next.name = String(data.name);
        if (!String(next.ownerName || '').trim() && String(data?.ownerName || '').trim()) next.ownerName = String(data.ownerName);
        if (!String(next.pan || '').trim() && String(data?.pan || '').trim()) next.pan = String(data.pan);

        if (!String(next.billingAddress || '').trim() && String(data?.billingAddress || '').trim()) next.billingAddress = String(data.billingAddress);
        if (!String(next.billingCity || '').trim() && String(data?.billingCity || '').trim()) next.billingCity = String(data.billingCity);
        if (!String(next.billingState || '').trim() && String(data?.billingState || '').trim()) next.billingState = String(data.billingState);
        if (!String(next.billingPostalCode || '').trim() && String(data?.billingPostalCode || '').trim()) next.billingPostalCode = String(data.billingPostalCode);

        next.shippingAddress = String(next.billingAddress || '');
        next.shippingCity = String(next.billingCity || '');
        next.shippingState = String(next.billingState || '');
        next.shippingPostalCode = String(next.billingPostalCode || '');

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

  const clearCustomersCache = () => {};

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
      body: JSON.stringify({ dataUrl, folder: `hukum/logos/${profileId}/customers` }),
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
    loadCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, deviceId, profileId]);

  usePageRefresh({
    onRefresh: () => { if (accessToken && deviceId && profileId) loadCustomers({ force: true }); },
    staleTtlMs: 30_000,
    enabled: !!profileId && !!accessToken,
  });

  useEffect(() => {
    const st: any = (location as any)?.state;
    if (st?.openCreateDialog) {
      setShowCreateDialog(true);
    }
    if (st?.filterStatus) {
      setFilterStatus(st.filterStatus);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const [filterStatus, setFilterStatus] = useState<string>('all');

  const [visibleCount, setVisibleCount] = useState(20);

  useEffect(() => {
    let filtered = [...customers];
    
    if (searchTerm) {
      filtered = filtered.filter(c =>
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone?.includes(searchTerm)
      );
    }

    if (filterStatus === 'unpaid') {
      filtered = filtered.filter(c => (customerBalances[c.id] || 0) > 0);
    }

    setFilteredCustomers(filtered);
    setVisibleCount(20);
  }, [searchTerm, customers, filterStatus, customerBalances]);

  const loadCustomers = async ({ force = false }: { force?: boolean } = {}) => {
    if (!accessToken || !deviceId || !profileId) return;
    setLoading(true);

    try {
      const response = await fetch(`${apiUrl}/customers`, {
        headers: { 'Authorization': `Bearer ${accessToken}`, 'X-Device-ID': deviceId, 'X-Profile-ID': profileId },
      });
      const data = await response.json();
      if (!data.error) {
        setCustomers(data);
        // Load balances after customers to show individual outstanding
        loadOutstandingBalances();
      }
    } catch (error) {
      if (!customers.length) toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const loadOutstandingBalances = async () => {
    if (!accessToken || !profileId) return;
    try {
      const res = await fetch(`${apiUrl}/payments/outstanding?partyType=customer`, {
        headers: { Authorization: `Bearer ${accessToken}`, 'X-Device-ID': deviceId, 'X-Profile-ID': profileId },
      });
      const data = await res.json();
      if (!res.ok) return;

      const balances: Record<string, number> = {};
      (data.documents || []).forEach((d: any) => {
        const cid = d.party?.id;
        if (cid) {
          balances[cid] = (balances[cid] || 0) + Number(d.remaining || 0);
        }
      });
      setCustomerBalances(balances);
    } catch {
      // silent fail for balances
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatLocation = (city?: string, state?: string, postal?: string) => {
    const parts = [city, state, postal].map((p) => String(p || '').trim()).filter(Boolean);
    return parts.join(', ');
  };

  const extractIndianPincode = (value: string) => {
    const m = String(value || '').match(/\b(\d{6})\b/);
    return m ? m[1] : null;
  };

  const lookupPincode = async (pincode: string) => {
    const pin = String(pincode || '').trim();
    if (!/^\d{6}$/.test(pin)) return null;
    const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
    const data = await res.json().catch(() => null);
    const first = Array.isArray(data) ? data[0] : null;
    const po = first?.PostOffice?.[0];
    if (!po) return null;
    return {
      city: String(po?.District || po?.Block || '').trim() || null,
      state: String(po?.State || '').trim() || null,
    };
  };

  const shouldAutofill = (current: Partial<Customer>, next: { city: string | null; state: string | null }) => {
    const currentCity = String(current?.billingCity || '').trim();
    const currentState = String(current?.billingState || '').trim();
    const nextCity = String(next?.city || '').trim();
    const nextState = String(next?.state || '').trim();
    if (!nextCity && !nextState) return false;
    return (!currentCity && !!nextCity) || (!currentState && !!nextState);
  };

  const shouldAutofillShipping = (current: Partial<Customer>, next: { city: string | null; state: string | null }) => {
    const currentCity = String(current?.shippingCity || '').trim();
    const currentState = String(current?.shippingState || '').trim();
    const nextCity = String(next?.city || '').trim();
    const nextState = String(next?.state || '').trim();
    if (!nextCity && !nextState) return false;
    return (!currentCity && !!nextCity) || (!currentState && !!nextState);
  };

  useEffect(() => {
    const pin =
      extractIndianPincode(String(formData.billingPostalCode || '')) ||
      extractIndianPincode(String(formData.billingAddress || ''));
    if (!pin) return;

    const t = setTimeout(() => {
      lookupPincode(pin)
        .then((next) => {
          if (!next) return;
          if (!shouldAutofill(formData, next)) return;
          setFormData((prev) => ({
            ...prev,
            billingCity: prev.billingCity || next.city || undefined,
            billingState: prev.billingState || next.state || undefined,
            billingPostalCode: prev.billingPostalCode || pin,
          }));
        })
        .catch(() => {
          // ignore
        });
    }, 400);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.billingPostalCode, formData.billingAddress]);

  useEffect(() => {
    const pin =
      extractIndianPincode(String(formData.shippingPostalCode || '')) ||
      extractIndianPincode(String(formData.shippingAddress || ''));
    if (!pin) return;

    const t = setTimeout(() => {
      lookupPincode(pin)
        .then((next) => {
          if (!next) return;
          if (!shouldAutofillShipping(formData, next)) return;
          setFormData((prev) => ({
            ...prev,
            shippingCity: prev.shippingCity || next.city || undefined,
            shippingState: prev.shippingState || next.state || undefined,
            shippingPostalCode: prev.shippingPostalCode || pin,
          }));
        })
        .catch(() => {
          // ignore
        });
    }, 400);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.shippingPostalCode, formData.shippingAddress]);

  useEffect(() => {
    const pin =
      extractIndianPincode(String(editFormData.billingPostalCode || '')) ||
      extractIndianPincode(String(editFormData.billingAddress || ''));
    if (!pin) return;

    const t = setTimeout(() => {
      lookupPincode(pin)
        .then((next) => {
          if (!next) return;
          const currentCity = String(editFormData?.billingCity || '').trim();
          const currentState = String(editFormData?.billingState || '').trim();
          const nextCity = String(next?.city || '').trim();
          const nextState = String(next?.state || '').trim();
          if ((!currentCity && nextCity) || (!currentState && nextState)) {
            setEditFormData((prev) => ({
              ...prev,
              billingCity: prev.billingCity || next.city || undefined,
              billingState: prev.billingState || next.state || undefined,
              billingPostalCode: prev.billingPostalCode || pin,
            }));
          }
        })
        .catch(() => {
          // ignore
        });
    }, 400);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editFormData.billingPostalCode, editFormData.billingAddress]);

  useEffect(() => {
    const pin =
      extractIndianPincode(String(editFormData.shippingPostalCode || '')) ||
      extractIndianPincode(String(editFormData.shippingAddress || ''));
    if (!pin) return;

    const t = setTimeout(() => {
      lookupPincode(pin)
        .then((next) => {
          if (!next) return;
          const currentCity = String(editFormData?.shippingCity || '').trim();
          const currentState = String(editFormData?.shippingState || '').trim();
          const nextCity = String(next?.city || '').trim();
          const nextState = String(next?.state || '').trim();
          if ((!currentCity && nextCity) || (!currentState && nextState)) {
            setEditFormData((prev) => ({
              ...prev,
              shippingCity: prev.shippingCity || next.city || undefined,
              shippingState: prev.shippingState || next.state || undefined,
              shippingPostalCode: prev.shippingPostalCode || pin,
            }));
          }
        })
        .catch(() => {
          // ignore
        });
    }, 400);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editFormData.shippingPostalCode, editFormData.shippingAddress]);

  const loadOutstanding = async () => {
    if (!accessToken) {
      toast.error('Not authenticated');
      return;
    }
    if (!profileId) {
      toast.error('Select a business profile first');
      return;
    }

    setOutstandingLoading(true);
    try {
      const res = await fetch(`${apiUrl}/payments/outstanding`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Device-ID': deviceId,
          'X-Profile-ID': profileId,
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to load outstanding');
      }

      const docs: any[] = Array.isArray(data?.documents) ? data.documents : [];
      const grouped = new Map<string, number>();
      for (const d of docs) {
        const name = String(d?.party?.name || d?.customerName || 'Unknown');
        const remaining = Number(d?.remaining || 0);
        grouped.set(name, (grouped.get(name) || 0) + remaining);
      }

      const rows = Array.from(grouped.entries())
        .map(([customerName, amount]) => ({ customerName, amount }))
        .sort((a, b) => b.amount - a.amount);

      setOutstandingTotal(Number(data?.totalOutstanding || 0));
      setOutstandingByCustomer(rows);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load outstanding');
      setOutstandingOpen(false);
    } finally {
      setOutstandingLoading(false);
    }
  };

  useEffect(() => {
    if (outstandingOpen) {
      loadOutstanding();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outstandingOpen]);

  const handleEditClick = (customer: Customer) => {
    setEditingCustomerId(customer.id);
    setEditFormData({ ...customer });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (customer: Customer) => {
    setDeleteCustomer(customer);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteCustomer?.id) return;
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
      const response = await fetch(`${apiUrl}/customers/${deleteCustomer.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Device-ID': deviceId,
          'X-Profile-ID': profileId,
        },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to delete customer');
      }

      setCustomers((prev) => prev.filter((c) => c.id !== deleteCustomer.id));
      setFilteredCustomers((prev) => prev.filter((c) => c.id !== deleteCustomer.id));
      clearCustomersCache();
      toast.success('Customer deleted');
      window.dispatchEvent(new CustomEvent('dashboardRefresh'));
      setDeleteDialogOpen(false);
      setDeleteCustomer(null);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to delete customer');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingCustomerId) return;

    if (!editFormData.name?.trim()) {
      toast.error('Party name is required');
      return;
    }

    if (!String(editFormData.ownerName || '').trim()) {
      toast.error('Owner name is required');
      return;
    }

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

      const billingAddressValue = String(payload.billingAddress || '').trim();
      const billingCityValue = String(payload.billingCity || '').trim();
      const billingStateValue = String(payload.billingState || '').trim();
      const billingPostalCodeValue = String(payload.billingPostalCode || '').trim();

      delete payload.shippingAddress;
      delete payload.shippingCity;
      delete payload.shippingState;
      delete payload.shippingPostalCode;

      payload.shippingAddress = billingAddressValue || undefined;
      payload.shippingCity = billingCityValue || undefined;
      payload.shippingState = billingStateValue || undefined;
      payload.shippingPostalCode = billingPostalCodeValue || undefined;

      if (typeof payload.email === 'string') payload.email = normalizeEmail(payload.email) || undefined;
      if (typeof payload.phone === 'string') payload.phone = normalizePhone(payload.phone) || undefined;
      if (typeof payload.gstin === 'string') payload.gstin = normalizeGstin(payload.gstin) || undefined;
      if (payload.logoUrl && !String(payload.logoUrl).trim()) payload.logoUrl = null;
      delete payload.logoDataUrl;
      const response = await fetch(`${apiUrl}/customers/${editingCustomerId}`, {
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
        toast.success('Customer updated successfully!');
        setCustomers(prev => prev.map(c => (c.id === data.id ? data : c)));
        setShowEditDialog(false);
        setEditingCustomerId(null);
        setEditFormData({});
        window.dispatchEvent(new CustomEvent('dashboardRefresh'));
      }
    } catch {
      toast.error('Failed to update customer');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name?.trim()) {
      toast.error('Party name is required');
      return;
    }

    if (!String(formData.ownerName || '').trim()) {
      toast.error('Owner name is required');
      return;
    }

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

      const billingAddressValue = String(payload.billingAddress || '').trim();
      const billingCityValue = String(payload.billingCity || '').trim();
      const billingStateValue = String(payload.billingState || '').trim();
      const billingPostalCodeValue = String(payload.billingPostalCode || '').trim();

      delete payload.shippingAddress;
      delete payload.shippingCity;
      delete payload.shippingState;
      delete payload.shippingPostalCode;

      payload.shippingAddress = billingAddressValue || undefined;
      payload.shippingCity = billingCityValue || undefined;
      payload.shippingState = billingStateValue || undefined;
      payload.shippingPostalCode = billingPostalCodeValue || undefined;

      if (typeof payload.email === 'string') payload.email = normalizeEmail(payload.email) || undefined;
      if (typeof payload.phone === 'string') payload.phone = normalizePhone(payload.phone) || undefined;
      if (typeof payload.gstin === 'string') payload.gstin = normalizeGstin(payload.gstin) || undefined;
      if (payload.logoUrl && !String(payload.logoUrl).trim()) payload.logoUrl = null;
      delete payload.logoDataUrl;
      const response = await fetch(`${apiUrl}/customers`, {
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
        toast.success('Customer created successfully!');
        setCustomers([...customers, data]);
        setShowCreateDialog(false);
        setFormData({});
        window.dispatchEvent(new CustomEvent('dashboardRefresh'));

        const st: any = (location as any)?.state;
        if (st?.returnTo) {
          navigate(String(st.returnTo));
        }
      }
    } catch (error) {
      toast.error('Failed to create customer');
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
      const response = await fetch(`${apiUrl}/customers/gstin`, {
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
        toast.success('Customer created via GSTIN!');
        setCustomers([...customers, data]);
        setShowCreateDialog(false);
        setFormData({});
        window.dispatchEvent(new CustomEvent('dashboardRefresh'));

        const st: any = (location as any)?.state;
        if (st?.returnTo) {
          navigate(String(st.returnTo));
        }
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to create customer');
    } finally {
      setGstinLoading(false);
    }
  };

  // Removed `if (loading) return <CustomersPageSkeleton />;` to prevent page flicker.
  // The layout mounts instantly and seamlessly swaps loading states internally.

  return (
    <>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto pb-40 md:pb-12 min-h-screen">
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Delete Customer</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                This will permanently delete
                <span className="font-medium text-foreground"> {deleteCustomer?.name || 'this customer'}</span>.
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

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/suppliers')}
                aria-label="Go to Suppliers"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-3xl font-bold text-foreground">Customers</h1>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/suppliers')}
                aria-label="Go to Suppliers"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
            <p className="text-muted-foreground mt-1">Parties</p>
          </div>
          <div className="flex items-center gap-2 mt-4 md:mt-0">
            <div className="flex items-center gap-1">
              <Button variant="outline" onClick={() => setOutstandingOpen(true)}>
                Outstanding
              </Button>
              <FeatureInfo 
                title="Manage Outstanding"
                steps={[
                  "Create and Finalize an Invoice (Drafts are excluded).",
                  "Outstanding = Grand Total - Sum of all linked Payments.",
                  "Partial payments are automatically calculated from ledger records.",
                  "Summary cards update instantly after any document or payment change."
                ]}
              />
            </div>
            <Button data-tour-id="cta-add-customer" onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Customer
              </Button>
          </div>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Customer</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="party-name">Party Name *</Label>
                    <Input id="party-name" required value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Enter name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="owner-name">Owner Name *</Label>
                    <Input id="owner-name" required value={String(formData.ownerName || '')} onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })} placeholder="Owner / Proprietor" />
                  </div>
                </div>
                <EmailInput label="Email" value={formData.email || ''} onChange={(v) => setFormData({ ...formData, email: v })} placeholder="customer@email.com" error={formErrors.email} />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="opening-balance">Opening Balance</Label>
                    <Input id="opening-balance" value={String(formData.openingBalance ?? '')} onChange={(e) => setFormData({ ...formData, openingBalance: Number(e.target.value || 0) })} placeholder="0" inputMode="decimal" />
                  </div>
                  <div className="space-y-2">
                    <Label>Opening Type</Label>
                    <Select value={String(formData.openingBalanceType || 'dr')} onValueChange={(v) => setFormData({ ...formData, openingBalanceType: v as 'dr' | 'cr' })}>
                      <SelectTrigger><SelectValue placeholder="DR" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dr">DR (Receivable)</SelectItem>
                        <SelectItem value="cr">CR (Payable)</SelectItem>
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
                </div>

                <div className="space-y-4 border-t pt-4">
                  <AddressInput label="Billing Address" value={formData.billingAddress || ''} onChange={(v) => setFormData((p) => ({ ...p, billingAddress: v, shippingAddress: v }))} rows={2} />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>City</Label>
                      <Input value={formData.billingCity || ''} onChange={(e) => setFormData((p) => ({ ...p, billingCity: e.target.value, shippingCity: e.target.value }))} placeholder="Bangalore" />
                    </div>
                    <div className="space-y-2">
                      <Label>State</Label>
                      <Select value={formData.billingState || ''} onValueChange={(v) => setFormData((p) => ({ ...p, billingState: v, shippingState: v }))}>
                        <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                        <SelectContent>{INDIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Postal Code</Label>
                      <PostalCodeInput value={formData.billingPostalCode || ''} onChange={(v) => setFormData((p) => ({ ...p, billingPostalCode: v, shippingPostalCode: v }))} />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 border-t pt-4">
                  <div className="flex items-center gap-4">
                    <input id="customer-logo-create" type="file" accept="image/*" className="hidden"
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
                      <label htmlFor="customer-logo-create" className="cursor-pointer">
                        {formData.logoUrl || formData.logoDataUrl ? 'Change Logo' : 'Upload Logo'}
                      </label>
                    </Button>
                    {!!(formData.logoUrl || formData.logoDataUrl) && (
                      <img src={String(formData.logoUrl || formData.logoDataUrl)} alt="Logo" className="h-10 w-10 rounded border object-contain bg-background" />
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t sticky bottom-0 bg-background">
                <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
                <Button type="button" variant="secondary" onClick={handleCreateByGstin} disabled={gstinLoading}>{gstinLoading ? 'Creating...' : 'Create via GSTIN'}</Button>
                <Button type="submit">Add Customer</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={outstandingOpen} onOpenChange={setOutstandingOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Outstanding</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="rounded-md border p-4">
                <div className="text-sm text-muted-foreground">Total Outstanding</div>
                <div className="text-2xl font-bold text-foreground mt-1">{formatCurrency(outstandingTotal)}</div>
              </div>

              {outstandingLoading ? (
                <div className="text-sm text-muted-foreground">Loading…</div>
              ) : outstandingByCustomer.length === 0 ? (
                <div className="text-sm text-muted-foreground">No outstanding invoices.</div>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <div className="grid grid-cols-2 bg-muted text-xs font-semibold text-muted-foreground px-4 py-2">
                    <div>Customer</div>
                    <div className="text-right">Outstanding</div>
                  </div>
                  {outstandingByCustomer.map((r) => (
                    <div key={r.customerName} className="grid grid-cols-2 px-4 py-3 border-t text-sm">
                      <div className="font-medium text-foreground truncate">{r.customerName}</div>
                      <div className="text-right font-semibold">{formatCurrency(r.amount)}</div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setOutstandingOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Customers Grid */}
        {loading && customers.length === 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="animate-pulse bg-card rounded-xl border border-border p-6 h-40">
                <div className="flex gap-4">
                  <div className="h-12 w-12 bg-muted rounded-full"></div>
                  <div className="flex-1 space-y-2 mt-2">
                    <div className="h-4 w-1/2 bg-muted rounded"></div>
                    <div className="h-3 w-1/3 bg-muted rounded"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredCustomers.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <User className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {customers.length === 0 ? 'No customers yet' : 'No matching customers'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {customers.length === 0 
                  ? 'Add your first customer to get started'
                  : 'Try a different search term'}
              </p>
              {customers.length === 0 && (
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Customer
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCustomers.slice(0, visibleCount).map((customer) => (
                <Card key={customer.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center gap-3 justify-between">
                      <div className="flex items-center gap-3">
                      <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center overflow-hidden border">
                        {customer.logoUrl || customer.logoDataUrl ? (
                          <img
                            src={String(customer.logoUrl || customer.logoDataUrl)}
                            alt="Logo"
                            className="h-full w-full object-contain bg-white"
                          />
                        ) : (
                          <User className="h-6 w-6 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{customer.name}</CardTitle>
                        {customer.gstin && (
                          <p className="text-xs text-muted-foreground font-mono">{customer.gstin}</p>
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
                              title="Party Info & Actions"
                              data-tour-id="party-info-btn"
                            >
                              <Info className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-64">
                            <DropdownMenuLabel className="flex items-center justify-between">
                              <span>Party Insight</span>
                              <span className="text-[10px] font-normal px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">vv1.0.1</span>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            
                            <DropdownMenuItem 
                              className="cursor-pointer"
                              onClick={() => navigate(`/ledger?partyId=${customer.id}&partyType=customer`)}
                            >
                              <BookOpen className="h-4 w-4 mr-2 text-indigo-500" />
                              <span>Register Ledger</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem 
                              className="cursor-pointer"
                              onClick={() => {
                                setSearchTerm(customer.name);
                                setFilterStatus('unpaid');
                              }}
                            >
                              <Clock className="h-4 w-4 mr-2 text-orange-500" />
                              <span>Outstanding Analysis</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem 
                              className="cursor-pointer"
                              onClick={() => navigate('/analytics', { state: { selectedCustomer: customer.id } })}
                            >
                              <BarChart className="h-4 w-4 mr-2 text-emerald-500" />
                              <span>Customer Analytics</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem 
                              className="cursor-pointer"
                              onClick={() => navigate('/reports/gst', { state: { customerId: customer.id } })}
                            >
                              <FileSpreadsheet className="h-4 w-4 mr-2 text-rose-500" />
                              <span>GST Reports</span>
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
                                <span>Balance:</span>
                                <span className={Number(customerBalances[customer.id] || 0) > 0 ? 'text-orange-600 font-bold' : 'text-green-600'}>
                                  {formatCurrency(customerBalances[customer.id] || 0)}
                                </span>
                              </div>
                            </div>
                          </DropdownMenuContent>
                        </DropdownMenu>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditClick(customer)}
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteDialog(customer)}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          aria-label="Delete customer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {customer.email && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span className="truncate">{customer.email}</span>
                      </div>
                    )}
                    {customer.phone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span>{customer.phone}</span>
                      </div>
                    )}

                    {(customer.billingAddress || customer.billingCity || customer.billingState || customer.billingPostalCode) && (
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 mt-0.5" />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-foreground/80">Billing</div>
                          {customer.billingAddress && <div className="line-clamp-2">{customer.billingAddress}</div>}
                          {formatLocation(customer.billingCity, customer.billingState, customer.billingPostalCode) && (
                            <div className="text-xs text-muted-foreground/80 line-clamp-1">
                              {formatLocation(customer.billingCity, customer.billingState, customer.billingPostalCode)}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {(customer.shippingAddress || customer.shippingCity || customer.shippingState || customer.shippingPostalCode) && (
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 mt-0.5 opacity-70" />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-foreground/80">Shipping</div>
                          {customer.shippingAddress && <div className="line-clamp-2">{customer.shippingAddress}</div>}
                          {formatLocation(customer.shippingCity, customer.shippingState, customer.shippingPostalCode) && (
                            <div className="text-xs text-muted-foreground/80 line-clamp-1">
                              {formatLocation(customer.shippingCity, customer.shippingState, customer.shippingPostalCode)}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {customerBalances[customer.id] > 0 && (
                      <div className="pt-2 mt-2 border-t flex justify-between items-center">
                        <span className="text-xs font-semibold text-orange-600 uppercase tracking-wider">Outstanding</span>
                        <span className="text-sm font-bold text-orange-600">{formatCurrency(customerBalances[customer.id])}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
            {visibleCount < filteredCustomers.length && (
              <div className="flex justify-center pt-4">
                <Button 
                  variant="outline" 
                  className="w-full sm:w-auto px-8" 
                  onClick={() => setVisibleCount(prev => prev + 50)}
                >
                  Load More ({visibleCount} of {filteredCustomers.length})
                </Button>
              </div>
            )}
          </div>
        )}

        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Customer</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateCustomer} className="space-y-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-party-name">Party Name *</Label>
                    <Input id="edit-party-name" required value={editFormData.name || ''} onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })} placeholder="Enter name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-owner-name">Owner Name *</Label>
                    <Input id="edit-owner-name" required value={String(editFormData.ownerName || '')} onChange={(e) => setEditFormData({ ...editFormData, ownerName: e.target.value })} placeholder="Owner / Proprietor" />
                  </div>
                </div>
                <EmailInput label="Email" value={editFormData.email || ''} onChange={(v) => setEditFormData({ ...editFormData, email: v })} placeholder="customer@email.com" error={editFormErrors.email} />
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-4">
                  <PhoneInput label="Phone" value={editFormData.phone || ''} onChange={(v) => setEditFormData({ ...editFormData, phone: v })} error={editFormErrors.phone} />
                  <div className="space-y-2">
                    <GstinInput label="GSTIN" value={editFormData.gstin || ''} onChange={(v) => setEditFormData({ ...editFormData, gstin: v })} error={editFormErrors.gstin} onBlur={() => void handleGstinLookupAutofill('edit')} />
                    {gstinLookupLoading && <div className="text-xs text-muted-foreground animate-pulse">Fetching GST details...</div>}
                  </div>
                  <PanInput label="PAN" value={editFormData.pan || ''} onChange={(v) => setEditFormData({ ...editFormData, pan: v })} />
                </div>

                <div className="space-y-4 border-t pt-4">
                  <AddressInput label="Billing Address" value={editFormData.billingAddress || ''} onChange={(v) => setEditFormData((p) => ({ ...p, billingAddress: v, shippingAddress: v }))} rows={2} />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>City</Label>
                      <Input value={editFormData.billingCity || ''} onChange={(e) => setEditFormData((p) => ({ ...p, billingCity: e.target.value, shippingCity: e.target.value }))} placeholder="Bangalore" />
                    </div>
                    <div className="space-y-2">
                      <Label>State</Label>
                      <Select value={editFormData.billingState || ''} onValueChange={(v) => setEditFormData((p) => ({ ...p, billingState: v, shippingState: v }))}>
                        <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                        <SelectContent>{INDIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Postal Code</Label>
                      <PostalCodeInput value={editFormData.billingPostalCode || ''} onChange={(v) => setEditFormData((p) => ({ ...p, billingPostalCode: v, shippingPostalCode: v }))} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t sticky bottom-0 bg-background">
                <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
                <Button type="submit">Save Changes</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Summary */}
        {filteredCustomers.length > 0 && (
          <Card className="mt-6">
            <CardContent className="py-4">
              <p className="text-sm text-muted-foreground">
                Showing {filteredCustomers.length} of {customers.length} customers
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
