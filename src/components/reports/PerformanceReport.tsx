import { useMemo, useState } from 'react';
import { useTableQuery } from '@/hooks/use-supabase-query';
import { CurrencyDisplay } from '@/components/CurrencyDisplay';
import { DEFAULT_FX_RATE } from '@/lib/currency';
import { Skeleton } from '@/components/ui/skeleton';
import { Star } from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface PerformanceReportProps {
  dateFrom: string;
  dateTo: string;
}

export function PerformanceReport({ dateFrom, dateTo }: PerformanceReportProps) {
  const [tab, setTab] = useState('vendor');

  const { data: vendors = [], isLoading: vLoad } = useTableQuery<any>('vendors');
  const { data: employees = [] } = useTableQuery<any>('employees');
  const { data: partners = [] } = useTableQuery<any>('partners');
  const { data: orders = [] } = useTableQuery<any>('orders');
  const { data: orderCosts = [] } = useTableQuery<any>('order_costs');
  const { data: invoices = [] } = useTableQuery<any>('invoices');
  const { data: commissions = [] } = useTableQuery<any>('commissions');

  // --- Vendor Performance ---
  const vendorPerf = useMemo(() => {
    return vendors.map((v: any) => {
      const costs = orderCosts.filter((c: any) => c.vendor_id === v.id);
      const totalCostUsd = costs.reduce((s: number, c: any) => s + (c.amount_usd || 0), 0);
      const orderCount = new Set(costs.map((c: any) => c.order_id)).size;
      const avgCostUsd = orderCount > 0 ? totalCostUsd / orderCount : 0;
      return {
        id: v.id,
        name: v.company,
        rating: v.rating ?? 0,
        totalCostUsd,
        totalCostIqd: totalCostUsd * DEFAULT_FX_RATE,
        avgCostUsd,
        avgCostIqd: avgCostUsd * DEFAULT_FX_RATE,
        orderCount,
      };
    }).sort((a: any, b: any) => b.orderCount - a.orderCount);
  }, [vendors, orderCosts]);

  // --- Employee Performance ---
  const employeePerf = useMemo(() => {
    return employees.map((e: any) => {
      const empOrders = orders.filter((o: any) => o.responsible_employee_id === e.id);
      const empOrderIds = new Set(empOrders.map((o: any) => o.id));
      const revenueUsd = invoices
        .filter((inv: any) => empOrderIds.has(inv.order_id))
        .reduce((s: number, inv: any) => s + (inv.amount_usd || 0), 0);
      const empCommissions = commissions.filter(
        (c: any) => c.person_id === e.id && c.type === 'employee'
      );
      const commUsd = empCommissions.reduce((s: number, c: any) => s + (c.amount_usd || 0), 0);
      return {
        id: e.id,
        name: e.name,
        role: e.role || '—',
        ordersHandled: empOrders.length,
        revenueUsd,
        revenueIqd: revenueUsd * DEFAULT_FX_RATE,
        commissionsUsd: commUsd,
        commissionsIqd: commUsd * DEFAULT_FX_RATE,
      };
    }).sort((a: any, b: any) => b.ordersHandled - a.ordersHandled);
  }, [employees, orders, invoices, commissions]);

  // --- Partner Performance ---
  const partnerPerf = useMemo(() => {
    return partners.map((p: any) => {
      const partnerComms = commissions.filter(
        (c: any) => c.person_id === p.id && c.type === 'partner'
      );
      const orderIds = new Set(partnerComms.map((c: any) => c.order_id).filter(Boolean));
      const commUsd = partnerComms.reduce((s: number, c: any) => s + (c.amount_usd || 0), 0);
      return {
        id: p.id,
        name: p.company,
        ordersFacilitated: orderIds.size,
        commissionsUsd: commUsd,
        commissionsIqd: commUsd * DEFAULT_FX_RATE,
      };
    }).sort((a: any, b: any) => b.ordersFacilitated - a.ordersFacilitated);
  }, [partners, commissions]);

  if (vLoad) return <Skeleton className="h-64 w-full" />;

  const renderStars = (rating: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`w-3.5 h-3.5 ${i <= rating ? 'fill-primary text-primary' : 'text-muted-foreground/30'}`} />
      ))}
    </div>
  );

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="mb-4">
        <TabsTrigger value="vendor">Vendors</TabsTrigger>
        <TabsTrigger value="employee">Employees</TabsTrigger>
        <TabsTrigger value="partner">Partners</TabsTrigger>
      </TabsList>

      {/* Vendor Tab */}
      <TabsContent value="vendor">
        <div className="rounded-lg border border-border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor</TableHead>
                <TableHead className="text-center">Orders</TableHead>
                <TableHead className="text-center">Rating</TableHead>
                <TableHead className="text-right">Total Cost</TableHead>
                <TableHead className="text-right">Avg Cost / Order</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendorPerf.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No vendor data available</TableCell></TableRow>
              ) : vendorPerf.map((v: any) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.name}</TableCell>
                  <TableCell className="text-center">{v.orderCount}</TableCell>
                  <TableCell className="text-center">{renderStars(v.rating)}</TableCell>
                  <TableCell className="text-right">
                    <CurrencyDisplay usd={v.totalCostUsd} iqd={v.totalCostIqd} size="sm" layout="stacked" />
                  </TableCell>
                  <TableCell className="text-right">
                    <CurrencyDisplay usd={v.avgCostUsd} iqd={v.avgCostIqd} size="sm" layout="stacked" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      {/* Employee Tab */}
      <TabsContent value="employee">
        <div className="rounded-lg border border-border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-center">Orders</TableHead>
                <TableHead className="text-right">Revenue Generated</TableHead>
                <TableHead className="text-right">Commissions Earned</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employeePerf.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No employee data available</TableCell></TableRow>
              ) : employeePerf.map((e: any) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.name}</TableCell>
                  <TableCell className="text-muted-foreground">{e.role}</TableCell>
                  <TableCell className="text-center">{e.ordersHandled}</TableCell>
                  <TableCell className="text-right">
                    <CurrencyDisplay usd={e.revenueUsd} iqd={e.revenueIqd} size="sm" layout="stacked" />
                  </TableCell>
                  <TableCell className="text-right">
                    <CurrencyDisplay usd={e.commissionsUsd} iqd={e.commissionsIqd} size="sm" layout="stacked" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      {/* Partner Tab */}
      <TabsContent value="partner">
        <div className="rounded-lg border border-border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Partner</TableHead>
                <TableHead className="text-center">Orders Facilitated</TableHead>
                <TableHead className="text-right">Commissions Earned</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {partnerPerf.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No partner data available</TableCell></TableRow>
              ) : partnerPerf.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-center">{p.ordersFacilitated}</TableCell>
                  <TableCell className="text-right">
                    <CurrencyDisplay usd={p.commissionsUsd} iqd={p.commissionsIqd} size="sm" layout="stacked" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </TabsContent>
    </Tabs>
  );
}
