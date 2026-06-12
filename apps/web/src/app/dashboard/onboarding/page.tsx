'use client';

import Link from 'next/link';
import { CheckCircle2, Circle, Compass } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMyHistory } from '@/hooks/use-guild-api';
import { useLocaleStore } from '@/store/locale-store';

const copy = {
  pt: {
    eyebrow: 'Primeiros passos',
    title: 'Checklist do jogador',
    help: 'Use isso pra nao ficar perdido e evitar perder fila, DKP ou informacao importante.',
    done: 'Pronto',
    open: 'Pendente',
    steps: [
      ['Perfil configurado', 'Confirme nick, classe, camada e timezone no perfil.', '/dashboard/profile'],
      ['Status enviado', 'Envie seu print de Status para a Staff validar CP.', '/dashboard/profile'],
      ['Fenda enviada', 'Envie seu print de Fenda Dimensional para validar camada.', '/dashboard/profile'],
      ['DKP entendido', 'Acompanhe total, travado e disponivel no dashboard.', '/dashboard'],
      ['Pedidos acompanhados', 'Veja filas e atualize print quando o sistema pedir.', '/dashboard/item-requests'],
      ['Daoshi configurado', 'Se cashar com Daoshi, envie comprovante pela area propria.', '/dashboard/daoshi'],
    ],
  },
  en: {
    eyebrow: 'First steps',
    title: 'Player checklist',
    help: 'Use this to avoid missing queues, DKP, or important guild information.',
    done: 'Done',
    open: 'Pending',
    steps: [
      ['Profile configured', 'Confirm nickname, class, layer, and timezone in your profile.', '/dashboard/profile'],
      ['Status submitted', 'Upload your Status screenshot so Staff can validate CP.', '/dashboard/profile'],
      ['Rift submitted', 'Upload your Dimensional Rift screenshot so Staff can validate layer.', '/dashboard/profile'],
      ['DKP understood', 'Track total, locked, and available DKP on the dashboard.', '/dashboard'],
      ['Requests tracked', 'Watch queues and update screenshots when the system asks.', '/dashboard/item-requests'],
      ['Daoshi ready', 'If you buy through Daoshi, upload the receipt in its page.', '/dashboard/daoshi'],
    ],
  },
  es: {
    eyebrow: 'Primeros pasos',
    title: 'Checklist del jugador',
    help: 'Usa esto para no perder filas, DKP o informacion importante.',
    done: 'Listo',
    open: 'Pendiente',
    steps: [
      ['Perfil configurado', 'Confirma nick, clase, capa y timezone en tu perfil.', '/dashboard/profile'],
      ['Status enviado', 'Sube tu print de Status para que Staff valide CP.', '/dashboard/profile'],
      ['Fisura enviada', 'Sube tu print de Fisura Dimensional para validar capa.', '/dashboard/profile'],
      ['DKP entendido', 'Acompana total, bloqueado y disponible en el dashboard.', '/dashboard'],
      ['Pedidos acompanados', 'Mira filas y actualiza prints cuando el sistema pida.', '/dashboard/item-requests'],
      ['Daoshi listo', 'Si compras con Daoshi, sube el comprobante en su pagina.', '/dashboard/daoshi'],
    ],
  },
} as const;

export default function OnboardingPage() {
  const locale = useLocaleStore((state) => state.locale);
  const t = copy[locale];
  const history = useMyHistory();
  const player = history.data?.player;
  const hasStatus = (history.data?.progress ?? []).some((row) => row.category === 'STATUS');
  const hasRift = (history.data?.progress ?? []).some((row) => row.category === 'DIMENSIONAL_RIFT');
  const checks = [Boolean(player?.nickname && player?.timezone), hasStatus, hasRift, true, true, true];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase text-primary">{t.eyebrow}</p>
        <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">{t.title}</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{t.help}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Compass className="h-5 w-5 text-primary" /> {t.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {t.steps.map(([title, description, href], index) => {
            const done = checks[index];
            return (
              <Link key={title} href={href} className="grid gap-2 rounded-md border bg-background/35 p-3 text-sm transition hover:border-primary md:grid-cols-[32px_1fr_120px]">
                {done ? <CheckCircle2 className="h-5 w-5 text-emerald-300" /> : <Circle className="h-5 w-5 text-primary" />}
                <span>
                  <strong className="block">{title}</strong>
                  <span className="text-muted-foreground">{description}</span>
                </span>
                <span className={done ? 'text-emerald-300' : 'text-primary'}>{done ? t.done : t.open}</span>
              </Link>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
