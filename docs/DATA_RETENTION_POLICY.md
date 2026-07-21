# Politica de retencao e exclusao

Revisao: 2026-07-21. Aplica-se aos dados sociais adicionados pelo Guild Operating System.

| Dado | Retencao operacional | Exclusao/redacao |
| --- | --- | --- |
| Ausencia | intervalo ativo e 90 dias para contexto operacional | motivo deve ser removido apos 90 dias; registro pode ser eliminado apos 365 dias quando nao sustentar trial/caso em revisao |
| Pulso anonimo | notas agregadas; texto pelo prazo configurado de 1-90 dias | cron diario apaga texto aberto vencido; resposta numerica continua sem identidade |
| Caso privado | enquanto aberto e ate 365 dias apos resolucao | revisao humana antes de redigir mensagens; auditoria estrutural pode manter ids/estado sem conteudo privado |
| Trial/onboarding | durante jornada e historico operacional necessario | nota Staff deve ser revisada quando a jornada fecha; nao reutilizar como score permanente |
| Indisponibilidade Staff | periodo atual/futuro | periodos vencidos podem ser eliminados apos 180 dias; motivo nao entra em avaliacao disciplinar |
| Digest/recibos | chave de periodo e estado de leitura | sem copia de conteudo privado de terceiros; artefatos de smoke ficam 30 dias |
| Playbook/licao | versoes e origem operacional | versao publicada e imutavel; notas Staff seguem acesso restrito e nao aparecem ao player |
| Validacao de produto | entrevistas anonimizadas e snapshots semanais ate a decisao da campanha | revisar sinteses em ate 180 dias apos a decisao; redigir qualquer identidade/conteudo privado inserido por engano, preservando apenas perfil e conclusao agregada |

Qualquer expurgo automatico novo precisa de migration/teste, auditoria agregada e validacao de que nao quebra obrigacao operacional. Casos sob revisao, disputa ou incidente ficam em hold documentado; isso nao autoriza retencao indefinida por padrao.
