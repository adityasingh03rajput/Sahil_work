import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { ADMIN_API_URL as API_URL } from '../../config/api';
import { toast } from 'sonner';
import { Search, Users as UsersIcon, FileText, Building2, Mail, Phone, ExternalLink } from 'lucide-react';

export function MasterAdminUsersPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { loadUsers(); }, [search]);

  const loadUsers = async () => {
    try {
      const token = localStorage.getItem('masterAdminToken');
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      const res = await fetch(`${API_URL}/master-admin/users?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.error) toast.error(data.error);
      else setUsers(data.users || []);
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ color: '#1e1b4b' }}>All Users</h1>
          <p className="text-sm font-medium mt-0.5" style={{ color: '#94a3b8' }}>Every registered user across the platform</p>
        </div>
        <span className="text-xs px-3.5 py-2 rounded-2xl font-bold"
          style={{ background: '#eef2ff', color: '#6366f1', border: '1.5px solid #c7d2fe', boxShadow: '0 2px 8px rgba(99,102,241,0.1)' }}>
          {users.length} users
        </span>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#a5b4fc' }} />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, email or phone..."
          className="w-full pl-11 pr-4 py-3 rounded-2xl text-sm font-medium outline-none transition-all"
          style={{ background: 'rgba(255,255,255,0.8)', border: '1.5px solid #e2e8f0', color: '#1e1b4b', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}
          onFocus={e => { e.currentTarget.style.borderColor = '#a5b4fc'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(165,180,252,0.2)'; }}
          onBlur={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.04)'; }} />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 rounded-full border-indigo-200 border-t-indigo-500 animate-spin" style={{ borderWidth: 3 }} />
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 rounded-3xl"
          style={{ background: 'rgba(255,255,255,0.7)', border: '1.5px solid rgba(255,255,255,0.9)', boxShadow: '0 8px 32px rgba(99,102,241,0.06)' }}>
          <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4"
            style={{ background: '#eef2ff', border: '1.5px solid #c7d2fe' }}>
            <UsersIcon className="h-8 w-8" style={{ color: '#a5b4fc' }} />
          </div>
          <p className="text-sm font-bold" style={{ color: '#94a3b8' }}>No users found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map(user => (
            <div key={user._id} className="p-5 transition-all"
              style={{ background: 'rgba(255,255,255,0.8)', border: '1.5px solid rgba(255,255,255,0.9)', borderRadius: 20, boxShadow: '0 4px 16px rgba(99,102,241,0.06)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(99,102,241,0.1)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(99,102,241,0.06)'; }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-black flex-shrink-0"
                    style={{ background: '#eef2ff', color: '#6366f1', border: '1.5px solid #c7d2fe', boxShadow: '0 4px 12px rgba(99,102,241,0.15)' }}>
                    {(user.name || user.email || '?')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-sm font-bold" style={{ color: '#1e1b4b' }}>{user.name || 'Unnamed User'}</p>
                      {user.tenant && (
                        <span className="text-[10px] px-2.5 py-1 rounded-full font-black"
                          style={{ background: '#ede9fe', color: '#7c3aed', border: '1.5px solid #ddd6fe' }}>
                          SUBSCRIBER
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                      <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: '#64748b' }}>
                        <Mail className="h-3 w-3" style={{ color: '#a5b4fc' }} />{user.email}
                      </span>
                      {user.phone && (
                        <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: '#64748b' }}>
                          <Phone className="h-3 w-3" style={{ color: '#a5b4fc' }} />{user.phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 flex-shrink-0">
                  {[
                    { icon: Building2, val: user.stats?.profiles ?? 0,  label: 'Profiles',  bg: '#eef2ff',  color: '#6366f1' },
                    { icon: FileText,  val: user.stats?.documents ?? 0, label: 'Docs',      bg: '#d1fae5',  color: '#059669' },
                    { icon: UsersIcon, val: user.stats?.customers ?? 0, label: 'Customers', bg: '#ede9fe',  color: '#7c3aed' },
                  ].map(({ icon: Icon, val, label, bg, color }) => (
                    <div key={label} className="text-center hidden sm:block px-3 py-2 rounded-2xl"
                      style={{ background: bg, border: `1.5px solid ${color}30` }}>
                      <p className="text-base font-black" style={{ color }}>{val}</p>
                      <p className="text-[10px] font-bold" style={{ color: `${color}99` }}>{label}</p>
                    </div>
                  ))}
                  {user.tenant && (
                    <button onClick={() => navigate(`/subscribers/${user.tenant.id}`)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all ml-1"
                      style={{ background: '#ede9fe', color: '#7c3aed', border: '1.5px solid #ddd6fe' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#ddd6fe'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#ede9fe'; }}>
                      <ExternalLink className="h-3 w-3" />Manage
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
