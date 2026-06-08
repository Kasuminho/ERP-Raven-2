PT
- Ajustei a limpeza de imagens do Codex no Google Drive.
- Quando o Drive responde que o arquivo ja nao existe, o sistema agora considera a limpeza como concluida em vez de gerar CODEX_REQUEST_IMAGE_DELETE_FAILED.
- Isso evita logs falsos de erro quando o arquivo ja foi removido anteriormente.

EN
- Improved Codex image cleanup on Google Drive.
- When Drive says the file no longer exists, the system now treats cleanup as completed instead of creating CODEX_REQUEST_IMAGE_DELETE_FAILED.
- This avoids false error logs when the file was already removed.

ES
- Mejore la limpieza de imagenes de Codex en Google Drive.
- Cuando Drive responde que el archivo ya no existe, el sistema ahora considera la limpieza como completada en vez de generar CODEX_REQUEST_IMAGE_DELETE_FAILED.
- Esto evita logs falsos de error cuando el archivo ya fue eliminado antes.
