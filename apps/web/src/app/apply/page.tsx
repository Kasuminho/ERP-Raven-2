'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { notifyToast } from '@/components/ui/toaster';
import { useCreateRecruitmentApplication } from '@/hooks/use-recruitment-api';
import type { PlayerClass } from '@/types/api';

const classes: PlayerClass[] = ['GUNSLINGER', 'BERSERKER', 'DESTROYER', 'DEATHBRINGER', 'ASSASSIN', 'DIVINE_CASTER', 'NIGHT_RANGER', 'VANGUARD', 'ELEMENTALIST', 'WARLORD'];

export default function ApplyPage() {
  const create = useCreateRecruitmentApplication();
  const [form, setForm] = useState({
    nickname: '',
    discordTag: '',
    playerClass: 'VANGUARD' as PlayerClass,
    combatPower: '',
    dimensionalLayer: '1',
    availability: '',
    focus: '',
    experience: '',
    proofImageUrl: '',
    notes: '',
    rulesAccepted: false,
  });

  function submit() {
    create.mutate({
      ...form,
      combatPower: Number(form.combatPower),
      dimensionalLayer: Number(form.dimensionalLayer),
      proofImageUrl: form.proofImageUrl.trim() || undefined,
      notes: form.notes.trim() || undefined,
      discordTag: form.discordTag.trim() || undefined,
    }, {
      onSuccess: () => notifyToast({ title: 'Candidatura enviada / Application sent', tone: 'success' }),
      onError: () => notifyToast({ title: 'Nao foi possivel enviar / Could not send', tone: 'error' }),
    });
  }

  return (
    <main className="min-h-screen bg-background p-4 text-foreground">
      <div className="mx-auto max-w-3xl space-y-6 py-8">
        <div>
          <p className="text-sm uppercase text-primary">G3X Raven 2</p>
          <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">Candidatura / Application</h1>
        </div>
        <Card>
          <CardHeader><CardTitle>Dados do player / Player info</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <Input placeholder="Nick" value={form.nickname} onChange={(event) => setForm({ ...form, nickname: event.target.value })} />
            <Input placeholder="Discord tag/ID" value={form.discordTag} onChange={(event) => setForm({ ...form, discordTag: event.target.value })} />
            <Select value={form.playerClass} onChange={(event) => setForm({ ...form, playerClass: event.target.value as PlayerClass })}>
              {classes.map((value) => <option key={value}>{value}</option>)}
            </Select>
            <Input type="number" placeholder="CP" value={form.combatPower} onChange={(event) => setForm({ ...form, combatPower: event.target.value })} />
            <Input type="number" min={1} max={10} placeholder="Camada / Layer" value={form.dimensionalLayer} onChange={(event) => setForm({ ...form, dimensionalLayer: event.target.value })} />
            <Input placeholder="Foco PvP/PvE / Focus" value={form.focus} onChange={(event) => setForm({ ...form, focus: event.target.value })} />
            <Input className="md:col-span-2" placeholder="Disponibilidade / Availability" value={form.availability} onChange={(event) => setForm({ ...form, availability: event.target.value })} />
            <textarea className="min-h-28 rounded-md border bg-background px-3 py-2 text-sm md:col-span-2" placeholder="Experiencia / Experience" value={form.experience} onChange={(event) => setForm({ ...form, experience: event.target.value })} />
            <Input className="md:col-span-2" placeholder="Print opcional / Optional screenshot URL" value={form.proofImageUrl} onChange={(event) => setForm({ ...form, proofImageUrl: event.target.value })} />
            <textarea className="min-h-20 rounded-md border bg-background px-3 py-2 text-sm md:col-span-2" placeholder="Observacoes / Notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
            <label className="flex items-center gap-2 text-sm md:col-span-2">
              <input type="checkbox" checked={form.rulesAccepted} onChange={(event) => setForm({ ...form, rulesAccepted: event.target.checked })} />
              Aceito as regras da guilda / I accept the guild rules
            </label>
            <Button className="md:col-span-2" disabled={create.isPending || !form.rulesAccepted} onClick={submit}>Enviar / Send</Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
