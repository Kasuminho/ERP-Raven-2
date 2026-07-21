"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { notifyToast } from "@/components/ui/toaster";
import {
  useActivateStaffAutomation,
  useCreateStaffAutomationDryRun,
  useStaffAutomationKillSwitch,
  useStaffAutomations,
} from "@/hooks/use-staff-automation-api";

export default function StaffAutomationsPage() {
  const workspace = useStaffAutomations();
  const dryRun = useCreateStaffAutomationDryRun();
  const activate = useActivateStaffAutomation();
  const kill = useStaffAutomationKillSwitch();
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase text-primary">Automação segura</p>
        <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">
          Rotinas observadas, com freio de emergência
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Somente padrões com três tarefas concluídas em 90 dias podem gerar um
          dry-run. A única ação permitida é criar tarefa Staff sem dono; loot,
          remoção e política social ficam proibidos.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Padrões candidatos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {workspace.data?.proposals.map((proposal) => (
            <div
              key={proposal.sourcePattern}
              className="flex flex-wrap items-center justify-between gap-3 rounded border border-white/10 p-3"
            >
              <div>
                <p className="font-semibold">{proposal.name}</p>
                <p className="text-xs text-muted-foreground">
                  {proposal.observedCount} ocorrências em{" "}
                  {proposal.observedWindowDays} dias · prévia: 1 tarefa/dia
                </p>
              </div>
              <Button
                disabled={dryRun.isPending}
                onClick={() =>
                  dryRun.mutate(proposal, {
                    onSuccess: () =>
                      notifyToast({
                        title: "Dry-run salvo; ainda está desligado.",
                        tone: "success",
                      }),
                  })
                }
              >
                Criar dry-run
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
      <div className="grid gap-3 xl:grid-cols-2">
        {workspace.data?.rules.map((rule) => (
          <Card key={rule.id}>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center justify-between gap-2">
                <span>{rule.name}</span>
                <Badge
                  tone={
                    rule.killSwitch ? "red" : rule.enabled ? "green" : "gold"
                  }
                >
                  {rule.killSwitch
                    ? "KILL SWITCH"
                    : rule.enabled
                      ? "ATIVA"
                      : "DRY-RUN"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm">
                Criará apenas: <strong>{rule.taskTitle}</strong>
              </p>
              <p className="text-xs text-muted-foreground">
                {rule.sourcePattern} · a cada {rule.frequencyMinutes} min ·
                máximo {rule.maxRunsPerDay}/dia · idempotente por janela
              </p>
              <div className="flex flex-wrap gap-2">
                {!rule.enabled && !rule.killSwitch ? (
                  <Button
                    disabled={activate.isPending}
                    onClick={() => {
                      if (
                        window.confirm(
                          "Confirmar ativação desta rotina após revisar o dry-run?",
                        )
                      )
                        activate.mutate(rule.id);
                    }}
                  >
                    Confirmar e ativar
                  </Button>
                ) : null}
                <Button
                  variant="secondary"
                  disabled={kill.isPending}
                  onClick={() =>
                    kill.mutate({ id: rule.id, killSwitch: !rule.killSwitch })
                  }
                >
                  {rule.killSwitch
                    ? "Liberar kill switch"
                    : "Acionar kill switch"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
