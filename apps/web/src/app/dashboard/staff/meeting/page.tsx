'use client';

import Link from 'next/link';
import { ClipboardList } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OperationTaskList } from '@/components/dashboard/operation-task-list';
import { useStaffMeeting } from '@/hooks/use-guild-api';

export default function StaffMeetingPage() {
  const meeting = useStaffMeeting();
  const data = meeting.data;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase text-primary">Pauta automatica</p>
        <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">Modo reuniao de Staff</h1>
      </div>
      <OperationTaskList title="Prioridades da call" tasks={data?.urgentTasks ?? []} emptyText="Sem urgencias para a pauta." />
      <div className="grid gap-4 xl:grid-cols-3">
        <Card><CardHeader><CardTitle>Leiloes em review</CardTitle></CardHeader><CardContent className="space-y-2">{(data?.reviewAuctions ?? []).map((row) => <Link className="block rounded-md border p-3 text-sm hover:border-primary" href="/dashboard/staff/reviews" key={row.id}>{row.itemName}</Link>)}</CardContent></Card>
        <Card><CardHeader><CardTitle>Interesses para decidir</CardTitle></CardHeader><CardContent className="space-y-2">{(data?.votingInterests ?? []).map((row) => <Link className="block rounded-md border p-3 text-sm hover:border-primary" href="/dashboard/staff/interests" key={row.id}>{row.title} - {row.entries} interessados</Link>)}</CardContent></Card>
        <Card><CardHeader><CardTitle>Eventos abertos</CardTitle></CardHeader><CardContent className="space-y-2">{(data?.openEventRows ?? []).map((row) => <Link className="block rounded-md border p-3 text-sm hover:border-primary" href="/dashboard/admin/events" key={row.id}>{row.name} - {row.type}</Link>)}</CardContent></Card>
      </div>
    </div>
  );
}
