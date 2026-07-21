'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { notifyToast } from '@/components/ui/toaster';
import { useAddGuildCaseMessage, useCreateGuildCase, useMyGuildCases } from '@/hooks/use-guild-cases-api';
import { useLocaleStore } from '@/store/locale-store';
import type { GuildCase, GuildCaseCategory, GuildCaseSeverity } from '@/types/api';

const fieldClass = 'min-h-28 w-full rounded-md border border-white/10 bg-background/78 px-3 py-2 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-ring';

function CaseThread({ guildCase, english }: { guildCase: GuildCase; english: boolean }) {
  const [message, setMessage] = useState('');
  const addMessage = useAddGuildCaseMessage();
  const tone = guildCase.status === 'RESOLVED' || guildCase.status === 'CLOSED' ? 'green' : guildCase.severity === 'CRITICAL' || guildCase.severity === 'HIGH' ? 'red' : 'gold';
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><CardTitle>{guildCase.subject}</CardTitle><p className="mt-1 text-xs text-muted-foreground">{guildCase.category} · {new Date(guildCase.createdAt).toLocaleString()}</p></div>
          <div className="flex gap-2"><Badge tone={tone}>{guildCase.status}</Badge><Badge tone="blue">{guildCase.severity}</Badge></div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {guildCase.entries.map((entry) => (
            <div key={entry.id} className="rounded-md border border-white/10 bg-background/45 p-3 text-sm">
              <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground"><span>{entry.kind}</span><span>{new Date(entry.createdAt).toLocaleString()}</span></div>
              <p className="mt-2 whitespace-pre-wrap">{english ? entry.bodyEn ?? entry.bodyPt : entry.bodyPt ?? entry.bodyEn}</p>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <textarea className={fieldClass} value={message} onChange={(event) => setMessage(event.target.value)} placeholder={english ? 'Add private context for Staff' : 'Adicione contexto privado para a Staff'} />
          <Button disabled={addMessage.isPending || message.trim().length < 3} onClick={() => addMessage.mutate({ caseId: guildCase.id, message: message.trim() }, { onSuccess: () => { setMessage(''); notifyToast({ title: english ? 'Message sent.' : 'Mensagem enviada.', tone: 'success' }); } })}>
            {english ? 'Send message' : 'Enviar mensagem'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function GuildCasesPage() {
  const english = useLocaleStore((state) => state.locale) === 'en';
  const cases = useMyGuildCases();
  const create = useCreateGuildCase();
  const [category, setCategory] = useState<GuildCaseCategory>('QUESTION');
  const [severity, setSeverity] = useState<GuildCaseSeverity>('MEDIUM');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');

  function submit() {
    create.mutate({ category, severity, subject: subject.trim(), description: description.trim() }, {
      onSuccess: () => { setSubject(''); setDescription(''); notifyToast({ title: english ? 'Private case created.' : 'Caso privado criado.', tone: 'success' }); },
      onError: () => notifyToast({ title: english ? 'Could not create the case.' : 'Não foi possível criar o caso.', tone: 'error' }),
    });
  }

  return (
    <div className="space-y-6">
      <div><p className="text-sm uppercase text-primary">{english ? 'Private channel' : 'Canal privado'}</p><h1 className="font-[var(--font-cinzel)] text-3xl font-bold">{english ? 'Questions, reports, and appeals' : 'Dúvidas, denúncias e recursos'}</h1><p className="mt-2 max-w-3xl text-sm text-muted-foreground">{english ? 'Only you and authorized Staff see this thread. Auction disputes remain inside their auction page.' : 'Somente você e a Staff autorizada veem esta conversa. Contestação de leilão continua dentro da página do próprio leilão.'}</p></div>
      <Card>
        <CardHeader><CardTitle>{english ? 'Open a private case' : 'Abrir caso privado'}</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <Select value={category} onChange={(event) => setCategory(event.target.value as GuildCaseCategory)}><option value="QUESTION">{english ? 'Question' : 'Dúvida'}</option><option value="OPERATIONAL_REPORT">{english ? 'Operational report' : 'Denúncia operacional'}</option><option value="APPEAL">{english ? 'Appeal' : 'Recurso'}</option></Select>
          <Select value={severity} onChange={(event) => setSeverity(event.target.value as GuildCaseSeverity)}><option value="LOW">LOW</option><option value="MEDIUM">MEDIUM</option><option value="HIGH">HIGH</option><option value="CRITICAL">CRITICAL</option></Select>
          <Input className="md:col-span-2" value={subject} onChange={(event) => setSubject(event.target.value)} placeholder={english ? 'Short subject' : 'Assunto curto'} />
          <textarea className={`${fieldClass} md:col-span-2`} value={description} onChange={(event) => setDescription(event.target.value)} placeholder={english ? 'Describe facts, dates, and the outcome you need.' : 'Descreva fatos, datas e o resultado que você precisa.'} />
          <div className="md:col-span-2"><Button disabled={create.isPending || subject.trim().length < 5 || description.trim().length < 12} onClick={submit}>{english ? 'Create private case' : 'Criar caso privado'}</Button></div>
        </CardContent>
      </Card>
      <div className="space-y-4">{cases.data?.map((guildCase) => <CaseThread key={guildCase.id} guildCase={guildCase} english={english} />)}{cases.data?.length === 0 ? <p className="text-sm text-muted-foreground">{english ? 'No private cases yet.' : 'Nenhum caso privado ainda.'}</p> : null}</div>
    </div>
  );
}
