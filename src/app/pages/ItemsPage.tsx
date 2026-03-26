import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Plus, Search, Package, Tag, Edit } from 'lucide-react';
import { MobileFormSheet, MobileFormSection, MobileFormActions } from '../components/MobileFormSheet';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../config/api';
import { toast } from 'sonner';
import { ItemsPageSkeleton } from '../components/PageSkeleton';

interface Item {
  id: string;
  name: string;
  hsnSac?: string;
  unit: string;
  rate: number;
  sellingPrice?: number;
  purchaseCost?: number;
  discount?: number;
  cgst: number;
  sgst: number;
  igst: number;
  description?: string;
}

function readItemsCacheSync(): Item[] {
  try {
    const raw = localStorage.getItem('currentProfile');
    if (!raw) return [];
    const p = JSON.parse(raw);
    const profileId = (typeof p === 'string' ? JSON.parse(p) : p)?.id;
    if (!profileId) return [];
    const entry = localStorage.getItem(`cache:items:${profileId}`);
    if (!entry) return [];
    const parsed = JSON.parse(entry);
    return Array.isArray(parsed?.data) ? parsed.data : [];
  } catch { return []; }
}

export function ItemsPage() {
  const [items, setItems] = useState<Item[]>(() => readItemsCacheSync());
  const [filteredItems, setFilteredItems] = useState<Item[]>(() => readItemsCacheSync());
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Item>>({});
  const [formData, setFormData] = useState<Partial<Item>>({
    unit: 'pcs',
    rate: 0,
    sellingPrice: 0,
    purchaseCost: 0,
    discount: 0,
    cgst: 9,
    sgst: 9,
    igst: 0,
  });
  const [loading, setLoading] = useState(() => readItemsCacheSync().length === 0);
  const { accessToken, deviceId } = useAuth();

  const apiUrl = API_URL;
  const currentProfile = JSON.parse(localStorage.getItem('currentProfile') || '{}');
  const profileId = currentProfile?.id;

  const itemsCacheKey = profileId ? `cache:items:${profileId}` : null;
  const ITEMS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 min — survives app restarts on Android

  const readItemsCache = () => {
    if (!itemsCacheKey) return null;
    try {
      const raw = localStorage.getItem(itemsCacheKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const ts = Number(parsed?.ts || 0);
      const data = Array.isArray(parsed?.data) ? parsed.data : null;
      if (!data || !ts) return null;
      return { ts, data } as { ts: number; data: Item[] };
    } catch {
      return null;
    }
  };

  const writeItemsCache = (data: Item[]) => {
    if (!itemsCacheKey) return;
    try {
      localStorage.setItem(itemsCacheKey, JSON.stringify({ ts: Date.now(), data }));
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!accessToken || !deviceId || !profileId) return;
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, deviceId, profileId]);
  const [visibleCount, setVisibleCount] = useState(20);

  useEffect(() => {
    if (searchTerm) {
      setFilteredItems(
        items.filter(item =>
          item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.hsnSac?.includes(searchTerm)
        )
      );
    } else {
      setFilteredItems(items);
    }
    // Reset pagination when searching
    setVisibleCount(20);
  }, [searchTerm, items]);

  const loadItems = async ({ force = false }: { force?: boolean } = {}) => {
    if (!accessToken || !deviceId || !profileId) return;

    const cached = force ? null : readItemsCache();
    const isFresh = cached ? Date.now() - cached.ts < ITEMS_CACHE_TTL_MS : false;

    if (cached?.data?.length) {
      setItems(cached.data);
      setLoading(false);
      if (isFresh) return;
      // Stale — revalidate in background without spinner
    } else {
      setLoading(true);
    }

    try {
      const response = await fetch(`${apiUrl}/items`, {
        headers: { 'Authorization': `Bearer ${accessToken}`, 'X-Device-ID': deviceId, 'X-Profile-ID': profileId },
      });
      const data = await response.json();
      if (!data.error) {
        setItems(data);
        if (Array.isArray(data)) writeItemsCache(data);
      }
    } catch (error) {
      toast.error('Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (item: Item) => {
    setEditingItemId(item.id);
    setEditFormData({ ...item });
    setShowEditDialog(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItemId) return;
    if (!editFormData.name?.trim()) {
      toast.error('Item name is required');
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/items/${editingItemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-Device-ID': deviceId,
          'X-Profile-ID': profileId,
        },
        body: JSON.stringify(editFormData),
      });

      const data = await response.json();
      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success('Item updated successfully!');
        setItems(prev => prev.map(i => (i.id === data.id ? data : i)));
        setShowEditDialog(false);
        setEditingItemId(null);
        setEditFormData({});
      }
    } catch {
      toast.error('Failed to update item');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name?.trim()) {
      toast.error('Item name is required');
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-Device-ID': deviceId,
          'X-Profile-ID': profileId,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      
      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success('Item created successfully!');
        setItems([...items, data]);
        setShowCreateDialog(false);
        setFormData({
          unit: 'pcs',
          rate: 0,
          sellingPrice: 0,
          purchaseCost: 0,
          discount: 0,
          cgst: 9,
          sgst: 9,
          igst: 0,
        });
      }
    } catch (error) {
      toast.error('Failed to create item');
    }
  };

  // Removed full-page fallback to prevent layout reflow flicker.
  // The structure renders instantly now, swapping list items smoothly.

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Items Catalog</h1>
            <p className="text-muted-foreground mt-1">Manage your products and services</p>
          </div>
          <Button className="mt-4 md:mt-0" data-tour-id="cta-add-item" onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>

        <MobileFormSheet open={showCreateDialog} onClose={() => setShowCreateDialog(false)} title="Add New Item">
          <form onSubmit={handleCreate} className="space-y-4">
            <MobileFormSection label="Basic Info">
              <div>
                <Label>Item Name *</Label>
                <Input
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Product or service name"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>HSN/SAC Code</Label>
                  <Input
                    value={formData.hsnSac || ''}
                    onChange={(e) => setFormData({...formData, hsnSac: e.target.value})}
                    placeholder="HSN or SAC"
                  />
                </div>
                <div>
                  <Label>Unit</Label>
                  <Input
                    value={formData.unit || ''}
                    onChange={(e) => setFormData({...formData, unit: e.target.value})}
                    placeholder="pcs, kg, ltr"
                  />
                </div>
              </div>
            </MobileFormSection>

            <MobileFormSection label="Pricing">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Rate (₹)</Label>
                  <Input type="number" step="0.01" min="0" inputMode="decimal"
                    value={formData.rate || 0}
                    onChange={(e) => setFormData({ ...formData, rate: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>Selling Price (₹)</Label>
                  <Input type="number" step="0.01" min="0" inputMode="decimal"
                    value={formData.sellingPrice || 0}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>Purchase Cost (₹)</Label>
                  <Input type="number" step="0.01" min="0" inputMode="decimal"
                    value={formData.purchaseCost || 0}
                    onChange={(e) => setFormData({ ...formData, purchaseCost: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>Discount %</Label>
                  <Input type="number" step="0.01" min="0" max="100" inputMode="decimal"
                    value={formData.discount || 0}
                    onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
              </div>
            </MobileFormSection>

            <MobileFormSection label="Tax Rates">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>CGST %</Label>
                  <Input type="number" step="0.01" min="0" inputMode="decimal"
                    value={formData.cgst || 0}
                    onChange={(e) => setFormData({...formData, cgst: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <Label>SGST %</Label>
                  <Input type="number" step="0.01" min="0" inputMode="decimal"
                    value={formData.sgst || 0}
                    onChange={(e) => setFormData({...formData, sgst: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <Label>IGST %</Label>
                  <Input type="number" step="0.01" min="0" inputMode="decimal"
                    value={formData.igst || 0}
                    onChange={(e) => setFormData({...formData, igst: parseFloat(e.target.value) || 0})}
                  />
                </div>
              </div>
            </MobileFormSection>

            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Item description (optional)"
                rows={2}
              />
            </div>

            <MobileFormActions>
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
              <Button type="submit">Add Item</Button>
            </MobileFormActions>
          </form>
        </MobileFormSheet>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items by name or HSN/SAC code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Items Grid */}
        {loading && items.length === 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="animate-pulse bg-card rounded-xl border border-border p-5">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-muted rounded-lg flex-shrink-0"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/2 bg-muted rounded"></div>
                    <div className="h-3 w-1/4 bg-muted rounded"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {items.length === 0 ? 'No items yet' : 'No matching items'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {items.length === 0 
                  ? 'Add your first item to get started'
                  : 'Try a different search term'}
              </p>
              {items.length === 0 && (
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.slice(0, visibleCount).map((item) => (
                <Card key={item.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Package className="h-6 w-6 text-green-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-lg truncate">{item.name}</CardTitle>
                          {item.hsnSac && (
                            <div className="flex items-center gap-1 mt-1">
                              <Tag className="h-3 w-3 text-muted-foreground" />
                              <p className="text-xs text-muted-foreground font-mono">{item.hsnSac}</p>
                            </div>
                          )}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditClick(item)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Rate</p>
                        <p className="font-semibold text-blue-600">₹{item.rate.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Unit</p>
                        <p className="font-semibold">{item.unit}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Selling Price</p>
                        <p className="font-semibold">₹{Number(item.sellingPrice || 0).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Purchase Cost</p>
                        <p className="font-semibold">₹{Number(item.purchaseCost || 0).toFixed(2)}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 text-xs pt-2 border-t">
                      <div>
                        <p className="text-muted-foreground">CGST</p>
                        <p className="font-semibold">{item.cgst}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">SGST</p>
                        <p className="font-semibold">{item.sgst}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">IGST</p>
                        <p className="font-semibold">{item.igst}%</p>
                      </div>
                    </div>

                    {item.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 pt-2 border-t">
                        {item.description}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {visibleCount < filteredItems.length && (
              <div className="flex justify-center pt-4">
                <Button 
                  variant="outline" 
                  className="w-full sm:w-auto px-8" 
                  onClick={() => setVisibleCount(prev => prev + 50)}
                >
                  Load More ({visibleCount} of {filteredItems.length})
                </Button>
              </div>
            )}
          </div>
        )}

        <MobileFormSheet open={showEditDialog} onClose={() => setShowEditDialog(false)} title="Edit Item">
          <form onSubmit={handleUpdate} className="space-y-4">
            <MobileFormSection label="Basic Info">
              <div>
                <Label>Item Name *</Label>
                <Input
                  required
                  value={editFormData.name || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  placeholder="Product or service name"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>HSN/SAC Code</Label>
                  <Input
                    value={editFormData.hsnSac || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, hsnSac: e.target.value })}
                    placeholder="HSN or SAC"
                  />
                </div>
                <div>
                  <Label>Unit</Label>
                  <Input
                    value={editFormData.unit || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, unit: e.target.value })}
                    placeholder="pcs, kg, ltr"
                  />
                </div>
              </div>
            </MobileFormSection>

            <MobileFormSection label="Pricing">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Rate (₹)</Label>
                  <Input type="number" step="0.01" min="0" inputMode="decimal"
                    value={editFormData.rate || 0}
                    onChange={(e) => setEditFormData({ ...editFormData, rate: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>Selling Price (₹)</Label>
                  <Input type="number" step="0.01" min="0" inputMode="decimal"
                    value={editFormData.sellingPrice || 0}
                    onChange={(e) => setEditFormData({ ...editFormData, sellingPrice: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>Purchase Cost (₹)</Label>
                  <Input type="number" step="0.01" min="0" inputMode="decimal"
                    value={editFormData.purchaseCost || 0}
                    onChange={(e) => setEditFormData({ ...editFormData, purchaseCost: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>Discount %</Label>
                  <Input type="number" step="0.01" min="0" max="100" inputMode="decimal"
                    value={editFormData.discount || 0}
                    onChange={(e) => setEditFormData({ ...editFormData, discount: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
              </div>
            </MobileFormSection>

            <MobileFormSection label="Tax Rates">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>CGST %</Label>
                  <Input type="number" step="0.01" min="0" inputMode="decimal"
                    value={editFormData.cgst || 0}
                    onChange={(e) => setEditFormData({ ...editFormData, cgst: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>SGST %</Label>
                  <Input type="number" step="0.01" min="0" inputMode="decimal"
                    value={editFormData.sgst || 0}
                    onChange={(e) => setEditFormData({ ...editFormData, sgst: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>IGST %</Label>
                  <Input type="number" step="0.01" min="0" inputMode="decimal"
                    value={editFormData.igst || 0}
                    onChange={(e) => setEditFormData({ ...editFormData, igst: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </MobileFormSection>

            <div>
              <Label>Description</Label>
              <Textarea
                value={editFormData.description || ''}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                placeholder="Item description (optional)"
                rows={2}
              />
            </div>

            <MobileFormActions>
              <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </MobileFormActions>
          </form>
        </MobileFormSheet>

        {/* Summary */}
        {filteredItems.length > 0 && (
          <Card className="mt-6">
            <CardContent className="py-4">
              <p className="text-sm text-muted-foreground">
                Showing {filteredItems.length} of {items.length} items
              </p>
            </CardContent>
          </Card>
        )}
      </div>
  );
}
