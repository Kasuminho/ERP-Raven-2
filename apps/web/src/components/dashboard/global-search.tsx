'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, Gavel, PackageSearch, Search, UserRound, X } from 'lucide-react';
import { useGlobalSearch } from '@/hooks/use-global-search';
import { useAuthStore } from '@/store/auth-store';
import { useLocaleStore } from '@/store/locale-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const icons = { item: PackageSearch, auction: Gavel, event: CalendarDays, player: UserRound };

export function GlobalSearch() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const isStaff = useAuthStore((state) => state.hasRole(['STAFF', 'ADMIN']));
  const locale = useLocaleStore((state) => state.locale);
  const results = useGlobalSearch(query, isStaff);
  const copy = locale === 'pt'
    ? { button: 'Buscar', title: 'Busca global', hint: 'Itens, leiloes, eventos e players', empty: 'Nenhum resultado. O mapa nao mentiu, so nao achou.', loading: 'Procurando...' }
    : { button: 'Search', title: 'Global search', hint: 'Items, auctions, events and players', empty: 'No results found.', loading: 'Searching...' };

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  const selectResult = (href: string) => {
    setOpen(false);
    setQuery('');
    router.push(href);
  };

  return (
    <>
      <Button variant="secondary" className="w-full justify-between" onClick={() => setOpen(true)} aria-label={`${copy.button} (Ctrl+K)`}>
        <span className="flex items-center gap-2"><Search className="h-4 w-4" /> {copy.button}</span>
        <kbd className="rounded border border-white/15 px-1.5 py-0.5 text-[10px] text-muted-foreground">Ctrl K</kbd>
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-start bg-black/70 p-3 pt-[10vh] backdrop-blur-sm" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
          <section className="mx-auto w-full max-w-2xl overflow-hidden rounded-xl border border-primary/25 bg-card shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="global-search-title">
            <div className="flex items-center gap-3 border-b border-white/10 p-4">
              <Search className="h-5 w-5 text-primary" />
              <div className="min-w-0 flex-1">
                <h2 id="global-search-title" className="font-semibold">{copy.title}</h2>
                <p className="text-xs text-muted-foreground">{copy.hint}</p>
              </div>
              <Button variant="ghost" className="h-10 w-10 px-0" onClick={() => setOpen(false)} aria-label="Fechar busca"><X className="h-4 w-4" /></Button>
            </div>
            <div className="p-4">
              <Input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.hint} aria-label={copy.title} />
            </div>
            <div className="max-h-[55vh] overflow-y-auto px-2 pb-3" aria-live="polite">
              {results.isFetching && <p className="px-3 py-6 text-center text-sm text-muted-foreground">{copy.loading}</p>}
              {!results.isFetching && query.trim().length >= 2 && (results.data ?? []).length === 0 && <p className="px-3 py-6 text-center text-sm text-muted-foreground">{copy.empty}</p>}
              {(results.data ?? []).map((result) => {
                const Icon = icons[result.kind];
                return (
                  <button key={`${result.kind}-${result.id}`} type="button" className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" onClick={() => selectResult(result.href)}>
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-primary/20 bg-primary/10"><Icon className="h-4 w-4 text-primary" /></span>
                    <span className="min-w-0"><span className="block truncate font-semibold">{result.title}</span><span className="block truncate text-xs text-muted-foreground">{result.subtitle}</span></span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
