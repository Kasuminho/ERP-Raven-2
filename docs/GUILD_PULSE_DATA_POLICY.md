# Politica de dados do Pulso da Guilda

Ultima revisao: 2026-07-21.

O pulso existe para orientar conversas coletivas sobre pertencimento, clareza,
carga, diversao e seguranca para pedir ajuda. Participar ou pular e opcional e
nao altera loot, DKP, acesso, trial, disciplina ou elegibilidade.

## Separacao e acesso

- A resposta numerica nao possui `playerId`, `userId`, nickname ou Discord.
- O recibo `SUBMITTED`/`SKIPPED` fica em tabela separada, sem chave para a
  resposta anonima, apenas para impedir envio repetido e medir participacao.
- A API Staff nunca retorna scores individuais.
- Medias e textos so aparecem quando o ciclo atinge `minGroupSize` (padrao 5;
  minimo tecnico 3). Abaixo disso, retorna somente quantas respostas faltam.
- Nao ha audit log no envio ou no skip, evitando ligar ator e horario a uma
  resposta. Configuracao, publicacao e moderacao continuam auditadas.

## Campo aberto e retencao

- Campo aberto e opcional, limitado a 1.000 caracteres e nasce `PENDING`.
- Staff pode aprovar ou ocultar somente depois do grupo minimo.
- O texto possui retencao configuravel de 1 a 90 dias (padrao 30).
- Cron diario remove o texto vencido e seus dados de moderacao. As cinco notas
  anonimas permanecem para tendencia agregada.

## Uso proibido

E proibido tentar reidentificar autoria, criar score de lealdade/churn, usar
skip como sinal negativo ou automatizar remocao, punicao, loot ou bloqueio.
