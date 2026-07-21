"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { notifyToast } from "@/components/ui/toaster";
import {
  useCommunicationTest,
  useCommunications,
  usePersonalDigest,
  useUpdateCommunications,
} from "@/hooks/use-communications-api";
import type {
  CommunicationChannel,
  CommunicationPreference,
  DigestCadence,
} from "@/types/api";
const channels: CommunicationChannel[] = ["WEB", "DISCORD", "BOTH", "NONE"];
const labels: Array<[keyof CommunicationPreference, string]> = [
  ["eventChannel", "Eventos"],
  ["ownLootChannel", "Meu loot"],
  ["requestChannel", "Requests"],
  ["progressChannel", "Progresso"],
  ["announcementChannel", "Comunicados"],
  ["reminderChannel", "Lembretes e digest"],
];
export default function CommunicationsPage() {
  const query = useCommunications();
  const digest = usePersonalDigest();
  const update = useUpdateCommunications();
  const test = useCommunicationTest();
  const [pref, setPref] = useState<CommunicationPreference | null>(null);
  useEffect(() => {
    if (query.data?.preference) setPref(query.data.preference);
  }, [query.data]);
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase text-primary">Comunicacao adaptativa</p>
        <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">
          Canais, horario silencioso e resumo
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          O site continua sendo a fonte de verdade. Alertas criticos
          explicitamente classificados podem furar o horario silencioso.
        </p>
      </div>
      {pref ? (
        <Card>
          <CardHeader>
            <CardTitle>Minhas preferencias</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {labels.map(([key, label]) => (
              <label key={String(key)} className="space-y-1 text-sm">
                <span>{label}</span>
                <Select
                  value={String(pref[key])}
                  onChange={(e) =>
                    setPref({
                      ...pref,
                      [key]: e.target.value as CommunicationChannel,
                    })
                  }
                >
                  {channels.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </Select>
              </label>
            ))}
            <Input
              value={pref.timezone}
              onChange={(e) => setPref({ ...pref, timezone: e.target.value })}
              placeholder="Timezone IANA"
            />
            <Select
              value={pref.digestCadence}
              onChange={(e) =>
                setPref({
                  ...pref,
                  digestCadence: e.target.value as DigestCadence,
                })
              }
            >
              {["DAILY", "WEEKLY", "NONE"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </Select>
            <Input
              type="time"
              value={pref.quietStartsAt ?? ""}
              onChange={(e) =>
                setPref({ ...pref, quietStartsAt: e.target.value || null })
              }
            />
            <Input
              type="time"
              value={pref.quietEndsAt ?? ""}
              onChange={(e) =>
                setPref({ ...pref, quietEndsAt: e.target.value || null })
              }
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={pref.criticalBypassesQuietHours}
                onChange={(e) =>
                  setPref({
                    ...pref,
                    criticalBypassesQuietHours: e.target.checked,
                  })
                }
              />
              Alertas criticos podem furar quiet hours
            </label>
            <div className="flex gap-2">
              <Button
                disabled={update.isPending}
                onClick={() =>
                  update.mutate(pref, {
                    onSuccess: () =>
                      notifyToast({
                        title: "Preferencias salvas.",
                        tone: "success",
                      }),
                  })
                }
              >
                Salvar
              </Button>
              <Button
                variant="secondary"
                disabled={test.isPending}
                onClick={() =>
                  test.mutate(undefined, {
                    onSuccess: () =>
                      notifyToast({
                        title: "Teste enviado nos canais escolhidos.",
                        tone: "success",
                      }),
                  })
                }
              >
                Testar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Meu digest acionavel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {digest.data?.items.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className="block rounded border border-white/10 p-3"
            >
              <strong>
                {item.title}
                {item.count > 1 ? ` · ${item.count} alteracoes` : ""}
              </strong>
              <p className="text-sm text-muted-foreground">{item.body}</p>
              {item.deadline ? (
                <p className="text-xs text-primary">
                  Prazo: {new Date(item.deadline).toLocaleString()}
                </p>
              ) : null}
            </Link>
          ))}
          {digest.data?.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nada pendente. Milagre raro, aproveite.
            </p>
          ) : null}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 text-sm">
          <strong>Acoes Discord espelhadas</strong>
          <p className="mt-1 text-muted-foreground">
            Quando o bot estiver configurado, use /erp-rsvp, /erp-ausencia,
            /erp-instrucao e /erp-regra. Eles chamam as mesmas regras do site,
            confirmam o estado salvo e devolvem a rota para revisao.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
