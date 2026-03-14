import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { ADMIN_API_URL as API_URL } from '../../config/api';
import { toast } from 'sonner';
import { ShieldCheck, Plus, ToggleLeft, ToggleRight, KeyRound, X } from 'lucide-react';

export function MasterAdminAdminAccountsPage() {
  const navigate = useNavigate();
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'admin' });
  const [resetTarget, setResetTarget] = useState<any>(null);
  const [resetPw, setResetPw] = useState('');
  const [resetting, setResetting] = useState(false);

  const token = () => localStorage.getItem('masterAdminToken');
  const me = JSON.parse(localStorage.getItem('masterAdmin') || '{}');

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const res = await fetch(`${API_URL}/master-admin/auth/admins`, { headers: { Authorization: `Bearer ${token()}` } });
      const data = await res.json();
      if (data.error) { toast.error(data.error); navigate('/dashboard'); return; }
      setAdmins(data.admins || []);
    } catch { toast.error('Failed to load admins'); }
    finally { setLoading(false); }
  };

  const createAdmin = async () => {
    if (!form.email || !form.password) { toast.error('Email and password are required'); return; }
    setCreating(true);
    try {
      const res = await fetch(`${API_URL}/master-admin/auth/admins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.error) toast.error(data.error);
      else { toast.success('Admin created'); setShowCreate(false); setForm({ email: '', password: '', name: '', role: 'admin' }); load(); }
    } catch { toast.error('Failed to create admin'); }
    finally { setCreating(false); }
  };

  const toggleAdmin = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/master-admin/auth/admins/${id}/toggle`, {
        method: 'POST', headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      if (data.error) toast.error(data.error);
      else { toast.success(`Admin ${data.status}`); load(); }
    } catch { toast.error('Failed to update admin'); }
  };

  const resetAdminPassword = async () => {
    if (!resetPw || resetPw.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setResetting(true);
    try {
      const res = await fetch(`${API_URL}/master-admin/auth/admins/${resetTarget._id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ newPassword: resetPw }),
      });
      const data = await res.json();
      if (data.error) toast.error(data.error);
      else { toast.success('Password reset'); setResetTarget(null); setResetPw(''); }
    } catch { toast.error('Failed to reset password'); }
    finally { setResetting(false); }
  };

  const ROLE_STYLE: Record<string, { bg: string; color: string; border: string }> = {
    super_admin: { bg: '#ede9fe', color: '#7c3aed', border: '#ddd6fe' },
    admin:       { bg: '#eef2ff', color: '#6366f1', border: '#c7d2fe' },
    support:     { bg: '#f1f5f9', color: '#64748b', border: '#e2e8f0' },
  };

  const inputStyle = {
    background: '#f8fafc', border: '1.5px solid #e2e8f0', color: '#1e1b4b',
    borderRadius: 14, padding: '10px 14px', fontSize: 14, fontWeight: 500,
    width: '100%', outline: 'none', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.04)',
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
            style={{ background: '#ffe4e6', border: '1.5px solid #fecdd3', boxShadow: '0 4px 12px rgba(244,63,94,0.15)' }}>
            <ShieldCheck className="h-5 w-5" style={{ color: '#f43f5e' }} />
          </div>
          <div>
            <h1 className="text-2xl font-black" style={{ color: '#1e1b4b' }}>Admin Accounts</h1>
            <p className="text-sm font-medium" style={{ color: '#94a3b8' }}>Manage admin access and roles</p>
          </div>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold text-white transition-all"
          style={{ background: 'linear-gradient(135deg,#f43f5e,#fb7185)', boxShadow: '0 6px 20px rgba(244,63,94,0.3)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}>
          <Plus className="h-4 w-4" />Add Admin
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 rounded-full border-rose-200 border-t-rose-500 animate-spin" style={{ borderWidth: 3 }} />
        </div>
      ) : (
        <div className="space-y-3">
          {admins.map(admin => {
            const rs = ROLE_STYLE[admin.role] || ROLE_STYLE.admin;
            return (
              <div key={admin._id} className="p-5 transition-all"
                style={{ background: 'rgba(255,255,255,0.8)', border: '1.5px solid rgba(255,255,255,0.9)', borderRadius: 20, boxShadow: '0 4px 16px rgba(244,63,94,0.06)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(244,63,94,0.1)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(244,63,94,0.06)'; }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-black"
                      style={{ background: admin.status === 'active' ? '#ffe4e6' : '#f1f5f9', color: admin.status === 'active' ? '#f43f5e' : '#94a3b8', border: `1.5px solid ${admin.status === 'active' ? '#fecdd3' : '#e2e8f0'}` }}>
                      {(admin.name || admin.email)[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <p className="font-black text-sm" style={{ color: '#1e1b4b' }}>{admin.name || '—'}</p>
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black"
                          style={{ background: rs.bg, color: rs.color, border: `1.5px solid ${rs.border}` }}>
                          {admin.role.replace('_', ' ').toUpperCase()}
                        </span>
                        {admin.status === 'disabled' && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black"
                            style={{ background: '#ffe4e6', color: '#f43f5e', border: '1.5px solid #fecdd3' }}>DISABLED</span>
                        )}
                        {admin.email === me.email && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black"
                            style={{ background: '#d1fae5', color: '#059669', border: '1.5px solid #a7f3d0' }}>YOU</span>
                        )}
                      </div>
                      <p className="text-sm font-medium" style={{ color: '#64748b' }}>{admin.email}</p>
                    </div>
                  </div>
                  {admin.role !== 'super_admin' && (
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setResetTarget(admin); setResetPw(''); }}
                        className="p-2.5 rounded-xl transition-all"
                        style={{ background: '#f1f5f9', color: '#64748b', border: '1.5px solid #e2e8f0' }}
                        title="Reset password"
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#eef2ff'; (e.currentTarget as HTMLElement).style.color = '#6366f1'; (e.currentTarget as HTMLElement).style.borderColor = '#c7d2fe'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#f1f5f9'; (e.currentTarget as HTMLElement).style.color = '#64748b'; (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0'; }}>
                        <KeyRound className="h-4 w-4" />
                      </button>
                      <button onClick={() => toggleAdmin(admin._id)}
                        className="p-2.5 rounded-xl transition-all"
                        style={{ background: '#f1f5f9', border: '1.5px solid #e2e8f0' }}
                        title={admin.status === 'active' ? 'Disable' : 'Enable'}>
                        {admin.status === 'active'
                          ? <ToggleRight className="h-5 w-5" style={{ color: '#10b981' }} />
                          : <ToggleLeft className="h-5 w-5" style={{ color: '#94a3b8' }} />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 flex items-center justify-center z-[50] p-4"
          style={{ background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md rounded-3xl overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.97)', border: '1.5px solid rgba(255,255,255,0.9)', boxShadow: '0 32px 80px rgba(244,63,94,0.15)' }}>
            <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1.5px solid #f1f5f9' }}>
              <h2 className="text-base font-black" style={{ color: '#1e1b4b' }}>Create Admin Account</h2>
              <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-xl"
                style={{ background: '#f1f5f9', color: '#94a3b8' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#ffe4e6'; (e.currentTarget as HTMLElement).style.color = '#f43f5e'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#f1f5f9'; (e.currentTarget as HTMLElement).style.color = '#94a3b8'; }}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {[
                { label: 'Name', type: 'text', placeholder: 'Full name', key: 'name' },
                { label: 'Email', type: 'email', placeholder: 'admin@example.com', key: 'email' },
                { label: 'Password', type: 'password', placeholder: 'Min 6 characters', key: 'password' },
              ].map(({ label, type, placeholder, key }) => (
                <div key={key}>
                  <label className="block text-xs font-black mb-2 uppercase tracking-wide" style={{ color: '#475569' }}>{label}</label>
                  <input type={type} placeholder={placeholder} style={inputStyle}
                    value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                </div>
              ))}
              <div>
                <label className="block text-xs font-black mb-2 uppercase tracking-wide" style={{ color: '#475569' }}>Role</label>
                <select style={inputStyle} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="admin">Admin — full access</option>
                  <option value="support">Support — read-only</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-5" style={{ borderTop: '1.5px solid #f1f5f9', background: '#fafafa' }}>
              <button onClick={() => setShowCreate(false)}
                className="flex-1 px-4 py-3 rounded-2xl text-sm font-bold transition-all"
                style={{ background: '#f1f5f9', border: '1.5px solid #e2e8f0', color: '#64748b' }}>Cancel</button>
              <button onClick={createAdmin} disabled={creating}
                className="flex-1 px-4 py-3 rounded-2xl text-sm font-black text-white disabled:opacity-50 transition-all"
                style={{ background: 'linear-gradient(135deg,#f43f5e,#fb7185)', boxShadow: '0 6px 20px rgba(244,63,94,0.3)' }}>
                {creating ? 'Creating...' : 'Create Admin'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetTarget && (
        <div className="fixed inset-0 flex items-center justify-center z-[50] p-4"
          style={{ background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-sm rounded-3xl overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.97)', border: '1.5px solid rgba(255,255,255,0.9)', boxShadow: '0 32px 80px rgba(244,63,94,0.15)' }}>
            <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1.5px solid #f1f5f9' }}>
              <h2 className="text-base font-black" style={{ color: '#1e1b4b' }}>Reset Password</h2>
              <button onClick={() => setResetTarget(null)} className="p-1.5 rounded-xl"
                style={{ background: '#f1f5f9', color: '#94a3b8' }}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm font-medium mb-4" style={{ color: '#64748b' }}>
                Resetting password for <span className="font-black" style={{ color: '#1e1b4b' }}>{resetTarget.email}</span>
              </p>
              <input type="password" placeholder="New password (min 6 chars)" style={inputStyle}
                value={resetPw} onChange={e => setResetPw(e.target.value)} />
            </div>
            <div className="flex gap-3 px-6 py-5" style={{ borderTop: '1.5px solid #f1f5f9', background: '#fafafa' }}>
              <button onClick={() => setResetTarget(null)}
                className="flex-1 px-4 py-3 rounded-2xl text-sm font-bold"
                style={{ background: '#f1f5f9', border: '1.5px solid #e2e8f0', color: '#64748b' }}>Cancel</button>
              <button onClick={resetAdminPassword} disabled={resetting}
                className="flex-1 px-4 py-3 rounded-2xl text-sm font-black text-white disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#f43f5e,#fb7185)', boxShadow: '0 6px 20px rgba(244,63,94,0.3)' }}>
                {resetting ? 'Resetting...' : 'Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
