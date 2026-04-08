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
  Calendar,
  X
} from 'lucide-react';
import { cn } from '../components/ui/utils';
import QRCode from 'qrcode';
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
    filterDocuments();
  }, [searchTerm, partyFilter, documents]);

  useEffect(() => {
    loadDocuments({ skip: 0 });
  }, [loadDocuments]);

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

  const norm = (v: any) => String(v || '').trim().toLowerCase();
  const filterDocuments = (docs?: any[]) => {
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
  };

  const partySalesOutstanding = partyFilter.trim()
    ? documents.filter(d => norm(d.customerName || d.partyName || d.supplierName).includes(norm(partyFilter)) && (d.type === 'invoice' || d.type === 'billing') && d.paymentStatus !== 'paid')
      .reduce((sum, d) => sum + Number(d.grandTotal || 0), 0)
    : 0;

  const partyPurchasePayable = partyFilter.trim()
    ? documents.filter(d => norm(d.customerName || d.partyName || d.supplierName).includes(norm(partyFilter)) && d.type === 'purchase' && d.paymentStatus !== 'paid')
      .reduce((sum, d) => sum + Number(d.grandTotal || 0), 0)
    : 0;

  const handleDuplicate = async (docId: string) => {
    try {
      const response = await fetch(`${apiUrl}/documents/${docId}/duplicate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'X-Device-ID': deviceId, 'X-Profile-ID': profileId },
      });
      const data = await response.json();
      if (data.error) toast.error(data.error);
      else { toast.success('Duplicated'); loadDocuments(); }
    } catch { toast.error('Failed to duplicate'); }
  };

  const handleConvert = async (docId: string, targetType: string) => {
    try {
      const response = await fetch(`${apiUrl}/documents/${docId}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}`, 'X-Device-ID': deviceId, 'X-Profile-ID': profileId },
        body: JSON.stringify({ targetType }),
      });
      const data = await response.json();
      if (data.error) toast.error(data.error);
      else { toast.success(`Converted to ${targetType}`); loadDocuments(); }
    } catch { toast.error('Failed to convert'); }
  };

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
  const savePayment = async () => {
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
      loadDocuments();
    } catch { toast.error('Save failed'); }
    finally { setPaymentLoading(false); }
  };

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
  };

  const loadPdfDoc = async () => {
    if (!pdfDocumentId || !profileId) return;
    setPdfLoading(true);
    try {
      const doc = await fetchDocumentById({ apiUrl, accessToken, deviceId, profileId, documentId: pdfDocumentId });
      const upiId = String(doc?.upiId || profile?.upiId || '').trim();
      if (upiId) {
        const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(profile?.businessName || '')}&am=${Number(doc?.grandTotal).toFixed(2)}&cu=INR&tn=${encodeURIComponent(String(doc?.invoiceNo || doc?.documentNumber || ''))}`;
        try { doc.upiQrText = await QRCode.toDataURL(upiUri, { margin: 1, width: 240 }); } catch { }
      }
      setPdfDoc(doc);
    } catch { toast.error('Failed to load PDF data'); }
    finally { setPdfLoading(false); }
  };

  useEffect(() => { if (pdfDialogOpen) loadPdfDoc(); }, [pdfDialogOpen, pdfDocumentId]);

  const handlePreviewPdf = async () => {
    const el = document.getElementById('pdf-capture-node');
    if (!el) return;
    setPdfExporting(true);
    try {
      const url = await exportElementToPdfBlobUrl({ element: el, filename: 'preview.pdf' });
      window.open(url, '_blank');
    } catch (err) {
      console.error('Preview error:', err);
      toast.error('Preview failed');
    }
    finally { setPdfExporting(false); }
  };

  const handleExportPdf = async () => {
    const el = document.getElementById('pdf-capture-node');
    if (!pdfDoc || !el) return;
    setPdfExporting(true);
    try {
      await exportElementToPdf({ element: el, filename: `${pdfDoc.invoiceNo || 'document'}.pdf` });
      toast.success('Downloaded');
      setPdfDialogOpen(false);
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Download failed');
    }
    finally { setPdfExporting(false); }
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
      <PdfPreviewDialog open={pdfDialogOpen} onOpenChange={setPdfDialogOpen} mode={pdfDialogMode} pdfDoc={pdfDoc} pdfLoading={pdfLoading} pdfExporting={pdfExporting} templateId={pdfTemplateId} setTemplateId={setPdfTemplateId} profile={profile} onPreview={handlePreviewPdf} onExport={handleExportPdf} pdfRef={pdfRef} />

      {isNative ? (
        <div style={{ paddingTop: 16, paddingBottom: 16, fontFamily: 'system-ui,-apple-system,sans-serif' }}>
          <div style={{ padding: '0 16px', marginBottom: 16 }}>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#f1f5f9' }}>Documents</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>Manage all your business documents</p>
          </div>

          <div style={{ padding: '0 16px', marginBottom: 12 }}>
            <button onClick={() => navigate('/documents/create')}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '14px 0', borderRadius: 18, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff',
                fontWeight: 700, fontSize: 15, boxShadow: '0 4px 16px rgba(16,185,129,0.35)' }}>
              <Plus style={{ width: 20, height: 20 }} strokeWidth={2.5} />
              Create Document
            </button>
          </div>

          <div style={{ margin: '0 16px 16px', background: 'rgba(255,255,255,0.05)', borderRadius: 18,
            border: '1px solid rgba(255,255,255,0.08)', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ position: 'relative' }}>
              <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                width: 16, height: 16, color: 'rgba(255,255,255,0.35)' }} />
              <input type="text" placeholder="Search documents..." value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', paddingLeft: 38, paddingRight: 12, paddingTop: 10, paddingBottom: 10,
                  borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.06)', color: '#f1f5f9', fontSize: 14,
                  outline: 'none', boxSizing: 'border-box', fontFamily: 'system-ui,sans-serif' }} />
            </div>
            <DateRangePicker range={dateRange} onRangeChange={setDateRange} align="start" className="w-full" persistenceKey="documents" />
          </div>

          <div style={{ paddingBottom: 80 }}>
            {filteredDocs.length === 0 ? (
              <div style={{ margin: '0 16px', background: 'rgba(255,255,255,0.04)', borderRadius: 18,
                border: '1px dashed rgba(255,255,255,0.12)', padding: 32, textAlign: 'center' }}>
                <FileX style={{ width: 48, height: 48, color: 'rgba(255,255,255,0.25)', margin: '0 auto 8px' }} />
                <p style={{ margin: 0, fontWeight: 600, color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>No documents found</p>
              </div>
            ) : filteredDocs.map((doc) => (
              <MobileDocCard key={doc.id} doc={doc} navigate={navigate} openPaymentDialog={openPaymentDialog} openReminderDialog={openReminderDialog} openPdfDialog={openPdfDialog} openDeleteDialog={openDeleteDialog} getTypeLabel={getTypeLabel} formatDate={formatDate} formatCurrency={formatCurrency} />
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
                    <Button variant="outline" size="sm" onClick={() => navigate(`/documents/edit/${doc.id}`)}><FileEdit className="h-4 w-4 mr-1" />Edit</Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="outline" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openPaymentDialog(doc)}><CheckCircle2 className="h-4 w-4 mr-2" />Payment</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openReminderDialog(doc)}><Repeat className="h-4 w-4 mr-2" />Reminder</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => openPdfDialog(doc.id, 'preview')}><Download className="h-4 w-4 mr-2" />Preview</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => openPdfDialog(doc.id, 'download')}><Download className="h-4 w-4 mr-2" />Download</DropdownMenuItem>
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

const MobileDocCard = ({ doc, navigate, openPaymentDialog, openReminderDialog, openPdfDialog, openDeleteDialog, getTypeLabel, formatDate, formatCurrency }: any) => {
  const typeStyle = TYPE_COLORS[doc.type] || TYPE_COLORS.challan;
  const isPaid = doc.paymentStatus === 'paid';
  return (
    <div style={{ margin: '0 16px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: 18,
      border: '1px solid rgba(255,255,255,0.08)', padding: 16, fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        <span style={{ fontWeight: 800, fontSize: 15, color: '#f1f5f9' }}>{doc.invoiceNo || doc.documentNumber}</span>
        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
          background: typeStyle.bg, color: typeStyle.color }}>{getTypeLabel(doc.type)}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: isPaid ? '#34d399' : '#fb923c',
          marginLeft: 'auto' }}>{isPaid ? '✓ Paid' : 'Unpaid'}</span>
      </div>
      <div style={{ marginBottom: 12 }}>
        <p style={{ margin: '0 0 2px', fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{doc.customerName}</p>
        <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
          {formatDate(doc.date)} •{' '}
          <span style={{ color: '#f1f5f9', fontWeight: 700 }}>{formatCurrency(doc.grandTotal)}</span>
        </p>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => navigate(`/documents/edit/${doc.id}`)}
          style={{ flex: 1, padding: '9px 0', borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.06)', color: '#f1f5f9', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <FileEdit style={{ width: 14, height: 14 }} /> Edit
        </button>
        <button onClick={() => openPaymentDialog(doc)}
          style={{ flex: 1, padding: '9px 0', borderRadius: 12, border: '1px solid rgba(99,102,241,0.3)',
            background: 'rgba(99,102,241,0.12)', color: '#a5b4fc', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          Payment
        </button>
        <button onClick={() => openPdfDialog(doc.id, 'download')}
          style={{ width: 40, height: 40, borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Download style={{ width: 16, height: 16 }} />
        </button>
        <button onClick={() => openDeleteDialog(doc)}
          style={{ width: 40, height: 40, borderRadius: 12, border: '1px solid rgba(239,68,68,0.2)',
            background: 'rgba(239,68,68,0.08)', color: '#f87171', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Trash2 style={{ width: 16, height: 16 }} />
        </button>
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

const PdfPreviewDialog = ({ open, onOpenChange, mode, pdfDoc, pdfLoading, pdfExporting, templateId, setTemplateId, profile, onPreview, onExport, pdfRef }: any) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-6xl h-[92vh] flex flex-col p-0 gap-0 overflow-hidden bg-card text-card-foreground shadow-2xl border-border">
      <div className="flex-1 flex flex-col p-4 sm:p-6 space-y-3 overflow-hidden">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight uppercase leading-none">{mode === 'preview' ? 'Document Preview' : 'Export Matrix'}</h2>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-[0.2em] mt-1 opacity-50">Precision Visual Engine</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-muted-foreground hover:text-foreground transition-all">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="bg-muted p-2 rounded-xl border border-border">
          <div className="flex flex-wrap gap-1.5">
            {PDF_TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTemplateId(t.id as any)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all duration-300",
                  templateId === t.id
                    ? "bg-primary border-primary text-primary-foreground shadow-sm"
                    : "bg-input-background border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center bg-muted/40 rounded-2xl overflow-hidden border border-border relative p-1 sm:p-3 shadow-inner">
          {pdfLoading ? (
            <div className="flex flex-col items-center justify-center space-y-4">
              <Download className="h-8 w-8 text-indigo-500 animate-bounce" />
              <TraceLoader label="Synthesizing..." />
            </div>
          ) : pdfDoc && (
            <div id="pdf-capture-node" className="transform-gpu origin-top transition-all duration-700 bg-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] relative"
              style={{
                width: '210mm',
                minHeight: '297mm',
                transform: 'scale(var(--pdf-preview-scale, 0.4))',
                transformOrigin: 'top center',
                marginBottom: 'calc(-297mm * (1 - var(--pdf-preview-scale, 0.4)))'
              }}>
              <div ref={pdfRef} className="bg-white"><PdfRenderer doc={pdfDoc} templateId={templateId} profile={profile} /></div>
            </div>
          )}
          
          {pdfExporting && (
            <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm transition-all duration-500">
               <div className="bg-card border border-border px-6 py-4 rounded-2xl shadow-2xl flex flex-col items-center space-y-3">
                  <div className="h-10 w-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">Capturing High Resolution Vision</p>
               </div>
            </div>
          )}
        </div>

        <style dangerouslySetInnerHTML={{
          __html: `
          :root { --pdf-preview-scale: 0.72; }
          @media (max-width: 1400px) { :root { --pdf-preview-scale: 0.65; } }
          @media (max-width: 1200px) { :root { --pdf-preview-scale: 0.55; } }
          @media (max-width: 1000px) { :root { --pdf-preview-scale: 0.48; } }
          @media (max-width: 850px) { :root { --pdf-preview-scale: 0.42; } }
          @media (max-width: 600px) { :root { --pdf-preview-scale: 0.35; } }
          @media (max-width: 480px) { :root { --pdf-preview-scale: 0.30; } }
          @media (max-height: 900px) { :root { --pdf-preview-scale: 0.60; } }
          @media (max-height: 800px) { :root { --pdf-preview-scale: 0.52; } }
          @media (max-height: 700px) { :root { --pdf-preview-scale: 0.42; } }
          @media (max-height: 600px) { :root { --pdf-preview-scale: 0.32; } }
        `}} />

        <div className="flex gap-4 justify-end pt-3 border-t border-border">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all">Abort Matrix</Button>
          <Button onClick={mode === 'preview' ? onPreview : onExport} disabled={pdfLoading || pdfExporting || !pdfDoc} className="bg-primary hover:bg-primary/90 text-primary-foreground font-black text-[10px] tracking-widest uppercase px-8 h-10 rounded-xl shadow-md transition-all active:scale-95 overflow-hidden relative">
            <span className={cn("transition-transform duration-500 block", pdfExporting ? "-translate-y-full opacity-0" : "translate-y-0 opacity-100")}>
              {mode === 'preview' ? 'Launch Full Vision' : 'Finalize & Ship'}
            </span>
            {pdfExporting && (
              <span className="absolute inset-0 flex items-center justify-center animate-in fade-in zoom-in duration-500">
                <Download className="h-4 w-4 animate-bounce" />
              </span>
            )}
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
);
