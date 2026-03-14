import { useEffect, useState } from 'react';
import { ADMIN_API_URL as API_URL } from '../../config/api';
import { toast } from 'sonner';
import { FileText, User, Building2, Clock, ScrollText } from 'lucide-react';

export function MasterAdminAuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadLogs(); }, []);

  const loadLogs = async () => {
    try {
      const token = localStorage.getItem('masterAdminToken');
      const res = await fetch(`${API_URL}/master-admin/audit`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.error) toast.error(data.error);
      else setLogs(data.logs || []);
    } catch { toast.error('Failed to load audit logs'); }
    finally { setLoading(false); }
  };

  const getActionStyle = (action: string): { bg: string; color: string; border: string } => {
    if (action.includes('create') || action.includes('reactivat'))
      return { bg: '#d1fae5', color: '#059669', border: '#a7f3d0' };
    if (action.includes('update') || action.includes('edit') || action.includes('extend'))
      return { bg: '#eef2ff', color: '#6366f1', border: '#c7d2fe' };
    if (action.includes('delete') || action.includes('suspend') || action.includes('revok'))
      return { bg: '#ffe4e6', color: '#f43f5e', border: '#fecdd3' };
    return { bg: '#f1f5f9', color: '#64748b', border: '#e2e8f0' };
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
          style={{ background: '#ede9fe', border: '1.5px solid #ddd6fe', boxShadow: '0 4px 12px rgba(139,92,246,0.15)' }}>
          <ScrollText className="h-5 w-5" style={{ color: '#7c3aed' }} />
        </div>
        <div>
          <h1 className="text-2xl font-black" style={{ color: '#1e1b4b' }}>Audit Logs</h1>
          <p className="text-sm font-medium" style={{ color: '#94a3b8' }}>All admin actions recorded here</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 rounded-full border-purple-200 border-t-purple-500 animate-spin" style={{ borderWidth: 3 }} />
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 rounded-3xl"
          style={{ background: 'rgba(255,255,255,0.7)', border: '1.5px solid rgba(255,255,255,0.9)', boxShadow: '0 8px 32px rgba(139,92,246,0.06)' }}>
          <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4"
            style={{ background: '#ede9fe', border: '1.5px solid #ddd6fe' }}>
            <FileText className="h-8 w-8" style={{ color: '#a78bfa' }} />
          </div>
          <p className="text-sm font-bold" style={{ color: '#94a3b8' }}>No audit logs found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map(log => {
            const style = getActionStyle(log.action);
            return (
              <div key={log._id} className="p-5 transition-all"
                style={{ background: 'rgba(255,255,255,0.8)', border: '1.5px solid rgba(255,255,255,0.9)', borderRadius: 20, boxShadow: '0 4px 16px rgba(139,92,246,0.06)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(139,92,246,0.1)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(139,92,246,0.06)'; }}>
                <div className="flex items-start gap-4">
                  <span className="px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap flex-shrink-0"
                    style={{ background: style.bg, color: style.color, border: `1.5px solid ${style.border}` }}>
                    {log.action.replace(/_/g, ' ')}
                  </span>
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: '#374151' }}>
                      <User className="h-3.5 w-3.5" style={{ color: '#a5b4fc' }} />
                      {log.actorName || log.actorEmail}
                    </div>
                    {log.tenantName && (
                      <div className="flex items-center gap-2 text-sm font-medium" style={{ color: '#64748b' }}>
                        <Building2 className="h-3.5 w-3.5" style={{ color: '#a5b4fc' }} />
                        {log.tenantName}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs font-medium" style={{ color: '#94a3b8' }}>
                      <Clock className="h-3.5 w-3.5" />
                      {new Date(log.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </div>
                    {(log.before || log.after) && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs font-bold" style={{ color: '#a5b4fc' }}>View Details</summary>
                        <div className="mt-2 space-y-2">
                          {log.before && (
                            <div className="p-3 rounded-2xl" style={{ background: '#fff1f2', border: '1.5px solid #fecdd3' }}>
                              <p className="font-black text-xs mb-1" style={{ color: '#f43f5e' }}>Before:</p>
                              <pre className="text-xs overflow-x-auto" style={{ color: '#be123c' }}>{JSON.stringify(log.before, null, 2)}</pre>
                            </div>
                          )}
                          {log.after && (
                            <div className="p-3 rounded-2xl" style={{ background: '#f0fdf4', border: '1.5px solid #a7f3d0' }}>
                              <p className="font-black text-xs mb-1" style={{ color: '#059669' }}>After:</p>
                              <pre className="text-xs overflow-x-auto" style={{ color: '#047857' }}>{JSON.stringify(log.after, null, 2)}</pre>
                            </div>
                          )}
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
