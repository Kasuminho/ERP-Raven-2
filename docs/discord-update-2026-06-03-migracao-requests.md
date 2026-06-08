**PT-BR**

🔧 **Correção da migração dos Item Requests**

Também migramos a fila ativa de pedidos/rankings do bot antigo:

• **47 pedidos ativos** importados.
• **11 rankings** preservados.
• Todos os pedidos foram vinculados ao catálogo atual.
• O ranking, quantidade restante, nome do player, thread antiga e Discord ID foram preservados.
• Jogadores já cadastrados foram vinculados direto ao player do site.
• Quem ainda não entrou no site continua preservado por Discord ID para manter o histórico.
• A leitura dos IDs do Discord foi ajustada para evitar perda de precisão em snowflakes antigos do SQLite.

**EN**

🔧 **Item Request migration fix**

We also migrated the active request/ranking queue from the old bot:

• **47 active requests** imported.
• **11 rankings** preserved.
• All requests are linked to the current catalog.
• Rank position, remaining quantity, player name, old thread, and Discord ID were preserved.
• Existing registered users were linked directly to their website player profile.
• Users who have not joined the website yet are still preserved by Discord ID.
• Discord ID reading was adjusted to avoid precision loss on old SQLite snowflakes.

**ES**

🔧 **Corrección de la migración de Item Requests**

También migramos la fila activa de pedidos/rankings del bot antiguo:

• **47 pedidos activos** importados.
• **11 rankings** preservados.
• Todos los pedidos fueron vinculados al catálogo actual.
• Ranking, cantidad restante, nombre del player, thread antigua y Discord ID fueron preservados.
• Los usuarios ya registrados fueron vinculados directamente al perfil del sitio.
• Quienes todavía no entraron al sitio siguen preservados por Discord ID.
• La lectura de IDs de Discord fue ajustada para evitar pérdida de precisión en snowflakes antiguos de SQLite.
