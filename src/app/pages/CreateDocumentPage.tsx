import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../components/ui/accordion';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/ui/collapsible';
import { Check, ChevronDown, ChevronUp, ChevronsUpDown, Plus, Save, Trash2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../config/api';
import { toast } from 'sonner';
import { TraceLoader } from '../components/TraceLoader';

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

  const smoothPanTo = (el: HTMLElement | null | undefined) => {
    if (!el) return;
    try {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch {
      // no-op
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
        setPresetCustomers(
          customersData.map((c: any) => ({
            ...c,
            address: c?.address || c?.billingAddress || c?.shippingAddress || '',
            billingAddress: c?.billingAddress || c?.address || '',
            shippingAddress: c?.shippingAddress || '',
            email: c?.email || '',
            phone: c?.phone || '',
          }))
        );
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
      }
    } catch (error) {
      toast.error('Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  const calculateItemTotal = (item: DocumentItem) => {
    const subtotal = item.quantity * item.rate;
    const discountAmount = (subtotal * item.discount) / 100;
    const taxableAmount = subtotal - discountAmount;
    const cgstAmount = (taxableAmount * item.cgst) / 100;
    const sgstAmount = (taxableAmount * item.sgst) / 100;
    const igstAmount = (taxableAmount * item.igst) / 100;
    return taxableAmount + cgstAmount + sgstAmount + igstAmount;
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
        unit: 'pcs',
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
        referenceNo: type === 'order' ? referenceNo : null,
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

  const totals = calculateTotals();

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
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="rounded-xl border bg-gradient-to-r from-blue-50 to-green-50 dark:from-card dark:to-background p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                className="neon-target neon-hover transition-all hover:border-primary/30 hover:text-primary"
                onClick={() => navigate('/documents')}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                  {isEdit ? 'Edit Document' : 'Create Document'}
                </h1>
                <p className="text-muted-foreground mt-1">Fill in the details below</p>
              </div>
            </div>
            <Button
              onClick={handleSave}
              disabled={saving}
              data-tour-id="cta-save-document"
              className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 shadow-sm"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Document'}
            </Button>
          </div>
        </div>

        {/* Document Type & Status */}
        <Card className="mb-6">
          <CardHeader className="border-b bg-muted/40">
            <CardTitle>Document Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label>Document Type</Label>
                <Select value={type} onValueChange={handleTypeChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quotation">Quotation</SelectItem>
                    <SelectItem value="order">Order</SelectItem>
                    <SelectItem value="proforma">Proforma Invoice</SelectItem>
                    <SelectItem value="invoice">Invoice</SelectItem>
                    <SelectItem value="challan">Delivery Challan</SelectItem>
                    <SelectItem value="purchase">Purchase Invoice</SelectItem>
                    <SelectItem value="invoice_cancellation">Invoice Cancellation</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(type === 'invoice_cancellation' || type === 'order') && (
                <div className="sm:col-span-2">
                  <Label>
                    {type === 'order' ? 'Reference Quotation (optional)' : 'Reference Invoice *'}
                  </Label>
                  <Popover open={referenceDocOpen} onOpenChange={setReferenceDocOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={referenceDocOpen}
                        className="w-full justify-between"
                      >
                        <span className="truncate">
                          {referenceDocumentNumber || (type === 'order' ? 'Select quotation...' : 'Select invoice...')}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                      <Command>
                        <CommandInput placeholder={type === 'order' ? 'Search quotation...' : 'Search invoice...'} />
                        <CommandList>
                          <CommandEmpty>{type === 'order' ? 'No quotations found.' : 'No invoices found.'}</CommandEmpty>
                          <CommandGroup>
                            {referenceDocs.map((inv) => (
                              <CommandItem
                                key={inv.id}
                                value={`${inv.documentNumber} ${inv.customerName || ''}`}
                                onSelect={() => {
                                  void handleReferenceDocSelect(inv);
                                }}
                              >
                                <Check
                                  className={
                                    referenceDocumentId === inv.id
                                      ? 'mr-2 h-4 w-4 opacity-100'
                                      : 'mr-2 h-4 w-4 opacity-0'
                                  }
                                />
                                <div className="min-w-0">
                                  <div className="truncate font-medium">{inv.documentNumber}</div>
                                  <div className="truncate text-xs text-muted-foreground">{inv.customerName || '—'}</div>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              <div>
                <Label>Valid From</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div>
                <Label>Valid To</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>

              <div>
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="final">Final</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader className="border-b bg-muted/40">
            <CardTitle>More Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" className="w-full">
              {type !== 'quotation' && type !== 'order' && (
                <AccordionItem value="document-details">
                  <AccordionTrigger
                    onClick={(e) => {
                      const target = e.currentTarget as unknown as HTMLElement;
                      window.setTimeout(() => smoothPanTo(target), 50);
                    }}
                    className="neon-target neon-hover transition-all hover:text-primary"
                  >
                    Document Details
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <Label>Invoice No</Label>
                        <Input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} />
                      </div>
                      <div>
                        <Label>Challan No</Label>
                        <Input value={challanNo} onChange={(e) => setChallanNo(e.target.value)} />
                      </div>
                      <div />
                    </div>

                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <Label>Transport</Label>
                        <Input value={transport} onChange={(e) => setTransport(e.target.value)} />
                      </div>
                      <div>
                        <Label>Transport ID</Label>
                        <Input value={transportId} onChange={(e) => setTransportId(e.target.value)} />
                      </div>
                      <div />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              <AccordionItem value="eway-bill-details">
                <AccordionTrigger
                  onClick={(e) => {
                    const target = e.currentTarget as unknown as HTMLElement;
                    window.setTimeout(() => smoothPanTo(target), 50);
                  }}
                  className="neon-target neon-hover transition-all hover:text-primary"
                >
                  E-way Bill Details
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <Label>E-way Bill No</Label>
                      <Input value={ewayBillNo} onChange={(e) => setEwayBillNo(e.target.value)} />
                    </div>
                    <div>
                      <Label>E-way Bill Date</Label>
                      <Input type="date" value={ewayBillDate} onChange={(e) => setEwayBillDate(e.target.value)} />
                    </div>
                    <div>
                      <Label>Valid Upto</Label>
                      <Input type="date" value={ewayBillValidUpto} onChange={(e) => setEwayBillValidUpto(e.target.value)} />
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <Label>Vehicle No.</Label>
                      <Input value={ewayBillVehicleNo} onChange={(e) => setEwayBillVehicleNo(e.target.value)} />
                    </div>
                    <div>
                      <Label>Transporter Name</Label>
                      <Input value={ewayBillTransporterName} onChange={(e) => setEwayBillTransporterName(e.target.value)} />
                    </div>
                    <div>
                      <Label>Transporter Doc No.</Label>
                      <Input value={ewayBillTransporterDocNo} onChange={(e) => setEwayBillTransporterDocNo(e.target.value)} />
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <Label>Distance (KM)</Label>
                      <Input value={ewayBillDistanceKm} onChange={(e) => setEwayBillDistanceKm(e.target.value)} />
                    </div>
                    <div />
                    <div />
                  </div>
                </AccordionContent>
              </AccordionItem>

              {(type === 'quotation' || type === 'order') && (
                <AccordionItem value="quotation-fields">
                  <AccordionTrigger
                    onClick={(e) => {
                      const target = e.currentTarget as unknown as HTMLElement;
                      window.setTimeout(() => smoothPanTo(target), 50);
                    }}
                    className="neon-target neon-hover transition-all hover:text-primary"
                  >
                    {type === 'order' ? 'Order Fields' : 'Quotation Fields'}
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <Label>Order Number</Label>
                        <Input value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} />
                      </div>
                      {type === 'order' ? (
                        <>
                          <div>
                            <Label>Revision Number / Re-Order No.</Label>
                            <Input value={revisionNumber} onChange={(e) => setRevisionNumber(e.target.value)} />
                          </div>
                          <div>
                            <Label>Reference No.</Label>
                            <Input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} />
                          </div>
                        </>
                      ) : (
                        <>
                          <div />
                          <div />
                        </>
                      )}
                    </div>

                    {type === 'order' && (
                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <Label>Purchase Order No. (PO No.)</Label>
                          <Input value={purchaseOrderNo} onChange={(e) => setPurchaseOrderNo(e.target.value)} />
                        </div>
                        <div>
                          <Label>PO Date</Label>
                          <Input type="date" value={poDate} onChange={(e) => setPoDate(e.target.value)} />
                        </div>
                        <div />
                      </div>
                    )}

                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="sm:col-span-2">
                        <Label>Delivery Address</Label>
                        <Textarea
                          value={deliveryAddress}
                          onChange={(e) => setDeliveryAddress(e.target.value)}
                          rows={2}
                          placeholder="Enter delivery address"
                        />
                      </div>
                      <div>
                        <Label>Delivery Method</Label>
                        <Input value={deliveryMethod} onChange={(e) => setDeliveryMethod(e.target.value)} />
                      </div>
                    </div>

                    {type === 'order' && (
                      <>
                        <div className="mt-6">
                          <div className="text-sm font-semibold text-foreground">Departure From</div>
                          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="sm:col-span-2">
                              <Label>Address</Label>
                              <Textarea
                                value={departureFromAddress}
                                onChange={(e) => setDepartureFromAddress(e.target.value)}
                                rows={2}
                                placeholder="Enter departure from address"
                              />
                            </div>
                            <div>
                              <Label>Pincode</Label>
                              <Input value={departureFromPostalCode} onChange={(e) => setDepartureFromPostalCode(e.target.value)} />
                            </div>
                            <div>
                              <Label>City</Label>
                              <Input value={departureFromCity} onChange={(e) => setDepartureFromCity(e.target.value)} />
                            </div>
                          </div>
                          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                              <Label>State</Label>
                              <Input value={departureFromState} onChange={(e) => setDepartureFromState(e.target.value)} />
                            </div>
                            <div className="sm:col-span-1 lg:col-span-3" />
                          </div>
                        </div>

                        <div className="mt-6">
                          <div className="text-sm font-semibold text-foreground">Departure To</div>
                          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="sm:col-span-2">
                              <Label>Address</Label>
                              <Textarea
                                value={departureToAddress}
                                onChange={(e) => setDepartureToAddress(e.target.value)}
                                rows={2}
                                placeholder="Enter departure to address"
                              />
                            </div>
                            <div>
                              <Label>Pincode</Label>
                              <Input value={departureToPostalCode} onChange={(e) => setDepartureToPostalCode(e.target.value)} />
                            </div>
                            <div>
                              <Label>City</Label>
                              <Input value={departureToCity} onChange={(e) => setDepartureToCity(e.target.value)} />
                            </div>
                          </div>
                          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                              <Label>State</Label>
                              <Input value={departureToState} onChange={(e) => setDepartureToState(e.target.value)} />
                            </div>
                            <div className="sm:col-span-1 lg:col-span-3" />
                          </div>
                        </div>
                      </>
                    )}

                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <Label>Expected Delivery Date</Label>
                        <Input
                          type="date"
                          value={expectedDeliveryDate}
                          onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                        />
                      </div>
                      <div />
                      <div />
                    </div>

                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <Label>Payment Terms</Label>
                        <Input value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} />
                      </div>
                      <div>
                        <Label>Credit Period</Label>
                        <Input value={creditPeriod} onChange={(e) => setCreditPeriod(e.target.value)} />
                      </div>
                      <div className="sm:col-span-2">
                        <Label>Late Fee Terms</Label>
                        <Input value={lateFeeTerms} onChange={(e) => setLateFeeTerms(e.target.value)} />
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <Label>Packing/Handling Charges</Label>
                        <Input
                          type="number"
                          value={packingHandlingCharges}
                          onChange={(e) => setPackingHandlingCharges(parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div>
                        <Label>TCS (optional)</Label>
                        <Input
                          type="number"
                          value={tcs}
                          onChange={(e) => setTcs(parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div className="sm:col-span-2" />
                    </div>

                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label>Internal Notes</Label>
                        <Textarea
                          value={notes}
                          onChange={(e) => {
                            setNotes(e.target.value);
                            setInternalNotes(e.target.value);
                          }}
                          placeholder="Only visible internally"
                          rows={2}
                        />
                      </div>
                      <div>
                        <Label>Warranty/Return/Cancellation Policies</Label>
                        <Textarea
                          value={warrantyReturnCancellationPolicies}
                          onChange={(e) => setWarrantyReturnCancellationPolicies(e.target.value)}
                          rows={2}
                        />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              <AccordionItem value="bank-upi-details">
                <AccordionTrigger
                  onClick={(e) => {
                    const target = e.currentTarget as unknown as HTMLElement;
                    window.setTimeout(() => smoothPanTo(target), 50);
                  }}
                  className="neon-target neon-hover transition-all hover:text-primary"
                >
                  Bank / UPI Details
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>Bank Name</Label>
                      <Input value={bankName} onChange={(e) => setBankName(e.target.value)} />
                    </div>
                    <div>
                      <Label>Branch</Label>
                      <Input value={bankBranch} onChange={(e) => setBankBranch(e.target.value)} />
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>Account Number</Label>
                      <Input value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)} />
                    </div>
                    <div>
                      <Label>IFSC</Label>
                      <Input value={bankIfsc} onChange={(e) => setBankIfsc(e.target.value)} />
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>UPI ID</Label>
                      <Input value={upiId} onChange={(e) => setUpiId(e.target.value)} />
                    </div>
                    <div>
                      <Label>UPI QR Text</Label>
                      <Input value={upiQrText} onChange={(e) => setUpiQrText(e.target.value)} />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Customer / Supplier Details */}
        <Card className="mb-6">
          <CardHeader className="border-b bg-muted/40">
            <div className="flex items-center justify-between gap-3">
              <CardTitle>{partyLabel} Details</CardTitle>
              {type !== 'purchase' && (
                <div
                  className="relative inline-flex items-center rounded-full bg-muted p-1 text-xs"
                  role="tablist"
                  aria-label="Party type"
                >
                  <div
                    className={`absolute top-1 bottom-1 left-1 w-1/2 rounded-full bg-background shadow-sm ring-1 ring-border transition-transform duration-200 ease-out ${
                      partyKind === 'supplier' ? 'translate-x-full' : 'translate-x-0'
                    }`}
                    aria-hidden
                  />
                  <button
                    type="button"
                    className={`relative z-10 w-24 select-none rounded-full px-3 py-1.5 font-medium transition-colors duration-200 ${
                      partyKind === 'customer' ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                    onClick={() => {
                      setPartyId('');
                      handleTypeChange(lastCustomerDocType || 'invoice');
                    }}
                    role="tab"
                    aria-selected={partyKind === 'customer'}
                  >
                    Customer
                  </button>
                  <button
                    type="button"
                    className={`relative z-10 w-24 select-none rounded-full px-3 py-1.5 font-medium transition-colors duration-200 ${
                      partyKind === 'supplier' ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                    onClick={() => {
                      setPartyId('');
                      setLastCustomerDocType(type || 'invoice');
                      handleTypeChange('purchase');
                    }}
                    role="tab"
                    aria-selected={partyKind === 'supplier'}
                  >
                    Supplier
                  </button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>{partyLabel} Name *</Label>
              <Input
                value={customerName}
                onChange={(e) => {
                  const next = e.target.value;
                  setCustomerName(next);
                  tryApplyPresetCustomerEnhanced(next);
                }}
                placeholder={`Enter ${partyLabel.toLowerCase()} name`}
                list="customer-presets"
              />
              <datalist id="customer-presets">
                {presetCustomers.map(c => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
            </div>
            <div>
              <Label>{partyLabel} Address</Label>
              <Textarea
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                placeholder={`Enter ${partyLabel.toLowerCase()} address`}
                rows={2}
              />
            </div>
            <div>
              <Label>{partyLabel} GSTIN</Label>
              <Input
                value={customerGstin}
                onChange={(e) => setCustomerGstin(e.target.value)}
                placeholder="22AAAAA0000A1Z5"
              />
            </div>

            {(type === 'quotation' || type === 'order') && partyKind === 'customer' && (
              <div className="grid md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <Label>Contact Person</Label>
                  <Input
                    value={customerContactPerson}
                    onChange={(e) => setCustomerContactPerson(e.target.value)}
                    placeholder="Contact person"
                  />
                </div>
                <div>
                  <Label>Mobile</Label>
                  <Input
                    value={customerMobile}
                    onChange={(e) => setCustomerMobile(e.target.value)}
                    placeholder="Mobile"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="Email"
                  />
                </div>
              </div>
            )}

            {(type === 'quotation' || type === 'order') && partyKind === 'customer' && (
              <div className="grid md:grid-cols-4 gap-4">
                <div>
                  <Label>Customer State Code</Label>
                  <Input
                    value={customerStateCode}
                    onChange={(e) => setCustomerStateCode(e.target.value)}
                    placeholder="e.g. 27"
                  />
                </div>
                <div className="md:col-span-3" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Items */}
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Items</CardTitle>
            <Button onClick={addItem} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {items.map((item, index) => {
                const isOpen = !!expandedItemRows[index];
                return (
                  <Collapsible
                    key={index}
                    open={isOpen}
                    onOpenChange={(open) => {
                      setExpandedItemRows((prev) => ({ ...prev, [index]: open }));
                      if (open) {
                        const root = document.getElementById(`doc-item-${index}`);
                        window.setTimeout(() => smoothPanTo(root), 50);
                      }
                    }}
                    className="rounded-lg border bg-card shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div id={`doc-item-${index}`} className="p-3">
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start sm:items-center">
                        <div className="sm:col-span-5">
                          <Label className="text-xs text-muted-foreground">Product/Service</Label>
                          <Input
                            value={item.name}
                            onChange={(e) => {
                              const next = e.target.value;
                              updateItem(index, 'name', next);
                              tryApplyPresetItem(index, next);
                            }}
                            placeholder="Item name"
                            list={`item-presets-${index}`}
                          />
                          <datalist id={`item-presets-${index}`}>
                            {presetItems.map(i => (
                              <option key={i.id} value={i.name} />
                            ))}
                          </datalist>
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:contents">
                          <div className="sm:col-span-2">
                          <Label className="text-xs text-muted-foreground">Qty</Label>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                            min="0"
                          />
                        </div>

                          <div className="sm:col-span-3">
                          <Label className="text-xs text-muted-foreground">Rate</Label>
                          <div className="flex items-center">
                            <Input
                              className="rounded-r-none"
                              type="number"
                              value={item.rate}
                              onChange={(e) => updateItem(index, 'rate', parseFloat(e.target.value) || 0)}
                              min="0"
                              step="0.01"
                            />
                            <Select
                              value={item.currency}
                              onValueChange={(v) => updateItem(index, 'currency', v as CurrencyCode)}
                            >
                              <SelectTrigger className="w-[76px] rounded-l-none border-l-0 px-2">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="INR">₹</SelectItem>
                                <SelectItem value="USD">$</SelectItem>
                                <SelectItem value="EUR">€</SelectItem>
                                <SelectItem value="GBP">£</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                          <div className="flex items-center justify-between gap-3 sm:col-span-4 sm:justify-end">
                            <div className="sm:text-right">
                              <div className="text-xs text-muted-foreground">Total</div>
                              <div className="font-semibold text-primary">
                                {currencySymbol(item.currency)}{item.total.toFixed(2)}
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="icon" className="neon-target neon-hover transition-all hover:text-primary">
                                  {isOpen ? (
                                    <ChevronUp className={`h-4 w-4 transition-all`} />
                                  ) : (
                                    <ChevronDown className={`h-4 w-4 transition-all`} />
                                  )}
                                </Button>
                              </CollapsibleTrigger>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeItem(index)}
                                className="neon-target neon-hover transition-all"
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <CollapsibleContent>
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-12 gap-3 rounded-md bg-muted/40 p-3 transition-all duration-300 ease-out">
                          <div className="sm:col-span-12">
                            <Label className="text-xs text-muted-foreground">Item Description</Label>
                            <Textarea
                              value={item.description || ''}
                              onChange={(e) => updateItem(index, 'description', e.target.value)}
                              placeholder="Description"
                              rows={2}
                            />
                          </div>

                          <div className="sm:col-span-6">
                            <Label className="text-xs text-muted-foreground">Item Code / SKU</Label>
                            <Input
                              value={item.sku || ''}
                              onChange={(e) => updateItem(index, 'sku', e.target.value)}
                              placeholder="SKU"
                            />
                          </div>

                          <div className="sm:col-span-6">
                            <Label className="text-xs text-muted-foreground">Service Period</Label>
                            <Input
                              value={item.servicePeriod || ''}
                              onChange={(e) => updateItem(index, 'servicePeriod', e.target.value)}
                              placeholder="e.g., 01-Apr-2026 to 30-Apr-2026"
                            />
                          </div>

                          <div className="sm:col-span-3">
                            <Label className="text-xs text-muted-foreground">HSN/SAC</Label>
                            <Input
                              value={item.hsnSac}
                              onChange={(e) => updateItem(index, 'hsnSac', e.target.value)}
                              placeholder="HSN"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <Label className="text-xs text-muted-foreground">Unit</Label>
                            <Select value={item.unit} onValueChange={(v) => updateItem(index, 'unit', v)}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pcs">Pcs</SelectItem>
                                <SelectItem value="kg">Kg</SelectItem>
                                <SelectItem value="ltr">Ltr</SelectItem>
                                <SelectItem value="box">Box</SelectItem>
                                <SelectItem value="hrs">Hrs</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="sm:col-span-2">
                            <Label className="text-xs text-muted-foreground">Disc%</Label>
                            <Input
                              type="number"
                              value={item.discount}
                              onChange={(e) => updateItem(index, 'discount', parseFloat(e.target.value) || 0)}
                              min="0"
                              max="100"
                            />
                          </div>

                          <div className="sm:col-span-5">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div>
                                <Label className="text-xs text-muted-foreground">CGST%</Label>
                                <Input
                                  type="number"
                                  value={item.cgst}
                                  onChange={(e) => updateItem(index, 'cgst', parseFloat(e.target.value) || 0)}
                                  min="0"
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">SGST%</Label>
                                <Input
                                  type="number"
                                  value={item.sgst}
                                  onChange={(e) => updateItem(index, 'sgst', parseFloat(e.target.value) || 0)}
                                  min="0"
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">IGST%</Label>
                                <Input
                                  type="number"
                                  value={item.igst}
                                  onChange={(e) => updateItem(index, 'igst', parseFloat(e.target.value) || 0)}
                                  min="0"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Additional Details */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Transport Charges</Label>
                <Input
                  type="number"
                  value={transportCharges}
                  onChange={(e) => setTransportCharges(parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <Label>Additional Charges</Label>
                <Input
                  type="number"
                  value={additionalCharges}
                  onChange={(e) => setAdditionalCharges(parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                />
              </div>

              {type === 'quotation' && (
                <></>
              )}
              <div>
                <Label>Round Off</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    value={roundOff}
                    onChange={(e) => setRoundOff(parseFloat(e.target.value) || 0)}
                    step="0.01"
                    disabled={autoRoundOff}
                  />
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <Switch checked={autoRoundOff} onCheckedChange={setAutoRoundOff} />
                    <span className="text-sm text-muted-foreground">Auto</span>
                  </div>
                </div>
              </div>
              <div>
                <Label>Payment Status</Label>
                <Select value={paymentStatus} onValueChange={(v) => setPaymentStatus(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {shouldShowPaymentMode && (
                <div>
                  <Label>Mode of Payment</Label>
                  <Select value={paymentMode} onValueChange={(v) => setPaymentMode(v as PaymentMode)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="online">Online Payment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              {type !== 'quotation' && (
                <div>
                  <Label>Notes</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Internal notes..."
                    rows={2}
                  />
                </div>
              )}
              <div>
                <Label>Terms & Conditions</Label>
                <Textarea
                  value={termsConditions}
                  onChange={(e) => setTermsConditions(e.target.value)}
                  placeholder="Payment terms, warranty, etc..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Items Total:</span>
                <span className="font-semibold">{primarySymbol}{totals.itemsTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total CGST:</span>
                <span className="font-semibold">{primarySymbol}{totals.totalCgst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total SGST:</span>
                <span className="font-semibold">{primarySymbol}{totals.totalSgst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total IGST:</span>
                <span className="font-semibold">{primarySymbol}{totals.totalIgst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Transport Charges:</span>
                <span className="font-semibold">{primarySymbol}{transportCharges.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Additional Charges:</span>
                <span className="font-semibold">{primarySymbol}{additionalCharges.toFixed(2)}</span>
              </div>
              {type === 'quotation' && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Packing/Handling:</span>
                    <span className="font-semibold">{primarySymbol}{packingHandlingCharges.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">TCS:</span>
                    <span className="font-semibold">{primarySymbol}{tcs.toFixed(2)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Round Off:</span>
                <span className="font-semibold">{primarySymbol}{roundOff.toFixed(2)}</span>
              </div>
              <div className="border-t pt-3 flex justify-between">
                <span className="text-lg font-bold">Grand Total:</span>
                <span className="text-lg font-bold text-blue-600">{primarySymbol}{totals.grandTotal.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="hidden sm:flex mt-6 justify-end gap-3">
          <Button variant="outline" onClick={() => navigate('/documents')}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Document'}
          </Button>
        </div>

        <div className="h-24 sm:hidden" aria-hidden />

        <div className="sm:hidden fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">Grand Total</div>
                <div className="text-base font-bold text-foreground truncate">
                  {primarySymbol}{totals.grandTotal.toFixed(2)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => navigate('/documents')}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
