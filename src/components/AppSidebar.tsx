import { useState, useEffect } from 'react';
import {
  LayoutDashboard, Users, Truck, UserCheck, Handshake, Landmark,
  Package, FileText, Receipt, CreditCard, Percent, DollarSign,
  CalendarCheck, Bell, FolderOpen, BarChart3,
  Settings, ShieldCheck, ClipboardList, ChevronRight } from
'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import { Sidebar, SidebarContent, useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

// ─── Nav structure ────────────────────────────────────────────────────────────
const NAV_GROUPS = [
{
  id: 'overview',
  label: 'Overview',
  icon: LayoutDashboard,
  items: [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Orders', url: '/orders', icon: Package }]

},
{
  id: 'masterdata',
  label: 'Master Data',
  icon: Users,
  items: [
  { title: 'Customers', url: '/customers', icon: Users },
  { title: 'Vendors', url: '/vendors', icon: Truck },
  { title: 'Employees', url: '/employees', icon: UserCheck },
  { title: 'Partners', url: '/partners', icon: Handshake },
  { title: 'Co-Founder Capital', url: '/cofounder-capital', icon: Landmark }]

},
{
  id: 'operations',
  label: 'Operations',
  icon: ClipboardList,
  items: [
  { title: 'Quotations', url: '/quotations', icon: ClipboardList }]

},
{
  id: 'finance',
  label: 'Finance',
  icon: CreditCard,
  items: [
  { title: 'Invoices', url: '/invoices', icon: FileText },
  { title: 'Vendor Bills', url: '/vendor-bills', icon: Receipt },
  { title: 'Payments', url: '/payments', icon: CreditCard },
  { title: 'Commissions', url: '/commissions', icon: Percent },
  { title: 'Expenses', url: '/expenses', icon: DollarSign },
  { title: 'Monthly Close', url: '/monthly-close', icon: CalendarCheck }]

},
{
  id: 'tools',
  label: 'Tools',
  icon: FolderOpen,
  items: [
  { title: 'Payment Reminders', url: '/payment-reminders', icon: Bell },
  { title: 'Document Hub', url: '/document-hub', icon: FolderOpen }]

},
{
  id: 'analytics',
  label: 'Analytics',
  icon: BarChart3,
  items: [
  { title: 'Reports', url: '/reports', icon: BarChart3 }]

},
{
  id: 'system',
  label: 'System',
  icon: Settings,
  items: [
  { title: 'Settings', url: '/settings', icon: Settings },
  { title: 'Exchange Offices', url: '/exchange-offices', icon: Landmark },
  { title: 'Admin Console', url: '/admin', icon: ShieldCheck }]

}];


// Find which group owns a given path
function groupForPath(pathname: string): string | null {
  for (const g of NAV_GROUPS) {
    if (g.items.some((i) => i.url === '/' ? pathname === '/' : pathname.startsWith(i.url))) {
      return g.id;
    }
  }
  return null;
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();

  // Which group is currently open (accordion — only one at a time)
  const [openGroup, setOpenGroup] = useState<string | null>(() => groupForPath(location.pathname));

  // When route changes, ensure the owning group is opened
  useEffect(() => {
    const owner = groupForPath(location.pathname);
    if (owner) setOpenGroup(owner);
  }, [location.pathname]);

  const toggleGroup = (id: string) => {
    setOpenGroup((prev) => prev === id ? null : id);
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      {/* ─── Logo ─── */}
      <div className="p-4 border-b border-sidebar-border">
        {!collapsed ?
        <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
              <Package className="w-4 h-4 text-sidebar-primary-foreground" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-sidebar-accent-foreground">FreightFlow</h2>
              <p className="text-[10px] text-sidebar-muted">ERP System</p>
            </div>
          </div> :

        <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center mx-auto">
            <Package className="w-4 h-4 text-sidebar-primary-foreground" />
          </div>
        }
      </div>

      <SidebarContent className="py-2 overflow-y-auto">
        {NAV_GROUPS.map((group) => {
          const isOpen = openGroup === group.id;
          // Is any item in this group the current page?
          const groupIsActive = group.items.some((i) =>
          i.url === '/' ? location.pathname === '/' : location.pathname.startsWith(i.url)
          );

          if (collapsed) {
            // Collapsed: just show icons, no groups
            return group.items.map((item) => {
              const isActive = item.url === '/' ?
              location.pathname === '/' :
              location.pathname.startsWith(item.url);
              return (
                <NavLink
                  key={item.url}
                  to={item.url}
                  end={item.url === '/'}
                  title={item.title}
                  className="flex items-center justify-center w-10 h-10 mx-auto my-0.5 rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                  activeClassName="bg-sidebar-accent text-sidebar-primary">
                  
                  <item.icon className="w-4 h-4 shrink-0" />
                </NavLink>);

            });
          }

          return (
            <div key={group.id} className="px-2 mb-0.5">
              {/* ─── Group header button ─── */}
              <button
                onClick={() => toggleGroup(group.id)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors select-none',
                  groupIsActive ?
                  'text-sidebar-primary bg-sidebar-primary/10' :
                  'text-sidebar-muted hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/50'
                )}>
                
                <group.icon className="w-3.5 h-3.5 shrink-0" />
                <span className="flex-1 text-left text-primary-foreground">{group.label}</span>
                <ChevronRight
                  className={cn(
                    'w-3.5 h-3.5 shrink-0 transition-transform duration-200',
                    isOpen && 'rotate-90'
                  )} />
                
              </button>

              {/* ─── Collapsible items ─── */}
              <div
                className={cn(
                  'overflow-hidden transition-all duration-200',
                  isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                )}>
                
                <div className="ml-2 mt-0.5 border-l border-sidebar-border/50 pl-2 pb-1 space-y-0.5">
                  {group.items.map((item) => {
                    const isActive = item.url === '/' ?
                    location.pathname === '/' :
                    location.pathname.startsWith(item.url);
                    return (
                      <NavLink
                        key={item.url}
                        to={item.url}
                        end={item.url === '/'}
                        className={cn(
                          'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
                          'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                        )}
                        activeClassName={cn(
                          'bg-sidebar-primary/15 text-sidebar-primary font-semibold',
                          'border-l-2 border-sidebar-primary -ml-px pl-[calc(0.75rem-1px)]'
                        )}>
                        
                        <item.icon className={cn('w-4 h-4 shrink-0', isActive && 'text-sidebar-primary')} />
                        <span className="text-[#6dddee]">{item.title}</span>
                        {isActive &&
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-sidebar-primary" />
                        }
                      </NavLink>);

                  })}
                </div>
              </div>
            </div>);

        })}
      </SidebarContent>
    </Sidebar>);

}