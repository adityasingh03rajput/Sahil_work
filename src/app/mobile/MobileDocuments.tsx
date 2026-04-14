/**
 * MobileDocuments — APK-only documents list page.
 * 100% inline styles, zero Tailwind/CSS-var dependencies.
 * Theme-aware with IndexedDB PDF caching.
 */
import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Search, FileText, Download, Trash2, FileEdit, CheckCircle2, Clock, MoreVertical, X, Maximize } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCurrentProfile } from '../hooks/useCurrentProfile';
import { useTheme } from '../contexts/ThemeContext';
import { useDisplay } from '../contexts/DisplayContext';
import { API_URL } from '../config/api';
import { toast } from 'sonner';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { fetchDocumentById, PdfRenderer, exportElementToPdf, type PdfTemplateId, type DocumentDto, PDF_TEMPLATES } from '../pdf';
import { MOBILE_TOKENS, formatCurrency, formatDate } from './MobileDesignSystem';

// Theme color system supporting all themes
const getThemeColors = (resolvedTheme: 'light' | 'dark', themeClass: string | null) => {
  const isDark = resolvedTheme === 'dark';
  
  const baseColors = {
    light: {
      bg: '#fafaf9',
      surface: '#ffffff',
      text: '#1f2937',
      textSecondary: 'rgba(0,0,0,0.5)',
      border: 'rgba(0,0,0,0.1)',
      inputBg: 'rgba(0,0,0,0.05)',
      overlay: 'rgba(0,0,0,0.6)',
    },
    dark: {
      bg: '#0f172a',
      surface: '#1e293b',
      text: '#f1f5f9',
      textSecondary: 'rgba(255,255,255,0.4)',
      border: 'rgba(255,255,255,0.08)',
      inputBg: 'rgba(255,255,255,0.06)',
      overlay: 'rgba(0,0,0,0.6)',
    },
  };

  const base = isDark ? baseColors.dark : baseColors.light;

  const themeAccents: Record<string, string> = {
    'theme-warm': '#f97316',
    'theme-ocean': '#0ea5e9',
    'theme-emerald': '#10b981',
    'theme-rosewood': '#e11d48',
  };

  const accent = themeClass && themeAccents[themeClass] ? themeAccents[themeClass] : '#6366f1';

  return { ...base, accent };
};

const S = {
  page: { padding: `${MOBILE_TOKENS.spacing.lg}px ${MOBILE_TOKENS.spacing.lg}px 100px`, fontFamily: 'system-ui,-apple-system,sans-serif' } as React.CSSProperties,
  heading: { margin: '0 0 4px', fontSize: 24, fontWeight: 800, color: MOBILE_TOKENS.colors.text } as React.CSSProperties,
  sub: { margin: 0, fontSize: 13, color: MOBILE_TOKENS.colors.textSecondary } as React.CSSProperties,
  input: { width: '100%', padding: `${MOBILE_TOKENS.spacing.md * 0.6875}px ${MOBILE_TOKENS.spacing.md}px ${MOBILE_TOKENS.spacing.md * 0.6875}px ${MOBILE_TOKENS.spacing.lg}px`, borderRadius: MOBILE_TOKENS.radius.md, border: `1px solid ${MOBILE_TOKENS.colors.border}`, background: 'var(--input-background)', color: MOBILE_TOKENS.colors.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'system-ui,sans-serif' },
  card: { background: 'var(--muted)', borderRadius: MOBILE_TOKENS.radius.xl, border: `1px solid ${MOBILE_TOKENS.colors.border}`, padding: MOBILE_TOKENS.spacing.lg, marginBottom: MOBILE_TOKENS.spacing.md } as React.CSSProperties,
  btn: (bg: string, color = '#fff') => ({ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: MOBILE_TOKENS.spacing.xs, padding: `${MOBILE_TOKENS.spacing.md}px ${MOBILE_TOKENS.spacing.lg}px`, borderRadius: MOBILE_TOKENS.radius.md, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, color, background: bg, fontFamily: 'system-ui,sans-serif' } as React.CSSProperties),
  iconBtn: (bg: string, color: string) => ({ width: 42, height: 42, borderRadius: MOBILE_TOKENS.radius.md, border: 'none', cursor: 'pointer', background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 } as React.CSSProperties),
};

const TYPE_STYLE: Record<string, { bg: string; color: string }> = {
  invoice:              { bg: 'var(--primary)15', color: 'var(--primary)' },
  quotation:            { bg: 'var(--secondary)15', color: 'var(--secondary)' },
  purchase:             { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24' },
  order:                { bg: 'var(--secondary)15', color: 'var(--secondary)' },
  proforma:             { bg: 'rgba(249,115,22,0.15)', color: '#fb923c' },
  challan:              { bg: 'var(--muted)', color: 'var(--muted-foreground)' },
  invoice_cancellation: { bg: 'var(--destructive)15', color: 'var(--destructive)' },
};
const TYPE_LABEL: Record<string, string> = {
  invoice: 'Invoice', quotation: 'Quotation', purchase: 'Purchase',
  order: 'Order', proforma: 'Proforma', challan: 'Challan', invoice_cancellation: 'Cancellation',
};

function fmt(n: number) { return formatCurrency(n); }
function fmtDate(s: string) { return formatDate(s); }

function Skeleton() {
  return (
    <div style={{ padding: `${MOBILE_TOKENS.spacing.lg}px ${MOBILE_TOKENS.spacing.lg}px calc(${MOBILE_TOKENS.safeAreaBottom} + 100px)` }}>
      <div style={{ height: 32, width: 140, background: 'var(--muted)', borderRadius: MOBILE_TOKENS.radius.md, marginBottom: MOBILE_TOKENS.spacing.lg, animation: 'mpulse 1.4s infinite' }} />
      <div style={{ height: 48, background: 'var(--muted)', borderRadius: MOBILE_TOKENS.radius.xl, marginBottom: MOBILE_TOKENS.spacing.lg * 1.25, animation: 'mpulse 1.4s infinite' }} />
      {[1,2,3].map(i => (
        <div key={i} style={{ height: 110, borderRadius: MOBILE_TOKENS.radius.xl, background: MOBILE_TOKENS.colors.surface, border: `1px solid ${MOBILE_TOKENS.colors.border}`, padding: MOBILE_TOKENS.spacing.lg, marginBottom: MOBILE_TOKENS.spacing.md, animation: 'mpulse 1.4s infinite' }}>
          <div style={{ display: 'flex', gap: MOBILE_TOKENS.spacing.md, marginBottom: MOBILE_TOKENS.spacing.md }}>
            <div style={{ width: 60, height: 20, background: 'var(--muted)', borderRadius: MOBILE_TOKENS.radius.sm }} />
            <div style={{ width: 80, height: 20, background: 'var(--muted)', borderRadius: MOBILE_TOKENS.radius.sm }} />
          </div>
          <div style={{ width: '100%', height: 16, background: 'var(--muted)', borderRadius: MOBILE_TOKENS.radius.sm, marginBottom: MOBILE_TOKENS.spacing.xs }} />
          <div style={{ width: '60%', height: 16, background: 'var(--muted)', borderRadius: MOBILE_TOKENS.radius.sm }} />
        </div>
      ))}
      <style>{`@keyframes mpulse{0%,100%{opacity:.6}50%{opacity:.3}}`}</style>
    </div>
  );
}

// Enhanced Download Options Sheet with PDF Preview and Template Selection
const DownloadSheet = memo(({ doc, onCancel, profile }: { doc: any; onCancel: () => void; profile: any }) => {
  const [loading, setLoading] = useState(false);
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<PdfTemplateId>('classic');
  const [pdfDoc, setPdfDoc] = useState<DocumentDto | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [zoom, setZoom] = useState(0.35);
  const [isDownloading, setIsDownloading] = useState(false);
  const { accessToken, deviceId } = useAuth();
  const { theme, resolvedTheme } = useTheme();

  // Get theme class for accent colors
  const themeClass = useMemo(() => {
    if (theme === 'warm') return 'theme-warm';
    if (theme === 'ocean') return 'theme-ocean';
    if (theme === 'emerald') return 'theme-emerald';
    if (theme === 'rosewood') return 'theme-rosewood';
    return null;
  }, [theme]);

  // Theme-aware colors
  const colors = useMemo(() => getThemeColors(resolvedTheme, themeClass), [resolvedTheme, themeClass]);

  // Load document data on mount (don't auto-render)
  useEffect(() => {
    loadDocumentData();
  }, []);

  // Only regenerate PDF when template changes AND preview is shown
  useEffect(() => {
    if (pdfDoc && showPreview) {
      generatePDF();
    }
  }, [selectedTemplate, showPreview]);

  const loadDocumentData = useCallback(async () => {
    try {
      setLoading(true);
      const fullDoc = await fetchDocumentById({
        apiUrl: API_URL,
        accessToken: accessToken || '',
        deviceId: deviceId || '',
        profileId: profile.id,
        documentId: doc.id
      });
      
      setPdfDoc(fullDoc);
      
      // Generate UPI QR asynchronously (non-blocking)
      const upiId = String(fullDoc?.upiId || profile?.upiId || '').trim();
      if (upiId) {
        (async () => {
          try {
            const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(profile?.businessName || '')}&am=${Number(fullDoc?.grandTotal).toFixed(2)}&cu=INR&tn=${encodeURIComponent(String(fullDoc?.invoiceNo || fullDoc?.documentNumber || ''))}`;
            const QRCode = (await import('qrcode')).default;
            fullDoc.upiQrText = await QRCode.toDataURL(upiUri, { margin: 1, width: 240 });
            setPdfDoc({ ...fullDoc });
          } catch { }
        })();
      }
    } catch (err: any) {
      console.error('Failed to load document:', err);
      toast.error(err.message || 'Failed to load document');
    } finally {
      setLoading(false);
    }
  }, [accessToken, deviceId, profile.id, doc.id]);

  const generatePDF = useCallback(async (docData?: DocumentDto): Promise<string | null> => {
    try {
      const fullDoc = docData || pdfDoc;
      if (!fullDoc) return null;
      
      setLoading(true);
      
      // For preview, we DON'T generate the actual PDF file
      // We just render the component - no file creation, no download
      // The PdfRenderer component will be shown in the preview area
      
      setLoading(false);
      return null; // No file URI for preview
    } catch (err: any) {
      console.error('PDF preview error:', err);
      toast.error(err.message || 'Failed to show preview');
      setLoading(false);
      return null;
    }
  }, [pdfDoc]);

  const generatePDFFile = useCallback(async (): Promise<string | null> => {
    try {
      if (!pdfDoc) return null;
      
      setLoading(true);
      
      // Create temporary container for PDF rendering
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.width = '100%';
      document.body.appendChild(container);

      const root = document.createElement('div');
      container.appendChild(root);
      
      // Render PDF template
      const { createRoot } = await import('react-dom/client');
      const reactRoot = createRoot(root);
      
      reactRoot.render(
        <PdfRenderer 
          doc={pdfDoc} 
          profile={profile} 
          templateId={selectedTemplate}
        />
      );

      // Reduced wait time - 300ms instead of 1000ms
      await new Promise(resolve => setTimeout(resolve, 300));

      // Export to PDF - use document name (invoiceNo or documentNumber)
      const docName = (pdfDoc as any).invoiceNo || (pdfDoc as any).documentNumber || 'Document';
      const filename = `${docName}.pdf`;
      
      await exportElementToPdf({ element: root, filename });

      // Cleanup immediately
      reactRoot.unmount();
      document.body.removeChild(container);

      // For Capacitor, get the file URI
      try {
        const result = await Filesystem.getUri({
          path: filename,
          directory: Directory.Documents
        });
        setPdfUri(result.uri);
        return result.uri;
      } catch {
        // Fallback if file not found
        setPdfUri(filename);
        return filename;
      }
    } catch (err: any) {
      console.error('PDF generation error:', err);
      toast.error(err.message || 'Failed to generate PDF');
      return null;
    } finally {
      setLoading(false);
    }
  }, [pdfDoc, selectedTemplate, profile]);

  const handleDownload = useCallback(async () => {
    setIsDownloading(true);
    try {
      const uri = pdfUri || await generatePDFFile();
      if (uri) {
        toast.success('PDF saved successfully');
        // Don't close dialog - keep it open for more actions
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to download');
    } finally {
      setIsDownloading(false);
    }
  }, [pdfUri, generatePDFFile]);

  const handleZoom = useCallback((delta: number) => {
    setZoom(prev => Math.min(2.0, Math.max(0.2, prev + delta)));
  }, []);

  // Fullscreen Preview Modal
  if (fullscreen && pdfDoc) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#000', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui,sans-serif' }}>
        {/* Fullscreen Header */}
        <div style={{ padding: `${MOBILE_TOKENS.spacing.md}px ${MOBILE_TOKENS.spacing.lg}px`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: MOBILE_TOKENS.colors.surface, borderBottom: `1px solid ${MOBILE_TOKENS.colors.border}` }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: MOBILE_TOKENS.colors.text }}>
              Full Screen Preview
            </h2>
            <p style={{ margin: `${MOBILE_TOKENS.spacing.xs * 0.25}px 0 0`, fontSize: 10, color: MOBILE_TOKENS.colors.textSecondary, fontWeight: 700 }}>
              {(pdfDoc as any).invoiceNo || (pdfDoc as any).documentNumber || 'Document'}
            </p>
          </div>
          <button
            onClick={() => setFullscreen(false)}
            style={{
              width: 32,
              height: 32,
              borderRadius: MOBILE_TOKENS.radius.md,
              border: 'none',
              background: 'rgba(255,255,255,0.06)',
              color: MOBILE_TOKENS.colors.textMuted,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* Fullscreen Controls */}
        <div style={{ padding: `${MOBILE_TOKENS.spacing.md}px ${MOBILE_TOKENS.spacing.lg}px`, display: 'flex', flexWrap: 'wrap', gap: MOBILE_TOKENS.spacing.xs, alignItems: 'center', background: colors.surface, borderBottom: `1px solid ${colors.border}`, overflowX: 'auto' }}>
          {/* Zoom Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: MOBILE_TOKENS.spacing.xs * 0.5, background: `${colors.accent}15`, padding: `${MOBILE_TOKENS.spacing.xs * 0.5}px ${MOBILE_TOKENS.spacing.xs}px`, borderRadius: MOBILE_TOKENS.radius.full, border: `1px solid ${colors.accent}30`, flexShrink: 0 }}>
            <button
              onClick={() => handleZoom(-0.1)}
              style={{
                width: 28,
                height: 28,
                borderRadius: MOBILE_TOKENS.radius.md,
                border: 'none',
                background: 'transparent',
                color: colors.text,
                cursor: 'pointer',
                fontSize: 18,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              −
            </button>
            <div style={{ minWidth: 40, textAlign: 'center' }}>
              <div style={{ fontSize: 8, fontWeight: 900, textTransform: 'uppercase', color: colors.textSecondary, lineHeight: 1 }}>Zoom</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: colors.accent, lineHeight: 1.2 }}>{Math.round(zoom * 100)}%</div>
            </div>
            <button
              onClick={() => handleZoom(0.1)}
              style={{
                width: 28,
                height: 28,
                borderRadius: MOBILE_TOKENS.radius.md,
                border: 'none',
                background: 'transparent',
                color: colors.text,
                cursor: 'pointer',
                fontSize: 18,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              +
            </button>
          </div>

          {/* Template Buttons */}
          {PDF_TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => setSelectedTemplate(template.id as PdfTemplateId)}
              style={{
                padding: `${MOBILE_TOKENS.spacing.xs * 0.75}px ${MOBILE_TOKENS.spacing.md}px`,
                borderRadius: MOBILE_TOKENS.radius.md,
                border: selectedTemplate === template.id ? `2px solid ${colors.accent}` : `1px solid ${colors.border}`,
                background: selectedTemplate === template.id ? `${colors.accent}20` : `${colors.inputBg}`,
                color: selectedTemplate === template.id ? colors.accent : colors.textSecondary,
                fontSize: 9,
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                cursor: 'pointer',
                transition: 'all 0.2s',
                minHeight: 32,
                whiteSpace: 'nowrap'
              }}
            >
              {template.label}
            </button>
          ))}
        </div>

        {/* Fullscreen PDF Preview */}
        <div style={{ flex: 1, background: '#1a1a1a', overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: MOBILE_TOKENS.spacing.lg }}>
          <div
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'center',
              transition: 'transform 0.3s',
              background: '#fff'
            }}
          >
            <PdfRenderer 
              doc={pdfDoc} 
              profile={profile} 
              templateId={selectedTemplate}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: '8px', zIndex: 90, background: MOBILE_TOKENS.colors.surface, borderRadius: MOBILE_TOKENS.radius.lg, display: 'flex', flexDirection: 'column', fontFamily: 'system-ui,sans-serif', boxShadow: '0 20px 60px rgba(0,0,0,0.7)', animation: 'slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)', maxHeight: 'calc(100vh - 16px)' }}>
      {/* Header - Optimized for Android */}
      <div style={{ padding: `${MOBILE_TOKENS.spacing.md}px ${MOBILE_TOKENS.spacing.lg}px`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${colors.border}`, background: `linear-gradient(135deg, ${colors.accent}08, ${colors.accent}12)` }}>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>PDF Preview</p>
          <h2 style={{ margin: `${MOBILE_TOKENS.spacing.xs * 0.25}px 0 0`, fontSize: 15, fontWeight: 800, color: colors.text, lineHeight: 1.2 }}>
            {(pdfDoc as any)?.invoiceNo || (pdfDoc as any)?.documentNumber || 'Document'}
          </h2>
        </div>
        {!loading && (
          <button
            onClick={onCancel}
            style={{
              width: 36,
              height: 36,
              borderRadius: MOBILE_TOKENS.radius.md,
              border: 'none',
              background: `${colors.accent}15`,
              color: colors.accent,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease-out',
              marginLeft: MOBILE_TOKENS.spacing.md
            }}
            onMouseDown={(e) => {
              (e.currentTarget as HTMLElement).style.background = `${colors.accent}25`;
            }}
            onMouseUp={(e) => {
              (e.currentTarget as HTMLElement).style.background = `${colors.accent}15`;
            }}
          >
            <X style={{ width: 18, height: 18 }} />
          </button>
        )}
      </div>

      {/* Controls Bar - Optimized Layout */}
      <div style={{ padding: `${MOBILE_TOKENS.spacing.md}px ${MOBILE_TOKENS.spacing.lg}px`, display: 'flex', gap: MOBILE_TOKENS.spacing.md, alignItems: 'center', borderBottom: `1px solid ${MOBILE_TOKENS.colors.border}`, overflowX: 'auto', scrollBehavior: 'smooth' }}>
        {/* Zoom Controls - Compact */}
        <div style={{ display: 'flex', alignItems: 'center', gap: MOBILE_TOKENS.spacing.xs * 0.25, background: 'var(--muted)', padding: `${MOBILE_TOKENS.spacing.xs * 0.5}px ${MOBILE_TOKENS.spacing.xs}px`, borderRadius: MOBILE_TOKENS.radius.full, border: `1px solid ${MOBILE_TOKENS.colors.border}`, flexShrink: 0 }}>
          <button
            onClick={() => handleZoom(-0.1)}
            disabled={loading}
            style={{
              width: 32,
              height: 32,
              borderRadius: MOBILE_TOKENS.radius.md,
              border: 'none',
              background: 'transparent',
              color: MOBILE_TOKENS.colors.text,
              cursor: 'pointer',
              fontSize: 16,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease-out',
              opacity: loading ? 0.5 : 1
            }}
            onMouseDown={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)';
            }}
            onMouseUp={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'transparent';
            }}
          >
            −
          </button>
          <div style={{ minWidth: 44, textAlign: 'center', padding: `0 ${MOBILE_TOKENS.spacing.xs * 0.5}px` }}>
            <div style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', color: MOBILE_TOKENS.colors.textSecondary, lineHeight: 1 }}>Zoom</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: MOBILE_TOKENS.colors.accent, lineHeight: 1.2 }}>{Math.round(zoom * 100)}%</div>
          </div>
          <button
            onClick={() => handleZoom(0.1)}
            disabled={loading}
            style={{
              width: 32,
              height: 32,
              borderRadius: MOBILE_TOKENS.radius.md,
              border: 'none',
              background: 'transparent',
              color: MOBILE_TOKENS.colors.text,
              cursor: 'pointer',
              fontSize: 16,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease-out',
              opacity: loading ? 0.5 : 1
            }}
            onMouseDown={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)';
            }}
            onMouseUp={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'transparent';
            }}
          >
            +
          </button>
        </div>

        {/* Template Buttons - Horizontal Scroll */}
        {PDF_TEMPLATES.map((template, idx) => (
          <button
            key={template.id}
            onClick={() => setSelectedTemplate(template.id as PdfTemplateId)}
            disabled={loading}
            style={{
              padding: `${MOBILE_TOKENS.spacing.xs * 0.75}px ${MOBILE_TOKENS.spacing.md}px`,
              borderRadius: MOBILE_TOKENS.radius.md,
              border: selectedTemplate === template.id ? `2px solid ${MOBILE_TOKENS.colors.accent}` : `1px solid ${MOBILE_TOKENS.colors.border}`,
              background: selectedTemplate === template.id ? `${MOBILE_TOKENS.colors.accent}20` : 'var(--muted)',
              color: selectedTemplate === template.id ? MOBILE_TOKENS.colors.accent : MOBILE_TOKENS.colors.textSecondary,
              fontSize: 9,
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1,
              transition: 'all 0.15s ease-out',
              minHeight: 36,
              whiteSpace: 'nowrap',
              animation: `slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) ${idx * 0.03}s backwards`
            }}
            onMouseDown={(e) => {
              if (!loading) (e.currentTarget as HTMLElement).style.transform = 'scale(0.95)';
            }}
            onMouseUp={(e) => {
              if (!loading) (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
            }}
          >
            {template.label}
          </button>
        ))}
      </div>

      {/* PDF Preview Area - Full Space */}
      <div style={{ flex: 1, background: colors.bg, overflow: 'auto', position: 'relative', padding: MOBILE_TOKENS.spacing.lg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        {!showPreview ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: MOBILE_TOKENS.spacing.lg, animation: 'fadeIn 0.3s ease-out' }}>
            <div style={{ width: 64, height: 64, borderRadius: MOBILE_TOKENS.radius.lg, background: `${colors.accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
              <FileText style={{ width: 32, height: 32, color: colors.accent }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: colors.text, marginBottom: MOBILE_TOKENS.spacing.xs }}>Ready to Preview</div>
              <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: MOBILE_TOKENS.spacing.lg, maxWidth: 200 }}>Tap the Preview button below to render your PDF</div>
              <button
                onClick={() => setShowPreview(true)}
                disabled={loading}
                style={{
                  padding: `${MOBILE_TOKENS.spacing.md}px ${MOBILE_TOKENS.spacing.lg * 1.5}px`,
                  borderRadius: MOBILE_TOKENS.radius.lg,
                  border: 'none',
                  background: `linear-gradient(135deg, ${colors.accent}, ${colors.accent}dd)`,
                  color: 'var(--primary-foreground)',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  opacity: loading ? 0.6 : 1,
                  transition: 'all 0.15s ease-out',
                  boxShadow: `0 4px 12px ${colors.accent}40`
                }}
                onMouseDown={(e) => {
                  if (!loading) (e.currentTarget as HTMLElement).style.transform = 'scale(0.98)';
                }}
                onMouseUp={(e) => {
                  if (!loading) (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                }}
              >
                Show Preview
              </button>
            </div>
          </div>
        ) : loading && !pdfDoc ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: MOBILE_TOKENS.spacing.lg }}>
            <div style={{ position: 'relative', width: 56, height: 56 }}>
              <div style={{ width: 56, height: 56, border: `3px solid ${colors.border}`, borderTopColor: colors.accent, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <FileText style={{ position: 'absolute', inset: 0, margin: 'auto', width: 24, height: 24, color: colors.accent }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: colors.text, marginBottom: MOBILE_TOKENS.spacing.xs }}>Rendering PDF</div>
              <div style={{ fontSize: 11, color: colors.textSecondary }}>Optimizing for your device...</div>
            </div>
          </div>
        ) : pdfDoc ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxHeight: '100%', animation: 'fadeIn 0.3s ease-out', overflow: 'auto' }}>
            <div
              id="pdf-capture-node-mobile"
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'top center',
                transition: 'transform 0.2s ease-out',
                borderRadius: MOBILE_TOKENS.radius.md,
                overflow: 'hidden',
                boxShadow: `0 8px 24px ${colors.bg}80`,
                background: '#fff',
                flexShrink: 0
              }}
            >
              <PdfRenderer 
                doc={pdfDoc} 
                profile={profile} 
                templateId={selectedTemplate}
              />
            </div>
          </div>
        ) : null}

        {/* Loading Overlay - Optimized */}
        {loading && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, animation: 'fadeIn 0.2s ease-out' }}>
            <div style={{ background: MOBILE_TOKENS.colors.surface, border: `1px solid ${MOBILE_TOKENS.colors.border}`, borderRadius: MOBILE_TOKENS.radius.xl, padding: MOBILE_TOKENS.spacing.lg * 2, maxWidth: 260, textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.6)', animation: 'scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
              <div style={{ position: 'relative', width: 56, height: 56, margin: `0 auto ${MOBILE_TOKENS.spacing.lg}px` }}>
                <div style={{ width: 56, height: 56, border: `3px solid ${MOBILE_TOKENS.colors.border}`, borderTopColor: MOBILE_TOKENS.colors.accent, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <Download style={{ position: 'absolute', inset: 0, margin: 'auto', width: 20, height: 20, color: MOBILE_TOKENS.colors.accent }} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 900, color: MOBILE_TOKENS.colors.text, marginBottom: MOBILE_TOKENS.spacing.xs, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Rendering PDF
              </div>
              <div style={{ fontSize: 11, color: MOBILE_TOKENS.colors.textSecondary }}>Please wait...</div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons - Concise 3-Button Layout */}
      <div style={{ padding: `${MOBILE_TOKENS.spacing.md}px ${MOBILE_TOKENS.spacing.lg}px`, borderTop: `1px solid ${MOBILE_TOKENS.colors.border}`, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: MOBILE_TOKENS.spacing.md, background: `linear-gradient(180deg, transparent, rgba(0,0,0,0.1))` }}>
        <button
          onClick={() => setShowPreview(false)}
          disabled={!showPreview || loading}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: MOBILE_TOKENS.spacing.xs * 0.75,
            padding: `${MOBILE_TOKENS.spacing.md}px ${MOBILE_TOKENS.spacing.xs}px`,
            borderRadius: MOBILE_TOKENS.radius.lg,
            border: `1px solid ${MOBILE_TOKENS.colors.border}`,
            background: 'rgba(255,255,255,0.04)',
            cursor: (!showPreview || loading) ? 'not-allowed' : 'pointer',
            opacity: (!showPreview || loading) ? 0.4 : 1,
            transition: 'all 0.15s ease-out',
            minHeight: 72,
            justifyContent: 'center',
            animation: `slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) 0s backwards`
          }}
          onMouseDown={(e) => {
            if (!showPreview || loading) return;
            (e.currentTarget as HTMLElement).style.transform = 'scale(0.95)';
          }}
          onMouseUp={(e) => {
            if (!showPreview || loading) return;
            (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
          }}
        >
          <X style={{ width: 22, height: 22, color: MOBILE_TOKENS.colors.text }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: MOBILE_TOKENS.colors.text, textAlign: 'center', lineHeight: 1.2 }}>
            Hide
          </span>
        </button>

        <button
          onClick={() => setFullscreen(true)}
          disabled={!showPreview || loading}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: MOBILE_TOKENS.spacing.xs * 0.75,
            padding: `${MOBILE_TOKENS.spacing.md}px ${MOBILE_TOKENS.spacing.xs}px`,
            borderRadius: MOBILE_TOKENS.radius.lg,
            border: `1px solid ${MOBILE_TOKENS.colors.border}`,
            background: 'rgba(255,255,255,0.04)',
            cursor: (!showPreview || loading) ? 'not-allowed' : 'pointer',
            opacity: (!showPreview || loading) ? 0.4 : 1,
            transition: 'all 0.15s ease-out',
            minHeight: 72,
            justifyContent: 'center',
            animation: `slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) 0.05s backwards`
          }}
          onMouseDown={(e) => {
            if (!showPreview || loading) return;
            (e.currentTarget as HTMLElement).style.transform = 'scale(0.95)';
          }}
          onMouseUp={(e) => {
            if (!showPreview || loading) return;
            (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
          }}
        >
          <Maximize style={{ width: 22, height: 22, color: MOBILE_TOKENS.colors.text }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: MOBILE_TOKENS.colors.text, textAlign: 'center', lineHeight: 1.2 }}>
            Fullscreen
          </span>
        </button>

        <button
          onClick={handleDownload}
          disabled={isDownloading || !pdfDoc || loading}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: MOBILE_TOKENS.spacing.xs * 0.75,
            padding: `${MOBILE_TOKENS.spacing.md}px ${MOBILE_TOKENS.spacing.xs}px`,
            borderRadius: MOBILE_TOKENS.radius.lg,
            border: 'none',
            background: MOBILE_TOKENS.colors.accent,
            color: 'var(--primary-foreground)',
            cursor: (isDownloading || !pdfDoc || loading) ? 'not-allowed' : 'pointer',
            opacity: (isDownloading || !pdfDoc || loading) ? 0.6 : 1,
            transition: 'all 0.15s ease-out',
            minHeight: 72,
            justifyContent: 'center',
            animation: `slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s backwards`
          }}
          onMouseDown={(e) => {
            if (isDownloading || !pdfDoc || loading) return;
            (e.currentTarget as HTMLElement).style.transform = 'scale(0.95)';
          }}
          onMouseUp={(e) => {
            if (isDownloading || !pdfDoc || loading) return;
            (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
          }}
        >
          {isDownloading ? (
            <>
              <div style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.3)', borderTopcolor: 'var(--primary-foreground)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            </>
          ) : (
            <Download style={{ width: 22, height: 22, color: 'var(--primary-foreground)' }} />
          )}
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--primary-foreground)', textAlign: 'center', lineHeight: 1.2 }}>
            {isDownloading ? 'Saving...' : 'Download'}
          </span>
        </button>
      </div>
      
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
});

// Optimized Action Sheet with smooth animations
const ActionSheet = memo(({ doc, onCancel, onEdit, onDownload, onDelete }: { doc: any; onCancel: () => void; onEdit: (d: any) => void; onDownload: (d: any) => void; onDelete: (d: any) => void }) => {
  const actions = useMemo(() => [
    { id: 'edit', icon: FileEdit, label: 'Edit', color: 'var(--primary)', bg: 'var(--primary)12', action: () => onEdit(doc) },
    { id: 'download', icon: Download, label: 'Download / Share', color: 'var(--primary)', bg: 'var(--primary)12', action: () => onDownload(doc) },
    { id: 'delete', icon: Trash2, label: 'Delete', color: MOBILE_TOKENS.colors.error, bg: 'rgba(239,68,68,0.12)', action: () => onDelete(doc) },
  ], [doc, onEdit, onDownload, onDelete]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', alignItems: 'flex-end', animation: 'fadeIn 0.2s ease-out' }}>
      <div style={{ position: 'absolute', inset: 0, background: MOBILE_TOKENS.colors.overlay, cursor: 'pointer' }} onClick={onCancel} />
      <div style={{ position: 'relative', width: '100%', background: MOBILE_TOKENS.colors.surface, borderRadius: `${MOBILE_TOKENS.radius.xl}px ${MOBILE_TOKENS.radius.xl}px 0 0`, padding: `${MOBILE_TOKENS.spacing.md}px ${MOBILE_TOKENS.spacing.lg}px`, paddingBottom: `calc(${MOBILE_TOKENS.safeAreaBottom} + ${MOBILE_TOKENS.spacing.lg}px)`, boxShadow: '0 -15px 50px rgba(0,0,0,0.6)', fontFamily: 'system-ui,sans-serif', animation: 'slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
        <div style={{ width: 40, height: 4, background: MOBILE_TOKENS.colors.borderLight, borderRadius: 2, margin: `${MOBILE_TOKENS.spacing.xs}px auto ${MOBILE_TOKENS.spacing.lg}px` }} />
        
        <div style={{ marginBottom: MOBILE_TOKENS.spacing.lg }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: MOBILE_TOKENS.colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Document</p>
          <p style={{ margin: `${MOBILE_TOKENS.spacing.xs * 0.5}px 0 0`, fontSize: 16, fontWeight: 800, color: MOBILE_TOKENS.colors.text, lineHeight: 1.2 }}>{doc?.invoiceNo || doc?.documentNumber}</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: MOBILE_TOKENS.spacing.md, marginBottom: MOBILE_TOKENS.spacing.lg }}>
          {actions.map((action, idx) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={action.action}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: MOBILE_TOKENS.spacing.xs,
                  padding: `${MOBILE_TOKENS.spacing.md}px ${MOBILE_TOKENS.spacing.xs}px`,
                  borderRadius: MOBILE_TOKENS.radius.lg,
                  border: 'none',
                  background: action.bg,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease-out',
                  animation: `slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) ${idx * 0.05}s backwards`,
                  minHeight: 80,
                  justifyContent: 'center'
                }}
                onMouseDown={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'scale(0.95)';
                }}
                onMouseUp={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                }}
              >
                <Icon style={{ width: 24, height: 24, color: action.color }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: action.color, textAlign: 'center', lineHeight: 1.2 }}>
                  {action.label}
                </span>
              </button>
            );
          })}
        </div>

        <button
          onClick={onCancel}
          style={{
            width: '100%',
            height: 48,
            borderRadius: MOBILE_TOKENS.radius.lg,
            border: `1px solid ${MOBILE_TOKENS.colors.border}`,
            background: 'rgba(255,255,255,0.06)',
            color: MOBILE_TOKENS.colors.text,
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s ease-out'
          }}
          onMouseDown={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.12)';
          }}
          onMouseUp={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)';
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
});

// Optimized Delete Confirmation Sheet
const DeleteSheet = memo(({ doc, onCancel, onConfirm, loading }: { doc: any; onCancel: () => void; onConfirm: () => void; loading: boolean }) => {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'flex', alignItems: 'flex-end', animation: 'fadeIn 0.2s ease-out' }}>
      <div style={{ position: 'absolute', inset: 0, background: MOBILE_TOKENS.colors.overlay, cursor: 'pointer' }} onClick={onCancel} />
      <div style={{ position: 'relative', width: '100%', background: MOBILE_TOKENS.colors.surface, borderRadius: `${MOBILE_TOKENS.radius.xl}px ${MOBILE_TOKENS.radius.xl}px 0 0`, padding: `${MOBILE_TOKENS.spacing.lg}px ${MOBILE_TOKENS.spacing.lg}px`, paddingBottom: `calc(${MOBILE_TOKENS.safeAreaBottom} + ${MOBILE_TOKENS.spacing.lg}px)`, boxShadow: '0 -12px 40px rgba(0,0,0,0.5)', fontFamily: 'system-ui,sans-serif', animation: 'slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: MOBILE_TOKENS.spacing.lg, animation: 'scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
          <div style={{ width: 56, height: 56, borderRadius: MOBILE_TOKENS.radius.lg, background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Trash2 style={{ width: 28, height: 28, color: MOBILE_TOKENS.colors.error }} />
          </div>
        </div>

        <p style={{ margin: `0 0 ${MOBILE_TOKENS.spacing.xs}px`, textAlign: 'center', fontSize: 16, fontWeight: 700, color: MOBILE_TOKENS.colors.text }}>Delete Document?</p>
        <p style={{ margin: `0 0 ${MOBILE_TOKENS.spacing.lg}px`, textAlign: 'center', fontSize: 13, color: MOBILE_TOKENS.colors.textSecondary }}>
          {doc?.invoiceNo || doc?.documentNumber} will be permanently deleted.
        </p>

        <div style={{ display: 'flex', gap: MOBILE_TOKENS.spacing.md }}>
          <button
            onClick={onCancel}
            disabled={loading}
            style={{
              flex: 1,
              height: 48,
              borderRadius: MOBILE_TOKENS.radius.lg,
              border: `1px solid ${MOBILE_TOKENS.colors.border}`,
              background: 'rgba(255,255,255,0.06)',
              color: MOBILE_TOKENS.colors.text,
              fontSize: 15,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1,
              transition: 'all 0.15s ease-out'
            }}
            onMouseDown={(e) => {
              if (!loading) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.12)';
            }}
            onMouseUp={(e) => {
              if (!loading) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)';
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              flex: 1,
              height: 48,
              borderRadius: MOBILE_TOKENS.radius.lg,
              border: 'none',
              background: MOBILE_TOKENS.colors.error,
              color: 'var(--primary-foreground)',
              fontSize: 15,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              transition: 'all 0.15s ease-out',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: MOBILE_TOKENS.spacing.xs
            }}
            onMouseDown={(e) => {
              if (!loading) (e.currentTarget as HTMLElement).style.transform = 'scale(0.98)';
            }}
            onMouseUp={(e) => {
              if (!loading) (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
            }}
          >
            {loading ? (
              <>
                <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopcolor: 'var(--primary-foreground)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.8); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
});

// Memoized Document Card Component
const DocumentCard = memo(({ doc, onMoreClick }: { doc: any; onMoreClick: (doc: any) => void }) => {
  const ts = TYPE_STYLE[doc.type] || TYPE_STYLE.challan;
  const isPaid = doc.paymentStatus === 'paid';
  
  return (
    <div style={S.card}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: MOBILE_TOKENS.spacing.xs, marginBottom: MOBILE_TOKENS.spacing.xs, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 800, fontSize: 15, color: MOBILE_TOKENS.colors.text }}>{doc.invoiceNo || doc.documentNumber}</span>
        <span style={{ padding: `${MOBILE_TOKENS.spacing.xs * 0.375}px ${MOBILE_TOKENS.spacing.md}px`, borderRadius: MOBILE_TOKENS.radius.full, fontSize: 11, fontWeight: 700, background: ts.bg, color: ts.color }}>
          {TYPE_LABEL[doc.type] || doc.type}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: isPaid ? '#34d399' : '#fb923c', display: 'flex', alignItems: 'center', gap: MOBILE_TOKENS.spacing.xs * 0.5 }}>
          {isPaid ? <CheckCircle2 style={{ width: 12, height: 12 }} /> : <Clock style={{ width: 12, height: 12 }} />}
          {isPaid ? 'Paid' : 'Unpaid'}
        </span>
        <button onClick={() => onMoreClick(doc)} style={{ ...S.iconBtn('rgba(255,255,255,0.06)', MOBILE_TOKENS.colors.textMuted), width: 32, height: 32, marginLeft: MOBILE_TOKENS.spacing.xs }}>
          <MoreVertical style={{ width: 16, height: 16 }} />
        </button>
      </div>
      {/* Info */}
      <div style={{ marginBottom: 0 }}>
        <p style={{ margin: `0 0 ${MOBILE_TOKENS.spacing.xs * 0.25}px`, fontSize: 13, color: MOBILE_TOKENS.colors.text, opacity: 0.8 }}>{doc.customerName || '—'}</p>
        <p style={{ margin: 0, fontSize: 13, color: MOBILE_TOKENS.colors.textSecondary }}>
          {fmtDate(doc.date)} · <span style={{ color: MOBILE_TOKENS.colors.text, fontWeight: 700 }}>{fmt(doc.grandTotal || 0)}</span>
        </p>
      </div>
    </div>
  );
});

export function MobileDocuments() {
  const [docs, setDocs] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [deleteDoc, setDeleteDoc] = useState<any>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [activeDoc, setActiveDoc] = useState<any>(null);
  const [downloadDoc, setDownloadDoc] = useState<any>(null);
  const { accessToken, deviceId } = useAuth();
  const { profileId, profile } = useCurrentProfile();
  const navigate = useNavigate();

  const load = useCallback(async (skip = 0) => {
    if (!accessToken || !profileId) return;
    if (skip === 0) setLoading(true);
    const h = { Authorization: `Bearer ${accessToken}`, 'X-Device-ID': deviceId, 'X-Profile-ID': profileId };
    try {
      const r = await fetch(`${API_URL}/documents?limit=30&skip=${skip}&profileId=${profileId}`, { headers: h });
      const j = await r.json();
      const data: any[] = Array.isArray(j) ? j : (j.data ?? []);
      if (skip === 0) { 
        setDocs(data); 
        setFiltered(data); 
      } else { 
        setDocs(prevDocs => {
          const merged = [...prevDocs, ...data];
          setFiltered(merged);
          return merged;
        });
      }
      setHasMore(j.hasMore ?? false);
    } catch { if (skip === 0) toast.error('Failed to load documents'); }
    finally { setLoading(false); setLoadingMore(false); }
  }, [accessToken, deviceId, profileId]);

  useEffect(() => { 
    if (accessToken && profileId) {
      load(0); 
    }
  }, [accessToken, profileId, load]);

  // Optimized search with useMemo
  const filteredDocs = useMemo(() => {
    if (!search.trim()) return docs;
    const q = search.toLowerCase();
    return docs.filter(d =>
      (d.documentNumber || d.invoiceNo || '').toLowerCase().includes(q) ||
      (d.customerName || '').toLowerCase().includes(q)
    );
  }, [search, docs]);

  useEffect(() => {
    setFiltered(filteredDocs);
  }, [filteredDocs]);

  const confirmDelete = useCallback(async () => {
    if (!deleteDoc) return;
    setDeleteLoading(true);
    try {
      const r = await fetch(`${API_URL}/documents/${deleteDoc.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}`, 'X-Device-ID': deviceId, 'X-Profile-ID': profileId },
      });
      if (!r.ok) throw new Error();
      setDocs(p => p.filter(d => d.id !== deleteDoc.id));
      toast.success('Deleted');
      setDeleteDoc(null);
    } catch { toast.error('Delete failed'); }
    finally { setDeleteLoading(false); }
  }, [deleteDoc, accessToken, deviceId, profileId]);

  if (loading) return <Skeleton />;

  return (
    <div style={{ fontFamily: 'system-ui,-apple-system,sans-serif' }}>
      {activeDoc && (
        <ActionSheet 
          doc={activeDoc} 
          onCancel={() => setActiveDoc(null)} 
          onEdit={() => navigate(`/documents/edit/${activeDoc.id}`)}
          onDownload={() => {
            setDownloadDoc(activeDoc);
            setActiveDoc(null);
          }}
          onDelete={() => {
            setDeleteDoc(activeDoc);
            setActiveDoc(null);
          }}
        />
      )}
      {downloadDoc && profile && (
        <DownloadSheet 
          doc={downloadDoc} 
          profile={profile}
          onCancel={() => setDownloadDoc(null)} 
        />
      )}
      {deleteDoc && <DeleteSheet doc={deleteDoc} onCancel={() => setDeleteDoc(null)} onConfirm={confirmDelete} loading={deleteLoading} />}

      <div style={{ padding: `${MOBILE_TOKENS.spacing.lg}px ${MOBILE_TOKENS.spacing.lg}px 0` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: MOBILE_TOKENS.spacing.xs }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: MOBILE_TOKENS.colors.text }}>Documents</h1>
          <button onClick={() => load(0)} disabled={loading} style={{ background: 'none', border: 'none', color: MOBILE_TOKENS.colors.accent, padding: MOBILE_TOKENS.spacing.xs, cursor: 'pointer' }}>
            {loading ? '...' : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>}
          </button>
        </div>
        <p style={{ margin: `0 0 ${MOBILE_TOKENS.spacing.lg}px`, fontSize: 13, color: MOBILE_TOKENS.colors.textSecondary }}>All business records</p>

        {/* Create button */}
        <button onClick={() => navigate('/documents/create')}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: MOBILE_TOKENS.spacing.md,
            padding: `${MOBILE_TOKENS.spacing.lg * 0.875}px 0`, borderRadius: MOBILE_TOKENS.radius.xl, border: 'none', cursor: 'pointer', marginBottom: MOBILE_TOKENS.spacing.md,
            background: 'linear-gradient(135deg,#10b981,#059669)', color: 'var(--primary-foreground)', fontWeight: 700, fontSize: 15,
            boxShadow: '0 4px 16px rgba(16,185,129,0.35)' }}>
          <Plus style={{ width: 20, height: 20 }} />
          Create Document
        </button>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: MOBILE_TOKENS.spacing.lg }}>
          <Search style={{ position: 'absolute', left: MOBILE_TOKENS.spacing.md, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: MOBILE_TOKENS.colors.textSecondary }} />
          <input type="text" placeholder="Search by number or customer…" value={search}
            onChange={e => setSearch(e.target.value)} style={S.input} />
        </div>
      </div>

      {/* List */}
      <div style={{ padding: `0 ${MOBILE_TOKENS.spacing.lg}px calc(${MOBILE_TOKENS.safeAreaBottom} + 100px)` }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <FileText style={{ width: 48, height: 48, color: MOBILE_TOKENS.colors.textSecondary, opacity: 0.3, margin: '0 auto 12px' }} />
            <p style={{ margin: 0, fontSize: 14, color: MOBILE_TOKENS.colors.textSecondary }}>No documents found</p>
          </div>
        ) : filtered.map(doc => (
          <DocumentCard key={doc.id} doc={doc} onMoreClick={setActiveDoc} />
        ))}

        {hasMore && (
          <button onClick={() => { setLoadingMore(true); load(docs.length); }} disabled={loadingMore}
            style={{ width: '100%', padding: `${MOBILE_TOKENS.spacing.lg * 0.875}px 0`, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: 'var(--primary)' }}>
            {loadingMore ? 'Loading…' : 'Load More'}
          </button>
        )}
      </div>
    </div>
  );
}

