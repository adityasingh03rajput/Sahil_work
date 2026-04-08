/**
 * MobileDocuments — APK-only documents list page.
 * 100% inline styles, zero Tailwind/CSS-var dependencies.
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Search, FileText, Download, Trash2, FileEdit, CheckCircle2, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCurrentProfile } from '../hooks/useCurrentProfile';
import { API_URL } from '../config/api';
import { toast } from 'sonner';

const S = {
  page: { padding: '16px 16px 100px', fontFamily: 'system-ui,-apple-system,sans-serif' } as React.CSSProperties,
  heading: { margin: '0 0 4px', fontSize: 24, fontWeight: 800, color: '#f1f5f9' } as React.CSSProperties,
  sub: { margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.4)' } as React.CSSProperties,
  input: { width: '100%', padding: '11px 12px 11px 38px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)', color: '#f1f5f9', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'system-ui,sans-serif' },
  card: { background: 'rgba(255,255,255,0.05)', borderRadius: 18, border: '1px solid rgba(255,255,255,0.08)', padding: 16, marginBottom: 10 } as React.CSSProperties,
  btn: (bg: string, color = '#fff') => ({ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 14px', borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, color, background: bg, fontFamily: 'system-ui,sans-serif' } as React.CSSProperties),
  iconBtn: (bg: string, color: string) => ({ width: 38, height: 38, borderRadius: 10, border: 'none', cursor: 'pointer', background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 } as React.CSSProperties),
};

const TYPE_STYLE: Record<string, { bg: string; color: string }> = {
  invoice:              { bg: 'rgba(59,130,246,0.15)',  color: '#60a5fa' },
  quotation:            { bg: 'rgba(16,185,129,0.15)',  color: '#34d399' },
  purchase:             { bg: 'rgba(245,158,11,0.15)',  color: '#fbbf24' },
  order:                { bg: 'rgba(16,185,129,0.15)',  color: '#34d399' },
  proforma:             { bg: 'rgba(249,115,22,0.15)',  color: '#fb923c' },
  challan:              { bg: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' },
  invoice_cancellation: { bg: 'rgba(239,68,68,0.15)',   color: '#f87171' },
};
const TYPE_LABEL: Record<string, string> = {
  invoice: 'Invoice', quotation: 'Quotation', purchase: 'Purchase',
  order: 'Order', proforma: 'Proforma', challan: 'Challan', invoice_cancellation: 'Cancellation',
};

function fmt(n: number) { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n); }
function fmtDate(s: string) { return new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }); }

function Skeleton() {
  return (
    <div style={{ padding: '16px 16px 100px' }}>
      {[1,2,3,4,5].map(i => <div key={i} style={{ height: 100, borderRadius: 18, background: 'rgba(255,255,255,0.06)', marginBottom: 10, animation: 'mpulse 1.4s ease-in-out infinite' }} />)}
      <style>{`@keyframes mpulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  );
}

// Confirm delete bottom sheet
function DeleteSheet({ doc, onCancel, onConfirm, loading }: { doc: any; onCancel: () => void; onConfirm: () => void; loading: boolean }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} onClick={onCancel} />
      <div style={{ position: 'relative', width: '100%', background: '#1e293b', borderRadius: '24px 24px 0 0', padding: '24px 20px', paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 20px)', boxShadow: '0 -12px 40px rgba(0,0,0,0.5)', fontFamily: 'system-ui,sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 16, background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Trash2 style={{ width: 22, height: 22, color: '#f87171' }} />
          </div>
        </div>
        <p style={{ margin: '0 0 6px', textAlign: 'center', fontSize: 17, fontWeight: 700, color: '#f1f5f9' }}>Delete Document?</p>
        <p style={{ margin: '0 0 20px', textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
          {doc?.invoiceNo || doc?.documentNumber} will be permanently deleted.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, height: 48, borderRadius: 14, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: '#f1f5f9', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          <button onClick={onConfirm} disabled={loading} style={{ flex: 1, height: 48, borderRadius: 14, border: 'none', background: '#dc2626', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function MobileDocuments() {
  const [docs, setDocs] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [deleteDoc, setDeleteDoc] = useState<any>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { accessToken, deviceId } = useAuth();
  const { profileId } = useCurrentProfile();
  const navigate = useNavigate();

  const load = useCallback(async (skip = 0) => {
    if (!accessToken || !profileId) return;
    if (skip === 0) setLoading(true);
    const h = { Authorization: `Bearer ${accessToken}`, 'X-Device-ID': deviceId, 'X-Profile-ID': profileId };
    try {
      const r = await fetch(`${API_URL}/documents?limit=30&skip=${skip}&profileId=${profileId}`, { headers: h });
      const j = await r.json();
      const data: any[] = Array.isArray(j) ? j : (j.data ?? []);
      if (skip === 0) { setDocs(data); setFiltered(data); }
      else { const m = [...docs, ...data]; setDocs(m); setFiltered(m); }
      setHasMore(j.hasMore ?? false);
    } catch { if (skip === 0) toast.error('Failed to load documents'); }
    finally { setLoading(false); setLoadingMore(false); }
  }, [accessToken, deviceId, profileId]);

  useEffect(() => { load(0); }, [load]);

  useEffect(() => {
    if (!search.trim()) { setFiltered(docs); return; }
    const q = search.toLowerCase();
    setFiltered(docs.filter(d =>
      (d.documentNumber || d.invoiceNo || '').toLowerCase().includes(q) ||
      (d.customerName || '').toLowerCase().includes(q)
    ));
  }, [search, docs]);

  const confirmDelete = async () => {
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
  };

  if (loading) return <Skeleton />;

  return (
    <div style={{ fontFamily: 'system-ui,-apple-system,sans-serif' }}>
      {deleteDoc && <DeleteSheet doc={deleteDoc} onCancel={() => setDeleteDoc(null)} onConfirm={confirmDelete} loading={deleteLoading} />}

      <div style={{ padding: '16px 16px 0' }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 800, color: '#f1f5f9' }}>Documents</h1>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>All business records</p>

        {/* Create button */}
        <button onClick={() => navigate('/documents/create')}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '14px 0', borderRadius: 18, border: 'none', cursor: 'pointer', marginBottom: 12,
            background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', fontWeight: 700, fontSize: 15,
            boxShadow: '0 4px 16px rgba(16,185,129,0.35)' }}>
          <Plus style={{ width: 20, height: 20 }} />
          Create Document
        </button>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'rgba(255,255,255,0.35)' }} />
          <input type="text" placeholder="Search by number or customer…" value={search}
            onChange={e => setSearch(e.target.value)} style={S.input} />
        </div>
      </div>

      {/* List */}
      <div style={{ padding: '0 16px 100px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <FileText style={{ width: 48, height: 48, color: 'rgba(255,255,255,0.2)', margin: '0 auto 12px' }} />
            <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.35)' }}>No documents found</p>
          </div>
        ) : filtered.map(doc => {
          const ts = TYPE_STYLE[doc.type] || TYPE_STYLE.challan;
          const isPaid = doc.paymentStatus === 'paid';
          return (
            <div key={doc.id} style={S.card}>
              {/* Top row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 800, fontSize: 15, color: '#f1f5f9' }}>{doc.invoiceNo || doc.documentNumber}</span>
                <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: ts.bg, color: ts.color }}>
                  {TYPE_LABEL[doc.type] || doc.type}
                </span>
                <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: isPaid ? '#34d399' : '#fb923c', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {isPaid ? <CheckCircle2 style={{ width: 12, height: 12 }} /> : <Clock style={{ width: 12, height: 12 }} />}
                  {isPaid ? 'Paid' : 'Unpaid'}
                </span>
              </div>
              {/* Info */}
              <div style={{ marginBottom: 12 }}>
                <p style={{ margin: '0 0 2px', fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{doc.customerName || '—'}</p>
                <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
                  {fmtDate(doc.date)} · <span style={{ color: '#f1f5f9', fontWeight: 700 }}>{fmt(doc.grandTotal || 0)}</span>
                </p>
              </div>
              {/* Actions */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => navigate(`/documents/edit/${doc.id}`)} style={{ ...S.btn('rgba(255,255,255,0.08)', '#f1f5f9'), flex: 1 }}>
                  <FileEdit style={{ width: 14, height: 14 }} /> Edit
                </button>
                <button onClick={() => navigate(`/documents/edit/${doc.id}?tab=pdf`)} style={S.iconBtn('rgba(99,102,241,0.15)', '#818cf8')}>
                  <Download style={{ width: 16, height: 16 }} />
                </button>
                <button onClick={() => setDeleteDoc(doc)} style={S.iconBtn('rgba(239,68,68,0.1)', '#f87171')}>
                  <Trash2 style={{ width: 16, height: 16 }} />
                </button>
              </div>
            </div>
          );
        })}

        {hasMore && (
          <button onClick={() => { setLoadingMore(true); load(docs.length); }} disabled={loadingMore}
            style={{ width: '100%', padding: '14px 0', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#818cf8' }}>
            {loadingMore ? 'Loading…' : 'Load More'}
          </button>
        )}
      </div>
    </div>
  );
}
