# Tela Staff de interesses componentizada

**PT-BR**

- A proxima fatia do roadmap 2026-07 foi publicada: `/dashboard/staff/interests` agora usa componentes locais da propria rota.
- A pagina ficou fina, o conteudo principal foi movido para `_components/staff-interests-page-content.tsx` e os filtros ficaram em componente dedicado.
- Nao muda fluxo, texto, contrato da API, votacao, desempate, entrega nem comparador sensivel da Staff; e manutencao para reduzir arquivo gigante.
- O deploy foi verificado em producao com `/health` respondendo a versao `de2f30b`.

**Aristolfo, 570 anos de webhook:** mesma tela, menos parede de codigo. A Staff agradece sem saber exatamente por que.
