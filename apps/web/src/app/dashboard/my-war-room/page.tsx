'use client';

import { useState } from 'react';
import { CheckCircle2, Shield, XCircle } from 'lucide-react';
import { AuthGuard } from '@/components/guards/auth-guard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { notifyToast } from '@/components/ui/toaster';
import { useConfirmWarRoomSlot, useDeclineWarRoomSlot, useMyWarRoomAssignments } from '@/hooks/use-war-room-api';
import { combatRoleLabel } from '@/lib/game-labels';
import type { PlayerCombatRole, PlayerWarRoomAssignment } from '@/types/api';

function statusTone(status: PlayerWarRoomAssignment['slot']['status']) {
  if (status === 'CONFIRMED' || status === 'PRESENT') return 'green';
  if (status === 'DECLINED' || status === 'ABSENT') return 'red';
  if (status === 'JUSTIFIED_ABSENCE') return 'blue';
  return 'gold';
}

export default function MyWarRoomPage() {
  const assignments = useMyWarRoomAssignments();
  const confirmSlot = useConfirmWarRoomSlot();
  const declineSlot = useDeclineWarRoomSlot();
  const [notes, setNotes] = useState<Record<string, string>>({});

  function noteFor(slotId: string) {
    return notes[slotId] ?? '';
  }

  function setNote(slotId: string, value: string) {
    setNotes((current) => ({ ...current, [slotId]: value }));
  }

  function confirm(slotId: string) {
    confirmSlot.mutate(
      { slotId, playerNote: noteFor(slotId) || undefined },
      { onSuccess: () => notifyToast({ title: 'Presenca confirmada.', tone: 'success' }) },
    );
  }

  function decline(slotId: string) {
    declineSlot.mutate(
      { slotId, playerNote: noteFor(slotId) || undefined },
      { onSuccess: () => notifyToast({ title: 'Ausencia avisada.', tone: 'success' }) },
    );
  }

  return (
    <AuthGuard>
      <div className="space-y-6">
        <div>
          <p className="text-sm uppercase text-primary">War Room</p>
          <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">Minha escala</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Aqui aparece somente a sua chamada. O resto da comp fica fechado ate a Staff liberar, porque fofoca taticamente cedo tambem da wipe.</p>
        </div>

        <div className="grid gap-4">
          {(assignments.data ?? []).map((assignment) => (
            <Card key={assignment.slot.id}>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  {assignment.operation.name}
                  <Badge tone={statusTone(assignment.slot.status)}>{assignment.slot.status}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="grid gap-2 md:grid-cols-3">
                  <div className="rounded-md border p-3">
                    <p className="text-muted-foreground">Funcao</p>
                    <p className="font-semibold">{combatRoleLabel(assignment.slot.role as PlayerCombatRole, 'pt')}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-muted-foreground">Quando</p>
                    <p className="font-semibold">{new Date(assignment.operation.startsAt).toLocaleString()}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-muted-foreground">Mapa/regiao</p>
                    <p className="font-semibold">{assignment.operation.mapRegion || '-'}</p>
                  </div>
                </div>

                {assignment.operation.objective && (
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Objetivo</p>
                    <p>{assignment.operation.objective}</p>
                  </div>
                )}

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-md border border-primary/25 bg-primary/10 p-3">
                    <p className="text-xs font-semibold uppercase text-primary">PT-BR</p>
                    <p className="mt-1 whitespace-pre-wrap">{assignment.slot.publicInstructionsPt || 'Fique online no horario, acompanhe a call e aguarde orientacao da Staff.'}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">EN</p>
                    <p className="mt-1 whitespace-pre-wrap">{assignment.slot.publicInstructionsEn || 'Be online on time, follow voice comms, and wait for Staff instructions.'}</p>
                  </div>
                </div>

                <textarea
                  className="min-h-20 w-full rounded-md border border-input bg-background/80 px-3 py-2 text-sm outline-none ring-offset-background transition focus:ring-2 focus:ring-ring"
                  placeholder="Nota opcional para a Staff / Optional note for Staff"
                  value={noteFor(assignment.slot.id)}
                  onChange={(event) => setNote(assignment.slot.id, event.target.value)}
                />

                <div className="flex flex-wrap gap-2">
                  <Button type="button" disabled={confirmSlot.isPending} onClick={() => confirm(assignment.slot.id)}>
                    <CheckCircle2 className="h-4 w-4" /> Confirmar
                  </Button>
                  <Button type="button" variant="danger" disabled={declineSlot.isPending} onClick={() => decline(assignment.slot.id)}>
                    <XCircle className="h-4 w-4" /> Nao vou
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {!assignments.isLoading && (assignments.data ?? []).length === 0 && (
            <EmptyState title="Sem escala aberta">Quando a Staff te chamar para uma operacao, sua confirmacao aparece aqui.</EmptyState>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
