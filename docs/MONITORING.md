# Monitoramento externo

O monitor precisa rodar fora da VPS da aplicacao. Um monitor dentro da mesma maquina
fica mudo justamente quando host, Docker, rede ou disco falham.

## Uptime Kuma

Em um host independente:

```bash
docker compose -f docker-compose.monitoring.yml up -d
```

Publique a porta `3001` por HTTPS apenas para a equipe e crie estes monitores:

| Nome | Tipo | Alvo | Intervalo | Condicao |
| --- | --- | --- | --- | --- |
| ERP Raven API | HTTP(s) | `https://app.guild-g3x.com.br/api/v1/health` | 60 s | HTTP 200 |
| ERP Raven Web | HTTP(s) | `https://app.guild-g3x.com.br/login` | 60 s | HTTP 200 e palavra `Discord` |
| Certificado | HTTP(s) | `https://app.guild-g3x.com.br` | 6 h | alerta de expiracao em 14 dias |

Configure no minimo dois destinos de notificacao independentes. URLs e tokens ficam
somente no volume do Uptime Kuma, nunca no Git.

## Recursos do host

O Uptime Kuma mede disponibilidade externa, nao disco e memoria. No ICP, configure
alertas para disco e inodes acima de 80%, memoria acima de 90% por 10 minutos,
container reiniciando ou `unhealthy`, PostgreSQL indisponivel e ausencia de backup novo
por mais de 26 horas.

O health privado tambem denuncia backup verificado antigo lendo
`BACKUP_STATUS_FILE` (`/app/backups/last-verified-backup.json` por padrao). Mantenha
`${BACKUP_DIR}` montado no container da API como read-only para o painel Staff e o
health privado enxergarem o marcador gerado por `verify-backup.sh`.

O job de backup deve executar `verify-backup.sh` ao menos semanalmente. O destino
off-site deve alertar independentemente quando nao receber um arquivo no periodo.

## Teste do alarme

Uma vez por trimestre, crie uma janela de manutencao, pare temporariamente o proxy e
confirme o recebimento e a recuperacao do alerta. Registre data, responsavel e canais
que receberam a notificacao.
