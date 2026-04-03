import { useState, useEffect, useCallback, type ChangeEvent } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { DateRangePicker, type DateRange } from '../components/ui/date-range-picker';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Badge } from '../components/ui/badge';
import { 
  Plus, 
  Search, 
  Filter,
  MoreVertical,
  Copy,
  FileEdit,
  Download,
  Repeat,
  CheckCircle2,
  Clock,
  FileX,
  Trash2,
  Calendar
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useIsNative } from '../hooks/useIsNative';
import { API_URL, mkCacheKey } from '../config/api';
import { toast } from 'sonner';
import { TraceLoader } from '../components/TraceLoader';
import { GenericPageSkeleton } from '../components/PageSkeleton';
import { MobileFormSheet, MobileFormSection, MobileFormActions } from '../components/MobileFormSheet';
import { useCurrentProfile } from '../hooks/useCurrentProfile';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { fetchDocumentById, PDF_TEMPLATES, PdfRenderer, exportElementToPdf, exportElementToPdfBlobUrl, type PdfTemplateId, type DocumentDto } from '../pdf';
import { useRef } from 'react';
import QRCode from 'qrcode';

/** Read documents from localStorage synchronously — used to seed state before first render */
function readDocsCacheSync(): any[] {
  return [];
}

import { usePageRefresh } from '../hooks/usePageRefresh';

export function DocumentsPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [filteredDocs, setFilteredDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [totalDocs, setTotalDocs] = useState(0);
  const PAGE_SIZE = 50;
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteDoc, setDeleteDoc] = useState<any | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [partyFilter, setPartyFilter] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange>({ from: '', to: '' });
  const { accessToken, deviceId } = useAuth();
  const isNative = useIsNative();
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, profileId } = useCurrentProfile();

  const apiUrl = API_URL;

  // Reset all state when profile switches to prevent data bleed
  useEffect(() => {
    setDocuments([]);
    setFilteredDocs([]);
    setSearchTerm('');
    setPartyFilter('');
    setFilterType('all');
    setFilterStatus('all');
    setDateRange({ from: '', to: '' });
    setDeleteDialogOpen(false);
    setDeleteDoc(null);
    setLoading(true);
  }, [profileId]);

  const pdfPreviewCacheRef = useRef(
    new Map<string, { url: string; createdAt: number }>()
  );

  const pdfPreviewInflightRef = useRef(new Map<string, Promise<string>>());

  const getPdfPreviewCacheKey = () => {
    const id = String(pdfDoc?.id || pdfDocumentId || '').trim();
    const v = String((pdfDoc as any)?.updatedAt || (pdfDoc as any)?.version || '').trim();
    return `${id}::${v}::${pdfTemplateId}`;
  };

  const putPdfPreviewCache = (key: string, url: string) => {
    const cache = pdfPreviewCacheRef.current;
    cache.set(key, { url, createdAt: Date.now() });

    // Keep cache small to avoid leaking object URLs.
    if (cache.size <= 5) return;
    const entries = Array.from(cache.entries()).sort((a, b) => a[1].createdAt - b[1].createdAt);
    while (entries.length > 5) {
      const [oldKey, oldVal] = entries.shift()!;
      cache.delete(oldKey);
      try {
        URL.revokeObjectURL(oldVal.url);
      } catch {
        // ignore
      }
    }
  };
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

  const handlePreviewPdf = async () => {
    if (!pdfDoc) return;
    if (!pdfRef.current) return;

    if (!warmPreviewEnabled) {
      setWarmPreviewEnabled(true);
    }

    const cacheKey = getPdfPreviewCacheKey();
    const cached = pdfPreviewCacheRef.current.get(cacheKey);
    if (cached?.url) {
      window.open(cached.url, '_blank', 'noopener,noreferrer');
      return;
    }

    setPdfLoading(true);
    try {
      const docNo = safeFilename(pdfDoc.invoiceNo || pdfDoc.documentNumber || 'document');
      const customer = safeFilename(pdfDoc.customerName || 'customer');
      const filename = `${docNo}-${customer}.pdf`;
      const url = await exportElementToPdfBlobUrl({
        element: pdfRef.current,
        filename,
        scale: 1,
        imageFormat: 'JPEG',
        jpegQuality: 0.7,
      });
      putPdfPreviewCache(cacheKey, url);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to preview PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  const openDeleteDialog = (doc: any) => {
    setDeleteDoc(doc);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteDoc?.id) return;
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
      const res = await fetch(`${apiUrl}/documents/${deleteDoc.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Device-ID': deviceId,
          'X-Profile-ID': profileId,
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to delete document');
      }

      setDocuments((prev) => prev.filter((d) => d.id !== deleteDoc.id));
      setFilteredDocs((prev) => prev.filter((d) => d.id !== deleteDoc.id));
      toast.success('Document deleted');
      window.dispatchEvent(new CustomEvent('dashboardRefresh'));
      setDeleteDialogOpen(false);
      setDeleteDoc(null);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to delete document');
    } finally {
      setDeleteLoading(false);
    }
  };

  const openReminderDialog = (doc: any) => {
    setReminderDoc(doc);
    setReminderTo(String(doc?.customerMobile || '').trim());
    setReminderMessage(buildReminderMessage(doc));
    setReminderDialogOpen(true);
  };

  const handleSendSmsReminder = async () => {
    if (!reminderDoc) return;
    if (!accessToken || !deviceId || !profileId) return;
    const to = String(reminderTo || '').trim();
    if (!to) {
      toast.error('Mobile number is required');
      return;
    }
    const message = String(reminderMessage || '').trim();
    if (!message) {
      toast.error('Message is required');
      return;
    }

    setReminderSending(true);
    try {
      const res = await fetch(`${apiUrl}/documents/${reminderDoc.id}/remind`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-Device-ID': deviceId,
          'X-Profile-ID': profileId,
        },
        body: JSON.stringify({ channel: 'sms', to, message }),
      });

      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
        return;
      }
      toast.success('SMS reminder sent');
      setReminderDialogOpen(false);
      await loadDocuments();
    } catch {
      toast.error('Failed to send SMS reminder');
    } finally {
      setReminderSending(false);
    }
  };

  const handleCopyReminder = async () => {
    const message = String(reminderMessage || '').trim();
    if (!message) {
      toast.error('Nothing to copy');
      return;
    }
    try {
      await navigator.clipboard.writeText(message);
      toast.success('Copied');
    } catch {
      toast.error('Failed to copy');
    }
  };

  // Re-fetch when AppLayout resolves a stale/new profile
  useEffect(() => {
    if (!accessToken || !deviceId || !profileId) return;
    loadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, deviceId, profileId]);

  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [pdfTemplateId, setPdfTemplateId] = useState<PdfTemplateId>('classic');
  const [pdfDocumentId, setPdfDocumentId] = useState<string | null>(null);
  const [pdfDialogMode, setPdfDialogMode] = useState<'download' | 'preview'>('download');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfDoc, setPdfDoc] = useState<DocumentDto | null>(null);
  const pdfRef = useRef<HTMLDivElement | null>(null);
  const [warmPreviewEnabled, setWarmPreviewEnabled] = useState(false);
  const warmPreviewTimerRef = useRef<number | null>(null);

  const warmPdfPreviewCache = async () => {
    if (!pdfDialogOpen) return;
    if (!pdfDoc) return;
    if (!pdfRef.current) return;

    const cacheKey = getPdfPreviewCacheKey();
    if (pdfPreviewCacheRef.current.get(cacheKey)?.url) return;
    if (pdfPreviewInflightRef.current.get(cacheKey)) return;

    const task = exportElementToPdfBlobUrl({
      element: pdfRef.current,
      scale: 1,
      imageFormat: 'JPEG',
      jpegQuality: 0.7,
    })
      .then((url) => {
        putPdfPreviewCache(cacheKey, url);
        return url;
      })
      .finally(() => {
        pdfPreviewInflightRef.current.delete(cacheKey);
      });

    pdfPreviewInflightRef.current.set(cacheKey, task);
    await task;
  };

  useEffect(() => {
    if (!pdfDialogOpen) {
      setWarmPreviewEnabled(false);
      return;
    }
    if (!warmPreviewEnabled) return;
    if (!pdfDoc) return;

    if (typeof warmPreviewTimerRef.current === 'number') {
      window.clearTimeout(warmPreviewTimerRef.current);
      warmPreviewTimerRef.current = null;
    }

    // Debounce to avoid re-render-triggered warmups while user is interacting.
    warmPreviewTimerRef.current = window.setTimeout(() => {
      // Prefer idle time so UI stays responsive.
      const w = window as any;
      const run = () => {
        warmPdfPreviewCache().catch(() => {
          // ignore
        });
      };

      if (typeof w.requestIdleCallback === 'function') {
        w.requestIdleCallback(run, { timeout: 2000 });
      } else {
        window.setTimeout(run, 0);
      }
    }, 900);

    return () => {
      if (typeof warmPreviewTimerRef.current === 'number') {
        window.clearTimeout(warmPreviewTimerRef.current);
        warmPreviewTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfDialogOpen, warmPreviewEnabled, pdfDoc, pdfTemplateId]);

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentDoc, setPaymentDoc] = useState<any | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);

  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [reminderDoc, setReminderDoc] = useState<any | null>(null);
  const [reminderTo, setReminderTo] = useState('');
  const [reminderMessage, setReminderMessage] = useState('');
  const [reminderSending, setReminderSending] = useState(false);

  const loadDocuments = useCallback(async ({ force = false, skip = 0 }: { force?: boolean, skip?: number } = {}) => {
    if (!accessToken || !deviceId || !profileId) return;
    setLoading(true);

    try {
      const p = `profileId=${profileId}`;
      const t = filterType !== 'all' ? `&type=${filterType}` : '';
      const s = filterStatus !== 'all' ? `&status=${filterStatus}` : '';
      const d = (dateRange.from || dateRange.to) 
        ? `&from=${encodeURIComponent(dateRange.from)}&to=${encodeURIComponent(dateRange.to)}` 
        : '';

      const response = await fetch(
        `${apiUrl}/documents?limit=${PAGE_SIZE}&skip=${skip}&${p}${t}${s}${d}`,
        { 
          headers: { 
            'Authorization': `Bearer ${accessToken}`, 
            'X-Device-ID': deviceId, 
            'X-Profile-ID': profileId,
            'Cache-Control': 'no-cache',
          } 
        }
      );
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        toast.error(err?.error || `Failed to load documents (${response.status})`);
        return;
      }
      const json = await response.json();
      const data: any[] = Array.isArray(json) ? json : (json.data ?? []);
      const total: number = json.total ?? data.length;
      const more: boolean = json.hasMore ?? false;
      
      if (skip === 0) {
        setDocuments(data);
        filterDocuments(data);
      } else {
        const merged = [...documents, ...data];
        setDocuments(merged);
        filterDocuments(merged);
      }
      setTotalDocs(total);
      setHasMore(more);
    } catch {
      if (!documents.length) toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [accessToken, deviceId, profileId, filterType, filterStatus, dateRange, apiUrl]);

  useEffect(() => {
    loadDocuments({ skip: 0 });
  }, [loadDocuments]);

  // Auto-refresh on tab focus (if data is >30s old) and on profile/sign-in changes
  usePageRefresh({
    onRefresh: () => loadDocuments({ skip: 0, force: true }),
    staleTtlMs: 30_000,
    enabled: !!profileId && !!accessToken,
  });

  const loadMoreDocuments = async () => {
    if (!accessToken || !deviceId || !profileId || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const response = await fetch(
        `${apiUrl}/documents?limit=${PAGE_SIZE}&skip=${documents.length}`,
        { headers: { 'Authorization': `Bearer ${accessToken}`, 'X-Device-ID': deviceId, 'X-Profile-ID': profileId } }
      );
      const json = await response.json();
      if (json.error) { toast.error(json.error); return; }
      const newDocs: any[] = Array.isArray(json) ? json : (json.data ?? []);
      const merged = [...documents, ...newDocs];
      setDocuments(merged);
      filterDocuments(merged);
      setHasMore(json.hasMore ?? false);
      setTotalDocs(json.total ?? merged.length);
    } catch {
      toast.error('Failed to load more documents');
    } finally {
      setLoadingMore(false);
    }
  };

  const filterDocuments = (docs?: any[]) => {
    const source = Array.isArray(docs) ? docs : documents;
    let filtered = [...source];

    const norm = (v: any) => String(v || '').trim().toLowerCase();

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(doc => doc.type === filterType);
    }

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(doc => {
        if (filterStatus === 'paid') return doc.paymentStatus === 'paid';
        if (filterStatus === 'unpaid') return doc.paymentStatus === 'unpaid' || doc.paymentStatus === 'pending' || doc.paymentStatus === 'partial';
        if (filterStatus === 'draft') return doc.status === 'draft';
        return true;
      });
    }

    // Search
    if (searchTerm) {
      filtered = filtered.filter(doc => 
        doc.documentNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.invoiceNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.customerName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Party filter (customer/supplier name)
    if (partyFilter.trim()) {
      const q = norm(partyFilter);
      filtered = filtered.filter(doc => {
        const partyName = norm(doc.customerName || doc.partyName || doc.supplierName);
        return partyName.includes(q);
      });
    }

    setFilteredDocs(filtered);
  };

  const norm = (v: any) => String(v || '').trim().toLowerCase();
  const partySalesOutstanding = partyFilter.trim()
    ? documents
        .filter((d) => {
          const partyName = norm(d.customerName || d.partyName || d.supplierName);
          const q = norm(partyFilter);
          const isSameParty = partyName.includes(q);
          const isSalesDoc = d.type === 'invoice' || d.type === 'billing';
          const isUnpaid = d.paymentStatus !== 'paid';
          return isSameParty && isSalesDoc && isUnpaid;
        })
        .reduce((sum, d) => sum + Number(d.grandTotal || 0), 0)
    : 0;

  const partyPurchasePayable = partyFilter.trim()
    ? documents
        .filter((d) => {
          const partyName = norm(d.customerName || d.partyName || d.supplierName);
          const q = norm(partyFilter);
          const isSameParty = partyName.includes(q);
          const isPurchaseDoc = d.type === 'purchase';
          const isUnpaid = d.paymentStatus !== 'paid';
          return isSameParty && isPurchaseDoc && isUnpaid;
        })
        .reduce((sum, d) => sum + Number(d.grandTotal || 0), 0)
    : 0;

  const handleDuplicate = async (docId: string) => {
    try {
      const response = await fetch(`${apiUrl}/documents/${docId}/duplicate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'X-Device-ID': deviceId, 'X-Profile-ID': profileId },
      });
      const data = await response.json();
      
      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success('Document duplicated successfully');
        loadDocuments();
        window.dispatchEvent(new CustomEvent('dashboardRefresh'));
      }
    } catch (error) {
      toast.error('Failed to duplicate document');
    }
  };

  const handleConvert = async (docId: string, targetType: string) => {
    try {
      const response = await fetch(`${apiUrl}/documents/${docId}/convert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-Device-ID': deviceId,
          'X-Profile-ID': profileId,
        },
        body: JSON.stringify({ targetType }),
      });
      const data = await response.json();
      
      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success(`Converted to ${targetType} successfully`);
        loadDocuments();
      }
    } catch (error) {
      toast.error('Failed to convert document');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const buildReminderMessage = (doc: any) => {
    const amount = Number(doc?.grandTotal || 0);
    const due = String(doc?.dueDate || '').trim();
    const invoiceNo = String(doc?.invoiceNo || doc?.documentNumber || '').trim();
    const party = String(doc?.customerName || '').trim();
    return `Payment Reminder: ${party ? party + ', ' : ''}${invoiceNo ? invoiceNo + ', ' : ''}Amount ₹${amount.toFixed(2)}${due ? ` due on ${due}` : ''}. Kindly pay at the earliest.`;
  };

  const safeFilename = (name: string) => {
    return String(name || 'document')
      .replace(/[\\/:*?"<>|]+/g, '-')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const openPdfDialog = (docId: string, mode: 'download' | 'preview' = 'download') => {
    setPdfDocumentId(docId);
    setPdfDoc(null);
    setPdfDialogMode(mode);
    setWarmPreviewEnabled(mode === 'preview');
    setPdfDialogOpen(true);
  };

  const loadPdfDoc = async () => {
    if (!pdfDocumentId) return;
    if (!accessToken) {
      toast.error('Not authenticated');
      return;
    }
    if (!profileId) {
      toast.error('Select a business profile first');
      return;
    }

    setPdfLoading(true);
    try {
      const doc = await fetchDocumentById({
        apiUrl,
        accessToken,
        deviceId,
        profileId,
        documentId: pdfDocumentId,
      });

      try {
        const existingLogo = String((doc as any)?.partyLogoDataUrl || '').trim();
        if (existingLogo) {
          // already injected
        } else {
          const customerId = String((doc as any)?.customerId || '').trim();
          const supplierId = String((doc as any)?.supplierId || '').trim();
          const partyId = customerId || supplierId;
          const partyKind = customerId ? 'customers' : supplierId ? 'suppliers' : null;
          if (partyId && partyKind) {
            const partyRes = await fetch(`${apiUrl}/${partyKind}/${partyId}`, {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'X-Device-ID': deviceId,
                'X-Profile-ID': profileId,
              },
            });
            const partyData = await partyRes.json().catch(() => ({}));
            if (partyRes.ok && !partyData?.error) {
              (doc as any).partyLogoDataUrl =
                String(partyData?.logoUrl || '').trim() || String(partyData?.logoDataUrl || '').trim() || null;

              if (!String((doc as any)?.customerMobile || '').trim() && String(partyData?.phone || '').trim()) {
                (doc as any).customerMobile = String(partyData.phone).trim();
              }
              if (!String((doc as any)?.customerEmail || '').trim() && String(partyData?.email || '').trim()) {
                (doc as any).customerEmail = String(partyData.email).trim();
              }
              if (!String((doc as any)?.customerStateCode || '').trim()) {
                const gstin = String(partyData?.gstin || '').trim();
                const code = gstin ? gstin.slice(0, 2) : '';
                if (code) (doc as any).customerStateCode = code;
              }
            }
          } else {
            const partyName = String((doc as any)?.customerName || '').trim();
            if (partyName) {
              const norm = (s: string) => String(s || '').trim().toLowerCase();
              const headers = {
                Authorization: `Bearer ${accessToken}`,
                'X-Device-ID': deviceId,
                'X-Profile-ID': profileId,
              };
              const [customersRes, suppliersRes] = await Promise.all([
                fetch(`${apiUrl}/customers`, { headers }),
                fetch(`${apiUrl}/suppliers`, { headers }),
              ]);
              const [customers, suppliers] = await Promise.all([
                customersRes.json().catch(() => []),
                suppliersRes.json().catch(() => []),
              ]);
              const inCustomers = Array.isArray(customers)
                ? customers.find((c: any) => norm(c?.name) === norm(partyName))
                : null;
              const inSuppliers = Array.isArray(suppliers)
                ? suppliers.find((s: any) => norm(s?.name) === norm(partyName))
                : null;

              const match = inCustomers || inSuppliers;
              if (match && !match?.error) {
                (doc as any).partyLogoDataUrl =
                  String(match?.logoUrl || '').trim() || String(match?.logoDataUrl || '').trim() || null;

                if (!String((doc as any)?.customerMobile || '').trim() && String(match?.phone || '').trim()) {
                  (doc as any).customerMobile = String(match.phone).trim();
                }
                if (!String((doc as any)?.customerEmail || '').trim() && String(match?.email || '').trim()) {
                  (doc as any).customerEmail = String(match.email).trim();
                }
                if (!String((doc as any)?.customerStateCode || '').trim()) {
                  const gstin = String(match?.gstin || '').trim();
                  const code = gstin ? gstin.slice(0, 2) : '';
                  if (code) (doc as any).customerStateCode = code;
                }
              }
            }
          }
        }
      } catch {
        // ignore
      }

      const upiId = String(doc?.upiId || profile?.upiId || '').trim();
      if (upiId) {
        const params = new URLSearchParams();
        params.set('pa', upiId);
        const pn = String(profile?.businessName || '').trim();
        if (pn) params.set('pn', pn);
        const amount = Number(doc?.grandTotal || 0);
        if (Number.isFinite(amount) && amount > 0) params.set('am', amount.toFixed(2));
        params.set('cu', String(doc?.currency || 'INR'));
        const tn = String(doc?.documentNumber || '').trim();
        if (tn) params.set('tn', tn);
        const upiUri = `upi://pay?${params.toString()}`;
        try {
          const qr = await QRCode.toDataURL(upiUri, { margin: 1, width: 240 });
          (doc as any).upiQrText = qr;
        } catch {
          // ignore
        }
      }

      setPdfDoc(doc);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load document');
      setPdfDialogOpen(false);
    } finally {
      setPdfLoading(false);
    }
  };

  useEffect(() => {
    if (pdfDialogOpen) {
      loadPdfDoc();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfDialogOpen, pdfDocumentId]);

  const handleExportPdf = async () => {
    if (!pdfDoc) return;
    if (!pdfRef.current) return;

    setPdfLoading(true);
    try {
      const docNo = safeFilename(pdfDoc.invoiceNo || pdfDoc.documentNumber || 'document');
      const customer = safeFilename(pdfDoc.customerName || 'customer');
      const filename = `${docNo}-${customer}.pdf`;
      await exportElementToPdf({ element: pdfRef.current, filename });
      toast.success('PDF downloaded');
      setPdfDialogOpen(false);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to export PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      quotation: 'bg-green-100 text-green-700',
      invoice: 'bg-blue-100 text-blue-700',
      purchase: 'bg-amber-100 text-amber-800',
      order: 'bg-green-100 text-green-700',
      proforma: 'bg-orange-100 text-orange-800',
      challan: 'bg-muted text-muted-foreground',
      invoice_cancellation: 'bg-red-100 text-red-700',
    };
    return colors[type] || 'bg-muted text-muted-foreground';
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      quotation: 'Quotation',
      order: 'Order',
      proforma: 'Proforma Invoice',
      invoice: 'Invoice',
      challan: 'Delivery Challan',
      purchase: 'Purchase Invoice',
      invoice_cancellation: 'Invoice Cancellation',
    };
    return labels[type] || type;
  };

  const openPaymentDialog = (doc: any) => {
    setPaymentDoc(doc);
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    setPaymentReference('');
    setPaymentMethod('');
    // default amount to remaining if we can infer, else grandTotal
    setPaymentAmount(String(doc?.grandTotal || ''));
    setPaymentDialogOpen(true);
  };

  const savePayment = async () => {
    if (!paymentDoc?.id) return;
    if (!accessToken) {
      toast.error('Not authenticated');
      return;
    }
    if (!profileId) {
      toast.error('Select a business profile first');
      return;
    }

    const amt = Number(paymentAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error('Enter a valid amount');
      return;
    }

    setPaymentLoading(true);
    try {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const date = `${yyyy}-${mm}-${dd}`;

      const res = await fetch(`${apiUrl}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          'X-Device-ID': deviceId,
          'X-Profile-ID': profileId,
        },
        body: JSON.stringify({
          documentId: paymentDoc.id,
          customerId: paymentDoc?.customerId || null,
          supplierId: paymentDoc?.supplierId || null,
          amount: amt,
          date,
          method: paymentMethod || null,
          reference: paymentReference || null,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to save payment');
      }

      const newStatus = data?.document?.paymentStatus || paymentDoc.paymentStatus;

      setDocuments(prev => prev.map(d => (d.id === paymentDoc.id ? { ...d, paymentStatus: newStatus } : d)));
      toast.success('Payment saved');
      setPaymentDialogOpen(false);
      setPaymentDoc(null);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save payment');
    } finally {
      setPaymentLoading(false);
    }
  };

  // Removed top-level loading override.
  // The actual UI wrapper will render instantly, eliminating any DOM-destroying flickers.

  // ── Shared dialogs (used by both mobile and desktop) ──────────────────────
  const SharedDialogs = () => (
    <>
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Delete Document</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              This will permanently delete
              <span className="font-medium text-foreground"> {deleteDoc?.invoiceNo || deleteDoc?.documentNumber || 'this document'}</span>.
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleteLoading}>Cancel</Button>
              <Button type="button" variant="destructive" onClick={confirmDelete} disabled={deleteLoading}>
                {deleteLoading ? 'Deleting…' : 'Delete'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );

  // ── Mobile document card ──────────────────────────────────────────────────
  const MobileDocCard = ({ doc }: { doc: any }) => (
    <div className="bg-card rounded-2xl shadow-sm mx-4 mb-3 overflow-hidden border border-border">
      <div className="p-4">
        {/* Row 1: doc number + badges */}
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span className="text-base font-bold text-foreground">
            {doc.invoiceNo || doc.documentNumber}
          </span>
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${getTypeColor(doc.type)}`}>
            {getTypeLabel(doc.type)}
          </span>
          {doc.status === 'draft' && (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Draft</span>
          )}
          {doc.paymentStatus === 'paid' && (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-green-500">
              <CheckCircle2 className="h-3.5 w-3.5" /> Paid
            </span>
          )}
          {(doc.paymentStatus === 'unpaid' || doc.paymentStatus === 'pending') && (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-orange-500">
              <Clock className="h-3.5 w-3.5" /> Unpaid
            </span>
          )}
          {doc.paymentStatus === 'partial' && (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-blue-400">
              <Clock className="h-3.5 w-3.5" /> Partial
            </span>
          )}
        </div>

        {/* Row 2: details */}
        <div className="text-sm text-muted-foreground space-y-0.5 mb-3">
          <p>Customer: <span className="text-foreground">{doc.customerName || 'N/A'}</span></p>
          {doc.date && <p>Date: <span className="text-foreground">{formatDate(doc.date)}</span></p>}
          <p>Amount: <span className="font-semibold text-foreground">{formatCurrency(doc.grandTotal || 0)}</span></p>
        </div>

        {/* Row 3: actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(`/documents/edit/${doc.id}`)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-muted text-sm font-medium text-foreground active:scale-95 transition-transform"
          >
            <FileEdit className="h-4 w-4" />
            Edit
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center justify-center h-9 w-9 rounded-xl border border-border bg-muted text-muted-foreground active:scale-95 transition-transform"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => openPaymentDialog(doc)}>
                <CheckCircle2 className="h-4 w-4 mr-2" /> Add Payment
              </DropdownMenuItem>
              {(doc.type === 'invoice' || doc.type === 'billing') && doc.paymentStatus !== 'paid' && doc.status !== 'draft' && (
                <DropdownMenuItem onClick={() => openReminderDialog(doc)}>
                  <Repeat className="h-4 w-4 mr-2" /> Send Reminder
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => openPdfDialog(doc.id, 'preview')}>
                <Download className="h-4 w-4 mr-2" /> Preview PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openPdfDialog(doc.id, 'download')}>
                <Download className="h-4 w-4 mr-2" /> Download PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDuplicate(doc.id)}>
                <Copy className="h-4 w-4 mr-2" /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openDeleteDialog(doc)} className="text-destructive focus:text-destructive">
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );

  // ── Mobile layout ─────────────────────────────────────────────────────────
  if (isNative) {
    return (
      <>
        <SharedDialogs />
        {/* PDF dialog */}
        <Dialog open={pdfDialogOpen} onOpenChange={setPdfDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{pdfDialogMode === 'preview' ? 'Preview PDF' : 'Download PDF'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Template</Label>
                <RadioGroup value={pdfTemplateId} onValueChange={(v) => setPdfTemplateId(v as any)} className="flex flex-wrap gap-3 mt-2">
                  {PDF_TEMPLATES.map((t) => (
                    <div key={t.id} className="flex items-center gap-2">
                      <RadioGroupItem value={t.id} id={`tpl-${t.id}`} />
                      <Label htmlFor={`tpl-${t.id}`}>{t.label}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
              {pdfLoading && <div className="flex justify-center py-8"><TraceLoader label="Generating PDF..." /></div>}
              {pdfDoc && (
                <div ref={pdfRef} className="border rounded-lg overflow-hidden">
                  <PdfRenderer doc={pdfDoc} templateId={pdfTemplateId} profile={profile} />
                </div>
              )}
              <div className="flex gap-2 justify-end">
                {pdfDialogMode === 'preview' ? (
                  <Button onClick={handlePreviewPdf} disabled={pdfLoading || !pdfDoc}>Preview in new tab</Button>
                ) : (
                  <Button onClick={handleExportPdf} disabled={pdfLoading || !pdfDoc}>Download PDF</Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
        {/* Payment dialog */}
        <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Add Payment</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Amount</Label><Input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} /></div>
              <div><Label>Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                  <SelectContent>
                    {['Cash','UPI','Bank Transfer','Cheque','Card','Other'].map(m => <SelectItem key={m} value={m.toLowerCase().replace(' ','_')}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Reference</Label><Input value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} placeholder="Optional" /></div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
                <Button onClick={savePayment} disabled={paymentLoading}>{paymentLoading ? 'Saving…' : 'Save Payment'}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        {/* Reminder dialog */}
        <Dialog open={reminderDialogOpen} onOpenChange={setReminderDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Send Reminder</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Mobile</Label><Input value={reminderTo} onChange={(e) => setReminderTo(e.target.value)} /></div>
              <div><Label>Message</Label><Textarea value={reminderMessage} onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setReminderMessage(e.target.value)} rows={4} /></div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={handleCopyReminder}>Copy</Button>
                <Button onClick={handleSendSmsReminder} disabled={reminderSending}>{reminderSending ? 'Sending…' : 'Send SMS'}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Mobile page content ── */}
        <div className="pt-4 pb-4">
          {/* Page header */}
          <div className="px-4 mb-4">
            <h1 className="text-2xl font-bold text-foreground">Documents</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Manage all your business documents</p>
          </div>

          {/* Green CTA */}
          <div className="px-4 mb-3">
            <button
              type="button"
              onClick={() => navigate('/documents/create')}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-green-500 active:bg-green-600 text-white font-semibold text-base shadow-sm active:scale-[0.98] transition-all"
            >
              <Plus className="h-5 w-5" strokeWidth={2.5} />
              Create Document
            </button>
          </div>

          {/* Doc type quick-create pills */}
          <div className="px-4 mb-4 -mx-0 overflow-x-auto">
            <div className="flex gap-2 pb-1 min-w-max">
              {([
                { value: 'invoice',              label: '🧾 Invoice' },
                { value: 'quotation',            label: '📋 Quotation' },
                { value: 'order',                label: '📦 Order' },
                { value: 'proforma',             label: '📄 Proforma' },
                { value: 'challan',              label: '🚚 Challan' },
                { value: 'purchase',             label: '🛒 Purchase' },
                { value: 'invoice_cancellation', label: '↩ Return' },
              ] as { value: string; label: string }[]).map((dt) => (
                <button
                  key={dt.value}
                  type="button"
                  onClick={() => navigate(`/documents/create?type=${dt.value}`)}
                  className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border border-border bg-card text-foreground active:bg-muted active:scale-95 transition-all shadow-sm"
                >
                  {dt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Filters card */}
          <div className="mx-4 mb-4 bg-card rounded-2xl shadow-sm border border-border p-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-muted text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:bg-background transition-colors"
              />
            </div>
            <input
              type="text"
              placeholder="Filter by party name..."
              value={partyFilter}
              onChange={(e) => setPartyFilter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-muted text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:bg-background transition-colors"
            />
            <div className="grid grid-cols-2 gap-2">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="rounded-xl border-border bg-muted text-sm">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="quotation">Quotation</SelectItem>
                  <SelectItem value="order">Order</SelectItem>
                  <SelectItem value="proforma">Proforma</SelectItem>
                  <SelectItem value="invoice">Invoice</SelectItem>
                  <SelectItem value="challan">Challan</SelectItem>
                  <SelectItem value="purchase">Purchase</SelectItem>
                  <SelectItem value="invoice_cancellation">Sale Return</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="rounded-xl border-border bg-muted text-sm">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Party outstanding summary */}
          {partyFilter.trim() && (partySalesOutstanding > 0 || partyPurchasePayable > 0) && (
            <div className="mx-4 mb-4 bg-card rounded-2xl shadow-sm border border-border p-4 flex justify-between items-center">
              <div>
                <p className="text-xs text-muted-foreground">Party</p>
                <p className="font-semibold text-foreground">{partyFilter.trim()}</p>
              </div>
              {partySalesOutstanding > 0 && (
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Outstanding</p>
                  <p className="font-bold text-orange-500">{formatCurrency(partySalesOutstanding)}</p>
                </div>
              )}
            </div>
          )}

          {/* Document list */}
          {loading && documents.length === 0 ? (
            <div className="mx-4 space-y-3">
              {[1,2,3,4].map(i => (
                <div key={i} className="animate-pulse bg-card rounded-2xl shadow-sm border border-border p-4">
                  <div className="h-5 w-32 bg-muted rounded mb-2"></div>
                  <div className="h-4 w-16 bg-muted rounded mb-1"></div>
                  <div className="h-4 w-24 bg-muted rounded"></div>
                </div>
              ))}
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="mx-4 bg-card rounded-2xl shadow-sm border border-border p-8 text-center">
              <FileX className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="font-semibold text-foreground">
                {documents.length === 0 ? 'No documents yet' : 'No matching documents'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {documents.length === 0 ? 'Tap Create Document to get started' : 'Try adjusting your filters'}
              </p>
            </div>
          ) : (
            <>
              {filteredDocs.map((doc) => <MobileDocCard key={doc.id} doc={doc} />)}
              {hasMore && (
                <button
                  type="button"
                  onClick={loadMoreDocuments}
                  disabled={loadingMore}
                  className="w-full py-3 text-sm font-medium text-primary disabled:opacity-50"
                >
                  {loadingMore ? 'Loading...' : `Load more (${documents.length} of ${totalDocs})`}
                </button>
              )}
              {!hasMore && documents.length > 0 && (
                <p className="text-center text-xs text-muted-foreground mt-2 mb-2">
                  {filteredDocs.length} of {documents.length} documents
                </p>
              )}
            </>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Delete Document</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                This will permanently delete
                <span className="font-medium text-foreground"> {deleteDoc?.invoiceNo || deleteDoc?.documentNumber || 'this document'}</span>.
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

        <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Payment</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="rounded-md border p-3">
                <div className="text-sm font-semibold text-foreground">{paymentDoc?.invoiceNo || paymentDoc?.documentNumber || '—'}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {paymentDoc?.type === 'purchase' ? 'Supplier' : 'Customer'}: {paymentDoc?.customerName || 'N/A'}
                </div>
                <div className="text-xs text-muted-foreground">Total: {formatCurrency(paymentDoc?.grandTotal || 0)}</div>
              </div>

              <div>
                <Label>Amount</Label>
                <Input value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="0.00" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Method</Label>
                  <Input value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} placeholder="Cash / UPI / Bank" />
                </div>
                <div>
                  <Label>Reference</Label>
                  <Input value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} placeholder="UTR / Txn ID" />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setPaymentDialogOpen(false)} disabled={paymentLoading}>
                  Cancel
                </Button>
                <Button type="button" onClick={savePayment} disabled={paymentLoading}>
                  {paymentLoading ? 'Saving…' : 'Save Payment'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={reminderDialogOpen} onOpenChange={setReminderDialogOpen}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Payment Reminder</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="rounded-md border p-3">
                <div className="text-sm font-semibold text-foreground">{reminderDoc?.invoiceNo || reminderDoc?.documentNumber}</div>
                <div className="text-xs text-muted-foreground">
                  {reminderDoc?.customerName || ''}
                </div>
              </div>

              <div>
                <Label>Mobile (SMS)</Label>
                <Input
                  value={reminderTo}
                  onChange={(e) => setReminderTo(e.target.value)}
                  placeholder="+91xxxxxxxxxx"
                />
              </div>

              <div>
                <Label>Message</Label>
                <Textarea
                  value={reminderMessage}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setReminderMessage(e.target.value)}
                  rows={5}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button onClick={handleSendSmsReminder} disabled={reminderSending}>
                  {reminderSending ? 'Sending...' : 'Send SMS (Twilio)'}
                </Button>
                <Button type="button" variant="outline" onClick={handleCopyReminder}>
                  Copy Message
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const to = String(reminderTo || '').trim().replace(/^\+/, '');
                    const msg = encodeURIComponent(String(reminderMessage || '').trim());
                    const url = to ? `https://wa.me/${to}?text=${msg}` : `https://wa.me/?text=${msg}`;
                    window.open(url, '_blank');
                  }}
                >
                  WhatsApp
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const email = String(reminderDoc?.customerEmail || '').trim();
    const subject = encodeURIComponent(`Payment reminder - ${String(reminderDoc?.invoiceNo || reminderDoc?.documentNumber || '').trim()}`);
                    const body = encodeURIComponent(String(reminderMessage || '').trim());
                    const mailto = `mailto:${email}?subject=${subject}&body=${body}`;
                    window.location.href = mailto;
                  }}
                >
                  Email
                </Button>
              </div>

              {Array.isArray(reminderDoc?.reminderLogs) && reminderDoc.reminderLogs.length > 0 && (
                <div className="rounded-md border p-3">
                  <div className="text-sm font-semibold text-foreground mb-2">Reminder History</div>
                  <div className="space-y-2">
                    {reminderDoc.reminderLogs
                      .slice()
                      .reverse()
                      .slice(0, 10)
                      .map((log: any, idx: number) => (
                        <div key={idx} className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-xs text-muted-foreground">
                              {log?.sentAt ? formatDate(log.sentAt) : ''}{log?.to ? ` • ${log.to}` : ''}
                            </div>
                            {log?.status === 'failed' && log?.error && (
                              <div className="text-xs text-red-600 break-words">{String(log.error)}</div>
                            )}
                          </div>
                          <div className={`text-xs font-semibold ${String(log?.status || '') === 'failed' ? 'text-red-600' : 'text-green-600'}`}>
                            {String(log?.status || 'sent')}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button type="button" variant="outline" onClick={() => setReminderDialogOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={pdfDialogOpen} onOpenChange={setPdfDialogOpen}>
          <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{pdfDialogMode === 'preview' ? 'Preview PDF' : 'Download PDF'}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium text-foreground mb-2">Choose Template</div>
                <RadioGroup value={pdfTemplateId} onValueChange={(v) => setPdfTemplateId(v as PdfTemplateId)}>
                  {PDF_TEMPLATES.map((t) => (
                    <label key={t.id} className="flex items-center gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted">
                      <RadioGroupItem value={t.id} />
                      <div>
                        <div className="text-sm font-semibold text-foreground">{t.label}</div>
                        <div className="text-xs text-muted-foreground">{t.id}</div>
                      </div>
                    </label>
                  ))}
                </RadioGroup>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setPdfDialogOpen(false)} disabled={pdfLoading}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePreviewPdf}
                  disabled={pdfLoading || !pdfDoc}
                >
                  {pdfLoading && pdfDialogMode === 'preview' ? 'Preparing…' : 'Preview PDF'}
                </Button>
                <Button
                  type="button"
                  onClick={handleExportPdf}
                  disabled={pdfLoading || !pdfDoc}
                >
                  {pdfLoading && pdfDialogMode === 'download' ? 'Preparing…' : 'Download PDF'}
                </Button>
              </div>

              <div
                style={{
                  position: 'fixed',
                  left: -10000,
                  top: 0,
                  width: 900,
                  height: 'auto',
                  overflow: 'visible',
                  pointerEvents: 'none',
                  opacity: 1,
                  background: '#ffffff',
                }}
                inert
              >
                {pdfDoc && (
                  <PdfRenderer
                    ref={pdfRef}
                    templateId={pdfTemplateId}
                    doc={pdfDoc}
                    profile={profile}
                  />
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Documents</h1>
            <p className="text-muted-foreground mt-1">Manage all your business documents</p>
          </div>
          <Button onClick={() => navigate('/documents/create')} className="mt-4 md:mt-0" data-tour-id="cta-documents-create">
            <Plus className="h-4 w-4 mr-2" />
            Create Document
          </Button>
        </div>

        {partyFilter.trim() && (
          <Card className="mb-6">
            <CardContent className="py-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">Party</div>
                  <div className="text-base font-semibold text-foreground truncate">{partyFilter.trim()}</div>
                </div>
                <div className="text-right">
                  {partySalesOutstanding > 0 && (
                    <div>
                      <div className="text-xs text-muted-foreground">Outstanding</div>
                      <div className="text-lg font-bold text-orange-600">{formatCurrency(partySalesOutstanding)}</div>
                    </div>
                  )}
                  {partyPurchasePayable > 0 && (
                    <div className={partySalesOutstanding > 0 ? 'mt-2' : ''}>
                      <div className="text-xs text-muted-foreground">Payable</div>
                      <div className="text-lg font-bold text-orange-600">{formatCurrency(partyPurchasePayable)}</div>
                    </div>
                  )}
                  {partySalesOutstanding === 0 && partyPurchasePayable === 0 && (
                    <div>
                      <div className="text-xs text-muted-foreground">Balance</div>
                      <div className="text-lg font-bold text-foreground">{formatCurrency(0)}</div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search documents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Input
                placeholder="Filter by party name..."
                value={partyFilter}
                onChange={(e) => setPartyFilter(e.target.value)}
              />

              <DateRangePicker range={dateRange} onRangeChange={setDateRange} align="start" />

              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="Document Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="quotation">Quotation</SelectItem>
                  <SelectItem value="order">Order</SelectItem>
                  <SelectItem value="proforma">Proforma Invoice</SelectItem>
                  <SelectItem value="invoice">Invoice</SelectItem>
                  <SelectItem value="challan">Delivery Challan</SelectItem>
                  <SelectItem value="purchase">Purchase Invoice</SelectItem>
                  <SelectItem value="invoice_cancellation">Invoice Cancellation</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Documents List */}
        {loading && documents.length === 0 ? (
          <div className="space-y-4">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="animate-pulse bg-card rounded-xl border border-border p-6 flex justify-between">
                <div className="flex gap-4">
                  <div className="h-6 w-32 bg-muted rounded"></div>
                  <div className="h-6 w-20 bg-muted rounded"></div>
                </div>
                <div className="h-6 w-24 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        ) : filteredDocs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileX className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {documents.length === 0 ? 'No documents yet' : 'No matching documents'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {documents.length === 0 
                  ? 'Create your first document to get started'
                  : 'Try adjusting your filters'}
              </p>
              {documents.length === 0 && (
                <Button onClick={() => navigate('/documents/create')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Document
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredDocs.map((doc) => (
              <Card key={doc.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-foreground">
                          {doc.invoiceNo ? doc.invoiceNo : doc.documentNumber}
                        </h3>
                        <Badge className={getTypeColor(doc.type)}>
                          {getTypeLabel(doc.type)}
                        </Badge>
                        {doc.status === 'draft' && (
                          <Badge variant="outline">Draft</Badge>
                        )}
                        {doc.paymentStatus === 'paid' && (
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="text-xs font-medium">Paid</span>
                          </div>
                        )}
                        {doc.paymentStatus === 'partial' && (
                          <div className="flex items-center gap-1 text-blue-600">
                            <Clock className="h-4 w-4" />
                            <span className="text-xs font-medium">Partial</span>
                          </div>
                        )}
                        {doc.paymentStatus === 'unpaid' && (
                          <div className="flex items-center gap-1 text-orange-600">
                            <Clock className="h-4 w-4" />
                            <span className="text-xs font-medium">Unpaid</span>
                          </div>
                        )}
                      </div>
                      <div className="grid md:grid-cols-3 gap-2 text-sm text-muted-foreground">
                        <div className="space-y-1">
                          <p className="text-muted-foreground">
                            <span className="font-medium">Customer:</span> {doc.customerName || 'N/A'}
                          </p>
                          {(doc.type === 'invoice' || doc.type === 'billing') && doc.lastReminderSentAt && (
                            <p className="text-xs text-muted-foreground">
                              Last reminder: {formatDate(doc.lastReminderSentAt)}
                            </p>
                          )}
                          {doc.date && (
                            <p className="text-muted-foreground">
                              <span className="font-medium">Date:</span> {formatDate(doc.date)}
                            </p>
                          )}
                          <div>
                            <span className="font-medium">Amount:</span> {formatCurrency(doc.grandTotal || 0)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:ml-4 sm:justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/documents/edit/${doc.id}`)}
                      >
                        <FileEdit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="icon" data-tour-id="doc-action-menu">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem data-tour-id="doc-action-add-payment" onClick={() => openPaymentDialog(doc)}>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Add Payment
                          </DropdownMenuItem>
                          {(doc.type === 'invoice' || doc.type === 'billing') && doc.paymentStatus !== 'paid' && doc.status !== 'draft' && (
                            <DropdownMenuItem onClick={() => openReminderDialog(doc)}>
                              <Repeat className="h-4 w-4 mr-2" />
                              Send Reminder
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleConvert(doc.id, 'invoice')}>
                            <Repeat className="h-4 w-4 mr-2" />
                            Convert to Invoice
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleConvert(doc.id, 'order')}>
                            <Repeat className="h-4 w-4 mr-2" />
                            Convert to Order
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleConvert(doc.id, 'challan')}>
                            <Repeat className="h-4 w-4 mr-2" />
                            Convert to Challan
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openPdfDialog(doc.id, 'preview')}>
                            <Download className="h-4 w-4 mr-2" />
                            Preview PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem data-tour-id="doc-action-download-pdf" onClick={() => openPdfDialog(doc.id, 'download')}>
                            <Download className="h-4 w-4 mr-2" />
                            Download PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openDeleteDialog(doc)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Load more */}
        {hasMore && (
          <div className="mt-4 flex justify-center">
            <Button variant="outline" onClick={loadMoreDocuments} disabled={loadingMore}>
              {loadingMore ? 'Loading...' : `Load more (${documents.length} of ${totalDocs})`}
            </Button>
          </div>
        )}

        {/* Summary */}
        {filteredDocs.length > 0 && (
          <Card className="mt-6">
            <CardContent className="py-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Showing {filteredDocs.length} of {documents.length} documents
                </span>
                <span className="font-semibold text-foreground">
                  Total: {formatCurrency(filteredDocs.reduce((sum, doc) => sum + (doc.grandTotal || 0), 0))}
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
