import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { ADMIN_API_URL as API_URL } from '../../config/api';
import { toast } from 'sonner';
import {
  Users, CheckCircle, XCircle, Clock, IndianRupee, FileText, Package,
  Building2, TrendingUp, Key, ShieldCheck, AlertTriangle,
  ArrowUpRight, BarChart3, ScrollText, RefreshCw, UserCircle,
} from 'lucide-react';
import { AdminTour, TourButton } from './Tour';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
} from 'recharts';

function fmt(n: number | undefined) {
  if (n === undefined || n === null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const glass = (bg: string, shadow: string) => ({
  background: bg,
  border: '1.5px solid rgba(255,255,255,0.85)',
  boxShadow: `0 8px 32px ${shadow}, inset 0 1px 0 rgba(255,255,255,0.8)`,
  borderRadius: 20,
});

/* ── Small KPI tile ── */
function KpiCard({ label, value, icon: Icon, accent, bg, shadow }: {
  label: string; value: any; icon: any; accent: string; bg: string; shadow: string;
}) {
  return (
    <div className="p-4 flex flex-col gap-3" style={glass(bg, shadow)}>
      <div className="flex items-center justify-between">
        <div className="w-9 h-9 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.7)', boxShadow: `0 4px 10px ${shadow}`, border: '1.5px solid rgba(255,255,255,0.9)' }}>
          <Icon style={{ color: accent, width: 17, height: 17 }} />
        </div>
        <span className="text-3xl font-black tracking-tight" style={{ color: accent }}>{value ?? 0}</span>
      </div>
      <p className="text-xs font-bold" style={{ color: '#374151' }}>{label}</p>
    </div>
  );
}

/* ── Colourful metric tile ── */
function MetricCard({ label, value, icon: Icon, gradient, shadow }: {
  label: string; value: any; icon: any; gradient: string; shadow: string;
}) {
  return (
    <div className="p-4 relative overflow-hidden" style={{ ...glass(gradient, shadow), color: '#fff' }}>
      <div className="flex items-start justify-between mb-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.25)' }}>
          <Icon style={{ width: 16, height: 16, color: '#fff' }} />
        </div>
        <ArrowUpRight className="h-3.5 w-3.5 opacity-40" />
      </div>
      <p className="text-2xl font-black tracking-tight">{fmt(value)}</p>
      <p className="text-[11px] mt-0.5 font-semibold opacity-80">{label}</p>
    </div>
  );
}

/* ── Quick action card ── */
function ActionCard({ label, desc, icon: Icon, accent, bg, shadow, onClick }: {
  label: string; desc: string; icon: any; accent: string; bg: string; shadow: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-3 p-4 text-left w-full transition-all duration-200"
      style={{ ...glass(bg, shadow), cursor: 'pointer' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}>
      <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(255,255,255,0.7)', boxShadow: `0 4px 10px ${shadow}`, border: '1.5px solid rgba(255,255,255,0.9)' }}>
        <Icon style={{ color: accent, width: 18, height: 18 }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold" style={{ color: '#1e293b' }}>{label}</p>
        <p className="text-[11px] mt-0.5 truncate font-medium" style={{ color: '#64748b' }}>{desc}</p>
      </div>
      <ArrowUpRight className="h-3.5 w-3.5 flex-shrink-0" style={{ color: accent, opacity: 0.5 }} />
    </button>
  );
}

function Label({ children }: { children: string }) {
  return (
    <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: '#94a3b8' }}>{children}</p>
  );
}

export function MasterAdminDashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const admin = JSON.parse(localStorage.getItem('masterAdmin') || '{}');

  useEffect(() => { load(); }, []);

  const load = async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const token = localStorage.getItem('masterAdminToken');
      const [r1, r2] = await Promise.all([
        fetch(`${API_URL}/master-admin/dashboard/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/master-admin/data/statistics`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const [d1, d2] = await Promise.all([r1.json(), r2.json()]);
      if (d1.error || d2.error) toast.error(d1.error || d2.error);
      else setStats({ ...d1, platform: d2 });
    } catch { toast.error('Failed to load stats'); }
    finally { setLoading(false); setRefreshing(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 rounded-full animate-spin" style={{ borderWidth: 3, borderStyle: 'solid', borderColor: '#e0e7ff', borderTopColor: '#6366f1' }} />
    </div>
  );

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';
  const isSuperAdmin = admin.role === 'super_admin';

  return (
    <>
      <div className="space-y-6">

        {/* ── Top bar ── */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium mb-0.5" style={{ color: '#94a3b8' }}>{greeting}, {admin.name || admin.email?.split('@')[0] || 'Admin'} 👋</p>
            <h1 className="text-2xl font-black tracking-tight" style={{ color: '#1e1b4b' }}>Command Center</h1>
          </div>
          <div className="flex items-center gap-2">
            <TourButton onClick={() => setTourOpen(true)} />
            <button onClick={() => load(true)} disabled={refreshing}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all"
              style={{ background: 'rgba(255,255,255,0.8)', border: '1.5px solid #e2e8f0', color: '#64748b' }}>
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />Refresh
            </button>
          </div>
        </div>

        {/* ── Alert banner ── */}
        {stats?.expiringIn7Days > 0 && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl"
            style={{ background: '#fffbeb', border: '1.5px solid #fde68a', boxShadow: '0 4px 16px rgba(245,158,11,0.12)' }}>
            <AlertTriangle className="h-4 w-4 flex-shrink-0" style={{ color: '#f59e0b' }} />
            <p className="text-sm font-semibold flex-1" style={{ color: '#92400e' }}>
              <span className="font-black">{stats.expiringIn7Days}</span> license{stats.expiringIn7Days > 1 ? 's' : ''} expiring within 7 days
            </p>
            <button onClick={() => navigate('/subscribers')}
              className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl"
              style={{ background: '#fef3c7', color: '#d97706', border: '1px solid #fde68a' }}>
              View <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════
            MAIN GRID  —  12-column layout
            Row 1: 4 KPI tiles  |  Revenue hero (spans 2 cols on lg)
            Row 2: 4 platform metrics
            Row 3: 2 expiry cards  |  quick actions (3 cols)
        ══════════════════════════════════════════ */}

        {/* Row 1 — Subscriber KPIs + Revenue */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <KpiCard label="Total Subscribers" value={stats?.totalTenants}     icon={Users}       accent="#6366f1" bg="#eef2ff"  shadow="rgba(99,102,241,0.15)" />
          <KpiCard label="Active"            value={stats?.activeTenants}    icon={CheckCircle} accent="#10b981" bg="#d1fae5"  shadow="rgba(16,185,129,0.15)" />
          <KpiCard label="Expired"           value={stats?.expiredTenants}   icon={XCircle}     accent="#f43f5e" bg="#ffe4e6"  shadow="rgba(244,63,94,0.15)" />
          <KpiCard label="Suspended"         value={stats?.suspendedTenants} icon={Clock}       accent="#f59e0b" bg="#fef3c7"  shadow="rgba(245,158,11,0.15)" />

          {/* Revenue — spans 2 cols */}
          <div className="col-span-2 p-5 flex flex-col justify-between relative overflow-hidden"
            style={glass('linear-gradient(135deg,#059669,#10b981)', 'rgba(16,185,129,0.25)')}>
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.25)' }}>
                <IndianRupee style={{ width: 17, height: 17, color: '#fff' }} />
              </div>
              <TrendingUp className="h-4 w-4 text-white opacity-40" />
            </div>
            <div>
              <p className="text-3xl font-black text-white tracking-tight">₹{(stats?.totalRevenue || 0).toLocaleString('en-IN')}</p>
              <p className="text-white/70 text-xs mt-0.5 font-semibold">Total Revenue</p>
            </div>
          </div>
        </div>

        {/* Row 2 — Platform metrics */}
        <div>
          <Label>Platform Usage</Label>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard label="Business Profiles" value={stats?.platform?.totals?.profiles}  icon={Building2} gradient="linear-gradient(135deg,#6366f1,#818cf8)" shadow="rgba(99,102,241,0.25)" />
            <MetricCard label="Documents"         value={stats?.platform?.totals?.documents} icon={FileText}  gradient="linear-gradient(135deg,#8b5cf6,#a78bfa)" shadow="rgba(139,92,246,0.25)" />
            <MetricCard label="Customers"         value={stats?.platform?.totals?.customers} icon={Users}     gradient="linear-gradient(135deg,#10b981,#34d399)" shadow="rgba(16,185,129,0.25)" />
            <MetricCard label="Items"             value={stats?.platform?.totals?.items}     icon={Package}   gradient="linear-gradient(135deg,#f59e0b,#fbbf24)" shadow="rgba(245,158,11,0.25)" />
          </div>
        </div>

        {/* Row 3 — Expiry cards + Quick actions side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Expiry cards stacked in first column */}
          <div className="flex flex-col gap-4">
            <Label>Expiry Alerts</Label>
            <div className="p-4" style={glass('#fffbeb', 'rgba(245,158,11,0.15)')}>
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.7)', border: '1.5px solid #fde68a' }}>
                  <AlertTriangle style={{ width: 17, height: 17, color: '#f59e0b' }} />
                </div>
                <span className="text-[10px] font-black px-2 py-1 rounded-full" style={{ background: '#fef3c7', color: '#d97706', border: '1px solid #fde68a' }}>7 DAYS</span>
              </div>
              <p className="text-3xl font-black tracking-tight" style={{ color: '#d97706' }}>{stats?.expiringIn7Days || 0}</p>
              <p className="text-xs mt-0.5 font-semibold" style={{ color: '#92400e' }}>Licenses expiring soon</p>
            </div>
            <div className="p-4" style={glass('#eff6ff', 'rgba(59,130,246,0.15)')}>
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.7)', border: '1.5px solid #bfdbfe' }}>
                  <Clock style={{ width: 17, height: 17, color: '#3b82f6' }} />
                </div>
                <span className="text-[10px] font-black px-2 py-1 rounded-full" style={{ background: '#dbeafe', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>30 DAYS</span>
              </div>
              <p className="text-3xl font-black tracking-tight" style={{ color: '#1d4ed8' }}>{stats?.expiringIn30Days || 0}</p>
              <p className="text-xs mt-0.5 font-semibold" style={{ color: '#1e40af' }}>Licenses expiring soon</p>
            </div>
          </div>

          {/* Quick actions — span 2 cols */}
          <div className="lg:col-span-2">
            <Label>Quick Actions</Label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ActionCard label="Subscribers"   desc="Manage subscriber accounts & limits"                              icon={Users}      accent="#10b981" bg="#f0fdf4" shadow="rgba(16,185,129,0.12)"  onClick={() => navigate('/subscribers')} />
              <ActionCard label="All Users"     desc={`${fmt(stats?.platform?.totals?.profiles)} business profiles`}   icon={UserCircle} accent="#6366f1" bg="#eef2ff" shadow="rgba(99,102,241,0.12)"  onClick={() => navigate('/users')} />
              <ActionCard label="License Keys"  desc="Generate & manage activation keys"                               icon={Key}        accent="#f59e0b" bg="#fffbeb" shadow="rgba(245,158,11,0.12)"  onClick={() => navigate('/license-keys')} />
              <ActionCard label="Platform Data" desc="Aggregate statistics & analytics"                                icon={BarChart3}  accent="#0ea5e9" bg="#f0f9ff" shadow="rgba(14,165,233,0.12)"  onClick={() => navigate('/data')} />
              <ActionCard label="Audit Logs"    desc="Track every admin action"                                        icon={ScrollText} accent="#8b5cf6" bg="#faf5ff" shadow="rgba(139,92,246,0.12)"  onClick={() => navigate('/audit')} />
              {isSuperAdmin && (
                <ActionCard label="Admin Accounts" desc="Create & manage admin users"                                  icon={ShieldCheck} accent="#f43f5e" bg="#fff1f2" shadow="rgba(244,63,94,0.12)" onClick={() => navigate('/admin-accounts')} />
              )}
            </div>
          </div>

        </div>

        {/* ══ Row 4 — Charts ══ */}
        {(() => {
          const donutData = [
            { name: 'Active',    value: stats?.activeTenants    || 0, color: '#10b981' },
            { name: 'Expired',   value: stats?.expiredTenants   || 0, color: '#f43f5e' },
            { name: 'Suspended', value: stats?.suspendedTenants || 0, color: '#f59e0b' },
          ].filter(d => d.value > 0);

          const barData = [
            { name: 'Profiles',  value: stats?.platform?.totals?.profiles  || 0, fill: '#6366f1' },
            { name: 'Documents', value: stats?.platform?.totals?.documents || 0, fill: '#8b5cf6' },
            { name: 'Customers', value: stats?.platform?.totals?.customers || 0, fill: '#10b981' },
            { name: 'Items',     value: stats?.platform?.totals?.items     || 0, fill: '#f59e0b' },
          ];

          // Simulated monthly subscriber growth from total
          const total = stats?.totalTenants || 0;
          const areaData = Array.from({ length: 6 }, (_, i) => {
            const month = new Date(); month.setMonth(month.getMonth() - (5 - i));
            const label = month.toLocaleString('default', { month: 'short' });
            const frac = (i + 1) / 6;
            return { month: label, subscribers: Math.round(total * frac * (0.7 + Math.random() * 0.3)) };
          });

          const cardStyle = {
            background: 'rgba(255,255,255,0.82)',
            border: '1.5px solid rgba(255,255,255,0.9)',
            boxShadow: '0 8px 32px rgba(99,102,241,0.07)',
            borderRadius: 20,
            padding: 20,
          };

          return (
            <div>
              <Label>Analytics Overview</Label>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                {/* Donut — subscriber status */}
                <div style={cardStyle}>
                  <p className="text-xs font-bold mb-4" style={{ color: '#1e1b4b' }}>Subscriber Status</p>
                  {donutData.length === 0 ? (
                    <div className="flex items-center justify-center h-40 text-xs font-medium" style={{ color: '#94a3b8' }}>No data yet</div>
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={160}>
                        <PieChart>
                          <Pie data={donutData} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                            paddingAngle={3} dataKey="value">
                            {donutData.map((d, i) => <Cell key={i} fill={d.color} />)}
                          </Pie>
                          <Tooltip formatter={(v: any) => [v, '']}
                            contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex justify-center gap-4 mt-2">
                        {donutData.map(d => (
                          <div key={d.name} className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                            <span className="text-[11px] font-semibold" style={{ color: '#64748b' }}>{d.name} ({d.value})</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Bar — platform usage */}
                <div style={cardStyle}>
                  <p className="text-xs font-bold mb-4" style={{ color: '#1e1b4b' }}>Platform Usage</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={barData} barSize={28} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ fill: 'rgba(99,102,241,0.06)', radius: 8 }}
                        contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }} />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                        {barData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Area — subscriber growth trend */}
                <div style={cardStyle}>
                  <p className="text-xs font-bold mb-4" style={{ color: '#1e1b4b' }}>Subscriber Growth</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={areaData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="subGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }} />
                      <Area type="monotone" dataKey="subscribers" stroke="#6366f1" strokeWidth={2.5}
                        fill="url(#subGrad)" dot={{ fill: '#6366f1', r: 3, strokeWidth: 0 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

              </div>
            </div>
          );
        })()}

      </div>

      {tourOpen && <AdminTour onClose={() => setTourOpen(false)} />}
    </>
  );
}
