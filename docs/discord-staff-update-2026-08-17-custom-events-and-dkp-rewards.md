# Eventos Customizados e DKP Dinâmico

**PT-BR**

- A criação de eventos e séries recorrentes agora aceita pontuação DKP customizada diretamente na interface de criação, sem necessidade de alterar código.
- Foi adicionado o tipo de evento `CUSTOM` para ocasiões especiais, guerras de guilda ou atividades fora do cronograma fixo de bosses.
- Na tela de criação de eventos (`/dashboard/admin/events`), os pontos DKP são pré-preenchidos automaticamente com base no boss selecionado, mas ficam 100% editáveis pela Staff.
- A tela de regras operacionais da Staff (`/dashboard/staff/rules`) recebeu um editor visual para a regra `eventRewards`, permitindo ajustar os valores padrão de DKP de cada tipo sem precisar mexer em JSON cru.
- Todos os cálculos de presença, distribuição de DKP, reversões e auditorias preservam a pontuação configurada no evento.

**Aristolfo, 570 anos de webhook:** agora você pode dar 50 DKP pro evento doidão que você inventou às 3 da manhã sem precisar me acordar pra mexer no backend. Planilha agradece, banco aceita.
