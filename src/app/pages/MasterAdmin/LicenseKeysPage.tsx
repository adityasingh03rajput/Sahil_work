import { useEffect, useState } from 'react';
import { ADMIN_API_URL as API_URL } from '../../config/api';
import { toast } from 'sonner';
import { Plus, Key, X, Send, Ban, Search } from 'lucide-react';

const STATUS_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  pending: { bg: '#fef3c7', color: '#d97706', border: '#fde68a' },
  active:  { bg: '#d1fae5', color: '#059669', border: '#a7f3d0' },
  expired: { bg: '#f1f5f9', color: '#94a3b8', border: '#e2e8f0' },
  revoked: { bg: '#ffe4e6', color: '#f43f5e', border: '#fecdd3' },
};

export function MasterAdminLicenseKeysPage() {
  const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ assignedEmail: '', durationDays: '365', notes: '' });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const token = () => localStorage.getItem('masterAdminToken');

  useEffect(() => { loadKeys(); }, []);

  const loadKeys = async () => {
    setLoading(true);
    try {
      const params = search ? `?email=${encodeURIComponent(search)}` : '';
      const res = await fetch(`${API_URL}/master-admin/license-keys${params}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      if (data.error) toast.error(data.error);
      else setKeys(data.keys || []);
    } catch { toast.error('Failed to load license keys'); }
    finally { setLoading(false); }
  };

  const generateKey = async () => {
    const days = parseInt(String(form.durationDays), 10);
    if (!form.assignedEmail || !days || days <= 0) return toast.error('Email and valid duration are required');
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/master-admin/license-keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ ...form, durationDays: days }),
      });
      const data = await res.json();
      if (data.error) { toast.error(data.error); return; }
      toast.success(`Key generated and emailed to ${form.assignedEmail}`);
      setModal(false);
      setForm({ assignedEmail: '', durationDays: '365', notes: '' });
      loadKeys();
    } catch { toast.error('Failed to generate key'); }
    finally { setSaving(false); }
  };

  const revokeKey = async (id: string) => {
    if (!confirm('Revoke this license key? The user will lose access.')) return;
    try {
      const res = await fetch(`${API_URL}/master-admin/license-keys/${id}/revoke`, {
        method: 'POST', headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      if (data.error) toast.error(data.error);
      else { toast.success('Key revoked'); loadKeys(); }
    } catch { toast.error('Failed to revoke key'); }
  };

  const fmt = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const inputCls = {
    background: '#f8fafc',
    border: '1.5px solid #e2e8f0',
    color: '#1e1b4b',
    borderRadius: 16,
    padding: '10px 14px',
    fontSize: 14,
    fontWeight: 500,
    width: '100%',
    outline: 'none',
    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.04)',
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ color: '#1e1b4b' }}>License Keys</h1>
          <p className="text-sm font-medium mt-0.5" style={{ color: '#94a3b8' }}>Generate and manage activation keys</p>
        </div>
        <button onClick={() => setModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold text-white transition-all"
          style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 6px 20px rgba(99,102,241,0.35)', border: '1.5px solid rgba(255,255,255,0.2)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}>
          <Plus className="h-4 w-4" />Generate Key
        </button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#a5b4fc' }} />
          <input className="w-full pl-11 pr-4 py-3 rounded-2xl text-sm font-medium outline-none transition-all"
            style={{ background: 'rgba(255,255,255,0.8)', border: '1.5px solid #e2e8f0', color: '#1e1b4b', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}
            placeholder="Search by email..." value={search}
            onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadKeys()} />
        </div>
        <button onClick={loadKeys}
          className="px-4 py-2.5 rounded-2xl text-sm font-bold transition-all"
          style={{ background: 'rgba(255,255,255,0.8)', border: '1.5px solid #e2e8f0', color: '#64748b', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#eef2ff'; (e.currentTarget as HTMLElement).style.color = '#6366f1'; (e.currentTarget as HTMLElement).style.borderColor = '#c7d2fe'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.8)'; (e.currentTarget as HTMLElement).style.color = '#64748b'; (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0'; }}>
          Search
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 rounded-full border-indigo-200 border-t-indigo-500 animate-spin" style={{ borderWidth: 3 }} />
        </div>
      ) : (
        <div className="rounded-3xl overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.8)', border: '1.5px solid rgba(255,255,255,0.9)', boxShadow: '0 8px 32px rgba(99,102,241,0.08)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1.5px solid #f1f5f9', background: '#fafbff' }}>
                {['Key', 'Assigned Email', 'Duration', 'Status', 'Activated', 'Expires', ''].map(h => (
                  <th key={h} className="text-left px-5 py-4 text-[10px] font-black uppercase tracking-widest" style={{ color: '#94a3b8' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {keys.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-16">
                    <div className="w-14 h-14 rounded-3xl flex items-center justify-center mx-auto mb-3"
                      style={{ background: '#fef3c7', border: '1.5px solid #fde68a' }}>
                      <Key className="h-7 w-7" style={{ color: '#f59e0b' }} />
                    </div>
                    <p className="text-sm font-bold" style={{ color: '#94a3b8' }}>No license keys found</p>
                  </td>
                </tr>
              )}
              {keys.map(k => {
                const s = STATUS_STYLES[k.status] || STATUS_STYLES.pending;
                return (
                  <tr key={k._id} style={{ borderTop: '1px solid #f8fafc' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#fafbff'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                    <td className="px-5 py-4 font-mono text-xs font-bold" style={{ color: '#374151' }}>{k.key}</td>
                    <td className="px-5 py-4 text-xs font-medium" style={{ color: '#64748b' }}>{k.assignedEmail}</td>
                    <td className="px-5 py-4 text-xs font-semibold" style={{ color: '#94a3b8' }}>{k.durationDays}d</td>
                    <td className="px-5 py-4">
                      <span className="px-3 py-1.5 rounded-xl text-xs font-bold"
                        style={{ background: s.bg, color: s.color, border: `1.5px solid ${s.border}` }}>
                        {k.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs font-medium" style={{ color: '#94a3b8' }}>{k.activatedAt ? fmt(k.activatedAt) : '—'}</td>
                    <td className="px-5 py-4 text-xs font-medium" style={{ color: '#94a3b8' }}>{k.expiresAt ? fmt(k.expiresAt) : '—'}</td>
                    <td className="px-5 py-4">
                      {k.status !== 'revoked' && k.status !== 'expired' && (
                        <button onClick={() => revokeKey(k._id)} title="Revoke"
                          className="p-2 rounded-xl transition-all"
                          style={{ color: '#94a3b8', background: '#f1f5f9' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#f43f5e'; (e.currentTarget as HTMLElement).style.background = '#ffe4e6'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#94a3b8'; (e.currentTarget as HTMLElement).style.background = '#f1f5f9'; }}>
                          <Ban className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 flex items-center justify-center z-[50] p-4"
          style={{ background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)' }} onClick={() => setModal(false)}>
          <div className="w-full max-w-md rounded-3xl overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.97)', border: '1.5px solid rgba(255,255,255,0.9)', boxShadow: '0 32px 80px rgba(99,102,241,0.2)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1.5px solid #f1f5f9' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl flex items-center justify-center"
                  style={{ background: '#fef3c7', border: '1.5px solid #fde68a' }}>
                  <Key className="h-4 w-4" style={{ color: '#f59e0b' }} />
                </div>
                <h2 className="text-base font-black" style={{ color: '#1e1b4b' }}>Generate License Key</h2>
              </div>
              <button onClick={() => setModal(false)} className="p-1.5 rounded-xl transition-all"
                style={{ color: '#94a3b8', background: '#f1f5f9' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#ffe4e6'; (e.currentTarget as HTMLElement).style.color = '#f43f5e'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#f1f5f9'; (e.currentTarget as HTMLElement).style.color = '#94a3b8'; }}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-black mb-2 uppercase tracking-wide" style={{ color: '#475569' }}>Assigned Email</label>
                <input type="email" style={inputCls} placeholder="user@example.com"
                  value={form.assignedEmail} onChange={e => setForm(f => ({ ...f, assignedEmail: e.target.value }))} />
                <p className="text-xs mt-1.5 font-medium" style={{ color: '#94a3b8' }}>Key will be emailed and can only be activated by this user.</p>
              </div>
              <div>
                <label className="block text-xs font-black mb-2 uppercase tracking-wide" style={{ color: '#475569' }}>Duration (days)</label>
                <input type="number" min="1" style={inputCls}
                  value={form.durationDays} onChange={e => setForm(f => ({ ...f, durationDays: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-black mb-2 uppercase tracking-wide" style={{ color: '#475569' }}>Notes (optional)</label>
                <input style={inputCls} placeholder="e.g. Annual plan — Invoice #1234"
                  value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 px-6 py-5" style={{ borderTop: '1.5px solid #f1f5f9', background: '#fafafa' }}>
              <button onClick={() => setModal(false)}
                className="flex-1 px-4 py-3 rounded-2xl text-sm font-bold transition-all"
                style={{ background: '#f1f5f9', border: '1.5px solid #e2e8f0', color: '#64748b' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#e2e8f0'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#f1f5f9'; }}>
                Cancel
              </button>
              <button onClick={generateKey} disabled={saving}
                className="flex-1 px-4 py-3 rounded-2xl text-sm font-black text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 6px 20px rgba(99,102,241,0.35)' }}
                onMouseEnter={e => { if (!saving) (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}>
                <Send className="h-4 w-4" />{saving ? 'Generating...' : 'Generate & Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
