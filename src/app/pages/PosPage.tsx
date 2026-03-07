import { AppLayout } from '../components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ShoppingCart, Receipt, Zap } from 'lucide-react';

export function PosPage() {
  return (
    <AppLayout>
      <div className="p-4 sm:p-6 max-w-5xl mx-auto">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Vyapar POS</h1>
              <Badge variant="secondary">Coming soon</Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              A fast billing screen for counter sales (cart, barcode/item search, instant invoice).
            </p>
          </div>
          <Button variant="outline" disabled>
            Open POS
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2">
            <CardHeader className="border-b bg-muted/40">
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Cart
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="text-sm text-muted-foreground">
                This screen will support item search, quick quantity edits, discounts, and tax summary.
              </div>
              <div className="mt-4 rounded-lg border bg-background p-4">
                <div className="text-sm font-medium">Planned</div>
                <div className="mt-2 text-sm text-muted-foreground space-y-1">
                  <div>Item search + barcode input</div>
                  <div>Fast quantity + rate edits</div>
                  <div>Customer selection (optional)</div>
                  <div>Pay & generate invoice</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b bg-muted/40">
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              <Button className="w-full" variant="outline" disabled>
                New Sale
              </Button>
              <Button className="w-full" variant="outline" disabled>
                Hold Bill
              </Button>
              <Button className="w-full" variant="outline" disabled>
                Recent Bills
              </Button>
              <div className="pt-2 text-xs text-muted-foreground flex items-center gap-2">
                <Zap className="h-4 w-4" />
                We can build the full POS next if you want.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
