'use client';

import Link from 'next/link';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function RetiredTrialPage() {
  return (
    <div className="mx-auto max-w-xl py-12">
      <Card className="border-primary/20 bg-card/70 text-center">
        <CardHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <CardTitle className="mt-4 font-[var(--font-cinzel)] text-xl font-bold">
            Acompanhamento de Membro
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            O status e a progressão de todos os membros agora são acompanhados através da presença em bosses
            e do Roster oficial da guilda.
          </p>
          <div className="pt-2">
            <Link href="/dashboard/members">
              <Button className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Ver Roster da Guilda
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
