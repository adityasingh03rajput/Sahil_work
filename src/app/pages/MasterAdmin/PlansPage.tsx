import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { ADMIN_API_URL as API_URL } from '../../config/api';
import { toast } from 'sonner';
import { Plus, Package, DollarSign, Users, Calendar, Monitor, X, Save } from 'lucide-react';

const emptyPlan = {
  name: '',
  displayName: '',
  description: '',
  durations: [{ days: 30, price: 0 }],
  seatPrice: 0,
  limits: { maxSeats: 5, maxSessions: 1, maxDocumentsPerMonth: -1, maxCustomers: -1, maxItems: -1 },
  isActive: true,
};

export function MasterAdminPlansPage() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; plan: any; isNew: boolean }>({ open: false, plan: null, isNew: false });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadPlans(); }, []);

  const token = () => localStorage.getItem('masterAdminToken');

  const loadPlans = async () => {
    try {
      const res = await fetch(`${API_URL}/master-admin/plans`, { headers: { Authorization: `Bearer ${token()}` } });
      const data = await res.json();
      if (data.error) toast.error(data.error);
      else setPlans(data.plans || []);
    } catch { toast.error('Failed to load plans'); }
    finally { setLoading(false); }
  };

  const openCreate = () => setModal({ open: true, plan: JSON.parse(JSON.stringify(emptyPlan)), isNew: true });
  const openEdit = (plan: any) => setModal({ open: true, plan: JSON.parse(JSON.stringify(plan)), isNew: false });

  const savePlan = async () => {
    setSaving(true);
    try {
      const url = modal.isNew
        ? `${API_URL}/master-admin/plans`
        : `${API_URL}/master-admin/plans/${modal.plan._id}`;
      const res = await fetch(url, {
        method: modal.isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(modal.plan),
      });
      const data = await res.json();
      if (data.error) { toast.error(data.error); return; }
      toast.success(modal.isNew ? 'Plan created' : 'Plan updated');
      setModal({ open: false, plan: null, isNew: false });
      loadPlans();
    } catch { toast.error('Failed to save plan'); }
    finally { setSaving(false); }
  };

  const setPlanField = (path: string, value: any) => {
    setModal(prev => {
      const plan = { ...prev.plan };
      const keys = path.split('.');
      let obj: any = plan;
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
      obj[keys[keys.length - 1]] = value;
      return { ...prev, plan };
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
            style={{ background: '#fef3c7', border: '1.5px solid #fde68a', boxShadow: '0 4px 12px rgba(245,158,11,0.15)' }}>
            <Package className="h-5 w-5" style={{ color: '#d97706' }} />
          </div>
          <div>
            <h1 className="text-2xl font-black" style={{ color: '#1e1b4b' }}>Manage Plans</h1>
            <p className="text-sm font-medium" style={{ color: '#94a3b8' }}>Configure subscription plans and pricing</p>
          </div>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold text-white transition-all"
          style={{ background: 'linear-gradient(135deg,#f59e0b,#fbbf24)', boxShadow: '0 6px 20px rgba(245,158,11,0.35)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}>
          <Plus className="h-4 w-4" />Create Plan
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 rounded-full border-amber-200 border-t-amber-500 animate-spin" style={{ borderWidth: 3 }} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {plans.map((plan) => (
            <div key={plan._id} className="rounded-3xl overflow-hidden transition-all"
              style={{ background: 'rgba(255,255,255,0.8)', border: '1.5px solid rgba(255,255,255,0.9)', boxShadow: '0 8px 32px rgba(245,158,11,0.08)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 16px 40px rgba(245,158,11,0.15)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(245,158,11,0.08)'; }}>
              <div className="p-6" style={{ background: 'linear-gradient(135deg, #f59e0b, #fbbf24)' }}>
                <h3 className="text-xl font-black text-white mb-1">{plan.displayName}</h3>
                <p className="text-sm text-white/80 font-medium">{plan.description}</p>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4" style={{ color: '#f59e0b' }} />
                    <span className="text-xs font-black uppercase tracking-wide" style={{ color: '#374151' }}>Durations</span>
                  </div>
                  {plan.durations?.map((d: any, i: number) => (
                    <div key={i} className="flex justify-between items-center p-2.5 rounded-xl mb-1.5"
                      style={{ background: '#fffbeb', border: '1.5px solid #fde68a' }}>
                      <span className="text-sm font-bold" style={{ color: '#374151' }}>{d.days} days</span>
                      <span className="text-sm font-black" style={{ color: '#d97706' }}>₹{d.price?.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-3 space-y-2" style={{ borderTop: '1.5px solid #f1f5f9' }}>
                  {[
                    { icon: Users,   label: 'Max Seats',    value: plan.limits?.maxSeats ?? 5, color: '#6366f1' },
                    { icon: Monitor, label: 'Max Sessions', value: `${plan.limits?.maxSessions ?? 1} device(s)`, color: '#8b5cf6' },
                    { icon: DollarSign, label: 'Seat Price', value: `₹${plan.seatPrice?.toLocaleString() || 0}`, color: '#10b981' },
                  ].map(({ icon: Icon, label, value, color }) => (
                    <div key={label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="h-3.5 w-3.5" style={{ color }} />
                        <span className="text-xs font-semibold" style={{ color: '#64748b' }}>{label}</span>
                      </div>
                      <span className="text-xs font-black" style={{ color }}>{value}</span>
                    </div>
                  ))}
                </div>
                <button onClick={() => openEdit(plan)}
                  className="w-full mt-1 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all"
                  style={{ background: '#fffbeb', color: '#d97706', border: '1.5px solid #fde68a' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#fef3c7'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#fffbeb'; }}>
                  Edit Plan
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal.open && modal.plan && (
        <div className="fixed inset-0 flex items-center justify-center z-[50] p-4"
          style={{ background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-lg rounded-3xl overflow-hidden max-h-[90vh] overflow-y-auto"
            style={{ background: 'rgba(255,255,255,0.97)', border: '1.5px solid rgba(255,255,255,0.9)', boxShadow: '0 32px 80px rgba(245,158,11,0.15)' }}>
            <div className="flex items-center justify-between px-6 py-5 sticky top-0 z-10"
              style={{ borderBottom: '1.5px solid #f1f5f9', background: 'rgba(255,255,255,0.97)' }}>
              <h2 className="text-base font-black" style={{ color: '#1e1b4b' }}>{modal.isNew ? 'Create Plan' : 'Edit Plan'}</h2>
              <button onClick={() => setModal({ open: false, plan: null, isNew: false })}
                className="p-1.5 rounded-xl" style={{ background: '#f1f5f9', color: '#94a3b8' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#ffe4e6'; (e.currentTarget as HTMLElement).style.color = '#f43f5e'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#f1f5f9'; (e.currentTarget as HTMLElement).style.color = '#94a3b8'; }}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[['Name (slug)', 'name', 'basic'], ['Display Name', 'displayName', 'Basic Plan']].map(([label, key, ph]) => (
                  <div key={key}>
                    <label className="block text-xs font-black mb-1.5 uppercase tracking-wide" style={{ color: '#475569' }}>{label}</label>
                    <input className="w-full px-3 py-2.5 rounded-xl text-sm font-medium outline-none"
                      style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', color: '#1e1b4b' }}
                      value={modal.plan[key]} onChange={e => setPlanField(key, e.target.value)} placeholder={ph} />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-xs font-black mb-1.5 uppercase tracking-wide" style={{ color: '#475569' }}>Description</label>
                <input className="w-full px-3 py-2.5 rounded-xl text-sm font-medium outline-none"
                  style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', color: '#1e1b4b' }}
                  value={modal.plan.description || ''} onChange={e => setPlanField('description', e.target.value)} />
              </div>

              <div className="p-4 rounded-2xl space-y-3" style={{ background: '#ede9fe', border: '1.5px solid #ddd6fe' }}>
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide" style={{ color: '#7c3aed' }}>
                  <Monitor className="h-4 w-4" />Session & Seat Limits
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold mb-1" style={{ color: '#6d28d9' }}>Max Sessions (devices)</label>
                    <input type="number" min="1" className="w-full px-3 py-2 rounded-xl text-sm font-medium outline-none"
                      style={{ background: 'rgba(255,255,255,0.8)', border: '1.5px solid #ddd6fe', color: '#1e1b4b' }}
                      value={modal.plan.limits?.maxSessions ?? 1}
                      onChange={e => setPlanField('limits.maxSessions', Number(e.target.value))} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1" style={{ color: '#6d28d9' }}>Max Seats</label>
                    <input type="number" min="1" className="w-full px-3 py-2 rounded-xl text-sm font-medium outline-none"
                      style={{ background: 'rgba(255,255,255,0.8)', border: '1.5px solid #ddd6fe', color: '#1e1b4b' }}
                      value={modal.plan.limits?.maxSeats ?? 5}
                      onChange={e => setPlanField('limits.maxSeats', Number(e.target.value))} />
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl space-y-3" style={{ background: '#fffbeb', border: '1.5px solid #fde68a' }}>
                <div className="text-xs font-black uppercase tracking-wide" style={{ color: '#d97706' }}>Durations & Pricing</div>
                {modal.plan.durations?.map((d: any, i: number) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input type="number" className="w-24 px-2.5 py-2 rounded-xl text-sm font-medium outline-none"
                      style={{ background: 'rgba(255,255,255,0.8)', border: '1.5px solid #fde68a', color: '#1e1b4b' }}
                      value={d.days}
                      onChange={e => { const durations = [...modal.plan.durations]; durations[i].days = Number(e.target.value); setPlanField('durations', durations); }}
                      placeholder="Days" />
                    <span className="text-xs font-bold" style={{ color: '#d97706' }}>days —</span>
                    <input type="number" className="flex-1 px-2.5 py-2 rounded-xl text-sm font-medium outline-none"
                      style={{ background: 'rgba(255,255,255,0.8)', border: '1.5px solid #fde68a', color: '#1e1b4b' }}
                      value={d.price}
                      onChange={e => { const durations = [...modal.plan.durations]; durations[i].price = Number(e.target.value); setPlanField('durations', durations); }}
                      placeholder="₹ Price" />
                    <button onClick={() => { const durations = modal.plan.durations.filter((_: any, j: number) => j !== i); setPlanField('durations', durations); }}
                      className="p-1.5 rounded-xl" style={{ background: '#ffe4e6', color: '#f43f5e' }}>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <button onClick={() => setPlanField('durations', [...modal.plan.durations, { days: 30, price: 0 }])}
                  className="text-xs font-bold" style={{ color: '#d97706' }}>+ Add duration</button>
              </div>

              <div>
                <label className="block text-xs font-black mb-1.5 uppercase tracking-wide" style={{ color: '#475569' }}>Seat Price (₹/extra seat)</label>
                <input type="number" className="w-full px-3 py-2.5 rounded-xl text-sm font-medium outline-none"
                  style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', color: '#1e1b4b' }}
                  value={modal.plan.seatPrice || 0} onChange={e => setPlanField('seatPrice', Number(e.target.value))} />
              </div>
            </div>
            <div className="flex gap-3 px-6 py-5 sticky bottom-0" style={{ borderTop: '1.5px solid #f1f5f9', background: 'rgba(255,255,255,0.97)' }}>
              <button onClick={() => setModal({ open: false, plan: null, isNew: false })}
                className="flex-1 px-4 py-3 rounded-2xl text-sm font-bold"
                style={{ background: '#f1f5f9', border: '1.5px solid #e2e8f0', color: '#64748b' }}>Cancel</button>
              <button onClick={savePlan} disabled={saving}
                className="flex-1 px-4 py-3 rounded-2xl text-sm font-black text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                style={{ background: 'linear-gradient(135deg,#f59e0b,#fbbf24)', boxShadow: '0 6px 20px rgba(245,158,11,0.35)' }}>
                <Save className="h-4 w-4" />{saving ? 'Saving...' : 'Save Plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
