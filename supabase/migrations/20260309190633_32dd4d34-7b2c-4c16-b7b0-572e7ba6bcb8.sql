-- Fix backfilled URLs to use media_id (document.id) instead of message_id
UPDATE mensagens_ativas
SET media_url = concat(
    'https://hyizldxjiwjeruxqrqbv.supabase.co/functions/v1/whapi-media?empresa_id=',
    empresa_id::text,
    '&media_id=',
    replace(replace(payload->'document'->>'id', '+', '%2B'), '/', '%2F'),
    '&filename=',
    replace(replace(COALESCE(payload->'document'->>'filename', payload->'document'->>'file_name', 'arquivo'), ' ', '%20'), '+', '%2B')
  )
WHERE media_kind = 'document'
  AND payload->'document'->>'id' IS NOT NULL;