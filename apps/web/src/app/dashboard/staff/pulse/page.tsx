"use client";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { notifyToast } from "@/components/ui/toaster";
import {
  useCreateGuildPulse,
  useGuildPulseStaff,
  useModerateGuildPulse,
  useSetGuildPulseStatus,
} from "@/hooks/use-guild-pulse-api";
export default function StaffPulsePage() {
  const workspace = useGuildPulseStaff();
  const create = useCreateGuildPulse();
  const status = useSetGuildPulseStatus();
  const moderate = useModerateGuildPulse();
  const [draft, setDraft] = useState({
    titlePt: "Pulso mensal G3X",
    titleEn: "G3X monthly pulse",
    opensAt: "",
    closesAt: "",
    minGroupSize: 5,
    openTextDays: 30,
  });
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase text-primary">Saude da guilda</p>
        <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">
          Pulso anonimo e voluntario
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Scores individuais nunca aparecem. Abaixo do grupo minimo, nem a media
          nem textos sao liberados. Pular nao gera consequencia.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Criar pulso em rascunho</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <Input
            value={draft.titlePt}
            onChange={(e) =>
              setDraft((x) => ({ ...x, titlePt: e.target.value }))
            }
          />
          <Input
            value={draft.titleEn}
            onChange={(e) =>
              setDraft((x) => ({ ...x, titleEn: e.target.value }))
            }
          />
          <Input
            type="datetime-local"
            value={draft.opensAt}
            onChange={(e) =>
              setDraft((x) => ({ ...x, opensAt: e.target.value }))
            }
          />
          <Input
            type="datetime-local"
            value={draft.closesAt}
            onChange={(e) =>
              setDraft((x) => ({ ...x, closesAt: e.target.value }))
            }
          />
          <Input
            type="number"
            min={3}
            max={50}
            value={draft.minGroupSize}
            onChange={(e) =>
              setDraft((x) => ({ ...x, minGroupSize: Number(e.target.value) }))
            }
          />
          <Input
            type="number"
            min={1}
            max={90}
            value={draft.openTextDays}
            onChange={(e) =>
              setDraft((x) => ({ ...x, openTextDays: Number(e.target.value) }))
            }
          />
          <Button
            disabled={create.isPending || !draft.opensAt || !draft.closesAt}
            onClick={() =>
              create.mutate({ ...draft, opensAt: new Date(draft.opensAt).toISOString(), closesAt: new Date(draft.closesAt).toISOString() }, {
                onSuccess: () =>
                  notifyToast({
                    title: "Pulso criado em rascunho.",
                    tone: "success",
                  }),
              })
            }
          >
            Criar rascunho
          </Button>
        </CardContent>
      </Card>
      {workspace.data?.cycles.map((entry) => (
        <Card key={entry.cycle.id}>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2">
              {entry.cycle.titlePt}
              <Badge tone={entry.aggregationAvailable ? "green" : "blue"}>
                {entry.cycle.status}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3 text-sm">
              <span>{entry.responseCount} respostas</span>
              <span>minimo {entry.minGroupSize}</span>
              {!entry.aggregationAvailable ? (
                <span>
                  faltam {entry.missingForAggregate}; agregado bloqueado
                </span>
              ) : null}
            </div>
            {entry.averages ? (
              <div className="grid gap-2 sm:grid-cols-5">
                {Object.entries(entry.averages).map(([key, value]) => (
                  <div key={key} className="rounded border border-white/10 p-2">
                    <p className="text-xs uppercase">{key}</p>
                    <p className="text-xl font-bold">
                      {Number(value).toFixed(1)}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="flex gap-2">
              {entry.cycle.status === "DRAFT" ? (
                <Button
                  onClick={() =>
                    status.mutate({ id: entry.cycle.id, status: "OPEN" })
                  }
                >
                  Publicar
                </Button>
              ) : null}
              {entry.cycle.status === "OPEN" ? (
                <Button
                  variant="secondary"
                  onClick={() =>
                    status.mutate({ id: entry.cycle.id, status: "CLOSED" })
                  }
                >
                  Fechar
                </Button>
              ) : null}
            </div>
            {entry.openTexts.map((text) => (
              <div key={text.id} className="rounded border border-white/10 p-3">
                <p className="text-sm">{text.openText}</p>
                <div className="mt-2 flex gap-2">
                  <Badge tone="gold">{text.moderationStatus}</Badge>
                  {text.moderationStatus === "PENDING" ? (
                    <>
                      <Button
                        onClick={() =>
                          moderate.mutate({ id: text.id, status: "APPROVED" })
                        }
                      >
                        Aprovar
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() =>
                          moderate.mutate({ id: text.id, status: "HIDDEN" })
                        }
                      >
                        Ocultar
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
