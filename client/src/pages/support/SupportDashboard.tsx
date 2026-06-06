import { Headphones, LogOut, Construction } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Minimal placeholder for the Support portal. A dedicated support
 * client/server will replace this later; for now it gives support-team
 * members a valid landing page after login so the role works end-to-end.
 */
export default function SupportDashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen w-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40">
        <div className="flex items-center gap-2 font-mono font-bold tracking-tight">
          <Headphones className="h-5 w-5" />
          BUGCHASE SUPPORT
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold leading-4">{user?.name || 'Support Member'}</p>
            <p className="text-[11px] text-zinc-500 font-mono uppercase">Support</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => logout()} className="gap-2">
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
            <Construction className="h-7 w-7 text-zinc-500" />
          </div>
          <h1 className="text-2xl font-bold">Support Portal — Coming Soon</h1>
          <p className="text-sm text-muted-foreground">
            Welcome{user?.name ? `, ${user.name}` : ''}. Your support account is active. The dedicated
            support workspace (disputes, tickets, and customer care tools) is being built and will be
            available here shortly.
          </p>
        </div>
      </main>
    </div>
  );
}
