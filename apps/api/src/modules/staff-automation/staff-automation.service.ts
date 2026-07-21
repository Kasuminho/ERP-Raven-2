import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import {
  Prisma,
  StaffAutomationAction,
  StaffTaskPriority,
} from "@prisma/client";
import { PrismaService } from "@database/prisma.service";
import { AuditService } from "../audit/services/audit.service";
import { CreateStaffAutomationDryRunDto } from "./dto";

@Injectable()
export class StaffAutomationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async getWorkspace() {
    const since = new Date(Date.now() - 90 * 86_400_000);
    const [rules, completed] = await Promise.all([
      this.prisma.staffAutomationRule.findMany({
        include: { runs: { orderBy: { createdAt: "desc" }, take: 10 } },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.staffTask.findMany({
        where: {
          status: "DONE",
          sourceType: { not: null },
          completedAt: { gte: since },
        },
        orderBy: { completedAt: "desc" },
        take: 1000,
      }),
    ]);
    const groups = new Map<string, typeof completed>();
    for (const task of completed) {
      const key = `${task.sourceType}:${task.area}`;
      groups.set(key, [...(groups.get(key) ?? []), task]);
    }
    const proposals = [...groups]
      .filter(([, tasks]) => tasks.length >= 3)
      .map(([sourcePattern, tasks]) => ({
        sourcePattern,
        observedCount: tasks.length,
        observedWindowDays: 90,
        name: `Rotina ${sourcePattern}`,
        taskTitle: tasks[0].title,
        taskDescription: tasks[0].description,
        taskArea: tasks[0].area,
        taskHref: tasks[0].href,
        frequencyMinutes: 1440,
        maxRunsPerDay: 1,
      }));
    return {
      rules,
      proposals,
      safeAction: StaffAutomationAction.CREATE_STAFF_TASK,
      requiresObservedPattern: true,
      dryRunAndConfirmationRequired: true,
      forbiddenActions: [
        "APPROVE_LOOT",
        "REMOVE_PLAYER",
        "CHANGE_SOCIAL_POLICY",
      ],
    };
  }

  async createDryRun(actorId: string, dto: CreateStaffAutomationDryRunDto) {
    const observedCount = await this.countObserved(dto.sourcePattern);
    if (observedCount < 3)
      throw new BadRequestException(
        "Automation requires at least three completed tasks with the observed pattern.",
      );
    const preview = {
      action: StaffAutomationAction.CREATE_STAFF_TASK,
      wouldCreate: {
        title: dto.taskTitle.trim(),
        description: dto.taskDescription.trim(),
        area: dto.taskArea,
        href: dto.taskHref,
        ownerId: null,
      },
      frequencyMinutes: dto.frequencyMinutes,
      maxRunsPerDay: dto.maxRunsPerDay,
      observedPattern: dto.sourcePattern,
      observedCount,
      mutationsOutsideStaffTasks: false,
    };
    const rule = await this.prisma.staffAutomationRule.create({
      data: {
        name: dto.name.trim(),
        sourcePattern: dto.sourcePattern,
        taskTitle: dto.taskTitle.trim(),
        taskDescription: dto.taskDescription.trim(),
        taskArea: dto.taskArea,
        taskHref: dto.taskHref,
        frequencyMinutes: dto.frequencyMinutes,
        maxRunsPerDay: dto.maxRunsPerDay,
        dryRunPreview: preview,
        createdById: actorId,
      },
    });
    await this.audit.log({
      actorId,
      action: "STAFF_AUTOMATION_DRY_RUN_CREATED",
      targetType: "StaffAutomationRule",
      targetId: rule.id,
      metadata: {
        sourcePattern: dto.sourcePattern,
        observedCount,
        enabled: false,
        safeAction: StaffAutomationAction.CREATE_STAFF_TASK,
      },
    });
    return rule;
  }

  async activate(actorId: string, id: string, confirm: boolean) {
    if (!confirm)
      throw new BadRequestException("Explicit confirmation is required.");
    const rule = await this.prisma.staffAutomationRule.findUnique({
      where: { id },
    });
    if (!rule) throw new NotFoundException("Automation rule not found.");
    if (rule.killSwitch)
      throw new BadRequestException(
        "Disable the kill switch before activation.",
      );
    if ((await this.countObserved(rule.sourcePattern)) < 3)
      throw new BadRequestException(
        "Observed pattern no longer satisfies activation criteria.",
      );
    const updated = await this.prisma.staffAutomationRule.update({
      where: { id },
      data: { enabled: true, activatedAt: new Date() },
    });
    await this.audit.log({
      actorId,
      action: "STAFF_AUTOMATION_ACTIVATED",
      targetType: "StaffAutomationRule",
      targetId: id,
      metadata: {
        confirmed: true,
        safeAction: rule.action,
        permissionsChanged: false,
      },
    });
    return updated;
  }

  async setKillSwitch(actorId: string, id: string, killSwitch: boolean) {
    const rule = await this.prisma.staffAutomationRule.findUnique({
      where: { id },
    });
    if (!rule) throw new NotFoundException("Automation rule not found.");
    const updated = await this.prisma.staffAutomationRule.update({
      where: { id },
      data: { killSwitch, enabled: killSwitch ? false : rule.enabled },
    });
    await this.audit.log({
      actorId,
      action: "STAFF_AUTOMATION_KILL_SWITCH_SET",
      targetType: "StaffAutomationRule",
      targetId: id,
      metadata: { killSwitch, enabled: updated.enabled },
    });
    return updated;
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async executeDue(now = new Date()) {
    const rules = await this.prisma.staffAutomationRule.findMany({
      where: { enabled: true, killSwitch: false },
    });
    for (const rule of rules) {
      if (
        rule.lastRunAt &&
        now.getTime() - rule.lastRunAt.getTime() <
          rule.frequencyMinutes * 60_000
      )
        continue;
      const dayStart = new Date(now);
      dayStart.setUTCHours(0, 0, 0, 0);
      const runsToday = await this.prisma.staffAutomationRun.count({
        where: { ruleId: rule.id, createdAt: { gte: dayStart } },
      });
      if (runsToday >= rule.maxRunsPerDay) continue;
      const bucket = Math.floor(
        now.getTime() / (rule.frequencyMinutes * 60_000),
      );
      const dedupKey = `${rule.id}:${bucket}`;
      try {
        const result = await this.prisma.$transaction(async (tx) => {
          const task = await tx.staffTask.create({
            data: {
              title: rule.taskTitle,
              description: rule.taskDescription,
              area: rule.taskArea,
              priority: StaffTaskPriority.MEDIUM,
              href: rule.taskHref,
              sourceType: "STAFF_AUTOMATION",
              sourceKey: `AUTOMATION:${dedupKey}`,
              createdById: rule.createdById,
            },
          });
          await tx.staffAutomationRun.create({
            data: {
              ruleId: rule.id,
              dedupKey,
              taskId: task.id,
              status: "CREATED",
            },
          });
          await tx.staffAutomationRule.update({
            where: { id: rule.id },
            data: { lastRunAt: now },
          });
          return task;
        });
        await this.audit.log({
          actorId: rule.createdById,
          action: "STAFF_AUTOMATION_TASK_CREATED",
          targetType: "StaffTask",
          targetId: result.id,
          metadata: {
            ruleId: rule.id,
            dedupKey,
            safeAction: rule.action,
            affectsLoot: false,
            affectsPlayers: false,
            changesPolicy: false,
          },
        });
      } catch (error) {
        if (!(
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ))
          throw error;
      }
    }
  }

  private async countObserved(sourcePattern: string) {
    const separator = sourcePattern.lastIndexOf(":");
    if (separator <= 0) return 0;
    const sourceType = sourcePattern.slice(0, separator);
    const area = sourcePattern.slice(separator + 1);
    return this.prisma.staffTask.count({
      where: {
        sourceType,
        area: area as never,
        status: "DONE",
        completedAt: { gte: new Date(Date.now() - 90 * 86_400_000) },
      },
    });
  }
}
