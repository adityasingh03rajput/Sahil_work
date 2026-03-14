import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { ADMIN_API_URL as API_URL } from '../../config/api';
import { toast } from 'sonner';
import { FileText, Users, Package, Building2, TrendingUp, BarChart3 } from 'lucide-react';

export function MasterAdminDataPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadStats(); }, []);

  const loadStats = async () => {
    try {
      const token = localStorage.getItem('masterAdminToken');
      const response = await fetch(`${API_URL}/master-admin/data/statistics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.error) toast.error(data.error);
      else setStats(data);
    } catch { toast.error('Failed to load statistics'); }
    finally { setLoading(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-sky-200 border-t-sky-500 animate-spin" style={{ borderWidth: 3 }} />
        <p className="text-xs font-semibold" style={{ color: '#94a3b8' }}>Loading statistics...</p>
      </div>
    </div>
  );

  const topCards = [
    { icon: FileText,  value: stats?.totals?.documents || 0, label: 'Total Documents',   bg: '#eef2ff', color: '#6366f1', border: '#c7d2fe', shadow: 'rgba(99,102,241,0.15)' },
    { icon: Users,     value: stats?.totals?.customers || 0, label: 'Total Customers',   bg: '#d1fae5', color: '#059669', border: '#a7f3d0', shadow: 'rgba(16,185,129,0.15)' },
    { icon: Package,   value: stats?.totals?.items || 0,     label: 'Total Items',       bg: '#ede9fe', color: '#7c3aed', border: '#ddd6fe', shadow: 'rgba(139,92,246,0.15)' },
    { icon: Building2, value: stats?.totals?.profiles || 0,  label: 'Business Profiles', bg: '#fef3c7', color: '#d97706', border: '#fde68a', shadow: 'rgba(245,158,11,0.15)' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
          style={{ background: '#e0f2fe', border: '1.5px solid #bae6fd', boxShadow: '0 4px 12px rgba(14,165,233,0.15)' }}>
          <BarChart3 className="h-5 w-5" style={{ color: '#0ea5e9' }} />
        </div>
        <div>
          <h1 className="text-2xl font-black" style={{ color: '#1e1b4b' }}>Platform Data</h1>
          <p className="text-sm font-medium" style={{ color: '#94a3b8' }}>Aggregate statistics across all subscribers</p>
        </div>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {topCards.map(({ icon: Icon, value, label, bg, color, border, shadow }) => (
          <div key={label} className="p-5 rounded-3xl"
            style={{ background: bg, border: `1.5px solid ${border}`, boxShadow: `0 8px 32px ${shadow}, inset 0 1px 0 rgba(255,255,255,0.8)` }}>
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.7)', border: `1.5px solid ${border}` }}>
                <Icon style={{ width: 18, height: 18, color }} />
              </div>
              <TrendingUp style={{ width: 16, height: 16, color, opacity: 0.4 }} />
            </div>
            <p className="text-3xl font-black tracking-tight" style={{ color }}>{value}</p>
            <p className="text-xs mt-1 font-bold" style={{ color: `${color}99` }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Documents by type + Recent */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-6 rounded-3xl"
          style={{ background: 'rgba(255,255,255,0.8)', border: '1.5px solid rgba(255,255,255,0.9)', boxShadow: '0 8px 32px rgba(99,102,241,0.08)' }}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center"
              style={{ background: '#eef2ff', border: '1.5px solid #c7d2fe' }}>
              <FileText className="h-4 w-4" style={{ color: '#6366f1' }} />
            </div>
            <h2 className="text-base font-black" style={{ color: '#1e1b4b' }}>Documents by Type</h2>
          </div>
          <div className="space-y-2">
            {Object.entries(stats?.documentsByType || {}).map(([type, count]: [string, any]) => (
              <div key={type} className="flex justify-between items-center p-3 rounded-2xl"
                style={{ background: '#f8fafc', border: '1.5px solid #f1f5f9' }}>
                <span className="capitalize text-sm font-bold" style={{ color: '#374151' }}>{type}</span>
                <span className="text-sm font-black px-3 py-1 rounded-xl"
                  style={{ background: '#eef2ff', color: '#6366f1', border: '1.5px solid #c7d2fe' }}>{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 rounded-3xl"
          style={{ background: 'rgba(255,255,255,0.8)', border: '1.5px solid rgba(255,255,255,0.9)', boxShadow: '0 8px 32px rgba(16,185,129,0.08)' }}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center"
              style={{ background: '#d1fae5', border: '1.5px solid #a7f3d0' }}>
              <TrendingUp className="h-4 w-4" style={{ color: '#059669' }} />
            </div>
            <h2 className="text-base font-black" style={{ color: '#1e1b4b' }}>Recent Documents</h2>
          </div>
          <div className="space-y-2">
            {stats?.recentDocuments?.length > 0 ? (
              stats.recentDocuments.map((doc: any) => (
                <div key={doc._id} className="p-3 rounded-2xl"
                  style={{ background: '#f8fafc', border: '1.5px solid #f1f5f9' }}>
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-sm" style={{ color: '#1e1b4b' }}>{doc.documentNumber}</span>
                    <span className="text-sm font-black" style={{ color: '#059669' }}>₹{doc.grandTotal?.toLocaleString()}</span>
                  </div>
                  <p className="text-xs font-medium" style={{ color: '#94a3b8' }}>{doc.customerName}</p>
                </div>
              ))
            ) : (
              <p className="text-sm font-medium text-center py-4" style={{ color: '#94a3b8' }}>No recent documents</p>
            )}
          </div>
        </div>
      </div>

      {/* Platform overview */}
      <div className="p-8 rounded-3xl"
        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: '1.5px solid rgba(255,255,255,0.2)', boxShadow: '0 16px 48px rgba(99,102,241,0.3)' }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black text-white mb-1">Platform Overview</h2>
            <p className="text-sm font-medium text-white/70">Complete statistics of all platform data</p>
          </div>
          <BarChart3 className="h-14 w-14 text-white/30" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            ['Suppliers',   stats?.totals?.suppliers || 0],
            ['Invoices',    stats?.totals?.invoices || 0],
            ['Quotations',  stats?.totals?.quotations || 0],
            ['Challans',    stats?.totals?.challans || 0],
          ].map(([label, value]) => (
            <div key={label as string} className="p-4 rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)' }}>
              <p className="text-2xl font-black text-white">{value}</p>
              <p className="text-xs font-semibold text-white/70 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
