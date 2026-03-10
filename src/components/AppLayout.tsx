import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export function AppLayout({ children }: {children: React.ReactNode;}) {
  const { user, signOut } = useAuth();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center justify-between border-b border-border bg-card px-4 shrink-0">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="mr-4" />
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                <span>FreightFlow ERP</span>
                <span>•</span>
                <span>Iraq Operations</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">{user?.email}</span>
              <Button variant="ghost" size="sm" onClick={signOut}>
                <LogOut className="w-3.5 h-3.5" />
              </Button>
            </div>
          </header>
          <main className="flex-1 overflow-auto border-black">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>);

}