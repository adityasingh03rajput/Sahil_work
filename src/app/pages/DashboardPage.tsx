import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { 
  FileText, 
  Plus, 
  DollarSign, 
  TrendingUp, 
  Clock,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../config/api';
import { TraceLoader } from '../components/TraceLoader';
import { GenericPageSkeleton } from '../components/PageSkeleton';
import { prefetchRoutesOnIdle } from '../hooks/usePrefetch';
import { DateRangePicker, DateRange } from '../components/ui/date-range-picker';

export function DashboardPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [recentDocs, setRecentDocs] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>({ from: '', to: '' });
  const { accessToken, deviceId } = useAuth();
  const navigate = useNavigate();

  const apiUrl = API_URL;

  // Read profileId fresh each time — avoids stale closure issues
  const getProfileId = () => {
    try {
      const raw = localStorage.getItem('currentProfile');
      if (!raw) return '';
      const p = JSON.parse(raw);
      return (typeof p === 'string' ? JSON.parse(p) : p)?.id ?? '';
    } catch { return ''; }
  };

  const [profileId, setProfileId] = useState<string>(getProfileId);

  // Single effect: load on mount + listen for profile changes
  useEffect(() => {
    if (profileId) loadDashboardData(profileId, dateRange);

    const onProfileRefreshed = (e: Event) => {
      const newId = (e as CustomEvent)?.detail?.id;
      if (newId && newId !== profileId) {
        setProfileId(newId);
      }
    };
    window.addEventListener('profileRefreshed', onProfileRefreshed);
    return () => window.removeEventListener('profileRefreshed', onProfileRefreshed);
  }, [profileId, accessToken]);

  const loadDashboardData = async (pid: string, range: DateRange) => {
    if (!pid || !accessToken) { setLoading(false); return; }
    setLoading(true);
    try {
      const dates = (range.from || range.to) ? `&from=${range.from}&to=${range.to}` : '';
      const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'X-Device-ID': deviceId,
        'X-Profile-ID': pid,
      };

      const [analyticsRes, docsRes, subRes] = await Promise.all([
        fetch(`${apiUrl}/analytics?${dates}`, { headers }),
        fetch(`${apiUrl}/documents?limit=5${dates}`, { headers }),
        fetch(`${apiUrl}/subscription/validate`, { headers }),
      ]);

      if (analyticsRes.ok) {
        const d = await analyticsRes.json();
        if (!d.error) setAnalytics(d);
      }

      if (docsRes.ok) {
        const d = await docsRes.json();
        const arr = Array.isArray(d.data) ? d.data : Array.isArray(d) ? d : [];
        setRecentDocs(arr.slice(0, 5));
      }

      if (subRes.ok) {
        const d = await subRes.json();
        if (!d.error) setSubscription(d?.subscription ?? d);
      }

      prefetchRoutesOnIdle(['/documents', '/customers', '/items', '/analytics']);
    } catch {
      // network error — show empty state
    } finally {
      setLoading(false);
    }
  };

  const isSubscriptionActive = subscription?.endDate
    ? new Date(subscription.endDate) > new Date()
    : true;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return <GenericPageSkeleton />;
  }

  return (
    <>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Overview of your business metrics</p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-4 md:mt-0">
            <DateRangePicker range={dateRange} onRangeChange={(r) => { setDateRange(r); if (profileId) loadDashboardData(profileId, r); }} />
            <Button
              disabled={!isSubscriptionActive}
              onClick={() => navigate('/documents/create')}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Document
            </Button>
          </div>
        </div>

        {/* Subscription Alert */}
        {!isSubscriptionActive && (
          <Card className="mb-6 bg-yellow-50 border-yellow-200">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-yellow-900">Subscription Expired</p>
                  <p className="text-sm text-yellow-700">
                    Your subscription expired on {subscription && formatDate(subscription.endDate)}. 
                    Renew to create and export documents.
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate('/subscription')}
                  className="border-yellow-600 text-yellow-700 hover:bg-yellow-100"
                >
                  Renew Now
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Welcome Message for New Users */}
        {recentDocs.length === 0 && (
          <Card className="mb-6 bg-gradient-to-r from-blue-50 to-green-50 border-blue-200 dark:from-green-950 dark:to-black dark:border-green-900">
            <CardContent className="py-6">
              <div className="text-center max-w-2xl mx-auto">
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Welcome to BillVyapar! 🎉
                </h2>
                <p className="text-foreground/80 mb-4">
                  Your complete business documentation and billing ecosystem is ready. 
                  Start by creating your first invoice, adding customers, or exploring the analytics dashboard.
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <Button disabled={!isSubscriptionActive} onClick={() => navigate('/documents/create')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Document
                  </Button>
                  <Button disabled={!isSubscriptionActive} variant="outline" onClick={() => navigate('/customers')}>
                    Add Customers
                  </Button>
                  <Button disabled={!isSubscriptionActive} variant="outline" onClick={() => navigate('/items')}>
                    Add Items
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Sales</CardDescription>
              <CardTitle className="text-2xl">
                {analytics ? formatCurrency(analytics.totalSales) : '₹0'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-green-600">
                <TrendingUp className="h-4 w-4" />
                <span>All time</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Outstanding</CardDescription>
              <CardTitle className="text-2xl">
                {analytics ? formatCurrency(analytics.outstanding) : '₹0'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-orange-600">
                <Clock className="h-4 w-4" />
                <span>{analytics?.unpaidInvoices || 0} unpaid</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Invoices</CardDescription>
              <CardTitle className="text-2xl">{analytics?.totalInvoices || 0}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <FileText className="h-4 w-4" />
                <span>{analytics?.paidInvoices || 0} paid</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Conversion Rate</CardDescription>
              <CardTitle className="text-2xl">{analytics?.conversionRate || 0}%</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-green-600">
                <TrendingUp className="h-4 w-4" />
                <span>Quote to Invoice</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Documents */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Documents</CardTitle>
              <CardDescription>Your latest business documents</CardDescription>
            </CardHeader>
            <CardContent>
              {recentDocs.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No documents yet</p>
                  <Button 
                    variant="link" 
                    onClick={() => navigate('/documents/create')}
                    className="mt-2"
                    disabled={!isSubscriptionActive}
                  >
                    Create your first document
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentDocs.map((doc) => (
                    <div 
                      key={doc.id}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 cursor-pointer transition-colors"
                      onClick={() => {
                        if (!isSubscriptionActive) return;
                        navigate(`/documents/edit/${doc.id}`);
                      }}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">
                            {doc.documentNumber}
                          </span>
                          <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                            {doc.type}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {doc.customerName} • {formatDate(doc.date)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{formatCurrency(doc.grandTotal || 0)}</p>
                        {doc.paymentStatus === 'paid' ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600 ml-auto" />
                        ) : (
                          <Clock className="h-4 w-4 text-orange-600 ml-auto" />
                        )}
                      </div>
                    </div>
                  ))}
                  <Button 
                    variant="link" 
                    onClick={() => navigate('/documents')}
                    className="w-full"
                  >
                    View all documents →
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Items */}
          <Card>
            <CardHeader>
              <CardTitle>Top Selling Items</CardTitle>
              <CardDescription>Best performing products/services</CardDescription>
            </CardHeader>
            <CardContent>
              {!analytics || analytics.topItems.length === 0 ? (
                <div className="text-center py-8">
                  <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No sales data yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {analytics.topItems.map((item: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground">{item.name}</p>
                        <p className="text-xs text-muted-foreground">Quantity: {item.quantity}</p>
                      </div>
                      <p className="text-sm font-semibold text-blue-600">
                        {formatCurrency(item.revenue)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks to get you started</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <Button 
                variant="outline" 
                className="h-auto py-4 flex-col gap-2"
                data-tour-id="cta-create-document"
                onClick={() => navigate('/documents/create')}
                disabled={!isSubscriptionActive}
              >
                <FileText className="h-6 w-6" />
                <span>Create Invoice</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-4 flex-col gap-2"
                data-tour-id="cta-add-customer"
                onClick={() => navigate('/customers')}
                disabled={!isSubscriptionActive}
              >
                <Plus className="h-6 w-6" />
                <span>Add Customer</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-4 flex-col gap-2"
                data-tour-id="cta-add-item"
                onClick={() => navigate('/items')}
                disabled={!isSubscriptionActive}
              >
                <Plus className="h-6 w-6" />
                <span>Add Item</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}