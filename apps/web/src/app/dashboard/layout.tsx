"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ComponentType } from "react";
import {
  BellRing,
  BookOpenCheck,
  CalendarCheck,
  ClipboardList,
  Clock3,
  Compass,
  Gem,
  Gavel,
  HandCoins,
  HandHeart,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareLock,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  Swords,
  UserRound,
  X,
} from "lucide-react";
import { GlobalSearch } from "@/components/dashboard/global-search";
import { ProfileLocaleSync } from "@/components/dashboard/profile-locale-sync";
import { AuthGuard } from "@/components/guards/auth-guard";
import { Button } from "@/components/ui/button";
import { useMaintenanceMode } from "@/hooks/use-staff-operations-api";
import { useUnreadNotificationsCount } from "@/hooks/use-profile-api";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { useLocaleStore } from "@/store/locale-store";

type NavLabel = Parameters<typeof t>[1];

const nav: Array<{
  href: string;
  label: NavLabel;
  icon: ComponentType<{ className?: string }>;
}> = [
  { href: "/dashboard", label: "command", icon: LayoutDashboard },
  { href: "/dashboard/notices", label: "notices", icon: BellRing },
  {
    href: "/dashboard/communications",
    label: "communications",
    icon: BellRing,
  },
  { href: "/dashboard/my-war-room", label: "myWarRoom", icon: Swords },
  { href: "/dashboard/playbook", label: "playbook", icon: BookOpenCheck },
  { href: "/dashboard/rules", label: "rules", icon: ScrollText },
  { href: "/dashboard/cases", label: "cases", icon: MessageSquareLock },
  { href: "/dashboard/onboarding", label: "onboarding", icon: Compass },
  { href: "/dashboard/trial", label: "trial", icon: ShieldCheck },
  { href: "/dashboard/mentorship", label: "mentorship", icon: Compass },
  { href: "/dashboard/pulse", label: "guildPulse", icon: HandHeart },
  { href: "/dashboard/auctions", label: "auctions", icon: Gavel },
  { href: "/dashboard/interests", label: "interests", icon: HandHeart },
  { href: "/dashboard/wishlist", label: "wishlist", icon: Gem },
  { href: "/dashboard/item-requests", label: "requests", icon: ClipboardList },
  { href: "/dashboard/codex", label: "codex", icon: BookOpenCheck },
  { href: "/dashboard/daoshi", label: "daoshi", icon: HandCoins },
  { href: "/dashboard/timeline", label: "timeline", icon: Clock3 },
  {
    href: "/dashboard/weekly-summary",
    label: "weeklySummary",
    icon: ScrollText,
  },
  { href: "/dashboard/drops", label: "drops", icon: Gem },
  { href: "/dashboard/attendance", label: "attendance", icon: CalendarCheck },
  { href: "/dashboard/profile", label: "profile", icon: UserRound },
];

const mobilePrimaryHrefs = new Set([
  "/dashboard",
  "/dashboard/auctions",
  "/dashboard/interests",
  "/dashboard/item-requests",
]);

const navGroups: Array<{ label: string; hrefs: string[] }> = [
  {
    label: "Agora",
    hrefs: [
      "/dashboard",
      "/dashboard/notices",
      "/dashboard/communications",
      "/dashboard/my-war-room",
      "/dashboard/playbook",
      "/dashboard/onboarding",
      "/dashboard/trial",
      "/dashboard/mentorship",
      "/dashboard/pulse",
      "/dashboard/cases",
    ],
  },
  {
    label: "Loot",
    hrefs: [
      "/dashboard/auctions",
      "/dashboard/interests",
      "/dashboard/wishlist",
      "/dashboard/item-requests",
      "/dashboard/codex",
      "/dashboard/drops",
    ],
  },
  {
    label: "Progresso",
    hrefs: [
      "/dashboard/daoshi",
      "/dashboard/timeline",
      "/dashboard/weekly-summary",
      "/dashboard/attendance",
      "/dashboard/rules",
    ],
  },
  { label: "Conta", hrefs: ["/dashboard/profile"] },
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
  const primaryNav = nav.filter((item) => mobilePrimaryHrefs.has(item.href));

  return (
    <AuthGuard>
      <ProfileLocaleSync />
      <div className="min-h-screen">
        <a href="#main-content" className="skip-link">
          Pular para o conteudo
        </a>
        <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 border-r border-white/10 bg-background/88 p-4 shadow-[18px_0_60px_rgba(0,0,0,0.35)] backdrop-blur-xl lg:block">
          <Link
            href="/dashboard"
            className="mb-6 block rounded-lg border border-primary/20 bg-card/80 p-4 shadow-rune transition hover:border-primary/45"
          >
            <p className="font-[var(--font-cinzel)] text-2xl font-bold text-primary">
              Raven Command
            </p>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {t(locale, "guildOperationsDeck")}
            </p>
          </Link>
          <nav
            className="max-h-[calc(100vh-9rem)] space-y-4 overflow-y-auto pr-1 scrollbar-thin"
            aria-label="Navegacao principal"
          >
            {navGroups.map((group) => (
              <div key={group.label}>
                <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/75">
                  {group.label}
                </p>
                <div className="space-y-1">
                  {nav
                    .filter((item) => group.hrefs.includes(item.href))
                    .map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-muted-foreground transition hover:bg-muted/75 hover:text-foreground",
                          pathname === item.href &&
                            "border border-primary/20 bg-muted/90 text-foreground shadow-inner",
                        )}
                      >
                        <item.icon
                          className={cn(
                            "h-4 w-4 transition group-hover:text-primary",
                            pathname === item.href && "text-primary",
                          )}
                        />
                        <span className="min-w-0 flex-1 truncate">
                          {t(locale, item.label)}
                        </span>
                        {item.href === "/dashboard/notices" &&
                          unreadCount > 0 && (
                            <span className="rounded-full border border-primary/35 bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                              {unreadCount}
                            </span>
                          )}
                      </Link>
                    ))}
                </div>
              </div>
            ))}
            {isStaff && (
              <Link
                href="/dashboard/staff"
                className={cn(
                  "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-muted-foreground transition hover:bg-muted/75 hover:text-foreground",
                  pathname.startsWith("/dashboard/staff") ||
                    pathname.startsWith("/dashboard/admin")
                    ? "border border-primary/20 bg-muted/90 text-foreground"
                    : "",
                )}
              >
                <ShieldAlert className="h-4 w-4 text-primary" />{" "}
                {t(locale, "staff")}
              </Link>
            )}
          </nav>
          <Button
            variant="ghost"
            className="absolute bottom-4 left-4 right-4"
            onClick={logout}
          >
            <LogOut className="h-4 w-4" /> {t(locale, "signOut")}
          </Button>
        </aside>
        <div className="lg:pl-72">
          <header className="sticky top-0 z-10 border-b border-white/10 bg-background/78 px-4 py-3 backdrop-blur lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <p className="font-[var(--font-cinzel)] text-lg font-bold text-primary">
                Raven Command
              </p>
              <div className="flex items-center gap-2">
                {isStaff && (
                  <span className="rounded-md border border-primary/30 px-2 py-1 text-[10px] font-bold uppercase text-primary">
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
          <div className="sticky top-0 z-10 hidden border-b border-white/10 bg-background/72 px-8 py-3 backdrop-blur lg:block">
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
        <nav className="fixed bottom-0 left-0 right-0 z-30 flex snap-x gap-1 overflow-x-auto border-t border-white/10 bg-background/94 px-2 py-2 shadow-[0_-18px_55px_rgba(0,0,0,0.35)] backdrop-blur-xl lg:hidden">
          {primaryNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-w-16 snap-start flex-col items-center gap-1 rounded-md border border-transparent px-2 py-1.5 text-[10px] text-muted-foreground transition",
                (pathname === item.href ||
                  (item.href === "/dashboard/staff" &&
                    (pathname.startsWith("/dashboard/staff") ||
                      pathname.startsWith("/dashboard/admin")))) &&
                  "border-primary/25 bg-muted/90 text-primary",
              )}
            >
              <item.icon className="h-4 w-4" />
              <span className="relative max-w-full truncate">
                {t(locale, item.label)}
                {item.href === "/dashboard/notices" && unreadCount > 0 && (
                  <span className="absolute -right-2 -top-2 h-2 w-2 rounded-full bg-primary" />
                )}
              </span>
            </Link>
          ))}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="flex min-w-16 snap-start flex-col items-center gap-1 rounded-md border border-transparent px-2 py-1.5 text-[10px] text-muted-foreground transition hover:bg-muted"
            aria-label="Mais destinos"
          >
            <Menu className="h-4 w-4" />
            <span>Mais</span>
          </button>
        </nav>
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm lg:hidden"
            role="presentation"
            onMouseDown={(event) =>
              event.target === event.currentTarget && setMobileMenuOpen(false)
            }
          >
            <section
              className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-2xl border-t border-primary/25 bg-card p-4 shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-labelledby="mobile-menu-title"
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2
                    id="mobile-menu-title"
                    className="font-[var(--font-cinzel)] text-xl font-bold"
                  >
                    Raven Command
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Tudo no lugar, sem maratona de icones.
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
              <div className="mt-5 space-y-5">
                {navGroups.map((group) => (
                  <div key={group.label}>
                    <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-primary">
                      {group.label}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {nav
                        .filter((item) => group.hrefs.includes(item.href))
                        .map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex min-h-12 items-center gap-2 rounded-lg border border-white/10 bg-background/45 p-3 text-sm hover:border-primary/35"
                          >
                            <item.icon className="h-4 w-4 shrink-0 text-primary" />
                            <span className="truncate">
                              {t(locale, item.label)}
                            </span>
                          </Link>
                        ))}
                    </div>
                  </div>
                ))}
                {isStaff && (
                  <Link
                    href="/dashboard/staff"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex min-h-12 items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 p-3 font-semibold text-primary"
                  >
                    <ShieldAlert className="h-4 w-4" />
                    {t(locale, "staff")}
                  </Link>
                )}
                <Button variant="ghost" className="w-full" onClick={logout}>
                  <LogOut className="h-4 w-4" />
                  {t(locale, "signOut")}
                </Button>
              </div>
            </section>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
