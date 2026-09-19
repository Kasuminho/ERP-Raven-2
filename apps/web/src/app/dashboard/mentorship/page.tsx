'use client';

import Link from 'next/link';
import { ArrowLeft, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function RetiredMentorshipPage() {
  return (
    <div className="mx-auto max-w-xl py-12">
      <Card className="border-primary/20 bg-card/70 text-center">
        <CardHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Users className="h-6 w-6" />
          </div>
          <CardTitle className="mt-4 font-[var(--font-cinzel)] text-xl font-bold">
            Mentoria Integrada à Comunidade
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            O fluxo de tutoria formal foi substituído pela ajuda mútua no canal de dúvidas e voz da guilda.
            Conheça todos os membros e suas classes no Roster da Guilda.
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
