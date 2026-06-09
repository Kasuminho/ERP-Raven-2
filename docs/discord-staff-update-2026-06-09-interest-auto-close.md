# Fechamento automatico de interesses

**PT-BR**
Atualizacao operacional no fluxo de interesses:

- Foi implementado um scheduler que roda a cada 1 minuto em `America/Sao_Paulo`.
- Posts de interesse com `status = OPEN` e `closesAt <= agora` sao fechados automaticamente.
- Se houver entradas declaradas, o post muda para `VOTING`.
- Se nao houver entradas, o post muda para `CLOSED`.
- O fechamento automatico registra auditoria com `ITEM_INTEREST_POST_AUTO_CLOSED`.
- O botao manual de fechar continua existindo para uso emergencial da Staff.

Tambem foi feito backfill nos interesses vencidos atuais: 6 posts foram movidos para votacao.
