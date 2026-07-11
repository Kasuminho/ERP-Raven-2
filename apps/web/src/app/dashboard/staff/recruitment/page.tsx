'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { notifyToast } from '@/components/ui/toaster';
import { useConvertRecruitmentApplication, useReviewRecruitmentApplication, useStaffRecruitmentApplications } from '@/hooks/use-recruitment-api';
import type { RecruitmentApplication, RecruitmentApplicationStatus } from '@/types/api';

type ReviewStatus = Exclude<RecruitmentApplicationStatus, 'PENDING' | 'CONVERTED'>;

export default function StaffRecruitmentPage() {
  const [status, setStatus] = useState<RecruitmentApplicationStatus | 'ALL'>('PENDING');
  const applications = useStaffRecruitmentApplications(status);
  const review = useReviewRecruitmentApplication(status);
  const convert = useConvertRecruitmentApplication(status);
  const [target, setTarget] = useState<{ application: RecruitmentApplication; status: ReviewStatus }>();
  const [convertTarget, setConvertTarget] = useState<RecruitmentApplication>();
  const [note, setNote] = useState('');
  const [conversion, setConversion] = useState({ userId: '', nickname: '', onboardingNote: '' });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm uppercase text-primary">Staff</p>
          <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">Recrutamento</h1>
        </div>
        <Select value={status} onChange={(event) => setStatus(event.target.value as RecruitmentApplicationStatus | 'ALL')}>
          {['PENDING', 'TRIAGE', 'ACCEPTED', 'REJECTED', 'CONVERTED', 'ARCHIVED', 'ALL'].map((value) => <option key={value}>{value}</option>)}
        </Select>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {(applications.data ?? []).map((application) => (
          <Card key={application.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle>{application.nickname}</CardTitle>
                <Badge tone={application.status === 'PENDING' || application.status === 'TRIAGE' ? 'gold' : application.status === 'ACCEPTED' || application.status === 'CONVERTED' ? 'green' : 'red'}>{application.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">{application.playerClass} - L{application.dimensionalLayer} - CP {application.combatPower.toLocaleString('pt-BR')}</p>
              <p className="rounded-md border bg-background/35 p-3">{application.experience}</p>
              <p className="text-xs text-muted-foreground">Disponibilidade: {application.availability}</p>
              <p className="text-xs text-muted-foreground">Foco: {application.focus}</p>
              {application.notes ? <p className="text-xs text-muted-foreground">Notas: {application.notes}</p> : null}
              {application.status === 'CONVERTED' && application.convertedPlayer ? (
                <p className="text-xs text-emerald-300">Convertido em player: {application.convertedPlayer.nickname}</p>
              ) : null}
              {application.status === 'PENDING' || application.status === 'TRIAGE' ? (
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" disabled={review.isPending} onClick={() => { setNote(''); setTarget({ application, status: 'TRIAGE' }); }}>Triagem</Button>
                  <Button disabled={review.isPending} onClick={() => { setNote(''); setTarget({ application, status: 'ACCEPTED' }); }}>Aceitar</Button>
                  <Button variant="danger" disabled={review.isPending} onClick={() => { setNote(''); setTarget({ application, status: 'REJECTED' }); }}>Rejeitar</Button>
                </div>
              ) : null}
              {application.status === 'ACCEPTED' ? (
                <div className="flex flex-wrap gap-2">
                  <Button disabled={convert.isPending} onClick={() => {
                    setConversion({ userId: '', nickname: application.nickname, onboardingNote: '' });
                    setConvertTarget(application);
                  }}>Converter</Button>
                  <Button variant="secondary" disabled={review.isPending} onClick={() => { setNote(''); setTarget({ application, status: 'ARCHIVED' }); }}>Arquivar</Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>

      <ConfirmationDialog
        open={Boolean(target)}
        title={target?.status === 'ACCEPTED' ? 'Aceitar candidatura?' : 'Rejeitar candidatura?'}
        description="A decisao fica auditada; criar player/roles continua manual."
        confirmLabel={target?.status === 'ACCEPTED' ? 'Aceitar' : 'Rejeitar'}
        pending={review.isPending}
        tone={target?.status === 'ACCEPTED' ? 'primary' : 'danger'}
        onClose={() => setTarget(undefined)}
        onConfirm={() => {
          if (!target || note.trim().length < 3) return;
          review.mutate({ applicationId: target.application.id, status: target.status, reviewNote: note.trim() }, {
            onSuccess: () => {
              setTarget(undefined);
              notifyToast({ title: 'Candidatura revisada.', tone: 'success' });
            },
          });
        }}
      >
        <Input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Nota obrigatoria" />
      </ConfirmationDialog>

      <ConfirmationDialog
        open={Boolean(convertTarget)}
        title="Converter em player?"
        description="Informe o userId do usuario Discord ja sincronizado. O sistema cria player, perfil inicial e nota de onboarding."
        confirmLabel="Converter"
        pending={convert.isPending}
        onClose={() => setConvertTarget(undefined)}
        onConfirm={() => {
          if (!convertTarget || conversion.userId.trim().length < 1 || conversion.onboardingNote.trim().length < 3) return;
          convert.mutate({
            applicationId: convertTarget.id,
            userId: conversion.userId.trim(),
            nickname: conversion.nickname.trim() || undefined,
            onboardingNote: conversion.onboardingNote.trim(),
          }, {
            onSuccess: () => {
              setConvertTarget(undefined);
              notifyToast({ title: 'Candidatura convertida em player.', tone: 'success' });
            },
          });
        }}
      >
        <div className="space-y-3">
          <Input value={conversion.userId} onChange={(event) => setConversion((current) => ({ ...current, userId: event.target.value }))} placeholder="User ID" />
          <Input value={conversion.nickname} onChange={(event) => setConversion((current) => ({ ...current, nickname: event.target.value }))} placeholder="Nick do player" />
          <Input value={conversion.onboardingNote} onChange={(event) => setConversion((current) => ({ ...current, onboardingNote: event.target.value }))} placeholder="Nota de onboarding" />
        </div>
      </ConfirmationDialog>
    </div>
  );
}
