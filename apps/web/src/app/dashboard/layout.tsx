'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentType } from 'react';
import { BellRing, BookOpenCheck, CalendarCheck, ClipboardList, Clock3, Compass, Gem, Gavel, HandCoins, HandHeart, LayoutDashboard, LogOut, ScrollText, ShieldAlert, UserRound } from 'lucide-react';
import { ProfileLocaleSync } from '@/components/dashboard/profile-locale-sync';
import { AuthGuard } from '@/components/guards/auth-guard';
import { Button } from '@/components/ui/button';
import { useUnreadNotificationsCount } from '@/hooks/use-guild-api';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';
import { useLocaleStore } from '@/store/locale-store';

type NavLabel = Parameters<typeof t>[1];

const nav: Array<{ href: string; label: NavLabel; icon: ComponentType<{ className?: string }> }> = [
  { href: '/dashboard', label: 'command', icon: LayoutDashboard },
  { href: '/dashboard/notices', label: 'notices', icon: BellRing },
  { href: '/dashboard/rules', label: 'rules', icon: ScrollText },
  { href: '/dashboard/onboarding', label: 'onboarding', icon: Compass },
  { href: '/dashboard/auctions', label: 'auctions', icon: Gavel },
  { href: '/dashboard/interests', label: 'interests', icon: HandHeart },
  { href: '/dashboard/item-requests', label: 'requests', icon: ClipboardList },
  { href: '/dashboard/codex', label: 'codex', icon: BookOpenCheck },
  { href: '/dashboard/daoshi', label: 'daoshi', icon: HandCoins },
  { href: '/dashboard/timeline', label: 'timeline', icon: Clock3 },
  { href: '/dashboard/drops', label: 'drops', icon: Gem },
  { href: '/dashboard/attendance', label: 'attendance', icon: CalendarCheck },
  { href: '/dashboard/profile', label: 'profile', icon: UserRound },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const logout = useAuthStore((state) => state.logout);
  const hasRole = useAuthStore((state) => state.hasRole);
  const locale = useLocaleStore((state) => state.locale);
  const isStaff = hasRole(['STAFF', 'ADMIN']);
  const unreadNotifications = useUnreadNotificationsCount();
  const unreadCount = unreadNotifications.data?.count ?? 0;

  return (
    <AuthGuard>
      <ProfileLocaleSync />
      <div className="min-h-screen">
        <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 border-r border-white/10 bg-background/88 p-4 shadow-[18px_0_60px_rgba(0,0,0,0.35)] backdrop-blur-xl lg:block">
          <Link href="/dashboard" className="mb-6 block rounded-lg border border-primary/20 bg-card/80 p-4 shadow-rune transition hover:border-primary/45">
            <p className="font-[var(--font-cinzel)] text-2xl font-bold text-primary">Raven Command</p>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t(locale, 'guildOperationsDeck')}</p>
          </Link>
          <nav className="max-h-[calc(100vh-9rem)] space-y-1 overflow-y-auto pr-1 scrollbar-thin">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-muted-foreground transition hover:bg-muted/75 hover:text-foreground',
                  pathname === item.href && 'border border-primary/20 bg-muted/90 text-foreground shadow-inner',
                )}
              >
                <item.icon className={cn('h-4 w-4 transition group-hover:text-primary', pathname === item.href && 'text-primary')} />
                <span className="min-w-0 flex-1 truncate">{t(locale, item.label)}</span>
                {item.href === '/dashboard/notices' && unreadCount > 0 && (
                  <span className="rounded-full border border-primary/35 bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">{unreadCount}</span>
                )}
              </Link>
            ))}
            {isStaff && (
              <Link
                href="/dashboard/staff"
                className={cn(
                  'group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-muted-foreground transition hover:bg-muted/75 hover:text-foreground',
                  pathname.startsWith('/dashboard/staff') || pathname.startsWith('/dashboard/admin') ? 'border border-primary/20 bg-muted/90 text-foreground' : '',
                )}
              >
                <ShieldAlert className="h-4 w-4 text-primary" /> {t(locale, 'staff')}
              </Link>
            )}
          </nav>
          <Button variant="ghost" className="absolute bottom-4 left-4 right-4" onClick={logout}>
            <LogOut className="h-4 w-4" /> {t(locale, 'signOut')}
          </Button>
        </aside>
        <div className="lg:pl-72">
          <header className="sticky top-0 z-10 border-b border-white/10 bg-background/78 px-4 py-3 backdrop-blur lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <p className="font-[var(--font-cinzel)] text-lg font-bold text-primary">Raven Command</p>
              {isStaff && <span className="rounded-md border border-primary/30 px-2 py-1 text-[10px] font-bold uppercase text-primary">Staff</span>}
            </div>
          </header>
          <main className="mx-auto max-w-7xl p-4 pb-28 sm:p-6 sm:pb-28 lg:p-8">{children}</main>
        </div>
        <nav className="fixed bottom-0 left-0 right-0 z-30 flex snap-x gap-1 overflow-x-auto border-t border-white/10 bg-background/94 px-2 py-2 shadow-[0_-18px_55px_rgba(0,0,0,0.35)] backdrop-blur-xl lg:hidden">
          {[...nav, ...(isStaff ? [{ href: '/dashboard/staff', label: 'staff' as NavLabel, icon: ShieldAlert }] : [])].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex min-w-16 snap-start flex-col items-center gap-1 rounded-md border border-transparent px-2 py-1.5 text-[10px] text-muted-foreground transition',
                (pathname === item.href || (item.href === '/dashboard/staff' && (pathname.startsWith('/dashboard/staff') || pathname.startsWith('/dashboard/admin')))) && 'border-primary/25 bg-muted/90 text-primary',
              )}
            >
              <item.icon className="h-4 w-4" />
              <span className="relative max-w-full truncate">
                {t(locale, item.label)}
                {item.href === '/dashboard/notices' && unreadCount > 0 && (
                  <span className="absolute -right-2 -top-2 h-2 w-2 rounded-full bg-primary" />
                )}
              </span>
            </Link>
          ))}
        </nav>
      </div>
    </AuthGuard>
  );
}
