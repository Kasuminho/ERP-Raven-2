'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { notifyToast } from '@/components/ui/toaster';
import { useGuildCaseStaffWorkspace, useRespondGuildCase, useTriageGuildCase } from '@/hooks/use-guild-cases-api';
import type { GuildCaseSeverity, GuildCaseStatus } from '@/types/api';

const fieldClass = 'min-h-24 w-full rounded-md border border-white/10 bg-background/78 px-3 py-2 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-ring';

export default function StaffGuildCasesPage() {
  const [filter, setFilter] = useState<GuildCaseStatus | 'ALL'>('ALL');
  const workspace = useGuildCaseStaffWorkspace(filter);
  const [selectedId, setSelectedId] = useState<string>();
  const selected = useMemo(() => workspace.data?.cases.find((item) => item.id === selectedId) ?? workspace.data?.cases[0], [selectedId, workspace.data]);
  const triage = useTriageGuildCase();
  const respond = useRespondGuildCase();
  const [status, setStatus] = useState<GuildCaseStatus>('IN_REVIEW');
  const [severity, setSeverity] = useState<GuildCaseSeverity>('MEDIUM');
  const [assignedToId, setAssignedToId] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [bodyPt, setBodyPt] = useState('');
  const [bodyEn, setBodyEn] = useState('');

  return (
    <div className="space-y-6">
      <div><p className="text-sm uppercase text-primary">Governança privada</p><h1 className="font-[var(--font-cinzel)] text-3xl font-bold">Casos e recursos</h1><p className="mt-2 text-sm text-muted-foreground">Notas internas nunca aparecem ao player. Volume e severidade não aplicam punição automática.</p></div>
      <div className="grid gap-4 xl:grid-cols-[0.85fr_1.4fr]">
        <Card><CardHeader><div className="flex items-center justify-between gap-3"><CardTitle>Fila privada</CardTitle><Select className="w-44" value={filter} onChange={(event) => setFilter(event.target.value as GuildCaseStatus | 'ALL')}><option value="ALL">Todos</option>{['OPEN', 'IN_REVIEW', 'WAITING_PLAYER', 'RESOLVED', 'CLOSED'].map((value) => <option key={value}>{value}</option>)}</Select></div></CardHeader><CardContent className="space-y-2">{workspace.data?.cases.map((item) => <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} className={`w-full rounded-md border p-3 text-left ${selected?.id === item.id ? 'border-primary/50 bg-primary/10' : 'border-white/10 bg-background/40'}`}><div className="flex justify-between gap-2"><span className="font-semibold">{item.subject}</span><Badge tone={item.severity === 'HIGH' || item.severity === 'CRITICAL' ? 'red' : 'gold'}>{item.severity}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{item.player?.nickname} · {item.status}{item.dueAt ? ` · prazo ${new Date(item.dueAt).toLocaleString()}` : ''}</p></button>)}</CardContent></Card>
        {selected ? <Card><CardHeader><CardTitle>{selected.subject}</CardTitle><p className="text-sm text-muted-foreground">{selected.player?.nickname} · {selected.category} · {selected.status}</p></CardHeader><CardContent className="space-y-5">
          <div className="space-y-2">{selected.entries.map((entry) => <div key={entry.id} className={`rounded-md border p-3 text-sm ${entry.visibility === 'STAFF' ? 'border-red-400/25 bg-red-950/20' : 'border-white/10 bg-background/45'}`}><div className="flex justify-between text-xs text-muted-foreground"><span>{entry.kind} · {entry.visibility}</span><span>{new Date(entry.createdAt).toLocaleString()}</span></div>{entry.bodyPt ? <p className="mt-2 whitespace-pre-wrap"><strong>PT-BR:</strong> {entry.bodyPt}</p> : null}{entry.bodyEn ? <p className="mt-2 whitespace-pre-wrap"><strong>EN:</strong> {entry.bodyEn}</p> : null}</div>)}</div>
          <section className="space-y-3 rounded-md border border-white/10 p-4"><h2 className="font-semibold">Triagem Staff</h2><div className="grid gap-2 md:grid-cols-2"><Select value={status} onChange={(event) => setStatus(event.target.value as GuildCaseStatus)}>{['OPEN', 'IN_REVIEW', 'WAITING_PLAYER', 'RESOLVED', 'CLOSED'].map((value) => <option key={value}>{value}</option>)}</Select><Select value={severity} onChange={(event) => setSeverity(event.target.value as GuildCaseSeverity)}>{['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((value) => <option key={value}>{value}</option>)}</Select><Select value={assignedToId} onChange={(event) => setAssignedToId(event.target.value)}><option value="">Manter responsável</option>{workspace.data?.assignees.map((user) => <option key={user.id} value={user.id}>{user.discordNickname ?? user.discordUsername}</option>)}</Select><Input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} /><textarea className={`${fieldClass} md:col-span-2`} value={internalNote} onChange={(event) => setInternalNote(event.target.value)} placeholder="Nota interna somente para Staff" /></div><Button disabled={triage.isPending} onClick={() => triage.mutate({ caseId: selected.id, status, severity, assignedToId: assignedToId || undefined, dueAt: dueAt ? new Date(dueAt).toISOString() : undefined, internalNote: internalNote.trim() || undefined }, { onSuccess: () => { setInternalNote(''); notifyToast({ title: 'Triagem salva.', tone: 'success' }); } })}>Salvar triagem</Button></section>
          <section className="space-y-3 rounded-md border border-primary/20 p-4"><h2 className="font-semibold">Resposta ao player</h2><textarea className={fieldClass} value={bodyPt} onChange={(event) => setBodyPt(event.target.value)} placeholder="PT-BR" /><textarea className={fieldClass} value={bodyEn} onChange={(event) => setBodyEn(event.target.value)} placeholder="EN" /><div className="flex gap-2"><Button disabled={respond.isPending || bodyPt.trim().length < 3 || bodyEn.trim().length < 3} onClick={() => respond.mutate({ caseId: selected.id, bodyPt: bodyPt.trim(), bodyEn: bodyEn.trim(), resolve: false }, { onSuccess: () => { setBodyPt(''); setBodyEn(''); } })}>Responder e aguardar player</Button><Button variant="secondary" disabled={respond.isPending || bodyPt.trim().length < 3 || bodyEn.trim().length < 3} onClick={() => respond.mutate({ caseId: selected.id, bodyPt: bodyPt.trim(), bodyEn: bodyEn.trim(), resolve: true }, { onSuccess: () => { setBodyPt(''); setBodyEn(''); } })}>Responder e resolver</Button></div></section>
        </CardContent></Card> : <Card><CardContent className="p-6 text-sm text-muted-foreground">Nenhum caso no filtro.</CardContent></Card>}
      </div>
      <Card><CardHeader><CardTitle>Contestações de leilão — fluxo nativo</CardTitle></CardHeader><CardContent className="space-y-2"><p className="text-sm text-muted-foreground">Não são duplicadas como caso genérico. Continue revisando pelo domínio de leilão.</p>{workspace.data?.auctionDisputes.map((dispute) => <Link key={dispute.id} href={`/dashboard/auctions/${dispute.auctionId}`} className="flex justify-between rounded-md border border-white/10 p-3 text-sm hover:border-primary/35"><span>{dispute.player?.nickname ?? dispute.playerId} · {dispute.auction?.itemName ?? dispute.auctionId}</span><Badge tone={dispute.status === 'PENDING' ? 'gold' : dispute.status === 'ACCEPTED' ? 'green' : 'red'}>{dispute.status}</Badge></Link>)}</CardContent></Card>
    </div>
  );
}
