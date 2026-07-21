"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useConfirmPlaybookInstruction,
  useMyPlaybooks,
} from "@/hooks/use-playbooks-api";
import { useLocaleStore } from "@/store/locale-store";
export default function MyPlaybookPage() {
  const mine = useMyPlaybooks();
  const confirm = useConfirmPlaybookInstruction();
  const locale = useLocaleStore((s) => s.locale);
  const en = locale === "en";
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase text-primary">
          {en ? "My preparation" : "Minha preparacao"}
        </p>
        <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">
          Playbook
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {en
            ? "Confirming attendance and reading your role are separate actions."
            : "Confirmar presenca e ler sua funcao sao acoes separadas."}
        </p>
      </div>
      {mine.data?.assignments.map((item) => (
        <Card key={item.assignmentId}>
          <CardHeader>
            <CardTitle className="flex justify-between gap-2">
              <span>
                {item.playbookTitle} · v{item.version}
              </span>
              <Badge tone={item.instructionConfirmedAt ? "green" : "gold"}>
                {item.instructionConfirmedAt
                  ? en
                    ? "READ"
                    : "LIDO"
                  : en
                    ? "PENDING"
                    : "PENDENTE"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <h2 className="font-semibold">
              {en ? item.objectiveEn : item.objectivePt}
            </h2>
            <p className="text-sm">
              {en ? item.publicBriefEn : item.publicBriefPt}
            </p>
            {item.instruction ? (
              <div className="rounded border border-primary/30 p-3">
                <strong>
                  {en ? item.instruction.titleEn : item.instruction.titlePt}
                </strong>
                <p className="mt-1 text-sm">
                  {en ? item.instruction.bodyEn : item.instruction.bodyPt}
                </p>
              </div>
            ) : null}
            <Button
              disabled={
                Boolean(item.instructionConfirmedAt) || confirm.isPending
              }
              onClick={() => confirm.mutate(item.assignmentId)}
            >
              {en ? "I read my role" : "Li minha funcao"}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
