/**
 * MobileItems — APK-only items/products page.
 * 100% inline styles, zero Tailwind/CSS-var dependencies.
 */
import { useState, useEffect } from 'react';
import { Plus, Search, Package, Trash2, Edit } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCurrentProfile } from '../hooks/useCurrentProfile';
import { API_URL } from '../config/api';
import { toast } from 'sonner';
import { MOBILE_TOKENS, MOBILE_STYLES, formatCurrency } from './MobileDesignSystem';

const inp: React.CSSProperties = { ...MOBILE_STYLES.input };
const lbl: React.CSSProperties = { ...MOBILE_STYLES.label };

function Skeleton() {
  return (
    <div style={{ padding: `${MOBILE_TOKENS.spacing.lg}px ${MOBILE_TOKENS.spacing.lg}px calc(${MOBILE_TOKENS.safeAreaBottom} + 100px)` }}>
      {[1,2,3,4].map(i => <div key={i} style={{ height: 80, borderRadius: MOBILE_TOKENS.radius.lg, background: 'var(--muted)', marginBottom: MOBILE_TOKENS.spacing.md, animation: 'mpulse 1.4s ease-in-out infinite' }} />)}
      <style>{`@keyframes mpulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  );
}

function AddSheet({ onClose, onSaved, accessToken, deviceId, profileId }: any) {
  const [form, setForm] = useState<any>({ 
    name: '', 
    hsnSac: '',
    unit: 'pcs', 
    rate: 0,
    sellingPrice: 0,
    purchaseCost: 0,
    discount: 0,
    cgst: 9,
    sgst: 9,
    igst: 0,
    description: '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const save = async () => {
    if (!form.name.trim()) { toast.error('Item name required'); return; }
    setSaving(true);
    try {
      const r = await fetch(`${API_URL}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}`, 'X-Device-ID': deviceId, 'X-Profile-ID': profileId },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (d.error) { toast.error(d.error); return; }
      toast.success('Item added');
      onSaved(d);
    } catch { toast.error('Failed to add item'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ position: 'absolute', inset: 0, background: MOBILE_TOKENS.colors.overlay }} onClick={onClose} />
      <div style={{ position: 'relative', width: '100%', background: MOBILE_TOKENS.colors.surface, borderRadius: `${MOBILE_TOKENS.radius.xl}px ${MOBILE_TOKENS.radius.xl}px 0 0`, maxHeight: '90dvh', display: 'flex', flexDirection: 'column', boxShadow: '0 -12px 40px rgba(0,0,0,0.2)', fontFamily: 'system-ui,sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: `${MOBILE_TOKENS.spacing.md}px 0 ${MOBILE_TOKENS.spacing.xs}px` }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: MOBILE_TOKENS.colors.borderLight }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `${MOBILE_TOKENS.spacing.xs}px ${MOBILE_TOKENS.spacing.lg}px ${MOBILE_TOKENS.spacing.md}px`, borderBottom: `1px solid ${MOBILE_TOKENS.colors.border}` }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: MOBILE_TOKENS.colors.text }}>Add Item</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: MOBILE_TOKENS.colors.textMuted, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: `${MOBILE_TOKENS.spacing.lg}px ${MOBILE_TOKENS.spacing.lg}px`, display: 'flex', flexDirection: 'column', gap: MOBILE_TOKENS.spacing.lg }}>
          {/* Basic Info Section */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: MOBILE_TOKENS.colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: MOBILE_TOKENS.spacing.md, paddingBottom: MOBILE_TOKENS.spacing.md, borderBottom: `1px solid ${MOBILE_TOKENS.colors.border}` }}>Basic Info</div>
            <div style={{ marginBottom: MOBILE_TOKENS.spacing.md }}>
              <label style={lbl}>Item Name *</label>
              <input type="text" placeholder="e.g. Web Design Service" value={form.name} onChange={e => set('name', e.target.value)} style={inp} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: MOBILE_TOKENS.spacing.md, marginBottom: MOBILE_TOKENS.spacing.md }}>
              <div>
                <label style={lbl}>HSN/SAC Code</label>
                <input type="text" placeholder="998314" value={form.hsnSac} onChange={e => set('hsnSac', e.target.value)} style={inp} />
              </div>
              <div>
                <label style={lbl}>Unit</label>
                <input type="text" placeholder="pcs / kg / ltr" value={form.unit} onChange={e => set('unit', e.target.value)} style={inp} />
              </div>
            </div>
          </div>

          {/* Pricing Section */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: MOBILE_TOKENS.colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: MOBILE_TOKENS.spacing.md, paddingBottom: MOBILE_TOKENS.spacing.md, borderBottom: `1px solid ${MOBILE_TOKENS.colors.border}` }}>Pricing</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: MOBILE_TOKENS.spacing.md, marginBottom: MOBILE_TOKENS.spacing.md }}>
              <div>
                <label style={lbl}>Rate (₹)</label>
                <input type="number" step="0.01" inputMode="decimal" placeholder="0.00" value={form.rate} onChange={e => set('rate', parseFloat(e.target.value) || 0)} style={inp} />
              </div>
              <div>
                <label style={lbl}>Selling Price (₹)</label>
                <input type="number" step="0.01" inputMode="decimal" placeholder="0.00" value={form.sellingPrice} onChange={e => set('sellingPrice', parseFloat(e.target.value) || 0)} style={inp} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: MOBILE_TOKENS.spacing.md }}>
              <div>
                <label style={lbl}>Purchase Cost (₹)</label>
                <input type="number" step="0.01" inputMode="decimal" placeholder="0.00" value={form.purchaseCost} onChange={e => set('purchaseCost', parseFloat(e.target.value) || 0)} style={inp} />
              </div>
              <div>
                <label style={lbl}>Discount %</label>
                <input type="number" step="0.01" inputMode="decimal" placeholder="0" value={form.discount} onChange={e => set('discount', parseFloat(e.target.value) || 0)} style={inp} />
              </div>
            </div>
          </div>

          {/* Tax Rates Section */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: MOBILE_TOKENS.colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: MOBILE_TOKENS.spacing.md, paddingBottom: MOBILE_TOKENS.spacing.md, borderBottom: `1px solid ${MOBILE_TOKENS.colors.border}` }}>Tax Rates</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: MOBILE_TOKENS.spacing.md }}>
              <div>
                <label style={lbl}>CGST %</label>
                <input type="number" step="0.01" inputMode="decimal" placeholder="0" value={form.cgst} onChange={e => set('cgst', parseFloat(e.target.value) || 0)} style={inp} />
              </div>
              <div>
                <label style={lbl}>SGST %</label>
                <input type="number" step="0.01" inputMode="decimal" placeholder="0" value={form.sgst} onChange={e => set('sgst', parseFloat(e.target.value) || 0)} style={inp} />
              </div>
              <div>
                <label style={lbl}>IGST %</label>
                <input type="number" step="0.01" inputMode="decimal" placeholder="0" value={form.igst} onChange={e => set('igst', parseFloat(e.target.value) || 0)} style={inp} />
              </div>
            </div>
          </div>

          {/* Description Section */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: MOBILE_TOKENS.colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: MOBILE_TOKENS.spacing.md, paddingBottom: MOBILE_TOKENS.spacing.md, borderBottom: `1px solid ${MOBILE_TOKENS.colors.border}` }}>Additional</div>
            <div>
              <label style={lbl}>Description</label>
              <textarea placeholder="Item description (optional)" value={form.description} onChange={e => set('description', e.target.value)} style={{ ...inp, minHeight: '80px', fontFamily: 'system-ui,sans-serif' }} />
            </div>
          </div>
        </div>
        <div style={{ padding: `${MOBILE_TOKENS.spacing.md}px ${MOBILE_TOKENS.spacing.lg}px`, paddingBottom: `calc(${MOBILE_TOKENS.safeAreaBottom} + ${MOBILE_TOKENS.spacing.md}px)`, borderTop: `1px solid ${MOBILE_TOKENS.colors.border}`, display: 'flex', gap: MOBILE_TOKENS.spacing.md }}>
          <button onClick={onClose} style={{ flex: 1, height: 48, borderRadius: MOBILE_TOKENS.radius.lg, border: `1px solid ${MOBILE_TOKENS.colors.border}`, background: 'var(--muted)', color: MOBILE_TOKENS.colors.text, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          <button onClick={save} disabled={saving} style={{ flex: 2, height: 48, borderRadius: MOBILE_TOKENS.radius.lg, border: 'none', background: MOBILE_TOKENS.colors.accent, color: 'var(--primary-foreground)', fontSize: 15, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving…' : 'Add Item'}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditSheet({ item, onClose, onSaved, accessToken, deviceId, profileId }: any) {
  const [form, setForm] = useState<any>(item || {});
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const save = async () => {
    if (!form.name.trim()) { toast.error('Item name required'); return; }
    setSaving(true);
    try {
      const r = await fetch(`${API_URL}/items/${form.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}`, 'X-Device-ID': deviceId, 'X-Profile-ID': profileId },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (d.error) { toast.error(d.error); return; }
      toast.success('Item updated');
      onSaved(d);
    } catch { toast.error('Failed to update item'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ position: 'absolute', inset: 0, background: MOBILE_TOKENS.colors.overlay }} onClick={onClose} />
      <div style={{ position: 'relative', width: '100%', background: MOBILE_TOKENS.colors.surface, borderRadius: `${MOBILE_TOKENS.radius.xl}px ${MOBILE_TOKENS.radius.xl}px 0 0`, maxHeight: '90dvh', display: 'flex', flexDirection: 'column', boxShadow: '0 -12px 40px rgba(0,0,0,0.5)', fontFamily: 'system-ui,sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: `${MOBILE_TOKENS.spacing.md}px 0 ${MOBILE_TOKENS.spacing.xs}px` }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: MOBILE_TOKENS.colors.borderLight }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `${MOBILE_TOKENS.spacing.xs}px ${MOBILE_TOKENS.spacing.lg}px ${MOBILE_TOKENS.spacing.md}px`, borderBottom: `1px solid ${MOBILE_TOKENS.colors.border}` }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: MOBILE_TOKENS.colors.text }}>Edit Item</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: MOBILE_TOKENS.colors.textMuted, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: `${MOBILE_TOKENS.spacing.lg}px ${MOBILE_TOKENS.spacing.lg}px`, display: 'flex', flexDirection: 'column', gap: MOBILE_TOKENS.spacing.lg }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: MOBILE_TOKENS.colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: MOBILE_TOKENS.spacing.md, paddingBottom: MOBILE_TOKENS.spacing.md, borderBottom: `1px solid ${MOBILE_TOKENS.colors.border}` }}>Basic Info</div>
            <div style={{ marginBottom: MOBILE_TOKENS.spacing.md }}>
              <label style={lbl}>Item Name *</label>
              <input type="text" placeholder="e.g. Web Design Service" value={form.name} onChange={e => set('name', e.target.value)} style={inp} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: MOBILE_TOKENS.spacing.md, marginBottom: MOBILE_TOKENS.spacing.md }}>
              <div>
                <label style={lbl}>HSN/SAC Code</label>
                <input type="text" placeholder="998314" value={form.hsnSac} onChange={e => set('hsnSac', e.target.value)} style={inp} />
              </div>
              <div>
                <label style={lbl}>Unit</label>
                <input type="text" placeholder="pcs / kg / ltr" value={form.unit} onChange={e => set('unit', e.target.value)} style={inp} />
              </div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: MOBILE_TOKENS.colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: MOBILE_TOKENS.spacing.md, paddingBottom: MOBILE_TOKENS.spacing.md, borderBottom: `1px solid ${MOBILE_TOKENS.colors.border}` }}>Pricing</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: MOBILE_TOKENS.spacing.md, marginBottom: MOBILE_TOKENS.spacing.md }}>
              <div>
                <label style={lbl}>Rate (₹)</label>
                <input type="number" step="0.01" inputMode="decimal" placeholder="0.00" value={form.rate} onChange={e => set('rate', parseFloat(e.target.value) || 0)} style={inp} />
              </div>
              <div>
                <label style={lbl}>Selling Price (₹)</label>
                <input type="number" step="0.01" inputMode="decimal" placeholder="0.00" value={form.sellingPrice} onChange={e => set('sellingPrice', parseFloat(e.target.value) || 0)} style={inp} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: MOBILE_TOKENS.spacing.md }}>
              <div>
                <label style={lbl}>Purchase Cost (₹)</label>
                <input type="number" step="0.01" inputMode="decimal" placeholder="0.00" value={form.purchaseCost} onChange={e => set('purchaseCost', parseFloat(e.target.value) || 0)} style={inp} />
              </div>
              <div>
                <label style={lbl}>Discount %</label>
                <input type="number" step="0.01" inputMode="decimal" placeholder="0" value={form.discount} onChange={e => set('discount', parseFloat(e.target.value) || 0)} style={inp} />
              </div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: MOBILE_TOKENS.colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: MOBILE_TOKENS.spacing.md, paddingBottom: MOBILE_TOKENS.spacing.md, borderBottom: `1px solid ${MOBILE_TOKENS.colors.border}` }}>Tax Rates</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: MOBILE_TOKENS.spacing.md }}>
              <div>
                <label style={lbl}>CGST %</label>
                <input type="number" step="0.01" inputMode="decimal" placeholder="0" value={form.cgst} onChange={e => set('cgst', parseFloat(e.target.value) || 0)} style={inp} />
              </div>
              <div>
                <label style={lbl}>SGST %</label>
                <input type="number" step="0.01" inputMode="decimal" placeholder="0" value={form.sgst} onChange={e => set('sgst', parseFloat(e.target.value) || 0)} style={inp} />
              </div>
              <div>
                <label style={lbl}>IGST %</label>
                <input type="number" step="0.01" inputMode="decimal" placeholder="0" value={form.igst} onChange={e => set('igst', parseFloat(e.target.value) || 0)} style={inp} />
              </div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: MOBILE_TOKENS.colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: MOBILE_TOKENS.spacing.md, paddingBottom: MOBILE_TOKENS.spacing.md, borderBottom: `1px solid ${MOBILE_TOKENS.colors.border}` }}>Additional</div>
            <div>
              <label style={lbl}>Description</label>
              <textarea placeholder="Item description (optional)" value={form.description} onChange={e => set('description', e.target.value)} style={{ ...inp, minHeight: '80px', fontFamily: 'system-ui,sans-serif' }} />
            </div>
          </div>
        </div>
        <div style={{ padding: `${MOBILE_TOKENS.spacing.md}px ${MOBILE_TOKENS.spacing.lg}px`, paddingBottom: `calc(${MOBILE_TOKENS.safeAreaBottom} + ${MOBILE_TOKENS.spacing.md}px)`, borderTop: `1px solid ${MOBILE_TOKENS.colors.border}`, display: 'flex', gap: MOBILE_TOKENS.spacing.md }}>
          <button onClick={onClose} style={{ flex: 1, height: 48, borderRadius: MOBILE_TOKENS.radius.lg, border: `1px solid ${MOBILE_TOKENS.colors.border}`, background: 'var(--muted)', color: MOBILE_TOKENS.colors.text, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          <button onClick={save} disabled={saving} style={{ flex: 2, height: 48, borderRadius: MOBILE_TOKENS.radius.lg, border: 'none', background: MOBILE_TOKENS.colors.accent, color: 'var(--primary-foreground)', fontSize: 15, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteSheet({ item, onCancel, onConfirm, loading }: any) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ position: 'absolute', inset: 0, background: MOBILE_TOKENS.colors.overlay }} onClick={onCancel} />
      <div style={{ position: 'relative', width: '100%', background: MOBILE_TOKENS.colors.surface, borderRadius: `${MOBILE_TOKENS.radius.xl}px ${MOBILE_TOKENS.radius.xl}px 0 0`, padding: `${MOBILE_TOKENS.spacing.lg}px ${MOBILE_TOKENS.spacing.lg}px`, paddingBottom: `calc(${MOBILE_TOKENS.safeAreaBottom} + ${MOBILE_TOKENS.spacing.lg}px)`, boxShadow: '0 -12px 40px rgba(0,0,0,0.5)', fontFamily: 'system-ui,sans-serif' }}>
        <p style={{ margin: `0 0 ${MOBILE_TOKENS.spacing.xs}px`, textAlign: 'center', fontSize: 17, fontWeight: 700, color: MOBILE_TOKENS.colors.text }}>Delete Item?</p>
        <p style={{ margin: `0 0 ${MOBILE_TOKENS.spacing.lg}px`, textAlign: 'center', fontSize: 13, color: MOBILE_TOKENS.colors.textMuted }}>{item?.name} will be permanently deleted.</p>
        <div style={{ display: 'flex', gap: MOBILE_TOKENS.spacing.md }}>
          <button onClick={onCancel} style={{ flex: 1, height: 48, borderRadius: MOBILE_TOKENS.radius.lg, border: `1px solid ${MOBILE_TOKENS.colors.border}`, background: 'var(--muted)', color: MOBILE_TOKENS.colors.text, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          <button onClick={onConfirm} disabled={loading} style={{ flex: 1, height: 48, borderRadius: MOBILE_TOKENS.radius.lg, border: 'none', background: MOBILE_TOKENS.colors.error, color: 'var(--primary-foreground)', fontSize: 15, fontWeight: 700, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function MobileItems() {
  const [items, setItems] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { accessToken, deviceId } = useAuth();
  const { profileId } = useCurrentProfile();

  useEffect(() => {
    if (!accessToken || !profileId) { setLoading(false); return; }
    fetch(`${API_URL}/items`, {
      headers: { Authorization: `Bearer ${accessToken}`, 'X-Device-ID': deviceId, 'X-Profile-ID': profileId },
    }).then(r => r.json()).then(d => { if (!d.error) { setItems(d); setFiltered(d); } })
      .catch(() => toast.error('Failed to load items'))
      .finally(() => setLoading(false));
  }, [accessToken, profileId]);

  useEffect(() => {
    if (!search.trim()) { setFiltered(items); return; }
    const q = search.toLowerCase();
    setFiltered(items.filter(i => (i.name || '').toLowerCase().includes(q) || (i.hsnSac || '').includes(q)));
  }, [search, items]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const r = await fetch(`${API_URL}/items/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}`, 'X-Device-ID': deviceId, 'X-Profile-ID': profileId },
      });
      if (!r.ok) throw new Error();
      setItems(p => p.filter(i => i.id !== deleteTarget.id));
      toast.success('Item deleted');
      setDeleteTarget(null);
    } catch { toast.error('Delete failed'); }
    finally { setDeleteLoading(false); }
  };

  if (loading) return <Skeleton />;

  return (
    <div style={{ fontFamily: 'system-ui,-apple-system,sans-serif' }}>
      {showAdd && (
        <AddSheet
          onClose={() => setShowAdd(false)}
          onSaved={(i: any) => { setItems(p => [...p, i]); setShowAdd(false); }}
          accessToken={accessToken} deviceId={deviceId} profileId={profileId}
        />
      )}
      {showEdit && editingItem && (
        <EditSheet
          item={editingItem}
          onClose={() => { setShowEdit(false); setEditingItem(null); }}
          onSaved={(i: any) => { setItems(p => p.map(x => x.id === i.id ? i : x)); setShowEdit(false); setEditingItem(null); }}
          accessToken={accessToken} deviceId={deviceId} profileId={profileId}
        />
      )}
      {deleteTarget && (
        <DeleteSheet item={deleteTarget} onCancel={() => setDeleteTarget(null)} onConfirm={confirmDelete} loading={deleteLoading} />
      )}

      <div style={{ padding: `${MOBILE_TOKENS.spacing.lg}px ${MOBILE_TOKENS.spacing.lg}px 0` }}>
        <h1 style={{ margin: `0 0 ${MOBILE_TOKENS.spacing.xs}px`, fontSize: 24, fontWeight: 800, color: MOBILE_TOKENS.colors.text }}>Items</h1>
        <p style={{ margin: `0 0 ${MOBILE_TOKENS.spacing.lg}px`, fontSize: 13, color: MOBILE_TOKENS.colors.textSecondary }}>{items.length} products</p>

        <button onClick={() => setShowAdd(true)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: MOBILE_TOKENS.spacing.md,
            padding: `${MOBILE_TOKENS.spacing.lg * 0.875}px 0`, borderRadius: MOBILE_TOKENS.radius.xl, border: 'none', cursor: 'pointer', marginBottom: MOBILE_TOKENS.spacing.md,
            background: `linear-gradient(135deg,${MOBILE_TOKENS.colors.accent},#6366f1)`, color: 'var(--primary-foreground)', fontWeight: 700, fontSize: 15,
            boxShadow: `0 4px 16px rgba(79,70,229,0.35)` }}>
          <Plus style={{ width: 20, height: 20 }} /> Add Item
        </button>

        <div style={{ position: 'relative', marginBottom: MOBILE_TOKENS.spacing.lg }}>
          <Search style={{ position: 'absolute', left: MOBILE_TOKENS.spacing.md, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: MOBILE_TOKENS.colors.textSecondary }} />
          <input type="text" placeholder="Search items…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: `${MOBILE_TOKENS.spacing.md * 0.6875}px ${MOBILE_TOKENS.spacing.md}px ${MOBILE_TOKENS.spacing.md * 0.6875}px ${MOBILE_TOKENS.spacing.lg}px`, borderRadius: MOBILE_TOKENS.radius.md, border: `1px solid ${MOBILE_TOKENS.colors.border}`, background: 'var(--input-background)', color: MOBILE_TOKENS.colors.text, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'system-ui,sans-serif' }} />
        </div>
      </div>

      <div style={{ padding: `0 ${MOBILE_TOKENS.spacing.lg}px calc(${MOBILE_TOKENS.safeAreaBottom} + 100px)` }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <Package style={{ width: 48, height: 48, color: 'rgba(255,255,255,0.2)', margin: '0 auto 12px' }} />
            <p style={{ margin: 0, fontSize: 14, color: MOBILE_TOKENS.colors.textSecondary }}>No items found</p>
          </div>
        ) : filtered.map(i => (
          <div key={i.id} style={{ background: 'var(--muted)', borderRadius: MOBILE_TOKENS.radius.xl, border: `1px solid ${MOBILE_TOKENS.colors.border}`, padding: MOBILE_TOKENS.spacing.lg, marginBottom: MOBILE_TOKENS.spacing.md }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: MOBILE_TOKENS.spacing.md, marginBottom: MOBILE_TOKENS.spacing.md }}>
              <div style={{ width: 48, height: 48, borderRadius: MOBILE_TOKENS.radius.lg, background: 'rgba(34,197,94,0.2)', border: '1px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 800, fontSize: 18, color: '#4ade80' }}>
                {String(i.name || 'I')[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: `0 0 ${MOBILE_TOKENS.spacing.xs * 0.25}px`, fontSize: 15, fontWeight: 700, color: MOBILE_TOKENS.colors.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.name}</p>
                {i.hsnSac && <p style={{ margin: 0, fontSize: 12, color: MOBILE_TOKENS.colors.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>HSN: {i.hsnSac}</p>}
                {i.description && <p style={{ margin: 0, fontSize: 11, color: MOBILE_TOKENS.colors.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.description}</p>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: MOBILE_TOKENS.spacing.md, marginBottom: MOBILE_TOKENS.spacing.md, fontSize: 13, color: MOBILE_TOKENS.colors.textMuted, paddingBottom: MOBILE_TOKENS.spacing.md, borderBottom: `1px solid rgba(255,255,255,0.05)` }}>
              <span style={{ fontWeight: 600, color: MOBILE_TOKENS.colors.accent }}>₹{formatCurrency(i.rate || 0)}</span>
              <span>•</span>
              <span>{i.unit}</span>
              {i.cgst || i.sgst || i.igst ? <span>• Tax: {((i.cgst || 0) + (i.sgst || 0) + (i.igst || 0)).toFixed(1)}%</span> : null}
            </div>
            <div style={{ display: 'flex', gap: MOBILE_TOKENS.spacing.xs }}>
              <button onClick={() => { setEditingItem(i); setShowEdit(true); }}
                style={{ flex: 1, padding: `${MOBILE_TOKENS.spacing.md * 0.5625}px 0`, borderRadius: MOBILE_TOKENS.radius.md, border: `1px solid var(--primary)30`, background: 'var(--primary)12', color: 'var(--primary)', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: MOBILE_TOKENS.spacing.xs * 0.625 }}>
                <Edit style={{ width: 14, height: 14 }} /> Edit
              </button>
              <button onClick={() => setDeleteTarget(i)}
                style={{ width: 38, height: 38, borderRadius: MOBILE_TOKENS.radius.md, border: `1px solid rgba(239,68,68,0.2)`, background: 'rgba(239,68,68,0.08)', color: MOBILE_TOKENS.colors.error, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trash2 style={{ width: 15, height: 15 }} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

