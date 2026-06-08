# Atualizacao Staff - consolidado desde 16h

**PT-BR**

Consolidado das mudancas feitas desde 16h.

- A Staff agora tem uma area de "Updates de pedidos pendentes" dentro da tela de Pedidos.
- Quando o player envia print novo de Item Request, o pedido fica aguardando revisao da Staff.
- A Staff ve player, item, print original, print novo e quantidade atual.
- Antes de aprovar, a Staff informa quantos itens ainda faltam para aquele pedido.
- Ao aprovar, o sistema atualiza o "faltam X", limpa avisos de update e registra auditoria.
- A tela de Presenca do player agora mostra Presente, Ausente ou Pendente por evento.
- Eventos cancelados foram removidos do historico de presenca dos players.
- Foi criado endpoint novo para historico de presenca por player.
- A lista "Minhas pendencias" passou a traduzir pendencias pelo frontend usando metadados da API.
- O script de changelog agora aceita nome temporario no envio.
- O nome padrao futuro dos webhooks de changelog foi ajustado para "Aristolfo, um pouco maior que o anão".

Validacao tecnica:

- Migration de revisao de update dos pedidos aplicada no PostgreSQL.
- Prisma Client gerado.
- Build da API passou.
- Build da Web passou.
- Docker rebuildado.
- API e Web subiram sem erro relevante nos logs.
