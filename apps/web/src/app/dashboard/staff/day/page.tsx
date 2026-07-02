'use client';

import Link from 'next/link';
import { BellRing, CalendarCheck, ClipboardCheck, PackageCheck, ShieldAlert } from 'lucide-react';
import { OperationTaskList } from '@/components/dashboard/operation-task-list';
import { AuthGuard } from '@/components/guards/auth-guard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useStaffDayView } from '@/hooks/use-staff-operations-api';

function Metric({ title, value, icon: Icon }: { title: string; value?: number; icon: typeof BellRing }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-1 text-3xl font-bold">{value ?? 0}</p>
        </div>
        <Icon className="h-6 w-6 text-primary" />
      </CardContent>
    </Card>
  );
}

export default function StaffDayPage() {
  const day = useStaffDayView();
  const data = day.data;

  return (
    <AuthGuard roles={['STAFF', 'ADMIN']}>
      <div className="space-y-6">
        <div>
          <p className="text-sm uppercase text-primary">Central da Staff</p>
          <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">Operacao do dia</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Um painel unico para ver o que precisa de acao hoje, sem garimpar dez telas no susto.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Metric title="Anuncios de hoje" value={data?.todaysAnnouncements} icon={BellRing} />
          <Metric title="Eventos abertos hoje" value={data?.openEvents} icon={CalendarCheck} />
          <Metric title="Votos pendentes" value={data?.pendingStaffVotes} icon={ShieldAlert} />
          <Metric title="Entregas pendentes" value={data?.pendingDeliveries} icon={PackageCheck} />
          <Metric title="Progressos pendentes" value={data?.pendingProgressReviews} icon={ClipboardCheck} />
        </div>

        <OperationTaskList
          title="Prioridades agora"
          tasks={data?.urgentTasks ?? []}
          emptyText="Nada urgente no momento. Um raro momento de paz administrativa."
        />

        <Card>
          <CardHeader>
            <CardTitle>Atalhos de resolucao</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {[
              ['Eventos', '/dashboard/admin/events'],
              ['Anuncios', '/dashboard/admin/announcements'],
              ['Itens', '/dashboard/admin/items'],
              ['Leiloes', '/dashboard/auctions'],
              ['Revisoes', '/dashboard/staff/reviews'],
              ['Interesses', '/dashboard/staff/interests'],
              ['Entregas', '/dashboard/staff/deliveries'],
              ['Codex', '/dashboard/staff/codex'],
              ['Daoshi', '/dashboard/staff/daoshi'],
            ].map(([label, href]) => (
              <Link key={href} href={href} className="rounded-md border bg-background/40 px-4 py-3 text-sm font-semibold hover:border-primary">
                {label}
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  );
}
