-- Set security invoker for the view (uses caller's permissions)
ALTER VIEW vw_fila_atendimento SET (security_invoker = on);