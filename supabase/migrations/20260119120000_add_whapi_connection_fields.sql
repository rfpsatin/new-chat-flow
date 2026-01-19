-- Add Whapi connection status fields to empresas
alter table public.empresas
  add column if not exists whapi_status text,
  add column if not exists whapi_status_raw text,
  add column if not exists whapi_status_updated_at timestamptz,
  add column if not exists whapi_last_error text,
  add column if not exists whapi_last_qr_at timestamptz;

comment on column public.empresas.whapi_status is 'Normalized Whapi connection status for UI';
comment on column public.empresas.whapi_status_raw is 'Raw Whapi status/state as returned by API/webhook';
comment on column public.empresas.whapi_status_updated_at is 'Timestamp of last Whapi status update';
comment on column public.empresas.whapi_last_error is 'Last error message when fetching Whapi status or QR';
comment on column public.empresas.whapi_last_qr_at is 'Timestamp of the last QR generation request';
