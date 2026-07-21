"use client";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { notifyToast } from "@/components/ui/toaster";
import {
  useAssignMentorship,
  useMentorshipStaff,
  useTriageMentorshipHelp,
} from "@/hooks/use-mentorship-api";
export default function StaffMentorshipPage() {
  const workspace = useMentorshipStaff();
  const assign = useAssignMentorship();
  const triage = useTriageMentorshipHelp();
  const [menteeId, setMentee] = useState("");
  const [mentorId, setMentor] = useState("");
  const [groupName, setGroup] = useState("");
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase text-primary">Mentoria Staff</p>
        <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">
          Voluntarios, acolhimento e pedidos de ajuda
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Associe somente mentores que deram consentimento ou um grupo de
          acolhimento. Mentor nao recebe poder disciplinar nem acesso a notas
          Staff.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase text-muted-foreground">
              Voluntarios disponiveis
            </p>
            <p className="text-2xl font-bold">
              {workspace.data?.volunteers.length ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase text-muted-foreground">
              Mentorias ativas
            </p>
            <p className="text-2xl font-bold">
              {workspace.data?.assignments.filter((x) => x.status === "ACTIVE")
                .length ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase text-muted-foreground">
              Pedidos abertos
            </p>
            <p className="text-2xl font-bold">
              {workspace.data?.helpRequests.filter((x) =>
                ["OPEN", "ASSIGNED"].includes(x.status),
              ).length ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Associar mentor voluntario ou grupo</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <Select value={menteeId} onChange={(e) => setMentee(e.target.value)}>
            <option value="">Player acolhido</option>
            {workspace.data?.players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nickname}
              </option>
            ))}
          </Select>
          <Select value={mentorId} onChange={(e) => setMentor(e.target.value)}>
            <option value="">Sem mentor individual</option>
            {workspace.data?.volunteers.map((v) => (
              <option key={v.playerId} value={v.playerId}>
                {v.player.nickname}
              </option>
            ))}
          </Select>
          <Input
            value={groupName}
            onChange={(e) => setGroup(e.target.value)}
            placeholder="Grupo de acolhimento (alternativo)"
          />
          <Button
            disabled={
              assign.isPending || !menteeId || (!mentorId && !groupName.trim())
            }
            onClick={() =>
              assign.mutate(
                {
                  menteeId,
                  mentorId: mentorId || undefined,
                  groupName: groupName || undefined,
                },
                {
                  onSuccess: () =>
                    notifyToast({
                      title: "Mentoria associada.",
                      tone: "success",
                    }),
                  onError: () =>
                    notifyToast({
                      title: "Nao foi possivel associar.",
                      tone: "error",
                    }),
                },
              )
            }
          >
            Associar
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Pedidos por conteudo/role</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {workspace.data?.helpRequests.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-white/10 p-3"
            >
              <div>
                <p className="font-semibold">
                  {r.requester?.nickname} · {r.topic}
                  {r.requestedRole ? ` · ${r.requestedRole}` : ""}
                </p>
                <p className="text-sm text-muted-foreground">
                  {r.body || "Sem contexto adicional"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={r.status === "RESOLVED" ? "green" : "gold"}>
                  {r.status}
                </Badge>
                {r.status === "OPEN"
                  ? workspace.data?.volunteers.map((v) => (
                      <Button
                        key={v.playerId}
                      variant="secondary"
                        disabled={triage.isPending}
                        onClick={() =>
                          triage.mutate({
                            id: r.id,
                            status: "ASSIGNED",
                            assignedMentorId: v.playerId,
                          })
                        }
                      >
                        Enviar a {v.player.nickname}
                      </Button>
                    ))
                  : null}
                {r.status === "ASSIGNED" ? (
                  <Button
                    disabled={triage.isPending}
                    onClick={() =>
                      triage.mutate({
                        id: r.id,
                        status: "RESOLVED",
                        assignedMentorId: r.assignedMentorId ?? undefined,
                      })
                    }
                  >
                    Resolver
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
