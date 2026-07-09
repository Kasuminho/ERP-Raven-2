import { Injectable } from '@nestjs/common';
import { ItemCatalog, ItemRequestUpdateStatus, ItemTier, Prisma } from '@prisma/client';
import type {
  ItemRequestEnrichment as SharedItemRequestEnrichment,
  ItemRequestMaterialPriority as SharedItemRequestMaterialPriority,
  ItemRequestQueueForecast as SharedItemRequestQueueForecast,
  ItemRequestSwapSuggestion as SharedItemRequestSwapSuggestion,
} from '@shared/types/requests';
import { requestableItemCategories, requestableItemKeys } from '../../items/requestable-items';
import { ItemRequestDetails, ItemRequestsRepository } from '../repositories/item-requests.repository';

const categoryLimitExemptions = new Set(['creature of gaiety', 'elder dragon isteria', 'carnival queen']);
const updateExpiryExemptCategories = new Set(['creature']);

type DeliveryRow = Prisma.DropHistoryGetPayload<Record<string, never>>;

export type ItemRequestQueueForecast = SharedItemRequestQueueForecast<Date>;
export type ItemRequestSwapSuggestion = SharedItemRequestSwapSuggestion<string, string>;
export type ItemRequestMaterialPriority = SharedItemRequestMaterialPriority;
export type ItemRequestDetailsWithForecast = ItemRequestDetails & Required<SharedItemRequestEnrichment<Date, string, string>>;

@Injectable()
export class ItemRequestQueueService {
  constructor(private readonly repository: ItemRequestsRepository) {}

  async enrichWithQueueContext(requests: ItemRequestDetails[]): Promise<ItemRequestDetailsWithForecast[]> {
    if (requests.length === 0) {
      return [];
    }

    const allRows = await this.repository.findMany();
    const requestableCatalogs = (await this.repository.client.itemCatalog.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { namePt: 'asc' }],
    })).filter((item) => this.isRequestableCatalogItem(item));
    const itemNames = [...new Set(allRows.map((request) => request.itemName))];
    const itemCatalogIds = [...new Set(allRows.map((request) => request.itemCatalogId).filter((id): id is string => Boolean(id)))];
    const deliveryWhere: Prisma.DropHistoryWhereInput[] = [{ itemName: { in: itemNames } }];
    if (itemCatalogIds.length > 0) {
      deliveryWhere.push({ itemCatalogId: { in: itemCatalogIds } });
    }
    const deliveries = await this.repository.client.dropHistory.findMany({
      where: { OR: deliveryWhere },
      orderBy: [{ deliveredAt: 'desc' }, { createdAt: 'desc' }],
    });

    const groups = this.groupRowsByItemName(allRows);
    const forecasts = this.forecastsForRows(groups, deliveries);
    const materialPriorities = this.materialPrioritiesForRows(allRows);

    return requests.map((request) => ({
      ...request,
      queueForecast: forecasts.get(request.id) ?? this.emptyQueueForecast(request),
      swapSuggestions: this.swapSuggestionsForRequest(request, groups, requestableCatalogs),
      materialPriority: materialPriorities.get(request.id) ?? this.emptyMaterialPriority(),
    }));
  }

  materialPrioritiesForRows(rows: ItemRequestDetails[]): Map<string, ItemRequestMaterialPriority> {
    const priorities = new Map<string, ItemRequestMaterialPriority>();
    const craftRows = rows.filter((request) => this.isT3CraftPriorityRequest(request));

    for (const request of rows) {
      if (this.isQuintessenceRequest(request)) {
        const materialKey = this.materialPriorityKey(request);
        const blockingRows = craftRows.filter((candidate) => candidate.id !== request.id && this.materialPriorityKey(candidate) === materialKey);

        if (blockingRows.length > 0) {
          priorities.set(request.id, this.quintessenceBlockedPriority(request, materialKey, blockingRows));
          continue;
        }
      }

      if (this.isT3CraftPriorityRequest(request)) {
        priorities.set(request.id, this.t3CraftPriority(request));
        continue;
      }

      priorities.set(request.id, this.emptyMaterialPriority());
    }

    return priorities;
  }

  private groupRowsByItemName(rows: ItemRequestDetails[]): Map<string, ItemRequestDetails[]> {
    const groups = new Map<string, ItemRequestDetails[]>();
    for (const request of rows) {
      const group = groups.get(request.itemName) ?? [];
      group.push(request);
      groups.set(request.itemName, group);
    }
    return groups;
  }

  private forecastsForRows(groups: Map<string, ItemRequestDetails[]>, deliveries: DeliveryRow[]): Map<string, ItemRequestQueueForecast> {
    const lastDeliveryByItem = new Map<string, DeliveryRow>();
    for (const delivery of deliveries) {
      const keys = [delivery.itemName, delivery.itemCatalogId].filter((value): value is string => Boolean(value));
      for (const key of keys) {
        if (!lastDeliveryByItem.has(key)) {
          lastDeliveryByItem.set(key, delivery);
        }
      }
    }

    const forecasts = new Map<string, ItemRequestQueueForecast>();
    const now = new Date();

    for (const [itemName, rows] of groups.entries()) {
      const sorted = [...rows].sort((left, right) => left.rankPosition - right.rankPosition);

      for (const request of sorted) {
        const aheadRows = sorted.filter((candidate) => candidate.rankPosition < request.rankPosition);
        const unitsAhead = aheadRows.reduce((total, candidate) => total + candidate.remainingQuantity, 0);
        const lastUpdateAt = request.legacyUpdatedAt ?? request.updatedAt;
        const daysSinceUpdate = Math.max(0, Math.floor((now.getTime() - lastUpdateAt.getTime()) / 86_400_000));
        const lastDelivery = (request.itemCatalogId ? lastDeliveryByItem.get(request.itemCatalogId) : undefined) ?? lastDeliveryByItem.get(itemName) ?? null;
        const updateStage = this.queueUpdateStage(request);

        forecasts.set(request.id, {
          position: request.rankPosition,
          queueSize: sorted.length,
          requestsAhead: aheadRows.length,
          unitsAhead,
          estimatedDeliveriesBefore: unitsAhead,
          isNext: request.rankPosition === 1,
          needsUpdate: updateStage === 'warned_3d' || updateStage === 'warned_4d' || updateStage === 'pending_review',
          updateStage,
          lastUpdateAt,
          daysSinceUpdate,
          lastDeliveryAt: lastDelivery?.deliveredAt ?? lastDelivery?.createdAt ?? null,
          lastDeliveryPlayerName: lastDelivery?.nicknameIngame ?? null,
          summaryPt: this.queueForecastSummaryPt(request, aheadRows.length, unitsAhead, updateStage, lastDelivery),
          summaryEn: this.queueForecastSummaryEn(request, aheadRows.length, unitsAhead, updateStage, lastDelivery),
          staffSummaryPt: this.queueForecastStaffSummaryPt(request, sorted.length, aheadRows.length, unitsAhead, daysSinceUpdate, lastDelivery),
        });
      }
    }

    return forecasts;
  }

  private quintessenceBlockedPriority(request: ItemRequestDetails, materialKey: string, blockingRows: ItemRequestDetails[]): ItemRequestMaterialPriority {
    const itemNames = [...new Set(blockingRows.map((row) => row.itemName))];
    return {
      affected: true,
      reason: 'T3_CRAFT_OVER_QUINTESSENCE',
      materialKey,
      blockingCraftRequests: blockingRows.length,
      blockingRequestIds: blockingRows.map((row) => row.id),
      blockingItemNames: itemNames,
      summaryPt: `Este pedido de Quintessencia fica atras de ${blockingRows.length} pedido(s) de craft T3 do mesmo material.`,
      summaryEn: `This Quintessence request is behind ${blockingRows.length} T3 craft request(s) for the same material.`,
      staffSummaryPt: `Prioridade T3 aplicada: ${request.playerName} so deve receber Quintessencia depois de resolver ${blockingRows.length} pedido(s) de craft T3 do mesmo material (${itemNames.join(', ')}).`,
    };
  }

  private t3CraftPriority(request: ItemRequestDetails): ItemRequestMaterialPriority {
    const materialKey = this.materialPriorityKey(request);
    return {
      affected: false,
      reason: 'T3_CRAFT_PRIORITY',
      materialKey,
      blockingCraftRequests: 0,
      blockingRequestIds: [],
      blockingItemNames: [],
      summaryPt: 'Pedido ligado a craft T3; quando disputar material com Quintessencia, este craft tem prioridade operacional.',
      summaryEn: 'This request is tied to T3 craft; when it competes with Quintessence for the same material, T3 craft has operational priority.',
      staffSummaryPt: `Pedido de craft T3 em prioridade de material (${materialKey}).`,
    };
  }

  private emptyMaterialPriority(): ItemRequestMaterialPriority {
    return {
      affected: false,
      reason: 'NONE',
      materialKey: null,
      blockingCraftRequests: 0,
      blockingRequestIds: [],
      blockingItemNames: [],
      summaryPt: '',
      summaryEn: '',
      staffSummaryPt: '',
    };
  }

  private swapSuggestionsForRequest(
    request: ItemRequestDetails,
    groups: Map<string, ItemRequestDetails[]>,
    requestableCatalogs: ItemCatalog[],
  ): ItemRequestSwapSuggestion[] {
    if (!request.itemCatalog || this.isUpdateExpiryExemptRequest(request)) {
      return [];
    }

    const currentKey = request.itemName;
    const currentRows = groups.get(currentKey) ?? [];
    const currentUnits = currentRows.reduce((total, row) => total + row.remainingQuantity, 0);
    const currentQueueSize = currentRows.length;

    return requestableCatalogs
      .filter((candidate) => candidate.id !== request.itemCatalogId)
      .filter((candidate) => this.isComparableRequestableItem(request.itemCatalog!, candidate))
      .map((candidate) => {
        const candidateKey = this.itemKey(candidate);
        const queueRows = groups.get(candidateKey) ?? [];
        const unitsInQueue = queueRows.reduce((total, row) => total + row.remainingQuantity, 0);
        const queueSize = queueRows.length;

        return {
          itemCatalogId: candidate.id,
          itemName: candidateKey,
          itemNamePt: candidate.namePt,
          itemNameEn: candidate.nameEn,
          category: candidate.category,
          itemTier: candidate.itemTier,
          itemType: candidate.itemType,
          queueSize,
          unitsInQueue,
          estimatedPosition: queueSize + 1,
          tradeoffPt: this.swapSuggestionTradeoffPt(queueSize, unitsInQueue, currentQueueSize, currentUnits),
          tradeoffEn: this.swapSuggestionTradeoffEn(queueSize, unitsInQueue, currentQueueSize, currentUnits),
        };
      })
      .filter((suggestion) => suggestion.unitsInQueue < currentUnits || suggestion.queueSize < currentQueueSize)
      .sort((left, right) => left.unitsInQueue - right.unitsInQueue || left.queueSize - right.queueSize || left.itemNamePt.localeCompare(right.itemNamePt))
      .slice(0, 3);
  }

  private isComparableRequestableItem(current: ItemCatalog, candidate: ItemCatalog): boolean {
    if (candidate.category !== current.category) {
      return false;
    }

    if (current.itemTier && candidate.itemTier && current.itemTier !== candidate.itemTier) {
      return false;
    }

    if (current.itemType && candidate.itemType && current.itemType !== candidate.itemType) {
      return false;
    }

    return this.itemKey(current) !== this.itemKey(candidate);
  }

  private isT3CraftPriorityRequest(request: Pick<ItemRequestDetails, 'itemName' | 'itemCatalog'>): boolean {
    const item = request.itemCatalog;

    if (item?.itemTier === ItemTier.T3) {
      return true;
    }

    const text = this.prioritySearchText(request);
    return text.includes('t3')
      || text.includes('craft')
      || text.includes('crafting')
      || text.includes('blueprint')
      || text.includes('fragment')
      || text.includes('fragmento');
  }

  private isQuintessenceRequest(request: Pick<ItemRequestDetails, 'itemName' | 'itemCatalog'>): boolean {
    return this.prioritySearchText(request).includes('quintess');
  }

  private materialPriorityKey(request: Pick<ItemRequestDetails, 'itemName' | 'itemCatalog'>): string {
    const item = request.itemCatalog;
    const materialSource = item?.typePt
      || item?.typeEn
      || item?.category
      || request.itemName;

    return this.normalizePriorityText(materialSource);
  }

  private prioritySearchText(request: Pick<ItemRequestDetails, 'itemName' | 'itemCatalog'>): string {
    const item = request.itemCatalog;
    return this.normalizePriorityText([
      request.itemName,
      item?.namePt,
      item?.nameEn,
      item?.nameEs,
      item?.typePt,
      item?.typeEn,
      item?.typeEs,
      item?.category,
      item?.itemTier,
      item?.itemType,
    ].filter(Boolean).join(' '));
  }

  private normalizePriorityText(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  private swapSuggestionTradeoffPt(queueSize: number, unitsInQueue: number, currentQueueSize: number, currentUnits: number): string {
    if (queueSize === 0) {
      return 'Sem fila ativa agora; voce entraria como proximo, mas a troca ainda precisa ser combinada com a Staff.';
    }

    const savedUnits = Math.max(0, currentUnits - unitsInQueue);
    const savedRows = Math.max(0, currentQueueSize - queueSize);
    return `Fila menor: ${savedRows} pedido(s) e ${savedUnits} unidade(s) a menos. Trade-off: voce entra no fim dessa outra fila e a troca precisa da Staff.`;
  }

  private swapSuggestionTradeoffEn(queueSize: number, unitsInQueue: number, currentQueueSize: number, currentUnits: number): string {
    if (queueSize === 0) {
      return 'No active queue right now; you would enter as next, but the swap still needs Staff coordination.';
    }

    const savedUnits = Math.max(0, currentUnits - unitsInQueue);
    const savedRows = Math.max(0, currentQueueSize - queueSize);
    return `Shorter queue: ${savedRows} fewer request(s) and ${savedUnits} fewer unit(s). Trade-off: you enter the end of that other queue and Staff must coordinate the swap.`;
  }

  private queueUpdateStage(request: ItemRequestDetails): ItemRequestQueueForecast['updateStage'] {
    if (this.isUpdateExpiryExemptRequest(request)) return 'boss_manual';
    if (request.updateProofStatus === ItemRequestUpdateStatus.PENDING) return 'pending_review';
    if (request.warned4d) return 'warned_4d';
    if (request.warned3d) return 'warned_3d';
    return 'clear';
  }

  private queueForecastSummaryPt(
    request: ItemRequestDetails,
    requestsAhead: number,
    unitsAhead: number,
    updateStage: ItemRequestQueueForecast['updateStage'],
    lastDelivery?: { deliveredAt: Date | null; createdAt: Date; nicknameIngame: string | null } | null,
  ): string {
    if (updateStage === 'boss_manual') {
      return 'Pedido de boss/criatura usa avaliacao manual da Staff; a fila ajuda a consultar, mas nao promete entrega automatica.';
    }
    if (updateStage === 'pending_review') {
      return 'Seu print novo esta aguardando a Staff validar antes da fila voltar ao normal.';
    }
    if (updateStage === 'warned_4d') {
      return 'Ultimo aviso ativo: envie print novo para nao perder posicao na fila.';
    }
    if (updateStage === 'warned_3d') {
      return 'A fila pediu update: envie print novo para manter sua posicao sem drama no Discord.';
    }
    if (requestsAhead === 0) {
      return lastDelivery
        ? 'Voce e o proximo da fila; acompanhe a proxima entrega desse item.'
        : 'Voce e o proximo da fila; ainda nao ha entrega recente registrada desse item.';
    }
    return `Antes de voce ainda faltam ${requestsAhead} pedido(s) e ${unitsAhead} unidade(s) desse item.`;
  }

  private queueForecastSummaryEn(
    request: ItemRequestDetails,
    requestsAhead: number,
    unitsAhead: number,
    updateStage: ItemRequestQueueForecast['updateStage'],
    lastDelivery?: { deliveredAt: Date | null; createdAt: Date; nicknameIngame: string | null } | null,
  ): string {
    if (updateStage === 'boss_manual') {
      return 'Boss/creature requests use Staff manual review; the queue helps visibility but does not promise automatic delivery.';
    }
    if (updateStage === 'pending_review') {
      return 'Your new proof is waiting for Staff validation before the queue returns to normal.';
    }
    if (updateStage === 'warned_4d') {
      return 'Final warning active: send a new proof to avoid losing your queue position.';
    }
    if (updateStage === 'warned_3d') {
      return 'The queue asked for an update: send a new proof to keep your position clean.';
    }
    if (requestsAhead === 0) {
      return lastDelivery
        ? 'You are next in line; watch for the next delivery of this item.'
        : 'You are next in line; there is no recent delivery registered for this item yet.';
    }
    return `${requestsAhead} request(s) and ${unitsAhead} unit(s) of this item are still ahead of you.`;
  }

  private queueForecastStaffSummaryPt(
    request: ItemRequestDetails,
    queueSize: number,
    requestsAhead: number,
    unitsAhead: number,
    daysSinceUpdate: number,
    lastDelivery?: { deliveredAt: Date | null; createdAt: Date; nicknameIngame: string | null } | null,
  ): string {
    const lastDeliveryAt = lastDelivery?.deliveredAt ?? lastDelivery?.createdAt;
    const deliveryText = lastDeliveryAt ? `Ultima entrega em ${lastDeliveryAt.toISOString().slice(0, 10)}` : 'Sem entrega registrada';
    return `#${request.rankPosition}/${queueSize}; ${requestsAhead} pedido(s) e ${unitsAhead} unidade(s) antes; update ha ${daysSinceUpdate}d; ${deliveryText}.`;
  }

  private emptyQueueForecast(request: ItemRequestDetails): ItemRequestQueueForecast {
    const lastUpdateAt = request.legacyUpdatedAt ?? request.updatedAt;
    return {
      position: request.rankPosition,
      queueSize: 1,
      requestsAhead: Math.max(0, request.rankPosition - 1),
      unitsAhead: 0,
      estimatedDeliveriesBefore: 0,
      isNext: request.rankPosition === 1,
      needsUpdate: false,
      updateStage: 'clear',
      lastUpdateAt,
      daysSinceUpdate: 0,
      lastDeliveryAt: null,
      lastDeliveryPlayerName: null,
      summaryPt: 'Previsao indisponivel para esta fila agora.',
      summaryEn: 'Forecast is unavailable for this queue right now.',
      staffSummaryPt: 'Previsao indisponivel.',
    };
  }

  private isRequestableCatalogItem(item: ItemCatalog): boolean {
    return item.kind === 'request'
      || requestableItemKeys.has(this.itemKey(item))
      || requestableItemCategories.has(item.category);
  }

  private isUpdateExpiryExemptRequest(request: Pick<ItemRequestDetails, 'itemName' | 'itemCatalog'>): boolean {
    return categoryLimitExemptions.has(request.itemName)
      || Boolean(request.itemCatalog?.category && updateExpiryExemptCategories.has(request.itemCatalog.category));
  }

  private itemKey(item: Pick<ItemCatalog, 'namePt' | 'nameEn'>): string {
    return (item.namePt || item.nameEn).trim().toLowerCase();
  }
}
