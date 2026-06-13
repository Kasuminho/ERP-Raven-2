'use client';

import Link from 'next/link';
import { BellRing, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { useNoticeBoard } from '@/hooks/use-guild-api';

export default function NoticesPage() {
  const notices = useNoticeBoard();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase text-primary">Mural interno</p>
        <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">Meus avisos</h1>
        <p className="mt-2 text-sm text-muted-foreground">Pendencias, leiloes fechando e avisos que precisam da sua atencao dentro do site.</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><BellRing className="h-5 w-5 text-primary" /> Avisos ativos</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {(notices.data ?? []).map((notice) => (
            <Link key={`${notice.type}-${notice.id}`} href={notice.href} className="flex flex-col gap-3 rounded-md border bg-background/35 p-3 transition hover:border-primary md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <strong>{notice.title}</strong>
                  <Badge tone={notice.priority === 'high' ? 'red' : notice.priority === 'medium' ? 'gold' : 'blue'}>{notice.priority}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{notice.description}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-primary" />
            </Link>
          ))}
          {!notices.isLoading && (notices.data ?? []).length === 0 && <EmptyState title="Sem avisos agora">Quando tiver algo pedindo sua atencao, aparece aqui.</EmptyState>}
        </CardContent>
      </Card>
    </div>
  );
}
