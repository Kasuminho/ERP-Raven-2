**PT-BR**

🛡️ **Guia da Staff - Plataforma G3X**

Este guia cobre o uso do painel interno da Staff. O site é a fonte principal de gestão; Discord é camada de login e avisos.

**1. Acesso Staff**
• Entre pelo Discord.
• O menu Staff aparece apenas para quem tem role STAFF ou ADMIN.
• Players comuns não veem as ferramentas internas.

**2. Hub Staff**
No hub Staff ficam os atalhos:
• Players.
• DKP.
• Reviews.
• Entregas.
• Eventos.
• Itens.
• Codex.
• Progresso.
• Anúncios.
• Drops.

**3. Players**
Use para:
• Consultar players cadastrados.
• Ver Discord ID, nickname, classe, layer e roles.
• Abrir perfil individual.
• Ver histórico de drops, progresso e transações.

**4. DKP Staff**
Use `/dashboard/staff/dkp`.

Funciona assim:
• Pesquise por player, Discord ou ID.
• Veja total, locked e available.
• Informe valor positivo.
• Use Adicionar para somar DKP.
• Use Remover para tirar DKP.
• Motivo é obrigatório.
• Cada ajuste gera transação `ADMIN_ADJUSTMENT`.
• O actor vem da staff logada.
• Log recente aparece no painel do player selecionado.

Recomendação:
• Sempre escreva motivo claro.
• Evite ajuste sem referência operacional.

**5. Eventos e Presença**
Use Eventos para:
• Criar evento.
• Selecionar o evento.
• Marcar presença dos players.
• Finalizar evento.

Ao finalizar:
• O evento trava.
• DKP é distribuído automaticamente.
• Presença entra no cálculo de attendance.

Importante:
• Player não marca presença sozinho.
• Staff é responsável pela validação.

**6. Catálogo de Itens**
Use Itens para:
• Cadastrar item.
• Anexar imagens PT/EN.
• Editar nomes, tier, tipo, categoria e status.
• Filtrar catálogo.
• Fazer alteração em massa.

Filtros:
• Busca por nome/tipo.
• Tier.
• Tipo.
• Grupo.
• Categoria.
• Ativo/inativo.

Seleção em massa:
• Pode marcar itens em uma busca.
• Trocar filtro.
• Marcar outros.
• A seleção continua.
• Só limpa depois de aplicar ação.

**7. Abrir Leilão por Item**
Na tela de Itens:
• Escolha fluxo `Leilão`.
• Defina quantidade por item.
• Abra individualmente ou em massa.

Regras automáticas:
• T2/T3 seguem STANDARD.
• T4/Legendary seguem regras de ALL IN/review conforme engine.
• Título do leilão usa o item cadastrado.

**8. Abrir Interesse por Item**
Na tela de Itens:
• Escolha fluxo `Interesse`.
• Escolha PvE ou PvP.
• Defina data/hora de fechamento.
• Publique individualmente ou em massa.

Título:
• Sempre `Nome PT / Nome EN`, igual ao bot antigo.

Depois:
• Players declaram interesse com print.
• Staff fecha a declaração.
• Staff seleciona quem recebeu.
• Entrega é registrada em Drops.

**9. Staff Review**
Use Reviews para:
• Ver auctions pendentes.
• Analisar ranking/candidatos.
• Aprovar vencedor.
• Rejeitar/relistar.

Regras:
• Staff não deve aprovar player inelegível.
• T4/Legendary respeitam camada e elegibilidade.
• Toda decisão sensível gera audit log.

**10. Entregas de Leilão**
Use Entregas para:
• Ver leilões finalizados com vencedor.
• Anexar prova de envio.
• Registrar entrega.
• Anunciar entrega no Discord.

Depois de registrar:
• Drop entra no histórico.
• Player vê no perfil/drops.

**11. Drops**
Use Drops para:
• Consultar histórico geral de entregas.
• Validar entregas por player.
• Conferir origem de drops por leilão, interesse ou request.

**12. Item Requests**
Fila de pedidos requestáveis:
• Staff pode ver a fila por item.
• Cada player só pode manter um pedido ativo por categoria comum.
• Bosses especiais podem aparecer em múltiplas filas.
• Entrega parcial atualiza quantidade restante.
• Entrega completa remove da fila e registra DropHistory.

**13. Codex**
Use Codex Staff para:
• Ver pedidos do mais antigo para o mais novo.
• Enviar ou marcar como enviado.
• Aguardar confirmação do player.
• Se falhar, o player volta para o fim da fila.
• Se confirmar sucesso, imagem pode ser removida do Drive pelo fluxo.

**14. Progresso**
Use Progresso para:
• Revisar prints de Status e Fenda Dimensional.
• Confirmar CP.
• Confirmar andar da fenda.
• Aprovar e atualizar perfil.
• Rejeitar com nota.

Categorias sem review ficam salvas como histórico visual.

**15. Anúncios**
Use Anúncios para:
• Criar aviso operacional.
• Definir título, descrição e horário.
• Enviar lembretes automáticos no Discord.

Anúncios não são presença.
Presença e DKP continuam no fluxo de Eventos.

**16. Webhooks**
Os avisos são separados por área:
• Anúncios.
• Leilões.
• Drops entregues.
• Presença.
• Staff Review.
• DKP Log.
• Updates públicos.
• Updates internos Staff.

Todos os webhooks postam como `Aristolfo, o grande`.

**17. Boas práticas**
• Sempre registrar motivo em ajuste de DKP.
• Conferir print antes de aprovar progresso.
• Não registrar presença sem validação.
• Usar interesse para distribuição por análise.
• Usar leilão para disputa por DKP.
• Usar Drops para auditar entrega.
• Evitar corrigir histórico manualmente sem motivo.

**EN**

🛡️ **Staff Guide - G3X Platform**

This guide covers the internal Staff panel. The website is the main management source; Discord is used for login and announcements.

**1. Staff Access**
• Login with Discord.
• Staff menu appears only for STAFF or ADMIN roles.
• Regular players do not see internal tools.

**2. Staff Hub**
The Staff hub includes:
• Players.
• DKP.
• Reviews.
• Deliveries.
• Events.
• Items.
• Codex.
• Progress.
• Announcements.
• Drops.

**3. Players**
Use it to:
• Check registered players.
• See Discord ID, nickname, class, layer, and roles.
• Open individual profiles.
• Review drops, progress, and transactions.

**4. Staff DKP**
Use `/dashboard/staff/dkp`.

Flow:
• Search by player, Discord, or ID.
• See total, locked, and available DKP.
• Enter a positive value.
• Add DKP with Add.
• Remove DKP with Remove.
• Reason is required.
• Every adjustment creates an `ADMIN_ADJUSTMENT` transaction.
• Actor is the logged-in Staff user.
• Recent logs appear for the selected player.

Recommendation:
• Always write a clear reason.
• Avoid adjustments without operational context.

**5. Events and Attendance**
Use Events to:
• Create an event.
• Select it.
• Mark player attendance.
• Finalize the event.

On finalization:
• Event is locked.
• DKP is distributed automatically.
• Attendance feeds attendance percentage.

Important:
• Players do not mark themselves present.
• Staff validates attendance.

**6. Item Catalog**
Use Items to:
• Register items.
• Attach PT/EN images.
• Edit names, tier, type, category, and status.
• Filter catalog.
• Bulk edit.

Filters:
• Search by name/type.
• Tier.
• Type.
• Group.
• Category.
• Active/inactive.

Bulk selection:
• Select items in one search.
• Change filters.
• Select more.
• Selection remains.
• It clears only after applying the action.

**7. Open Auction by Item**
On Items:
• Choose `Auction` flow.
• Set quantity per item.
• Open individually or in bulk.

Automatic rules:
• T2/T3 use STANDARD.
• T4/Legendary use ALL IN/review rules according to the engine.
• Auction title uses the catalog item.

**8. Open Interest by Item**
On Items:
• Choose `Interest` flow.
• Choose PvE or PvP.
• Set closing date/time.
• Publish individually or in bulk.

Title:
• Always `PT Name / EN Name`, like the old bot.

Afterward:
• Players declare interest with screenshot.
• Staff closes declaration.
• Staff selects recipients.
• Delivery is registered in Drops.

**9. Staff Review**
Use Reviews to:
• See pending auctions.
• Analyze ranking/candidates.
• Approve winner.
• Reject/relist.

Rules:
• Staff should not approve ineligible players.
• T4/Legendary respect layer and eligibility.
• Sensitive decisions generate audit logs.

**10. Auction Deliveries**
Use Deliveries to:
• See finalized auctions with winners.
• Attach delivery proof.
• Register delivery.
• Announce delivery on Discord.

After registering:
• Drop enters history.
• Player sees it in profile/drops.

**11. Drops**
Use Drops to:
• Check global delivery history.
• Validate deliveries by player.
• Review source by auction, interest, or request.

**12. Item Requests**
Request queue:
• Staff can see queues by item.
• Each player can keep one active request per common category.
• Special bosses can appear in multiple queues.
• Partial delivery updates remaining quantity.
• Complete delivery removes from queue and creates DropHistory.

**13. Codex**
Use Staff Codex to:
• See oldest requests first.
• Send or mark as sent.
• Wait for player confirmation.
• If it fails, player returns to the end of the queue.
• If successful, image can be removed from Drive by the flow.

**14. Progress**
Use Progress to:
• Review Status and Dimensional Rift screenshots.
• Confirm CP.
• Confirm rift floor.
• Approve and update profile.
• Reject with note.

Categories without review are saved as visual history.

**15. Announcements**
Use Announcements to:
• Create operational announcements.
• Set title, description, and time.
• Send automatic Discord reminders.

Announcements are not attendance.
Attendance and DKP remain in Events.

**16. Webhooks**
Notifications are separated by area:
• Announcements.
• Auctions.
• Delivered drops.
• Attendance.
• Staff Review.
• DKP Log.
• Public updates.
• Internal Staff updates.

All webhooks post as `Aristolfo, o grande`.

**17. Best Practices**
• Always register reasons for DKP adjustments.
• Check screenshots before approving progress.
• Do not mark attendance without validation.
• Use interest for reviewed distribution.
• Use auctions for DKP competition.
• Use Drops for delivery audit.
• Avoid manual history corrections without reason.

**ES**

🛡️ **Guia de Staff - Plataforma G3X**

Este guia cubre el panel interno de Staff. El sitio es la fuente principal de gestion; Discord se usa para login y anuncios.

**1. Acceso Staff**
• Entra con Discord.
• El menu Staff aparece solo para roles STAFF o ADMIN.
• Players normales no ven herramientas internas.

**2. Hub Staff**
El hub Staff incluye:
• Players.
• DKP.
• Reviews.
• Entregas.
• Eventos.
• Items.
• Codex.
• Progreso.
• Anuncios.
• Drops.

**3. Players**
Usalo para:
• Consultar players registrados.
• Ver Discord ID, nickname, clase, layer y roles.
• Abrir perfiles individuales.
• Revisar drops, progreso y transacciones.

**4. Staff DKP**
Usa `/dashboard/staff/dkp`.

Flujo:
• Busca por player, Discord o ID.
• Ve total, locked y available.
• Ingresa valor positivo.
• Agrega DKP con Add.
• Remueve DKP con Remove.
• Motivo obligatorio.
• Cada ajuste crea transaccion `ADMIN_ADJUSTMENT`.
• El actor es la Staff logada.
• Log reciente aparece para el player seleccionado.

Recomendacion:
• Siempre escribe motivo claro.
• Evita ajustes sin contexto operacional.

**5. Eventos y Asistencia**
Usa Eventos para:
• Crear evento.
• Seleccionarlo.
• Marcar asistencia.
• Finalizar evento.

Al finalizar:
• El evento queda bloqueado.
• DKP se distribuye automaticamente.
• Asistencia alimenta el porcentaje.

Importante:
• Players no marcan asistencia solos.
• Staff valida asistencia.

**6. Catalogo de Items**
Usa Items para:
• Registrar items.
• Adjuntar imagenes PT/EN.
• Editar nombres, tier, tipo, categoria y status.
• Filtrar catalogo.
• Editar en masa.

Filtros:
• Busqueda por nombre/tipo.
• Tier.
• Tipo.
• Grupo.
• Categoria.
• Activo/inactivo.

Seleccion masiva:
• Marca items en una busqueda.
• Cambia filtros.
• Marca mas items.
• La seleccion permanece.
• Solo se limpia despues de aplicar la accion.

**7. Abrir Subasta por Item**
En Items:
• Elige flujo `Subasta`.
• Define cantidad por item.
• Abre individualmente o en masa.

Reglas automaticas:
• T2/T3 usan STANDARD.
• T4/Legendary usan ALL IN/review segun engine.
• El titulo usa el item del catalogo.

**8. Abrir Interes por Item**
En Items:
• Elige flujo `Interes`.
• Elige PvE o PvP.
• Define fecha/hora de cierre.
• Publica individualmente o en masa.

Titulo:
• Siempre `Nombre PT / Nombre EN`, como el bot antiguo.

Despues:
• Players declaran interes con captura.
• Staff cierra declaracion.
• Staff selecciona quienes recibieron.
• Entrega se registra en Drops.

**9. Staff Review**
Usa Reviews para:
• Ver subastas pendientes.
• Analizar ranking/candidatos.
• Aprobar ganador.
• Rechazar/relistar.

Reglas:
• Staff no debe aprobar players inelegibles.
• T4/Legendary respetan layer y elegibilidad.
• Decisiones sensibles generan audit log.

**10. Entregas de Subasta**
Usa Entregas para:
• Ver subastas finalizadas con ganador.
• Adjuntar prueba de envio.
• Registrar entrega.
• Anunciar entrega en Discord.

Despues:
• Drop entra en historial.
• Player lo ve en perfil/drops.

**11. Drops**
Usa Drops para:
• Consultar historial global.
• Validar entregas por player.
• Revisar origen por subasta, interes o request.

**12. Item Requests**
Cola de pedidos:
• Staff ve filas por item.
• Cada player mantiene un pedido activo por categoria comun.
• Bosses especiales pueden estar en multiples filas.
• Entrega parcial actualiza cantidad restante.
• Entrega completa remueve de fila y crea DropHistory.

**13. Codex**
Usa Staff Codex para:
• Ver pedidos mas antiguos primero.
• Enviar o marcar enviado.
• Esperar confirmacion del player.
• Si falla, player vuelve al final de la cola.
• Si funciona, la imagen puede removerse de Drive por el flujo.

**14. Progreso**
Usa Progreso para:
• Revisar capturas de Status y Fisura Dimensional.
• Confirmar CP.
• Confirmar piso de fenda.
• Aprobar y actualizar perfil.
• Rechazar con nota.

Categorias sin review quedan como historial visual.

**15. Anuncios**
Usa Anuncios para:
• Crear aviso operacional.
• Definir titulo, descripcion y horario.
• Enviar recordatorios automaticos en Discord.

Anuncios no son asistencia.
Asistencia y DKP siguen en Eventos.

**16. Webhooks**
Notificaciones separadas por area:
• Anuncios.
• Subastas.
• Drops entregados.
• Asistencia.
• Staff Review.
• DKP Log.
• Updates publicos.
• Updates internos Staff.

Todos los webhooks publican como `Aristolfo, o grande`.

**17. Buenas practicas**
• Siempre registrar motivo en ajustes DKP.
• Revisar prints antes de aprobar progreso.
• No marcar asistencia sin validacion.
• Usar interes para distribucion analizada.
• Usar subasta para disputa por DKP.
• Usar Drops para auditoria de entrega.
• Evitar correcciones manuales sin motivo.
