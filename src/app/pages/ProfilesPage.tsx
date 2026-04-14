import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import { toast } from 'sonner';
import { Plus, Building2, LogOut, Edit, Trash2 } from 'lucide-react';
import { API_URL } from '../config/api';
import { INDIAN_STATES } from '../utils/indianStates';
import QRCode from 'qrcode';
import { TraceLoader } from '../components/TraceLoader';
import { PhoneInput, EmailInput, GstinInput, PanInput, AccountNumberInput, IfscInput, UpiInput, PostalCodeInput, AddressInput } from '../components/FormattedInputs';
import { useIsNative } from '../hooks/useIsNative';

interface BankAccount {
  _id?: string;
  label?: string;
  bankName?: string;
  bankBranch?: string;
  accountNumber?: string;
  ifscCode?: string;
  upiId?: string;
  upiQrText?: string;
  isDefault?: boolean;
}

interface BusinessProfile {
  id: string;
  businessName: string;
  ownerName: string;
  gstin?: string;
  pan?: string;
  email: string;
  phone: string;
  billingAddress?: string;
  shippingAddress?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  bankName?: string;
  bankBranch?: string;
  accountNumber?: string;
  ifscCode?: string;
  upiId?: string;
  bankAccounts?: BankAccount[];
  defaultBankAccountId?: string;
  smsReminderTemplate?: string;
  customFields?: Record<string, any>;
}

import { clearApiCache } from '../hooks/useApiCache';

export function ProfilesPage() {
  const [profiles, setProfiles] = useState<BusinessProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState<Partial<BusinessProfile>>({});
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<BusinessProfile>>({});
  const [upiQrDataUrl, setUpiQrDataUrl] = useState<string>('');
  const [profileUpiQrMap, setProfileUpiQrMap] = useState<Record<string, string>>({});
  const { user, accessToken, deviceId, signOut, reloadProfiles } = useAuth();
  const navigate = useNavigate();
  const isNative = useIsNative();

  const apiUrl = API_URL;

  const sanitizeBankAccounts = (accounts: any) => {
    const arr = Array.isArray(accounts) ? accounts : [];
    return arr
      .map((a: any) => ({
        _id: a?._id,
        label: String(a?.label || '').trim() || undefined,
        bankName: String(a?.bankName || '').trim() || undefined,
        bankBranch: String(a?.bankBranch || '').trim() || undefined,
        accountNumber: String(a?.accountNumber || '').trim() || undefined,
        ifscCode: String(a?.ifscCode || '').trim() || undefined,
        upiId: String(a?.upiId || '').trim() || undefined,
        upiQrText: String(a?.upiQrText || '').trim() || undefined,
        isDefault: !!a?.isDefault,
      }))
      .filter((a: any) => a.label || a.bankName || a.accountNumber || a.ifscCode || a.upiId || a.upiQrText);
  };

  const addEmptyBankAccount = (target: 'create' | 'edit') => {
    if (target === 'create') {
      setFormData((p) => ({
        ...p,
        bankAccounts: [...(Array.isArray(p.bankAccounts) ? p.bankAccounts : []), { label: '' }],
      }));
      return;
    }
    setEditFormData((p) => ({
      ...p,
      bankAccounts: [...(Array.isArray(p.bankAccounts) ? p.bankAccounts : []), { label: '' }],
    }));
  };

  const updateBankAccount = (target: 'create' | 'edit', index: number, patch: Partial<BankAccount>) => {
    const set = target === 'create' ? setFormData : setEditFormData;
    set((prev: any) => {
      const next = { ...(prev || {}) };
      const list = Array.isArray(next.bankAccounts) ? [...next.bankAccounts] : [];
      const row = { ...(list[index] || {}) };
      list[index] = { ...row, ...patch };
      next.bankAccounts = list;
      return next;
    });
  };

  const removeBankAccount = (target: 'create' | 'edit', index: number) => {
    const set = target === 'create' ? setFormData : setEditFormData;
    set((prev: any) => {
      const next = { ...(prev || {}) };
      const list = Array.isArray(next.bankAccounts) ? [...next.bankAccounts] : [];
      list.splice(index, 1);
      next.bankAccounts = list;
      return next;
    });
  };

  const handleSelectProfile = async (profile: BusinessProfile) => {
    // Clear all caches before switching profile so stale data never bleeds through
    await clearApiCache();
    try {
      localStorage.setItem('currentProfile', JSON.stringify(profile));
    } catch {
      // ignore
    }
    // Signal all pages to clear their local state
    window.dispatchEvent(new CustomEvent('profileChanged', { detail: { profileId: profile.id } }));
    navigate('/dashboard');
  };

  const handleEditClick = (profile: BusinessProfile, e?: any) => {
    if (e?.stopPropagation) e.stopPropagation();
    setEditingProfileId(profile.id);
    setEditFormData({ ...profile });
    setShowEditDialog(true);
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  useEffect(() => {
    const generatePreview = async () => {
      const upi = String(editFormData.upiId || '').trim();
      if (!upi) {
        setUpiQrDataUrl('');
        return;
      }
      try {
        const url = `upi://pay?pa=${encodeURIComponent(upi)}&pn=${encodeURIComponent(editFormData.businessName || '')}&cu=INR`;
        const dataUrl = await QRCode.toDataURL(url, { margin: 1, width: 240 });
        setUpiQrDataUrl(dataUrl);
      } catch (e) {
        setUpiQrDataUrl('');
      }
    };
    generatePreview();
  }, [editFormData.upiId, editFormData.businessName]);

  useEffect(() => {
    const generateMap = async () => {
      const map: Record<string, string> = {};
      for (const p of profiles) {
        const upi = String(p.upiId || '').trim();
        if (upi) {
          try {
            const url = `upi://pay?pa=${encodeURIComponent(upi)}&pn=${encodeURIComponent(p.businessName || '')}&cu=INR`;
            const dataUrl = await QRCode.toDataURL(url, { margin: 1, width: 80 });
            map[p.id] = dataUrl;
          } catch {
            // ignore
          }
        }
      }
      setProfileUpiQrMap(map);
    };
    if (profiles.length > 0) generateMap();
  }, [profiles]);

  const loadProfiles = async () => {
    try {
      const response = await fetch(`${apiUrl}/profiles`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Device-ID': deviceId,
        },
      });
      const data = await response.json();
      if (data.error) {
        toast.error(data.error);
      } else {
        setProfiles(data);
      }
    } catch (error) {
      toast.error('Failed to load profiles');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const addressValue = String(formData.billingAddress || '').trim();
      const payload = {
        ...formData,
        billingAddress: addressValue || null,
        shippingAddress: addressValue || null,
        bankAccounts: sanitizeBankAccounts((formData as any)?.bankAccounts),
      };
      const response = await fetch(`${apiUrl}/profiles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-Device-ID': deviceId,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      
      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success('Profile created successfully!');
        setProfiles([...profiles, data]);
        await reloadProfiles();
        setShowCreateDialog(false);
        setFormData({});
      }
    } catch (error) {
      toast.error('Failed to create profile');
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingProfileId) return;

    try {
      const addressValue = String(editFormData.billingAddress || '').trim();
      const payload = {
        ...editFormData,
        billingAddress: addressValue || null,
        shippingAddress: addressValue || null,
        bankAccounts: sanitizeBankAccounts((editFormData as any)?.bankAccounts),
      };
      const response = await fetch(`${apiUrl}/profiles/${editingProfileId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-Device-ID': deviceId,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      
      if (data.error) {
        toast.error(data.error);
        return;
      }

      toast.success('Profile updated successfully!');
      setProfiles(prev => prev.map(p => (p.id === data.id ? data : p)));

      const stored = localStorage.getItem('currentProfile');
      if (stored) {
        try {
          const current = JSON.parse(stored);
          if (current?.id === data.id) {
            localStorage.setItem('currentProfile', JSON.stringify(data));
          }
        } catch {
          // ignore
        }
      }

      setShowEditDialog(false);
      setEditingProfileId(null);
      setEditFormData({});
    } catch {
      toast.error('Failed to update profile');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <TraceLoader label="Loading profiles..." />
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isNative ? 'bg-transparent' : 'bg-background'}`}>
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className={`text-3xl font-bold ${isNative ? 'text-white' : 'text-foreground'}`}>Select Business Profile</h1>
            <p className="text-muted-foreground mt-1">Welcome back, {user?.name || user?.email}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Profiles Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className="bv-flip-card cursor-pointer"
              onClick={() => handleSelectProfile(profile)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSelectProfile(profile);
                }
              }}
            >
              <div className="bv-flip-inner">
                <div className="bv-flip-face bv-flip-front">
                  <div className="bv-flip-actions">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleEditClick(profile, e)}
                      className="text-white/70 hover:text-white hover:bg-white/10"
                      aria-label="Edit profile"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="bv-flip-header">
                    <div className="bv-flip-icon">
                      <Building2 className="h-5 w-5 text-white" />
                    </div>
                    <div className="bv-flip-brand">BILLVYAPAR</div>
                  </div>

                  <div className="bv-flip-meta">
                    <div className="bv-flip-title">{profile.businessName}</div>
                    <div className="bv-flip-subtitle">{profile.ownerName}</div>
                  </div>

                  <div className="bv-flip-details">
                    <div>{profile.email}</div>
                    <div>{profile.phone}</div>
                    {profile.gstin ? (
                      <div className="font-mono text-[11px] opacity-90">GSTIN: {profile.gstin}</div>
                    ) : (
                      <div className="font-mono text-[11px] opacity-60">GSTIN: —</div>
                    )}
                  </div>
                </div>

                <div className="bv-flip-face bv-flip-back">
                  <div className="bv-flip-actions">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleEditClick(profile, e)}
                      className="text-white/70 hover:text-white hover:bg-white/10"
                      aria-label="Edit profile"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="bv-flip-strip" />
                  {!profileUpiQrMap[profile.id] ? (
                    <div className="bv-flip-strip-row">
                      <div className="bv-flip-strip-mid" />
                      <div className="bv-flip-strip-small">***</div>
                    </div>
                  ) : null}

                  <div className="bv-flip-qr-area">
                    {profileUpiQrMap[profile.id] ? (
                      <img src={profileUpiQrMap[profile.id]} alt="UPI QR" className="bv-flip-qr-large" />
                    ) : (
                      <div className="bv-flip-qr-fallback">***</div>
                    )}
                  </div>

                  <div className="bv-flip-details">
                    <div className="text-white/85">Click to select this profile</div>
                    <div className="text-white/70 text-[11px]">(Hover to flip)</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Business Profile</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="editBusinessName">Business Name *</Label>
                    <Input
                      id="editBusinessName"
                      required
                      value={editFormData.businessName || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, businessName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="editOwnerName">Owner Name <span className="text-muted-foreground font-normal ml-1">(Optional)</span></Label>
                    <Input
                      id="editOwnerName"
                      value={editFormData.ownerName || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, ownerName: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="editEmail">Email *</Label>
                    <Input
                      id="editEmail"
                      type="email"
                      required
                      value={editFormData.email || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    />
                  </div>
                  <PhoneInput
                    label="Phone *"
                    value={editFormData.phone || ''}
                    onChange={(v) => setEditFormData({ ...editFormData, phone: v })}
                    required
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <GstinInput
                    label="GSTIN"
                    value={editFormData.gstin || ''}
                    onChange={(v) => setEditFormData({ ...editFormData, gstin: v })}
                  />
                  <PanInput
                    label="PAN"
                    value={editFormData.pan || ''}
                    onChange={(v) => setEditFormData({ ...editFormData, pan: v })}
                  />
                </div>

                <AddressInput
                  label="Address"
                  value={editFormData.billingAddress || ''}
                  onChange={(v) => setEditFormData({ ...editFormData, billingAddress: v })}
                  rows={2}
                />

                <div>
                  <Label htmlFor="editSmsReminderTemplate">SMS Reminder Template</Label>
                  <Textarea
                    id="editSmsReminderTemplate"
                    value={editFormData.smsReminderTemplate || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, smsReminderTemplate: e.target.value })}
                    placeholder="Use variables: {party}, {docNo}, {amount}, {dueDate}, {businessName}"
                    rows={2}
                  />
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="editCity">City</Label>
                    <Input
                      id="editCity"
                      value={editFormData.city || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                      placeholder="Bangalore"
                    />
                  </div>
                  <div>
                    <Label htmlFor="editState">State</Label>
                    <Select
                      value={editFormData.state || ''}
                      onValueChange={(value) => setEditFormData({ ...editFormData, state: value })}
                    >
                      <SelectTrigger id="editState">
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        {INDIAN_STATES.map((state) => (
                          <SelectItem key={state} value={state}>
                            {state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="editPostalCode">Postal Code</Label>
                    <PostalCodeInput
                      value={editFormData.postalCode || ''}
                      onChange={(v) => setEditFormData({ ...editFormData, postalCode: v })}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="editBankName">Bank Name</Label>
                    <Input
                      id="editBankName"
                      value={editFormData.bankName || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, bankName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="editBankBranch">Branch</Label>
                    <Input
                      id="editBankBranch"
                      value={editFormData.bankBranch || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, bankBranch: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <AccountNumberInput
                    label="Account Number"
                    value={editFormData.accountNumber || ''}
                    onChange={(v) => setEditFormData({ ...editFormData, accountNumber: v })}
                  />
                  <IfscInput
                    label="IFSC Code"
                    value={editFormData.ifscCode || ''}
                    onChange={(v) => setEditFormData({ ...editFormData, ifscCode: v })}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4 items-start">
                  <div>
                    <UpiInput
                      label="UPI ID"
                      value={editFormData.upiId || ''}
                      onChange={(v) => setEditFormData({ ...editFormData, upiId: v })}
                    />
                    <p className="text-xs text-gray-500 mt-1">Use E.164 phone in signup; UPI ID here is for invoice payments.</p>
                  </div>
                  <div>
                    <Label>Payment QR</Label>
                    {upiQrDataUrl ? (
                      <div className="mt-2 rounded-md border bg-white p-3 w-fit">
                        <img src={upiQrDataUrl} alt="UPI QR" className="h-[160px] w-[160px]" />
                      </div>
                    ) : (
                      <div className="mt-2 text-sm text-gray-600">Enter UPI ID to preview QR</div>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold">Bank Accounts</div>
                    <Button type="button" variant="outline" size="sm" onClick={() => addEmptyBankAccount('edit')}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Bank Account
                    </Button>
                  </div>

                  {(Array.isArray(editFormData.bankAccounts) ? editFormData.bankAccounts : []).length === 0 ? (
                    <div className="text-sm text-muted-foreground">No bank accounts added.</div>
                  ) : null}

                  <div className="space-y-3">
                    {(Array.isArray(editFormData.bankAccounts) ? editFormData.bankAccounts : []).map((a, idx) => (
                      <div key={String(a?._id || idx)} className="rounded-md border p-3 space-y-3 bg-background/60">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={!!a?.isDefault}
                              onCheckedChange={(v) => {
                                const nextChecked = !!v;
                                const list = Array.isArray(editFormData.bankAccounts) ? [...editFormData.bankAccounts] : [];
                                const next = list.map((row, i) => ({ ...(row || {}), isDefault: i === idx ? nextChecked : false }));
                                setEditFormData((p) => ({ ...(p || {}), bankAccounts: next }));
                              }}
                            />
                            <div className="text-sm">Default</div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeBankAccount('edit', idx)}
                            aria-label="Remove bank account"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label>Label</Label>
                            <Input value={a?.label || ''} onChange={(e) => updateBankAccount('edit', idx, { label: e.target.value })} className="h-9" />
                          </div>
                          <div className="space-y-1">
                            <Label>Bank Name</Label>
                            <Input value={a?.bankName || ''} onChange={(e) => updateBankAccount('edit', idx, { bankName: e.target.value })} className="h-9" />
                          </div>
                          <div className="space-y-1">
                            <Label>Branch</Label>
                            <Input value={a?.bankBranch || ''} onChange={(e) => updateBankAccount('edit', idx, { bankBranch: e.target.value })} className="h-9" />
                          </div>
                          <div className="space-y-1">
                            <Label>Account Number</Label>
                            <Input value={a?.accountNumber || ''} onChange={(e) => updateBankAccount('edit', idx, { accountNumber: e.target.value })} className="h-9" />
                          </div>
                          <div className="space-y-1">
                            <Label>IFSC</Label>
                            <Input value={a?.ifscCode || ''} onChange={(e) => updateBankAccount('edit', idx, { ifscCode: e.target.value })} className="h-9" />
                          </div>
                          <div className="space-y-1">
                            <Label>UPI ID</Label>
                            <Input value={a?.upiId || ''} onChange={(e) => updateBankAccount('edit', idx, { upiId: e.target.value })} className="h-9" />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label>UPI QR Text</Label>
                            <Input value={a?.upiQrText || ''} onChange={(e) => updateBankAccount('edit', idx, { upiQrText: e.target.value })} className="h-9" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Save Changes</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Create New Profile Card */}
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Card className="cursor-pointer hover:shadow-lg transition-shadow border-dashed border-2 flex items-center justify-center min-h-[250px]">
                <CardContent className="text-center py-12">
                  <Plus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <CardTitle className="text-muted-foreground">Create New Profile</CardTitle>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Business Profile</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateProfile} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="businessName">Business Name *</Label>
                    <Input
                      id="businessName"
                      required
                      value={formData.businessName || ''}
                      onChange={(e) => setFormData({...formData, businessName: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="ownerName">Owner Name <span className="text-muted-foreground font-normal ml-1">(Optional)</span></Label>
                    <Input
                      id="ownerName"
                      value={formData.ownerName || ''}
                      onChange={(e) => setFormData({...formData, ownerName: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={formData.email || ''}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone *</Label>
                    <Input
                      id="phone"
                      required
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <GstinInput
                    label="GSTIN"
                    value={formData.gstin || ''}
                    onChange={(v) => setFormData({...formData, gstin: v})}
                  />
                  <PanInput
                    label="PAN"
                    value={formData.pan || ''}
                    onChange={(v) => setFormData({...formData, pan: v})}
                  />
                </div>

                <div>
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={formData.billingAddress || ''}
                    onChange={(e) => setFormData({...formData, billingAddress: e.target.value})}
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="smsReminderTemplate">SMS Reminder Template</Label>
                  <Textarea
                    id="smsReminderTemplate"
                    value={formData.smsReminderTemplate || ''}
                    onChange={(e) => setFormData({ ...formData, smsReminderTemplate: e.target.value })}
                    placeholder="Use variables: {party}, {docNo}, {amount}, {dueDate}, {businessName}"
                    rows={2}
                  />
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city || ''}
                      onChange={(e) => setFormData({...formData, city: e.target.value})}
                      placeholder="Bangalore"
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Select
                      value={formData.state || ''}
                      onValueChange={(value) => setFormData({...formData, state: value})}
                    >
                      <SelectTrigger id="state">
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        {INDIAN_STATES.map((state) => (
                          <SelectItem key={state} value={state}>
                            {state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="postalCode">Postal Code</Label>
                    <Input
                      id="postalCode"
                      value={formData.postalCode || ''}
                      onChange={(e) => setFormData({...formData, postalCode: e.target.value})}
                      placeholder="560001"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="bankName">Bank Name</Label>
                    <Input
                      id="bankName"
                      value={formData.bankName || ''}
                      onChange={(e) => setFormData({...formData, bankName: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="bankBranch">Branch</Label>
                    <Input
                      id="bankBranch"
                      value={formData.bankBranch || ''}
                      onChange={(e) => setFormData({...formData, bankBranch: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="accountNumber">Account Number</Label>
                    <Input
                      id="accountNumber"
                      value={formData.accountNumber || ''}
                      onChange={(e) => setFormData({...formData, accountNumber: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="ifscCode">IFSC Code</Label>
                  <Input
                    id="ifscCode"
                    value={formData.ifscCode || ''}
                    onChange={(e) => setFormData({...formData, ifscCode: e.target.value})}
                  />
                </div>

                <div>
                  <Label htmlFor="upiId">UPI ID</Label>
                  <Input
                    id="upiId"
                    value={formData.upiId || ''}
                    onChange={(e) => setFormData({...formData, upiId: e.target.value})}
                    placeholder="business@upi"
                  />
                </div>

                <div className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold">Bank Accounts</div>
                    <Button type="button" variant="outline" size="sm" onClick={() => addEmptyBankAccount('create')}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Bank Account
                    </Button>
                  </div>

                  {(Array.isArray(formData.bankAccounts) ? formData.bankAccounts : []).length === 0 ? (
                    <div className="text-sm text-muted-foreground">No bank accounts added.</div>
                  ) : null}

                  <div className="space-y-3">
                    {(Array.isArray(formData.bankAccounts) ? formData.bankAccounts : []).map((a, idx) => (
                      <div key={String(a?._id || idx)} className="rounded-md border p-3 space-y-3 bg-background/60">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={!!a?.isDefault}
                              onCheckedChange={(v) => {
                                const nextChecked = !!v;
                                const list = Array.isArray(formData.bankAccounts) ? [...formData.bankAccounts] : [];
                                const next = list.map((row, i) => ({ ...(row || {}), isDefault: i === idx ? nextChecked : false }));
                                setFormData((p) => ({ ...(p || {}), bankAccounts: next }));
                              }}
                            />
                            <div className="text-sm">Default</div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeBankAccount('create', idx)}
                            aria-label="Remove bank account"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label>Label</Label>
                            <Input value={a?.label || ''} onChange={(e) => updateBankAccount('create', idx, { label: e.target.value })} className="h-9" />
                          </div>
                          <div className="space-y-1">
                            <Label>Bank Name</Label>
                            <Input value={a?.bankName || ''} onChange={(e) => updateBankAccount('create', idx, { bankName: e.target.value })} className="h-9" />
                          </div>
                          <div className="space-y-1">
                            <Label>Branch</Label>
                            <Input value={a?.bankBranch || ''} onChange={(e) => updateBankAccount('create', idx, { bankBranch: e.target.value })} className="h-9" />
                          </div>
                          <div className="space-y-1">
                            <Label>Account Number</Label>
                            <Input value={a?.accountNumber || ''} onChange={(e) => updateBankAccount('create', idx, { accountNumber: e.target.value })} className="h-9" />
                          </div>
                          <div className="space-y-1">
                            <Label>IFSC</Label>
                            <Input value={a?.ifscCode || ''} onChange={(e) => updateBankAccount('create', idx, { ifscCode: e.target.value })} className="h-9" />
                          </div>
                          <div className="space-y-1">
                            <Label>UPI ID</Label>
                            <Input value={a?.upiId || ''} onChange={(e) => updateBankAccount('create', idx, { upiId: e.target.value })} className="h-9" />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label>UPI QR Text</Label>
                            <Input value={a?.upiQrText || ''} onChange={(e) => updateBankAccount('create', idx, { upiQrText: e.target.value })} className="h-9" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Create Profile</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {profiles.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Business Profiles Yet</h3>
            <p className="text-muted-foreground mb-4">Create your first business profile to get started</p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Profile
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}