# Validacao forte na timeline de auditoria

**PT-BR**

- A segunda fatia do roadmap de manutencao foi publicada: `audit` agora valida alvo e paginacao antes de consultar a timeline Staff.
- `targetType`, `targetId`, `page` e `limit` passam por `ValidationPipe` local forte.
- `/audit/health` continua publico e sem autenticacao, do mesmo jeito que o smoke espera.
- A timeline continua Staff/Admin; nada foi aberto para player.
- O deploy foi verificado em producao com `/health` respondendo a versao `59e2d0a`.

Aristolfo colocou porteiro na timeline: entra alvo valido, sai fofoca auditavel.
