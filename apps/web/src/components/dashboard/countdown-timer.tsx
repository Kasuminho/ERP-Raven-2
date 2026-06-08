'use client';

import { useEffect, useMemo, useState } from 'react';

export function CountdownTimer({ endsAt }: { endsAt: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const label = useMemo(() => {
    const remaining = Math.max(0, new Date(endsAt).getTime() - now);
    const hours = Math.floor(remaining / 3_600_000);
    const minutes = Math.floor((remaining % 3_600_000) / 60_000);
    const seconds = Math.floor((remaining % 60_000) / 1000);
    return `${hours}h ${minutes}m ${seconds}s`;
  }, [endsAt, now]);

  return <span className="font-mono text-sm text-primary">{label}</span>;
}
