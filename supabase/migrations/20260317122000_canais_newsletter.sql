-- Converter listas de transmissão em canais/newsletters
-- É necessário truncar as duas tabelas na mesma instrução por causa da FK.
truncate table public.lista_transmissao_contatos, public.listas_transmissao;

alter table public.listas_transmissao
  rename to canais_newsletter;

alter table public.lista_transmissao_contatos
  rename to canal_newsletter_contatos;

comment on table public.canais_newsletter is 'Canais / newsletters de transmissão por empresa (ex: canal oficial).';
comment on table public.canal_newsletter_contatos is 'Contatos vinculados a cada canal/newsletter lógico.';

-- Guardar link de convite do canal (WhatsApp / Whapi)
alter table public.canais_newsletter
  add column if not exists invite_url text;

-- Deixar relacionamento mais explícito: canal_newsletter_contatos.canal_id
alter table public.canal_newsletter_contatos
  rename column lista_id to canal_id;

