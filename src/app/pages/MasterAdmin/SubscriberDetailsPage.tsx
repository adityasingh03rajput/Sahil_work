import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ADMIN_API_URL as API_URL } from '../../config/api';
import { toast } from 'sonner';
import { ArrowLeft, User, Building2, FileText, Users, CheckCircle, XCircle, Clock, RefreshCw, Ban } from 'lucide-react';

const STATUS_CONFIG: Record<string, { bg: string; color: string; border: string; icon: any }> = {
  active:    { bg: '#d1fae5', color: '#059669', border: '#a7f3d0', icon: CheckCircle },
  expired:   { bg: '#ffe4e6', color: '#f43f5e', border: '#fecdd3', icon: XCircle },
  suspended: { bg: '#fef3c7', color: '#d97706', border: '#fde68a', icon: Clock },
};

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex justify-between items-center py-2.5" style={{ borderBottom: '1px solid #f1f5f9' }}>
      <span className="text-xs font-semibold" style={{ color: '#94a3b8' }}>{label}</span>
      <span className="text-xs font-bold" style={{ color: '#1e1b4b' }}>{value ?? '—'}</span>
    </div>
  );
}

export function MasterAdminSubscriberDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const token = () => localStorage.getItem('masterAdminToken');

  useEffect(() => { load(); }, [id]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/master-admin/subscribers/${id}/details`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const json = await res.json();
      if (json.error) toast.error(json.error);
      else setData(json);
    } catch { toast.error('Failed to load subscriber details'); }
    finally { setLoading(false); }
  };

  const suspend = async () => {
    if (!confirm('Suspend this subscriber?')) return;
    try {
      const res = await fetch(`${API_URL}/master-admin/subscribers/${id}/suspend`, {
        method: 'POST', headers: { Authorization: `Bearer ${token()}` },
      });
      const json = await res.json();
      if (json.error) toast.error(json.error);
      else { toast.success('Subscriber suspended'); load(); }
    } catch { toast.error('Failed'); }
  };

  const reactivate = async () => {
    try {
      const res = await fetch(`${API_URL}/master-admin/subscribers/${id}/reactivate`, {
        method: 'POST', headers: { Authorization: `Bearer ${token()}` },
      });
      const json = await res.json();
      if (json.error) toast.error(json.error);
      else { toast.success('Subscriber reactivated'); load(); }
    } catch { toast.error('Failed'); }
  };

  const card = (title: string, Icon: any, children: React.ReactNode) => (
    <div className="rounded-3xl p-5"
      style={{ background: 'rgba(255,255,255,0.8)', border: '1.5px solid rgba(255,255,255,0.9)', boxShadow: '0 8px 32px rgba(99,102,241,0.06)' }}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: '#eef2ff' }}>
          <Icon className="h-3.5 w-3.5" style={{ color: '#6366f1' }} />
        </div>
        <p className="text-sm font-bold" style={{ color: '#1e1b4b' }}>{title}</p>
      </div>
      {children}
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="w-10 h-10 rounded-full border-t-indigo-500 border-indigo-200 animate-spin" style={{ borderWidth: 3 }} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <p className="text-sm font-bold" style={{ color: '#94a3b8' }}>Subscriber not found</p>
        <button onClick={() => navigate('/subscribers')} className="mt-4 text-xs font-semibold" style={{ color: '#6366f1' }}>← Back</button>
      </div>
    );
  }

  const { subscriber, license, profiles, usage } = data;
  const status = subscriber?.status || 'active';
  const sc = STATUS_CONFIG[status] || STATUS_CONFIG.active;
  const StatusIcon = sc.icon;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/subscribers')}
              className="p-2 rounded-xl transition-all"
              style={{ background: '#f1f5f9', color: '#64748b' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#eef2ff'; (e.currentTarget as HTMLElement).style.color = '#6366f1'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#f1f5f9'; (e.currentTarget as HTMLElement).style.color = '#64748b'; }}>
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-xl font-black" style={{ color: '#1e1b4b' }}>{subscriber.name}</h1>
              <p className="text-xs font-medium mt-0.5" style={{ color: '#94a3b8' }}>{subscriber.email}</p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
              style={{ background: sc.bg, color: sc.color, border: `1.5px solid ${sc.border}` }}>
              <StatusIcon className="h-3 w-3" />{status}
            </span>
          </div>
          <div className="flex gap-2">
            {status === 'active' && (
              <button onClick={suspend} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold"
                style={{ background: '#ffe4e6', color: '#f43f5e', border: '1.5px solid #fecdd3' }}>
                <Ban className="h-3.5 w-3.5" />Suspend
              </button>
            )}
            {status === 'suspended' && (
              <button onClick={reactivate} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold"
                style={{ background: '#d1fae5', color: '#059669', border: '1.5px solid #a7f3d0' }}>
                <RefreshCw className="h-3.5 w-3.5" />Reactivate
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Documents', value: usage?.documentCount ?? 0, Icon: FileText,  c: '#6366f1', bg: '#eef2ff' },
            { label: 'Customers', value: usage?.customerCount ?? 0, Icon: Users,     c: '#10b981', bg: '#d1fae5' },
            { label: 'Profiles',  value: usage?.profileCount  ?? 0, Icon: Building2, c: '#f59e0b', bg: '#fef3c7' },
          ].map(({ label, value, Icon, c, bg }) => (
            <div key={label} className="rounded-3xl p-5 flex items-center gap-4"
              style={{ background: 'rgba(255,255,255,0.8)', border: '1.5px solid rgba(255,255,255,0.9)', boxShadow: '0 8px 32px rgba(99,102,241,0.06)' }}>
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
                <Icon className="h-5 w-5" style={{ color: c }} />
              </div>
              <div>
                <p className="text-2xl font-black" style={{ color: '#1e1b4b' }}>{value}</p>
                <p className="text-xs font-semibold" style={{ color: '#94a3b8' }}>{label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {card('Subscriber Info', User, (
            <>
              <InfoRow label="Name"   value={subscriber.name} />
              <InfoRow label="Email"  value={subscriber.email} />
              <InfoRow label="Phone"  value={subscriber.phone} />
              <InfoRow label="GSTIN"  value={subscriber.gstin} />
              <InfoRow label="Joined" value={subscriber.createdAt ? new Date(subscriber.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : null} />
            </>
          ))}
          {card('License Info', CheckCircle, license ? (
            <>
              <InfoRow label="Plan"           value={license.plan?.name} />
              <InfoRow label="Status"         value={license.status} />
              <InfoRow label="Start"          value={license.licenseStartAt ? new Date(license.licenseStartAt).toLocaleDateString('en-IN') : null} />
              <InfoRow label="Expiry"         value={license.licenseEndAt  ? new Date(license.licenseEndAt).toLocaleDateString('en-IN')  : null} />
              <InfoRow label="Days Remaining" value={license.daysRemaining != null ? `${license.daysRemaining} days` : null} />
            </>
          ) : <p className="text-xs font-medium py-4 text-center" style={{ color: '#94a3b8' }}>No license found</p>)}
        </div>

        {profiles?.length > 0 && card('Business Profiles', Building2, (
          <div className="space-y-2">
            {profiles.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-2xl"
                style={{ background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                <div>
                  <p className="text-xs font-bold" style={{ color: '#1e1b4b' }}>{p.businessName}</p>
                  <p className="text-[10px] font-medium" style={{ color: '#94a3b8' }}>{p.gstin || 'No GSTIN'}</p>
                </div>
                <p className="text-[10px] font-medium" style={{ color: '#94a3b8' }}>{p.phone || p.email || ''}</p>
              </div>
            ))}
          </div>
        ))}
      </div>
  );
}
