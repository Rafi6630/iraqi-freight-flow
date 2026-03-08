import { Settings as SettingsIcon } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

export default function SettingsPage() {
  return (
    <div className="erp-page">
      <div className="erp-page-header">
        <div>
          <h1 className="erp-page-title flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-primary" />
            Settings
          </h1>
          <p className="erp-page-subtitle">System configuration</p>
        </div>
      </div>

      <Tabs defaultValue="company" className="space-y-4">
        <TabsList className="grid grid-cols-4 lg:grid-cols-7 w-full">
          <TabsTrigger value="company">Company</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="exchange">Exchange Rates</TabsTrigger>
          <TabsTrigger value="payment-methods">Payment Methods</TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="erp-metric-card space-y-4">
          <h3 className="text-lg font-semibold">Company Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Company Name</Label><Input defaultValue="FreightFlow Iraq" /></div>
            <div><Label>Legal Name</Label><Input defaultValue="FreightFlow Iraq LLC" /></div>
            <div><Label>Tax ID</Label><Input placeholder="Tax identification number" /></div>
            <div><Label>Industry</Label><Input defaultValue="Freight Forwarding" /></div>
            <div><Label>Phone</Label><Input defaultValue="+964 770 000 0000" /></div>
            <div><Label>Email</Label><Input defaultValue="info@freightflow.iq" /></div>
            <div><Label>Website</Label><Input defaultValue="www.freightflow.iq" /></div>
            <div><Label>Default Currency</Label><Input defaultValue="USD" /></div>
            <div><Label>Country</Label><Input defaultValue="Iraq" /></div>
            <div><Label>City</Label><Input defaultValue="Baghdad" /></div>
            <div><Label>Company Slogan</Label><Input defaultValue="Your Gateway to Iraq" /></div>
            <div><Label>Timezone</Label><Input defaultValue="Asia/Baghdad" /></div>
          </div>
          <Button>Save Company Settings</Button>
        </TabsContent>

        <TabsContent value="invoices" className="erp-metric-card space-y-4">
          <h3 className="text-lg font-semibold">Invoice Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Invoice Prefix</Label><Input defaultValue="INV" /></div>
            <div><Label>Next Number</Label><Input type="number" defaultValue="5" /></div>
            <div><Label>Default Payment Terms (days)</Label><Input type="number" defaultValue="30" /></div>
            <div><Label>Late Fee %</Label><Input type="number" defaultValue="2" /></div>
            <div className="md:col-span-2"><Label>Footer Text</Label><Input defaultValue="Thank you for your business" /></div>
            <div className="md:col-span-2"><Label>Payment Instructions</Label><Input defaultValue="Please wire payment to account details below" /></div>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2"><Switch /><Label>Auto-send Invoices</Label></div>
            <div className="flex items-center gap-2"><Switch /><Label>Require PO Number</Label></div>
            <div className="flex items-center gap-2"><Switch /><Label>Show Tax Details</Label></div>
          </div>
          <Button>Save Invoice Settings</Button>
        </TabsContent>

        <TabsContent value="users" className="erp-metric-card space-y-4">
          <h3 className="text-lg font-semibold">User Management</h3>
          <p className="text-sm text-muted-foreground">Invite users, assign roles, manage access.</p>
          <Button>Invite User</Button>
        </TabsContent>

        <TabsContent value="templates" className="erp-metric-card space-y-4">
          <h3 className="text-lg font-semibold">Document Templates</h3>
          <p className="text-sm text-muted-foreground">Manage quotation and invoice templates.</p>
          <Button>Create Template</Button>
        </TabsContent>

        <TabsContent value="notifications" className="erp-metric-card space-y-4">
          <h3 className="text-lg font-semibold">Notification Preferences</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between"><Label>Email on new order</Label><Switch defaultChecked /></div>
            <div className="flex items-center justify-between"><Label>Email on payment received</Label><Switch defaultChecked /></div>
            <div className="flex items-center justify-between"><Label>Alert on overdue invoice</Label><Switch defaultChecked /></div>
            <div className="flex items-center justify-between"><Label>FX rate change alerts</Label><Switch /></div>
          </div>
          <Button>Save Preferences</Button>
        </TabsContent>

        <TabsContent value="exchange" className="erp-metric-card space-y-4">
          <h3 className="text-lg font-semibold">Exchange Rate Settings</h3>
          <p className="text-sm text-muted-foreground">Same as Exchange Offices page — manage FX rates here.</p>
        </TabsContent>

        <TabsContent value="payment-methods" className="erp-metric-card space-y-4">
          <h3 className="text-lg font-semibold">Payment Methods</h3>
          <p className="text-sm text-muted-foreground">Configure bank accounts and payment methods.</p>
          <Button>Add Payment Method</Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
