"use client";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { notifyToast } from "@/components/ui/toaster";
import {
  useGuildPulseMine,
  useSkipGuildPulse,
  useSubmitGuildPulse,
} from "@/hooks/use-guild-pulse-api";
import { useLocaleStore } from "@/store/locale-store";
const questions = [
  ["belonging", "Pertencimento", "Belonging"],
  ["clarity", "Clareza", "Clarity"],
  ["workload", "Carga", "Workload"],
  ["fun", "Diversao", "Fun"],
  ["helpSafety", "Seguranca para pedir ajuda", "Safety asking for help"],
] as const;
export default function PulsePage() {
  const english = useLocaleStore((s) => s.locale) === "en";
  const workspace = useGuildPulseMine();
  const submit = useSubmitGuildPulse();
  const skip = useSkipGuildPulse();
  const [scores, setScores] = useState({
    belonging: 3,
    clarity: 3,
    workload: 3,
    fun: 3,
    helpSafety: 3,
  });
  const [openText, setText] = useState("");
  const cycle = workspace.data?.cycle;
  const done = workspace.data?.participation?.status === "SUBMITTED";
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase text-primary">
          {english ? "Optional guild pulse" : "Pulso opcional da guilda"}
        </p>
        <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">
          {english ? "How is the journey going?" : "Como esta a jornada?"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {english
            ? "Your scores are stored without your player identity. Staff only sees aggregates after the minimum group size."
            : "Suas notas sao armazenadas sem sua identidade de player. A Staff so ve agregado depois do grupo minimo."}
        </p>
      </div>
      {!cycle ? (
        <Card>
          <CardContent className="p-6">
            {english
              ? "No open pulse right now."
              : "Nenhum pulso aberto agora."}
          </CardContent>
        </Card>
      ) : done ? (
        <Card>
          <CardContent className="p-6">
            <Badge tone="green">
              {english ? "Submitted anonymously" : "Enviado anonimamente"}
            </Badge>
            <p className="mt-2 text-sm text-muted-foreground">
              {english
                ? "Thank you. There is no score, loot effect, or automatic consequence."
                : "Obrigado. Nao existe score, efeito em loot ou consequencia automatica."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{english ? cycle.titleEn : cycle.titlePt}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {questions.map(([key, pt, en]) => (
              <label key={key} className="grid gap-2 sm:grid-cols-[1fr_120px]">
                <span>{english ? en : pt}</span>
                <Select
                  value={scores[key]}
                  onChange={(e) =>
                    setScores((x) => ({ ...x, [key]: Number(e.target.value) }))
                  }
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </Select>
              </label>
            ))}
            <textarea
              className="min-h-24 w-full rounded-md border border-white/10 bg-background p-3 text-sm"
              value={openText}
              onChange={(e) => setText(e.target.value)}
              maxLength={1000}
              placeholder={
                english
                  ? "Optional open comment; moderated and deleted after the retention period."
                  : "Comentario aberto opcional; moderado e apagado apos a retencao."
              }
            />
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={submit.isPending}
                onClick={() =>
                  submit.mutate(
                    { id: cycle.id, ...scores, openText },
                    {
                      onSuccess: () =>
                        notifyToast({
                          title: english
                            ? "Pulse submitted anonymously."
                            : "Pulso enviado anonimamente.",
                          tone: "success",
                        }),
                    },
                  )
                }
              >
                {english ? "Submit anonymously" : "Enviar anonimamente"}
              </Button>
              <Button
                variant="secondary"
                disabled={skip.isPending}
                onClick={() =>
                  skip.mutate(cycle.id, {
                    onSuccess: () =>
                      notifyToast({
                        title: english
                          ? "Skipped without consequences."
                          : "Pulado sem consequencias.",
                        tone: "success",
                      }),
                  })
                }
              >
                {english
                  ? "Skip without consequences"
                  : "Pular sem consequencias"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {english
                ? `Minimum aggregate: ${cycle.minGroupSize}. Open text retention: ${cycle.openTextDays} days.`
                : `Agregado minimo: ${cycle.minGroupSize}. Retencao do texto: ${cycle.openTextDays} dias.`}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
