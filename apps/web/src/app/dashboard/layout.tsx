"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ComponentType } from "react";
import {
  BellRing,
  Gem,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldAlert,
  Swords,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { GlobalSearch } from "@/components/dashboard/global-search";
import { ProfileLocaleSync } from "@/components/dashboard/profile-locale-sync";
import { CharacterSetupGate } from "@/components/dashboard/character-setup-gate";
import { AuthGuard } from "@/components/guards/auth-guard";
import { Button } from "@/components/ui/button";
import { useMaintenanceMode } from "@/hooks/use-staff-operations-api";
import { useUnreadNotificationsCount } from "@/hooks/use-profile-api";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { useLocaleStore } from "@/store/locale-store";

type NavLabel = Parameters<typeof t>[1];

interface HubNavItem {
  href: string;
  label: NavLabel;
  icon: ComponentType<{ className?: string }>;
  descriptionKey?: string;
  match: (pathname: string) => boolean;
}

const coreHubs: HubNavItem[] = [
  {
    href: "/dashboard",
    label: "hubToday",
    icon: LayoutDashboard,
    match: (p) => p === "/dashboard",
  },
  {
    href: "/dashboard/events",
    label: "hubWar",
    icon: Swords,
    match: (p) =>
      p.startsWith("/dashboard/events") ||
      p.startsWith("/dashboard/attendance") ||
      p.startsWith("/dashboard/my-war-room"),
  },
  {
    href: "/dashboard/loot",
    label: "hubLoot",
    icon: Gem,
    match: (p) =>
      p.startsWith("/dashboard/loot") ||
      p.startsWith("/dashboard/auctions") ||
      p.startsWith("/dashboard/wishlist") ||
      p.startsWith("/dashboard/drops") ||
      p.startsWith("/dashboard/interests") ||
      p.startsWith("/dashboard/item-requests") ||
      p.startsWith("/dashboard/storage") ||
      p.startsWith("/dashboard/codex"),
  },
  {
    href: "/dashboard/members",
    label: "hubGuild",
    icon: UsersRound,
    match: (p) =>
      p.startsWith("/dashboard/members") ||
      p.startsWith("/dashboard/daoshi") ||
      p.startsWith("/dashboard/rules") ||
      p.startsWith("/dashboard/timeline"),
  },
];

const secondaryNav: Array<{
  href: string;
  label: NavLabel;
  icon: ComponentType<{ className?: string }>;
  badge?: boolean;
}> = [
  { href: "/dashboard/notices", label: "notices", icon: BellRing, badge: true },
  { href: "/dashboard/profile", label: "profile", icon: UserRound },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const logout = useAuthStore((state) => state.logout);
  const hasRole = useAuthStore((state) => state.hasRole);
  const locale = useLocaleStore((state) => state.locale);
  const isStaff = hasRole(["STAFF", "ADMIN"]);
  const unreadNotifications = useUnreadNotificationsCount();
  const maintenance = useMaintenanceMode();
  const unreadCount = unreadNotifications.data?.count ?? 0;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <AuthGuard>
      <CharacterSetupGate>
        <ProfileLocaleSync />
        <div className="min-h-screen">
        <a href="#main-content" className="skip-link">
          Pular para o conteudo
        </a>

        {/* Desktop Sidebar */}
        <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-white/10 bg-background/90 p-4 shadow-[18px_0_60px_rgba(0,0,0,0.4)] backdrop-blur-xl lg:block">
          <Link
            href="/dashboard"
            className="mb-6 block rounded-lg border border-primary/25 bg-card/80 p-3.5 shadow-rune transition hover:border-primary/50 hover:shadow-lg"
          >
            <p className="font-[var(--font-cinzel)] text-xl font-bold tracking-wide text-primary">
              Raven Command
            </p>
            <p className="mt-0.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              {t(locale, "guildOperationsDeck")}
            </p>
          </Link>

          <nav
            className="flex h-[calc(100vh-12rem)] flex-col justify-between overflow-y-auto pr-1 scrollbar-thin"
            aria-label="Navegacao principal"
          >
            <div className="space-y-6">
              {/* 4 Core Hubs */}
              <div>
                <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-primary/80">
                  {t(locale, "hubCore")}
                </p>
                <div className="space-y-1.5">
                  {coreHubs.map((hub) => {
                    const isActive = hub.match(pathname);
                    return (
                      <Link
                        key={hub.href}
                        href={hub.href}
                        className={cn(
                          "group flex items-center gap-3 rounded-lg px-3.5 py-3 text-sm font-medium transition-all",
                          isActive
                            ? "border border-primary/40 bg-primary/10 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                            : "text-muted-foreground hover:border-white/10 hover:bg-muted/70 hover:text-foreground",
                        )}
                      >
                        <hub.icon
                          className={cn(
                            "h-5 w-5 transition-colors",
                            isActive ? "text-primary" : "group-hover:text-primary",
                          )}
                        />
                        <span className="truncate">{t(locale, hub.label)}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Secondary Utilities */}
              <div>
                <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/60">
                  {t(locale, "hubTools")}
                </p>
                <div className="space-y-1">
                  {secondaryNav.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                          isActive
                            ? "bg-muted text-foreground"
                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                        )}
                      >
                        <item.icon
                          className={cn(
                            "h-4 w-4 transition-colors",
                            isActive ? "text-primary" : "group-hover:text-primary",
                          )}
                        />
                        <span className="min-w-0 flex-1 truncate">
                          {t(locale, item.label)}
                        </span>
                        {item.badge && unreadCount > 0 && (
                          <span className="rounded-full border border-primary/35 bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                            {unreadCount}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Staff Area Link */}
              {isStaff && (
                <div className="pt-2">
                  <div className="mb-2 border-t border-white/10 pt-3">
                    <Link
                      href="/dashboard/staff"
                      className={cn(
                        "group flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-3.5 py-2.5 text-sm font-semibold text-primary transition hover:border-primary/40 hover:bg-primary/10",
                        pathname.startsWith("/dashboard/staff") ||
                          pathname.startsWith("/dashboard/admin")
                          ? "border-primary/50 bg-primary/15 shadow-sm"
                          : "",
                      )}
                    >
                      <ShieldAlert className="h-4 w-4" />
                      <span className="flex-1 truncate">
                        {t(locale, "staffMode")}
                      </span>
                      <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
                        Staff
                      </span>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <Button
              variant="ghost"
              className="mt-4 justify-start gap-3 text-muted-foreground hover:text-foreground"
              onClick={logout}
            >
              <LogOut className="h-4 w-4" />
              <span>{t(locale, "signOut")}</span>
            </Button>
          </nav>
        </aside>

        {/* Main Content Area */}
        <div className="lg:pl-64">
          <header className="sticky top-0 z-10 border-b border-white/10 bg-background/85 px-4 py-3 backdrop-blur-lg lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <Link href="/dashboard" className="flex items-center gap-2">
                <p className="font-[var(--font-cinzel)] text-lg font-bold text-primary">
                  Raven Command
                </p>
              </Link>
              <div className="flex items-center gap-2">
                {isStaff && (
                  <span className="rounded border border-primary/35 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                    Staff
                  </span>
                )}
                <Button
                  variant="ghost"
                  className="h-10 w-10 px-0"
                  onClick={() => setMobileMenuOpen(true)}
                  aria-label="Abrir menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </header>

          <div className="sticky top-0 z-10 hidden border-b border-white/10 bg-background/80 px-8 py-3 backdrop-blur-md lg:block">
            <div className="ml-auto max-w-sm">
              <GlobalSearch />
            </div>
          </div>

          <main
            id="main-content"
            tabIndex={-1}
            className="mx-auto max-w-7xl p-4 pb-28 outline-none sm:p-6 sm:pb-28 lg:p-8"
          >
            {maintenance.data?.enabled ? (
              <div className="mb-5 rounded-md border border-primary/35 bg-primary/10 p-4 text-sm text-primary">
                <div className="flex flex-wrap items-start gap-2">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-semibold">Modo manutencao ativo</p>
                    <p className="mt-1 text-primary/85">
                      {maintenance.data.message}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
            {children}
          </main>
        </div>

        {/* Mobile Bottom Hub Bar */}
        <nav className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-white/10 bg-background/95 px-2 py-2 shadow-[0_-18px_55px_rgba(0,0,0,0.4)] backdrop-blur-xl lg:hidden">
          {coreHubs.map((hub) => {
            const isActive = hub.match(pathname);
            return (
              <Link
                key={hub.href}
                href={hub.href}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 rounded-md px-1 py-1.5 text-[11px] transition-colors",
                  isActive
                    ? "font-semibold text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <hub.icon
                  className={cn(
                    "h-5 w-5",
                    isActive ? "text-primary" : "text-muted-foreground",
                  )}
                />
                <span className="truncate">{t(locale, hub.label)}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-1 flex-col items-center gap-1 rounded-md px-1 py-1.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Mais opcoes"
          >
            <Menu className="h-5 w-5" />
            <span>Mais</span>
          </button>
        </nav>

        {/* Mobile Full Drawer */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm lg:hidden"
            role="presentation"
            onMouseDown={(event) =>
              event.target === event.currentTarget && setMobileMenuOpen(false)
            }
          >
            <section
              className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-primary/30 bg-card p-4 shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-labelledby="mobile-menu-title"
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2
                    id="mobile-menu-title"
                    className="font-[var(--font-cinzel)] text-xl font-bold text-primary"
                  >
                    Raven Command
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Menu Rápido de Navegação
                  </p>
                </div>
                <Button
                  variant="ghost"
                  className="h-10 w-10 px-0"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Fechar menu"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <GlobalSearch />

              <div className="mt-5 space-y-4">
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-primary">
                    {t(locale, "hubCore")}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {coreHubs.map((hub) => (
                      <Link
                        key={hub.href}
                        href={hub.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "flex min-h-12 items-center gap-2.5 rounded-lg border p-3 text-sm font-medium transition",
                          hub.match(pathname)
                            ? "border-primary/40 bg-primary/10 text-primary"
                            : "border-white/10 bg-background/50 hover:border-primary/30",
                        )}
                      >
                        <hub.icon className="h-4 w-4 shrink-0 text-primary" />
                        <span className="truncate">{t(locale, hub.label)}</span>
                      </Link>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground/80">
                    {t(locale, "hubTools")}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {secondaryNav.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex min-h-12 items-center gap-2.5 rounded-lg border border-white/10 bg-background/50 p-3 text-sm hover:border-primary/30"
                      >
                        <item.icon className="h-4 w-4 shrink-0 text-primary" />
                        <span className="truncate">{t(locale, item.label)}</span>
                        {item.badge && unreadCount > 0 && (
                          <span className="ml-auto rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                            {unreadCount}
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>

                {isStaff && (
                  <Link
                    href="/dashboard/staff"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex min-h-12 items-center justify-between rounded-lg border border-primary/40 bg-primary/15 p-3 text-sm font-semibold text-primary"
                  >
                    <div className="flex items-center gap-2.5">
                      <ShieldAlert className="h-4 w-4" />
                      <span>{t(locale, "staffMode")}</span>
                    </div>
                    <span className="text-xs uppercase">Acessar &rarr;</span>
                  </Link>
                )}

                <Button
                  variant="ghost"
                  className="w-full justify-center gap-2 border border-white/10 text-muted-foreground hover:text-foreground"
                  onClick={logout}
                >
                  <LogOut className="h-4 w-4" />
                  {t(locale, "signOut")}
                </Button>
              </div>
            </section>
          </div>
        )}
      </div>
      </CharacterSetupGate>
    </AuthGuard>
  );
}
