"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { notifyToast } from "@/components/ui/toaster";
import {
  useCaptureProductValidationWeek,
  useCreateProductValidationInterview,
  useProductValidation,
} from "@/hooks/use-staff-operations-api";
import type {
  ProductValidationAbsenceVisibility,
  ProductValidationInterviewProfile,
} from "@/types/api";

const fronts = [
  ["Prelúdio · Cobranças diretas", "IMPLEMENTADO", "Build, role, status 21d, presença 15d, disponibilidade e Codex.", "/dashboard/staff/players"],
  ["Frente 0 · Validação G3X", "PARCIAL", "Entrevistas e quatro semanas de baseline real ainda precisam ser coletadas.", "#validacao"],
  ["Frente 1 · Compromissos", "IMPLEMENTADO", "RSVP, ausências, recorrência, reserva, composição e no-show.", "/dashboard/admin/events"],
  ["Frente 2 · Governança", "IMPLEMENTADO", "Política versionada, ciência e casos privados.", "/dashboard/staff/rules"],
  ["Frente 3 · Entrada", "IMPLEMENTADO", "Onboarding, trial transparente e mentoria.", "/dashboard/staff/onboarding"],
  ["Frente 4 · Saúde segura", "IMPLEMENTADO", "Pulso anônimo, sinais explicáveis e saúde da liderança.", "/dashboard/staff/guild-health"],
  ["Frente 5 · Continuidade Staff", "IMPLEMENTADO", "Fila, cobertura e automação segura com dry-run e kill switch.", "/dashboard/staff/automations"],
  ["Frente 6 · Playbooks", "IMPLEMENTADO", "Versões imutáveis, lições de after-action e leitura por papel.", "/dashboard/staff/playbooks"],
  ["Frente 7 · Comunicação", "IMPLEMENTADO", "Canais, quiet hours, digest e ações Discord espelhadas.", "/dashboard/communications"],
  ["Frente 8 · Campanhas", "FUTURO", "Só entra quando existir uma campanha real e política aprovada.", "#"],
  ["Frente 9 · Confiabilidade", "IMPLEMENTADO", "Validação forte, telemetria agregada, E2E, runbooks e retenção.", "/dashboard/staff"],
] as const;

const profiles: Array<[ProductValidationInterviewProfile, string]> = [
  ["STAFF_LEADERSHIP", "Staff · liderança"],
  ["STAFF_EVENTS", "Staff · eventos"],
  ["STAFF_LOOT", "Staff · loot"],
  ["PLAYER_VETERAN", "Player · veterano"],
  ["PLAYER_NEW", "Player · novato"],
  ["PLAYER_ACTIVE", "Player · ativo"],
  ["PLAYER_LOW_ACTIVITY", "Player · baixa atividade"],
];
const channels = ["DISCORD", "WEB", "WHATSAPP", "VOICE", "OTHER"];
const absenceOptions: Array<[ProductValidationAbsenceVisibility, string]> = [
  ["PUBLIC", "Pode ser público"],
  ["STAFF_ONLY", "Somente Staff"],
  ["ANONYMOUS", "Apenas anônimo"],
  ["DEPENDS_ON_REASON", "Depende do motivo"],
];
const labelFor = (profile: ProductValidationInterviewProfile) =>
  profiles.find(([value]) => value === profile)?.[1] ?? profile;

export default function StaffRoadmapPage() {
  const workspace = useProductValidation();
  const createInterview = useCreateProductValidationInterview();
  const captureWeek = useCaptureProductValidationWeek();
  const [profile, setProfile] = useState<ProductValidationInterviewProfile>("STAFF_LEADERSHIP");
  const [selectedChannels, setSelectedChannels] = useState<string[]>(["DISCORD"]);
  const [absenceVisibility, setAbsenceVisibility] = useState<ProductValidationAbsenceVisibility>("STAFF_ONLY");
  const [rsvpHelps, setRsvpHelps] = useState(true);
  const [summary, setSummary] = useState("");
  const [interviewedAt, setInterviewedAt] = useState("");
  const [weekStart, setWeekStart] = useState("");
  const [expectedAttendance, setExpectedAttendance] = useState("");
  const [staffMinutes, setStaffMinutes] = useState("");
  const [weekNote, setWeekNote] = useState("");
  const gate = workspace.data?.gate;

  const submitInterview = () => {
    if (!interviewedAt || summary.trim().length < 10 || selectedChannels.length === 0) return;
    createInterview.mutate(
      {
        profile,
        channels: selectedChannels,
        absenceVisibility,
        rsvpWouldReduceManualCharge: rsvpHelps,
        summary,
        interviewedAt: new Date(interviewedAt).toISOString(),
      },
      {
        onSuccess: () => {
          setSummary("");
          notifyToast({ title: "Entrevista registrada.", tone: "success" });
        },
      },
    );
  };

  const submitWeek = () => {
    if (!weekStart || staffMinutes === "") return;
    captureWeek.mutate(
      {
        weekStart,
        staffConfirmationMinutes: Number(staffMinutes),
        expectedAttendance: expectedAttendance === "" ? undefined : Number(expectedAttendance),
        note: weekNote || undefined,
      },
      {
        onSuccess: () => {
          setWeekStart("");
          setExpectedAttendance("");
          setStaffMinutes("");
          setWeekNote("");
          notifyToast({ title: "Semana congelada com a telemetria do ERP.", tone: "success" });
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase text-primary">Roadmap visível</p>
        <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">Guild Operating System 2026-07</h1>
        <p className="mt-2 max-w-4xl text-sm text-muted-foreground">
          Painel Staff para revisar as entregas da release 2026-07-21 e coletar a evidência real da Frente 0. Entrevistas e quatro semanas consecutivas continuam pendentes até a validação da Staff.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {fronts.map(([title, status, detail, href]) => (
          <Card key={title}>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center justify-between gap-2">
                {title}
                <Badge tone={status === "IMPLEMENTADO" ? "green" : status === "PARCIAL" ? "gold" : "blue"}>{status}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{detail}</p>
              {href !== "#" ? <Link className="mt-3 inline-block text-sm font-semibold text-primary" href={href}>Abrir evidência no ERP</Link> : null}
            </CardContent>
          </Card>
        ))}
      </div>

      <section id="validacao" className="space-y-4">
        <Card>
          <CardHeader><CardTitle>Gate da Frente 0 · evidência, não feeling</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <Gate label="Perfis Staff" ready={gate?.staffProfilesCovered.length === 3} value={`${gate?.staffProfilesCovered.length ?? 0}/3`} />
              <Gate label="Entrevistas de players" ready={gate?.interviewsReady ?? false} value={`${gate?.playerInterviewCount ?? 0}/5 mín.`} />
              <Gate label="Semanas consecutivas" ready={gate?.baselineReady ?? false} value={`${gate?.consecutiveWeeks ?? 0}/4`} />
            </div>
            <p className="text-sm text-muted-foreground">
              RSVP reduz uma cobrança manual real: <strong>{gate?.rsvpValidated ? "confirmado por ao menos uma entrevista" : "ainda não confirmado"}</strong>. O ERP não guarda nome do entrevistado nem conteúdo privado de voz/DM.
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Registrar entrevista anonimizada</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Select value={profile} onChange={(event) => setProfile(event.target.value as ProductValidationInterviewProfile)}>
                {profiles.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </Select>
              <div>
                <p className="mb-2 text-sm font-medium">Canais que este perfil realmente acompanha</p>
                <div className="flex flex-wrap gap-3">
                  {channels.map((channel) => <label key={channel} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={selectedChannels.includes(channel)} onChange={(event) => setSelectedChannels((current) => event.target.checked ? [...new Set([...current, channel])] : current.filter((item) => item !== channel))} />{channel}</label>)}
                </div>
              </div>
              <Select value={absenceVisibility} onChange={(event) => setAbsenceVisibility(event.target.value as ProductValidationAbsenceVisibility)}>
                {absenceOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </Select>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={rsvpHelps} onChange={(event) => setRsvpHelps(event.target.checked)} />RSVP reduziria cobrança manual real</label>
              <Input type="datetime-local" value={interviewedAt} onChange={(event) => setInterviewedAt(event.target.value)} />
              <textarea className="min-h-28 w-full rounded-md border border-white/10 bg-background p-3 text-sm" maxLength={1000} value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="Síntese operacional, sem nome, trechos de DM ou conteúdo privado de voz." />
              <Button disabled={createInterview.isPending || !interviewedAt || summary.trim().length < 10 || selectedChannels.length === 0} onClick={submitInterview}>Registrar evidência</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Congelar uma semana encerrada</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">Eventos, presença real, no-shows, recruits com primeira atividade e tarefas sem substituto vêm automaticamente. Informe apenas o que o ERP não observa.</p>
              <Input type="date" value={weekStart} onChange={(event) => setWeekStart(event.target.value)} />
              <p className="text-xs text-muted-foreground">Escolha a segunda-feira inicial em America/Sao_Paulo. O período precisa estar totalmente encerrado.</p>
              <Input type="number" min={0} value={expectedAttendance} onChange={(event) => setExpectedAttendance(event.target.value)} placeholder="Presenças esperadas na semana (se conhecidas)" />
              <Input type="number" min={0} value={staffMinutes} onChange={(event) => setStaffMinutes(event.target.value)} placeholder="Minutos Staff cobrando confirmações" />
              <textarea className="min-h-24 w-full rounded-md border border-white/10 bg-background p-3 text-sm" maxLength={500} value={weekNote} onChange={(event) => setWeekNote(event.target.value)} placeholder="Contexto operacional opcional; não cole conversas privadas." />
              <Button disabled={captureWeek.isPending || !weekStart || staffMinutes === ""} onClick={submitWeek}>Congelar baseline</Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Evidência coletada</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div>
              <p className="font-semibold">Entrevistas ({workspace.data?.interviews.length ?? 0})</p>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                {workspace.data?.interviews.map((interview) => <div key={interview.id} className="rounded border border-white/10 p-3 text-sm"><div className="flex flex-wrap gap-2"><Badge tone="blue">{labelFor(interview.profile)}</Badge><span>{new Date(interview.interviewedAt).toLocaleDateString("pt-BR")}</span></div><p className="mt-2">{interview.summary}</p><p className="mt-2 text-xs text-muted-foreground">Canais: {interview.channels.join(", ")} · ausência: {interview.absenceVisibility}</p></div>)}
                {!workspace.data?.interviews.length ? <p className="text-sm text-muted-foreground">Nenhuma entrevista registrada ainda.</p> : null}
              </div>
            </div>
            <div>
              <p className="font-semibold">Semanas congeladas ({workspace.data?.weeks.length ?? 0})</p>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-left text-sm"><thead><tr className="border-b border-white/10"><th className="p-2">Semana</th><th className="p-2">Eventos</th><th className="p-2">Esperada / real</th><th className="p-2">No-show</th><th className="p-2">Cobrança</th><th className="p-2">Recruits ativos</th><th className="p-2">Pessoa única</th></tr></thead><tbody>{workspace.data?.weeks.map((week) => <tr key={week.id} className="border-b border-white/5"><td className="p-2">{new Date(week.weekStart).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</td><td className="p-2">{week.eventsCreated}</td><td className="p-2">{week.expectedAttendance ?? "?"} / {week.actualAttendance}</td><td className="p-2">{week.noShows}</td><td className="p-2">{week.staffConfirmationMinutes} min</td><td className="p-2">{week.recruitsWithActivity}/{week.recruitsConverted}</td><td className="p-2">{week.singlePersonTasks}</td></tr>)}</tbody></table>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function Gate({ label, ready, value }: { label: string; ready: boolean; value: string }) {
  return <div className="rounded border border-white/10 p-3"><div className="flex items-center justify-between gap-2"><span className="text-sm font-semibold">{label}</span><Badge tone={ready ? "green" : "gold"}>{ready ? "OK" : "PENDENTE"}</Badge></div><p className="mt-2 text-2xl font-bold">{value}</p></div>;
}
