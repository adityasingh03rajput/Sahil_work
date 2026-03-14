import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { ADMIN_API_URL as API_URL } from '../../config/api';
import { toast } from 'sonner';
import { Search, Users, CheckCircle, XCircle, Clock, Ban, RefreshCw, Settings, Filter } from 'lucide-react';

const STATUS_FILTERS = ['all', 'active', 'expired', 'suspended'] as const;
type StatusFilter = typeof STATUS_FILTERS[number];

const STATUS_CONFIG: Record<string, { bg: string; color: string; border: string; icon: any }> = {
  active:    { bg: '#d1fae5', color: '#059669', border: '#a7f3d0', icon: CheckCircle },
  expired:   { bg: '#ffe4e6', color: '#f43f5e', border: '#fecdd3', icon: XCircle },
  suspended: { bg: '#fef3c7', color: '#d97706', border: '#fde68a', icon: Clock },
};

const FILTER_COLORS: Record<string, { active: string; bg: string; border: string }> = {
  all:       { active: '#6366f1', bg: '#eef2ff', border: '#c7d2fe' },
  active:    { active: '#10b981', bg: '#d1fae5', border: '#a7f3d0' },
  expired:   { active: '#f43f5e', bg: '#ffe4e6', border: '#fecdd3' },
  suspended: { active: '#f59e0b', bg: '#fef3c7', border: '#fde68a' },
};

export function MasterAdminSubscribersPage() {
  const navigate = useNavigate();
  const [licensees, setLicensees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('all');

  useEffect(() => { load(); }, [search, filter]);

  const token = () => localStorage.getItem('masterAdminToken');

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filter !== 'all') params.append('status', filter);
      const res = await fetch(`${API_URL}/master-admin/subscribers?${params}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      if (data.error) toast.error(data.error);
      else setLicensees(data.subscribers || []);
    } catch { toast.error('Failed to load licensees'); }
    finally { setLoading(false); }
  };

  const suspend = async (id: string) => {
    if (!confirm('Suspend this licensee?')) return;
    try {
      const res = await fetch(`${API_URL}/master-admin/subscribers/${id}/suspend`, {
        method: 'POST', headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      if (data.error) toast.error(data.error);
      else { toast.success('Licensee suspended'); load(); }
    } catch { toast.error('Failed'); }
  };

  const reactivate = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/master-admin/subscribers/${id}/reactivate`, {
        method: 'POST', headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      if (data.error) toast.error(data.error);
      else { toast.success('Licensee reactivated'); load(); }
    } catch { toast.error('Failed'); }
  };

  const counts = {
    all: licensees.length,
    active: licensees.filter(l => l.status === 'active').length,
    expired: licensees.filter(l => l.status === 'expired').length,
    suspended: licensees.filter(l => l.status === 'suspended').length,
  };

  const hasActiveQuery = !!search || filter !== 'all';

  const clearQuery = () => {
    setSearch('');
    setFilter('all');
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-black" style={{ color: '#1e1b4b' }}>Licensees</h1>
          <p className="text-sm font-medium mt-0.5" style={{ color: '#94a3b8' }}>Users who have activated a license key</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-2 px-3 py-2.5 rounded-2xl text-xs font-bold transition-colors"
            style={{ background: 'rgba(255,255,255,0.8)', color: '#1e1b4b', border: '1.5px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          {hasActiveQuery && (
            <button
              type="button"
              onClick={clearQuery}
              className="inline-flex items-center gap-2 px-3 py-2.5 rounded-2xl text-xs font-bold transition-colors"
              style={{ background: '#fafbff', color: '#64748b', border: '1.5px solid #e2e8f0' }}
            >
              Clear
            </button>
          )}
          <div
            className="flex items-center gap-2 px-3 py-2.5 rounded-2xl text-xs font-bold"
            style={{ background: '#eef2ff', color: '#6366f1', border: '1.5px solid #c7d2fe' }}
          >
            <Filter className="h-3.5 w-3.5" />
            {licensees.length} total
          </div>
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#a5b4fc' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, phone..."
            className="w-full pl-11 pr-4 py-2.5 md:py-2 rounded-2xl text-sm font-medium outline-none transition-all"
            style={{
              background: 'rgba(255,255,255,0.8)',
              border: '1.5px solid #e2e8f0',
              color: '#1e1b4b',
              boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = '#a5b4fc'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(165,180,252,0.2)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.04)'; }}
          />
        </div>
        <div className="flex gap-1.5 p-1.5 rounded-2xl"
          style={{ background: 'rgba(255,255,255,0.8)', border: '1.5px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
          {STATUS_FILTERS.map(s => {
            const fc = FILTER_COLORS[s];
            const isActive = filter === s;
            return (
              <button key={s} onClick={() => setFilter(s)}
                className="px-3.5 py-2.5 md:py-2 rounded-xl text-xs font-bold capitalize transition-all"
                style={{
                  background: isActive ? fc.bg : 'transparent',
                  color: isActive ? fc.active : '#94a3b8',
                  border: isActive ? `1.5px solid ${fc.border}` : '1.5px solid transparent',
                  boxShadow: isActive ? `0 2px 8px ${fc.active}20` : 'none',
                }}>
                {s} {s !== 'all' && <span className="ml-1 opacity-70">{counts[s]}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 rounded-full border-t-indigo-500 border-indigo-200 animate-spin" style={{ borderWidth: 3 }} />
        </div>
      ) : licensees.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 rounded-3xl"
          style={{ background: 'rgba(255,255,255,0.7)', border: '1.5px solid rgba(255,255,255,0.9)', boxShadow: '0 8px 32px rgba(99,102,241,0.06)' }}>
          <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4"
            style={{ background: '#eef2ff', border: '1.5px solid #c7d2fe' }}>
            <Users className="h-8 w-8" style={{ color: '#a5b4fc' }} />
          </div>
          <p className="text-sm font-bold" style={{ color: '#94a3b8' }}>No licensees found</p>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={load}
              className="inline-flex items-center gap-2 px-3 py-2.5 rounded-2xl text-xs font-bold transition-colors"
              style={{ background: '#eef2ff', color: '#6366f1', border: '1.5px solid #c7d2fe' }}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
            {hasActiveQuery && (
              <button
                type="button"
                onClick={clearQuery}
                className="inline-flex items-center gap-2 px-3 py-2.5 rounded-2xl text-xs font-bold transition-colors"
                style={{ background: '#fafbff', color: '#64748b', border: '1.5px solid #e2e8f0' }}
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-3xl overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.8)', border: '1.5px solid rgba(255,255,255,0.9)', boxShadow: '0 8px 32px rgba(99,102,241,0.08)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1.5px solid #f1f5f9', background: '#fafbff' }}>
                {['Licensee', 'Contact', 'GSTIN', 'Status', 'Created', 'Actions'].map(h => (
                  <th key={h} className="text-left px-5 py-4 text-[10px] font-black uppercase tracking-widest" style={{ color: '#94a3b8' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {licensees.map(l => {
                const sc = STATUS_CONFIG[l.status] || STATUS_CONFIG.active;
                const Icon = sc.icon;
                return (
                  <tr key={l._id} className="transition-colors group" style={{ borderTop: '1px solid #f8fafc' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#fafbff'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-2xl flex items-center justify-center text-xs font-black"
                          style={{ background: '#eef2ff', color: '#6366f1', border: '1.5px solid #c7d2fe' }}>
                          {(l.name || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-sm" style={{ color: '#1e1b4b' }}>{l.name}</p>
                          <p className="text-xs font-medium" style={{ color: '#94a3b8' }}>{l.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs font-medium" style={{ color: '#64748b' }}>{l.phone || '—'}</td>
                    <td className="px-5 py-4 text-xs font-mono font-semibold" style={{ color: '#94a3b8' }}>{l.gstin || '—'}</td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
                        style={{ background: sc.bg, color: sc.color, border: `1.5px solid ${sc.border}` }}>
                        <Icon className="h-3 w-3" />
                        {l.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs font-medium" style={{ color: '#94a3b8' }}>
                      {new Date(l.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => navigate(`/subscribers/${l._id}`)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                          style={{ background: '#eef2ff', color: '#6366f1', border: '1.5px solid #c7d2fe' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#c7d2fe'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#eef2ff'; }}>
                          <Settings className="h-3 w-3" />Manage
                        </button>
                        {l.status === 'active' && (
                          <button onClick={() => suspend(l._id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                            style={{ background: '#ffe4e6', color: '#f43f5e', border: '1.5px solid #fecdd3' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#fecdd3'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#ffe4e6'; }}>
                            <Ban className="h-3 w-3" />Suspend
                          </button>
                        )}
                        {l.status === 'suspended' && (
                          <button onClick={() => reactivate(l._id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                            style={{ background: '#d1fae5', color: '#059669', border: '1.5px solid #a7f3d0' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#a7f3d0'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#d1fae5'; }}>
                            <RefreshCw className="h-3 w-3" />Reactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
