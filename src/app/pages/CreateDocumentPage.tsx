import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
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
import { 
  GstinInput, 
  PanInput, 
  EmailInput, 
  PhoneInput,
  FieldWrapper 
} from '../components/FormattedInputs';
import { MobileFormSheet, MobileFormSection, MobileFormActions } from '../components/MobileFormSheet';
import { useCurrentProfile } from '../hooks/useCurrentProfile';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../components/ui/accordion';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/ui/collapsible';
import { Check, ChevronDown, ChevronUp, ChevronsUpDown, Plus, Save, Trash2, ArrowLeft, Info } from 'lucide-react';
import QRCode from 'qrcode';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../config/api';
import { toast } from 'sonner';
import { useTour } from '../contexts/TourContext';
import { TraceLoader } from '../components/TraceLoader';
import { INDIAN_STATES } from '../utils/indianStates';
import {
  hasContactErrors,
  normalizeEmail,
  normalizeGstin,
  normalizePhone,
  validateContactFields,
} from '../utils/contactValidation';

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
  const { isDemoMode } = useTour();

  const [optionsOpen, setOptionsOpen] = useState(false);

  const [showInvoiceMetadata, setShowInvoiceMetadata] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem('createDocument.showInvoiceMetadata');
      if (raw === null) return true;
      return raw === '1';
    } catch {
      return true;
    }
  });

  const [showShippingLogistics, setShowShippingLogistics] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem('createDocument.showShippingLogistics');
      if (raw === null) return true;
      return raw === '1';
    } catch {
      return true;
    }
  });

  const [showBankDetails, setShowBankDetails] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem('createDocument.showBankDetails');
      if (raw === null) return true;
      return raw === '1';
    } catch {
      return true;
    }
  });

  const [showTermsNotes, setShowTermsNotes] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem('createDocument.showTermsNotes');
      if (raw === null) return true;
      return raw === '1';
    } catch {
      return true;
    }
  });

  const [showPaymentBox, setShowPaymentBox] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem('createDocument.showPaymentBox');
      if (raw === null) return true;
      return raw === '1';
    } catch {
      return true;
    }
  });

  const [showCharges, setShowCharges] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem('createDocument.showCharges');
      if (raw === null) return true;
      return raw === '1';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('createDocument.showInvoiceMetadata', showInvoiceMetadata ? '1' : '0');
    } catch {
      // ignore
    }
  }, [showInvoiceMetadata]);

  useEffect(() => {
    try {
      localStorage.setItem('createDocument.showShippingLogistics', showShippingLogistics ? '1' : '0');
    } catch {
      // ignore
    }
  }, [showShippingLogistics]);

  useEffect(() => {
    try {
      localStorage.setItem('createDocument.showBankDetails', showBankDetails ? '1' : '0');
    } catch {
      // ignore
    }
  }, [showBankDetails]);

  useEffect(() => {
    try {
      localStorage.setItem('createDocument.showTermsNotes', showTermsNotes ? '1' : '0');
    } catch {
      // ignore
    }
  }, [showTermsNotes]);

  useEffect(() => {
    try {
      localStorage.setItem('createDocument.showPaymentBox', showPaymentBox ? '1' : '0');
    } catch {
      // ignore
    }
  }, [showPaymentBox]);

  useEffect(() => {
    try {
      localStorage.setItem('createDocument.showCharges', showCharges ? '1' : '0');
    } catch {
      // ignore
    }
  }, [showCharges]);

  useEffect(() => {
    try {
      const root = document.documentElement;
      const prev = root.style.getPropertyValue('--content-max');
      root.style.setProperty('--content-max', '100%');
      return () => {
        if (prev) root.style.setProperty('--content-max', prev);
        else root.style.removeProperty('--content-max');
      };
    } catch {
      return;
    }
  }, []);
  
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
  const [paymentStatus, setPaymentStatus] = useState<'unpaid' | 'partial' | 'paid'>('unpaid');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');
  const [status, setStatus] = useState<'draft' | 'final'>('final');
  const [receivedAmount, setReceivedAmount] = useState<number>(0);

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

  const [partyContactErrors, setPartyContactErrors] = useState<{ gstin?: string; phone?: string; email?: string }>({});

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

  const [bankAccountId, setBankAccountId] = useState<string>('');

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
  const [createCustomerGstinLookupLoading, setCreateCustomerGstinLookupLoading] = useState(false);
  const [createPartySameAsBilling, setCreatePartySameAsBilling] = useState(true);
  const [createPartyShippingEdited, setCreatePartyShippingEdited] = useState(false);
  const [createCustomerForm, setCreateCustomerForm] = useState<{
    name: string;
    ownerName: string;
    email: string;
    phone: string;
    openingBalance: string;
    openingBalanceType: 'dr' | 'cr';
    gstin: string;
    pan: string;
    billingAddress: string;
    billingCity: string;
    billingState: string;
    billingPostalCode: string;
    shippingAddress: string;
    shippingCity: string;
    shippingState: string;
    shippingPostalCode: string;
    logoDataUrl: string;
    logoUrl: string;
  }>(
    {
      name: '',
      ownerName: '',
      email: '',
      phone: '',
      openingBalance: '',
      openingBalanceType: 'dr',
      gstin: '',
      pan: '',
      billingAddress: '',
      billingCity: '',
      billingState: '',
      billingPostalCode: '',
      shippingAddress: '',
      shippingCity: '',
      shippingState: '',
      shippingPostalCode: '',
      logoDataUrl: '',
      logoUrl: '',
    }
  );

  const [createPartyContactErrors, setCreatePartyContactErrors] = useState<{ gstin?: string; phone?: string; email?: string }>({});
  const [showSaveCustomerPrompt, setShowSaveCustomerPrompt] = useState(false);
  const [similarCustomers, setSimilarCustomers] = useState<PresetCustomer[]>([]);
  const [pendingSavePayload, setPendingSavePayload] = useState<any>(null);

  const [proformaItemPopoverOpen, setProformaItemPopoverOpen] = useState<Record<number, boolean>>({});
  const [createItemOpen, setCreateItemOpen] = useState(false);
  const [createItemSaving, setCreateItemSaving] = useState(false);
  const [createItemTargetIndex, setCreateItemTargetIndex] = useState<number | null>(null);
  const [createItemForm, setCreateItemForm] = useState<{
    name: string;
    hsnSac: string;
    unit: string;
    rate: string;
    sellingPrice: string;
    purchaseCost: string;
    discount: string;
    cgst: string;
    sgst: string;
    igst: string;
    description: string;
  }>({
    name: '',
    hsnSac: '',
    unit: 'pcs',
    rate: '0',
    sellingPrice: '0',
    purchaseCost: '0',
    discount: '0',
    cgst: '9',
    sgst: '9',
    igst: '0',
    description: '',
  });

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
    if (!profile?.id) throw new Error('Select a business profile first');
    const res = await fetch(`${apiUrl}/uploads/logo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'X-Device-ID': deviceId,
        'X-Profile-ID': profile?.id,
      },
      body: JSON.stringify({ dataUrl, folder: `hukum/logos/${profile?.id}/parties` }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || 'Failed to upload logo');
    }
    const url = String(data?.url || '').trim();
    if (!url) throw new Error('Failed to upload logo');
    return url;
  };

  const handleCreateCustomerGstinLookup = async () => {
    if (!accessToken || !deviceId || !profile?.id) return;
    const gstin = String(createCustomerForm.gstin || '').trim().toUpperCase().replace(/\s+/g, '');
    if (!gstin) return;
    if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/.test(gstin)) return;

    setCreateCustomerGstinLookupLoading(true);
    try {
      const lookupUrl = partyKind === 'supplier' ? `${apiUrl}/suppliers/gstin/lookup` : `${apiUrl}/customers/gstin/lookup`;
      const res = await fetch(lookupUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          'X-Device-ID': deviceId,
          'X-Profile-ID': profile?.id,
        },
        body: JSON.stringify({ gstin }),
      });
      const rawText = await res.text().catch(() => '');
      const data = (() => {
        try {
          return rawText ? JSON.parse(rawText) : null;
        } catch {
          return null;
        }
      })();

      if (!res.ok || data?.error) {
        const serverMsg = String(data?.error || data?.message || '').trim();
        const hint = res.status === 404
          ? 'GSTIN lookup endpoint not available on server (deploy backend / restart server).'
          : res.status === 405
            ? 'GSTIN lookup method not allowed (server route mismatch).'
            : '';
        toast.error(serverMsg || hint || `GSTIN lookup failed (${res.status})`);
        return;
      }

      setCreateCustomerForm((prev) => {
        const next = { ...prev };
        if (!String(next.name || '').trim() && String(data?.name || '').trim()) next.name = String(data.name);
        if (!String(next.ownerName || '').trim() && String(data?.ownerName || '').trim()) next.ownerName = String(data.ownerName);
        if (!String(next.pan || '').trim() && String(data?.pan || '').trim()) next.pan = String(data.pan);

        if (!String(next.billingAddress || '').trim() && String(data?.billingAddress || '').trim()) next.billingAddress = String(data.billingAddress);
        if (!String(next.billingCity || '').trim() && String(data?.billingCity || '').trim()) next.billingCity = String(data.billingCity);
        if (!String(next.billingState || '').trim() && String(data?.billingState || '').trim()) next.billingState = String(data.billingState);
        if (!String(next.billingPostalCode || '').trim() && String(data?.billingPostalCode || '').trim()) next.billingPostalCode = String(data.billingPostalCode);

        if (createPartySameAsBilling && !createPartyShippingEdited) {
          next.shippingAddress = next.billingAddress;
          next.shippingCity = next.billingCity;
          next.shippingState = next.billingState;
          next.shippingPostalCode = next.billingPostalCode;
        }
        return next;
      });
    } catch (e: any) {
      toast.error(e?.message || 'GSTIN lookup failed');
    } finally {
      setCreateCustomerGstinLookupLoading(false);
    }
  };

  const handleCreateItemInline = async () => {
    if (!accessToken || !deviceId || !profile?.id) {
      toast.error('Missing session/profile');
      return;
    }

    const name = String(createItemForm.name || '').trim();
    if (!name) {
      toast.error('Item name is required');
      return;
    }

    const unit = String(createItemForm.unit || 'pcs').trim() || 'pcs';
    const rate = Number(createItemForm.rate || 0);
    const sellingPrice = Number(createItemForm.sellingPrice || 0);
    const purchaseCost = Number(createItemForm.purchaseCost || 0);
    const discount = Number(createItemForm.discount || 0);
    const cgst = Number(createItemForm.cgst || 0);
    const sgst = Number(createItemForm.sgst || 0);
    const igst = Number(createItemForm.igst || 0);
    const description = String(createItemForm.description || '').trim() || undefined;
    const hsnSac = String(createItemForm.hsnSac || '').trim() || undefined;

    setCreateItemSaving(true);
    try {
      const res = await fetch(`${apiUrl}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-Device-ID': deviceId,
          'X-Profile-ID': profile?.id,
        },
        body: JSON.stringify({
          name,
          unit,
          rate: Number.isFinite(rate) ? rate : 0,
          sellingPrice: Number.isFinite(sellingPrice) ? sellingPrice : Number.isFinite(rate) ? rate : 0,
          purchaseCost: Number.isFinite(purchaseCost) ? purchaseCost : 0,
          discount: Number.isFinite(discount) ? discount : 0,
          hsnSac,
          cgst: Number.isFinite(cgst) ? cgst : 0,
          sgst: Number.isFinite(sgst) ? sgst : 0,
          igst: Number.isFinite(igst) ? igst : 0,
          description,
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
          sellingPrice: typeof data?.sellingPrice === 'number' ? data.sellingPrice : Number.isFinite(sellingPrice) ? sellingPrice : Number(rate || 0),
          purchaseCost: typeof data?.purchaseCost === 'number' ? data.purchaseCost : Number.isFinite(purchaseCost) ? purchaseCost : 0,
          discount: typeof data?.discount === 'number' ? data.discount : Number.isFinite(discount) ? discount : 0,
          hsnSac: String(data?.hsnSac || data?.hsn || data?.sac || hsnSac || ''),
          cgst: Number(data?.cgst ?? cgst ?? 0) || 0,
          sgst: Number(data?.sgst ?? sgst ?? 0) || 0,
          igst: Number(data?.igst ?? igst ?? 0) || 0,
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
          sellingPrice: Number.isFinite(sellingPrice) ? sellingPrice : Number.isFinite(rate) ? rate : 0,
          purchaseCost: Number.isFinite(purchaseCost) ? purchaseCost : 0,
          discount: Number.isFinite(discount) ? discount : 0,
          hsnSac: String(hsnSac || ''),
          cgst: Number.isFinite(cgst) ? cgst : 0,
          sgst: Number.isFinite(sgst) ? sgst : 0,
          igst: Number.isFinite(igst) ? igst : 0,
          description: String(createItemForm.description || '').trim() || undefined,
        };
        newItems[idx].total = calculateItemTotal(newItems[idx]);
        setItems(newItems);
      }

      setCreateItemOpen(false);
      setCreateItemTargetIndex(null);
      setCreateItemForm({
        name: '',
        hsnSac: '',
        unit: 'pcs',
        rate: '0',
        sellingPrice: '0',
        purchaseCost: '0',
        discount: '0',
        cgst: '9',
        sgst: '9',
        igst: '0',
        description: '',
      });
      toast.success('Item created');
      window.dispatchEvent(new CustomEvent('dashboardRefresh'));
    } catch (e: any) {
      toast.error(e?.message || 'Failed to create item');
    } finally {
      setCreateItemSaving(false);
    }
  };

  const apiUrl = API_URL;
  const { profile } = useCurrentProfile();

  // Reset all state when profile switches to prevent data bleed
  useEffect(() => {
    setLoading(false);
    setSaving(false);
    // Add other state resets here if needed
  }, [profile?.id]);

  // Demo Mode Pre-fill
  useEffect(() => {
    if (!isDemoMode) return;
    
    // Virtual delay to simulate real app feel
    const timer = setTimeout(() => {
      setCustomerName('Global Tech Solutions Pvt Ltd');
      setCustomerAddress('123, Dynamic Tower, Silicon Valley, Bengaluru, KA - 560001');
      setCustomerGstin('29ABCDE1234F1Z5');
      setCustomerMobile('9876543210');
      setCustomerEmail('purchasing@globaltech.com');
      setPlaceOfSupply('Karnataka');
      setItems([
        {
          name: 'Professional Business Laptop',
          hsnSac: '8471',
          description: 'High performance laptop with 32GB RAM',
          quantity: 2,
          unit: 'pcs',
          rate: 55000,
          currency: 'INR',
          discount: 10,
          cgst: 9,
          sgst: 9,
          igst: 0,
          total: 99000
        },
        {
          name: 'Cloud Infrastructure Setup',
          hsnSac: '9983',
          description: 'One-time setup fee',
          quantity: 1,
          unit: 'set',
          rate: 15000,
          currency: 'INR',
          discount: 0,
          cgst: 9,
          sgst: 9,
          igst: 0,
          total: 17700
        }
      ]);
      toast.info('Demo Mode: Pre-filled with virtual data.');
    }, 500);
    
    return () => clearTimeout(timer);
  }, [isDemoMode]);

  // Keep in sync when AppLayout refreshes profile from the server on mount
  // Handled by useCurrentProfile hook now

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

    const accounts = Array.isArray(profile?.bankAccounts) ? profile.bankAccounts : [];
    const defaultId = String(profile?.defaultBankAccountId || '').trim();
    const fallbackDefault = accounts.find((a: any) => a?.isDefault && a?._id) || null;
    const resolvedDefaultId = defaultId || String(fallbackDefault?._id || '').trim();
    if (!bankAccountId && resolvedDefaultId) setBankAccountId(resolvedDefaultId);

    const selected = resolvedDefaultId
      ? accounts.find((a: any) => String(a?._id || '') === String(resolvedDefaultId))
      : null;

    const nextBankName = String(profile?.bankName || '').trim();
    const nextBranch = String(profile?.bankBranch || '').trim();
    const nextAcc = String(profile?.accountNumber || '').trim();
    const nextIfsc = String(profile?.ifscCode || '').trim();
    const nextUpi = String(profile?.upiId || '').trim();

    const nextSelBankName = String(selected?.bankName || '').trim();
    const nextSelBranch = String(selected?.bankBranch || '').trim();
    const nextSelAcc = String(selected?.accountNumber || '').trim();
    const nextSelIfsc = String(selected?.ifscCode || '').trim();
    const nextSelUpi = String(selected?.upiId || '').trim();
    const nextSelUpiQr = String(selected?.upiQrText || '').trim();

    if (!bankName && (nextSelBankName || nextBankName)) setBankName(nextSelBankName || nextBankName);
    if (!bankBranch && (nextSelBranch || nextBranch)) setBankBranch(nextSelBranch || nextBranch);
    if (!bankAccountNumber && (nextSelAcc || nextAcc)) setBankAccountNumber(nextSelAcc || nextAcc);
    if (!bankIfsc && (nextSelIfsc || nextIfsc)) setBankIfsc(nextSelIfsc || nextIfsc);
    if (!upiId && (nextSelUpi || nextUpi)) setUpiId(nextSelUpi || nextUpi);
    if (!upiQrText && nextSelUpiQr) setUpiQrText(nextSelUpiQr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, profile?.id]);

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
    if (!accessToken || !deviceId || !profile?.id) return;
    void loadPresets();
  }, [accessToken, deviceId, profile?.id, type, partyKind]);

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
    if (!accessToken || !deviceId || !profile?.id) return;
    if (type !== 'invoice_cancellation' && type !== 'order') return;
    void loadReferenceDocs();
  }, [accessToken, deviceId, profile?.id, type]);

  const loadPresets = async () => {
    try {
      const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'X-Device-ID': deviceId,
        'X-Profile-ID': profile?.id,
      };

      if (!profile?.id) return; // Wait for profile?.id to be loaded

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
    } catch (err: any) {
      toast.error('Failed to load customers and items: ' + (err?.message || 'Network error'));
    }
  };

  const loadReferenceDocs = async () => {
    try {
      const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'X-Device-ID': deviceId,
        'X-Profile-ID': profile?.id,
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
          'X-Profile-ID': profile?.id,
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
      const response = await fetch(`${apiUrl}/documents/${id}`, {
        headers: { 'Authorization': `Bearer ${accessToken}`, 'X-Device-ID': deviceId, 'X-Profile-ID': profile?.id },
      });
      const doc = await response.json();
      if (!response.ok || doc?.error) {
        toast.error(doc?.error || 'Failed to load document');
        return;
      }
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

        setBankAccountId(String(doc.bankAccountId || ''));
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
    const qty = parseFloat(Number(item.quantity || 0).toFixed(6));
    const rate = parseFloat(Number(item.rate || 0).toFixed(6));
    const discountPct = Number(item.discount || 0);
    const cgstPct = Number(item.cgst || 0);
    const sgstPct = Number(item.sgst || 0);
    const igstPct = Number(item.igst || 0);

    const gross = qty * rate;
    const discountAmt = parseFloat(((gross * discountPct) / 100).toFixed(2));
    const taxable = parseFloat((gross - discountAmt).toFixed(2));

    if (proformaPriceMode === 'with_tax') {
      // rate is tax-inclusive — item.total = gross after discount (no extra tax added)
      return parseFloat(taxable.toFixed(2));
    }

    // AUDIT FIX #3/#4: item.total = taxable + taxes, all rounded consistently
    const cgstAmt = parseFloat(((taxable * cgstPct) / 100).toFixed(2));
    const sgstAmt = parseFloat(((taxable * sgstPct) / 100).toFixed(2));
    const igstAmt = parseFloat(((taxable * igstPct) / 100).toFixed(2));
    return parseFloat((taxable + cgstAmt + sgstAmt + igstAmt).toFixed(2));
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
    // Compute CGST/SGST/IGST breakdown for summary tooltips
    const totalCgst = parseFloat(items.reduce((sum, item) => {
      const gross = (item.quantity * item.rate) - ((item.quantity * item.rate * item.discount) / 100);
      const taxable = proformaPriceMode === 'with_tax'
        ? (1 + (item.cgst + item.sgst + item.igst) / 100) > 0 ? gross / (1 + (item.cgst + item.sgst + item.igst) / 100) : gross
        : gross;
      return sum + (taxable * item.cgst) / 100;
    }, 0).toFixed(2));
    const totalSgst = parseFloat(items.reduce((sum, item) => {
      const gross = (item.quantity * item.rate) - ((item.quantity * item.rate * item.discount) / 100);
      const taxable = proformaPriceMode === 'with_tax'
        ? (1 + (item.cgst + item.sgst + item.igst) / 100) > 0 ? gross / (1 + (item.cgst + item.sgst + item.igst) / 100) : gross
        : gross;
      return sum + (taxable * item.sgst) / 100;
    }, 0).toFixed(2));
    const totalIgst = parseFloat(items.reduce((sum, item) => {
      const gross = (item.quantity * item.rate) - ((item.quantity * item.rate * item.discount) / 100);
      const taxable = proformaPriceMode === 'with_tax'
        ? (1 + (item.cgst + item.sgst + item.igst) / 100) > 0 ? gross / (1 + (item.cgst + item.sgst + item.igst) / 100) : gross
        : gross;
      return sum + (taxable * item.igst) / 100;
    }, 0).toFixed(2));
    return { subtotal, discountTotal, taxTotal, totalBeforeRound, grandTotal, totalCgst, totalSgst, totalIgst };
  };

  const handleCreateCustomerInline = async () => {
    if (!accessToken || !deviceId || !profile?.id) {
      toast.error('Missing session/profile');
      return;
    }
    const name = String(createCustomerForm.name || '').trim();
    if (!name) {
      toast.error(`${partyKind === 'supplier' ? 'Supplier' : 'Customer'} name is required`);
      return;
    }

    const ownerName = String(createCustomerForm.ownerName || '').trim();
    if (!ownerName) {
      toast.error('Owner name is required');
      return;
    }

    const errs = validateContactFields({
      gstin: String(createCustomerForm.gstin || ''),
      phone: String(createCustomerForm.phone || ''),
      email: String(createCustomerForm.email || ''),
    });
    setCreatePartyContactErrors(errs);
    if (hasContactErrors(errs)) {
      toast.error('Please fix invalid contact details');
      return;
    }

    const openingBalance = Number(createCustomerForm.openingBalance || 0);
    const openingBalanceType = (createCustomerForm.openingBalanceType || 'dr') as 'dr' | 'cr';

    setCreateCustomerSaving(true);
    try {
      const sameAsBilling = !!createPartySameAsBilling;
      const res = await fetch(`${apiUrl}/${partyKind === 'supplier' ? 'suppliers' : 'customers'}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-Device-ID': deviceId,
          'X-Profile-ID': profile?.id,
        },
        body: JSON.stringify({
          name,
          ownerName,
          email: normalizeEmail(String(createCustomerForm.email || '')) || undefined,
          phone: normalizePhone(String(createCustomerForm.phone || '')) || undefined,
          openingBalance: Number.isFinite(openingBalance) ? openingBalance : undefined,
          openingBalanceType,
          gstin: normalizeGstin(String(createCustomerForm.gstin || '')) || undefined,
          pan: String(createCustomerForm.pan || '').trim() || undefined,
          billingAddress: String(createCustomerForm.billingAddress || '').trim() || undefined,
          billingCity: String(createCustomerForm.billingCity || '').trim() || undefined,
          billingState: String(createCustomerForm.billingState || '').trim() || undefined,
          billingPostalCode: String(createCustomerForm.billingPostalCode || '').trim() || undefined,
          shippingAddress: (sameAsBilling
            ? String(createCustomerForm.billingAddress || '').trim()
            : String(createCustomerForm.shippingAddress || '').trim()) || undefined,
          shippingCity: (sameAsBilling
            ? String(createCustomerForm.billingCity || '').trim()
            : String(createCustomerForm.shippingCity || '').trim()) || undefined,
          shippingState: (sameAsBilling
            ? String(createCustomerForm.billingState || '').trim()
            : String(createCustomerForm.shippingState || '').trim()) || undefined,
          shippingPostalCode: (sameAsBilling
            ? String(createCustomerForm.billingPostalCode || '').trim()
            : String(createCustomerForm.shippingPostalCode || '').trim()) || undefined,
          address: String(createCustomerForm.billingAddress || '').trim() || undefined,
          city: String(createCustomerForm.billingCity || '').trim() || undefined,
          state: String(createCustomerForm.billingState || '').trim() || undefined,
          postalCode: String(createCustomerForm.billingPostalCode || '').trim() || undefined,
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
        pan: data?.pan || '',
        openingBalance: data?.openingBalance ?? 0,
        openingBalanceType: data?.openingBalanceType || 'dr',
        billingState: data?.billingState || data?.state || '',
        state: data?.state || data?.billingState || '',
        billingCity: data?.billingCity || data?.city || '',
        billingPostalCode: data?.billingPostalCode || data?.postalCode || '',
        shippingCity: data?.shippingCity || '',
        shippingState: data?.shippingState || '',
        shippingPostalCode: data?.shippingPostalCode || '',
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
      setCreatePartySameAsBilling(true);
      setCreatePartyShippingEdited(false);
      setCreateCustomerForm({
        name: '',
        ownerName: '',
        email: '',
        phone: '',
        openingBalance: '',
        openingBalanceType: 'dr',
        gstin: '',
        pan: '',
        billingAddress: '',
        billingCity: '',
        billingState: '',
        billingPostalCode: '',
        shippingAddress: '',
        shippingCity: '',
        shippingState: '',
        shippingPostalCode: '',
        logoDataUrl: '',
        logoUrl: '',
      });
      toast.success(`${partyKind === 'supplier' ? 'Supplier' : 'Customer'} created`);
      window.dispatchEvent(new CustomEvent('dashboardRefresh'));
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

  const handleAddRow = () => {
    setItems((prev) => {
      const safePrev = Array.isArray(prev) ? prev : [];
      const nextIndex = safePrev.length;
      const first = nextIndex > 0 ? safePrev[0] : null;

      const nextCurrency: CurrencyCode = (first?.currency as CurrencyCode) || 'INR';
      const nextUnit = type === 'proforma' ? 'NONE' : String(first?.unit || 'pcs');
      const nextTax = (() => {
        // Keep existing default behavior: 18% split into 9/9 by default.
        // (IGST can be adjusted by user via Tax select.)
        return { cgst: 9, sgst: 9, igst: 0 };
      })();

      const newRow: DocumentItem = {
        name: '',
        hsnSac: '',
        description: '',
        sku: '',
        servicePeriod: '',
        quantity: 1,
        unit: nextUnit,
        rate: 0,
        sellingPrice: 0,
        purchaseCost: 0,
        currency: nextCurrency,
        discount: 0,
        cgst: nextTax.cgst,
        sgst: nextTax.sgst,
        igst: nextTax.igst,
        total: 0,
      };
      newRow.total = calculateItemTotal(newRow);

      // Ensure per-row UI state doesn't leak into the new row.
      setProformaItemPopoverOpen((m) => ({ ...(m || {}), [nextIndex]: false }));
      setExpandedItemRows((m) => ({ ...(m || {}), [nextIndex]: false }));

      return [...safePrev, newRow];
    });
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

  // AUDIT FIX #3, #4, #13: Corrected total calculation.
  // subtotal = sum of taxable values (pre-tax) — used as GSTR taxable base
  // grandTotal = subtotal + total taxes + roundOff
  // All amounts rounded to 2dp to prevent float arithmetic drift.
  function calculateTotals() {
    // Shared tax-inclusive helper: extract taxable base from gross when price includes tax
    const getTaxable = (gross: number, cgst: number, sgst: number, igst: number) => {
      if (proformaPriceMode === 'with_tax') {
        const taxPct = cgst + sgst + igst;
        return taxPct > 0 ? gross / (1 + taxPct / 100) : gross;
      }
      return gross;
    };

    if (type === 'proforma') {
      const rows = items.map(proformaRowComputed);
      const itemsTotal = parseFloat(rows.reduce((s, r) => s + r.amount, 0).toFixed(2));
      const subtotal = parseFloat((itemsTotal + transportCharges + additionalCharges + packingHandlingCharges + tcs).toFixed(2));
      const grandTotal = parseFloat((subtotal + Number(roundOff || 0)).toFixed(2));

      const taxBreakup = items.reduce(
        (acc, it) => {
          const qty = Number(it.quantity || 0);
          const rate = Number(it.rate || 0);
          const discountPct = Number(it.discount || 0);
          const gross = qty * rate;
          const grossAfterDiscount = gross - (gross * discountPct) / 100;
          const taxable = getTaxable(grossAfterDiscount, Number(it.cgst || 0), Number(it.sgst || 0), Number(it.igst || 0));
          acc.totalCgst += parseFloat(((taxable * Number(it.cgst || 0)) / 100).toFixed(2));
          acc.totalSgst += parseFloat(((taxable * Number(it.sgst || 0)) / 100).toFixed(2));
          acc.totalIgst += parseFloat(((taxable * Number(it.igst || 0)) / 100).toFixed(2));
          return acc;
        },
        { totalCgst: 0, totalSgst: 0, totalIgst: 0 }
      );

      return { itemsTotal, subtotal, grandTotal, ...taxBreakup };
    }

    // For each item: taxableAmount = qty * rate - discount.
    // with_tax mode: price is tax-inclusive, extract taxable base first.
    const totalCgst = parseFloat(items.reduce((sum, item) => {
      const gross = (item.quantity * item.rate) - ((item.quantity * item.rate * item.discount) / 100);
      const taxable = getTaxable(gross, item.cgst, item.sgst, item.igst);
      return sum + parseFloat(((taxable * item.cgst) / 100).toFixed(2));
    }, 0).toFixed(2));

    const totalSgst = parseFloat(items.reduce((sum, item) => {
      const gross = (item.quantity * item.rate) - ((item.quantity * item.rate * item.discount) / 100);
      const taxable = getTaxable(gross, item.cgst, item.sgst, item.igst);
      return sum + parseFloat(((taxable * item.sgst) / 100).toFixed(2));
    }, 0).toFixed(2));

    const totalIgst = parseFloat(items.reduce((sum, item) => {
      const gross = (item.quantity * item.rate) - ((item.quantity * item.rate * item.discount) / 100);
      const taxable = getTaxable(gross, item.cgst, item.sgst, item.igst);
      return sum + parseFloat(((taxable * item.igst) / 100).toFixed(2));
    }, 0).toFixed(2));

    const itemsTaxableBase = parseFloat(items.reduce((sum, item) => {
      const gross = (item.quantity * item.rate) - ((item.quantity * item.rate * item.discount) / 100);
      return sum + getTaxable(gross, item.cgst, item.sgst, item.igst);
    }, 0).toFixed(2));
    const subtotal = parseFloat((itemsTaxableBase + transportCharges + additionalCharges + packingHandlingCharges + tcs).toFixed(2));

    const itemsTotal = parseFloat(items.reduce((sum, item) => sum + item.total, 0).toFixed(2));
    const grandTotal = parseFloat((itemsTotal + transportCharges + additionalCharges + packingHandlingCharges + tcs + roundOff).toFixed(2));

    return { itemsTotal, subtotal, grandTotal, totalCgst, totalSgst, totalIgst };
  }

  useEffect(() => {
    if (!autoRoundOff) return;
    // AUDIT FIX N2: Round grandTotal (what customer pays), not subtotal (pre-tax base)
    const { grandTotal } = calculateTotals();
    const rounded = Math.round(grandTotal);
    const next = parseFloat((rounded - grandTotal).toFixed(2));
    setRoundOff(next);
  }, [autoRoundOff, items, transportCharges, additionalCharges, packingHandlingCharges, tcs]);

  // REACTIVE UPI QR GENERATION
  useEffect(() => {
    const generateQr = async () => {
      const cleanUpi = String(upiId || '').trim();
      if (!cleanUpi) {
        setUpiQrText('');
        return;
      }
      const { grandTotal } = calculateTotals();
      const upiUri = `upi://pay?pa=${encodeURIComponent(cleanUpi)}&pn=${encodeURIComponent(profile?.businessName || '')}&am=${grandTotal.toFixed(2)}&cu=INR&tn=${encodeURIComponent(invoiceNo || 'Payment')}`;
      try {
        const qr = await QRCode.toDataURL(upiUri, { margin: 1, width: 240 });
        setUpiQrText(qr);
      } catch {
        setUpiQrText('');
      }
    };
    generateQr();
  }, [upiId, items, transportCharges, additionalCharges, packingHandlingCharges, tcs, roundOff, invoiceNo, profile?.businessName]);
  const shouldShowPaymentMode = true;

  const partyLabel = partyKind === 'supplier' ? 'Supplier' : 'Customer';

  const handleSaveNewCustomerInlineResumable = async (
    name: string,
    address: string,
    gstin: string,
    phone: string,
    email: string,
    state: string
  ) => {
    if (!accessToken || !deviceId || !profile?.id) {
      toast.error('Missing session/profile');
      return;
    }

    setCreateCustomerSaving(true);
    try {
      const res = await fetch(`${apiUrl}/${partyKind === 'supplier' ? 'suppliers' : 'customers'}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-Device-ID': deviceId,
          'X-Profile-ID': profile?.id,
        },
        body: JSON.stringify({
          name: name.trim(),
          ownerName: name.trim(), // Use name as ownerName fallback when auto-creating
          email: normalizeEmail(email) || undefined,
          phone: normalizePhone(phone) || undefined,
          gstin: normalizeGstin(gstin) || undefined,
          billingAddress: address.trim() || undefined,
          billingState: state.trim() || undefined,
          address: address.trim() || undefined,
          state: state.trim() || undefined,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || data?.error) {
        toast.error(data?.error || `Failed to create ${partyKind}`);
        return;
      }

      const createdId = String(data?.id || data?._id || '').trim();
      const createdName = String(data?.name || name).trim();

      setPresetCustomers((prev) => [
        {
          id: createdId,
          name: createdName,
          address: data?.address || data?.billingAddress || '',
          billingAddress: data?.billingAddress || data?.address || '',
          gstin: data?.gstin || '',
          email: data?.email || '',
          phone: data?.phone || '',
        },
        ...prev.filter((c) => String(c.id) !== createdId),
      ]);

      if (pendingSavePayload) {
        const updatedPayload = { ...pendingSavePayload };
        if (partyKind === 'customer') {
          updatedPayload.customerId = createdId;
        } else {
          updatedPayload.supplierId = createdId;
        }
        await executeSave(updatedPayload);
      }
      toast.success(`${partyLabel} created and document saved`);
    } catch (e: any) {
      toast.error(`Failed to create ${partyKind}: ` + (e?.message || 'Unknown error'));
    } finally {
      setCreateCustomerSaving(false);
    }
  };

  const executeSave = async (payloadOverride?: any) => {
    setSaving(true);
    try {
      const payload = payloadOverride || pendingSavePayload;
      if (!payload) {
        toast.error('Nothing to save');
        return;
      }

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
          'X-Profile-ID': profile?.id,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      
      if (data.error) {
        if (data.code === 'FINAL_DOCUMENT_LOCKED') {
          setStatus('draft');
          toast.info('Status reverted to Draft. You can now edit and re-save.', { duration: 4000 });
        } else {
          toast.error(data.error);
        }
      } else {
        toast.success(isEdit ? 'Document updated!' : 'Document created!');
        
        // ── Automatic Vyapar Khata Sync ────────────────────────────────────────/
        const finalStatus = (payload.status === 'final');
        const validParty = !!(payload.customerId || payload.supplierId);
        
        if (finalStatus && validParty && !isDemoMode) {
          try {
            const pId = payload.customerId || payload.supplierId;
            const pType = payload.customerId ? 'customer' : 'supplier';
            const docTotal = Number(payload.grandTotal || 0);
            const amtPaid = Number(payload.receivedAmount || 0);
            const docNo = payload.invoiceNo || payload.documentNumber || 'Document';

            // 1. Record the Bill (Sales Invoice: We 'gave' credit/goods; Purchase: We 'got' goods/credit)
            await fetch(`${API_URL}/vyapar-khata/entries`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
                'X-Device-ID': deviceId,
                'X-Profile-ID': profile?.id,
              },
              body: JSON.stringify({
                partyType: pType,
                partyId: pId,
                direction: pType === 'customer' ? 'gave' : 'got',
                amount: docTotal,
                date: payload.date || new Date().toISOString(),
                method: 'cash',
                notes: `Auto-Sync: ${payload.type.toUpperCase()} #${docNo}`,
                reference: docNo
              })
            });

            // 2. Record the Payment (If any)
            if (amtPaid > 0) {
              await fetch(`${API_URL}/vyapar-khata/entries`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${accessToken}`,
                  'X-Device-ID': deviceId,
                  'X-Profile-ID': profile?.id,
                },
                body: JSON.stringify({
                  partyType: pType,
                  partyId: pId,
                  direction: pType === 'customer' ? 'got' : 'gave',
                  amount: amtPaid,
                  date: payload.date || new Date().toISOString(),
                  method: payload.paymentMode || 'cash',
                  notes: `Auto-Sync: Payment for ${payload.type.toUpperCase()} #${docNo}`,
                  reference: docNo
                })
              });
            }
          } catch (khataErr) {
            console.error('Khata Sync Error:', khataErr);
            toast.error('Document saved, but Khata sync failed.');
          }
        }
        // ────────────────────────────────────────────────────────────────────────/

        window.dispatchEvent(new CustomEvent('dashboardRefresh'));
        navigate('/documents');
      }
    } catch (error) {
      toast.error('Failed to save document');
    } finally {
      setSaving(false);
      setShowSaveCustomerPrompt(false);
      setPendingSavePayload(null);
    }
  };

  const handleSave = async () => {
    const normalizedCustomerGstin = normalizeGstin(String(customerGstin || ''));
    const normalizedCustomerMobile = normalizePhone(String(customerMobile || ''));
    const normalizedCustomerEmail = normalizeEmail(String(customerEmail || ''));

    const contactErrs = validateContactFields({
      gstin: normalizedCustomerGstin,
      phone: normalizedCustomerMobile,
      email: normalizedCustomerEmail,
    });
    setPartyContactErrors(contactErrs);
    if (hasContactErrors(contactErrs)) {
      toast.error('Please fix invalid contact details');
      return;
    }

    if (type === 'invoice_cancellation') {
      if (!referenceDocumentId) {
        toast.error('Reference document is required for cancellation');
        return;
      }
    } else {
      if (!customerName.trim()) {
        toast.error('Party name is required');
        return;
      }
    }
    
    if (isDemoMode) {
      setSaving(true);
      setTimeout(() => {
        setSaving(false);
        toast.success('(Demo Mode) Document virtually saved! No real data was changed.');
        navigate('/documents');
      }, 1000);
      return;
    }

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

      const nextReceivedAmount = Math.max(0, Number(receivedAmount || 0));
      const normalizedReceivedAmount = Number.isFinite(nextReceivedAmount) ? nextReceivedAmount : 0;
      const totalForPayment = Number(totals.grandTotal || 0);
      const remainingForPayment = Math.max(0, totalForPayment - normalizedReceivedAmount);

      // Use user's manual paymentStatus selection.
      // Only auto-derive if receivedAmount > 0 and user left it as 'unpaid' (likely forgot to update).
      const derivedPaymentStatus: 'unpaid' | 'partial' | 'paid' =
        normalizedReceivedAmount > 0 && paymentStatus === 'unpaid'
          ? remainingForPayment > 0 ? 'partial' : 'paid'
          : paymentStatus;

      const documentData: any = {
        type,
        customerName,
        customerAddress,
        customerGstin: normalizedCustomerGstin || undefined,
        date,
        dueDate,
        customerId: partyKind === 'customer' ? (partyId || null) : null,
        supplierId: partyKind === 'supplier' ? (partyId || null) : null,
        referenceDocumentId,
        referenceDocumentNumber,
        orderNumber,
        revisionNumber,
        referenceNo,
        purchaseOrderNo,
        poDate,
        customerContactPerson,
        customerMobile: normalizedCustomerMobile || undefined,
        customerEmail: normalizedCustomerEmail || undefined,
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
        bankAccountId: bankAccountId && bankAccountId !== '__null__' ? bankAccountId : null,
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
        internalNotes: internalNotes || '',
        termsConditions,
        paymentTerms,
        creditPeriod,
        lateFeeTerms,
        paymentStatus: derivedPaymentStatus,
        paymentMode: shouldShowPaymentMode ? paymentMode : null,
        receivedAmount: normalizedReceivedAmount,
        status,
        warrantyReturnCancellationPolicies,
        placeOfSupply: placeOfSupply || null,
        customFields: (customFields || [])
          .map((x) => ({ label: String(x.label || '').trim(), value: String(x.value || '').trim() }))
          .filter((x) => x.label || x.value),
        ...totals
      };

      // ── New Party Presence Check ────────────────────────────────────────────/
      // If we don't have a linked partyId, and the name doesn't match an existing
      // profile perfectly, prompt the user if they want to save this for future use.
      const nameMatch = presetCustomers.some(c => c.name.trim().toLowerCase() === customerName.trim().toLowerCase());
      if (!partyId && !nameMatch && customerName.trim() && !isEdit) {
        const normalized = customerName.trim().toLowerCase();
        const similar = presetCustomers.filter(c => {
          const cName = String(c.name || '').trim().toLowerCase();
          return cName.includes(normalized) || normalized.includes(cName);
        }).slice(0, 3);
        setSimilarCustomers(similar);
        setPendingSavePayload(documentData);
        setShowSaveCustomerPrompt(true);
        return;
      }
      // ────────────────────────────────────────────────────────────────────────/

      await executeSave(documentData);
    } catch (err) {
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
      <>
        <div className="flex items-center justify-center h-full">
          <TraceLoader label="Loading document..." />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="bg-muted/30 pb-40 md:pb-12 min-h-screen">
      <div className="p-4 md:p-6">
        <div className="space-y-4 max-w-[1600px] mx-auto">
            {/* Finalized document warning banner */}
            {isEdit && status === 'final' && (
              <div className="mx-4 mt-4 flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 px-4 py-3">
                <span className="text-amber-600 text-lg">🔒</span>
                <div className="flex-1 text-sm text-amber-800 dark:text-amber-300">
                  This document is <strong>Finalized</strong>. Financial fields (items, totals, taxes) are locked.
                  Change Status to <strong>Draft</strong> to make changes.
                </div>
                <Button size="sm" variant="outline" className="border-amber-400 text-amber-800 hover:bg-amber-100 shrink-0"
                  onClick={() => setStatus('draft')}>
                  Revert to Draft
                </Button>
              </div>
            )}
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

                  <div className="flex items-center gap-3">
                    <Collapsible open={optionsOpen} onOpenChange={setOptionsOpen}>
                      <div className="flex items-center gap-2">
                        <CollapsibleTrigger asChild>
                          <Button type="button" variant="outline" size="sm">
                            Options
                            {optionsOpen ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                      <CollapsibleContent className="mt-2">
                        <div className="rounded-md border bg-background p-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            <div className="flex items-center justify-between gap-3">
                              <Label>Invoice Metadata</Label>
                              <Switch checked={showInvoiceMetadata} onCheckedChange={setShowInvoiceMetadata} />
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <Label>Shipping & Logistics</Label>
                              <Switch checked={showShippingLogistics} onCheckedChange={setShowShippingLogistics} />
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <Label>Bank Details</Label>
                              <Switch checked={showBankDetails} onCheckedChange={setShowBankDetails} />
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <Label>Terms & Notes</Label>
                              <Switch checked={showTermsNotes} onCheckedChange={setShowTermsNotes} />
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <Label>Payment</Label>
                              <Switch checked={showPaymentBox} onCheckedChange={setShowPaymentBox} />
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <Label>Charges</Label>
                              <Switch checked={showCharges} onCheckedChange={setShowCharges} />
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <Label>Price Mode</Label>
                              <Select value={proformaPriceMode} onValueChange={(v) => {
                                setProformaPriceMode(v as any);
                                setItems(prev => prev.map(item => {
                                  const qty = Number(item.quantity || 0);
                                  const rate = Number(item.rate || 0);
                                  const discountPct = Number(item.discount || 0);
                                  const gross = qty * rate;
                                  const discountAmt = (gross * discountPct) / 100;
                                  const taxable = gross - discountAmt;
                                  if (v === 'with_tax') {
                                    return { ...item, total: parseFloat(taxable.toFixed(2)) };
                                  }
                                  const cgst = Number(item.cgst || 0);
                                  const sgst = Number(item.sgst || 0);
                                  const igst = Number(item.igst || 0);
                                  const tax = (taxable * (cgst + sgst + igst)) / 100;
                                  return { ...item, total: parseFloat((taxable + tax).toFixed(2)) };
                                }));
                              }}>
                                <SelectTrigger size="sm" className="w-[140px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="without_tax">+ Tax on top</SelectItem>
                                  <SelectItem value="with_tax">Tax included</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                </div>

                {/* Doc type pill selector — only on create */}
                {!isEdit && (
                  <div className="mt-3 -mx-1 overflow-x-auto">
                    <div className="flex gap-2 px-1 pb-1 min-w-max">
                      {([
                        { value: 'invoice', label: '🧾 Invoice' },
                        { value: 'quotation', label: '📋 Quotation' },
                        { value: 'order', label: '📦 Order' },
                        { value: 'proforma', label: '📄 Proforma' },
                        { value: 'challan', label: '🚚 Challan' },
                        { value: 'purchase', label: '🛒 Purchase' },
                        { value: 'invoice_cancellation', label: '↩ Sale Return' },
                      ] as { value: string; label: string }[]).map((dt) => (
                        <button
                          key={dt.value}
                          type="button"
                          onClick={() => setType(dt.value)}
                          className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                            type === dt.value
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
                          }`}
                        >
                          {dt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div
              className={`grid grid-cols-1 gap-4 items-start ${
                showInvoiceMetadata ? 'lg:grid-cols-[3fr_2fr]' : 'lg:grid-cols-1'
              }`}
            >
              <div className="space-y-4">
                <Card className="shadow-sm">
                  <CardHeader className="pb-0">
                    <CardTitle className="text-base">Customer & Billing Information</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    <div className="w-full">
                      <Label>{partyKind === 'supplier' ? 'Supplier' : 'Customer'} *</Label>
                      <Popover open={partyPopoverOpen} onOpenChange={setPartyPopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button type="button" variant="outline" role="combobox" className="w-full justify-between">
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
                                <CommandItem value="__create_customer__" onSelect={() => setCreateCustomerOpen(true)}>
                                  + Create {partyKind === 'supplier' ? 'Supplier' : 'Customer'}
                                </CommandItem>
                                {presetCustomers.map((c) => (
                                  <CommandItem
                                    key={c.id}
                                    value={`${c.name} ${c.phone || ''} ${c.gstin || ''}`.toLowerCase().trim()}
                                    onSelect={() => {
                                      const nextId = String(c.id);
                                      setPartyId(nextId);
                                      setCustomerName(String(c.name || ''));
                                      setCustomerAddress(String(c.address || c.billingAddress || '').trim());
                                      setCustomerGstin(String(c.gstin || '').trim());
                                      if (!deliveryAddress.trim()) {
                                        const nextShip = String((c as any)?.shippingAddress || (c as any)?.shipping_address || '').trim();
                                        const fallback = String((c as any)?.billingAddress || (c as any)?.address || '').trim();
                                        const resolved = nextShip || fallback;
                                        if (resolved) setDeliveryAddress(resolved);
                                      }
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{partyLabel} Name</Label>
                        <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>GSTIN</Label>
                        <Input
                          value={customerGstin}
                          onChange={(e) => {
                            const next = e.target.value;
                            setCustomerGstin(next);
                            if (partyContactErrors.gstin) setPartyContactErrors((p) => ({ ...p, gstin: undefined }));
                          }}
                          onBlur={() => {
                            const normalized = normalizeGstin(String(customerGstin || ''));
                            if (normalized !== String(customerGstin || '')) setCustomerGstin(normalized);
                            const errs = validateContactFields({
                              gstin: normalized,
                              phone: String(customerMobile || ''),
                              email: String(customerEmail || ''),
                            });
                            setPartyContactErrors((p) => ({ ...p, gstin: errs.gstin }));
                          }}
                        />
                        {partyContactErrors.gstin ? <div className="text-xs text-destructive">{partyContactErrors.gstin}</div> : null}
                      </div>

                      <div className="space-y-2">
                        <Label>Billing Address</Label>
                        <Textarea value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} rows={2} />
                      </div>

                      <div className="space-y-2">
                        <Label>Ship To</Label>
                        <Textarea
                          value={deliveryAddress}
                          onChange={(e) => setDeliveryAddress(e.target.value)}
                          rows={2}
                          placeholder="Enter shipping address"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Contact Person</Label>
                        <Input value={customerContactPerson} onChange={(e) => setCustomerContactPerson(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Mobile</Label>
                        <Input
                          value={customerMobile}
                          onChange={(e) => {
                            const next = e.target.value;
                            setCustomerMobile(next);
                            if (partyContactErrors.phone) setPartyContactErrors((p) => ({ ...p, phone: undefined }));
                          }}
                          onBlur={() => {
                            const normalized = normalizePhone(String(customerMobile || ''));
                            if (normalized !== String(customerMobile || '')) setCustomerMobile(normalized);
                            const errs = validateContactFields({
                              gstin: String(customerGstin || ''),
                              phone: normalized,
                              email: String(customerEmail || ''),
                            });
                            setPartyContactErrors((p) => ({ ...p, phone: errs.phone }));
                          }}
                        />
                        {partyContactErrors.phone ? <div className="text-xs text-destructive">{partyContactErrors.phone}</div> : null}
                      </div>

                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input
                          value={customerEmail}
                          onChange={(e) => {
                            const next = e.target.value;
                            setCustomerEmail(next);
                            if (partyContactErrors.email) setPartyContactErrors((p) => ({ ...p, email: undefined }));
                          }}
                          onBlur={() => {
                            const normalized = normalizeEmail(String(customerEmail || ''));
                            if (normalized !== String(customerEmail || '')) setCustomerEmail(normalized);
                            const errs = validateContactFields({
                              gstin: String(customerGstin || ''),
                              phone: String(customerMobile || ''),
                              email: normalized,
                              });
                              setPartyContactErrors((p) => ({ ...p, email: errs.email }));
                            }}
                          />
                          {partyContactErrors.email ? <div className="text-xs text-destructive">{partyContactErrors.email}</div> : null}
                        </div>
                        <div className="space-y-2">
                          <Label>State Code</Label>
                          <Input value={customerStateCode} onChange={(e) => setCustomerStateCode(e.target.value)} />
                        </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {showInvoiceMetadata ? (
                <div className="space-y-4">
                  <Card className="shadow-sm">
                    <CardHeader className="pb-0">
                      <CardTitle className="text-base">Invoice Metadata</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Status</Label>
                          <Select value={status} onValueChange={(val: 'draft' | 'final') => setStatus(val)}>
                            <SelectTrigger className="bg-background">
                              <SelectValue placeholder="Select Status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="draft">Draft</SelectItem>
                              <SelectItem value="final">Final Document</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Ref No.</Label>
                          <Input
                            readOnly={type === 'proforma'}
                            value={(type === 'proforma' ? (referenceNo || 'Auto') : referenceNo) || ''}
                            onChange={(e) => {
                              if (type !== 'proforma') setReferenceNo(e.target.value);
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Invoice Date</Label>
                          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Due Date</Label>
                          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>State of Supply</Label>
                          <Select value={placeOfSupply} onValueChange={setPlaceOfSupply}>
                            <SelectTrigger>
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

                        <div className="space-y-2">
                          <Label>Invoice No</Label>
                          <Input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Challan No</Label>
                          <Input value={challanNo} onChange={(e) => setChallanNo(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Order No</Label>
                          <Input value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Revision No</Label>
                          <Input value={revisionNumber} onChange={(e) => setRevisionNumber(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>PO No</Label>
                          <Input value={purchaseOrderNo} onChange={(e) => setPurchaseOrderNo(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>PO Date</Label>
                          <Input type="date" value={poDate} onChange={(e) => setPoDate(e.target.value)} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : null}
            </div>

            {showShippingLogistics ? (
              <Card className="shadow-sm">
                <CardHeader className="pb-0">
                  <CardTitle className="text-base">Shipping & Logistics</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>E-Way Bill No</Label>
                      <Input value={ewayBillNo} onChange={(e) => setEwayBillNo(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>E-Way Bill Date</Label>
                      <Input type="date" value={ewayBillDate} onChange={(e) => setEwayBillDate(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Valid Upto</Label>
                      <Input type="date" value={ewayBillValidUpto} onChange={(e) => setEwayBillValidUpto(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Transporter Name</Label>
                      <Input value={ewayBillTransporterName} onChange={(e) => setEwayBillTransporterName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Vehicle No</Label>
                      <Input value={ewayBillVehicleNo} onChange={(e) => setEwayBillVehicleNo(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Transporter Doc No</Label>
                      <Input value={ewayBillTransporterDocNo} onChange={(e) => setEwayBillTransporterDocNo(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Distance (Km)</Label>
                      <Input value={ewayBillDistanceKm} onChange={(e) => setEwayBillDistanceKm(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Transport</Label>
                      <Input value={transport} onChange={(e) => setTransport(e.target.value)} />
                    </div>
                    <div className="space-y-2 lg:col-span-1">
                      <Label>Transport ID</Label>
                      <Input value={transportId} onChange={(e) => setTransportId(e.target.value)} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            <Card className="shadow-none border-border/20 bg-transparent">
              <CardContent className="p-0">
                <div className="w-full max-h-[70vh] overflow-x-auto overflow-y-auto !touch-pan-x !touch-pan-y scrollbar-thin scrollbar-thumb-indigo-500/20 scrollbar-track-transparent rounded-2xl border border-border/30 bg-background/30 backdrop-blur-3xl">
                  <div className="min-w-[1600px] item-table-header p-4" data-tour-id="item-table-header">
                    <div className="grid grid-cols-[40px_2fr_90px_80px_90px_160px_80px_110px_100px_110px_160px_40px] sticky top-0 z-[20] bg-muted/60 backdrop-blur-2xl text-[10px] uppercase font-black tracking-widest text-muted-foreground border border-border/10 rounded-xl mb-4 !touch-pan-x !touch-pan-y">
                      <div className="px-2 py-2">#</div>
                      <div className="px-2 py-2">ITEM</div>
                      <div className="px-2 py-2">HSN/SAC</div>
                      <div className="px-2 py-2">QTY</div>
                      <div className="px-2 py-2">UNIT</div>
                      <div className="px-2 py-2">
                        <div className="flex items-center gap-1">
                          PRICE/UNIT
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="text-xs max-w-[220px]">
                                <p className="font-semibold mb-1">Price Mode</p>
                                <p><strong>+ Tax on top:</strong> Price before GST. Tax is added on top. (₹2500 + 18% = ₹2950)</p>
                                <p className="mt-1"><strong>Tax included:</strong> Price includes GST. (₹2500 total, tax extracted)</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                      <div className="px-2 py-2 col-span-2">DISCOUNT</div>
                      <div className="px-2 py-2 col-span-2 flex items-center gap-1">
                        TAX
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="text-xs max-w-[220px]">
                              <p className="font-semibold mb-1">GST Tax Rates</p>
                              <p>Enter CGST%, SGST%, IGST% individually.</p>
                              <p className="mt-1">For intra-state: use CGST + SGST (e.g. 9+9 = 18%)</p>
                              <p className="mt-1">For inter-state: use IGST only (e.g. 18%)</p>
                              <p className="mt-1 text-yellow-400">Set to 0 for no tax on this item.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div className="px-2 py-2 text-right flex items-center justify-end gap-1">
                        AMOUNT
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="text-xs max-w-[200px]">
                              Hover the ⓘ on each row to see the full tax breakdown for that item.
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div className="px-2 py-2" />
                    </div>


                    {items.map((it, idx) => {
                      const row = proformaRowComputed(it);
                      return (
                        <div key={idx} className="grid grid-cols-[40px_2fr_90px_80px_90px_160px_80px_110px_100px_110px_160px_40px] border-b bg-background !touch-pan-x !touch-pan-y">
                          <div className="px-2 py-2 text-xs text-muted-foreground">{idx + 1}</div>
                          <div className="px-2 py-2 !touch-pan-x !touch-pan-y">
                            <Popover
                              open={!!proformaItemPopoverOpen[idx]}
                              onOpenChange={(open) => setProformaItemPopoverOpen((prev) => ({ ...prev, [idx]: open }))}
                            >
                              <PopoverTrigger asChild>
                                <Button type="button" variant="outline" role="combobox" className="w-full justify-between !touch-pan-x !touch-pan-y">
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
                                            setProformaItemPopoverOpen((prev) => ({ ...prev, [idx]: false }));
                                            setTimeout(() => setCreateItemOpen(true), 0);
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
                                          setProformaItemPopoverOpen((prev) => ({ ...prev, [idx]: false }));
                                          setTimeout(() => setCreateItemOpen(true), 0);
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
                          <div className="px-2 py-2 !touch-pan-x !touch-pan-y">
                            <Input placeholder="HSN" value={it.hsnSac || ''} onChange={(e) => updateItem(idx, 'hsnSac', e.target.value)} />
                          </div>
                          <div className="px-2 py-2 !touch-pan-x !touch-pan-y">
                            <Input type="number" min="0" onKeyDown={(e) => { if (e.key === '-') e.preventDefault() }} value={it.quantity} onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value || 0))} />
                          </div>
                          <div className="px-2 py-2 !touch-pan-x !touch-pan-y">
                            <Select value={String(it.unit || 'NONE')} onValueChange={(v) => updateItem(idx, 'unit', v)}>
                              <SelectTrigger className="!touch-pan-x !touch-pan-y">
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
                          <div className="px-2 py-2 !touch-pan-x !touch-pan-y">
                            <Input type="number" min="0" onKeyDown={(e) => { if (e.key === '-') e.preventDefault() }} value={it.rate} onChange={(e) => updateItem(idx, 'rate', Number(e.target.value || 0))} />
                          </div>
                          <div className="px-2 py-2 !touch-pan-x !touch-pan-y">
                            <Input type="number" min="0" onKeyDown={(e) => { if (e.key === '-') e.preventDefault() }} value={it.discount} onChange={(e) => updateItem(idx, 'discount', Number(e.target.value || 0))} />
                          </div>
                          <div className="px-2 py-2 !touch-pan-x !touch-pan-y">
                            <Input
                              type="number"
                              min="0"
                              onKeyDown={(e) => { if (e.key === '-') e.preventDefault() }}
                              value={Number.isFinite(row.discountAmount) ? Number(row.discountAmount || 0).toFixed(2) : '0.00'}
                              onChange={(e) => {
                                const nextAmount = Number(e.target.value || 0);
                                if (!Number.isFinite(nextAmount) || nextAmount < 0) return;
                                const pct = row.subtotal > 0 ? parseFloat(((nextAmount / row.subtotal) * 100).toFixed(2)) : 0;
                                updateItem(idx, 'discount', pct);
                              }}
                            />
                          </div>
                          {/* TAX — clean dropdown + popover for CGST/SGST/IGST editing */}
                          <div className="px-2 py-2 !touch-pan-x !touch-pan-y">
                            <Select
                              value={['0','5','12','18','28'].includes(String(row.taxPct)) ? String(row.taxPct) : 'custom'}
                              onValueChange={(v) => {
                                if (v === 'custom') return;
                                const next = Number(v || 0);
                                const half = parseFloat((next / 2).toFixed(2));
                                updateItem(idx, 'igst', 0);
                                updateItem(idx, 'cgst', half);
                                updateItem(idx, 'sgst', half);
                              }}
                            >
                              <SelectTrigger className="!touch-pan-x !touch-pan-y">
                                <span>{row.taxPct === 0 ? 'No Tax' : `${row.taxPct}% GST`}</span>
                              </SelectTrigger>
                              <SelectContent side="top">
                                <SelectItem value="0">0% — No Tax</SelectItem>
                                <SelectItem value="5">5% GST</SelectItem>
                                <SelectItem value="12">12% GST</SelectItem>
                                <SelectItem value="18">18% GST</SelectItem>
                                <SelectItem value="28">28% GST</SelectItem>
                                {!['0','5','12','18','28'].includes(String(row.taxPct)) && (
                                  <SelectItem value="custom">{row.taxPct}% (custom)</SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                          {/* TAX AMOUNT — click to edit CGST/SGST/IGST individually */}
                          <div className="px-2 py-2 !touch-pan-x !touch-pan-y">
                            <Popover>
                              <PopoverTrigger asChild>
                                <button type="button" className="w-full text-left !touch-pan-x !touch-pan-y">
                                  <Input
                                    readOnly
                                    value={Number(row.taxAmount || 0).toFixed(2)}
                                    className="cursor-pointer bg-muted/20 hover:bg-muted/40 transition-colors"
                                    title="Click to edit CGST/SGST/IGST"
                                  />
                                  {row.taxPct > 0 && (
                                    <div className="text-[9px] text-muted-foreground mt-0.5">
                                      {it.cgst > 0 && `CGST ${it.cgst}%`}
                                      {it.cgst > 0 && it.sgst > 0 && ' · '}
                                      {it.sgst > 0 && `SGST ${it.sgst}%`}
                                      {(it.cgst > 0 || it.sgst > 0) && it.igst > 0 && ' · '}
                                      {it.igst > 0 && `IGST ${it.igst}%`}
                                    </div>
                                  )}
                                </button>
                              </PopoverTrigger>
                              <PopoverContent side="left" className="w-56 p-3 space-y-3">
                                <p className="text-xs font-semibold text-foreground">Edit Tax Rates</p>
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <label className="text-xs text-muted-foreground w-12">CGST %</label>
                                    <Input type="number" min={0} max={50} step={0.5} className="h-7 text-xs"
                                      value={it.cgst}
                                      onChange={(e) => updateItem(idx, 'cgst', Number(e.target.value || 0))} />
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <label className="text-xs text-muted-foreground w-12">SGST %</label>
                                    <Input type="number" min={0} max={50} step={0.5} className="h-7 text-xs"
                                      value={it.sgst}
                                      onChange={(e) => updateItem(idx, 'sgst', Number(e.target.value || 0))} />
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <label className="text-xs text-muted-foreground w-12">IGST %</label>
                                    <Input type="number" min={0} max={50} step={0.5} className="h-7 text-xs"
                                      value={it.igst}
                                      onChange={(e) => updateItem(idx, 'igst', Number(e.target.value || 0))} />
                                  </div>
                                </div>
                                <p className="text-[10px] text-muted-foreground">Intra-state: CGST + SGST · Inter-state: IGST only</p>
                              </PopoverContent>
                            </Popover>
                          </div>
                          {/* AMOUNT */}
                          <div className="px-2 py-2 text-right font-semibold !touch-pan-x !touch-pan-y">
                            {formatInr(row.amount)}
                          </div>
                          <div className="px-2 py-2 flex items-center justify-center !touch-pan-x !touch-pan-y">
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(idx)} aria-label="Remove row">
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}

                    <div className="grid grid-cols-[40px_2fr_90px_80px_90px_160px_80px_110px_100px_110px_160px_40px] bg-background">
                      <div className="px-2 py-2 col-span-2">
                        <Button type="button" variant="outline" size="sm" onClick={handleAddRow}>
                          Add Row
                        </Button>
                      </div>
                      <div className="px-2 py-2 text-xs text-muted-foreground text-right w-full flex items-center justify-end">TOTAL</div>
                      <div className="px-2 py-2 text-xs text-muted-foreground flex items-center">
                        {items.reduce((s, x) => s + Number(x.quantity || 0), 0)}
                      </div>
                      <div className="px-2 py-2" />
                      <div className="px-2 py-2" />
                      <div className="px-2 py-2" />
                      <div className="px-2 py-2" />
                      <div className="px-2 py-2" />
                      <div className="px-2 py-2" />
                      <div className="px-2 py-2 text-right font-semibold flex items-center justify-end">
                        {formatInr(type === 'proforma' ? proformaTotals().grandTotal : calculateTotals().grandTotal)}
                      </div>
                      <div className="px-2 py-2" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div
              className={`grid grid-cols-1 gap-4 items-start ${
                showPaymentBox || showCharges ? 'lg:grid-cols-[1fr_360px]' : 'lg:grid-cols-1'
              }`}
            >
              <div className="flex flex-col gap-4">
                {showBankDetails ? (
                  <>
                    <Card className="shadow-sm">
                      <CardContent className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="md:col-span-2 space-y-2">
                            <div className="flex items-center justify-between">
                              <Label>Bank Account</Label>
                              <button
                                type="button"
                                onClick={() => navigate('/bank-accounts')}
                                className="text-xs text-primary hover:underline font-medium"
                              >
                                + Add Bank Account
                              </button>
                            </div>
                            <Select
                              value={bankAccountId || '__custom__'}
                              onValueChange={(v) => {
                                const next = String(v || '');
                                if (next === '__custom__') {
                                  setBankAccountId('');
                                  return;
                                }
                                if (next === '__null__') {
                                  setBankAccountId('__null__');
                                  setBankName(String((profile as any)?.bankName || ''));
                                  setBankBranch(String((profile as any)?.bankBranch || ''));
                                  setBankAccountNumber(String((profile as any)?.accountNumber || ''));
                                  setBankIfsc(String((profile as any)?.ifscCode || ''));
                                  setUpiId(String((profile as any)?.upiId || ''));
                                  setUpiQrText('');
                                  return;
                                }
                                setBankAccountId(next);

                                const accounts = Array.isArray(profile?.bankAccounts) ? profile.bankAccounts : [];
                                const selected = accounts.find((a: any) => String(a?._id || '') === String(next));
                                if (!selected) return;

                                setBankName(String(selected?.bankName || ''));
                                setBankBranch(String(selected?.bankBranch || ''));
                                setBankAccountNumber(String(selected?.accountNumber || ''));
                                setBankIfsc(String(selected?.ifscCode || ''));
                                setUpiId(String(selected?.upiId || ''));
                                setUpiQrText(String(selected?.upiQrText || ''));
                              }}
                            >
                              <SelectTrigger className="!touch-pan-x !touch-pan-y">
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__custom__">Custom</SelectItem>
                                {(() => {
                                  const legacyBankName = String((profile as any)?.bankName || '').trim();
                                  const legacyAcc = String((profile as any)?.accountNumber || '').trim();
                                  const legacyIfsc = String((profile as any)?.ifscCode || '').trim();
                                  const legacyUpi = String((profile as any)?.upiId || '').trim();
                                  const hasLegacy = !!(legacyBankName || legacyAcc || legacyIfsc || legacyUpi);
                                  if (!hasLegacy) return null;
                                  return <SelectItem value="__null__">{legacyBankName || 'Primary Bank'}</SelectItem>;
                                })()}
                                {(Array.isArray((profile as any)?.bankAccounts) ? (profile as any).bankAccounts : []).map((a: any) => (
                                  <SelectItem key={String(a?._id || a?.label || Math.random())} value={String(a?._id || '')}>
                                    {String(a?.label || a?.bankName || 'Bank Account')}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Bank Name</Label>
                            <Input value={bankName} onChange={(e) => setBankName(e.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <Label>Branch</Label>
                            <Input value={bankBranch} onChange={(e) => setBankBranch(e.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <Label>Account Number</Label>
                            <Input value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <Label>IFSC</Label>
                            <Input value={bankIfsc} onChange={(e) => setBankIfsc(e.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <Label>UPI ID</Label>
                            <Input value={upiId} onChange={(e) => setUpiId(e.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <Label>UPI QR Text</Label>
                            <Input value={upiQrText} onChange={(e) => setUpiQrText(e.target.value)} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                  </>
                ) : null}

                {showTermsNotes ? (
                  <>
                    <Card className="shadow-sm">
                      <CardContent className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Payment Terms</Label>
                            <Input value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <Label>Credit Period</Label>
                            <Input value={creditPeriod} onChange={(e) => setCreditPeriod(e.target.value)} />
                          </div>
                          <div className="md:col-span-2 space-y-2">
                            <Label>Late Fee Terms</Label>
                            <Textarea value={lateFeeTerms} onChange={(e) => setLateFeeTerms(e.target.value)} rows={2} />
                          </div>
                          <div className="md:col-span-2 space-y-2">
                            <Label>Warranty/Return/Cancellation</Label>
                            <Textarea
                              value={warrantyReturnCancellationPolicies}
                              onChange={(e) => setWarrantyReturnCancellationPolicies(e.target.value)}
                              rows={2}
                            />
                          </div>
                          <div className="md:col-span-2 space-y-2">
                            <Label>Internal Notes</Label>
                            <Textarea value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} rows={2} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="flex items-center gap-2">
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
                    </div>

                    {proformaShowDescription && (
                      <div className="mt-2 w-full">
                        <Label>Description</Label>
                        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Enter description" />
                      </div>
                    )}

                    <Card className="shadow-sm">
                      <CardContent className="p-4">
                        <div className="mt-2 w-full">
                          <Label>Description</Label>
                          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Enter description" />
                        </div>

                        <div className="mt-4 w-full">
                          <Label>Terms & Conditions</Label>
                          <Textarea
                            value={termsConditions}
                            onChange={(e) => setTermsConditions(e.target.value)}
                            rows={4}
                            placeholder="Enter terms and conditions"
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {proformaAttachment && <div className="text-xs text-muted-foreground">Attachment: {proformaAttachment.name}</div>}
                  </>
                ) : null}

                {!(showPaymentBox || showCharges) ? (
                  <Card className="shadow-sm bg-background/80">
                    <CardContent className="p-4 space-y-3">
                      {(() => {
                        const t = type === 'proforma' ? proformaTotals() : calculateTotals();
                        const received = Math.max(0, Number(receivedAmount || 0));
                        const balance = Math.max(0, Number(t.grandTotal || 0) - received);
                        const totalTax = (t.totalCgst ?? 0) + (t.totalSgst ?? 0) + (t.totalIgst ?? 0);
                        return (
                          <>
                            <div className="rounded-md overflow-hidden border bg-background">
                              <div className="px-3 py-2 text-sm font-semibold bg-primary/40 text-foreground">Amounts</div>

                              <div className="px-3 py-2 border-t flex items-center justify-between text-sm">
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  Sub total
                                  <TooltipProvider><Tooltip><TooltipTrigger asChild><Info className="h-3 w-3 cursor-help" /></TooltipTrigger>
                                    <TooltipContent className="text-xs">Pre-tax total of all items (taxable base)</TooltipContent>
                                  </Tooltip></TooltipProvider>
                                </div>
                                <div className="font-medium">{formatInr(t.subtotal)}</div>
                              </div>

                              {totalTax > 0 && (
                                <div className="px-3 py-2 border-t flex items-center justify-between text-sm">
                                  <div className="flex items-center gap-1 text-muted-foreground">
                                    Tax
                                    <TooltipProvider><Tooltip><TooltipTrigger asChild><Info className="h-3 w-3 cursor-help" /></TooltipTrigger>
                                      <TooltipContent className="text-xs space-y-1">
                                        {(t.totalCgst ?? 0) > 0 && <p>CGST: {formatInr(t.totalCgst ?? 0)}</p>}
                                        {(t.totalSgst ?? 0) > 0 && <p>SGST: {formatInr(t.totalSgst ?? 0)}</p>}
                                        {(t.totalIgst ?? 0) > 0 && <p>IGST: {formatInr(t.totalIgst ?? 0)}</p>}
                                      </TooltipContent>
                                    </Tooltip></TooltipProvider>
                                  </div>
                                  <div className="font-medium">{formatInr(totalTax)}</div>
                                </div>
                              )}

                              <div className="px-3 py-2 border-t flex items-center justify-between text-sm font-semibold">
                                <div>Total</div>
                                <div>{formatInr(t.grandTotal)}</div>
                              </div>

                              <div className="px-3 py-2 border-t flex items-center justify-between text-sm">
                                <div className="text-muted-foreground">Received</div>
                                <div className="font-medium">{formatInr(received)}</div>
                              </div>

                              <div className="px-3 py-2 border-t flex items-center justify-between text-sm">
                                <div className="text-muted-foreground">Balance</div>
                                <div className="font-medium">{formatInr(balance)}</div>
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </CardContent>
                  </Card>
                ) : null}
              </div>

              {showPaymentBox || showCharges ? (
                <div className="lg:sticky lg:top-20 space-y-4">
                {showPaymentBox ? (
                  <>
                    <Card className="shadow-sm bg-background/80">
                      <CardContent className="p-4 space-y-3">
                        {shouldShowPaymentMode && (
                          <div>
                            <Label>Payment Type</Label>
                            <div className="flex items-center gap-2 mt-1">
                              <Select value={paymentMode} onValueChange={(v) => setPaymentMode(v as PaymentMode)}>
                                <SelectTrigger className="!touch-pan-x !touch-pan-y">
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="cash">Cash</SelectItem>
                                  <SelectItem value="online">Online</SelectItem>
                                  <SelectItem value="cheque">Cheque</SelectItem>
                                </SelectContent>
                              </Select>

                              <Select value={paymentStatus} onValueChange={(v) => setPaymentStatus(v as 'unpaid' | 'partial' | 'paid')}>
                                <SelectTrigger className="!touch-pan-x !touch-pan-y">
                                  <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="unpaid">Unpaid</SelectItem>
                                  <SelectItem value="partial">Partial</SelectItem>
                                  <SelectItem value="paid">Paid</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}

                        <div>
                          <Label>Received Amount</Label>
                          <Input
                            type="number"
                            min={0}
                            value={receivedAmount}
                            onChange={(e) => {
                              const next = Number(e.target.value || 0);
                              if (!Number.isFinite(next) || next < 0) return;
                              setReceivedAmount(next);
                            }}
                            placeholder={`0 (${primarySymbol})`}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </>
                ) : null}

                {showCharges ? (
                  <Card className="shadow-sm">
                    <CardContent className="p-4 space-y-4">
                      <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2">
                          <Label>Transport Charges</Label>
                          <Input type="number" value={transportCharges} onChange={(e) => setTransportCharges(Number(e.target.value || 0))} />
                        </div>
                        <div className="space-y-2">
                          <Label>Additional Charges</Label>
                          <Input type="number" value={additionalCharges} onChange={(e) => setAdditionalCharges(Number(e.target.value || 0))} />
                        </div>
                        <div className="space-y-2">
                          <Label>Packing/Handling</Label>
                          <Input
                            type="number"
                            value={packingHandlingCharges}
                            onChange={(e) => setPackingHandlingCharges(Number(e.target.value || 0))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>TCS</Label>
                          <Input type="number" value={tcs} onChange={(e) => setTcs(Number(e.target.value || 0))} />
                        </div>
                        <div className="space-y-2">
                          <Label>Round Off</Label>
                          <Input type="number" value={roundOff} onChange={(e) => setRoundOff(Number(e.target.value || 0))} />
                        </div>
                        <div className="space-y-2">
                          <Label>Auto Round Off</Label>
                          <div className="flex items-center">
                            <Switch checked={autoRoundOff} onCheckedChange={setAutoRoundOff} />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : null}

                <Card className="shadow-sm bg-background/80">
                  <CardContent className="p-4 space-y-3">
                    {(() => {
                      const t = type === 'proforma' ? proformaTotals() : calculateTotals();
                      const received = Math.max(0, Number(receivedAmount || 0));
                      const balance = Math.max(0, Number(t.grandTotal || 0) - received);
                      const totalTax = (t.totalCgst ?? 0) + (t.totalSgst ?? 0) + (t.totalIgst ?? 0);
                      return (
                        <>
                          <div className="rounded-md overflow-hidden border bg-background">
                            <div className="px-3 py-2 text-sm font-semibold bg-primary/40 text-foreground">Amounts</div>

                            <div className="px-3 py-2 border-t flex items-center justify-between text-sm">
                              <div className="flex items-center gap-1 text-muted-foreground">
                                Sub total
                                <TooltipProvider><Tooltip><TooltipTrigger asChild><Info className="h-3 w-3 cursor-help" /></TooltipTrigger>
                                  <TooltipContent className="text-xs">Pre-tax total of all items (taxable base)</TooltipContent>
                                </Tooltip></TooltipProvider>
                              </div>
                              <div className="font-medium">{formatInr(t.subtotal)}</div>
                            </div>

                            {totalTax > 0 && (
                              <div className="px-3 py-2 border-t flex items-center justify-between text-sm">
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  Tax
                                  <TooltipProvider><Tooltip><TooltipTrigger asChild><Info className="h-3 w-3 cursor-help" /></TooltipTrigger>
                                    <TooltipContent className="text-xs space-y-1">
                                      {(t.totalCgst ?? 0) > 0 && <p>CGST: {formatInr(t.totalCgst ?? 0)}</p>}
                                      {(t.totalSgst ?? 0) > 0 && <p>SGST: {formatInr(t.totalSgst ?? 0)}</p>}
                                      {(t.totalIgst ?? 0) > 0 && <p>IGST: {formatInr(t.totalIgst ?? 0)}</p>}
                                    </TooltipContent>
                                  </Tooltip></TooltipProvider>
                                </div>
                                <div className="font-medium">{formatInr(totalTax)}</div>
                              </div>
                            )}

                            <div className="px-3 py-2 border-t flex items-center justify-between text-sm font-semibold">
                              <div>Total</div>
                              <div>{formatInr(t.grandTotal)}</div>
                            </div>

                            <div className="px-3 py-2 border-t flex items-center justify-between text-sm">
                              <div className="text-muted-foreground">Received</div>
                              <div className="font-medium">{formatInr(received)}</div>
                            </div>

                            <div className="px-3 py-2 border-t flex items-center justify-between text-sm">
                              <div className="text-muted-foreground">Balance</div>
                              <div className="font-medium">{formatInr(balance)}</div>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </CardContent>
                </Card>
              </div>
              ) : null}

            </div>

        <Sheet
          open={createCustomerOpen}
          onOpenChange={(open) => {
            setCreateCustomerOpen(open);
            if (!open) {
              setCreatePartySameAsBilling(true);
              setCreatePartyShippingEdited(false);
            }
          }}
        >
          <SheetContent side="right" className="w-full sm:max-w-[520px] md:max-w-[600px]">
            <SheetHeader>
              <SheetTitle>{partyKind === 'supplier' ? 'Create Supplier' : 'Create Customer'}</SheetTitle>
              <SheetDescription>
                Add a new {partyKind === 'supplier' ? 'supplier' : 'customer'} without leaving this page.
              </SheetDescription>
            </SheetHeader>
            <div className="mt-4 space-y-4 flex-1 overflow-y-auto px-4 pb-4">
              <div className="space-y-2">
                <Label>{partyKind === 'supplier' ? 'Party Name *' : 'Party Name *'}</Label>
                <Input
                  value={createCustomerForm.name}
                  onChange={(e) => setCreateCustomerForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Enter name"
                />
              </div>
              <div>
                <Label>Owner Name <span className="text-muted-foreground font-normal ml-1">(Optional)</span></Label>
                <Input
                  value={createCustomerForm.ownerName}
                  onChange={(e) => setCreateCustomerForm((p) => ({ ...p, ownerName: e.target.value }))}
                  placeholder="Owner / Proprietor"
                />
              </div>
              <EmailInput
                label="Email"
                value={createCustomerForm.email}
                onChange={(v) => {
                  setCreateCustomerForm((p) => ({ ...p, email: v }));
                  if (createPartyContactErrors.email) setCreatePartyContactErrors((p) => ({ ...p, email: undefined }));
                }}
                placeholder="customer@email.com"
                error={createPartyContactErrors.email}
              />
              <PhoneInput
                label="Phone"
                value={createCustomerForm.phone}
                onChange={(v) => {
                  setCreateCustomerForm((p) => ({ ...p, phone: v }));
                  if (createPartyContactErrors.phone) setCreatePartyContactErrors((p) => ({ ...p, phone: undefined }));
                }}
                error={createPartyContactErrors.phone}
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Opening Balance</Label>
                  <Input
                    value={createCustomerForm.openingBalance}
                    onChange={(e) => setCreateCustomerForm((p) => ({ ...p, openingBalance: e.target.value }))}
                    placeholder="0"
                    type="number"
                  />
                </div>
                <div>
                  <Label>Opening Type</Label>
                  <Select
                    value={createCustomerForm.openingBalanceType}
                    onValueChange={(v) => setCreateCustomerForm((p) => ({ ...p, openingBalanceType: (v as any) || 'dr' }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dr">DR (Receivable)</SelectItem>
                      <SelectItem value="cr">CR (Payable)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <GstinInput
                label="GSTIN"
                value={createCustomerForm.gstin}
                onChange={(v) => {
                  setCreateCustomerForm((p) => ({ ...p, gstin: v }));
                  if (createPartyContactErrors.gstin) setCreatePartyContactErrors((p) => ({ ...p, gstin: undefined }));
                }}
                onBlur={() => {
                  void handleCreateCustomerGstinLookup();
                }}
                error={createPartyContactErrors.gstin}
              />
              {createCustomerGstinLookupLoading ? (
                <div className="text-xs text-muted-foreground mt-1">Fetching GST details...</div>
              ) : null}
              <PanInput
                label="PAN"
                value={createCustomerForm.pan}
                onChange={(v) => setCreateCustomerForm((p) => ({ ...p, pan: v }))}
              />
              <div>
                <Label>Billing Address</Label>
                <Textarea
                  value={createCustomerForm.billingAddress}
                  onChange={(e) =>
                    setCreateCustomerForm((p) => {
                      const billingAddress = e.target.value;
                      return {
                        ...p,
                        billingAddress,
                        shippingAddress: createPartySameAsBilling ? billingAddress : p.shippingAddress,
                      };
                    })
                  }
                  rows={3}
                  placeholder="Enter billing address"
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={createPartySameAsBilling}
                  onCheckedChange={(checked) => {
                    const next = !!checked;
                    setCreatePartySameAsBilling(next);
                    if (next) {
                      setCreatePartyShippingEdited(false);
                      setCreateCustomerForm((p) => ({
                        ...p,
                        shippingAddress: p.billingAddress,
                        shippingCity: p.billingCity,
                        shippingState: p.billingState,
                        shippingPostalCode: p.billingPostalCode,
                      }));
                    }
                  }}
                />
                <Label>Shipping same as Billing</Label>
              </div>

              <div>
                <Label>Shipping Address</Label>
                <Textarea
                  value={createCustomerForm.shippingAddress}
                  onChange={(e) => {
                    if (createPartySameAsBilling) setCreatePartySameAsBilling(false);
                    setCreatePartyShippingEdited(true);
                    setCreateCustomerForm((p) => ({ ...p, shippingAddress: e.target.value }));
                  }}
                  rows={3}
                  placeholder="Enter shipping address"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Billing City</Label>
                  <Input
                    value={createCustomerForm.billingCity}
                    onChange={(e) =>
                      setCreateCustomerForm((p) => ({
                        ...p,
                        billingCity: e.target.value,
                        shippingCity: createPartySameAsBilling ? e.target.value : p.shippingCity,
                      }))
                    }
                    placeholder="City"
                  />
                </div>
                <div>
                  <Label>Billing State</Label>
                  <Input
                    value={createCustomerForm.billingState}
                    onChange={(e) =>
                      setCreateCustomerForm((p) => ({
                        ...p,
                        billingState: e.target.value,
                        shippingState: createPartySameAsBilling ? e.target.value : p.shippingState,
                      }))
                    }
                    placeholder="State"
                  />
                </div>
                <div>
                  <Label>Billing Postal Code</Label>
                  <Input
                    value={createCustomerForm.billingPostalCode}
                    onChange={(e) =>
                      setCreateCustomerForm((p) => ({
                        ...p,
                        billingPostalCode: e.target.value,
                        shippingPostalCode: createPartySameAsBilling ? e.target.value : p.shippingPostalCode,
                      }))
                    }
                    placeholder="560001"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Shipping City</Label>
                  <Input
                    value={createCustomerForm.shippingCity}
                    onChange={(e) => {
                      if (createPartySameAsBilling) setCreatePartySameAsBilling(false);
                      setCreatePartyShippingEdited(true);
                      setCreateCustomerForm((p) => ({ ...p, shippingCity: e.target.value }));
                    }}
                    placeholder="City"
                  />
                </div>
                <div>
                  <Label>Shipping State</Label>
                  <Input
                    value={createCustomerForm.shippingState}
                    onChange={(e) => {
                      if (createPartySameAsBilling) setCreatePartySameAsBilling(false);
                      setCreatePartyShippingEdited(true);
                      setCreateCustomerForm((p) => ({ ...p, shippingState: e.target.value }));
                    }}
                    placeholder="State"
                  />
                </div>
                <div>
                  <Label>Shipping Postal Code</Label>
                  <Input
                    value={createCustomerForm.shippingPostalCode}
                    onChange={(e) => {
                      if (createPartySameAsBilling) setCreatePartySameAsBilling(false);
                      setCreatePartyShippingEdited(true);
                      setCreateCustomerForm((p) => ({ ...p, shippingPostalCode: e.target.value }));
                    }}
                    placeholder="560001"
                  />
                </div>
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

        <Dialog open={createItemOpen} onOpenChange={setCreateItemOpen}>
          {/* ... existing dialog content ... */}
        </Dialog>

        <AlertDialog open={showSaveCustomerPrompt} onOpenChange={setShowSaveCustomerPrompt}>
          <AlertDialogContent className="sm:max-w-[500px]">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                Save New {partyLabel}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                <p className="text-foreground font-medium mb-1">{customerName}</p>
                This {partyKind} is not in your parties list. Would you like to save these details for future use?
              </AlertDialogDescription>
            </AlertDialogHeader>

            {similarCustomers.length > 0 && (
              <div className="mt-4 p-3 bg-muted/30 rounded-lg border border-dashed">
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Did you mean one of these?</p>
                <div className="space-y-2">
                  {similarCustomers.map(c => (
                    <Button 
                      key={c.id} 
                      variant="outline" 
                      className="w-full justify-start text-left h-auto py-2 px-3"
                      onClick={() => {
                        tryApplyPresetCustomerEnhanced(c.name);
                        setShowSaveCustomerPrompt(false);
                        toast.info(`Switched to ${c.name}`);
                      }}
                    >
                      <div className="flex flex-col">
                        <span className="font-semibold">{c.name}</span>
                        {c.gstin && <span className="text-[10px] opacity-70">GST: {c.gstin}</span>}
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <AlertDialogFooter className="mt-6 flex-col sm:flex-row gap-2">
              <AlertDialogCancel 
                onClick={() => executeSave()}
                className="w-full sm:w-auto"
              >
                No, Just Save {type}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                   // Pre-fill and save
                   setCreateCustomerForm(prev => ({
                     ...prev,
                     name: customerName,
                     billingAddress: customerAddress,
                     gstin: customerGstin,
                     phone: customerMobile,
                     email: customerEmail,
                     billingState: placeOfSupply
                   }));
                   // We need to trigger the save. Since setCreateCustomerForm is async in nature,
                   // it's better to just call a function that takes the values.
                   await handleSaveNewCustomerInlineResumable(customerName, customerAddress, customerGstin, customerMobile, customerEmail, placeOfSupply);
                }}
                className="w-full sm:w-auto"
              >
                Yes, Save & Continue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>
      </div>
      </div>

      {/* Sticky bottom save bar */}
      <div className="sticky bottom-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-4 py-3 flex items-center justify-end gap-3 shadow-[0_-2px_8px_rgba(0,0,0,0.06)]">
        <Button type="button" variant="outline" onClick={() => navigate('/documents')}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving} className="px-6" data-tour-id="cta-save-document">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </>
  );
}
