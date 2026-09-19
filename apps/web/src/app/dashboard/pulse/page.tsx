'use client';

import Link from 'next/link';
import { ArrowLeft, MessageSquare, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function RetiredPulsePage() {
  return (
    <div className="mx-auto max-w-xl py-12">
      <Card className="border-primary/20 bg-card/70 text-center">
        <CardHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="h-6 w-6" />
          </div>
          <CardTitle className="mt-4 font-[var(--font-cinzel)] text-xl font-bold">
            Pesquisa de Clima Descontinuada
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            Eliminamos pesquisas corporativas e formulários burocráticos.
            Na G3X, o feedback é direto, em tempo real e na voz com os oficiais no Discord.
          </p>
          <div className="pt-2">
            <Link href="/dashboard">
              <Button className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Voltar ao Comando
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
