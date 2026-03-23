-- Fix security definer view by setting security_invoker
ALTER VIEW public.vw_historico_conversas SET (security_invoker = on);