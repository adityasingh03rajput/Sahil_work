import { useState, useEffect } from 'react';
import { AppLayout } from '../components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Plus, Search, Package, Tag } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../config/api';
import { toast } from 'sonner';
import { TraceLoader } from '../components/TraceLoader';

interface Item {
  id: string;
  name: string;
  hsnSac?: string;
  unit: string;
  rate: number;
  discount?: number;
  cgst: number;
  sgst: number;
  igst: number;
  description?: string;
}

export function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState<Partial<Item>>({
    unit: 'pcs',
    rate: 0,
    discount: 0,
    cgst: 9,
    sgst: 9,
    igst: 0,
  });
  const [loading, setLoading] = useState(true);
  const { accessToken, deviceId } = useAuth();

  const apiUrl = API_URL;
  const currentProfile = JSON.parse(localStorage.getItem('currentProfile') || '{}');
  const profileId = currentProfile?.id;

  useEffect(() => {
    loadItems();
  }, []);

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
  }, [searchTerm, items]);

  const loadItems = async () => {
    try {
      const response = await fetch(`${apiUrl}/items`, {
        headers: { 'Authorization': `Bearer ${accessToken}`, 'X-Device-ID': deviceId, 'X-Profile-ID': profileId },
      });
      const data = await response.json();
      if (!data.error) {
        setItems(data);
      }
    } catch (error) {
      toast.error('Failed to load items');
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <TraceLoader label="Loading items..." />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Items Catalog</h1>
            <p className="text-gray-600 mt-1">Manage your products and services</p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="mt-4 md:mt-0" data-tour-id="cta-add-item">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Item</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <Label>Item Name *</Label>
                  <Input
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Product or service name"
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>HSN/SAC Code</Label>
                    <Input
                      value={formData.hsnSac || ''}
                      onChange={(e) => setFormData({...formData, hsnSac: e.target.value})}
                      placeholder="HSN or SAC code"
                    />
                  </div>
                  <div>
                    <Label>Unit</Label>
                    <Input
                      value={formData.unit || ''}
                      onChange={(e) => setFormData({...formData, unit: e.target.value})}
                      placeholder="pcs, kg, ltr, etc."
                    />
                  </div>
                </div>
                <div>
                  <Label>Rate (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.rate || 0}
                    onChange={(e) => setFormData({...formData, rate: parseFloat(e.target.value) || 0})}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>Disc %</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.discount || 0}
                    onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label>CGST %</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.cgst || 0}
                      onChange={(e) => setFormData({...formData, cgst: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <Label>SGST %</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.sgst || 0}
                      onChange={(e) => setFormData({...formData, sgst: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <Label>IGST %</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.igst || 0}
                      onChange={(e) => setFormData({...formData, igst: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Item description (optional)"
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Add Item</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
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
        {filteredItems.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {items.length === 0 ? 'No items yet' : 'No matching items'}
              </h3>
              <p className="text-gray-600 mb-4">
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
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => (
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
                            <Tag className="h-3 w-3 text-gray-500" />
                            <p className="text-xs text-gray-600 font-mono">{item.hsnSac}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-600 text-xs">Rate</p>
                      <p className="font-semibold text-blue-600">₹{item.rate.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-xs">Unit</p>
                      <p className="font-semibold">{item.unit}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-xs pt-2 border-t">
                    <div>
                      <p className="text-gray-600">CGST</p>
                      <p className="font-semibold">{item.cgst}%</p>
                    </div>
                    <div>
                      <p className="text-gray-600">SGST</p>
                      <p className="font-semibold">{item.sgst}%</p>
                    </div>
                    <div>
                      <p className="text-gray-600">IGST</p>
                      <p className="font-semibold">{item.igst}%</p>
                    </div>
                  </div>

                  {item.description && (
                    <p className="text-xs text-gray-600 line-clamp-2 pt-2 border-t">
                      {item.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Summary */}
        {filteredItems.length > 0 && (
          <Card className="mt-6">
            <CardContent className="py-4">
              <p className="text-sm text-gray-600">
                Showing {filteredItems.length} of {items.length} items
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
