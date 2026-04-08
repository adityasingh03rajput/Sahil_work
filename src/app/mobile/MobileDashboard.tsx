/**
 * MobileDashboard — APK-only dashboard page.
 * 100% inline styles, zero Tailwind/CSS-var dependencies.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { TrendingUp, Clock, FileText, Plus, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCurrentProfile } from '../hooks/useCurrentProfile';
import { API_URL } from '../config/api';

const S = {
  page: { padding: '16px 16px 100px', fontFamily: 'system-ui,-apple-system,sans-serif' } as React.CSSProperties,
  heading: { margin: '0 0 4px', fontSize: 24, fontWeight: 800, color: '#f1f5f9' } as React.CSSProperties,
  sub: { margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.4)' } as React.CSSProperties,
  card: { background: 'rgba(255,255,255,0.05)', borderRadius: 18, border: '1px solid rgba(255,255,255,0.08)', padding: 16, marginBottom: 12 } as React.CSSProperties,
  statGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 } as React.CSSProperties,
  statCard: { background: 'rgba(255,255,255,0.05)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', padding: '14px 16px' } as React.CSSProperties,
  statLabel: { margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' as const, letterSpacing: '0.08em' },
  statValue: { margin: 0, fontSize: 20, fontWeight: 800, color: '#f1f5f9' } as React.CSSProperties,
  sectionTitle: { margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: '#f1f5f9' } as React.CSSProperties,
  docRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' } as React.CSSProperties,
  btn: (color: string) => ({ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px 0', borderRadius: 14, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14, color: '#fff', background: color, fontFamily: 'system-ui,sans-serif' } as React.CSSProperties),
};

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}
function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function Skeleton() {
  return (
    <div style={S.page}>
      {[1, 2, 3, 4].map(i => (
        <div key={i} style={{ height: 80, borderRadius: 16, background: 'rgba(255,255,255,0.06)', marginBottom: 12, animation: 'mpulse 1.4s ease-in-out infinite' }} />
      ))}
      <style>{`@keyframes mpulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  );
}

export function MobileDashboard() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [recentDocs, setRecentDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { accessToken, deviceId } = useAuth();
  const { profileId } = useCurrentProfile();
  const navigate = useNavigate();

  useEffect(() => {
    if (!profileId || !accessToken) { setLoading(false); return; }
    setLoading(true);
    const h = { Authorization: `Bearer ${accessToken}`, 'X-Device-ID': deviceId, 'X-Profile-ID': profileId };
    Promise.all([
      fetch(`${API_URL}/analytics`, { headers: h }).then(r => r.ok ? r.json() : null),
      fetch(`${API_URL}/documents?limit=5`, { headers: h }).then(r => r.ok ? r.json() : null),
    ]).then(([a, d]) => {
      if (a && !a.error) setAnalytics(a);
      if (d) {
        const arr = Array.isArray(d.data) ? d.data : Array.isArray(d) ? d : [];
        setRecentDocs(arr.slice(0, 5));
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, [profileId, accessToken]);

  useEffect(() => {
    const onRefresh = () => {
      if (!profileId || !accessToken) return;
      const h = { Authorization: `Bearer ${accessToken}`, 'X-Device-ID': deviceId, 'X-Profile-ID': profileId };
      fetch(`${API_URL}/analytics`, { headers: h }).then(r => r.ok ? r.json() : null).then(a => { if (a && !a.error) setAnalytics(a); }).catch(() => {});
      fetch(`${API_URL}/documents?limit=5`, { headers: h }).then(r => r.ok ? r.json() : null).then(d => {
        if (d) { const arr = Array.isArray(d.data) ? d.data : Array.isArray(d) ? d : []; setRecentDocs(arr.slice(0, 5)); }
      }).catch(() => {});
    };
    window.addEventListener('dashboardRefresh', onRefresh);
    return () => window.removeEventListener('dashboardRefresh', onRefresh);
  }, [profileId, accessToken]);

  if (loading) return <Skeleton />;

  const stats = [
    { label: 'Total Sales', value: fmt(analytics?.totalSales || 0), color: '#34d399', icon: TrendingUp },
    { label: 'Outstanding', value: fmt(analytics?.outstanding || 0), color: '#fb923c', icon: Clock },
    { label: 'Invoices', value: String(analytics?.totalInvoices || 0), color: '#60a5fa', icon: FileText },
    { label: 'Paid', value: String(analytics?.paidInvoices || 0), color: '#a78bfa', icon: CheckCircle2 },
  ];

  const quickActions = [
    { label: 'New Invoice', color: 'linear-gradient(135deg,#4f46e5,#6366f1)', path: '/documents/create?type=invoice' },
    { label: 'New Quotation', color: 'linear-gradient(135deg,#0ea5e9,#38bdf8)', path: '/documents/create?type=quotation' },
    { label: 'Add Customer', color: 'linear-gradient(135deg,#10b981,#34d399)', path: '/customers' },
    { label: 'Add Item', color: 'linear-gradient(135deg,#f59e0b,#fbbf24)', path: '/items' },
  ];

  return (
    <div style={S.page}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={S.heading}>Dashboard</h1>
        <p style={S.sub}>Business overview</p>
      </div>

      {/* Stats */}
      <div style={S.statGrid}>
        {stats.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} style={S.statCard}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <Icon style={{ width: 14, height: 14, color: s.color }} />
                <p style={S.statLabel}>{s.label}</p>
              </div>
              <p style={{ ...S.statValue, color: s.color }}>{s.value}</p>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div style={{ ...S.card, padding: '16px' }}>
        <p style={S.sectionTitle}>Quick Actions</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {quickActions.map(a => (
            <button key={a.label} onClick={() => navigate(a.path)} style={S.btn(a.color)}>
              <Plus style={{ width: 16, height: 16 }} />
              <span style={{ fontSize: 12 }}>{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Documents */}
      <div style={S.card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <p style={S.sectionTitle}>Recent Documents</p>
          <button onClick={() => navigate('/documents')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#818cf8', fontWeight: 600 }}>
            View all →
          </button>
        </div>
        {recentDocs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <FileText style={{ width: 40, height: 40, color: 'rgba(255,255,255,0.2)', margin: '0 auto 8px' }} />
            <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>No documents yet</p>
          </div>
        ) : recentDocs.map(doc => (
          <div key={doc.id} style={S.docRow} onClick={() => navigate(`/documents/edit/${doc.id}`)}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 700, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {doc.invoiceNo || doc.documentNumber}
              </p>
              <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                {doc.customerName} · {fmtDate(doc.date)}
              </p>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
              <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>{fmt(doc.grandTotal || 0)}</p>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: doc.paymentStatus === 'paid' ? '#34d399' : '#fb923c' }}>
                {doc.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Top Items */}
      {analytics?.topItems?.length > 0 && (
        <div style={S.card}>
          <p style={S.sectionTitle}>Top Selling Items</p>
          {analytics.topItems.slice(0, 5).map((item: any, i: number) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < analytics.topItems.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
              <div>
                <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>{item.name}</p>
                <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Qty: {item.quantity}</p>
              </div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#60a5fa' }}>{fmt(item.revenue)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
