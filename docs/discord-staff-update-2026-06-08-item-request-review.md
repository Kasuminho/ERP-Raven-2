# Atualizacao Staff - revisao de updates dos pedidos

**PT-BR**

Fluxo novo para updates de Item Request.

- Quando um player envia um print novo de update, o pedido agora fica como aguardando revisao da Staff.
- A Staff ganhou uma area "Updates de pedidos pendentes" dentro da tela de Pedidos.
- Nessa area aparece o player, item pedido, print original, print novo e a quantidade atual.
- Antes de aprovar, a Staff informa quantos itens ainda faltam para aquele pedido.
- Ao aprovar, o sistema atualiza o "faltam X", limpa os avisos de update e registra auditoria.
- O player passa a ver que o update dele esta aguardando validacao, em vez de parecer que sumiu.

Validado:

- Migration aplicada.
- Build da API passou.
- Build da Web passou.
- Docker rebuildado e containers online.

**EN**

New Item Request update review flow.

- When a player sends a new update screenshot, the request now waits for Staff review.
- Staff now has a "Pending request updates" area inside the Requests page.
- It shows the player, requested item, original screenshot, new screenshot, and current quantity.
- Before approving, Staff sets how many items are still missing for that request.
- On approval, the system updates the remaining quantity, clears update warnings, and writes an audit log.
- Players now see that their update is waiting for validation instead of feeling like it disappeared.

Validated:

- Migration applied.
- API build passed.
- Web build passed.
- Docker rebuilt and containers online.

**ES**

Nuevo flujo de revision para updates de Item Request.

- Cuando un player envia una captura nueva de update, el pedido ahora queda esperando revision de Staff.
- Staff tiene una area "Updates de pedidos pendientes" dentro de la pagina de Pedidos.
- Muestra el player, item pedido, captura original, captura nueva y cantidad actual.
- Antes de aprobar, Staff define cuantos items siguen faltando para ese pedido.
- Al aprobar, el sistema actualiza la cantidad restante, limpia los avisos de update y registra auditoria.
- El player ahora ve que su update esta esperando validacion, en vez de parecer que desaparecio.

Validado:

- Migration aplicada.
- Build de API aprobado.
- Build de Web aprobado.
- Docker reconstruido y containers online.
