import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { AppLayout } from '../components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../components/ui/command';
import { Switch } from '../components/ui/switch';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '../components/ui/sheet';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../components/ui/accordion';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/ui/collapsible';
import { Check, ChevronDown, ChevronUp, ChevronsUpDown, Plus, Save, Trash2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../config/api';
import { toast } from 'sonner';
import { TraceLoader } from '../components/TraceLoader';
import { INDIAN_STATES } from '../utils/indianStates';

type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP';

interface DocumentItem {
  name: string;
  hsnSac: string;
  description?: string;
  sku?: string;
  servicePeriod?: string;
  quantity: number;
  unit: string;
  rate: number;
  sellingPrice?: number;
  purchaseCost?: number;
  currency: CurrencyCode;
  discount: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
}

interface PresetCustomer {
  id: string;
  name: string;
  address?: string;
  billingAddress?: string;
  shippingAddress?: string;
  email?: string;
  phone?: string;
  gstin?: string;
  logoUrl?: string;
  logoDataUrl?: string;
  billingState?: string;
  state?: string;
}

interface PresetItem {
  id: string;
  name: string;
  hsnSac?: string;
  unit: string;
  rate: number;
  sellingPrice?: number;
  purchaseCost?: number;
  discount?: number;
  cgst: number;
  sgst: number;
  igst: number;
}

interface PresetInvoice {
  id: string;
  documentNumber: string;
  customerName?: string;
  customerAddress?: string;
  customerGstin?: string;
}
type PaymentMode = 'cash' | 'cheque' | 'online';

export function CreateDocumentPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const location = useLocation();
  const { accessToken, deviceId } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Document fields
  const [type, setType] = useState('invoice');
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerGstin, setCustomerGstin] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [items, setItems] = useState<DocumentItem[]>([{
    name: '',
    hsnSac: '',
    description: '',
    sku: '',
    servicePeriod: '',
    quantity: 1,
    unit: 'pcs',
    rate: 0,
    sellingPrice: 0,
    purchaseCost: 0,
    currency: 'INR',
    discount: 0,
    cgst: 9,
    sgst: 9,
    igst: 0,
    total: 0
  }]);
  const [transportCharges, setTransportCharges] = useState(0);
  const [additionalCharges, setAdditionalCharges] = useState(0);
  const [roundOff, setRoundOff] = useState(0);
  const [autoRoundOff, setAutoRoundOff] = useState(false);
  const [notes, setNotes] = useState('');
  const [termsConditions, setTermsConditions] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'unpaid' | 'paid'>('unpaid');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');
  const [status, setStatus] = useState<'draft' | 'final'>('draft');

  useEffect(() => {
    if (isEdit) return;
    const params = new URLSearchParams(location.search || '');
    const t = String(params.get('type') || '').trim();
    if (t && t !== type) {
      setType(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, isEdit]);

  const [invoiceNo, setInvoiceNo] = useState('');
  const [challanNo, setChallanNo] = useState('');
  const [ewayBillNo, setEwayBillNo] = useState('');
  const [ewayBillDate, setEwayBillDate] = useState('');
  const [ewayBillValidUpto, setEwayBillValidUpto] = useState('');
  const [ewayBillVehicleNo, setEwayBillVehicleNo] = useState('');
  const [ewayBillTransporterName, setEwayBillTransporterName] = useState('');
  const [ewayBillTransporterDocNo, setEwayBillTransporterDocNo] = useState('');
  const [ewayBillDistanceKm, setEwayBillDistanceKm] = useState('');
  const [transport, setTransport] = useState('');
  const [transportId, setTransportId] = useState('');

  const [orderNumber, setOrderNumber] = useState('');
  const [revisionNumber, setRevisionNumber] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [purchaseOrderNo, setPurchaseOrderNo] = useState('');
  const [poDate, setPoDate] = useState('');

  const [customerContactPerson, setCustomerContactPerson] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerStateCode, setCustomerStateCode] = useState('');
  const [placeOfSupply, setPlaceOfSupply] = useState('');

  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');

  const [departureFromAddress, setDepartureFromAddress] = useState('');
  const [departureFromCity, setDepartureFromCity] = useState('');
  const [departureFromState, setDepartureFromState] = useState('');
  const [departureFromPostalCode, setDepartureFromPostalCode] = useState('');

  const [departureToAddress, setDepartureToAddress] = useState('');
  const [departureToCity, setDepartureToCity] = useState('');
  const [departureToState, setDepartureToState] = useState('');
  const [departureToPostalCode, setDepartureToPostalCode] = useState('');

  const [packingHandlingCharges, setPackingHandlingCharges] = useState(0);
  const [tcs, setTcs] = useState(0);
  const [paymentTerms, setPaymentTerms] = useState('');
  const [creditPeriod, setCreditPeriod] = useState('');
  const [lateFeeTerms, setLateFeeTerms] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [warrantyReturnCancellationPolicies, setWarrantyReturnCancellationPolicies] = useState('');

  const [bankName, setBankName] = useState('');
  const [bankBranch, setBankBranch] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [upiId, setUpiId] = useState('');
  const [upiQrText, setUpiQrText] = useState('');

  const [referenceDocumentId, setReferenceDocumentId] = useState<string | null>(null);
  const [referenceDocumentNumber, setReferenceDocumentNumber] = useState<string>('');
  const [referenceDocs, setReferenceDocs] = useState<PresetInvoice[]>([]);
  const [referenceDocOpen, setReferenceDocOpen] = useState(false);

  const [presetCustomers, setPresetCustomers] = useState<PresetCustomer[]>([]);
  const [presetItems, setPresetItems] = useState<PresetItem[]>([]);

  const [partyKind, setPartyKind] = useState<'customer' | 'supplier'>('customer');
  const [lastCustomerDocType, setLastCustomerDocType] = useState<string>('invoice');
  const [partyId, setPartyId] = useState<string>('');

  const [expandedItemRows, setExpandedItemRows] = useState<Record<number, boolean>>({});

  const [customFields, setCustomFields] = useState<Array<{ label: string; value: string }>>([]);

  const [proformaPriceMode, setProformaPriceMode] = useState<'without_tax' | 'with_tax'>('without_tax');

  const [partyPopoverOpen, setPartyPopoverOpen] = useState(false);
  const [createCustomerOpen, setCreateCustomerOpen] = useState(false);
  const [createCustomerSaving, setCreateCustomerSaving] = useState(false);
  const [createCustomerForm, setCreateCustomerForm] = useState<{ name: string; phone: string; gstin: string; billingAddress: string; logoDataUrl: string; logoUrl: string }>(
    { name: '', phone: '', gstin: '', billingAddress: '', logoDataUrl: '', logoUrl: '' }
  );

  const [proformaItemPopoverOpen, setProformaItemPopoverOpen] = useState<Record<number, boolean>>({});
  const [createItemOpen, setCreateItemOpen] = useState(false);
  const [createItemSaving, setCreateItemSaving] = useState(false);
  const [createItemTargetIndex, setCreateItemTargetIndex] = useState<number | null>(null);
  const [createItemForm, setCreateItemForm] = useState<{
    name: string;
    unit: string;
    rate: string;
    hsnSac: string;
    taxPct: string;
  }>({ name: '', unit: 'NONE', rate: '', hsnSac: '', taxPct: '18' });

  const [proformaShowDescription, setProformaShowDescription] = useState(false);
  const [proformaAttachment, setProformaAttachment] = useState<File | null>(null);

  const smoothPanTo = (el: HTMLElement | null | undefined) => {
    if (!el) return;
    try {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch {
      // no-op
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
      body: JSON.stringify({ dataUrl, folder: `hukum/logos/${profileId}/parties` }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || 'Failed to upload logo');
    }
    const url = String(data?.url || '').trim();
    if (!url) throw new Error('Failed to upload logo');
    return url;
  };

  const handleCreateItemInline = async () => {
    if (!accessToken || !deviceId || !profileId) {
      toast.error('Missing session/profile');
      return;
    }

    const name = String(createItemForm.name || '').trim();
    if (!name) {
      toast.error('Item name is required');
      return;
    }

    const unit = String(createItemForm.unit || 'NONE').trim() || 'NONE';
    const rate = Number(createItemForm.rate || 0);
    const hsnSac = String(createItemForm.hsnSac || '').trim() || undefined;
    const taxPct = Number(createItemForm.taxPct || 0);
    const halfTax = parseFloat((taxPct / 2).toFixed(2));

    setCreateItemSaving(true);
    try {
      const res = await fetch(`${apiUrl}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-Device-ID': deviceId,
          'X-Profile-ID': profileId,
        },
        body: JSON.stringify({
          name,
          unit,
          rate: Number.isFinite(rate) ? rate : 0,
          sellingPrice: Number.isFinite(rate) ? rate : 0,
          hsnSac,
          igst: 0,
          cgst: Number.isFinite(halfTax) ? halfTax : 0,
          sgst: Number.isFinite(halfTax) ? halfTax : 0,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || data?.error) {
        toast.error(data?.error || 'Failed to create item');
        return;
      }

      const createdId = String(data?.id || data?._id || '').trim();
      const createdName = String(data?.name || name).trim();

      setPresetItems((prev) => [
        {
          id: createdId,
          name: createdName,
          unit: String(data?.unit || unit || 'NONE'),
          rate: Number(data?.rate ?? rate ?? 0) || 0,
          sellingPrice: typeof data?.sellingPrice === 'number' ? data.sellingPrice : Number(rate || 0),
          purchaseCost: typeof data?.purchaseCost === 'number' ? data.purchaseCost : 0,
          discount: typeof data?.discount === 'number' ? data.discount : 0,
          hsnSac: String(data?.hsnSac || data?.hsn || data?.sac || hsnSac || ''),
          cgst: Number(data?.cgst ?? halfTax ?? 0) || 0,
          sgst: Number(data?.sgst ?? halfTax ?? 0) || 0,
          igst: Number(data?.igst ?? 0) || 0,
        },
        ...prev.filter((i) => String(i.id) !== createdId),
      ]);

      if (typeof createItemTargetIndex === 'number') {
        const idx = createItemTargetIndex;
        const newItems = [...items];
        const prevRow = newItems[idx];
        newItems[idx] = {
          ...prevRow,
          name: createdName,
          unit,
          rate: Number.isFinite(rate) ? rate : 0,
          hsnSac: String(hsnSac || ''),
          cgst: halfTax,
          sgst: halfTax,
          igst: 0,
        };
        newItems[idx].total = calculateItemTotal(newItems[idx]);
        setItems(newItems);
      }

      setCreateItemOpen(false);
      setCreateItemTargetIndex(null);
      setCreateItemForm({ name: '', unit: 'NONE', rate: '', hsnSac: '', taxPct: '18' });
      toast.success('Item created');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to create item');
    } finally {
      setCreateItemSaving(false);
    }
  };

  const apiUrl = API_URL;
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

  const currentProfile = readCurrentProfile();
  const profileId = currentProfile?.id;

  useEffect(() => {
    if (isEdit) {
      loadDocument();
    }
  }, [id]);

  useEffect(() => {
    if (isEdit) return;
    if (type !== 'proforma') return;
    if (String(referenceNo || '').trim()) return;
    const next = String(Date.now()).slice(-5);
    setReferenceNo(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, isEdit]);

  useEffect(() => {
    if (type !== 'proforma') return;
    setItems((prev) => {
      if (!Array.isArray(prev) || prev.length === 0) return prev;
      const first = prev[0];
      if (String(first?.unit || '').toUpperCase() === 'NONE') return prev;
      const next = [...prev];
      next[0] = { ...first, unit: 'NONE' };
      next[0].total = calculateItemTotal(next[0]);
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  useEffect(() => {
    if (isEdit) return;

    const nextBankName = String(currentProfile?.bankName || '').trim();
    const nextBranch = String(currentProfile?.bankBranch || '').trim();
    const nextAcc = String(currentProfile?.accountNumber || '').trim();
    const nextIfsc = String(currentProfile?.ifscCode || '').trim();
    const nextUpi = String(currentProfile?.upiId || '').trim();

    if (!bankName && nextBankName) setBankName(nextBankName);
    if (!bankBranch && nextBranch) setBankBranch(nextBranch);
    if (!bankAccountNumber && nextAcc) setBankAccountNumber(nextAcc);
    if (!bankIfsc && nextIfsc) setBankIfsc(nextIfsc);
    if (!upiId && nextUpi) setUpiId(nextUpi);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, profileId]);

  useEffect(() => {
    if (type === 'purchase') {
      setPartyKind('supplier');
      return;
    }

    setPartyKind('customer');
  }, [type]);

  const handleTypeChange = (nextType: string) => {
    const next = String(nextType || '').toLowerCase();

    if (next === 'invoice_cancellation') {
      setPartyKind('customer');
      setType('invoice_cancellation');
      return;
    }

    if (next === 'purchase') {
      setPartyKind('supplier');
      setType('purchase');
      return;
    }

    // Any non-purchase type implies customer flow.
    setPartyKind('customer');
    setLastCustomerDocType(next || 'invoice');
    setType(nextType);
  };

  useEffect(() => {
    if (type === 'invoice_cancellation' || type === 'order') return;
    setReferenceDocumentId(null);
    setReferenceDocumentNumber('');
    setReferenceDocOpen(false);
  }, [type]);

  useEffect(() => {
    if (!accessToken || !deviceId || !profileId) return;
    void loadPresets();
  }, [accessToken, deviceId, profileId, type, partyKind]);

  useEffect(() => {
    if (type !== 'order') return;
    const pin = extractIndianPincode(departureFromPostalCode) || extractIndianPincode(departureFromAddress);
    if (!pin) return;

    const t = setTimeout(() => {
      lookupPincode(pin)
        .then((next) => {
          if (!next) return;
          const nextCity = String(next?.city || '').trim();
          const nextState = String(next?.state || '').trim();
          if ((!departureFromCity.trim() && nextCity) || (!departureFromState.trim() && nextState)) {
            if (!departureFromCity.trim() && nextCity) setDepartureFromCity(nextCity);
            if (!departureFromState.trim() && nextState) setDepartureFromState(nextState);
            if (!departureFromPostalCode.trim()) setDepartureFromPostalCode(pin);
          }
        })
        .catch(() => {
          // ignore
        });
    }, 500);

    return () => clearTimeout(t);
  }, [type, departureFromPostalCode, departureFromAddress, departureFromCity, departureFromState]);

  useEffect(() => {
    if (type !== 'order') return;
    const pin = extractIndianPincode(departureToPostalCode) || extractIndianPincode(departureToAddress);
    if (!pin) return;

    const t = setTimeout(() => {
      lookupPincode(pin)
        .then((next) => {
          if (!next) return;
          const nextCity = String(next?.city || '').trim();
          const nextState = String(next?.state || '').trim();
          if ((!departureToCity.trim() && nextCity) || (!departureToState.trim() && nextState)) {
            if (!departureToCity.trim() && nextCity) setDepartureToCity(nextCity);
            if (!departureToState.trim() && nextState) setDepartureToState(nextState);
            if (!departureToPostalCode.trim()) setDepartureToPostalCode(pin);
          }
        })
        .catch(() => {
          // ignore
        });
    }, 500);

    return () => clearTimeout(t);
  }, [type, departureToPostalCode, departureToAddress, departureToCity, departureToState]);

  useEffect(() => {
    if (!accessToken || !deviceId || !profileId) return;
    if (type !== 'invoice_cancellation' && type !== 'order') return;
    void loadReferenceDocs();
  }, [accessToken, deviceId, profileId, type]);

  const loadPresets = async () => {
    try {
      const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'X-Device-ID': deviceId,
        'X-Profile-ID': profileId,
      };

      const customersUrl = partyKind === 'supplier' ? `${apiUrl}/suppliers` : `${apiUrl}/customers`;
      const [customersRes, itemsRes] = await Promise.all([
        fetch(customersUrl, { headers }),
        fetch(`${apiUrl}/items`, { headers }),
      ]);

      const [customersData, itemsData] = await Promise.all([
        customersRes.json().catch(() => []),
        itemsRes.json().catch(() => []),
      ]);

      if (!customersData?.error && Array.isArray(customersData)) {
        const mapped = customersData
          .map((c: any) => ({
            ...c,
            id: String(c?.id || c?._id || ''),
            name: String(c?.name || ''),
            address: c?.address || c?.billingAddress || c?.shippingAddress || '',
            billingAddress: c?.billingAddress || c?.address || '',
            shippingAddress: c?.shippingAddress || '',
            email: c?.email || '',
            phone: c?.phone || '',
            gstin: c?.gstin || '',
            billingState: c?.billingState || c?.state || '',
            state: c?.state || c?.billingState || '',
            logoUrl: c?.logoUrl || '',
            logoDataUrl: c?.logoDataUrl || '',
          }))
          .filter((c: PresetCustomer) => !!String(c.id || '').trim());

        // Merge to avoid losing locally-added party (e.g., immediately after inline create)
        // in case the backend list response is slightly stale.
        setPresetCustomers((prev) => {
          const byId = new Map<string, PresetCustomer>();
          for (const c of mapped) byId.set(String(c.id), c);
          for (const c of prev) {
            const id = String(c?.id || '').trim();
            if (!id) continue;
            if (!byId.has(id)) byId.set(id, c);
          }
          return Array.from(byId.values());
        });
      }
      if (!itemsData?.error && Array.isArray(itemsData)) {
        setPresetItems(itemsData);
      }
    } catch {
      // Non-blocking: page still works with manual input.
    }
  };

  const loadReferenceDocs = async () => {
    try {
      const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'X-Device-ID': deviceId,
        'X-Profile-ID': profileId,
      };
      const res = await fetch(`${apiUrl}/documents`, { headers });
      const data = await res.json().catch(() => []);
      if (data?.error || !Array.isArray(data)) return;
      const wantType = type === 'order' ? 'quotation' : 'invoice';
      const docs = data
        .filter((d: any) => String(d?.type || '').toLowerCase() === wantType)
        .map((d: any) => ({
          id: String(d.id || d._id),
          documentNumber: String(d.documentNumber || ''),
          customerName: d.customerName || '',
          customerAddress: d.customerAddress || '',
          customerGstin: d.customerGstin || '',
        }))
        .filter((d: PresetInvoice) => !!d.id && !!d.documentNumber);
      setReferenceDocs(docs);
    } catch {
      // ignore
    }
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

  const applyOrderAutofillFromReferenceQuotation = (doc: any) => {
    if (!doc) return;

    if (!customerName.trim() && doc.customerName) setCustomerName(String(doc.customerName || '').trim());
    if (!customerAddress.trim() && doc.customerAddress) setCustomerAddress(String(doc.customerAddress || '').trim());
    if (!customerGstin.trim() && doc.customerGstin) setCustomerGstin(String(doc.customerGstin || '').trim());

    if (!customerContactPerson.trim() && doc.customerContactPerson) {
      setCustomerContactPerson(String(doc.customerContactPerson || '').trim());
    }
    if (!customerMobile.trim() && doc.customerMobile) setCustomerMobile(String(doc.customerMobile || '').trim());
    if (!customerEmail.trim() && doc.customerEmail) setCustomerEmail(String(doc.customerEmail || '').trim());

    if (!customerStateCode.trim() && doc.customerStateCode) setCustomerStateCode(String(doc.customerStateCode || '').trim());

    if (!deliveryAddress.trim() && doc.deliveryAddress) setDeliveryAddress(String(doc.deliveryAddress || '').trim());
    if (!deliveryMethod.trim() && doc.deliveryMethod) setDeliveryMethod(String(doc.deliveryMethod || '').trim());
    if (!expectedDeliveryDate.trim() && doc.expectedDeliveryDate) setExpectedDeliveryDate(String(doc.expectedDeliveryDate || '').trim());

    if (!departureFromAddress.trim() && doc.departureFromAddress) setDepartureFromAddress(String(doc.departureFromAddress || '').trim());
    if (!departureFromCity.trim() && doc.departureFromCity) setDepartureFromCity(String(doc.departureFromCity || '').trim());
    if (!departureFromState.trim() && doc.departureFromState) setDepartureFromState(String(doc.departureFromState || '').trim());
    if (!departureFromPostalCode.trim() && doc.departureFromPostalCode) setDepartureFromPostalCode(String(doc.departureFromPostalCode || '').trim());

    if (!departureToAddress.trim() && doc.departureToAddress) setDepartureToAddress(String(doc.departureToAddress || '').trim());
    if (!departureToCity.trim() && doc.departureToCity) setDepartureToCity(String(doc.departureToCity || '').trim());
    if (!departureToState.trim() && doc.departureToState) setDepartureToState(String(doc.departureToState || '').trim());
    if (!departureToPostalCode.trim() && doc.departureToPostalCode) setDepartureToPostalCode(String(doc.departureToPostalCode || '').trim());

    if (!paymentTerms.trim() && doc.paymentTerms) setPaymentTerms(String(doc.paymentTerms || '').trim());
    if (!creditPeriod.trim() && doc.creditPeriod) setCreditPeriod(String(doc.creditPeriod || '').trim());
    if (!lateFeeTerms.trim() && doc.lateFeeTerms) setLateFeeTerms(String(doc.lateFeeTerms || '').trim());

    if (!termsConditions.trim() && doc.termsConditions) setTermsConditions(String(doc.termsConditions || '').trim());

    const nextNotes = String((doc.internalNotes || doc.notes) || '').trim();
    if (!notes.trim() && nextNotes) {
      setNotes(nextNotes);
      setInternalNotes(nextNotes);
    }

    if (!warrantyReturnCancellationPolicies.trim() && doc.warrantyReturnCancellationPolicies) {
      setWarrantyReturnCancellationPolicies(String(doc.warrantyReturnCancellationPolicies || '').trim());
    }

    if (!packingHandlingCharges && Number(doc.packingHandlingCharges || 0) > 0) {
      setPackingHandlingCharges(Number(doc.packingHandlingCharges || 0));
    }
    if (!tcs && Number(doc.tcs || 0) > 0) setTcs(Number(doc.tcs || 0));
  };

  const handleReferenceDocSelect = async (inv: PresetInvoice) => {
    setReferenceDocumentId(inv.id);
    setReferenceDocumentNumber(inv.documentNumber);

    if (type === 'order') {
      if (!customerName.trim() && inv.customerName) setCustomerName(inv.customerName || '');
      try {
        const headers = {
          Authorization: `Bearer ${accessToken}`,
          'X-Device-ID': deviceId,
          'X-Profile-ID': profileId,
        };
        const res = await fetch(`${apiUrl}/documents`, { headers });
        const data = await res.json().catch(() => []);
        if (Array.isArray(data)) {
          const fullDoc = data.find((d: any) => String(d?.id || d?._id) === String(inv.id));
          if (fullDoc) applyOrderAutofillFromReferenceQuotation(fullDoc);
        }
      } catch {
        // ignore
      }
    } else {
      setCustomerName(inv.customerName || '');
      setCustomerAddress(inv.customerAddress || '');
      setCustomerGstin(inv.customerGstin || '');
    }

    setReferenceDocOpen(false);
  };

  const loadDocument = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/documents`, {
        headers: { 'Authorization': `Bearer ${accessToken}`, 'X-Device-ID': deviceId, 'X-Profile-ID': profileId },
      });
      const allDocs = await response.json();
      const doc = allDocs.find((d: any) => d.id === id);

      if (doc) {
        setType(doc.type);
        setCustomerName(doc.customerName || '');
        setCustomerAddress(doc.customerAddress || '');
        setCustomerGstin(doc.customerGstin || '');
        setDate(doc.date || '');
        setDueDate(doc.dueDate || '');

        const nextPartyId = String(doc.customerId || doc.supplierId || '').trim();
        setPartyId(nextPartyId);

        setReferenceDocumentId(doc.referenceDocumentId || null);
        setReferenceDocumentNumber(doc.referenceDocumentNumber || '');

        const fallbackCurrency: CurrencyCode = (doc.currency as CurrencyCode) || 'INR';
        setItems(
          (doc.items || []).map((it: any) => ({
            ...it,
            description: it.description || '',
            sku: it.sku || '',
            servicePeriod: it.servicePeriod || '',
            currency: (it.currency as CurrencyCode) || fallbackCurrency,
          }))
        );

        setInvoiceNo(doc.invoiceNo || '');
        setChallanNo(doc.challanNo || '');
        setEwayBillNo(doc.ewayBillNo || '');
        setEwayBillDate(doc.ewayBillDate || '');
        setEwayBillValidUpto(doc.ewayBillValidUpto || '');
        setEwayBillVehicleNo(doc.ewayBillVehicleNo || '');
        setEwayBillTransporterName(doc.ewayBillTransporterName || '');
        setEwayBillTransporterDocNo(doc.ewayBillTransporterDocNo || '');
        setEwayBillDistanceKm(String(doc.ewayBillDistanceKm ?? ''));
        setTransport(doc.transport || '');
        setTransportId(doc.transportId || '');

        setOrderNumber(doc.orderNumber || '');
        setRevisionNumber(doc.revisionNumber || '');
        setReferenceNo(doc.referenceNo || '');
        setPurchaseOrderNo(doc.purchaseOrderNo || '');
        setPoDate(doc.poDate || '');

        setCustomerContactPerson(doc.customerContactPerson || '');
        setCustomerMobile(doc.customerMobile || '');
        setCustomerEmail(doc.customerEmail || '');
        setCustomerStateCode(doc.customerStateCode || '');

        setDeliveryAddress(doc.deliveryAddress || '');
        setDeliveryMethod(doc.deliveryMethod || '');
        setExpectedDeliveryDate(doc.expectedDeliveryDate || '');

        setDepartureFromAddress(doc.departureFromAddress || '');
        setDepartureFromCity(doc.departureFromCity || '');
        setDepartureFromState(doc.departureFromState || '');
        setDepartureFromPostalCode(doc.departureFromPostalCode || '');

        setDepartureToAddress(doc.departureToAddress || '');
        setDepartureToCity(doc.departureToCity || '');
        setDepartureToState(doc.departureToState || '');
        setDepartureToPostalCode(doc.departureToPostalCode || '');

        setBankName(doc.bankName || '');
        setBankBranch(doc.bankBranch || '');
        setBankAccountNumber(doc.bankAccountNumber || '');
        setBankIfsc(doc.bankIfsc || '');
        setUpiId(doc.upiId || '');
        setUpiQrText(doc.upiQrText || '');

        setTransportCharges(doc.transportCharges || 0);
        setAdditionalCharges(doc.additionalCharges || 0);
        setPackingHandlingCharges(doc.packingHandlingCharges || 0);
        setTcs(doc.tcs || 0);
        setRoundOff(doc.roundOff || 0);
        setNotes(doc.notes || doc.internalNotes || '');
        setInternalNotes(doc.internalNotes || doc.notes || '');
        setTermsConditions(doc.termsConditions || '');

        setPaymentTerms(doc.paymentTerms || '');
        setCreditPeriod(doc.creditPeriod || '');
        setLateFeeTerms(doc.lateFeeTerms || '');
        setWarrantyReturnCancellationPolicies(doc.warrantyReturnCancellationPolicies || '');
        setPaymentStatus(doc.paymentStatus || 'unpaid');
        setPaymentMode((doc.paymentMode as PaymentMode) || 'cash');
        setStatus(doc.status || 'draft');

        const cf = Array.isArray((doc as any)?.customFields) ? (doc as any).customFields : [];
        setCustomFields(
          cf
            .map((x: any) => ({ label: String(x?.label || '').trim(), value: String(x?.value || '').trim() }))
            .filter((x: any) => x.label || x.value)
        );
      }
    } catch (error) {
      toast.error('Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  const addCustomField = () => {
    setCustomFields((prev) => [...prev, { label: '', value: '' }]);
  };

  const updateCustomField = (index: number, field: 'label' | 'value', value: string) => {
    setCustomFields((prev) => {
      const next = [...prev];
      const row = next[index] || { label: '', value: '' };
      next[index] = { ...row, [field]: value };
      return next;
    });
  };

  const removeCustomField = (index: number) => {
    setCustomFields((prev) => prev.filter((_, i) => i !== index));
  };

  const calculateItemTotal = (item: DocumentItem) => {
    const qty = Number(item.quantity || 0);
    const rate = Number(item.rate || 0);
    const taxPct = Number(item.cgst || 0) + Number(item.sgst || 0) + Number(item.igst || 0);
    const discountPct = Number(item.discount || 0);

    const gross = qty * rate;
    const discountAmount = (gross * discountPct) / 100;
    const grossAfterDiscount = gross - discountAmount;

    if (type === 'proforma' && proformaPriceMode === 'with_tax') {
      return grossAfterDiscount;
    }

    const taxableAmount = grossAfterDiscount;
    const cgstAmount = (taxableAmount * Number(item.cgst || 0)) / 100;
    const sgstAmount = (taxableAmount * Number(item.sgst || 0)) / 100;
    const igstAmount = (taxableAmount * Number(item.igst || 0)) / 100;
    return taxableAmount + cgstAmount + sgstAmount + igstAmount;
  };

  const formatInr = (value: number) => {
    const n = Number(value || 0);
    if (!Number.isFinite(n)) return '₹ 0.00';
    return `₹ ${n.toFixed(2)}`;
  };

  const proformaRowComputed = (it: DocumentItem) => {
    const qty = Number(it.quantity || 0);
    const rate = Number(it.rate || 0);
    const discountPct = Number(it.discount || 0);
    const taxPct = Number(it.cgst || 0) + Number(it.sgst || 0) + Number(it.igst || 0);

    const gross = qty * rate;
    const discountAmount = (gross * discountPct) / 100;
    const grossAfterDiscount = gross - discountAmount;

    if (proformaPriceMode === 'with_tax') {
      const divisor = 1 + taxPct / 100;
      const taxable = divisor > 0 ? grossAfterDiscount / divisor : grossAfterDiscount;
      const taxAmount = grossAfterDiscount - taxable;
      const amount = grossAfterDiscount;
      return {
        qty,
        rate,
        subtotal: gross,
        discountPct,
        discountAmount,
        taxPct,
        taxAmount,
        amount,
      };
    }

    const taxable = grossAfterDiscount;
    const taxAmount = (taxable * taxPct) / 100;
    const amount = taxable + taxAmount;
    return {
      qty,
      rate,
      subtotal: gross,
      discountPct,
      discountAmount,
      taxPct,
      taxAmount,
      amount,
    };
  };

  const proformaTotals = () => {
    const rows = items.map(proformaRowComputed);
    const subtotal = rows.reduce((s, r) => s + r.subtotal, 0);
    const discountTotal = rows.reduce((s, r) => s + r.discountAmount, 0);
    const taxTotal = rows.reduce((s, r) => s + r.taxAmount, 0);
    const taxableTotal = subtotal - discountTotal;
    const totalBeforeRound = taxableTotal + taxTotal;
    const grandTotal = totalBeforeRound + Number(roundOff || 0);
    return { subtotal, discountTotal, taxTotal, totalBeforeRound, grandTotal };
  };

  const handleCreateCustomerInline = async () => {
    if (!accessToken || !deviceId || !profileId) {
      toast.error('Missing session/profile');
      return;
    }
    const name = String(createCustomerForm.name || '').trim();
    if (!name) {
      toast.error(`${partyKind === 'supplier' ? 'Supplier' : 'Customer'} name is required`);
      return;
    }

    setCreateCustomerSaving(true);
    try {
      const createUrl = partyKind === 'supplier' ? `${apiUrl}/suppliers` : `${apiUrl}/customers`;
      const res = await fetch(createUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-Device-ID': deviceId,
          'X-Profile-ID': profileId,
        },
        body: JSON.stringify({
          name,
          phone: String(createCustomerForm.phone || '').trim() || undefined,
          gstin: String(createCustomerForm.gstin || '').trim() || undefined,
          billingAddress: String(createCustomerForm.billingAddress || '').trim() || undefined,
          logoUrl: String(createCustomerForm.logoUrl || '').trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.error) {
        toast.error(data?.error || `Failed to create ${partyKind === 'supplier' ? 'supplier' : 'customer'}`);
        return;
      }

      const createdId = String(data?.id || data?._id || '').trim();
      const createdName = String(data?.name || name).trim();

      setPresetCustomers((prev) => [{
        id: createdId,
        name: createdName,
        address: data?.address || data?.billingAddress || data?.shippingAddress || '',
        billingAddress: data?.billingAddress || data?.address || '',
        shippingAddress: data?.shippingAddress || '',
        email: data?.email || '',
        phone: data?.phone || '',
        gstin: data?.gstin || '',
        billingState: data?.billingState || data?.state || '',
        state: data?.state || data?.billingState || '',
        logoUrl: data?.logoUrl || String(createCustomerForm.logoUrl || '').trim() || '',
        logoDataUrl: String(createCustomerForm.logoDataUrl || '').trim() || '',
      }, ...prev.filter((c) => String(c.id) !== createdId)]);

      setPartyId(createdId);
      setCustomerName(createdName);
      setCustomerAddress(String(data?.billingAddress || data?.address || '').trim());
      setCustomerGstin(String(data?.gstin || '').trim());
      if (!String(placeOfSupply || '').trim()) {
        const pos = String(data?.billingState || data?.state || '').trim();
        if (pos) setPlaceOfSupply(pos);
      }

      setCreateCustomerOpen(false);
      setPartyPopoverOpen(false);
      setCreateCustomerForm({ name: '', phone: '', gstin: '', billingAddress: '', logoDataUrl: '', logoUrl: '' });
      toast.success(`${partyKind === 'supplier' ? 'Supplier' : 'Customer'} created`);
    } catch (e: any) {
      toast.error(e?.message || `Failed to create ${partyKind === 'supplier' ? 'supplier' : 'customer'}`);
    } finally {
      setCreateCustomerSaving(false);
    }
  };

  const updateItem = (index: number, field: keyof DocumentItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    newItems[index].total = calculateItemTotal(newItems[index]);
    setItems(newItems);
  };

  const tryApplyPresetCustomer = (name: string) => {
    const found = presetCustomers.find(c => (c.name || '').toLowerCase() === name.toLowerCase());
    if (!found) return;
    setCustomerName(found.name || '');
    setCustomerAddress(found.address || '');
    setCustomerGstin(found.gstin || '');
  };

  const gstStateCode = (gstinValue: string) => {
    const cleaned = String(gstinValue || '').trim();
    const m = cleaned.match(/^(\d{2})[A-Z0-9]{13}$/i);
    if (!m) return '';
    return m[1];
  };

  const tryApplyPresetCustomerEnhanced = (name: string) => {
    const found = presetCustomers.find(c => (c.name || '').toLowerCase() === name.toLowerCase());
    if (!found) {
      setPartyId('');
      return;
    }

    setPartyId(found.id || '');

    setCustomerName(found.name || '');

    const nextAddress = String(found.address || found.billingAddress || found.shippingAddress || '').trim();
    if (!customerAddress.trim() && nextAddress) {
      setCustomerAddress(nextAddress);
    }

    const nextGstin = String(found.gstin || '').trim();
    if (!customerGstin.trim() && nextGstin) {
      setCustomerGstin(nextGstin);
    }

    if (type === 'quotation' || type === 'order') {
      const nextEmail = String(found.email || '').trim();
      const nextPhone = String(found.phone || '').trim();
      const nextDelivery = String(found.shippingAddress || found.billingAddress || found.address || '').trim();

      if (!customerEmail.trim() && nextEmail) setCustomerEmail(nextEmail);
      if (!customerMobile.trim() && nextPhone) setCustomerMobile(nextPhone);
      if (!deliveryAddress.trim() && nextDelivery) setDeliveryAddress(nextDelivery);

      const billingCity = String((found as any)?.billingCity || (found as any)?.city || '').trim();
      const billingState = String((found as any)?.billingState || (found as any)?.state || '').trim();
      const billingPin = String((found as any)?.billingPostalCode || (found as any)?.postalCode || '').trim();
      if (!departureFromAddress.trim() && nextAddress) setDepartureFromAddress(nextAddress);
      if (!departureFromCity.trim() && billingCity) setDepartureFromCity(billingCity);
      if (!departureFromState.trim() && billingState) setDepartureFromState(billingState);
      if (!departureFromPostalCode.trim() && billingPin) setDepartureFromPostalCode(billingPin);

      const shippingCity = String((found as any)?.shippingCity || '').trim();
      const shippingState = String((found as any)?.shippingState || '').trim();
      const shippingPin = String((found as any)?.shippingPostalCode || '').trim();
      if (!departureToAddress.trim() && nextDelivery) setDepartureToAddress(nextDelivery);
      if (!departureToCity.trim() && shippingCity) setDepartureToCity(shippingCity);
      if (!departureToState.trim() && shippingState) setDepartureToState(shippingState);
      if (!departureToPostalCode.trim() && shippingPin) setDepartureToPostalCode(shippingPin);

      const inferredState = gstStateCode(nextGstin || customerGstin);
      if (!customerStateCode.trim() && inferredState) setCustomerStateCode(inferredState);
    }
  };

  const tryApplyPresetItem = (index: number, name: string) => {
    const found = presetItems.find(i => (i.name || '').toLowerCase() === name.toLowerCase());
    if (!found) return;

    const isPurchaseDoc = String(type || '').toLowerCase() === 'purchase' || partyKind === 'supplier';
    const nextRate = isPurchaseDoc
      ? (typeof found.purchaseCost === 'number' ? found.purchaseCost : found.rate)
      : (typeof found.sellingPrice === 'number' ? found.sellingPrice : found.rate);

    const newItems = [...items];
    const prev = newItems[index];
    newItems[index] = {
      ...prev,
      name: found.name,
      hsnSac: found.hsnSac || '',
      unit: found.unit || prev.unit,
      rate: typeof nextRate === 'number' ? nextRate : prev.rate,
      sellingPrice: typeof found.sellingPrice === 'number' ? found.sellingPrice : prev.sellingPrice,
      purchaseCost: typeof found.purchaseCost === 'number' ? found.purchaseCost : prev.purchaseCost,
      discount: typeof found.discount === 'number' ? found.discount : prev.discount,
      cgst: typeof found.cgst === 'number' ? found.cgst : prev.cgst,
      sgst: typeof found.sgst === 'number' ? found.sgst : prev.sgst,
      igst: typeof found.igst === 'number' ? found.igst : prev.igst,
    };
    newItems[index].total = calculateItemTotal(newItems[index]);
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, {
      name: '',
      hsnSac: '',
      description: '',
      sku: '',
      servicePeriod: '',
      quantity: 1,
      unit: 'NONE',
      rate: 0,
      sellingPrice: 0,
      purchaseCost: 0,
      currency: 'INR',
      discount: 0,
      cgst: 9,
      sgst: 9,
      igst: 0,
      total: 0
    }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
      return;
    }

    setItems([
      {
        name: '',
        hsnSac: '',
        description: '',
        sku: '',
        servicePeriod: '',
        quantity: 1,
        unit: 'NONE',
        rate: 0,
        sellingPrice: 0,
        purchaseCost: 0,
        currency: 'INR',
        discount: 0,
        cgst: 9,
        sgst: 9,
        igst: 0,
        total: 0,
      },
    ]);
  };

  const calculateTotals = () => {
    if (type === 'proforma') {
      const rows = items.map(proformaRowComputed);
      const itemsTotal = rows.reduce((s, r) => s + r.amount, 0);
      const subtotal = itemsTotal;
      const grandTotal = subtotal + Number(roundOff || 0);

      const taxBreakup = items.reduce(
        (acc, it) => {
          const qty = Number(it.quantity || 0);
          const rate = Number(it.rate || 0);
          const discountPct = Number(it.discount || 0);
          const gross = qty * rate;
          const discountAmount = (gross * discountPct) / 100;
          const grossAfterDiscount = gross - discountAmount;
          const taxPct = Number(it.cgst || 0) + Number(it.sgst || 0) + Number(it.igst || 0);

          const taxable = proformaPriceMode === 'with_tax'
            ? (1 + taxPct / 100) > 0
              ? grossAfterDiscount / (1 + taxPct / 100)
              : grossAfterDiscount
            : grossAfterDiscount;

          acc.totalCgst += (taxable * Number(it.cgst || 0)) / 100;
          acc.totalSgst += (taxable * Number(it.sgst || 0)) / 100;
          acc.totalIgst += (taxable * Number(it.igst || 0)) / 100;
          return acc;
        },
        { totalCgst: 0, totalSgst: 0, totalIgst: 0 }
      );

      return { itemsTotal, subtotal, grandTotal, ...taxBreakup };
    }

    const itemsTotal = items.reduce((sum, item) => sum + item.total, 0);
    const subtotal = itemsTotal + transportCharges + additionalCharges + packingHandlingCharges + tcs;
    const grandTotal = subtotal + roundOff;

    const totalCgst = items.reduce((sum, item) => {
      const taxableAmount = (item.quantity * item.rate) - ((item.quantity * item.rate * item.discount) / 100);
      return sum + (taxableAmount * item.cgst) / 100;
    }, 0);

    const totalSgst = items.reduce((sum, item) => {
      const taxableAmount = (item.quantity * item.rate) - ((item.quantity * item.rate * item.discount) / 100);
      return sum + (taxableAmount * item.sgst) / 100;
    }, 0);
    const totalIgst = items.reduce((sum, item) => {
      const taxableAmount = (item.quantity * item.rate) - ((item.quantity * item.rate * item.discount) / 100);
      return sum + (taxableAmount * item.igst) / 100;
    }, 0);

    return { itemsTotal, subtotal, grandTotal, totalCgst, totalSgst, totalIgst };
  };

  useEffect(() => {
    if (!autoRoundOff) return;
    const { subtotal } = calculateTotals();
    const rounded = Math.round(subtotal);
    const next = parseFloat((rounded - subtotal).toFixed(2));
    setRoundOff(next);
  }, [autoRoundOff, items, transportCharges, additionalCharges, packingHandlingCharges, tcs]);
  const shouldShowPaymentMode =
    type === 'proforma' || type === 'order' || type === 'billing' || type === 'challan';

  const partyLabel = partyKind === 'supplier' ? 'Supplier' : 'Customer';

  const handleSave = async () => {
    if (type === 'invoice_cancellation') {
      if (!referenceDocumentId) {
        toast.error('Reference invoice is required');
        return;
      }
    } else {
      if (!customerName.trim()) {
        toast.error('Customer name is required');
        return;
      }
      if (items.some(item => !item.name.trim())) {
        toast.error('All items must have a name');
        return;
      }
    }

    setSaving(true);
    try {
      const totals = type === 'invoice_cancellation'
        ? {
            itemsTotal: 0,
            subtotal: 0,
            grandTotal: 0,
            totalCgst: 0,
            totalSgst: 0,
            totalIgst: 0,
          }
        : calculateTotals();
      const documentData = {
        type,
        customerName,
        customerAddress,
        customerGstin,
        date,
        dueDate,

        customerId: partyKind === 'customer' ? (partyId || null) : null,
        supplierId: partyKind === 'supplier' ? (partyId || null) : null,

        referenceDocumentId,
        referenceDocumentNumber,

        orderNumber,
        revisionNumber: type === 'order' ? revisionNumber : null,
        referenceNo: type === 'order' || type === 'proforma' ? referenceNo : null,
        purchaseOrderNo: type === 'order' ? purchaseOrderNo : null,
        poDate: type === 'order' ? poDate : null,

        customerContactPerson,
        customerMobile,
        customerEmail,
        customerStateCode,

        deliveryAddress,
        deliveryMethod,
        expectedDeliveryDate,

        departureFromAddress,
        departureFromCity,
        departureFromState,
        departureFromPostalCode,

        departureToAddress,
        departureToCity,
        departureToState,
        departureToPostalCode,

        invoiceNo,
        challanNo,
        ewayBillNo,
        ewayBillDate,
        ewayBillValidUpto,
        ewayBillVehicleNo,
        ewayBillTransporterName,
        ewayBillTransporterDocNo,
        ewayBillDistanceKm: ewayBillDistanceKm ? Number(ewayBillDistanceKm) : 0,
        transport,
        transportId,

        bankName,
        bankBranch,
        bankAccountNumber,
        bankIfsc,
        upiId,
        upiQrText,

        items: type === 'invoice_cancellation' ? [] : items,
        transportCharges,
        additionalCharges,
        packingHandlingCharges,
        tcs,
        roundOff,
        notes,
        internalNotes: internalNotes || notes,
        termsConditions,

        paymentTerms,
        creditPeriod,
        lateFeeTerms,

        paymentStatus,
        paymentMode: shouldShowPaymentMode ? paymentMode : null,
        status,
        warrantyReturnCancellationPolicies,
        placeOfSupply: placeOfSupply || null,

        customFields: (customFields || [])
          .map((x) => ({ label: String(x.label || '').trim(), value: String(x.value || '').trim() }))
          .filter((x) => x.label || x.value),
        ...totals
      };

      const url = isEdit 
        ? `${apiUrl}/documents/${id}`
        : `${apiUrl}/documents`;
      
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-Device-ID': deviceId,
          'X-Profile-ID': profileId,
        },
        body: JSON.stringify(documentData),
      });

      const data = await response.json();
      
      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success(isEdit ? 'Document updated!' : 'Document created!');
        navigate('/documents');
      }
    } catch (error) {
      toast.error('Failed to save document');
    } finally {
      setSaving(false);
    }
  };

  const currencySymbol = (code: CurrencyCode) => {
    switch (code) {
      case 'USD':
        return '$';
      case 'EUR':
        return '€';
      case 'GBP':
        return '£';
      case 'INR':
      default:
        return '₹';
    }
  };

  const primaryCurrency: CurrencyCode = items[0]?.currency || 'INR';
  const primarySymbol = currencySymbol(primaryCurrency);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <TraceLoader label="Loading document..." />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-[calc(100vh-64px)] bg-muted/30">
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="space-y-4">
            <Card className="shadow-sm">
              <CardContent className="p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <Button variant="outline" size="icon" onClick={() => navigate('/documents')}>
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                      <div className="text-xl font-semibold text-foreground">
                        {type === 'proforma'
                          ? 'Proforma Invoice'
                          : type === 'invoice'
                            ? 'Invoice'
                            : type === 'quotation'
                              ? 'Quotation'
                              : type === 'order'
                                ? 'Order'
                                : type === 'challan'
                                  ? 'Delivery Challan'
                                  : type === 'purchase'
                                    ? 'Purchase Invoice'
                                    : type === 'invoice_cancellation'
                                      ? 'Invoice Cancellation'
                                      : 'Create Document'}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="grid grid-cols-2 gap-2 items-center">
                      <div className="text-xs text-muted-foreground text-right">Ref No.</div>
                      <Input
                        readOnly={type === 'proforma'}
                        value={(type === 'proforma' ? (referenceNo || 'Auto') : referenceNo) || ''}
                        onChange={(e) => {
                          if (type !== 'proforma') setReferenceNo(e.target.value);
                        }}
                        className="h-9"
                      />
                      <div className="text-xs text-muted-foreground text-right">Invoice Date</div>
                      <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9" />
                      <div className="text-xs text-muted-foreground text-right">State of supply</div>
                      <Select value={placeOfSupply} onValueChange={setPlaceOfSupply}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {INDIAN_STATES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button onClick={handleSave} disabled={saving} className="h-9 px-5">
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardContent className="p-4">
                <div className="max-w-[360px]">
                  <Label>{partyKind === 'supplier' ? 'Supplier' : 'Customer'} *</Label>
                  <Popover open={partyPopoverOpen} onOpenChange={setPartyPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" role="combobox" className="w-full justify-between h-9">
                        <span className="truncate">
                          {partyId
                            ? (presetCustomers.find((c) => String(c.id) === String(partyId))?.name || 'Select')
                            : 'Select'}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                      <Command>
                        <CommandInput placeholder={`Search ${partyKind === 'supplier' ? 'supplier' : 'customer'}...`} />
                        <CommandList>
                          <CommandEmpty>
                            <div className="p-2 text-sm text-muted-foreground">
                              No {partyKind === 'supplier' ? 'supplier' : 'customer'} found.
                            </div>
                            <div className="p-2">
                              <Button type="button" variant="outline" className="w-full" onClick={() => setCreateCustomerOpen(true)}>
                                + Create {partyKind === 'supplier' ? 'Supplier' : 'Customer'}
                              </Button>
                            </div>
                          </CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="__create_customer__"
                              onSelect={() => setCreateCustomerOpen(true)}
                            >
                              + Create {partyKind === 'supplier' ? 'Supplier' : 'Customer'}
                            </CommandItem>
                            {presetCustomers.map((c) => (
                              <CommandItem
                                key={c.id}
                                value={c.name}
                                onSelect={() => {
                                  const nextId = String(c.id);
                                  setPartyId(nextId);
                                  setCustomerName(String(c.name || ''));
                                  setCustomerAddress(String(c.address || c.billingAddress || '').trim());
                                  setCustomerGstin(String(c.gstin || '').trim());
                                  if (!String(placeOfSupply || '').trim()) {
                                    const pos = String((c as any)?.billingState || (c as any)?.state || '').trim();
                                    if (pos) setPlaceOfSupply(pos);
                                  }
                                  setPartyPopoverOpen(false);
                                }}
                              >
                                <Check className={partyId === c.id ? 'mr-2 h-4 w-4 opacity-100' : 'mr-2 h-4 w-4 opacity-0'} />
                                <span className="truncate">{c.name}</span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardContent className="p-0">
                <div className="w-full overflow-auto">
                  <div className="min-w-[1100px]">
                    <div className="grid grid-cols-[40px_2fr_80px_90px_160px_70px_110px_70px_110px_160px_40px] sticky top-0 z-10 bg-muted/50 backdrop-blur supports-[backdrop-filter]:bg-muted/40 text-xs font-semibold text-muted-foreground border-b">
                      <div className="px-2 py-2">#</div>
                      <div className="px-2 py-2">ITEM</div>
                      <div className="px-2 py-2">QTY</div>
                      <div className="px-2 py-2">UNIT</div>
                      <div className="px-2 py-2">
                        <div>PRICE/UNIT</div>
                        <Select value={proformaPriceMode} onValueChange={(v) => setProformaPriceMode(v as any)}>
                          <SelectTrigger className="h-7 mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="without_tax">Without Tax</SelectItem>
                            <SelectItem value="with_tax">With Tax</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="px-2 py-2 col-span-2">DISCOUNT</div>
                      <div className="px-2 py-2 col-span-2">TAX</div>
                      <div className="px-2 py-2 text-right">AMOUNT</div>
                      <div className="px-2 py-2" />
                    </div>
                    <div className="grid grid-cols-[40px_2fr_80px_90px_160px_70px_110px_70px_110px_160px_40px] bg-muted/25 text-[10px] font-medium text-muted-foreground border-b">
                      <div className="px-2 py-2" />
                      <div className="px-2 py-2" />
                      <div className="px-2 py-2" />
                      <div className="px-2 py-2" />
                      <div className="px-2 py-2" />
                      <div className="px-2 py-2">%</div>
                      <div className="px-2 py-2">AMOUNT</div>
                      <div className="px-2 py-2">%</div>
                      <div className="px-2 py-2">AMOUNT</div>
                      <div className="px-2 py-2" />
                      <div className="px-2 py-2" />
                    </div>

                    {items.map((it, idx) => {
                      const row = proformaRowComputed(it);
                      return (
                        <div key={idx} className="grid grid-cols-[40px_2fr_80px_90px_160px_70px_110px_70px_110px_160px_40px] border-b bg-background">
                          <div className="px-2 py-2 text-xs text-muted-foreground">{idx + 1}</div>
                          <div className="px-2 py-2">
                            <Popover
                              open={!!proformaItemPopoverOpen[idx]}
                              onOpenChange={(open) => setProformaItemPopoverOpen((prev) => ({ ...prev, [idx]: open }))}
                            >
                              <PopoverTrigger asChild>
                                <Button type="button" variant="outline" role="combobox" className="w-full justify-between h-9">
                                  <span className="truncate">{it.name?.trim() ? it.name : 'Select item'}</span>
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                                <Command>
                                  <CommandInput placeholder="Search item..." />
                                  <CommandList>
                                    <CommandEmpty>
                                      <div className="p-2 text-sm text-muted-foreground">No item found.</div>
                                      <div className="p-2">
                                        <Button
                                          type="button"
                                          variant="outline"
                                          className="w-full"
                                          onClick={() => {
                                            setCreateItemTargetIndex(idx);
                                            setCreateItemOpen(true);
                                          }}
                                        >
                                          + Create Item
                                        </Button>
                                      </div>
                                    </CommandEmpty>
                                    <CommandGroup>
                                      <CommandItem
                                        value="__create_item__"
                                        onSelect={() => {
                                          setCreateItemTargetIndex(idx);
                                          setCreateItemOpen(true);
                                        }}
                                      >
                                        + Create Item
                                      </CommandItem>
                                      {presetItems.map((p) => (
                                        <CommandItem
                                          key={p.id}
                                          value={p.name}
                                          onSelect={() => {
                                            updateItem(idx, 'name', String(p.name || ''));
                                            tryApplyPresetItem(idx, String(p.name || ''));
                                            setProformaItemPopoverOpen((prev) => ({ ...prev, [idx]: false }));
                                          }}
                                        >
                                          <Check
                                            className={
                                              String(it.name || '').toLowerCase() === String(p.name || '').toLowerCase()
                                                ? 'mr-2 h-4 w-4 opacity-100'
                                                : 'mr-2 h-4 w-4 opacity-0'
                                            }
                                          />
                                          <span className="truncate">{p.name}</span>
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </div>
                          <div className="px-2 py-2">
                            <Input type="number" value={it.quantity} onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value || 0))} className="h-9" />
                          </div>
                          <div className="px-2 py-2">
                            <Select value={String(it.unit || 'NONE')} onValueChange={(v) => updateItem(idx, 'unit', v)}>
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="NONE" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="NONE">NONE</SelectItem>
                                <SelectItem value="pcs">PCS</SelectItem>
                                <SelectItem value="kg">KG</SelectItem>
                                <SelectItem value="box">BOX</SelectItem>
                                <SelectItem value="set">SET</SelectItem>
                                <SelectItem value="ltr">LTR</SelectItem>
                                <SelectItem value="nos">NOS</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="px-2 py-2">
                            <Input type="number" value={it.rate} onChange={(e) => updateItem(idx, 'rate', Number(e.target.value || 0))} className="h-9" />
                          </div>
                          <div className="px-2 py-2">
                            <Input type="number" value={it.discount} onChange={(e) => updateItem(idx, 'discount', Number(e.target.value || 0))} className="h-9" />
                          </div>
                          <div className="px-2 py-2">
                            <Input
                              type="number"
                              value={Number.isFinite(row.discountAmount) ? Number(row.discountAmount || 0).toFixed(2) : '0.00'}
                              onChange={(e) => {
                                const nextAmount = Number(e.target.value || 0);
                                if (!Number.isFinite(nextAmount) || nextAmount < 0) return;
                                const pct = row.subtotal > 0 ? parseFloat(((nextAmount / row.subtotal) * 100).toFixed(2)) : 0;
                                updateItem(idx, 'discount', pct);
                              }}
                              className="h-9"
                            />
                          </div>
                          <div className="px-2 py-2">
                            <Select
                              value={String(row.taxPct)}
                              onValueChange={(v) => {
                                const next = Number(v || 0);
                                const half = parseFloat((next / 2).toFixed(2));
                                updateItem(idx, 'igst', 0);
                                updateItem(idx, 'cgst', half);
                                updateItem(idx, 'sgst', half);
                              }}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="0">0%</SelectItem>
                                <SelectItem value="5">5%</SelectItem>
                                <SelectItem value="12">12%</SelectItem>
                                <SelectItem value="18">18%</SelectItem>
                                <SelectItem value="28">28%</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="px-2 py-2">
                            <Input readOnly value={Number(row.taxAmount || 0).toFixed(2)} className="h-9" />
                          </div>
                          <div className="px-2 py-2 text-right font-semibold">
                            {formatInr(row.amount)}
                          </div>
                          <div className="px-2 py-2 flex items-center justify-center">
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(idx)} aria-label="Remove row">
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}

                    <div className="grid grid-cols-[40px_2fr_80px_90px_160px_70px_110px_70px_110px_160px_40px] bg-background">
                      <div className="px-2 py-2">
                        <Button type="button" variant="outline" size="sm" onClick={addItem}>
                          Add Row
                        </Button>
                      </div>
                      <div className="px-2 py-2" />
                      <div className="px-2 py-2 text-xs text-muted-foreground">TOTAL</div>
                      <div className="px-2 py-2 text-xs text-muted-foreground text-right">
                        {items.reduce((s, x) => s + Number(x.quantity || 0), 0)}
                      </div>
                      <div className="px-2 py-2" />
                      <div className="px-2 py-2" />
                      <div className="px-2 py-2" />
                      <div className="px-2 py-2" />
                      <div className="px-2 py-2" />
                      <div className="px-2 py-2 text-right font-semibold">
                        {formatInr(proformaTotals().grandTotal)}
                      </div>
                      <div className="px-2 py-2" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              <div className="flex flex-col gap-2">
                {shouldShowPaymentMode && (
                  <div className="max-w-[320px]">
                    <Label className="text-xs text-muted-foreground">Payment Type</Label>
                    <div className="mt-1 grid grid-cols-2 gap-2">
                      <Select value={paymentMode} onValueChange={(v) => setPaymentMode(v as PaymentMode)}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="online">Online</SelectItem>
                          <SelectItem value="cheque">Cheque</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select value={paymentStatus} onValueChange={(v) => setPaymentStatus(v as 'unpaid' | 'paid')}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unpaid">Unpaid</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                <Button type="button" variant="outline" size="sm" onClick={() => setProformaShowDescription(true)}>
                  Add Description
                </Button>
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    id="proforma-attachment-input"
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null;
                      setProformaAttachment(f);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const el = document.getElementById('proforma-attachment-input') as HTMLInputElement | null;
                      el?.click();
                    }}
                  >
                  Add Image
                </Button>
                </div>

                {proformaShowDescription && (
                  <div className="mt-2 max-w-[520px]">
                    <Label>Description</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      placeholder="Enter description"
                    />
                  </div>
                )}

                {proformaAttachment && (
                  <div className="text-xs text-muted-foreground">Attachment: {proformaAttachment.name}</div>
                )}
              </div>

              <Card className="shadow-sm w-full lg:w-[360px] bg-background/80">
                <CardContent className="p-4 space-y-3">
                  {(() => {
                    const t = proformaTotals();
                    return (
                      <>
                        <div className="flex items-center justify-between text-sm">
                          <div className="text-muted-foreground">Subtotal</div>
                          <div className="font-medium">{formatInr(t.subtotal)}</div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <div className="text-muted-foreground">Discount Total</div>
                          <div className="font-medium">{formatInr(t.discountTotal)}</div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <div className="text-muted-foreground">Tax Total</div>
                          <div className="font-medium">{formatInr(t.taxTotal)}</div>
                        </div>

                        <div className="flex items-center justify-between text-sm gap-3">
                          <label className="flex items-center gap-2">
                            <input type="checkbox" checked={autoRoundOff} onChange={(e) => setAutoRoundOff(e.target.checked)} />
                            <span className="text-muted-foreground">Round Off</span>
                          </label>
                          <Input className="h-9 w-[110px]" value={roundOff} onChange={(e) => setRoundOff(parseFloat(e.target.value) || 0)} />
                        </div>

                        <div className="pt-2 border-t flex items-center justify-between">
                          <div className="text-sm font-semibold">Grand Total</div>
                          <div className="text-base font-bold text-primary">{formatInr(t.grandTotal)}</div>
                        </div>
                      </>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>
          </div>

        <Sheet open={createCustomerOpen} onOpenChange={setCreateCustomerOpen}>
          <SheetContent side="right" className="w-full sm:max-w-[420px]">
            <SheetHeader>
              <SheetTitle>Create Customer</SheetTitle>
              <SheetDescription>Add a new customer without leaving this page.</SheetDescription>
            </SheetHeader>
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label>Customer Name *</Label>
                <Input
                  value={createCustomerForm.name}
                  onChange={(e) => setCreateCustomerForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Enter name"
                  className="h-9"
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={createCustomerForm.phone}
                  onChange={(e) => setCreateCustomerForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="+91 99999 99999"
                />
              </div>
              <div>
                <Label>GSTIN</Label>
                <Input
                  value={createCustomerForm.gstin}
                  onChange={(e) => setCreateCustomerForm((p) => ({ ...p, gstin: e.target.value }))}
                  placeholder="22AAAAA0000A1Z5"
                />
              </div>
              <div>
                <Label>Billing Address</Label>
                <Textarea
                  value={createCustomerForm.billingAddress}
                  onChange={(e) => setCreateCustomerForm((p) => ({ ...p, billingAddress: e.target.value }))}
                  rows={3}
                  placeholder="Enter billing address"
                />
              </div>

              <div>
                <Label>Logo</Label>
                <div className="flex items-center gap-3">
                  <input
                    id="create-party-logo"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const dataUrl = await fileToDataUrl(file);
                        setCreateCustomerForm((p) => ({ ...p, logoDataUrl: dataUrl }));
                        const url = await uploadLogoToCloudinary(dataUrl);
                        setCreateCustomerForm((p) => ({ ...p, logoUrl: url }));
                      } catch (err: any) {
                        toast.error(err?.message || 'Failed to upload logo');
                      }
                    }}
                  />
                  <Button type="button" variant="outline" asChild>
                    <label htmlFor="create-party-logo" style={{ cursor: 'pointer' }}>
                      {createCustomerForm.logoDataUrl ? 'Change Logo' : 'Upload Logo'}
                    </label>
                  </Button>
                  {!!createCustomerForm.logoDataUrl && (
                    <img
                      src={String(createCustomerForm.logoDataUrl)}
                      alt="Logo"
                      className="h-10 w-10 rounded border object-contain bg-white"
                    />
                  )}
                </div>
              </div>
            </div>
            <SheetFooter>
              <div className="flex items-center justify-end gap-2 w-full">
                <Button type="button" variant="outline" onClick={() => setCreateCustomerOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" onClick={handleCreateCustomerInline} disabled={createCustomerSaving}>
                  {createCustomerSaving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </SheetFooter>
          </SheetContent>
        </Sheet>

      </div>
      </div>
    </AppLayout>
  );
}
