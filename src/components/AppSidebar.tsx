import {
  LayoutDashboard, Users, Truck, UserCheck, Handshake, Landmark,
  Package, FileText, Receipt, CreditCard, Percent, DollarSign,
  CalendarCheck, ArrowLeftRight, Bell, FolderOpen, BarChart3,
  Settings, ShieldCheck, ClipboardList,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';

const navGroups = [
  {
    label: 'Overview',
    items: [
      { title: 'Dashboard', url: '/', icon: LayoutDashboard },
      { title: 'Orders', url: '/orders', icon: Package },
    ],
  },
  {
    label: 'Master Data',
    items: [
      { title: 'Customers', url: '/customers', icon: Users },
      { title: 'Vendors', url: '/vendors', icon: Truck },
      { title: 'Employees', url: '/employees', icon: UserCheck },
      { title: 'Partners', url: '/partners', icon: Handshake },
      { title: 'Co-Founder Capital', url: '/cofounder-capital', icon: Landmark },
    ],
  },
  {
    label: 'Operations',
    items: [
      { title: 'Quotations', url: '/quotations', icon: ClipboardList },
    ],
  },
  {
    label: 'Finance',
    items: [
      { title: 'Invoices', url: '/invoices', icon: FileText },
      { title: 'Vendor Bills', url: '/vendor-bills', icon: Receipt },
      { title: 'Payments', url: '/payments', icon: CreditCard },
      { title: 'Commissions', url: '/commissions', icon: Percent },
      { title: 'Expenses', url: '/expenses', icon: DollarSign },
      { title: 'Monthly Close', url: '/monthly-close', icon: CalendarCheck },
    ],
  },
  {
    label: 'Tools',
    items: [
      { title: 'Exchange Offices', url: '/exchange-offices', icon: ArrowLeftRight },
      { title: 'Payment Reminders', url: '/payment-reminders', icon: Bell },
      { title: 'Document Hub', url: '/document-hub', icon: FolderOpen },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { title: 'Reports', url: '/reports', icon: BarChart3 },
    ],
  },
  {
    label: 'System',
    items: [
      { title: 'Settings', url: '/settings', icon: Settings },
      { title: 'Admin Console', url: '/admin', icon: ShieldCheck },
    ],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <div className="p-4 border-b border-sidebar-border">
        {!collapsed ? (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
              <Package className="w-4 h-4 text-sidebar-primary-foreground" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-sidebar-accent-foreground">FreightFlow</h2>
              <p className="text-[10px] text-sidebar-muted">ERP System</p>
            </div>
          </div>
        ) : (
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center mx-auto">
            <Package className="w-4 h-4 text-sidebar-primary-foreground" />
          </div>
        )}
      </div>
      <SidebarContent className="py-2">
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-sidebar-muted text-[10px] uppercase tracking-wider font-semibold px-4">
              {!collapsed && group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === item.url}
                      tooltip={item.title}
                    >
                      <NavLink
                        to={item.url}
                        end={item.url === '/'}
                        className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                      >
                        <item.icon className="w-4 h-4 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
