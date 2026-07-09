# Tela de requests componentizada

**PT-BR**

- A proxima fatia do roadmap 2026-07 foi publicada: `/dashboard/item-requests` agora usa componentes locais da propria rota.
- `page.tsx` ficou como entrada com guard, os paineis player/Staff foram separados e os blocos reutilizados de forecast, sugestoes e prioridade ganharam arquivo proprio.
- Nao mudou UX, regra de fila, regra T3, upload, entrega, visibilidade de players nem contrato da API; foi manutencao para reduzir arquivo gigante e facilitar as proximas fatias.
- O deploy foi verificado em producao com `/health` respondendo a versao `5dae54d`.

**Aristolfo dividiu a tela de requests em gavetas. Continua tudo no mesmo armario, so parou de cair coisa quando abre a porta.**
