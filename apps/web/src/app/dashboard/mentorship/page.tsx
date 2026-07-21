"use client";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { notifyToast } from "@/components/ui/toaster";
import {
  useMentorship,
  useRequestMentorshipHelp,
  useUpdateMentorProfile,
} from "@/hooks/use-mentorship-api";
import { useLocaleStore } from "@/store/locale-store";
import type { MentorshipHelpTopic } from "@/types/api";
const topics: MentorshipHelpTopic[] = [
  "BOSS",
  "BUILD",
  "ROLE",
  "EVENTS",
  "REQUESTS",
  "INTERESTS",
  "WAR_ROOM",
  "OTHER",
];
export default function MentorshipPage() {
  const english = useLocaleStore((s) => s.locale) === "en";
  const data = useMentorship();
  const profile = useUpdateMentorProfile();
  const help = useRequestMentorshipHelp();
  const [topic, setTopic] = useState<MentorshipHelpTopic>("BOSS");
  const [body, setBody] = useState("");
  const [available, setAvailable] = useState(false);
  const assignment = data.data?.asMentee.find((x) => x.status === "ACTIVE");
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase text-primary">
          {english ? "Welcome network" : "Rede de acolhimento"}
        </p>
        <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">
          {english
            ? "Mentorship and first milestones"
            : "Mentoria e primeiros marcos"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {english
            ? "Ask for help without hunting for a private DM. Milestones are dates, never points."
            : "Peca ajuda sem cacar DM privado. Marcos sao datas, nunca pontos."}
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>
            {english ? "Your welcome contact" : "Seu contato de acolhimento"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {assignment ? (
            <p>{assignment.mentor?.nickname ?? assignment.groupName}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {english
                ? "No active assignment yet."
                : "Nenhuma associacao ativa ainda."}
            </p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{english ? "Ask for help" : "Pedir ajuda"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select
            value={topic}
            onChange={(e) => setTopic(e.target.value as MentorshipHelpTopic)}
          >
            {topics.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </Select>
          <Input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={
              english
                ? "Optional context — no DM needed"
                : "Contexto opcional — sem DM"
            }
          />
          <Button
            disabled={help.isPending}
            onClick={() =>
              help.mutate(
                { topic, body },
                {
                  onSuccess: () => {
                    setBody("");
                    notifyToast({
                      title: english ? "Help requested." : "Ajuda solicitada.",
                      tone: "success",
                    });
                  },
                },
              )
            }
          >
            {english ? "Send request" : "Enviar pedido"}
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>
            {english
              ? "First activity milestones"
              : "Marcos de primeira atividade"}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          {data.data?.milestones.map((m) => (
            <div
              key={m.key}
              className="flex items-center justify-between rounded-md border border-white/10 p-3"
            >
              <span>{m.key}</span>
              <Badge tone={m.achievedAt ? "green" : "blue"}>
                {m.achievedAt
                  ? new Date(m.achievedAt).toLocaleDateString()
                  : english
                    ? "Not yet"
                    : "Ainda nao"}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>
            {english ? "Volunteer as a mentor" : "Ser mentor voluntario"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={available}
              onChange={(e) => setAvailable(e.target.checked)}
            />
            {english
              ? "I voluntarily accept assignments"
              : "Aceito associacoes voluntariamente"}
          </label>
          <Button
            disabled={profile.isPending}
            onClick={() =>
              profile.mutate(
                { isAvailable: available, topics, roles: [] },
                {
                  onSuccess: () =>
                    notifyToast({
                      title: english
                        ? "Preference saved."
                        : "Preferencia salva.",
                      tone: "success",
                    }),
                },
              )
            }
          >
            {english ? "Save volunteer status" : "Salvar voluntariado"}
          </Button>
          <p className="text-xs text-muted-foreground">
            {english
              ? "Mentors receive no disciplinary power and no Staff notes."
              : "Mentores nao recebem poder disciplinar nem notas Staff."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
