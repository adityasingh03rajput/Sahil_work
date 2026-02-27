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
import { toast } from 'sonner';
import { Plus, Building2, LogOut, Edit } from 'lucide-react';
import { API_URL } from '../config/api';
import { INDIAN_STATES } from '../utils/indianStates';
import QRCode from 'qrcode';
import { TraceLoader } from '../components/TraceLoader';

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
  customFields?: Record<string, any>;
}

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
  const { user, accessToken, deviceId, signOut } = useAuth();
  const navigate = useNavigate();

  const apiUrl = API_URL;

  useEffect(() => {
    loadProfiles();
  }, []);

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

  const buildUpiUri = (upiId?: string) => {
    const pa = String(upiId || '').trim();
    if (!pa) return '';
    const pn = String(editFormData.businessName || formData.businessName || '').trim();
    const params = new URLSearchParams();
    params.set('pa', pa);
    if (pn) params.set('pn', pn);
    params.set('cu', 'INR');
    params.set('tn', 'Payment via BillVyapar');
    return `upi://pay?${params.toString()}`;
  };

  const buildUpiUriForProfile = (profile: BusinessProfile) => {
    const pa = String(profile.upiId || '').trim();
    if (!pa) return '';
    const pn = String(profile.businessName || '').trim();
    const params = new URLSearchParams();
    params.set('pa', pa);
    if (pn) params.set('pn', pn);
    params.set('cu', 'INR');
    params.set('tn', 'Payment via BillVyapar');
    return `upi://pay?${params.toString()}`;
  };

  useEffect(() => {
    const run = async () => {
      const uri = buildUpiUri(editFormData.upiId);
      if (!uri) {
        setUpiQrDataUrl('');
        return;
      }
      try {
        const url = await QRCode.toDataURL(uri, { margin: 1, width: 220 });
        setUpiQrDataUrl(url);
      } catch {
        setUpiQrDataUrl('');
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editFormData.upiId, editFormData.businessName]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const next: Record<string, string> = {};
      await Promise.all(
        profiles.map(async (p) => {
          const uri = buildUpiUriForProfile(p);
          if (!uri) return;
          try {
            const url = await QRCode.toDataURL(uri, { margin: 1, width: 300 });
            next[p.id] = url;
          } catch {
            // ignore
          }
        })
      );

      if (cancelled) return;
      setProfileUpiQrMap(next);
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [profiles]);

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const addressValue = String(formData.billingAddress || '').trim();
      const payload = { ...formData, billingAddress: addressValue || null, shippingAddress: addressValue || null };
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
        setShowCreateDialog(false);
        setFormData({});
      }
    } catch (error) {
      toast.error('Failed to create profile');
    }
  };

  const handleSelectProfile = (profile: BusinessProfile) => {
    const migrate = async () => {
      try {
        const key = `profileDataMigrated:${profile.id}`;
        if (!localStorage.getItem(key)) {
          const res = await fetch(`${apiUrl}/profiles/${profile.id}/migrate-data`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'X-Device-ID': deviceId,
            },
          });
          const data = await res.json();
          if (!data?.error) {
            localStorage.setItem(key, '1');
          }
        }
      } catch {
        // ignore
      }
    };

    localStorage.setItem('currentProfile', JSON.stringify(profile));
    migrate().finally(() => navigate('/dashboard'));
  };

  const handleEditClick = (profile: BusinessProfile, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProfileId(profile.id);
    setEditFormData({ ...profile });
    setShowEditDialog(true);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingProfileId) return;

    try {
      const addressValue = String(editFormData.billingAddress || '').trim();
      const payload = { ...editFormData, billingAddress: addressValue || null, shippingAddress: addressValue || null };
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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Select Business Profile</h1>
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
                    <Label htmlFor="editOwnerName">Owner Name *</Label>
                    <Input
                      id="editOwnerName"
                      required
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
                  <div>
                    <Label htmlFor="editPhone">Phone *</Label>
                    <Input
                      id="editPhone"
                      required
                      value={editFormData.phone || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="editGstin">GSTIN</Label>
                    <Input
                      id="editGstin"
                      value={editFormData.gstin || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, gstin: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="editPan">PAN</Label>
                    <Input
                      id="editPan"
                      value={editFormData.pan || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, pan: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="editAddress">Address</Label>
                  <Textarea
                    id="editAddress"
                    value={editFormData.billingAddress || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, billingAddress: e.target.value })}
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
                    <Input
                      id="editPostalCode"
                      value={editFormData.postalCode || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, postalCode: e.target.value })}
                      placeholder="560001"
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
                  <div>
                    <Label htmlFor="editAccountNumber">Account Number</Label>
                    <Input
                      id="editAccountNumber"
                      value={editFormData.accountNumber || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, accountNumber: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="editIfscCode">IFSC Code</Label>
                    <Input
                      id="editIfscCode"
                      value={editFormData.ifscCode || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, ifscCode: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 items-start">
                  <div>
                    <Label htmlFor="editUpiId">UPI ID</Label>
                    <Input
                      id="editUpiId"
                      value={editFormData.upiId || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, upiId: e.target.value })}
                      placeholder="business@upi"
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
                    <Label htmlFor="ownerName">Owner Name *</Label>
                    <Input
                      id="ownerName"
                      required
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
                  <div>
                    <Label htmlFor="gstin">GSTIN</Label>
                    <Input
                      id="gstin"
                      value={formData.gstin || ''}
                      onChange={(e) => setFormData({...formData, gstin: e.target.value})}
                      placeholder="22AAAAA0000A1Z5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="pan">PAN</Label>
                    <Input
                      id="pan"
                      value={formData.pan || ''}
                      onChange={(e) => setFormData({...formData, pan: e.target.value})}
                      placeholder="AAAAA0000A"
                    />
                  </div>
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