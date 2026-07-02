import { Injectable } from '@nestjs/common';
import { BusinessRulesService } from '../../business-rules/business-rules.service';
import { GuildRulesSummary, MaintenanceModeSummary } from '../operations.types';

@Injectable()
export class OperationsRulesService {
  constructor(private readonly businessRules: BusinessRulesService) {}

  async getMaintenanceMode(): Promise<MaintenanceModeSummary> {
    return this.businessRules.getMaintenanceMode();
  }

  async getGuildRules(): Promise<GuildRulesSummary> {
    const [eventRewards, auctionRules, scoreRules] = await Promise.all([
      this.businessRules.getEventRewards(),
      this.businessRules.getAuctionTierRules(),
      this.businessRules.getPriorityScoreRules(),
    ]);

    return {
      sections: [
        {
          key: 'dkp',
          title: 'DKP',
          bullets: [
            'DKP nunca fica salvo direto no player; saldo e calculado por transacoes e locks.',
            'Bid em leilao cria lock, mas so consome DKP quando o vencedor e aprovado.',
            'Perdedores recebem unlock/refund automatico do lock.',
          ],
        },
        {
          key: 'auctions',
          title: 'Leiloes',
          bullets: [
            `T2 minimo ${auctionRules.T2.minimumBid}, T3 minimo ${auctionRules.T3.minimumBid}, T4 minimo ${auctionRules.T4.minimumBid}.`,
            `T4 usa ${auctionRules.T4.auctionMode} e camada minima ${auctionRules.T4.minimumLayer}+. Legendary usa ${auctionRules.LEGENDARY.auctionMode} e camada minima ${auctionRules.LEGENDARY.minimumLayer}+.`,
            'T4 abre camada menor progressivamente se o leilao fechar sem bid valido para a camada atual.',
            `Score: camada x${scoreRules.layerWeight}, presenca x${scoreRules.attendanceWeight}, DKP bidado x${scoreRules.bidDkpWeight}, bonus de classe ${scoreRules.classPriorityBonus}.`,
          ],
        },
        {
          key: 'interests',
          title: 'Interesses',
          bullets: [
            'Player declara interesse com print.',
            'Staff vota antes de habilitar entrega.',
            'Entrega gera historico e prova quando aplicavel.',
          ],
        },
        {
          key: 'attendance',
          title: 'Presenca',
          bullets: [
            'Presenca e marcada pela Staff.',
            'Eventos finalizados geram DKP automaticamente para presentes.',
            'Eventos cancelados nao contam para presenca nem DKP.',
            `DKP atual por evento: ${Object.entries(eventRewards).map(([type, reward]) => `${type}=${reward}`).join(', ')}.`,
          ],
        },
        {
          key: 'daoshi',
          title: 'Daoshi',
          bullets: [
            'Player envia comprovante, Staff aprova/corrige pelo extrato.',
            'R$200 aprovados no mes geram 1 cupom.',
            'Sorteio de $50 libera quando a guild bate R$10.000 no mes com cupom AACD.',
          ],
        },
      ],
    };
  }
}
