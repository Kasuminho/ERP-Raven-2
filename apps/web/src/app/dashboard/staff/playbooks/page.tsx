"use client";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { notifyToast } from "@/components/ui/toaster";
import {
  type PlaybookVersionDraft,
  useAssignPlaybook,
  useDecidePlaybookLesson,
  usePlaybookLessonCandidates,
  usePlaybookStaff,
  useSavePlaybook,
} from "@/hooks/use-playbooks-api";

const lines = (value: string) =>
  value
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
export default function StaffPlaybooksPage() {
  const workspace = usePlaybookStaff();
  const save = useSavePlaybook();
  const assign = useAssignPlaybook();
  const decide = useDecidePlaybookLesson();
  const [playbookId, setPlaybookId] = useState("");
  const [key, setKey] = useState("");
  const [title, setTitle] = useState("");
  const [contentType, setContentType] = useState("BOSS");
  const [objectivePt, setObjectivePt] = useState("");
  const [objectiveEn, setObjectiveEn] = useState("");
  const [briefPt, setBriefPt] = useState("");
  const [briefEn, setBriefEn] = useState("");
  const [staffNotes, setStaffNotes] = useState("");
  const [checklist, setChecklist] = useState("");
  const [roleKey, setRoleKey] = useState("GENERAL");
  const [rolePt, setRolePt] = useState("");
  const [roleEn, setRoleEn] = useState("");
  const versions = useMemo(
    () =>
      workspace.data?.playbooks.flatMap((p) =>
        p.versions.map((v) => ({ ...v, label: `${p.title} v${v.version}` })),
      ) ?? [],
    [workspace.data],
  );
  const [versionId, setVersionId] = useState("");
  const [target, setTarget] = useState("");
  const [operationId, setOperationId] = useState("");
  const candidates = usePlaybookLessonCandidates(operationId);
  const [sourceKey, setSourceKey] = useState("");
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonPt, setLessonPt] = useState("");
  const [lessonEn, setLessonEn] = useState("");
  const [disposition, setDisposition] = useState<"KEEP" | "TEST" | "DISCARD">(
    "TEST",
  );
  const [lessonPlaybook, setLessonPlaybook] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [reviewAt, setReviewAt] = useState("");
  function saveVersion() {
    const body: PlaybookVersionDraft = {
      key: playbookId ? undefined : key,
      title: playbookId ? undefined : title,
      contentType: playbookId ? undefined : contentType,
      objectivePt,
      objectiveEn,
      publicBriefPt: briefPt,
      publicBriefEn: briefEn,
      staffNotes,
      compositionTarget: [],
      positioning: [],
      calls: [],
      risks: [],
      links: [],
      checklist: lines(checklist),
      roleInstructions: [
        {
          roleKey,
          titlePt: `Funcao ${roleKey}`,
          titleEn: `Role ${roleKey}`,
          bodyPt: rolePt,
          bodyEn: roleEn,
        },
      ],
    };
    save.mutate(
      { playbookId: playbookId || undefined, body },
      {
        onSuccess: () =>
          notifyToast({
            title: playbookId
              ? "Nova versao imutavel criada."
              : "Playbook criado.",
            tone: "success",
          }),
      },
    );
  }
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase text-primary">
          Aprendizagem operacional
        </p>
        <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">
          Playbooks versionados
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Bloco publico bilingue e instrucao por papel ficam separados das notas
          Staff. A versao anexada nunca e reescrita.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Criar playbook ou nova versao</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <Select
            value={playbookId}
            onChange={(e) => setPlaybookId(e.target.value)}
          >
            <option value="">Novo playbook</option>
            {workspace.data?.playbooks.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </Select>
          {!playbookId ? (
            <>
              <Input
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="chave-sem-espaco"
              />
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Titulo"
              />
              <Input
                value={contentType}
                onChange={(e) => setContentType(e.target.value)}
                placeholder="BOSS, CLASH, MAPA..."
              />
            </>
          ) : null}
          <Input
            value={objectivePt}
            onChange={(e) => setObjectivePt(e.target.value)}
            placeholder="Objetivo PT-BR"
          />
          <Input
            value={objectiveEn}
            onChange={(e) => setObjectiveEn(e.target.value)}
            placeholder="Objective EN"
          />
          <Input
            value={briefPt}
            onChange={(e) => setBriefPt(e.target.value)}
            placeholder="Brief publico PT-BR"
          />
          <Input
            value={briefEn}
            onChange={(e) => setBriefEn(e.target.value)}
            placeholder="Public brief EN"
          />
          <Input
            value={staffNotes}
            onChange={(e) => setStaffNotes(e.target.value)}
            placeholder="Notas Staff privadas"
          />
          <Input
            value={checklist}
            onChange={(e) => setChecklist(e.target.value)}
            placeholder="Checklist, um por linha"
          />
          <Select value={roleKey} onChange={(e) => setRoleKey(e.target.value)}>
            {["GENERAL", "FRONTLINE", "SUPPORT", "CALLER", "RESERVE"].map(
              (x) => (
                <option key={x}>{x}</option>
              ),
            )}
          </Select>
          <Input
            value={rolePt}
            onChange={(e) => setRolePt(e.target.value)}
            placeholder="Instrucao do papel PT-BR"
          />
          <Input
            value={roleEn}
            onChange={(e) => setRoleEn(e.target.value)}
            placeholder="Role instruction EN"
          />
          <Button
            disabled={
              save.isPending ||
              objectivePt.length < 3 ||
              objectiveEn.length < 3 ||
              briefPt.length < 3 ||
              briefEn.length < 3 ||
              rolePt.length < 3 ||
              roleEn.length < 3
            }
            onClick={saveVersion}
          >
            Salvar versao
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Anexar versao ao estado canonico</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <Select
            value={versionId}
            onChange={(e) => setVersionId(e.target.value)}
          >
            <option value="">Versao</option>
            {versions.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </Select>
          <Select value={target} onChange={(e) => setTarget(e.target.value)}>
            <option value="">Evento ou operacao</option>
            {workspace.data?.operations.map((o) => (
              <option key={o.id} value={`operation:${o.id}`}>
                War Room · {o.name}
              </option>
            ))}
            {workspace.data?.events.map((e) => (
              <option key={e.id} value={`event:${e.id}`}>
                Evento · {e.name}
              </option>
            ))}
          </Select>
          <Button
            disabled={!versionId || !target || assign.isPending}
            onClick={() => {
              const [kind, id] = target.split(":");
              assign.mutate(
                {
                  versionId,
                  ...(kind === "event" ? { eventId: id } : { operationId: id }),
                },
                {
                  onSuccess: () =>
                    notifyToast({ title: "Versao anexada.", tone: "success" }),
                },
              );
            }}
          >
            Anexar
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Licoes candidatas do after-action</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select
            value={operationId}
            onChange={(e) => setOperationId(e.target.value)}
          >
            <option value="">Operacao</option>
            {workspace.data?.operations.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </Select>
          {candidates.data?.candidates.map((c) => (
            <button
              type="button"
              key={c.sourceKey}
              className="block w-full rounded border border-white/10 p-3 text-left"
              onClick={() => {
                setSourceKey(c.sourceKey);
                setLessonTitle(c.title);
                setLessonPt(c.evidence);
                setLessonEn(c.evidence);
              }}
            >
              <strong>{c.title}</strong>
              <span className="block text-xs text-muted-foreground">
                {c.evidence}
              </span>
            </button>
          ))}
          <div className="grid gap-2 md:grid-cols-2">
            <Input
              value={sourceKey}
              onChange={(e) => setSourceKey(e.target.value)}
              placeholder="Origem/sinal"
            />
            <Input
              value={lessonTitle}
              onChange={(e) => setLessonTitle(e.target.value)}
              placeholder="Titulo da licao"
            />
            <Input
              value={lessonPt}
              onChange={(e) => setLessonPt(e.target.value)}
              placeholder="Licao PT-BR"
            />
            <Input
              value={lessonEn}
              onChange={(e) => setLessonEn(e.target.value)}
              placeholder="Lesson EN"
            />
            <Select
              value={disposition}
              onChange={(e) =>
                setDisposition(e.target.value as typeof disposition)
              }
            >
              {["KEEP", "TEST", "DISCARD"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </Select>
            <Select
              value={lessonPlaybook}
              onChange={(e) => setLessonPlaybook(e.target.value)}
            >
              <option value="">Nao promover</option>
              {workspace.data?.playbooks.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </Select>
            <Select
              value={ownerId}
              onChange={(e) => setOwnerId(e.target.value)}
            >
              <option value="">Dono da revisao</option>
              {workspace.data?.staff.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.discordNickname || u.discordUsername}
                </option>
              ))}
            </Select>
            <Input
              type="datetime-local"
              value={reviewAt}
              onChange={(e) => setReviewAt(e.target.value)}
            />
            <Button
              disabled={
                decide.isPending ||
                !operationId ||
                !sourceKey ||
                !ownerId ||
                !reviewAt
              }
              onClick={() =>
                decide.mutate(
                  {
                    operationId,
                    sourceKey,
                    playbookId: lessonPlaybook || undefined,
                    title: lessonTitle,
                    lessonPt,
                    lessonEn,
                    disposition,
                    ownerId,
                    reviewAt: new Date(reviewAt).toISOString(),
                  },
                  {
                    onSuccess: () =>
                      notifyToast({
                        title: "Licao decidida e rastreavel.",
                        tone: "success",
                      }),
                  },
                )
              }
            >
              Registrar decisao
            </Button>
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-3 md:grid-cols-2">
        {workspace.data?.playbooks.map((p) => (
          <Card key={p.id}>
            <CardContent className="p-4">
              <div className="flex justify-between">
                <strong>{p.title}</strong>
                <Badge tone="blue">v{p.versions[0]?.version}</Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {p.contentType} · {p.versions.length} versoes imutaveis
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
