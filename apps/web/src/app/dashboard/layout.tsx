"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  CheckSquare,
  Crown,
  LogOut,
  Menu,
  ShieldAlert,
  Trophy,
  User,
  X,
} from "lucide-react";
import { LocaleSwitcher } from "@/components/dashboard/locale-switcher";
import { AuthGuard } from "@/components/guards/auth-guard";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth-store";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const logout = useAuthStore((state) => state.logout);
  const hasRole = useAuthStore((state) => state.hasRole);
  const isStaff = hasRole(["STAFF", "ADMIN"]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        {/* Top Navigation Bar Limpa e Gamer */}
        <header className="sticky top-0 z-30 border-b border-white/10 bg-card/80 backdrop-blur-xl px-4 md:px-8 py-3.5 shadow-md">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            {/* Logo / Título */}
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-primary to-amber-500 flex items-center justify-center text-primary-foreground font-black shadow-rune">
                <Crown className="h-5 w-5" />
              </div>
              <div>
                <span className="font-[var(--font-cinzel)] text-lg font-extrabold tracking-wide text-foreground group-hover:text-primary transition-colors">
                  AlcatraZ
                </span>
                <span className="hidden sm:inline-block ml-2 text-[10px] font-bold uppercase tracking-widest text-primary/80 border border-primary/30 px-1.5 py-0.5 rounded">
                  Raven 2
                </span>
              </div>
            </Link>

            {/* Links Centrais */}
            <nav className="hidden md:flex items-center gap-1">
              <Link
                href="/dashboard"
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  pathname === "/dashboard"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                }`}
              >
                <Trophy className="h-4 w-4" />
                Ranking de CP
              </Link>

              {isStaff && (
                <Link
                  href="/dashboard/staff/progress"
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    pathname.startsWith("/dashboard/staff")
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                  }`}
                >
                  <CheckSquare className="h-4 w-4 text-amber-400" />
                  Aprovar Prints (Staff)
                </Link>
              )}
            </nav>

            {/* Ações Direita (Idioma e Deslogar) */}
            <div className="hidden md:flex items-center gap-3">
              <LocaleSwitcher />
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                onClick={logout}
              >
                <LogOut className="h-4 w-4" />
                <span>Sair</span>
              </Button>
            </div>

            {/* Botão Mobile */}
            <div className="flex items-center gap-2 md:hidden">
              <LocaleSwitcher />
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-muted-foreground hover:text-foreground"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>

          {/* Menu Mobile */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-3 pt-3 border-t border-white/10 space-y-2">
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-bold ${
                  pathname === "/dashboard"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-white/5"
                }`}
              >
                <Trophy className="h-4 w-4" />
                Ranking de CP
              </Link>

              {isStaff && (
                <Link
                  href="/dashboard/staff/progress"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30"
                >
                  <CheckSquare className="h-4 w-4" />
                  Aprovar Prints (Staff)
                </Link>
              )}

              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-muted-foreground hover:text-red-400"
                onClick={logout}
              >
                <LogOut className="h-4 w-4" />
                <span>Sair da Conta</span>
              </Button>
            </div>
          )}
        </header>

        {/* Conteúdo Central */}
        <main className="flex-1 mx-auto w-full max-w-7xl p-4 md:p-8">
          {children}
        </main>

        {/* Rodapé Simples */}
        <footer className="border-t border-white/10 bg-card/40 py-4 text-center text-xs text-muted-foreground">
          Guild AlcatraZ • Raven 2 — Sistema Simplificado de Ranking
        </footer>
      </div>
    </AuthGuard>
  );
}
