## PT-BR

### Discord mais seguro contra rate limit

Adicionamos uma fila central para envios via webhook do Discord.

Agora as notificacoes sao enviadas uma por vez, com intervalo seguro entre mensagens. Se o Discord responder com rate limit, o sistema respeita o tempo de espera e tenta novamente.

Tambem ajustamos para que falhas do Discord nao derrubem a operacao principal do site. Evento, presenca, DKP e demais registros continuam sendo salvos; se o Discord falhar, a falha fica registrada na auditoria.

### Eventos e presenca

Os cards de evento ficaram mais completos:

- Inicio do evento agora usa horario estilo Discord/Hammertime.
- Finalizacao de evento mostra DKP por pessoa.
- Finalizacao mostra DKP total distribuido.
- Finalizacao mostra quantidade de presentes.
- Finalizacao mostra quantidade de faltantes com base nos players ativos cadastrados.

## EN

### Safer Discord Rate Limit Handling

We added a centralized queue for Discord webhook delivery.

Notifications are now sent one at a time, with a safe delay between messages. If Discord responds with a rate limit, the system waits for the required retry window and sends again.

Discord failures also no longer break the main website operation. Events, attendance, DKP, and records continue to be saved; if Discord fails, the failure is logged in audit.

### Events and Attendance

Event cards are now more useful:

- Event start time now uses Discord/Hammertime formatting.
- Event finalization shows DKP per person.
- Event finalization shows total DKP distributed.
- Event finalization shows present player count.
- Event finalization shows absent player count based on active registered players.

## ES

### Discord mas seguro contra rate limit

Agregamos una cola central para envios por webhook de Discord.

Las notificaciones ahora se envian una por una, con un intervalo seguro entre mensajes. Si Discord responde con rate limit, el sistema espera el tiempo necesario y vuelve a intentar.

Las fallas de Discord tampoco rompen la operacion principal del sitio. Eventos, asistencia, DKP y registros siguen guardandose; si Discord falla, la falla queda registrada en auditoria.

### Eventos y asistencia

Los cards de evento ahora son mas completos:

- El inicio del evento usa formato Discord/Hammertime.
- La finalizacion muestra DKP por persona.
- La finalizacion muestra DKP total distribuido.
- La finalizacion muestra cantidad de presentes.
- La finalizacion muestra cantidad de ausentes segun los players activos registrados.
