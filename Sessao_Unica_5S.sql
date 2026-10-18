-- Programa 5S: uma sessão ativa por conta no portal.
-- Projeto p_3634611143. Execute todo o arquivo no Editor SQL.
-- Reexecutável. Não altera tabelas do sistema de autenticação.
-- A ativação exige a versão atual do portal. EXEs antigos não enviam a identificação.
set search_path to proj_p_3634611143, public;
create table if not exists sessoes_5s (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null unique default auth.uid(),
 terminal uuid not null,
 iniciada_em timestamptz not null default now()
);
alter table sessoes_5s enable row level security;
-- Sem leitura/escrita direta pelo navegador. Somente as funções abaixo.
revoke all on sessoes_5s from public, anon, authenticated;
create or replace function proj_p_3634611143.terminal_5s() returns uuid
language plpgsql stable set search_path = pg_catalog as $$
declare valor text;
begin
 valor := coalesce(nullif(current_setting('request.headers',true),''),'{}')::jsonb->>'x-programa5s-terminal';
 if valor is null or valor !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return null; end if;
 return valor::uuid;
end $$;
create or replace function proj_p_3634611143.sessao_5s_ativa() returns boolean
language sql stable security definer set search_path = pg_catalog as $$
 select auth.uid() is not null and exists (
  select 1 from proj_p_3634611143.sessoes_5s
  where user_id=auth.uid() and terminal=proj_p_3634611143.terminal_5s()
 ) and proj_p_3634611143.membro_5s()
$$;
create or replace function proj_p_3634611143.iniciar_sessao_5s(novo_terminal uuid) returns boolean
language plpgsql security definer set search_path = pg_catalog as $$
begin
 if auth.uid() is null or not coalesce(proj_p_3634611143.membro_5s(),false) then
  raise exception 'Acesso não autorizado pelo administrador.' using errcode='42501';
 end if;
 if novo_terminal is null or novo_terminal is distinct from proj_p_3634611143.terminal_5s() then
  raise exception 'Identificação do terminal ausente ou inválida.' using errcode='42501';
 end if;
 insert into proj_p_3634611143.sessoes_5s(user_id,terminal)
 values(auth.uid(),novo_terminal)
 on conflict(user_id) do update set terminal=excluded.terminal,iniciada_em=now();
 return true;
end $$;
create or replace function proj_p_3634611143.encerrar_sessao_5s() returns boolean
language plpgsql security definer set search_path = pg_catalog as $$
begin
 delete from proj_p_3634611143.sessoes_5s
 where user_id=auth.uid() and terminal=proj_p_3634611143.terminal_5s();
 return true;
end $$;
revoke all on function proj_p_3634611143.terminal_5s() from public,anon;
revoke all on function proj_p_3634611143.sessao_5s_ativa() from public,anon;
revoke all on function proj_p_3634611143.iniciar_sessao_5s(uuid) from public,anon;
revoke all on function proj_p_3634611143.encerrar_sessao_5s() from public,anon;
grant execute on function proj_p_3634611143.terminal_5s(),proj_p_3634611143.sessao_5s_ativa(),proj_p_3634611143.iniciar_sessao_5s(uuid),proj_p_3634611143.encerrar_sessao_5s() to authenticated;
-- Policies RESTRICTIVE se somam às regras de autor/admin já existentes.
-- Não concedem novos acessos às tabelas.
drop policy if exists sessao_unica_auditorias on auditorias_5s;
create policy sessao_unica_auditorias on auditorias_5s as restrictive for all to authenticated
 using(proj_p_3634611143.sessao_5s_ativa()) with check(proj_p_3634611143.sessao_5s_ativa());
drop policy if exists sessao_unica_membros on membros_5s;
create policy sessao_unica_membros on membros_5s as restrictive for all to authenticated
 using(proj_p_3634611143.sessao_5s_ativa()) with check(proj_p_3634611143.sessao_5s_ativa());
-- Caso a exclusão definitiva já esteja configurada, proteger o registro de exclusões.
do $$ begin
 if to_regclass('proj_p_3634611143.auditorias_excluidas_5s') is not null then
  execute 'drop policy if exists sessao_unica_exclusoes on proj_p_3634611143.auditorias_excluidas_5s';
  execute 'create policy sessao_unica_exclusoes on proj_p_3634611143.auditorias_excluidas_5s as restrictive for all to authenticated using(proj_p_3634611143.sessao_5s_ativa()) with check(proj_p_3634611143.sessao_5s_ativa())';
 end if;
end $$;
