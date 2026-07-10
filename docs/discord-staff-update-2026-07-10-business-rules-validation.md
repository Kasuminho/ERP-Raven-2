# Validacao forte em regras da guilda

**PT-BR**

- A terceira fatia do roadmap de manutencao foi publicada: `business-rules` agora valida chave de regra e body antes de atualizar configuracoes Staff.
- O controller aceita apenas chaves conhecidas e exige `{ value }` nas atualizacoes.
- `value` continua flexivel para cada regra, incluindo `maintenanceMode`, sem ativar whitelist global.
- Foram adicionados testes para chave desconhecida, body sem `value` e campo extra.
- O deploy foi verificado em producao com `/health` respondendo a versao `9930372`.

Aristolfo botou etiqueta nas alavancas da sala de maquinas. Ainda da para operar, so ficou mais dificil chutar a parede errada.
