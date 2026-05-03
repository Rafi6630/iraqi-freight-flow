import { FolderOpen, Search, FileText, Receipt, FileCheck, Package, ExternalLink, Loader2, FileSearch, ClipboardList, ShieldCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { useState, useMemo } from 'react';
import { useTableQuery } from '@/hooks/use-supabase-query';

const TYPE_META: Record<string, { label: string; icon: any; color: string }> = {
  invoice:      { label: 'Invoice',       icon: Receipt,       color: 'bg-blue-100 text-blue-700'   },
  bill:         { label: 'Vendor Bill',   icon: FileText,      color: 'bg-amber-100 text-amber-700' },
  quotation:    { label: 'Quotation',     icon: FileCheck,     color: 'bg-green-100 text-green-700' },
  shipment:     { label: 'Shipment',      icon: Package,       color: 'bg-purple-100 text-purple-700'},
  bl:           { label: 'Bill of Lading',icon: ClipboardList, color: 'bg-indigo-100 text-indigo-700'},
  packing_list: { label: 'Packing List',  icon: FileSearch,    color: 'bg-rose-100 text-rose-700'},
  coo:          { label: 'Cert. Origin',  icon: ShieldCheck,   color: 'bg-cyan-100 text-cyan-700'},
  other:        { label: 'Other Doc',     icon: FolderOpen,    color: 'bg-slate-100 text-slate-700'},
};

export default function DocumentHubPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const { data: invoices = [],   isLoading: invLoad  } = useTableQuery<any>('invoices');
  const { data: vendorBills = [], isLoading: billLoad } = useTableQuery<any>('vendor_bills');
  const { data: quotations = [], isLoading: quotLoad } = useTableQuery<any>('quotations');
  const { data: orders = [],     isLoading: ordLoad  } = useTableQuery<any>('orders');
  const { data: documents = [],  isLoading: docLoad  } = useTableQuery<any>('documents');
  const { data: customers = [] }                       = useTableQuery<any>('customers');
  const { data: vendors = [] }                         = useTableQuery<any>('vendors');

  const isLoading = invLoad || billLoad || quotLoad || ordLoad || docLoad;

  // Build a unified document list from real DB tables
  const allDocs = useMemo(() => {
    const docs: any[] = [];

    // Invoices
    invoices.forEach((inv: any) => {
      const customer = customers.find((c: any) => c.id === inv.customer_id);
      const order = orders.find((o: any) => o.id === inv.order_id);
      docs.push({
        id: `inv-${inv.id}`,
        type: 'invoice',
        docNo: inv.invoice_no,
        title: `Invoice ${inv.invoice_no}`,
        subtitle: customer?.company || 'Unknown Customer',
        orderNo: order?.order_no || '—',
        date: inv.issued_date,
        dueDate: inv.due_date,
        status: inv.status,
        amountUsd: inv.amount_usd,
        url: inv.pdf_url,
      });
    });

    // Vendor Bills
    vendorBills.forEach((bill: any) => {
      const vendor = vendors.find((v: any) => v.id === bill.vendor_id);
      const order = orders.find((o: any) => o.id === bill.order_id);
      docs.push({
        id: `bill-${bill.id}`,
        type: 'bill',
        docNo: bill.bill_no,
        title: `Bill ${bill.bill_no}`,
        subtitle: vendor?.company || 'Unknown Vendor',
        orderNo: order?.order_no || '—',
        date: bill.issued_date,
        dueDate: bill.due_date,
        status: bill.status,
        amountUsd: bill.amount_usd,
        url: bill.pdf_url,
      });
    });

    // Quotations
    quotations.forEach((q: any) => {
      const order = orders.find((o: any) => o.id === q.order_id);
      const customer = customers.find((c: any) => c.id === q.customer_id);
      docs.push({
        id: `quot-${q.id}`,
        type: 'quotation',
        docNo: q.quote_no,
        title: `Quotation ${q.quote_no}`,
        subtitle: customer?.company || order?.order_no || 'Unknown',
        orderNo: order?.order_no || '—',
        date: q.issue_date || q.created_at?.split('T')[0],
        dueDate: null,
        status: q.status,
        amountUsd: q.total_price_usd,
        url: q.signed_pdf_url || q.pdf_url || null,
      });
    });

    // General Documents Table
    documents.forEach((d: any) => {
      let orderNo = '—';
      let subtitle = 'General Document';

      if (d.entity_type === 'order') {
        const order = orders.find((o: any) => o.id === d.entity_id);
        orderNo = order?.order_no || '—';
        if (order) {
           const customer = customers.find((c: any) => c.id === order.customer_id);
           subtitle = customer?.company || `Order ${order.order_no}`;
        }
      }

      docs.push({
        id: `doc-${d.id}`,
        type: d.category || 'other',
        docNo: d.document_name,
        title: d.document_name,
        subtitle: subtitle,
        orderNo: orderNo,
        date: d.uploaded_at?.split('T')[0],
        dueDate: null,
        status: 'active',
        amountUsd: null,
        url: d.document_url,
      });
    });

    // Shipment documents (from Order info)
    orders.filter((o: any) => o.carrier_name).forEach((o: any) => {
      const customer = customers.find((c: any) => c.id === o.customer_id);
      docs.push({
        id: `ship-${o.id}`,
        type: 'shipment',
        docNo: o.order_no,
        title: `Shipment Tracking — ${o.order_no}`,
        subtitle: customer?.company || 'Unknown Customer',
        orderNo: o.order_no,
        date: o.etd,
        dueDate: o.eta,
        status: o.status_step >= 9 ? 'closed' : 'active',
        amountUsd: null,
        url: null,
        extra: `${o.carrier_name}${o.container_number ? ` | CTN: ${o.container_number}` : ''}`,
      });
    });

    return docs.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [invoices, vendorBills, quotations, orders, customers, vendors, documents]);

  const filtered = useMemo(() => {
    return allDocs.filter(d => {
      if (typeFilter !== 'all' && d.type !== typeFilter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return [d.docNo, d.title, d.subtitle, d.orderNo, d.status].join(' ').toLowerCase().includes(q);
    });
  }, [allDocs, search, typeFilter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: allDocs.length };
    allDocs.forEach(d => {
      c[d.type] = (c[d.type] || 0) + 1;
    });
    return c;
  }, [allDocs]);

  const filterTypes = ['all', 'invoice', 'bill', 'quotation', 'shipment', 'bl', 'packing_list', 'coo', 'other'];

  return (
    <div className="erp-page">
      <div className="erp-page-header">
        <div>
          <h1 className="erp-page-title flex items-center gap-2">
            <FolderOpen className="w-6 h-6 text-primary" />
            Document Hub
          </h1>
          <p className="erp-page-subtitle">{allDocs.length} total documents registered in the system</p>
        </div>
      </div>

      {/* Filters row */}
      <div className="space-y-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search documents..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        <div className="flex gap-2 flex-wrap pb-2 border-b border-border/50">
          {filterTypes.map(t => {
             if (t !== 'all' && !counts[t]) return null;
             const meta = TYPE_META[t] || TYPE_META.other;
             return (
              <Button key={t} size="sm" variant={typeFilter === t ? 'default' : 'outline'}
                onClick={() => setTypeFilter(t)}
                className="h-8">
                {t === 'all' ? 'All' : meta.label}
                <span className="ml-1.5 text-[10px] bg-muted px-1 rounded font-normal">{(counts[t] || 0)}</span>
              </Button>
             );
          })}
        </div>
      </div>

      {isLoading ? (
        <div className="erp-metric-card text-center py-12">
          <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading documents…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="erp-metric-card text-center py-12 text-muted-foreground">
          {allDocs.length === 0
            ? 'No documents found in the system.'
            : 'No documents match your search/filter.'}
        </div>
      ) : (
        <div className="erp-table-container">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name / #</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Party / Description</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Order</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Info</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Amount (USD)</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="w-16"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(d => {
                  const meta = TYPE_META[d.type] || TYPE_META.other;
                  const Icon = meta.icon;
                  return (
                    <tr key={d.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-tight ${meta.color}`}>
                          <Icon className="w-3 h-3" />{meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-primary max-w-[200px] truncate">{d.docNo}</td>
                      <td className="px-4 py-3 text-xs">{d.subtitle}</td>
                      <td className="px-4 py-3 font-mono text-[10px] text-muted-foreground">{d.orderNo}</td>
                      <td className="px-4 py-3 text-[11px] text-muted-foreground">{d.date || '—'}</td>
                      <td className="px-4 py-3 text-[11px] text-muted-foreground">{d.dueDate || d.extra || '—'}</td>
                      <td className="px-4 py-3 text-right font-mono text-sm">
                        {d.amountUsd != null ? `$${d.amountUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={d.status || 'active'} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        {d.url ? (
                          <Button variant="ghost" size="sm" asChild className="h-8 w-8 p-0">
                            <a href={d.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </Button>
                        ) : (
                          <Button variant="ghost" size="sm" disabled className="h-8 w-8 p-0 opacity-20">
                             <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
