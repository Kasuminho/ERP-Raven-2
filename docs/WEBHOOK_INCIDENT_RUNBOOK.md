# Runbook de incidente de webhook

Escopo: falha, atraso, duplicacao ou payload inesperado em webhook/DM do ERP.

## Triagem

1. Abra `/dashboard/staff/discord-webhooks` e filtre `FAILED`, tentativas e alvo logico.
2. Confira `/dashboard/staff/health` e `/dashboard/staff/deploy` para versao, fila e falhas recentes.
3. Preserve horario, `deliveryId`, `webhookKey`, action/target e erro resumido. Nunca copie URL completa, token, cookie ou `.env`.
4. Confirme no dominio canonico se a acao foi salva. Discord e transporte; banco do ERP e a fonte de verdade.

## Classificacao

- transporte indisponivel: dado canonico existe, entrega falhou;
- segredo/configuracao: chave logica nao resolve no servidor;
- rate limit: aguardar janela e usar retry idempotente;
- payload: preview sanitizado invalido ou acima do limite;
- duplicacao: verificar deduplication key/recibo antes de reenviar;
- permissao/canal: bot ou webhook perdeu acesso ao destino.

## Contencao e recuperacao

1. Pause somente a automacao afetada ou use o kill switch aplicavel; nao desligue dominios sem evidencia.
2. Corrija configuracao por variavel/secret manager, nunca pelo wiki ou changelog.
3. Use retry apenas quando a entrega estiver `FAILED` e `retryable`.
4. Verifique o estado salvo, a nova tentativa e a ausencia de duplicacao.
5. Se player-facing, confira PT-BR/EN, link, sigilo e identidade `Aristolfo, 570 anos de webhook`.

## Encerramento

Registre causa, janela, quantidade agregada afetada, correcao e prevencao. Nao registre payload privado, URL de webhook ou identificadores pessoais desnecessarios. Changelog Staff somente depois da verificacao em producao.
