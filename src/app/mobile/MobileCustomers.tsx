/**
 * MobileCustomers — APK-only customers page.
 * 100% inline styles, zero Tailwind/CSS-var dependencies.
 * Features: GSTIN lookup, pincode lookup, logo upload, validation, formatted inputs.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Search, User, Phone, Mail, Trash2, ChevronRight, Edit } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCurrentProfile } from '../hooks/useCurrentProfile';
import { API_URL } from '../config/api';
import { toast } from 'sonner';
import { MOBILE_TOKENS, MOBILE_STYLES } from './MobileDesignSystem';
import { INDIAN_STATES } from '../utils/indianStates';
import {
  hasContactErrors,
  normalizeEmail,
  normalizeGstin,
  normalizePhone,
  validateContactFields,
} from '../utils/contactValidation';

const inp: React.CSSProperties = { ...MOBILE_STYLES.input };
const lbl: React.CSSProperties = { ...MOBILE_STYLES.label };

function Skeleton() {
  return (
    <div style={{ padding: `${MOBILE_TOKENS.spacing.lg}px ${MOBILE_TOKENS.spacing.lg}px calc(${MOBILE_TOKENS.safeAreaBottom} + 100px)` }}>
      {[1,2,3,4].map(i => <div key={i} style={{ height: 80, borderRadius: MOBILE_TOKENS.radius.lg, background: 'var(--muted)', marginBottom: MOBILE_TOKENS.spacing.md, animation: 'mpulse 1.4s ease-in-out infinite' }} />)}
      <style>{`@keyframes mpulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  );
}

function AddSheet({ onClose, onSaved, accessToken, deviceId, profileId }: any) {
  const [form, setForm] = useState<any>({ 
    name: '', 
    ownerName: '', 
    phone: '', 
    email: '', 
    gstin: '',
    pan: '',
    billingAddress: '',
    billingCity: '',
    billingState: '',
    billingPostalCode: '',
    openingBalance: 0,
    openingBalanceType: 'dr',
    logoUrl: '',
    logoDataUrl: '',
  });
  const [errors, setErrors] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [gstinLoading, setGstinLoading] = useState(false);
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.onload = () => resolve(String(reader.result || ''));
      reader.readAsDataURL(file);
    });

  const uploadLogoToCloudinary = async (dataUrl: string) => {
    if (!accessToken) throw new Error('Not authenticated');
    if (!profileId) throw new Error('Select a business profile first');
    const res = await fetch(`${API_URL}/uploads/logo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'X-Device-ID': deviceId,
        'X-Profile-ID': profileId,
      },
      body: JSON.stringify({ dataUrl, folder: `hukum/logos/${profileId}/customers` }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || 'Failed to upload logo');
    const url = String(data?.url || '').trim();
    if (!url) throw new Error('Failed to upload logo');
    return url;
  };

  const extractIndianPincode = (value: string) => {
    const m = String(value || '').match(/\b(\d{6})\b/);
    return m ? m[1] : null;
  };

  const lookupPincode = async (pincode: string) => {
    const pin = String(pincode || '').trim();
    if (!/^\d{6}$/.test(pin)) return null;
    const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
    const data = await res.json().catch(() => null);
    const first = Array.isArray(data) ? data[0] : null;
    const po = first?.PostOffice?.[0];
    if (!po) return null;
    return {
      city: String(po?.District || po?.Block || '').trim() || null,
      state: String(po?.State || '').trim() || null,
    };
  };

  const handleGstinLookupAutofill = async () => {
    const gstin = String(form.gstin || '').trim().toUpperCase().replace(/\s+/g, '');
    if (!gstin) return;
    if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/.test(gstin)) return;

    setGstinLoading(true);
    try {
      const response = await fetch(`${API_URL}/customers/gstin/lookup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-Device-ID': deviceId,
          'X-Profile-ID': profileId,
        },
        body: JSON.stringify({ gstin }),
      });

      const rawText = await response.text().catch(() => '');
      const data = (() => {
        try {
          return rawText ? JSON.parse(rawText) : null;
        } catch {
          return null;
        }
      })();
      if (!response.ok || data?.error) {
        const serverMsg = String(data?.error || data?.message || '').trim();
        toast.error(serverMsg || `GSTIN lookup failed (${response.status})`);
        return;
      }

      if (String(data?.name || '').trim()) set('name', String(data.name));
      if (String(data?.ownerName || '').trim()) set('ownerName', String(data.ownerName));
      if (String(data?.pan || '').trim()) set('pan', String(data.pan));
      if (String(data?.billingAddress || '').trim()) set('billingAddress', String(data.billingAddress));
      if (String(data?.billingCity || '').trim()) set('billingCity', String(data.billingCity));
      if (String(data?.billingState || '').trim()) set('billingState', String(data.billingState));
      if (String(data?.billingPostalCode || '').trim()) set('billingPostalCode', String(data.billingPostalCode));
      
      // Auto-sync shipping with billing
      setForm((p: any) => ({
        ...p,
        shippingAddress: String(data?.billingAddress || p.billingAddress || ''),
        shippingCity: String(data?.billingCity || p.billingCity || ''),
        shippingState: String(data?.billingState || p.billingState || ''),
        shippingPostalCode: String(data?.billingPostalCode || p.billingPostalCode || ''),
      }));
    } catch (e: any) {
      toast.error(e?.message || 'GSTIN lookup failed');
    } finally {
      setGstinLoading(false);
    }
  };

  useEffect(() => {
    const pin = extractIndianPincode(String(form.billingPostalCode || '')) || extractIndianPincode(String(form.billingAddress || ''));
    if (!pin) return;

    const t = setTimeout(() => {
      lookupPincode(pin)
        .then((next) => {
          if (!next) return;
          const currentCity = String(form.billingCity || '').trim();
          const currentState = String(form.billingState || '').trim();
          if ((!currentCity && next.city) || (!currentState && next.state)) {
            setForm((p: any) => ({
              ...p,
              billingCity: p.billingCity || next.city || undefined,
              billingState: p.billingState || next.state || undefined,
              billingPostalCode: p.billingPostalCode || pin,
            }));
          }
        })
        .catch(() => {});
    }, 400);

    return () => clearTimeout(t);
  }, [form.billingPostalCode, form.billingAddress]);

  const save = async () => {
    if (!form.name.trim()) { toast.error('Party name required'); return; }
    
    const errs = validateContactFields({
      gstin: String(form.gstin || ''),
      phone: String(form.phone || ''),
      email: String(form.email || ''),
    });
    setErrors(errs);
    if (hasContactErrors(errs)) {
      toast.error('Please fix invalid contact details');
      return;
    }

    setSaving(true);
    try {
      const payload: any = { ...form };
      payload.shippingAddress = form.billingAddress;
      payload.shippingCity = form.billingCity;
      payload.shippingState = form.billingState;
      payload.shippingPostalCode = form.billingPostalCode;
      
      if (typeof payload.email === 'string') payload.email = normalizeEmail(payload.email) || undefined;
      if (typeof payload.phone === 'string') payload.phone = normalizePhone(payload.phone) || undefined;
      if (typeof payload.gstin === 'string') payload.gstin = normalizeGstin(payload.gstin) || undefined;
      if (payload.logoUrl && !String(payload.logoUrl).trim()) payload.logoUrl = null;
      delete payload.logoDataUrl;
      
      const r = await fetch(`${API_URL}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}`, 'X-Device-ID': deviceId, 'X-Profile-ID': profileId },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (d.error) { toast.error(d.error); return; }
      toast.success('Customer added');
      onSaved(d);
    } catch { toast.error('Failed to add customer'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ position: 'absolute', inset: 0, background: MOBILE_TOKENS.colors.overlay }} onClick={onClose} />
      <div style={{ position: 'relative', width: '100%', background: MOBILE_TOKENS.colors.surface, borderRadius: `${MOBILE_TOKENS.radius.xl}px ${MOBILE_TOKENS.radius.xl}px 0 0`, maxHeight: '90dvh', display: 'flex', flexDirection: 'column', boxShadow: '0 -12px 40px rgba(0,0,0,0.5)', fontFamily: 'system-ui,sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: `${MOBILE_TOKENS.spacing.md}px 0 ${MOBILE_TOKENS.spacing.xs}px` }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: MOBILE_TOKENS.colors.borderLight }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `${MOBILE_TOKENS.spacing.xs}px ${MOBILE_TOKENS.spacing.lg}px ${MOBILE_TOKENS.spacing.md}px`, borderBottom: `1px solid ${MOBILE_TOKENS.colors.border}` }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: MOBILE_TOKENS.colors.text }}>Add Customer</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: MOBILE_TOKENS.colors.textMuted, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: `${MOBILE_TOKENS.spacing.lg}px ${MOBILE_TOKENS.spacing.lg}px`, display: 'flex', flexDirection: 'column', gap: MOBILE_TOKENS.spacing.lg }}>
          {/* Basic Info */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: MOBILE_TOKENS.colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: MOBILE_TOKENS.spacing.md, paddingBottom: MOBILE_TOKENS.spacing.md, borderBottom: `1px solid ${MOBILE_TOKENS.colors.border}` }}>Basic Info</div>
            <div style={{ marginBottom: MOBILE_TOKENS.spacing.md }}>
              <label style={lbl}>Party / Business Name *</label>
              <input type="text" placeholder="e.g. Sharma Traders" value={form.name} onChange={e => set('name', e.target.value)} style={inp} />
            </div>
            <div>
              <label style={lbl}>Owner Name</label>
              <input type="text" placeholder="e.g. Ramesh Sharma" value={form.ownerName} onChange={e => set('ownerName', e.target.value)} style={inp} />
            </div>
          </div>

          {/* Contact Info */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: MOBILE_TOKENS.colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: MOBILE_TOKENS.spacing.md, paddingBottom: MOBILE_TOKENS.spacing.md, borderBottom: `1px solid ${MOBILE_TOKENS.colors.border}` }}>Contact Info</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: MOBILE_TOKENS.spacing.md }}>
              <div>
                <label style={lbl}>Phone</label>
                <input type="tel" placeholder="+91 98765 43210" value={form.phone} onChange={e => set('phone', e.target.value)} style={inp} />
                {errors.phone && <div style={{ fontSize: 11, color: MOBILE_TOKENS.colors.error, marginTop: 4 }}>{errors.phone}</div>}
              </div>
              <div>
                <label style={lbl}>Email</label>
                <input type="email" placeholder="email@example.com" value={form.email} onChange={e => set('email', e.target.value)} style={inp} />
                {errors.email && <div style={{ fontSize: 11, color: MOBILE_TOKENS.colors.error, marginTop: 4 }}>{errors.email}</div>}
              </div>
            </div>
          </div>

          {/* Tax & ID */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: MOBILE_TOKENS.colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: MOBILE_TOKENS.spacing.md, paddingBottom: MOBILE_TOKENS.spacing.md, borderBottom: `1px solid ${MOBILE_TOKENS.colors.border}` }}>Tax & ID</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: MOBILE_TOKENS.spacing.md }}>
              <div>
                <label style={lbl}>GSTIN</label>
                <input type="text" autoCapitalize="characters" autoCorrect="off" placeholder="22AAAAA0000A1Z5" value={form.gstin} onChange={e => set('gstin', e.target.value)} onBlur={handleGstinLookupAutofill} style={inp} />
                {gstinLoading && <div style={{ fontSize: 11, color: MOBILE_TOKENS.colors.textSecondary, marginTop: 4, animation: 'pulse 1.4s ease-in-out infinite' }}>Fetching GST details...</div>}
                {errors.gstin && <div style={{ fontSize: 11, color: MOBILE_TOKENS.colors.error, marginTop: 4 }}>{errors.gstin}</div>}
              </div>
              <div>
                <label style={lbl}>PAN</label>
                <input type="text" autoCapitalize="characters" autoCorrect="off" placeholder="AAAAA0000A" value={form.pan} onChange={e => set('pan', e.target.value)} style={inp} />
              </div>
            </div>
          </div>

          {/* Billing Address */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: MOBILE_TOKENS.colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: MOBILE_TOKENS.spacing.md, paddingBottom: MOBILE_TOKENS.spacing.md, borderBottom: `1px solid ${MOBILE_TOKENS.colors.border}` }}>Billing Address</div>
            <div style={{ marginBottom: MOBILE_TOKENS.spacing.md }}>
              <label style={lbl}>Address</label>
              <textarea placeholder="Street address" value={form.billingAddress} onChange={e => set('billingAddress', e.target.value)} style={{ ...inp, minHeight: '80px', fontFamily: 'system-ui,sans-serif' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: MOBILE_TOKENS.spacing.md }}>
              <div>
                <label style={lbl}>City</label>
                <input type="text" placeholder="Bangalore" value={form.billingCity} onChange={e => set('billingCity', e.target.value)} style={inp} />
              </div>
              <div>
                <label style={lbl}>State</label>
                <select value={form.billingState} onChange={e => set('billingState', e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                  <option value="">Select state</option>
                  {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Postal Code</label>
                <input type="text" placeholder="560001" value={form.billingPostalCode} onChange={e => set('billingPostalCode', e.target.value)} style={inp} />
              </div>
            </div>
          </div>

          {/* Opening Balance */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: MOBILE_TOKENS.colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: MOBILE_TOKENS.spacing.md, paddingBottom: MOBILE_TOKENS.spacing.md, borderBottom: `1px solid ${MOBILE_TOKENS.colors.border}` }}>Opening Balance</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: MOBILE_TOKENS.spacing.md }}>
              <div>
                <label style={lbl}>Amount</label>
                <input type="number" inputMode="decimal" placeholder="0.00" value={form.openingBalance} onChange={e => set('openingBalance', parseFloat(e.target.value) || 0)} style={inp} />
              </div>
              <div>
                <label style={lbl}>Type</label>
                <select value={form.openingBalanceType} onChange={e => set('openingBalanceType', e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                  <option value="dr">DR (Receivable)</option>
                  <option value="cr">CR (Payable)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Logo Upload */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: MOBILE_TOKENS.colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: MOBILE_TOKENS.spacing.md, paddingBottom: MOBILE_TOKENS.spacing.md, borderBottom: `1px solid ${MOBILE_TOKENS.colors.border}` }}>Logo</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: MOBILE_TOKENS.spacing.md }}>
              <input id="customer-logo-create" type="file" accept="image/*" style={{ display: 'none' }}
                onChange={async (e) => {
                  const file = e.target.files?.[0]; if (!file) return;
                  try {
                    const dataUrl = await fileToDataUrl(file);
                    set('logoDataUrl', dataUrl);
                    const url = await uploadLogoToCloudinary(dataUrl);
                    set('logoUrl', url);
                    toast.success('Logo uploaded');
                  } catch { toast.error('Failed to upload logo'); }
                }}
              />
              <button type="button" onClick={() => document.getElementById('customer-logo-create')?.click()}
                style={{ flex: 1, padding: `${MOBILE_TOKENS.spacing.md * 0.6875}px 0`, borderRadius: MOBILE_TOKENS.radius.md, border: `1px solid ${MOBILE_TOKENS.colors.border}`, background: 'var(--muted)', color: MOBILE_TOKENS.colors.text, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                {form.logoUrl || form.logoDataUrl ? 'Change Logo' : 'Upload Logo'}
              </button>
              {!!(form.logoUrl || form.logoDataUrl) && (
                <img src={String(form.logoUrl || form.logoDataUrl)} alt="Logo" style={{ height: 40, width: 40, borderRadius: MOBILE_TOKENS.radius.md, border: `1px solid ${MOBILE_TOKENS.colors.border}`, objectFit: 'contain', background: MOBILE_TOKENS.colors.surface }} />
              )}
            </div>
          </div>
        </div>
        <div style={{ padding: `${MOBILE_TOKENS.spacing.md}px ${MOBILE_TOKENS.spacing.lg}px`, paddingBottom: `calc(${MOBILE_TOKENS.safeAreaBottom} + ${MOBILE_TOKENS.spacing.md}px)`, borderTop: `1px solid ${MOBILE_TOKENS.colors.border}`, display: 'flex', gap: MOBILE_TOKENS.spacing.md }}>
          <button onClick={onClose} style={{ flex: 1, height: 48, borderRadius: MOBILE_TOKENS.radius.lg, border: `1px solid ${MOBILE_TOKENS.colors.border}`, background: 'var(--muted)', color: MOBILE_TOKENS.colors.text, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          <button onClick={save} disabled={saving} style={{ flex: 2, height: 48, borderRadius: MOBILE_TOKENS.radius.lg, border: 'none', background: MOBILE_TOKENS.colors.accent, color: 'var(--primary-foreground)', fontSize: 15, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving…' : 'Add Customer'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteSheet({ customer, onCancel, onConfirm, loading }: any) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ position: 'absolute', inset: 0, background: MOBILE_TOKENS.colors.overlay }} onClick={onCancel} />
      <div style={{ position: 'relative', width: '100%', background: MOBILE_TOKENS.colors.surface, borderRadius: `${MOBILE_TOKENS.radius.xl}px ${MOBILE_TOKENS.radius.xl}px 0 0`, padding: `${MOBILE_TOKENS.spacing.lg}px ${MOBILE_TOKENS.spacing.lg}px`, paddingBottom: `calc(${MOBILE_TOKENS.safeAreaBottom} + ${MOBILE_TOKENS.spacing.lg}px)`, boxShadow: '0 -12px 40px rgba(0,0,0,0.2)', fontFamily: 'system-ui,sans-serif' }}>
        <p style={{ margin: `0 0 ${MOBILE_TOKENS.spacing.xs}px`, textAlign: 'center', fontSize: 17, fontWeight: 700, color: MOBILE_TOKENS.colors.text }}>Delete Customer?</p>
        <p style={{ margin: `0 0 ${MOBILE_TOKENS.spacing.lg}px`, textAlign: 'center', fontSize: 13, color: MOBILE_TOKENS.colors.textMuted }}>{customer?.name} will be permanently deleted.</p>
        <div style={{ display: 'flex', gap: MOBILE_TOKENS.spacing.md }}>
          <button onClick={onCancel} style={{ flex: 1, height: 48, borderRadius: MOBILE_TOKENS.radius.lg, border: `1px solid ${MOBILE_TOKENS.colors.border}`, background: 'var(--muted)', color: MOBILE_TOKENS.colors.text, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          <button onClick={onConfirm} disabled={loading} style={{ flex: 1, height: 48, borderRadius: MOBILE_TOKENS.radius.lg, border: 'none', background: MOBILE_TOKENS.colors.error, color: 'var(--primary-foreground)', fontSize: 15, fontWeight: 700, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditSheet({ customer, onClose, onSaved, accessToken, deviceId, profileId }: any) {
  const [form, setForm] = useState<any>(customer || {});
  const [errors, setErrors] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [gstinLoading, setGstinLoading] = useState(false);
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.onload = () => resolve(String(reader.result || ''));
      reader.readAsDataURL(file);
    });

  const uploadLogoToCloudinary = async (dataUrl: string) => {
    if (!accessToken) throw new Error('Not authenticated');
    if (!profileId) throw new Error('Select a business profile first');
    const res = await fetch(`${API_URL}/uploads/logo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'X-Device-ID': deviceId,
        'X-Profile-ID': profileId,
      },
      body: JSON.stringify({ dataUrl, folder: `hukum/logos/${profileId}/customers` }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || 'Failed to upload logo');
    const url = String(data?.url || '').trim();
    if (!url) throw new Error('Failed to upload logo');
    return url;
  };

  const handleGstinLookupAutofill = async () => {
    const gstin = String(form.gstin || '').trim().toUpperCase().replace(/\s+/g, '');
    if (!gstin) return;
    if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/.test(gstin)) return;

    setGstinLoading(true);
    try {
      const response = await fetch(`${API_URL}/customers/gstin/lookup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-Device-ID': deviceId,
          'X-Profile-ID': profileId,
        },
        body: JSON.stringify({ gstin }),
      });

      const rawText = await response.text().catch(() => '');
      const data = (() => {
        try {
          return rawText ? JSON.parse(rawText) : null;
        } catch {
          return null;
        }
      })();
      if (!response.ok || data?.error) {
        const serverMsg = String(data?.error || data?.message || '').trim();
        toast.error(serverMsg || `GSTIN lookup failed (${response.status})`);
        return;
      }

      if (String(data?.name || '').trim()) set('name', String(data.name));
      if (String(data?.ownerName || '').trim()) set('ownerName', String(data.ownerName));
      if (String(data?.pan || '').trim()) set('pan', String(data.pan));
      if (String(data?.billingAddress || '').trim()) set('billingAddress', String(data.billingAddress));
      if (String(data?.billingCity || '').trim()) set('billingCity', String(data.billingCity));
      if (String(data?.billingState || '').trim()) set('billingState', String(data.billingState));
      if (String(data?.billingPostalCode || '').trim()) set('billingPostalCode', String(data.billingPostalCode));
    } catch (e: any) {
      toast.error(e?.message || 'GSTIN lookup failed');
    } finally {
      setGstinLoading(false);
    }
  };

  const save = async () => {
    if (!form.name.trim()) { toast.error('Party name required'); return; }
    
    const errs = validateContactFields({
      gstin: String(form.gstin || ''),
      phone: String(form.phone || ''),
      email: String(form.email || ''),
    });
    setErrors(errs);
    if (hasContactErrors(errs)) {
      toast.error('Please fix invalid contact details');
      return;
    }

    setSaving(true);
    try {
      const payload: any = { ...form };
      payload.shippingAddress = form.billingAddress;
      payload.shippingCity = form.billingCity;
      payload.shippingState = form.billingState;
      payload.shippingPostalCode = form.billingPostalCode;
      
      if (typeof payload.email === 'string') payload.email = normalizeEmail(payload.email) || undefined;
      if (typeof payload.phone === 'string') payload.phone = normalizePhone(payload.phone) || undefined;
      if (typeof payload.gstin === 'string') payload.gstin = normalizeGstin(payload.gstin) || undefined;
      if (payload.logoUrl && !String(payload.logoUrl).trim()) payload.logoUrl = null;
      delete payload.logoDataUrl;
      
      const r = await fetch(`${API_URL}/customers/${form.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}`, 'X-Device-ID': deviceId, 'X-Profile-ID': profileId },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (d.error) { toast.error(d.error); return; }
      toast.success('Customer updated');
      onSaved(d);
    } catch { toast.error('Failed to update customer'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ position: 'absolute', inset: 0, background: MOBILE_TOKENS.colors.overlay }} onClick={onClose} />
      <div style={{ position: 'relative', width: '100%', background: MOBILE_TOKENS.colors.surface, borderRadius: `${MOBILE_TOKENS.radius.xl}px ${MOBILE_TOKENS.radius.xl}px 0 0`, maxHeight: '90dvh', display: 'flex', flexDirection: 'column', boxShadow: '0 -12px 40px rgba(0,0,0,0.5)', fontFamily: 'system-ui,sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: `${MOBILE_TOKENS.spacing.md}px 0 ${MOBILE_TOKENS.spacing.xs}px` }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: MOBILE_TOKENS.colors.borderLight }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `${MOBILE_TOKENS.spacing.xs}px ${MOBILE_TOKENS.spacing.lg}px ${MOBILE_TOKENS.spacing.md}px`, borderBottom: `1px solid ${MOBILE_TOKENS.colors.border}` }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: MOBILE_TOKENS.colors.text }}>Edit Customer</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: MOBILE_TOKENS.colors.textMuted, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: `${MOBILE_TOKENS.spacing.lg}px ${MOBILE_TOKENS.spacing.lg}px`, display: 'flex', flexDirection: 'column', gap: MOBILE_TOKENS.spacing.lg }}>
          {/* Basic Info */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: MOBILE_TOKENS.colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: MOBILE_TOKENS.spacing.md, paddingBottom: MOBILE_TOKENS.spacing.md, borderBottom: `1px solid ${MOBILE_TOKENS.colors.border}` }}>Basic Info</div>
            <div style={{ marginBottom: MOBILE_TOKENS.spacing.md }}>
              <label style={lbl}>Party / Business Name *</label>
              <input type="text" placeholder="e.g. Sharma Traders" value={form.name} onChange={e => set('name', e.target.value)} style={inp} />
            </div>
            <div>
              <label style={lbl}>Owner Name</label>
              <input type="text" placeholder="e.g. Ramesh Sharma" value={form.ownerName} onChange={e => set('ownerName', e.target.value)} style={inp} />
            </div>
          </div>

          {/* Contact Info */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: MOBILE_TOKENS.colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: MOBILE_TOKENS.spacing.md, paddingBottom: MOBILE_TOKENS.spacing.md, borderBottom: `1px solid ${MOBILE_TOKENS.colors.border}` }}>Contact Info</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: MOBILE_TOKENS.spacing.md }}>
              <div>
                <label style={lbl}>Phone</label>
                <input type="tel" placeholder="+91 98765 43210" value={form.phone} onChange={e => set('phone', e.target.value)} style={inp} />
                {errors.phone && <div style={{ fontSize: 11, color: MOBILE_TOKENS.colors.error, marginTop: 4 }}>{errors.phone}</div>}
              </div>
              <div>
                <label style={lbl}>Email</label>
                <input type="email" placeholder="email@example.com" value={form.email} onChange={e => set('email', e.target.value)} style={inp} />
                {errors.email && <div style={{ fontSize: 11, color: MOBILE_TOKENS.colors.error, marginTop: 4 }}>{errors.email}</div>}
              </div>
            </div>
          </div>

          {/* Tax & ID */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: MOBILE_TOKENS.colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: MOBILE_TOKENS.spacing.md, paddingBottom: MOBILE_TOKENS.spacing.md, borderBottom: `1px solid ${MOBILE_TOKENS.colors.border}` }}>Tax & ID</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: MOBILE_TOKENS.spacing.md }}>
              <div>
                <label style={lbl}>GSTIN</label>
                <input type="text" autoCapitalize="characters" autoCorrect="off" placeholder="22AAAAA0000A1Z5" value={form.gstin} onChange={e => set('gstin', e.target.value)} onBlur={handleGstinLookupAutofill} style={inp} />
                {gstinLoading && <div style={{ fontSize: 11, color: MOBILE_TOKENS.colors.textSecondary, marginTop: 4, animation: 'pulse 1.4s ease-in-out infinite' }}>Fetching GST details...</div>}
                {errors.gstin && <div style={{ fontSize: 11, color: MOBILE_TOKENS.colors.error, marginTop: 4 }}>{errors.gstin}</div>}
              </div>
              <div>
                <label style={lbl}>PAN</label>
                <input type="text" autoCapitalize="characters" autoCorrect="off" placeholder="AAAAA0000A" value={form.pan} onChange={e => set('pan', e.target.value)} style={inp} />
              </div>
            </div>
          </div>

          {/* Billing Address */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: MOBILE_TOKENS.colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: MOBILE_TOKENS.spacing.md, paddingBottom: MOBILE_TOKENS.spacing.md, borderBottom: `1px solid ${MOBILE_TOKENS.colors.border}` }}>Billing Address</div>
            <div style={{ marginBottom: MOBILE_TOKENS.spacing.md }}>
              <label style={lbl}>Address</label>
              <textarea placeholder="Street address" value={form.billingAddress} onChange={e => set('billingAddress', e.target.value)} style={{ ...inp, minHeight: '80px', fontFamily: 'system-ui,sans-serif' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: MOBILE_TOKENS.spacing.md }}>
              <div>
                <label style={lbl}>City</label>
                <input type="text" placeholder="Bangalore" value={form.billingCity} onChange={e => set('billingCity', e.target.value)} style={inp} />
              </div>
              <div>
                <label style={lbl}>State</label>
                <select value={form.billingState} onChange={e => set('billingState', e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                  <option value="">Select state</option>
                  {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Postal Code</label>
                <input type="text" placeholder="560001" value={form.billingPostalCode} onChange={e => set('billingPostalCode', e.target.value)} style={inp} />
              </div>
            </div>
          </div>

          {/* Opening Balance */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: MOBILE_TOKENS.colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: MOBILE_TOKENS.spacing.md, paddingBottom: MOBILE_TOKENS.spacing.md, borderBottom: `1px solid ${MOBILE_TOKENS.colors.border}` }}>Opening Balance</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: MOBILE_TOKENS.spacing.md }}>
              <div>
                <label style={lbl}>Amount</label>
                <input type="number" inputMode="decimal" placeholder="0.00" value={form.openingBalance} onChange={e => set('openingBalance', parseFloat(e.target.value) || 0)} style={inp} />
              </div>
              <div>
                <label style={lbl}>Type</label>
                <select value={form.openingBalanceType} onChange={e => set('openingBalanceType', e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                  <option value="dr">DR (Receivable)</option>
                  <option value="cr">CR (Payable)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Logo Upload */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: MOBILE_TOKENS.colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: MOBILE_TOKENS.spacing.md, paddingBottom: MOBILE_TOKENS.spacing.md, borderBottom: `1px solid ${MOBILE_TOKENS.colors.border}` }}>Logo</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: MOBILE_TOKENS.spacing.md }}>
              <input id="customer-logo-edit" type="file" accept="image/*" style={{ display: 'none' }}
                onChange={async (e) => {
                  const file = e.target.files?.[0]; if (!file) return;
                  try {
                    const dataUrl = await fileToDataUrl(file);
                    set('logoDataUrl', dataUrl);
                    const url = await uploadLogoToCloudinary(dataUrl);
                    set('logoUrl', url);
                    toast.success('Logo uploaded');
                  } catch { toast.error('Failed to upload logo'); }
                }}
              />
              <button type="button" onClick={() => document.getElementById('customer-logo-edit')?.click()}
                style={{ flex: 1, padding: `${MOBILE_TOKENS.spacing.md * 0.6875}px 0`, borderRadius: MOBILE_TOKENS.radius.md, border: `1px solid ${MOBILE_TOKENS.colors.border}`, background: 'var(--muted)', color: MOBILE_TOKENS.colors.text, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                {form.logoUrl || form.logoDataUrl ? 'Change Logo' : 'Upload Logo'}
              </button>
              {!!(form.logoUrl || form.logoDataUrl) && (
                <img src={String(form.logoUrl || form.logoDataUrl)} alt="Logo" style={{ height: 40, width: 40, borderRadius: MOBILE_TOKENS.radius.md, border: `1px solid ${MOBILE_TOKENS.colors.border}`, objectFit: 'contain', background: MOBILE_TOKENS.colors.surface }} />
              )}
            </div>
          </div>
        </div>
        <div style={{ padding: `${MOBILE_TOKENS.spacing.md}px ${MOBILE_TOKENS.spacing.lg}px`, paddingBottom: `calc(${MOBILE_TOKENS.safeAreaBottom} + ${MOBILE_TOKENS.spacing.md}px)`, borderTop: `1px solid ${MOBILE_TOKENS.colors.border}`, display: 'flex', gap: MOBILE_TOKENS.spacing.md }}>
          <button onClick={onClose} style={{ flex: 1, height: 48, borderRadius: MOBILE_TOKENS.radius.lg, border: `1px solid rgba(255,255,255,0.12)`, background: 'rgba(255,255,255,0.06)', color: MOBILE_TOKENS.colors.text, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          <button onClick={save} disabled={saving} style={{ flex: 2, height: 48, borderRadius: MOBILE_TOKENS.radius.lg, border: 'none', background: MOBILE_TOKENS.colors.accent, color: 'var(--primary-foreground)', fontSize: 15, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function MobileCustomers() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { accessToken, deviceId } = useAuth();
  const { profileId } = useCurrentProfile();
  const navigate = useNavigate();

  useEffect(() => {
    if (!accessToken || !profileId) { setLoading(false); return; }
    fetch(`${API_URL}/customers`, {
      headers: { Authorization: `Bearer ${accessToken}`, 'X-Device-ID': deviceId, 'X-Profile-ID': profileId },
    }).then(r => r.json()).then(d => { if (!d.error) { setCustomers(d); setFiltered(d); } })
      .catch(() => toast.error('Failed to load customers'))
      .finally(() => setLoading(false));
  }, [accessToken, profileId]);

  useEffect(() => {
    if (!search.trim()) { setFiltered(customers); return; }
    const q = search.toLowerCase();
    setFiltered(customers.filter(c => (c.name || '').toLowerCase().includes(q) || (c.phone || '').includes(q)));
  }, [search, customers]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const r = await fetch(`${API_URL}/customers/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}`, 'X-Device-ID': deviceId, 'X-Profile-ID': profileId },
      });
      if (!r.ok) throw new Error();
      setCustomers(p => p.filter(c => c.id !== deleteTarget.id));
      toast.success('Customer deleted');
      setDeleteTarget(null);
    } catch { toast.error('Delete failed'); }
    finally { setDeleteLoading(false); }
  };

  if (loading) return <Skeleton />;

  return (
    <div style={{ fontFamily: 'system-ui,-apple-system,sans-serif' }}>
      {showAdd && (
        <AddSheet
          onClose={() => setShowAdd(false)}
          onSaved={(c: any) => { setCustomers(p => [...p, c]); setShowAdd(false); }}
          accessToken={accessToken} deviceId={deviceId} profileId={profileId}
        />
      )}
      {showEdit && editingCustomer && (
        <EditSheet
          customer={editingCustomer}
          onClose={() => { setShowEdit(false); setEditingCustomer(null); }}
          onSaved={(c: any) => { setCustomers(p => p.map(x => x.id === c.id ? c : x)); setShowEdit(false); setEditingCustomer(null); }}
          accessToken={accessToken} deviceId={deviceId} profileId={profileId}
        />
      )}
      {deleteTarget && (
        <DeleteSheet customer={deleteTarget} onCancel={() => setDeleteTarget(null)} onConfirm={confirmDelete} loading={deleteLoading} />
      )}

      <div style={{ padding: `${MOBILE_TOKENS.spacing.lg}px ${MOBILE_TOKENS.spacing.lg}px 0` }}>
        <h1 style={{ margin: `0 0 ${MOBILE_TOKENS.spacing.xs}px`, fontSize: 24, fontWeight: 800, color: MOBILE_TOKENS.colors.text }}>Customers</h1>
        <p style={{ margin: `0 0 ${MOBILE_TOKENS.spacing.lg}px`, fontSize: 13, color: MOBILE_TOKENS.colors.textSecondary }}>{customers.length} parties</p>

        <button onClick={() => setShowAdd(true)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: MOBILE_TOKENS.spacing.md,
            padding: `${MOBILE_TOKENS.spacing.lg * 0.875}px 0`, borderRadius: MOBILE_TOKENS.radius.xl, border: 'none', cursor: 'pointer', marginBottom: MOBILE_TOKENS.spacing.md,
            background: `linear-gradient(135deg,${MOBILE_TOKENS.colors.accent},#6366f1)`, color: 'var(--primary-foreground)', fontWeight: 700, fontSize: 15,
            boxShadow: `0 4px 16px rgba(79,70,229,0.35)` }}>
          <Plus style={{ width: 20, height: 20 }} /> Add Customer
        </button>

        <div style={{ position: 'relative', marginBottom: MOBILE_TOKENS.spacing.lg }}>
          <Search style={{ position: 'absolute', left: MOBILE_TOKENS.spacing.md, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: MOBILE_TOKENS.colors.textSecondary }} />
          <input type="text" placeholder="Search customers…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: `${MOBILE_TOKENS.spacing.md * 0.6875}px ${MOBILE_TOKENS.spacing.md}px ${MOBILE_TOKENS.spacing.md * 0.6875}px ${MOBILE_TOKENS.spacing.lg}px`, borderRadius: MOBILE_TOKENS.radius.md, border: `1px solid ${MOBILE_TOKENS.colors.border}`, background: 'var(--input-background)', color: MOBILE_TOKENS.colors.text, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'system-ui,sans-serif' }} />
        </div>
      </div>

      <div style={{ padding: `0 ${MOBILE_TOKENS.spacing.lg}px calc(${MOBILE_TOKENS.safeAreaBottom} + 100px)` }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <User style={{ width: 48, height: 48, color: 'var(--muted-foreground)', margin: '0 auto 12px' }} />
            <p style={{ margin: 0, fontSize: 14, color: MOBILE_TOKENS.colors.textSecondary }}>No customers found</p>
          </div>
        ) : filtered.map(c => (
          <div key={c.id} style={{ background: 'var(--muted)', borderRadius: MOBILE_TOKENS.radius.xl, border: `1px solid ${MOBILE_TOKENS.colors.border}`, padding: MOBILE_TOKENS.spacing.lg, marginBottom: MOBILE_TOKENS.spacing.md, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: MOBILE_TOKENS.spacing.md, marginBottom: MOBILE_TOKENS.spacing.md }}>
              <div style={{ width: 48, height: 48, borderRadius: MOBILE_TOKENS.radius.lg, background: 'var(--primary)20', border: '1px solid var(--primary)30', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 800, fontSize: 18, color: 'var(--primary)', overflow: 'hidden' }}>
                {c.logoUrl || c.logoDataUrl ? (
                  <img src={String(c.logoUrl || c.logoDataUrl)} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  String(c.name || 'C')[0].toUpperCase()
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: `0 0 ${MOBILE_TOKENS.spacing.xs * 0.25}px`, fontSize: 15, fontWeight: 700, color: MOBILE_TOKENS.colors.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</p>
                {c.ownerName && <p style={{ margin: 0, fontSize: 12, color: MOBILE_TOKENS.colors.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Owner: {c.ownerName}</p>}
                {c.gstin && <p style={{ margin: 0, fontSize: 11, color: MOBILE_TOKENS.colors.textSecondary, fontFamily: 'monospace' }}>GSTIN: {c.gstin}</p>}
              </div>
            </div>
            {(c.phone || c.email) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: MOBILE_TOKENS.spacing.xs * 0.5, marginBottom: MOBILE_TOKENS.spacing.md, fontSize: 12, color: MOBILE_TOKENS.colors.textMuted }}>
                {c.phone && <span style={{ display: 'flex', alignItems: 'center', gap: MOBILE_TOKENS.spacing.xs * 0.625 }}><Phone style={{ width: 12, height: 12 }} />{c.phone}</span>}
                {c.email && <span style={{ display: 'flex', alignItems: 'center', gap: MOBILE_TOKENS.spacing.xs * 0.625, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><Mail style={{ width: 12, height: 12, flexShrink: 0 }} />{c.email}</span>}
              </div>
            )}
            {(c.billingAddress || c.billingCity) && (
              <div style={{ fontSize: 12, color: MOBILE_TOKENS.colors.textMuted, marginBottom: MOBILE_TOKENS.spacing.md, paddingBottom: MOBILE_TOKENS.spacing.md, borderBottom: `1px solid rgba(255,255,255,0.05)` }}>
                {c.billingAddress && <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.billingAddress}</div>}
                {(c.billingCity || c.billingState) && <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{[c.billingCity, c.billingState].filter(Boolean).join(', ')}</div>}
              </div>
            )}
            <div style={{ display: 'flex', gap: MOBILE_TOKENS.spacing.xs }}>
              <button onClick={() => { setEditingCustomer(c); setShowEdit(true); }}
                style={{ flex: 1, padding: `${MOBILE_TOKENS.spacing.md * 0.5625}px 0`, borderRadius: MOBILE_TOKENS.radius.md, border: `1px solid var(--primary)30`, background: 'var(--primary)12', color: 'var(--primary)', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: MOBILE_TOKENS.spacing.xs * 0.625 }}>
                <Edit style={{ width: 14, height: 14 }} /> Edit
              </button>
              <button onClick={() => setDeleteTarget(c)}
                style={{ width: 38, height: 38, borderRadius: MOBILE_TOKENS.radius.md, border: `1px solid rgba(239,68,68,0.2)`, background: 'rgba(239,68,68,0.08)', color: MOBILE_TOKENS.colors.error, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trash2 style={{ width: 15, height: 15 }} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

