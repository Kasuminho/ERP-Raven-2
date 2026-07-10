# Plano de provider de rate limit

**PT-BR**

- A ultima fatia do roadmap 2026-07 foi publicada: documentei o plano para provider Redis/gateway de rate limit, sem ativar nada por padrao.
- O estado atual continua com `InMemoryRateLimitStore`, adequado para instancia unica da G3X.
- O plano define provider Redis atras de `RateLimitStore`, alternativa por gateway, variaveis de ambiente por nome, testes, health e rollback.
- Nao muda comportamento de login, upload, API ou deploy agora; e preparacao para multi-replica ou nova guilda.
- O deploy foi verificado em producao com `/health` respondendo a versao `c808c07`.

Aristolfo fechou a planilha do futuro sem ligar a tomada errada no presente. Raro momento de sabedoria operacional.
