/**
 * MobileCustomers — APK-only customers page.
 * 100% inline styles, zero Tailwind/CSS-var dependencies.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Search, User, Phone, Mail, Edit, Trash2, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCurrentProfile } from '../hooks/useCurrentProfile';
import { API_URL } from '../config/api';
import { toast } from 'sonner';

const inp: React.CSSProperties = { width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)', color: '#f1f5f9', fontSize: 15, outline: 'none', boxSizing: 'border-box', fontFamily: 'system-ui,sans-serif' };
const lbl: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6, fontFamily: 'system-ui,sans-serif' };

function Skeleton() {
  return (
    <div style={{ padding: '16px 16px 100px' }}>
      {[1,2,3,4].map(i => <div key={i} style={{ height: 80, borderRadius: 16, background: 'rgba(255,255,255,0.06)', marginBottom: 10, animation: 'mpulse 1.4s ease-in-out infinite' }} />)}
      <style>{`@keyframes mpulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  );
}

function AddSheet({ onClose, onSaved, accessToken, deviceId, profileId }: any) {
  const [form, setForm] = useState({ name: '', ownerName: '', phone: '', email: '', gstin: '' });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const save = async () => {
    if (!form.name.trim()) { toast.error('Party name required'); return; }
    setSaving(true);
    try {
      const r = await fetch(`${API_URL}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}`, 'X-Device-ID': deviceId, 'X-Profile-ID': profileId },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (d.error) { toast.error(d.error); return; }
      toast.success('Customer added');
      onSaved(d);
    } catch { toast.error('Failed to add customer'); }
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
          <span style={{ fontSize: 17, fontWeight: 700, color: '#f1f5f9' }}>Add Customer</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'rgba(255,255,255,0.4)', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { key: 'name', label: 'Party / Business Name *', placeholder: 'e.g. Sharma Traders' },
            { key: 'ownerName', label: 'Owner Name', placeholder: 'e.g. Ramesh Sharma' },
            { key: 'phone', label: 'Phone', placeholder: '+91 98765 43210', type: 'tel' },
            { key: 'email', label: 'Email', placeholder: 'email@example.com', inputMode: 'email' },
            { key: 'gstin', label: 'GSTIN', placeholder: '22AAAAA0000A1Z5', autoCapitalize: 'characters' },
          ].map(f => (
            <div key={f.key}>
              <label style={lbl}>{f.label}</label>
              <input
                type={f.type || 'text'}
                inputMode={(f.inputMode as any) || undefined}
                autoCapitalize={(f.autoCapitalize as any) || 'none'}
                autoCorrect="off"
                placeholder={f.placeholder}
                value={(form as any)[f.key]}
                onChange={e => set(f.key, e.target.value)}
                style={inp}
              />
            </div>
          ))}
        </div>
        <div style={{ padding: '12px 20px', paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 12px)', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, height: 48, borderRadius: 14, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: '#f1f5f9', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          <button onClick={save} disabled={saving} style={{ flex: 2, height: 48, borderRadius: 14, border: 'none', background: '#4f46e5', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving…' : 'Add Customer'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteSheet({ customer, onCancel, onConfirm, loading }: any) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} onClick={onCancel} />
      <div style={{ position: 'relative', width: '100%', background: '#1e293b', borderRadius: '24px 24px 0 0', padding: '24px 20px', paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 20px)', boxShadow: '0 -12px 40px rgba(0,0,0,0.5)', fontFamily: 'system-ui,sans-serif' }}>
        <p style={{ margin: '0 0 6px', textAlign: 'center', fontSize: 17, fontWeight: 700, color: '#f1f5f9' }}>Delete Customer?</p>
        <p style={{ margin: '0 0 20px', textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{customer?.name} will be permanently deleted.</p>
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

export function MobileCustomers() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { accessToken, deviceId } = useAuth();
  const { profileId } = useCurrentProfile();
  const navigate = useNavigate();

  useEffect(() => {
    if (!accessToken || !profileId) { setLoading(false); return; }
    fetch(`${API_URL}/customers`, {
      headers: { Authorization: `Bearer ${accessToken}`, 'X-Device-ID': deviceId, 'X-Profile-ID': profileId },
    }).then(r => r.json()).then(d => { if (!d.error) { setCustomers(d); setFiltered(d); } })
      .catch(() => toast.error('Failed to load customers'))
      .finally(() => setLoading(false));
  }, [accessToken, profileId]);

  useEffect(() => {
    if (!search.trim()) { setFiltered(customers); return; }
    const q = search.toLowerCase();
    setFiltered(customers.filter(c => (c.name || '').toLowerCase().includes(q) || (c.phone || '').includes(q)));
  }, [search, customers]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const r = await fetch(`${API_URL}/customers/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}`, 'X-Device-ID': deviceId, 'X-Profile-ID': profileId },
      });
      if (!r.ok) throw new Error();
      setCustomers(p => p.filter(c => c.id !== deleteTarget.id));
      toast.success('Customer deleted');
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
          onSaved={(c: any) => { setCustomers(p => [...p, c]); setShowAdd(false); }}
          accessToken={accessToken} deviceId={deviceId} profileId={profileId}
        />
      )}
      {deleteTarget && (
        <DeleteSheet customer={deleteTarget} onCancel={() => setDeleteTarget(null)} onConfirm={confirmDelete} loading={deleteLoading} />
      )}

      <div style={{ padding: '16px 16px 0' }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 800, color: '#f1f5f9' }}>Customers</h1>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>{customers.length} parties</p>

        <button onClick={() => setShowAdd(true)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '14px 0', borderRadius: 18, border: 'none', cursor: 'pointer', marginBottom: 12,
            background: 'linear-gradient(135deg,#4f46e5,#6366f1)', color: '#fff', fontWeight: 700, fontSize: 15,
            boxShadow: '0 4px 16px rgba(79,70,229,0.35)' }}>
          <Plus style={{ width: 20, height: 20 }} /> Add Customer
        </button>

        <div style={{ position: 'relative', marginBottom: 16 }}>
          <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'rgba(255,255,255,0.35)' }} />
          <input type="text" placeholder="Search customers…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '11px 12px 11px 38px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)', color: '#f1f5f9', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'system-ui,sans-serif' }} />
        </div>
      </div>

      <div style={{ padding: '0 16px 100px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <User style={{ width: 48, height: 48, color: 'rgba(255,255,255,0.2)', margin: '0 auto 12px' }} />
            <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.35)' }}>No customers found</p>
          </div>
        ) : filtered.map(c => (
          <div key={c.id} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 18, border: '1px solid rgba(255,255,255,0.08)', padding: 16, marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 800, fontSize: 16, color: '#818cf8' }}>
                {String(c.name || 'C')[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: '0 0 2px', fontSize: 15, fontWeight: 700, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</p>
                {c.ownerName && <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>{c.ownerName}</p>}
              </div>
            </div>
            {(c.phone || c.email) && (
              <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                {c.phone && <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}><Phone style={{ width: 12, height: 12 }} />{c.phone}</span>}
                {c.email && <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><Mail style={{ width: 12, height: 12 }} />{c.email}</span>}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => navigate(`/documents?customerName=${encodeURIComponent(c.name)}`)}
                style={{ flex: 1, padding: '9px 0', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#f1f5f9', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                <ChevronRight style={{ width: 14, height: 14 }} /> View Docs
              </button>
              <button onClick={() => navigate(`/documents/create?customerId=${c.id}`)}
                style={{ flex: 1, padding: '9px 0', borderRadius: 12, border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.12)', color: '#a5b4fc', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                New Invoice
              </button>
              <button onClick={() => setDeleteTarget(c)}
                style={{ width: 38, height: 38, borderRadius: 10, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.08)', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trash2 style={{ width: 15, height: 15 }} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
