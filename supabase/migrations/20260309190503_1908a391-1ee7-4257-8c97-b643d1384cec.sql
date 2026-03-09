-- Backfill existing document messages with media fields
UPDATE mensagens_ativas
SET
  media_kind = 'document',
  media_filename = COALESCE(payload->'document'->>'filename', payload->'document'->>'file_name'),
  media_mime = payload->'document'->>'mime_type',
  media_url = concat(
    'https://hyizldxjiwjeruxqrqbv.supabase.co/functions/v1/whapi-media?empresa_id=',
    empresa_id::text,
    '&message_id=',
    replace(replace(payload->>'id', '+', '%2B'), '/', '%2F'),
    '&filename=',
    replace(replace(COALESCE(payload->'document'->>'filename', payload->'document'->>'file_name', 'arquivo'), ' ', '%20'), '+', '%2B')
  )
WHERE payload->>'type' = 'document'
  AND media_url IS NULL
  AND payload->'document' IS NOT NULL;