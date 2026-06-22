# Runbooks operacionais

Comandos assumem a raiz do projeto na VPS e `.env.production` preenchido. Nunca cole
segredos, dumps ou URLs completas de webhook em tickets ou changelogs.

## Restaurar PostgreSQL

1. Declare incidente e coloque a aplicacao em manutencao para impedir novas escritas.
2. Escolha o ultimo backup off-site anterior ao incidente e confira seu `.sha256`.
3. Valide sem tocar no banco principal com `scripts/prod/verify-backup.sh BACKUP`.
4. Faca um backup emergencial do estado atual, mesmo corrompido.
5. Pare API e Web. Nao remova o volume do PostgreSQL.
6. Rode `RESTORE_CONFIRM=guild_platform scripts/prod/restore-postgres.sh BACKUP` e
   reinicie `guild-api` para migrations.
7. Aguarde o healthcheck, execute `scripts/prod/smoke-production.sh` e confira login,
   contagem de players, saldo DKP e ultimo evento com uma pessoa da Staff.
8. Retire a manutencao e registre horario, backup usado e verificacoes, sem passphrase.

## Discord ou webhooks indisponiveis

1. Confirme se a API e o painel funcionam; nao reinicie banco por falha externa.
2. Consulte o status oficial do Discord e o health privado da Staff.
3. Preserve a operacao no ERP. Nao repita posts enquanto houver retries em andamento.
4. Se apenas um webhook falhar, rotacione-o no Discord e atualize somente a variavel de
   ambiente correspondente; nunca publique a URL.
5. Reinicie apenas `guild-api`, valide o health privado e envie teste no canal afetado.
6. Ao recuperar, confira notificacoes pendentes e entregas persistidas antes de reenvio.

## Deploy falhou

1. Nao envie changelog. Confira `docker ps`, healthchecks e logs dos containers.
2. Se uma migration falhou, nao force rollback de schema; faca uma correcao forward.
3. Com banco integro, rode `scripts/prod/rollback-images.sh`.
4. Execute `EXPECTED_VERSION=TAG_ANTERIOR scripts/prod/smoke-production.sh` e confira o
   comportamento que motivou o deploy.
5. Watchtower continua adequado para `latest`; durante investigacao, fixe uma tag
   imutavel para impedir nova promocao acidental.

## Inconsistencia de leilao ou DKP

1. Pause a entrega/finalizacao relacionada. Nao altere saldos diretamente no banco.
2. Registre IDs de leilao, evento, player e transacao sem expor bids a players.
3. Execute `npm run test:smoke` conectado ao banco em ambiente controlado.
4. Compare auditoria, locks ativos, bid vencedor, `AUCTION_WIN` e entrega.
5. Corrija pela operacao/API auditavel. Se ela nao cobrir o caso, crie script de reparo
   versionado, transacional, idempotente e revisado por outra pessoa.
6. Rode novamente o diagnostico e obtenha confirmacao da Staff antes de reabrir o fluxo.

## Backup diario e teste de restauracao

Cron diario:

```cron
20 4 * * * cd /caminho/do/projeto && . ./.env.production && scripts/prod/backup-postgres.sh >> logs/backup.log 2>&1
```

Teste semanal, usando o backup mais recente escolhido explicitamente:

```cron
20 6 * * 1 cd /caminho/do/projeto && . ./.env.production && scripts/prod/verify-backup.sh /caminho/do/backup.dump.gpg >> logs/backup-verify.log 2>&1
```

Use `BACKUP_OFFSITE_COMMAND` para enviar artefato e checksum a um destino externo. O
comando recebe o caminho em `$1`; exemplo: `rclone copy "$1" remote:guild-backups`.
