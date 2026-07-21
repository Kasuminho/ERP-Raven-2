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
  type StaffTaskDraft,
  useCreateStaffTask,
  useStaffTaskHandoff,
  useStaffTasks,
  useUpdateStaffTask,
} from "@/hooks/use-staff-tasks-api";
import type {
  LeadershipArea,
  StaffTaskPriority,
  StaffTaskStatus,
} from "@/types/api";
const areas: LeadershipArea[] = [
  "EVENTS",
  "LOOT",
  "RECRUITMENT",
  "DISCORD",
  "DEPLOY",
  "TREASURY",
  "PLAYER_CARE",
];
export default function StaffTasksPage() {
  const workspace = useStaffTasks();
  const create = useCreateStaffTask();
  const update = useUpdateStaffTask();
  const handoff = useStaffTaskHandoff();
  const [draft, setDraft] = useState<StaffTaskDraft>({
    title: "",
    description: "",
    area: "EVENTS",
    priority: "MEDIUM",
    href: "/dashboard/staff",
  });
  const [handoffTask, setHandoffTask] = useState("");
  const [context, setContext] = useState("");
  const [nextStep, setNext] = useState("");
  const [toOwner, setToOwner] = useState("");
  function submit(body: StaffTaskDraft) {
    create.mutate(
      {
        ...body,
        dueAt: body.dueAt ? new Date(body.dueAt).toISOString() : undefined,
      },
      {
        onSuccess: () => {
          notifyToast({
            title: "Tarefa criada por confirmacao.",
            tone: "success",
          });
          setDraft({
            title: "",
            description: "",
            area: "EVENTS",
            priority: "MEDIUM",
            href: "/dashboard/staff",
          });
        },
      },
    );
  }
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase text-primary">Continuidade Staff</p>
        <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">
          Fila atribuivel e handoffs
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sugestoes do briefing, pauta e sinais so viram tarefa quando alguem
          confirma. Nada nasce automaticamente.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase">Abertas</p>
            <p className="text-2xl font-bold">
              {workspace.data?.counts.open ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase">Sem dono</p>
            <p className="text-2xl font-bold">
              {workspace.data?.counts.unowned ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase">Vencidas</p>
            <p className="text-2xl font-bold">
              {workspace.data?.counts.overdue ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Criar tarefa manual</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <Input
            value={draft.title}
            onChange={(e) => setDraft((x) => ({ ...x, title: e.target.value }))}
            placeholder="Titulo"
          />
          <Input
            value={draft.description}
            onChange={(e) =>
              setDraft((x) => ({ ...x, description: e.target.value }))
            }
            placeholder="Descricao"
          />
          <Select
            value={draft.area}
            onChange={(e) =>
              setDraft((x) => ({
                ...x,
                area: e.target.value as LeadershipArea,
              }))
            }
          >
            {areas.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </Select>
          <Select
            value={draft.priority}
            onChange={(e) =>
              setDraft((x) => ({
                ...x,
                priority: e.target.value as StaffTaskPriority,
              }))
            }
          >
            {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </Select>
          <Input
            value={draft.href}
            onChange={(e) => setDraft((x) => ({ ...x, href: e.target.value }))}
          />
          <Input
            type="datetime-local"
            value={draft.dueAt ?? ""}
            onChange={(e) =>
              setDraft((x) => ({
                ...x,
                dueAt: e.target.value || undefined,
              }))
            }
          />
          <Button
            disabled={
              create.isPending ||
              draft.title.length < 3 ||
              draft.description.length < 3
            }
            onClick={() => submit(draft)}
          >
            Criar
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Sugestoes que exigem confirmacao</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {workspace.data?.suggestions.slice(0, 40).map((s) => (
            <div
              key={s.sourceKey}
              className="flex flex-wrap items-center justify-between gap-3 rounded border border-white/10 p-3"
            >
              <div>
                <p className="font-semibold">{s.title}</p>
                <p className="text-xs text-muted-foreground">
                  {s.sourceType} · {s.area}
                </p>
              </div>
              <Button disabled={create.isPending} onClick={() => submit(s)}>
                Converter em tarefa
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
      {workspace.data?.tasks.map((task) => (
        <Card key={task.id}>
          <CardHeader>
            <CardTitle className="flex flex-wrap gap-2">
              {task.title}
              <Badge
                tone={
                  task.status === "DONE"
                    ? "green"
                    : task.status === "BLOCKED"
                      ? "red"
                      : "gold"
                }
              >
                {task.status}
              </Badge>
              <Badge tone="blue">{task.area}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">{task.description}</p>
            <div className="grid gap-2 md:grid-cols-3">
              <Select
                value={task.ownerId ?? ""}
                onChange={(e) =>
                  update.mutate({ id: task.id, ownerId: e.target.value })
                }
              >
                <option value="">Sem dono</option>
                {workspace.data?.assignees.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.discordNickname || x.discordUsername}
                  </option>
                ))}
              </Select>
              <Select
                value={task.substituteId ?? ""}
                onChange={(e) =>
                  update.mutate({ id: task.id, substituteId: e.target.value })
                }
              >
                <option value="">Sem substituto</option>
                {workspace.data?.assignees.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.discordNickname || x.discordUsername}
                  </option>
                ))}
              </Select>
              <Select
                value={task.status}
                onChange={(e) =>
                  update.mutate({
                    id: task.id,
                    status: e.target.value as StaffTaskStatus,
                  })
                }
              >
                {["OPEN", "IN_PROGRESS", "BLOCKED", "DONE", "CANCELLED"].map(
                  (x) => (
                    <option key={x}>{x}</option>
                  ),
                )}
              </Select>
            </div>
            <div className="flex gap-3">
              <Link
                className="text-sm font-semibold text-primary"
                href={task.href}
              >
                Abrir objeto
              </Link>
              <Button
                variant="secondary"
                onClick={() => setHandoffTask(task.id)}
              >
                Registrar handoff
              </Button>
            </div>
            {handoffTask === task.id ? (
              <div className="grid gap-2 rounded border border-white/10 p-3 md:grid-cols-2">
                <Input
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="Contexto final"
                />
                <Input
                  value={nextStep}
                  onChange={(e) => setNext(e.target.value)}
                  placeholder="Proximo passo"
                />
                <Select
                  value={toOwner}
                  onChange={(e) => setToOwner(e.target.value)}
                >
                  <option value="">Manter dono</option>
                  {workspace.data?.assignees.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.discordNickname || x.discordUsername}
                    </option>
                  ))}
                </Select>
                <Button
                  disabled={
                    handoff.isPending ||
                    context.length < 3 ||
                    nextStep.length < 3
                  }
                  onClick={() =>
                    handoff.mutate(
                      {
                        id: task.id,
                        context,
                        nextStep,
                        toOwnerId: toOwner || undefined,
                      },
                      {
                        onSuccess: () => {
                          setContext("");
                          setNext("");
                          setToOwner("");
                          setHandoffTask("");
                        },
                      },
                    )
                  }
                >
                  Salvar handoff
                </Button>
              </div>
            ) : null}
            {task.handoffs[0] ? (
              <p className="text-xs text-muted-foreground">
                Ultimo handoff: {task.handoffs[0].context} · proximo:{" "}
                {task.handoffs[0].nextStep}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
