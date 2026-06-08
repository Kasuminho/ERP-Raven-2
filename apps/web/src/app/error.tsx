'use client';

import { Button } from '@/components/ui/button';

export default function Error({ reset }: { reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-md rounded-lg border bg-card/90 p-6 text-center shadow-rune">
        <h1 className="font-[var(--font-cinzel)] text-2xl">The ledger cracked</h1>
        <p className="mt-2 text-sm text-muted-foreground">Something failed while loading this command view.</p>
        <Button className="mt-5" onClick={reset}>Retry</Button>
      </div>
    </main>
  );
}
