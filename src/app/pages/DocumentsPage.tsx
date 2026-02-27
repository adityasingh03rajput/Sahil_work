import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { AppLayout } from '../components/AppLayout';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
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
  FileX
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../config/api';
import { toast } from 'sonner';
import { TraceLoader } from '../components/TraceLoader';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { fetchDocumentById, PDF_TEMPLATES, PdfRenderer, exportElementToPdf, type PdfTemplateId, type DocumentDto } from '../pdf';
import { useRef } from 'react';
import QRCode from 'qrcode';

export function DocumentsPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [filteredDocs, setFilteredDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const { accessToken, deviceId } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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

  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [pdfTemplateId, setPdfTemplateId] = useState<PdfTemplateId>('classic');
  const [pdfDocumentId, setPdfDocumentId] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfDoc, setPdfDoc] = useState<DocumentDto | null>(null);
  const pdfRef = useRef<HTMLDivElement | null>(null);

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentDoc, setPaymentDoc] = useState<any | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);

  useEffect(() => {
    if (!accessToken || !deviceId || !profileId) return;
    loadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, deviceId, profileId, location.key]);

  useEffect(() => {
    filterDocuments();
  }, [documents, searchTerm, filterType, filterStatus]);

  const loadDocuments = async () => {
    if (!accessToken || !deviceId || !profileId) return;
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/documents`, {
        cache: 'no-store',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'X-Device-ID': deviceId, 'X-Profile-ID': profileId },
      });
      const data = await response.json();
      if (data.error) {
        toast.error(data.error);
      } else {
        setDocuments(data);
        filterDocuments(data);
      }
    } catch (error) {
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const filterDocuments = (docs?: any[]) => {
    const source = Array.isArray(docs) ? docs : documents;
    let filtered = [...source];

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
        doc.customerName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredDocs(filtered);
  };

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

  const safeFilename = (name: string) => {
    return String(name || 'document')
      .replace(/[\\/:*?"<>|]+/g, '-')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const openPdfDialog = (docId: string) => {
    setPdfDocumentId(docId);
    setPdfDoc(null);
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

      const upiId = String(doc?.upiId || currentProfile?.upiId || '').trim();
      if (upiId) {
        const params = new URLSearchParams();
        params.set('pa', upiId);
        const pn = String(currentProfile?.businessName || '').trim();
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
      const docNo = safeFilename(pdfDoc.documentNumber || 'document');
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

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <TraceLoader label="Loading documents..." />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Payment</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="rounded-md border p-3">
                <div className="text-sm font-semibold text-foreground">{paymentDoc?.documentNumber || '—'}</div>
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

        <Dialog open={pdfDialogOpen} onOpenChange={setPdfDialogOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Download PDF</DialogTitle>
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
                <Button type="button" onClick={handleExportPdf} disabled={pdfLoading || !pdfDoc}>
                  {pdfLoading ? 'Preparing…' : 'Download PDF'}
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
                aria-hidden
              >
                {pdfDoc && (
                  <PdfRenderer
                    ref={pdfRef}
                    templateId={pdfTemplateId}
                    doc={pdfDoc}
                    profile={{
                      id: currentProfile?.id,
                      businessName: currentProfile?.businessName,
                      ownerName: currentProfile?.ownerName,
                      gstin: currentProfile?.gstin,
                      pan: currentProfile?.pan,
                      email: currentProfile?.email,
                      phone: currentProfile?.phone,
                      billingAddress: currentProfile?.billingAddress,
                      shippingAddress: currentProfile?.shippingAddress,
                      bankName: currentProfile?.bankName,
                      accountNumber: currentProfile?.accountNumber,
                      ifscCode: currentProfile?.ifscCode,
                      upiId: currentProfile?.upiId,
                    }}
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

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search documents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

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
        {filteredDocs.length === 0 ? (
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
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-foreground">
                          {doc.documentNumber}
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
                        <div>
                          <span className="font-medium">{doc.type === 'purchase' ? 'Supplier' : 'Customer'}:</span> {doc.customerName || 'N/A'}
                        </div>
                        <div>
                          <span className="font-medium">Date:</span> {formatDate(doc.date)}
                        </div>
                        <div>
                          <span className="font-medium">Amount:</span> {formatCurrency(doc.grandTotal || 0)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
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
                          <DropdownMenuItem onClick={() => handleDuplicate(doc.id)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
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
                          <DropdownMenuItem data-tour-id="doc-action-download-pdf" onClick={() => openPdfDialog(doc.id)}>
                            <Download className="h-4 w-4 mr-2" />
                            Download PDF
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
    </AppLayout>
  );
}
