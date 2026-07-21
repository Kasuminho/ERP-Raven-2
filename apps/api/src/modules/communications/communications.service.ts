import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import {
  CommunicationChannel,
  DigestCadence,
  EventRsvpStatus,
  PlayerAbsenceReasonVisibility,
} from "@prisma/client";
import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { PrismaService } from "@database/prisma.service";
import { DiscordBotService } from "../discord/bot/services/discord-bot.service";
import { EventAbsenceService } from "../events/services/event-absence.service";
import { EventRsvpService } from "../events/services/event-rsvp.service";
import { NotificationsService } from "../notifications/notifications.service";
import { PlaybooksService } from "../playbooks/playbooks.service";
import { GuildPolicyService } from "../business-rules/guild-policy.service";
import { UpdateCommunicationPreferenceDto } from "./dto";

const defaults = {
  eventChannel: CommunicationChannel.WEB,
  ownLootChannel: CommunicationChannel.WEB,
  requestChannel: CommunicationChannel.WEB,
  progressChannel: CommunicationChannel.WEB,
  announcementChannel: CommunicationChannel.WEB,
  reminderChannel: CommunicationChannel.WEB,
  quietStartsAt: null,
  quietEndsAt: null,
  timezone: "America/Sao_Paulo",
  digestCadence: DigestCadence.DAILY,
  criticalBypassesQuietHours: true,
};
@Injectable()
export class CommunicationsService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly discord: DiscordBotService,
    private readonly rsvp: EventRsvpService,
    private readonly absences: EventAbsenceService,
    private readonly playbooks: PlaybooksService,
    private readonly policies: GuildPolicyService,
  ) {}
  onModuleInit() {
    const commands = [
      new SlashCommandBuilder()
        .setName("erp-rsvp")
        .setDescription("Salvar RSVP no ERP")
        .addStringOption((option) =>
          option
            .setName("evento")
            .setDescription("ID do evento")
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName("status")
            .setDescription("Resposta")
            .setRequired(true)
            .addChoices(
              { name: "Confirmado", value: "CONFIRMED" },
              { name: "Talvez", value: "TENTATIVE" },
              { name: "Recusado", value: "DECLINED" },
            ),
        ),
      new SlashCommandBuilder()
        .setName("erp-ausencia")
        .setDescription("Declarar ausencia no ERP")
        .addStringOption((option) =>
          option.setName("inicio").setDescription("ISO 8601").setRequired(true),
        )
        .addStringOption((option) =>
          option.setName("fim").setDescription("ISO 8601").setRequired(true),
        )
        .addStringOption((option) =>
          option.setName("motivo").setDescription("Opcional"),
        ),
      new SlashCommandBuilder()
        .setName("erp-instrucao")
        .setDescription("Confirmar leitura da instrucao")
        .addStringOption((option) =>
          option
            .setName("atribuicao")
            .setDescription("ID da atribuicao")
            .setRequired(true),
        ),
      new SlashCommandBuilder()
        .setName("erp-regra")
        .setDescription("Confirmar leitura de regra publicada")
        .addStringOption((option) =>
          option
            .setName("politica")
            .setDescription("ID da politica")
            .setRequired(true),
        ),
    ].map((command) => command.toJSON());
    this.discord.registerMirroredCommands(commands, (interaction) =>
      this.handleDiscordAction(interaction),
    );
  }
  async getMine(userId: string) {
    const player = await this.player(userId);
    const preference =
      await this.prisma.playerCommunicationPreference.findUnique({
        where: { playerId: player.id },
      });
    return {
      preference: preference ?? { playerId: player.id, ...defaults },
      defaultsAreConservative: true,
      criticalAlertsMayBypassQuietHours: (preference ?? defaults)
        .criticalBypassesQuietHours,
    };
  }
  async updateMine(userId: string, dto: UpdateCommunicationPreferenceDto) {
    const player = await this.player(userId);
    this.validateTimezone(dto.timezone);
    if (Boolean(dto.quietStartsAt) !== Boolean(dto.quietEndsAt))
      throw new BadRequestException("Quiet hours require both start and end.");
    return this.prisma.playerCommunicationPreference.upsert({
      where: { playerId: player.id },
      create: {
        playerId: player.id,
        ...dto,
        quietStartsAt: dto.quietStartsAt || null,
        quietEndsAt: dto.quietEndsAt || null,
      },
      update: {
        ...dto,
        quietStartsAt: dto.quietStartsAt || null,
        quietEndsAt: dto.quietEndsAt || null,
      },
    });
  }
  async getDigest(userId: string) {
    const player = await this.player(userId);
    return this.buildDigest(userId, player.id);
  }
  async sendTest(userId: string) {
    const player = await this.prisma.player.findFirst({
      where: { userId, isActive: true },
      include: { user: true, communicationPreference: true },
    });
    if (!player) throw new NotFoundException("Active player not found.");
    const preference = player.communicationPreference ?? defaults;
    const results: string[] = [];
    if (this.webEnabled(preference.reminderChannel)) {
      await this.notifications.createForPlayer({
        playerId: player.id,
        type: "COMMUNICATION_TEST",
        title: "Teste de comunicacao / Communication test",
        body: "Seu canal Web esta funcionando. / Your Web channel is working.",
        href: "/dashboard/communications",
        deduplicationKey: `communication-test:${player.id}:${new Date().toISOString().slice(0, 16)}`,
      });
      results.push("WEB");
    }
    if (this.discordEnabled(preference.reminderChannel)) {
      await this.discord.sendDirectMessage(
        player.user.discordId,
        "PT-BR: Teste de comunicacao do ERP concluido.\nEN: ERP communication test completed.",
      );
      results.push("DISCORD");
    }
    return { sentTo: results, sourceOfTruth: "/dashboard/communications" };
  }
  @Cron(CronExpression.EVERY_HOUR)
  async deliverScheduled(now = new Date()) {
    const rows = await this.prisma.playerCommunicationPreference.findMany({
      where: { digestCadence: { not: DigestCadence.NONE } },
      include: { player: { include: { user: true } } },
    });
    for (const preference of rows) {
      const local = this.localParts(now, preference.timezone);
      if (
        local.hour !== 9 ||
        this.isQuiet(
          local.time,
          preference.quietStartsAt,
          preference.quietEndsAt,
        )
      )
        continue;
      if (
        preference.digestCadence === DigestCadence.WEEKLY &&
        local.weekday !== "Mon"
      )
        continue;
      const periodKey = `${preference.digestCadence}:${local.date}`;
      const exists = await this.prisma.playerDigestDelivery.findUnique({
        where: {
          playerId_periodKey: { playerId: preference.playerId, periodKey },
        },
      });
      if (exists) continue;
      const digest = await this.buildDigest(
        preference.player.userId,
        preference.playerId,
      );
      if (!digest.items.length) continue;
      const body = digest.items
        .slice(0, 8)
        .map(
          (item) =>
            `- ${item.title}${item.count > 1 ? ` (${item.count}x)` : ""}`,
        )
        .join("\n");
      if (this.webEnabled(preference.reminderChannel))
        await this.notifications.createForPlayer({
          playerId: preference.playerId,
          type: "PERSONAL_DIGEST",
          title: "Resumo pessoal / Personal digest",
          body,
          href: "/dashboard/communications",
          deduplicationKey: `digest:${preference.playerId}:${periodKey}`,
        });
      if (this.discordEnabled(preference.reminderChannel))
        await this.discord.sendDirectMessage(
          preference.player.user.discordId,
          `PT-BR/EN · Resumo pessoal / Personal digest\n${body}\n/dashboard/communications`,
        );
      await this.prisma.playerDigestDelivery.create({
        data: {
          playerId: preference.playerId,
          periodKey,
          itemKeys: digest.items.map((item) => item.key),
        },
      });
    }
  }
  private async buildDigest(userId: string, playerId: string) {
    const rows = await this.prisma.notification.findMany({
      where: { OR: [{ userId }, { playerId }], readAt: null },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    const grouped = new Map<string, any>();
    for (const row of rows) {
      const key = `${row.type}:${row.href ?? "/dashboard/notices"}`;
      const current = grouped.get(key);
      const metadata = (row.metadata ?? {}) as Record<string, unknown>;
      if (current) {
        current.count += 1;
        continue;
      }
      grouped.set(key, {
        key,
        title: row.title,
        body: row.body,
        href: row.href ?? "/dashboard/notices",
        deadline:
          typeof metadata.deadline === "string" ? metadata.deadline : null,
        count: 1,
        latestAt: row.createdAt,
      });
    }
    return {
      generatedAt: new Date(),
      items: [...grouped.values()],
      groupedByCanonicalObject: true,
      thirdPartyDataIncluded: false,
    };
  }
  private async player(userId: string) {
    const player = await this.prisma.player.findFirst({
      where: { userId, isActive: true },
      select: { id: true },
    });
    if (!player) throw new NotFoundException("Active player not found.");
    return player;
  }
  private validateTimezone(timezone: string) {
    try {
      new Intl.DateTimeFormat("en", { timeZone: timezone }).format();
    } catch {
      throw new BadRequestException("Invalid IANA timezone.");
    }
  }
  private localParts(date: Date, timezone: string) {
    this.validateTimezone(timezone);
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    const parts = Object.fromEntries(
      formatter.formatToParts(date).map((part) => [part.type, part.value]),
    );
    return {
      weekday: parts.weekday,
      date: `${parts.year}-${parts.month}-${parts.day}`,
      hour: Number(parts.hour),
      time: `${parts.hour}:${parts.minute}`,
    };
  }
  private isQuiet(time: string, start: string | null, end: string | null) {
    if (!start || !end) return false;
    return start < end
      ? time >= start && time < end
      : time >= start || time < end;
  }
  private webEnabled(channel: CommunicationChannel) {
    return (
      channel === CommunicationChannel.WEB ||
      channel === CommunicationChannel.BOTH
    );
  }
  private discordEnabled(channel: CommunicationChannel) {
    return (
      channel === CommunicationChannel.DISCORD ||
      channel === CommunicationChannel.BOTH
    );
  }
  private async handleDiscordAction(interaction: ChatInputCommandInteraction) {
    const user = await this.prisma.user.findUnique({
      where: { discordId: interaction.user.id },
      select: { id: true },
    });
    if (!user) {
      await interaction.reply({
        content: "Vincule esta conta no ERP. / Link this account in ERP.",
        ephemeral: true,
      });
      return;
    }
    let route = "/dashboard";
    if (interaction.commandName === "erp-rsvp") {
      const eventId = interaction.options.getString("evento", true);
      const status = interaction.options.getString(
        "status",
        true,
      ) as EventRsvpStatus;
      await this.rsvp.respond(eventId, user.id, { status });
      route = "/dashboard/attendance";
    } else if (interaction.commandName === "erp-ausencia") {
      await this.absences.create(user.id, {
        startsAt: interaction.options.getString("inicio", true),
        endsAt: interaction.options.getString("fim", true),
        reason: interaction.options.getString("motivo") ?? undefined,
        reasonVisibility: PlayerAbsenceReasonVisibility.STAFF_ONLY,
      });
      route = "/dashboard/attendance";
    } else if (interaction.commandName === "erp-instrucao") {
      await this.playbooks.confirmInstruction(
        user.id,
        interaction.options.getString("atribuicao", true),
        true,
      );
      route = "/dashboard/playbook";
    } else if (interaction.commandName === "erp-regra") {
      await this.policies.acknowledge(
        interaction.options.getString("politica", true),
        user.id,
      );
      route = "/dashboard/rules";
    }
    await interaction.reply({
      content: `Estado salvo no ERP. Revise em ${route}. / State saved in ERP. Review at ${route}.`,
      ephemeral: true,
    });
  }
}
