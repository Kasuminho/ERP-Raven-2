# Plano de provider de rate limit - 2026-07

Este documento fecha a fatia 12 do roadmap de implantacao 2026-07. Ele planeja
o caminho para Redis/gateway sem ativar nada por padrao na G3X.

## Estado atual

- A API aplica rate limit em OAuth e upload por `createRateLimiter`.
- As regras ficam em `apps/api/src/common/rate-limit/rate-limit.middleware.ts`.
- O contrato de persistencia e `RateLimitStore`, definido em
  `apps/api/src/common/rate-limit/rate-limit.store.ts`.
- O provider padrao e `InMemoryRateLimitStore`.
- Esse desenho e adequado para a stack atual de instancia unica.

## Objetivo

Preparar um provider compartilhado para cenarios futuros de multi-replica ou
multi-guilda, preservando o contrato `RateLimitStore` e mantendo memoria local
como default operacional.

## Fora de escopo

- Nao ativar Redis na G3X agora.
- Nao mudar limites, janelas, mensagens HTTP ou rotas protegidas.
- Nao adicionar segredos, URLs completas ou conteudo de `.env` em docs/logs.
- Nao transformar o Raven em multi-tenant compartilhado.

## Opcoes

### Provider Redis

Redis deve implementar `RateLimitStore` por tras da mesma interface usada pelo
middleware atual. O hit precisa ser atomico por chave, janela e limite.

Recomendacao tecnica:

- usar script Lua ou primitiva equivalente para incrementar e aplicar expiracao
  de forma atomica;
- prefixar chaves por instalacao/guilda para evitar colisao entre stacks;
- expor apenas nome do provider e saude no health, nunca URL;
- manter `InMemoryRateLimitStore` como fallback/default;
- cobrir modo degradado com politica explicita de fail-open ou fail-closed.

### Gateway compartilhado

Um gateway como proxy reverso, edge/WAF ou load balancer pode aplicar limites
antes da API. Essa opcao reduz dependencia de codigo, mas precisa preservar os
mesmos contratos operacionais:

- limites equivalentes para OAuth e upload;
- sinal claro no runbook sobre onde a regra vive;
- smoke que prove 429 em excesso controlado;
- health ou observabilidade separada para o componente de borda.

Gateway e Redis podem coexistir. Para a G3X, gateway deve ser complemento de
borda, nao substituto silencioso de uma regra que a API ainda anuncia.

## Configuracao proposta

Usar nomes de variaveis apenas quando a implementacao existir. Nao registrar
valores em docs, wiki, changelog ou logs.

- `RATE_LIMIT_PROVIDER`: `memory`, `redis` ou `gateway`.
- `RATE_LIMIT_REDIS_URL`: endpoint do Redis, lido apenas pelo servidor.
- `RATE_LIMIT_REDIS_PREFIX`: prefixo logico da instalacao/guilda.
- `RATE_LIMIT_FAIL_OPEN`: define se falha do provider externo libera ou bloqueia.
- `RATE_LIMIT_HEALTH_TIMEOUT_MS`: timeout curto para health do provider externo.

Default esperado:

```text
RATE_LIMIT_PROVIDER=memory
```

## Plano de implementacao futura

1. Manter `InMemoryRateLimitStore` como provider default.
2. Criar `RedisRateLimitStore` implementando `RateLimitStore`.
3. Criar factory de provider, lendo `RATE_LIMIT_PROVIDER`.
4. Garantir que `createRateLimiter()` continue funcionando sem parametro.
5. Adicionar check Staff/health `rate-limit` com provider, status e mensagem
   sanitizada.
6. Adicionar testes para incremento atomico, reset de janela, expiracao,
   limite excedido, falha de Redis e fallback configurado.
7. Documentar runbook de ativacao com smoke em staging/guilda de teste.
8. Ativar por guilda somente depois de Redis provisionado, backup/monitoramento
   definidos e rollback testado.

## Checklist de aceite

- Builds de API e Web continuam sem mudanca de contrato.
- `RATE_LIMIT_PROVIDER` ausente ou `memory` preserva comportamento atual.
- Nenhuma rota nova expoe segredo ou URL de Redis.
- Health Staff diferencia `memory`, `redis ok` e `redis degraded`.
- Teste de concorrencia cobre multiplas chamadas no mesmo bucket.
- Smoke de excesso retorna 429 e headers `RateLimit-*` esperados.
- Rollback documentado: voltar `RATE_LIMIT_PROVIDER=memory` e reiniciar a stack.

## Rollback

Rollback operacional deve ser simples: remover/desativar a configuracao externa,
voltar para `RATE_LIMIT_PROVIDER=memory` e redeployar/reiniciar a API. Como o
estado de rate limit e temporario por janela, nao ha migracao de dados a reverter.

## Decisao atual

Em 2026-07-10, a decisao e nao implementar nem ativar Redis/gateway na G3X. O
codigo atual continua correto para instancia unica, e este plano fica como guia
para a proxima fase de multi-replica ou nova guilda.
