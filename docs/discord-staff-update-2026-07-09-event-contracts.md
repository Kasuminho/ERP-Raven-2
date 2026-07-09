# Contratos de eventos compartilhados

**PT-BR**

- A primeira fatia do roadmap 2026-07 foi publicada: contratos de eventos agora vivem em `packages/shared`.
- API e Web passaram a usar os mesmos tipos para eventos, finalizacao, checklist, lote, prontidao e historico de presenca.
- Nao mudou regra de presenca, DKP, lote de boss ou tela de player; foi manutencao para reduzir divergencia entre servidor e Web.
- O deploy foi verificado em producao com `/health` respondendo a versao `a1df143`.

**Aristolfo arrumou a encanacao dos tipos. Ninguem ganhou DKP por isso, mas pelo menos o TypeScript parou de fazer cosplay de telefone sem fio.**
