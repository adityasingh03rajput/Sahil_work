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
  DropdownMenuSeparator,
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
  Calendar,
  ChevronRight,
  X
} from 'lucide-react';
import { cn } from '../components/ui/utils';
import QRCode from 'qrcode';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
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
import { printElement } from '../pdf/nativePrint';
import { useRef } from 'react';
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
  const { resolvedTheme } = useTheme();
  const isNative = useIsNative();
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, profileId } = useCurrentProfile();

  const readQueryInt = (key: string, fallback: number) => {
    try {
      const params = new URLSearchParams(location.search || '');
      const raw = params.get(key);
      const n = Number(raw);
      return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
    } catch {
      return fallback;
    }
  };

  const readQueryStr = (key: string) => {
    try {
      const params = new URLSearchParams(location.search || '');
      const raw = params.get(key);
      return raw ? String(raw) : '';
    } catch {
      return '';
    }
  };

  const [page, setPage] = useState<number>(() => readQueryInt('page', 1));

  const updateQuery = useCallback((patch: { page?: number; id?: string | null; mode?: 'download' | 'preview' | null }) => {
    const params = new URLSearchParams(location.search || '');

    if (typeof patch.page === 'number' && patch.page > 0) params.set('page', String(patch.page));

    if (typeof patch.id !== 'undefined') {
      const id = String(patch.id || '').trim();
      if (id) params.set('id', id);
      else params.delete('id');
    }

    if (typeof patch.mode !== 'undefined') {
      const mode = patch.mode;
      if (mode) params.set('mode', mode);
      else params.delete('mode');
    }

    const nextSearch = params.toString();
    navigate({ pathname: location.pathname, search: nextSearch ? `?${nextSearch}` : '' }, { replace: true });
  }, [location.pathname, location.search, navigate]);

  const apiUrl = API_URL;

  // Global Dialog State
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

  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [pdfTemplateId, setPdfTemplateId] = useState<PdfTemplateId>('classic');
  const [pdfDocumentId, setPdfDocumentId] = useState<string | null>(null);
  const [pdfDialogMode, setPdfDialogMode] = useState<'download' | 'preview'>('download');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfExporting, setPdfExporting] = useState(false);
  const [pdfDoc, setPdfDoc] = useState<DocumentDto | null>(null);
  const pdfRef = useRef<HTMLDivElement | null>(null);

  // Reset all state when profile switches
  useEffect(() => {
    setDocuments([]);
    setFilteredDocs([]);
    setSearchTerm('');
    setPartyFilter('');
    setFilterType('all');
    setFilterStatus('all');
    setDeleteDialogOpen(false);
    setDeleteDoc(null);
    setLoading(true);
  }, [profileId]);

  const loadDocuments = useCallback(async ({ force = false, skip = 0, page: targetPage }: { force?: boolean, skip?: number, page?: number } = {}) => {
    if (!accessToken || !deviceId || !profileId) return;
    setLoading(true);

    try {
      const effectivePage = typeof targetPage === 'number' && targetPage > 0 ? targetPage : 1;
      const effectiveLimit = skip === 0 ? PAGE_SIZE * effectivePage : PAGE_SIZE;
      const p = `profileId=${profileId}`;
      const t = filterType !== 'all' ? `&type=${filterType}` : '';
      const s = filterStatus !== 'all' ? `&status=${filterStatus}` : '';
      const d = (dateRange.from || dateRange.to)
        ? `&from=${encodeURIComponent(dateRange.from)}&to=${encodeURIComponent(dateRange.to)}`
        : '';

      const response = await fetch(
        `${apiUrl}/documents?limit=${effectiveLimit}&skip=${skip}&${p}${t}${s}${d}`,
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
    filterDocuments();
  }, [searchTerm, partyFilter, documents]);

  useEffect(() => {
    if (!accessToken || !deviceId || !profileId) { setLoading(false); return; }
    const initialPage = readQueryInt('page', 1);
    setPage(initialPage);
    loadDocuments({ skip: 0, page: initialPage });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId, accessToken, deviceId]);

  usePageRefresh({
    onRefresh: () => loadDocuments({ skip: 0, force: true, page }),
    staleTtlMs: 30_000,
    enabled: !!profileId && !!accessToken,
  });

  const loadMoreDocuments = async () => {
    if (!accessToken || !deviceId || !profileId || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const t = filterType !== 'all' ? `&type=${filterType}` : '';
      const s = filterStatus !== 'all' ? `&status=${filterStatus}` : '';
      const d = (dateRange.from || dateRange.to)
        ? `&from=${encodeURIComponent(dateRange.from)}&to=${encodeURIComponent(dateRange.to)}`
        : '';
      const response = await fetch(
        `${apiUrl}/documents?limit=${PAGE_SIZE}&skip=${documents.length}&profileId=${profileId}${t}${s}${d}`,
        { headers: { 'Authorization': `Bearer ${accessToken}`, 'X-Device-ID': deviceId, 'X-Profile-ID': profileId } }
      );
      const json = await response.json();
      const newDocs: any[] = Array.isArray(json) ? json : (json.data ?? []);
      setDocuments(prev => {
        const merged = [...prev, ...newDocs];
        filterDocuments(merged);
        setHasMore(json.hasMore ?? false);
        setTotalDocs(json.total ?? merged.length);
        const nextPage = Math.max(1, Math.ceil(merged.length / PAGE_SIZE));
        setPage(nextPage);
        updateQuery({ page: nextPage });
        return merged;
      });
    } catch {
      toast.error('Failed to load more documents');
    } finally {
      setLoadingMore(false);
    }
  };

  const norm = (v: any) => String(v || '').trim().toLowerCase();
  const filterDocuments = useCallback((docs?: any[]) => {
    const source = Array.isArray(docs) ? docs : documents;
    let filtered = [...source];

    if (filterType !== 'all') filtered = filtered.filter(doc => doc.type === filterType);
    if (filterStatus !== 'all') {
      filtered = filtered.filter(doc => {
        if (filterStatus === 'paid') return doc.paymentStatus === 'paid';
        if (filterStatus === 'unpaid') return doc.paymentStatus === 'unpaid' || doc.paymentStatus === 'pending' || doc.paymentStatus === 'partial';
        if (filterStatus === 'draft') return doc.status === 'draft';
        return true;
      });
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(doc =>
        doc.documentNumber?.toLowerCase().includes(q) ||
        doc.invoiceNo?.toLowerCase().includes(q) ||
        (doc.customerName || doc.partyName || doc.supplierName || '').toLowerCase().includes(q)
      );
    }
    if (partyFilter.trim()) {
      const q = norm(partyFilter);
      filtered = filtered.filter(doc => norm(doc.customerName || doc.partyName || doc.supplierName).includes(q));
    }
    setFilteredDocs(filtered);
  }, [documents, filterType, filterStatus, searchTerm, partyFilter]);

  const partySalesOutstanding = partyFilter.trim()
    ? filteredDocs.filter(d => norm(d.customerName || d.partyName || d.supplierName).includes(norm(partyFilter)) && (d.type === 'invoice' || d.type === 'billing') && d.paymentStatus !== 'paid')
      .reduce((sum, d) => sum + Number(d.grandTotal || 0), 0)
    : 0;

  const partyPurchasePayable = partyFilter.trim()
    ? filteredDocs.filter(d => norm(d.customerName || d.partyName || d.supplierName).includes(norm(partyFilter)) && d.type === 'purchase' && d.paymentStatus !== 'paid')
      .reduce((sum, d) => sum + Number(d.grandTotal || 0), 0)
    : 0;

  const handleDuplicate = useCallback(async (docId: string) => {
    try {
      const response = await fetch(`${apiUrl}/documents/${docId}/duplicate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'X-Device-ID': deviceId, 'X-Profile-ID': profileId },
      });
      const data = await response.json();
      if (data.error) toast.error(data.error);
      else { toast.success('Duplicated'); loadDocuments({ skip: 0, page }); }
    } catch { toast.error('Failed to duplicate'); }
  }, [accessToken, deviceId, profileId, apiUrl, page, loadDocuments]);

  const handleConvert = useCallback(async (docId: string, targetType: string) => {
    try {
      const response = await fetch(`${apiUrl}/documents/${docId}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}`, 'X-Device-ID': deviceId, 'X-Profile-ID': profileId },
        body: JSON.stringify({ targetType }),
      });
      const data = await response.json();
      if (data.error) toast.error(data.error);
      else { toast.success(`Converted to ${targetType}`); loadDocuments({ skip: 0, page }); }
    } catch { toast.error('Failed to convert'); }
  }, [accessToken, deviceId, profileId, apiUrl, page, loadDocuments]);

  const openDeleteDialog = (doc: any) => { setDeleteDoc(doc); setDeleteDialogOpen(true); };
  const confirmDelete = async () => {
    if (!deleteDoc?.id) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`${apiUrl}/documents/${deleteDoc.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}`, 'X-Device-ID': deviceId, 'X-Profile-ID': profileId },
      });
      if (!res.ok) throw new Error('Delete failed');
      setDocuments(prev => prev.filter(d => d.id !== deleteDoc.id));
      toast.success('Deleted');
      setDeleteDialogOpen(false);
    } catch { toast.error('Delete failed'); }
    finally { setDeleteLoading(false); }
  };

  const openPaymentDialog = (doc: any) => {
    setPaymentDoc(doc);
    setPaymentAmount(String(doc?.grandTotal || ''));
    setPaymentMethod('');
    setPaymentReference('');
    setPaymentDialogOpen(true);
  };
  const savePayment = useCallback(async () => {
    if (!paymentDoc?.id) return;
    const amt = Number(paymentAmount);
    if (!amt || amt <= 0) return toast.error('Invalid amount');
    setPaymentLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch(`${apiUrl}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}`, 'X-Device-ID': deviceId, 'X-Profile-ID': profileId },
        body: JSON.stringify({ documentId: paymentDoc.id, customerId: paymentDoc?.customerId || null, amount: amt, date: today, method: paymentMethod, reference: paymentReference }),
      });
      if (!res.ok) throw new Error('Save failed');
      toast.success('Payment saved');
      setPaymentDialogOpen(false);
      loadDocuments({ skip: 0, page });
    } catch { toast.error('Save failed'); }
    finally { setPaymentLoading(false); }
  }, [paymentDoc, paymentAmount, paymentMethod, paymentReference, accessToken, deviceId, profileId, apiUrl, page, loadDocuments]);

  const openReminderDialog = (doc: any) => {
    setReminderDoc(doc);
    setReminderTo(String(doc?.customerMobile || '').trim());
    setReminderMessage(`Payment Reminder: ${doc.customerName ? doc.customerName + ', ' : ''}${doc.invoiceNo || doc.documentNumber}. Amount ₹${Number(doc.grandTotal).toFixed(2)}. Kindly pay.`);
    setReminderDialogOpen(true);
  };
  const handleSendSmsReminder = async () => {
    if (!reminderDoc) return;
    setReminderSending(true);
    try {
      const res = await fetch(`${apiUrl}/documents/${reminderDoc.id}/remind`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}`, 'X-Device-ID': deviceId, 'X-Profile-ID': profileId },
        body: JSON.stringify({ channel: 'sms', to: reminderTo, message: reminderMessage }),
      });
      if (!res.ok) throw new Error('Failed');
      toast.success('Reminder sent');
      setReminderDialogOpen(false);
    } catch { toast.error('Failed to send'); }
    finally { setReminderSending(false); }
  };

  const openPdfDialog = (docId: string, mode: 'download' | 'preview' = 'download') => {
    setPdfDocumentId(docId);
    setPdfDoc(null);
    setPdfDialogMode(mode);
    setPdfDialogOpen(true);
    updateQuery({ id: docId, mode, page });
  };

  useEffect(() => {
    const urlDocId = readQueryStr('id');
    if (!urlDocId) return;
    if (pdfDialogOpen && String(pdfDocumentId || '') === urlDocId) return;
    const urlMode = readQueryStr('mode');
    const nextMode: 'download' | 'preview' = urlMode === 'preview' ? 'preview' : 'download';
    setPdfDocumentId(urlDocId);
    setPdfDoc(null);
    setPdfDialogMode(nextMode);
    setPdfDialogOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const loadPdfDoc = useCallback(async () => {
    if (!pdfDocumentId || !profileId) return;
    setPdfLoading(true);
    try {
      const doc = await fetchDocumentById({ apiUrl, accessToken: accessToken || '', deviceId, profileId, documentId: pdfDocumentId });
      const upiId = String(doc?.upiId || profile?.upiId || '').trim();
      if (upiId) {
        const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(profile?.businessName || '')}&am=${Number(doc?.grandTotal).toFixed(2)}&cu=INR&tn=${encodeURIComponent(String(doc?.invoiceNo || doc?.documentNumber || ''))}`;
        try { doc.upiQrText = await QRCode.toDataURL(upiUri, { margin: 1, width: 240 }); } catch { }
      }
      setPdfDoc(doc);
    } catch { toast.error('Failed to load PDF data'); }
    finally { setPdfLoading(false); }
  }, [pdfDocumentId, profileId, apiUrl, accessToken, deviceId, profile]);

  useEffect(() => { if (pdfDialogOpen) loadPdfDoc(); }, [pdfDialogOpen, loadPdfDoc]);

  const handlePreviewPdf = async () => {
    const el = document.getElementById('pdf-capture-node');
    if (!el) return;
    setPdfExporting(true);
    // Use setTimeout to allow UI thread to repaint the "Exporting" state before heavy CPU task
    setTimeout(async () => {
      try {
        const url = await exportElementToPdfBlobUrl({ element: el, filename: 'preview.pdf' });
        window.open(url, '_blank');
      } catch (err) {
        console.error('Preview error:', err);
        toast.error('Preview failed');
      }
      finally { setPdfExporting(false); }
    }, 100);
  };

  const handleExportPdf = async () => {
    const el = document.getElementById('pdf-capture-node');
    if (!pdfDoc || !el) return;
    
    setPdfExporting(true);
    // Use setTimeout to allow UI thread to repaint the "Downloading" state instantly
    setTimeout(async () => {
      try {
        // High-fidelity capture: remove transforms before processing
        const originalTransform = el.style.transform;
        el.style.transform = 'none';
        
        const success = await exportElementToPdf({ 
          element: el, 
          filename: `${pdfDoc.invoiceNo || pdfDoc.documentNumber || 'document'}.pdf` 
        });
        
        // Restore transform
        el.style.transform = originalTransform;
        
        if (success) {
          toast.success('Downloaded Successfully');
          setPdfDialogOpen(false);
        } else {
          toast.info('Download was cancelled');
        }
      } catch (err) {
        console.error('Download error:', err);
        // Restore transform on error
        el.style.transform = el.style.transform || '';
        
        // Provide more specific error messages
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        if (errorMessage.includes('All download methods failed')) {
          toast.error('Download failed. Please check your device permissions and try again.');
        } else {
          toast.error('Download failed. Please try "Print / Save PDF" instead.');
        }
      }
      finally { setPdfExporting(false); }
    }, 150);
  };

  const handleNativePrint = async () => {
    const el = document.getElementById('pdf-capture-node');
    if (!pdfDoc || !el) return;
    try {
      await printElement(el, pdfDoc.invoiceNo || 'Document');
      setPdfDialogOpen(false);
    } catch (err) {
      console.error('Print error:', err);
      toast.error('Print failed');
    }
  };

  const formatCurrency = (amt: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amt);
  const formatDate = (ds: string) => new Date(ds).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = { quotation: 'bg-green-100 text-green-700', invoice: 'bg-blue-100 text-blue-700', purchase: 'bg-amber-100 text-amber-800', order: 'bg-green-100 text-green-700', proforma: 'bg-orange-100 text-orange-800', challan: 'bg-muted text-muted-foreground', invoice_cancellation: 'bg-red-100 text-red-700' };
    return colors[type] || 'bg-muted text-muted-foreground';
  };
  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = { quotation: 'Quotation', order: 'Order', proforma: 'Proforma Invoice', invoice: 'Invoice', challan: 'Delivery Challan', purchase: 'Purchase Invoice', invoice_cancellation: 'Invoice Cancellation' };
    return labels[type] || type;
  };

  return (
    <>
      <DeleteDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} doc={deleteDoc} loading={deleteLoading} onConfirm={confirmDelete} />
      <PaymentDialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen} doc={paymentDoc} amount={paymentAmount} setAmount={setPaymentAmount} method={paymentMethod} setMethod={setPaymentMethod} reference={paymentReference} setReference={setPaymentReference} loading={paymentLoading} onSave={savePayment} formatCurrency={formatCurrency} />
      <ReminderDialog open={reminderDialogOpen} onOpenChange={setReminderDialogOpen} doc={reminderDoc} to={reminderTo} setTo={setReminderTo} message={reminderMessage} setMessage={setReminderMessage} sending={reminderSending} onSend={handleSendSmsReminder} />
      <PdfPreviewDialog
        open={pdfDialogOpen}
        onOpenChange={(open: boolean) => {
          setPdfDialogOpen(open);
          if (!open) updateQuery({ id: null, mode: null, page });
        }}
        mode={pdfDialogMode}
        pdfDoc={pdfDoc}
        pdfLoading={pdfLoading}
        pdfExporting={pdfExporting}
        templateId={pdfTemplateId}
        setTemplateId={setPdfTemplateId}
        profile={profile}
        onPreview={handlePreviewPdf}
        onExport={handleExportPdf}
        onPrint={handleNativePrint}
        pdfRef={pdfRef}
      />

      {isNative ? (
        <div style={{ paddingTop: 16, paddingBottom: 16, fontFamily: 'system-ui,-apple-system,sans-serif' }}>
          <div style={{ padding: '0 1.25rem', marginBottom: '1rem' }}>
            <h1 style={{ margin: 0, fontSize: '1.85rem', fontWeight: 800, color: resolvedTheme === 'light' ? '#1e293b' : '#f1f5f9' }}>Documents</h1>
            <p style={{ margin: '0.25rem 0 0', fontSize: '1rem', color: resolvedTheme === 'light' ? 'rgba(30,41,59,0.6)' : 'rgba(255,255,255,0.45)' }}>Manage all your business documents</p>
          </div>

          <div style={{ padding: '0 1.25rem', marginBottom: '0.9rem' }}>
            <button onClick={() => navigate('/documents/create')}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
                padding: '1.08rem 0', borderRadius: '1.38rem', border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff',
                fontWeight: 700, fontSize: '1.15rem', boxShadow: '0 4px 16px rgba(16,185,129,0.35)' }}>
              <Plus style={{ width: '1.5rem', height: '1.5rem' }} strokeWidth={2.5} />
              Create Document
            </button>
          </div>

          <div style={{ margin: '0 1.25rem 1.25rem', background: resolvedTheme === 'light' ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)', borderRadius: '1.38rem',
            border: resolvedTheme === 'light' ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.08)', padding: '1.08rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ position: 'relative' }}>
              <Search style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)',
                width: '1.25rem', height: '1.25rem', color: resolvedTheme === 'light' ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.35)' }} />
              <input type="text" placeholder="Search documents..." value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', paddingLeft: '2.9rem', paddingRight: '0.9rem', paddingTop: '0.75rem', paddingBottom: '0.75rem',
                  borderRadius: '0.9rem', border: resolvedTheme === 'light' ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.1)',
                  background: resolvedTheme === 'light' ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.06)', color: resolvedTheme === 'light' ? '#1e293b' : '#f1f5f9', fontSize: '1.08rem',
                  outline: 'none', boxSizing: 'border-box', fontFamily: 'system-ui,sans-serif' }} />
            </div>
            <DateRangePicker range={dateRange} onRangeChange={setDateRange} align="start" className="w-full" persistenceKey="documents" />
          </div>

          <div style={{ paddingBottom: 80 }}>
            {loading ? (
              <div style={{ margin: '0 16px', padding: 40, textAlign: 'center' }}>
                <svg style={{ margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke={resolvedTheme === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.15)'} strokeWidth="3" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke={resolvedTheme === 'light' ? '#4f46e5' : '#818cf8'} strokeWidth="3" strokeLinecap="round" />
                </svg>
                <p style={{ margin: 0, fontWeight: 600, color: resolvedTheme === 'light' ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.5)', fontSize: 14 }}>Loading documents...</p>
              </div>
            ) : filteredDocs.length === 0 ? (
              <div style={{ margin: '0 16px', background: resolvedTheme === 'light' ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.04)', borderRadius: 18,
                border: resolvedTheme === 'light' ? '1px dashed rgba(0,0,0,0.08)' : '1px dashed rgba(255,255,255,0.12)', padding: 32, textAlign: 'center' }}>
                <FileX style={{ width: 48, height: 48, color: resolvedTheme === 'light' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.25)', margin: '0 auto 8px' }} />
                <p style={{ margin: 0, fontWeight: 600, color: resolvedTheme === 'light' ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.5)', fontSize: 14 }}>No documents found</p>
              </div>
            ) : filteredDocs.map((doc) => (
              <MobileDocCard key={doc.id} doc={doc} navigate={navigate} openPaymentDialog={openPaymentDialog} openReminderDialog={openReminderDialog} openPdfDialog={openPdfDialog} openDeleteDialog={openDeleteDialog} getTypeLabel={getTypeLabel} formatDate={formatDate} formatCurrency={formatCurrency} resolvedTheme={resolvedTheme} />
            ))}
            {hasMore && (
              <button onClick={loadMoreDocuments} disabled={loadingMore}
                style={{ width: '100%', padding: '16px 0', background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 14, fontWeight: 600, color: '#818cf8' }}>
                {loadingMore ? 'Loading...' : 'Load More'}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div><h1 className="text-3xl font-bold">Documents</h1><p className="text-muted-foreground">Manage business records</p></div>
            <Button onClick={() => navigate('/documents/create')}><Plus className="h-4 w-4 mr-2" />Create Document</Button>
          </div>

          <Card className="mb-6"><CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" /></div>
              <DateRangePicker range={dateRange} onRangeChange={setDateRange} align="start" persistenceKey="documents" />
              <Select value={filterType} onValueChange={setFilterType}><SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger><SelectContent><SelectItem value="all">All Types</SelectItem><SelectItem value="invoice">Invoice</SelectItem><SelectItem value="purchase">Purchase</SelectItem></SelectContent></Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="paid">Paid</SelectItem><SelectItem value="unpaid">Unpaid</SelectItem></SelectContent></Select>
            </div>
          </CardContent></Card>

          <div className="space-y-3">
            {filteredDocs.map((doc) => (
              <Card key={doc.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1"><h3 className="font-bold truncate">{doc.invoiceNo || doc.documentNumber}</h3><Badge className={getTypeColor(doc.type)}>{getTypeLabel(doc.type)}</Badge></div>
                    <div className="text-sm text-muted-foreground">{doc.customerName} • {formatDate(doc.date)} • <span className="text-foreground font-semibold">{formatCurrency(doc.grandTotal)}</span></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="outline" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/documents/edit/${doc.id}`)}>
                          <FileEdit className="h-4 w-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openPaymentDialog(doc)}><CheckCircle2 className="h-4 w-4 mr-2" />Payment</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openReminderDialog(doc)}><Repeat className="h-4 w-4 mr-2" />Reminder</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => openPdfDialog(doc.id, 'preview')}><Download className="h-4 w-4 mr-2" />Preview</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => openPdfDialog(doc.id, 'download')}><Download className="h-4 w-4 mr-2" />Download</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => openDeleteDialog(doc)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// ── Shared Sub-components ────────────────────────────────────────────────

const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  invoice:              { bg: 'rgba(59,130,246,0.15)',  color: '#60a5fa' },
  quotation:            { bg: 'rgba(16,185,129,0.15)',  color: '#34d399' },
  purchase:             { bg: 'rgba(245,158,11,0.15)',  color: '#fbbf24' },
  order:                { bg: 'rgba(16,185,129,0.15)',  color: '#34d399' },
  proforma:             { bg: 'rgba(249,115,22,0.15)',  color: '#fb923c' },
  challan:              { bg: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' },
  invoice_cancellation: { bg: 'rgba(239,68,68,0.15)',   color: '#f87171' },
};

const MobileDocCard = ({ doc, navigate, openPaymentDialog, openReminderDialog, openPdfDialog, openDeleteDialog, getTypeLabel, formatDate, formatCurrency, resolvedTheme }: any) => {
  const typeStyle = TYPE_COLORS[doc.type] || TYPE_COLORS.challan;
  const isPaid = doc.paymentStatus === 'paid';
  return (
    <div style={{ margin: '0 1.25rem 0.75rem', background: resolvedTheme === 'light' ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.04)', borderRadius: '1.15rem',
      border: resolvedTheme === 'light' ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.08)', padding: '0.9rem 1.08rem', fontFamily: 'system-ui,sans-serif',
      position: 'relative', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top Row: Doc No, Badge, and Quick Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
          <span style={{ fontWeight: 800, fontSize: '1.08rem', color: resolvedTheme === 'light' ? '#1e293b' : '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {doc.invoiceNo || doc.documentNumber}
          </span>
          <span style={{ padding: '0.15rem 0.6rem', borderRadius: '1.5rem', fontSize: '0.75rem', fontWeight: 700,
            background: typeStyle.bg, color: typeStyle.color, whiteSpace: 'nowrap' }}>
            {getTypeLabel(doc.type)}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: isPaid ? '#34d399' : '#fb923c' }}>
            {isPaid ? '✓' : '•'}
          </span>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" aria-label="More actions"
                style={{ width: '2.45rem', height: '2.45rem', borderRadius: '0.75rem', border: 'none', cursor: 'pointer',
                  background: resolvedTheme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)', color: resolvedTheme === 'light' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MoreVertical style={{ width: '1.25rem', height: '1.25rem' }} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 !z-[200]">
              <DropdownMenuItem onClick={() => navigate(`/documents/edit/${doc.id}`)}>
                <FileEdit className="w-4 h-4 mr-2" /> Edit Document
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openPdfDialog(doc.id, 'download')}>
                <Download className="w-4 h-4 mr-2" /> Download / Share PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openPaymentDialog(doc)}>
                <CheckCircle2 className="w-4 h-4 mr-2" /> Record Payment
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openReminderDialog(doc)}>
                <Repeat className="w-4 h-4 mr-2" /> Send Reminder
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => openDeleteDialog(doc)} className="text-red-500 hover:text-red-600">
                <Trash2 className="w-4 h-4 mr-2" /> Delete Document
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Details Row */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ margin: 0, fontSize: '0.92rem', fontWeight: 600, color: resolvedTheme === 'light' ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {doc.customerName}
          </p>
          <p style={{ margin: '0.15rem 0 0', fontSize: '0.85rem', color: resolvedTheme === 'light' ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)' }}>
            {formatDate(doc.date)}
          </p>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <span style={{ display: 'block', fontSize: '1.08rem', fontWeight: 800, color: resolvedTheme === 'light' ? '#1e293b' : '#f1f5f9' }}>
            {formatCurrency(doc.grandTotal)}
          </span>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: isPaid ? '#34d399' : '#fb923c', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {isPaid ? 'Paid' : 'Unpaid'}
          </span>
        </div>
      </div>
    </div>
  );
};

const DeleteDialog = ({ open, onOpenChange, doc, loading, onConfirm }: any) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent><DialogHeader><DialogTitle>Delete Document</DialogTitle></DialogHeader>
      <div className="p-4 space-y-4">
        <p className="text-sm">Permanently delete <b>{doc?.invoiceNo || doc?.documentNumber}</b>?</p>
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button variant="destructive" onClick={onConfirm} disabled={loading}>{loading ? 'Deleting...' : 'Delete'}</Button></div>
      </div>
    </DialogContent>
  </Dialog>
);

const PaymentDialog = ({ open, onOpenChange, doc, amount, setAmount, method, setMethod, reference, setReference, loading, onSave, formatCurrency }: any) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent><DialogHeader><DialogTitle>Add Payment</DialogTitle></DialogHeader>
      <div className="p-4 space-y-4">
        <div className="bg-muted p-3 rounded-lg text-xs"><p><b>{doc?.invoiceNo}</b></p><p>{doc?.customerName}</p><p className="font-bold text-primary">{formatCurrency(doc?.grandTotal || 0)}</p></div>
        <div><Label>Amount</Label><Input value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Method</Label><Input value={method} onChange={(e) => setMethod(e.target.value)} placeholder="Cash/UPI" /></div>
          <div><Label>Ref</Label><Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="UTR/ID" /></div>
        </div>
        <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={onSave} disabled={loading}>Save</Button></div>
      </div>
    </DialogContent>
  </Dialog>
);

const ReminderDialog = ({ open, onOpenChange, doc, to, setTo, message, setMessage, sending, onSend }: any) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent><DialogHeader><DialogTitle>Send Reminder</DialogTitle></DialogHeader>
      <div className="p-4 space-y-4">
        <div><Label>Mobile</Label><Input value={to} onChange={(e) => setTo(e.target.value)} /></div>
        <div><Label>Message</Label><Textarea value={message} onChange={(e: any) => setMessage(e.target.value)} rows={4} /></div>
        <div className="grid grid-cols-2 gap-2"><Button onClick={onSend} disabled={sending}>Send SMS</Button>
          <Button variant="outline" onClick={() => window.open(`https://wa.me/${to.replace(/\+/g, '')}?text=${encodeURIComponent(message)}`, '_blank')}>WhatsApp</Button>
        </div>
        <div className="flex justify-end pt-2"><Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button></div>
      </div>
    </DialogContent>
  </Dialog>
);

const PdfPreviewDialog = ({ open, onOpenChange, mode, pdfDoc, pdfLoading, pdfExporting, templateId, setTemplateId, profile, onPreview, onExport, onPrint, pdfRef }: any) => {
  const [exportProgress, setExportProgress] = useState(0);
  const isNative = useIsNative();
  const [zoom, setZoom] = useState(isNative ? 0.45 : 0.75);

  const handleZoom = (delta: number) => {
    setZoom(prev => Math.min(2.0, Math.max(0.2, prev + delta)));
  };

  useEffect(() => {
    let interval: any;
    if (pdfExporting) {
      setExportProgress(0);
      interval = setInterval(() => {
        setExportProgress(prev => {
          if (prev >= 95) return prev;
          return prev + Math.random() * 15;
        });
      }, 200);
    } else {
      setExportProgress(0);
    }
    return () => clearInterval(interval);
  }, [pdfExporting]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {isNative ? (
        // Mobile-specific dialog with proper centering
        <DialogContent 
          className="fixed inset-2 max-w-none flex flex-col p-0 gap-0 overflow-hidden bg-card text-card-foreground shadow-2xl border-border z-[100] mb-[80px]"
          style={{
            top: '8px',
            left: '8px',
            right: '8px',
            bottom: '88px',
            width: 'calc(100vw - 16px)',
            height: 'calc(100vh - 96px)',
            transform: 'none',
            margin: '0'
          } as any}
          onPointerDownOutside={(e) => pdfExporting && e.preventDefault()}
          onEscapeKeyDown={(e) => pdfExporting && e.preventDefault()}
        >
          {/* Mobile dialog content */}
          <div className="flex-1 flex flex-col p-4 space-y-3 overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-foreground tracking-tight uppercase leading-none">
                  {mode === 'preview' ? 'Visual Intelligence' : 'Export Matrix'}
                </h2>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-[0.2em] mt-1 opacity-50">Precision Rendering Engine</p>
              </div>
              {!pdfExporting && (
                <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-muted-foreground hover:text-foreground transition-all">
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Zoom / Size Controls */}
              <div className="flex items-center gap-2 bg-muted/60 p-1 px-2 rounded-xl border border-border/40 shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground/70" onClick={() => handleZoom(-0.1)}>
                  <span className="text-xl font-bold">−</span>
                </Button>
                <div className="px-1 min-w-[34px] text-center">
                  <span className="text-[10px] font-black uppercase text-foreground/40 leading-none block">Size</span>
                  <span className="text-[13px] font-bold text-foreground leading-none">{Math.round(zoom * 100)}%</span>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground/70" onClick={() => handleZoom(0.1)}>
                  <span className="text-xl font-bold">+</span>
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {PDF_TEMPLATES.map((t) => (
                <button
                  type="button"
                  key={t.id}
                  disabled={pdfExporting}
                  onClick={() => setTemplateId(t.id as any)}
                  className={cn(
                    "px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all duration-300 min-h-[36px] touch-manipulation",
                    templateId === t.id
                      ? "bg-primary border-primary text-primary-foreground shadow-sm"
                      : "bg-input-background border-border text-muted-foreground hover:bg-muted hover:text-foreground",
                    pdfExporting && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
            </div>

            {/* DOCUMENT PORTAL — Mobile optimized */}
            <div className="flex-1 flex flex-col bg-muted/40 rounded-2xl overflow-auto border border-border relative p-2 shadow-inner">
              <div className="flex flex-col items-center min-h-full">
                {pdfLoading ? (
                  <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                    <Download className="h-8 w-8 text-indigo-500 animate-bounce" />
                    <TraceLoader label="Synthesizing Viewstream..." />
                  </div>
                ) : pdfDoc && (
                  <div
                    id="pdf-capture-node"
                    className="transform-gpu origin-top transition-all duration-300 relative mb-8"
                    style={{
                      width: '210mm',
                      minHeight: '297mm',
                      transform: `scale(${zoom})`,
                    } as any}
                  >
                    <div ref={pdfRef} className="bg-white">
                      <PdfRenderer doc={pdfDoc} templateId={templateId} profile={profile} />
                    </div>
                  </div>
                )}
              </div>
              
              {pdfExporting && (
                <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm transition-all duration-500 p-4">
                  <div className="w-full max-w-sm bg-card border border-border p-6 rounded-3xl shadow-2xl flex flex-col items-center space-y-4">
                    <div className="relative">
                      <div className="h-16 w-16 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
                      <Download className="absolute inset-0 m-auto h-6 w-6 text-primary animate-pulse" />
                    </div>
                    
                    <div className="w-full space-y-2">
                      <div className="flex justify-between items-end">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-foreground">Encoding PDF</p>
                        <span className="text-[9px] font-black text-primary">{Math.round(exportProgress)}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden border border-border/50">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-300 ease-out" 
                          style={{ width: `${exportProgress}%` }}
                        />
                      </div>
                    </div>
                    <p className="text-[8px] text-muted-foreground font-medium uppercase tracking-widest animate-pulse text-center">Processing...</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end pt-3 pb-2 border-t border-border">
              {!pdfExporting && (
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all px-3 h-10">
                  Close
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={onPrint}
                disabled={pdfLoading || pdfExporting || !pdfDoc}
                className="border-primary text-primary hover:bg-primary/10 font-black text-[9px] tracking-widest uppercase px-4 h-10 rounded-xl"
              >
                Print
              </Button>
              <Button
                type="button"
                onClick={mode === 'preview' ? onPreview : onExport}
                disabled={pdfLoading || pdfExporting || !pdfDoc}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-black text-[9px] tracking-widest uppercase px-6 h-10 rounded-xl shadow-lg transition-all active:scale-95 overflow-hidden relative touch-manipulation"
              >
                <span className={cn("transition-transform duration-500 block flex items-center gap-2", pdfExporting ? "-translate-y-full opacity-0" : "translate-y-0 opacity-100")}>
                  {mode === 'preview' ? 'Preview' : 'Download'}
                  <ChevronRight className="w-3 h-3" />
                </span>
                {pdfExporting && (
                  <span className="absolute inset-0 flex items-center justify-center animate-in fade-in zoom-in duration-500">
                    <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  </span>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      ) : (
        // Desktop dialog with original styling
        <DialogContent 
          className="fixed inset-4 sm:inset-6 md:inset-8 lg:inset-x-12 lg:inset-y-6 max-w-none flex flex-col p-0 gap-0 overflow-hidden bg-card text-card-foreground shadow-2xl border-border !z-[1000] !translate-x-0 !translate-y-0 !top-auto !left-auto"
          onPointerDownOutside={(e) => pdfExporting && e.preventDefault()}
          onEscapeKeyDown={(e) => pdfExporting && e.preventDefault()}
        >
        <div className="flex-1 flex flex-col p-4 sm:p-6 space-y-3 overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight uppercase leading-none">
                {mode === 'preview' ? 'Visual Intelligence' : 'Export Matrix'}
              </h2>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-[0.2em] mt-1 opacity-50">Precision Rendering Engine</p>
            </div>
            {!pdfExporting && (
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-muted-foreground hover:text-foreground transition-all">
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Zoom / Size Controls */}
              <div className="flex items-center gap-2 bg-muted/60 p-1 px-2 rounded-xl border border-border/40 shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground/70" onClick={() => handleZoom(-0.1)}>
                  <span className="text-xl font-bold">−</span>
                </Button>
                <div className="px-1 min-w-[34px] text-center">
                  <span className="text-[10px] font-black uppercase text-foreground/40 leading-none block">Size</span>
                  <span className="text-[13px] font-bold text-foreground leading-none">{Math.round(zoom * 100)}%</span>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground/70" onClick={() => handleZoom(0.1)}>
                  <span className="text-xl font-bold">+</span>
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {PDF_TEMPLATES.map((t) => (
                <button
                  type="button"
                  key={t.id}
                  disabled={pdfExporting}
                  onClick={() => setTemplateId(t.id as any)}
                  className={cn(
                    "px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all duration-300 min-h-[40px] touch-manipulation",
                    templateId === t.id
                      ? "bg-primary border-primary text-primary-foreground shadow-sm"
                      : "bg-input-background border-border text-muted-foreground hover:bg-muted hover:text-foreground",
                    pdfExporting && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* DOCUMENT PORTAL — Now with proper scrolling and fitting */}
          <div className="flex-1 flex flex-col bg-muted/40 rounded-2xl overflow-auto border border-border relative p-2 sm:p-6 shadow-inner scrollbar-thin scrollbar-thumb-primary/20 hover:scrollbar-thumb-primary/40">
            <div className="flex flex-col items-center min-h-full">
              {pdfLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                  <Download className="h-8 w-8 text-indigo-500 animate-bounce" />
                  <TraceLoader label="Synthesizing Viewstream..." />
                </div>
              ) : pdfDoc && (
                <div
                  id="pdf-capture-node"
                  className="transform-gpu origin-top transition-all duration-300 relative mb-8"
                  style={{
                    width: '210mm',
                    minHeight: '297mm',
                    transform: `scale(${zoom})`,
                  } as any}
                >
                  <div ref={pdfRef} className="bg-white">
                    <PdfRenderer doc={pdfDoc} templateId={templateId} profile={profile} />
                  </div>
                </div>
              )}
            </div>
            
            {pdfExporting && (
              <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm transition-all duration-500 p-8">
                <div className="w-full max-w-md bg-card border border-border p-8 rounded-3xl shadow-2xl flex flex-col items-center space-y-6">
                  <div className="relative">
                    <div className="h-20 w-20 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
                    <Download className="absolute inset-0 m-auto h-8 w-8 text-primary animate-pulse" />
                  </div>
                  
                  <div className="w-full space-y-2">
                    <div className="flex justify-between items-end">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">Encoding High-Res PDF</p>
                      <span className="text-[10px] font-black text-primary">{Math.round(exportProgress)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden border border-border/50">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-300 ease-out" 
                        style={{ width: `${exportProgress}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-widest animate-pulse">Synchronizing metadata and visual layers...</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-4 justify-end pt-3 pb-6 px-4 sm:px-6 border-t border-border">
            {!pdfExporting && (
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all">
                Close Preview
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={onPrint}
              disabled={pdfLoading || pdfExporting || !pdfDoc}
              className="border-primary text-primary hover:bg-primary/10 font-black text-[10px] tracking-widest uppercase px-6 h-12 rounded-xl"
            >
              Print / Save PDF
            </Button>
            <Button
              type="button"
              onClick={mode === 'preview' ? onPreview : onExport}
              disabled={pdfLoading || pdfExporting || !pdfDoc}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-black text-[10px] tracking-widest uppercase px-8 h-12 rounded-xl shadow-lg transition-all active:scale-95 overflow-hidden relative touch-manipulation"
            >
              <span className={cn("transition-transform duration-500 block flex items-center gap-2", pdfExporting ? "-translate-y-full opacity-0" : "translate-y-0 opacity-100")}>
                {mode === 'preview' ? 'Launch Full Vision' : 'Finalize & Ship'}
                <ChevronRight className="w-3 h-3" />
              </span>
              {pdfExporting && (
                <span className="absolute inset-0 flex items-center justify-center animate-in fade-in zoom-in duration-500">
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </span>
              )}
            </Button>
          </div>
        </div>
        </DialogContent>
      )}
    </Dialog>
  );
        <div className="flex-1 flex flex-col p-4 sm:p-6 space-y-3 overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight uppercase leading-none">
                {mode === 'preview' ? 'Visual Intelligence' : 'Export Matrix'}
              </h2>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-[0.2em] mt-1 opacity-50">Precision Rendering Engine</p>
            </div>
            {!pdfExporting && (
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-muted-foreground hover:text-foreground transition-all">
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Zoom / Size Controls */}
              <div className="flex items-center gap-2 bg-muted/60 p-1 px-2 rounded-xl border border-border/40 shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground/70" onClick={() => handleZoom(-0.1)}>
                  <span className="text-xl font-bold">−</span>
                </Button>
                <div className="px-1 min-w-[34px] text-center">
                  <span className="text-[10px] font-black uppercase text-foreground/40 leading-none block">Size</span>
                  <span className="text-[13px] font-bold text-foreground leading-none">{Math.round(zoom * 100)}%</span>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground/70" onClick={() => handleZoom(0.1)}>
                  <span className="text-xl font-bold">+</span>
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {PDF_TEMPLATES.map((t) => (
                <button
                  type="button"
                  key={t.id}
                  disabled={pdfExporting}
                  onClick={() => setTemplateId(t.id as any)}
                  className={cn(
                    "px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all duration-300 min-h-[40px] touch-manipulation",
                    templateId === t.id
                      ? "bg-primary border-primary text-primary-foreground shadow-sm"
                      : "bg-input-background border-border text-muted-foreground hover:bg-muted hover:text-foreground",
                    pdfExporting && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* DOCUMENT PORTAL — Now with proper scrolling and fitting */}
          <div className="flex-1 flex flex-col bg-muted/40 rounded-2xl overflow-auto border border-border relative p-2 sm:p-6 shadow-inner scrollbar-thin scrollbar-thumb-primary/20 hover:scrollbar-thumb-primary/40">
            <div className="flex flex-col items-center min-h-full">
              {pdfLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                  <Download className="h-8 w-8 text-indigo-500 animate-bounce" />
                  <TraceLoader label="Synthesizing Viewstream..." />
                </div>
              ) : pdfDoc && (
                <div
                  id="pdf-capture-node"
                  className="transform-gpu origin-top transition-all duration-300 relative mb-8"
                  style={{
                    width: '210mm',
                    minHeight: '297mm',
                    transform: `scale(${zoom})`,
                  } as any}
                >
                  <div ref={pdfRef} className="bg-white">
                    <PdfRenderer doc={pdfDoc} templateId={templateId} profile={profile} />
                  </div>
                </div>
              )}
            </div>
            
            {pdfExporting && (
              <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm transition-all duration-500 p-8">
                <div className="w-full max-w-md bg-card border border-border p-8 rounded-3xl shadow-2xl flex flex-col items-center space-y-6">
                  <div className="relative">
                    <div className="h-20 w-20 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
                    <Download className="absolute inset-0 m-auto h-8 w-8 text-primary animate-pulse" />
                  </div>
                  
                  <div className="w-full space-y-2">
                    <div className="flex justify-between items-end">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">Encoding High-Res PDF</p>
                      <span className="text-[10px] font-black text-primary">{Math.round(exportProgress)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden border border-border/50">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-300 ease-out" 
                        style={{ width: `${exportProgress}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-widest animate-pulse">Synchronizing metadata and visual layers...</p>
                </div>
              </div>
            )}
          </div>
        </div>
        </DialogContent>
      )}
    </Dialog>
  );
};

const PdfPreviewDialog = ({ open, onOpenChange, mode, pdfDoc, pdfLoading, pdfExporting, templateId, setTemplateId, profile, onPreview, onExport, onPrint, pdfRef }: any) => {