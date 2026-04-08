/**
 * MobileItems — APK-only items/products page.
 * 100% inline styles, zero Tailwind/CSS-var dependencies.
 */
import { useState, useEffect } from 'react';
import { Plus, Search, Package, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCurrentProfile } from '../hooks/useCurrentProfile';
import { API_URL } from '../config/api';
import { toast } from 'sonner';

const inp: React.CSSProperties = { width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)', color: '#f1f5f9', fontSize: 15, outline: 'none', boxSizing: 'border-box', fontFamily: 'system-ui,sans-serif' };
const lbl: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6, fontFamily: 'system-ui,sans-serif' };

function fmt(n: number) { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n); }

function AddSheet({ onClose, onSaved, accessToken, deviceId, profileId }: any) {
  const [form, setForm] = useState({ name: '', description: '', price: '', unit: 'pcs', hsn: '', gstRate: '18', type: 'product' });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const save = async () => {
    if (!form.name.trim()) { toast.error('Item name required'); return; }
    setSaving(true);
    try {
      const r = await fetch(`${API_URL}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}`, 'X-Device-ID': deviceId, 'X-Profile-ID': profileId },
        body: JSON.stringify({ ...form, price: Number(form.price) || 0, gstRate: Number(form.gstRate) || 0 }),
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
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} onClick={onClose} />
      <div style={{ position: 'relative', width: '100%', background: '#1e293b', borderRadius: '24px 24px 0 0', maxHeight: '90dvh', display: 'flex', flexDirection: 'column', boxShadow: '0 -12px 40px rgba(0,0,0,0.5)', fontFamily: 'system-ui,sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#f1f5f9' }}>Add Item</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'rgba(255,255,255,0.4)', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={lbl}>Item Name *</label>
            <input type="text" placeholder="e.g. Web Design Service" value={form.name} onChange={e => set('name', e.target.value)} style={inp} />
          </div>
          <div>
            <label style={lbl}>Description</label>
            <input type="text" placeholder="Optional description" value={form.description} onChange={e => set('description', e.target.value)} style={inp} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>Price (₹)</label>
              <input type="text" inputMode="decimal" placeholder="0.00" value={form.price} onChange={e => set('price', e.target.value)} style={inp} />
            </div>
            <div>
              <label style={lbl}>Unit</label>
              <input type="text" placeholder="pcs / kg / hr" value={form.unit} onChange={e => set('unit', e.target.value)} style={inp} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>HSN Code</label>
              <input type="text" inputMode="numeric" placeholder="998314" value={form.hsn} onChange={e => set('hsn', e.target.value)} style={inp} />
            </div>
            <div>
              <label style={lbl}>GST Rate %</label>
              <select value={form.gstRate} onChange={e => set('gstRate', e.target.value)}
                style={{ ...inp, appearance: 'none' }}>
                {['0','5','12','18','28'].map(r => <option key={r} value={r}>{r}%</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={lbl}>Type</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['product', 'service'].map(t => (
                <button key={t} type="button" onClick={() => set('type', t)}
                  style={{ flex: 1, padding: '10px 0', borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, textTransform: 'capitalize',
                    background: form.type === t ? '#4f46e5' : 'rgba(255,255,255,0.06)',
                    color: form.type === t ? '#fff' : 'rgba(255,255,255,0.5)' }}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ padding: '12px 20px', paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 12px)', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, height: 48, borderRadius: 14, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: '#f1f5f9', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          <button onClick={save} disabled={saving} style={{ flex: 2, height: 48, borderRadius: 14, border: 'none', background: '#4f46e5', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving…' : 'Add Item'}
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
    setFiltered(items.filter(i => (i.name || '').toLowerCase().includes(q)));
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

  if (loading) return (
    <div style={{ padding: '16px 16px 100px' }}>
      {[1,2,3,4].map(i => <div key={i} style={{ height: 72, borderRadius: 16, background: 'rgba(255,255,255,0.06)', marginBottom: 10, animation: 'mpulse 1.4s ease-in-out infinite' }} />)}
      <style>{`@keyframes mpulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  );

  return (
    <div style={{ fontFamily: 'system-ui,-apple-system,sans-serif' }}>
      {showAdd && <AddSheet onClose={() => setShowAdd(false)} onSaved={(i: any) => { setItems(p => [...p, i]); setShowAdd(false); }} accessToken={accessToken} deviceId={deviceId} profileId={profileId} />}
      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} onClick={() => setDeleteTarget(null)} />
          <div style={{ position: 'relative', width: '100%', background: '#1e293b', borderRadius: '24px 24px 0 0', padding: '24px 20px', paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 20px)', boxShadow: '0 -12px 40px rgba(0,0,0,0.5)', fontFamily: 'system-ui,sans-serif' }}>
            <p style={{ margin: '0 0 6px', textAlign: 'center', fontSize: 17, fontWeight: 700, color: '#f1f5f9' }}>Delete Item?</p>
            <p style={{ margin: '0 0 20px', textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{deleteTarget.name}</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteTarget(null)} style={{ flex: 1, height: 48, borderRadius: 14, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: '#f1f5f9', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={confirmDelete} disabled={deleteLoading} style={{ flex: 1, height: 48, borderRadius: 14, border: 'none', background: '#dc2626', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', opacity: deleteLoading ? 0.6 : 1 }}>
                {deleteLoading ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: '16px 16px 0' }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 800, color: '#f1f5f9' }}>Items</h1>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>{items.length} products & services</p>

        <button onClick={() => setShowAdd(true)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '14px 0', borderRadius: 18, border: 'none', cursor: 'pointer', marginBottom: 12,
            background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff', fontWeight: 700, fontSize: 15,
            boxShadow: '0 4px 16px rgba(245,158,11,0.35)' }}>
          <Plus style={{ width: 20, height: 20 }} /> Add Item
        </button>

        <div style={{ position: 'relative', marginBottom: 16 }}>
          <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'rgba(255,255,255,0.35)' }} />
          <input type="text" placeholder="Search items…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '11px 12px 11px 38px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)', color: '#f1f5f9', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'system-ui,sans-serif' }} />
        </div>
      </div>

      <div style={{ padding: '0 16px 100px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <Package style={{ width: 48, height: 48, color: 'rgba(255,255,255,0.2)', margin: '0 auto 12px' }} />
            <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.35)' }}>No items found</p>
          </div>
        ) : filtered.map(item => (
          <div key={item.id} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', padding: '14px 16px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Package style={{ width: 20, height: 20, color: '#fbbf24' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 700, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</p>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24' }}>{fmt(item.price || 0)}</span>
                {item.unit && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>/ {item.unit}</span>}
                {item.gstRate > 0 && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>GST {item.gstRate}%</span>}
              </div>
            </div>
            <button onClick={() => setDeleteTarget(item)}
              style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.08)', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Trash2 style={{ width: 15, height: 15 }} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
