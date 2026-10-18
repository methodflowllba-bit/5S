-- Programa 5S / Method Flow — projeto p_3634611143
-- Execute no Editor SQL do projeto. Reexecutável, sem BEGIN/COMMIT.
set search_path to proj_p_3634611143, public;
create table if not exists membros_5s (
 id uuid primary key default gen_random_uuid(),
 email text not null unique check(email = lower(trim(email))),
 nome text not null,
 perfil text not null check(perfil in ('usuario','administrador')),
 ativo boolean not null default true,
 criado_em timestamptz not null default now()
);
alter table membros_5s enable row level security;
-- Funções com schema fixo para evitar recursão nas policies e desvio de search_path.
create or replace function proj_p_3634611143.admin_5s() returns boolean
language sql stable security definer set search_path = pg_catalog
as $$ select lower(auth.email()) = 'alvaro.batistella@method-flow.com'
 or exists(select 1 from proj_p_3634611143.membros_5s m where m.email=lower(auth.email()) and m.ativo and m.perfil='administrador') $$;
create or replace function proj_p_3634611143.membro_5s() returns boolean
language sql stable security definer set search_path = pg_catalog
as $$ select lower(auth.email()) = 'alvaro.batistella@method-flow.com'
 or exists(select 1 from proj_p_3634611143.membros_5s m where m.email=lower(auth.email()) and m.ativo) $$;
revoke all on function proj_p_3634611143.admin_5s() from public, anon;
revoke all on function proj_p_3634611143.membro_5s() from public, anon;
grant execute on function proj_p_3634611143.admin_5s(), proj_p_3634611143.membro_5s() to authenticated;
drop policy if exists membros_leitura on membros_5s;
create policy membros_leitura on membros_5s for select to authenticated using(email=lower(auth.email()) or proj_p_3634611143.admin_5s());
drop policy if exists membros_insercao on membros_5s;
create policy membros_insercao on membros_5s for insert to authenticated with check(proj_p_3634611143.admin_5s() and email <> 'alvaro.batistella@method-flow.com');
drop policy if exists membros_atualizacao on membros_5s;
create policy membros_atualizacao on membros_5s for update to authenticated using(proj_p_3634611143.admin_5s() and email <> 'alvaro.batistella@method-flow.com') with check(proj_p_3634611143.admin_5s() and email <> 'alvaro.batistella@method-flow.com');
revoke all on membros_5s from anon;
grant select,insert,update on membros_5s to authenticated;
create table if not exists auditorias_5s (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid(),
 area text not null check(length(trim(area))>0),
 data_auditoria date not null,
 auditor text not null,
 acompanhantes text not null default '',
 status text not null default 'rascunho' check(status in ('rascunho','concluida')),
 respostas jsonb not null default '{}'::jsonb,
 comentarios jsonb not null default '{}'::jsonb,
 acoes jsonb not null default '[]'::jsonb,
 nota_final numeric check(nota_final between 0 and 100),
 versao_checklist text not null default '21.09.2023-aba2',
 criado_em timestamptz not null default now(),
 atualizado_em timestamptz not null default now()
);
alter table auditorias_5s enable row level security;
drop policy if exists auditorias_leitura on auditorias_5s;
create policy auditorias_leitura on auditorias_5s for select to authenticated using(proj_p_3634611143.membro_5s() and (user_id=auth.uid() or proj_p_3634611143.admin_5s()));
drop policy if exists auditorias_insercao on auditorias_5s;
create policy auditorias_insercao on auditorias_5s for insert to authenticated with check(proj_p_3634611143.membro_5s() and user_id=auth.uid());
drop policy if exists auditorias_atualizacao on auditorias_5s;
create policy auditorias_atualizacao on auditorias_5s for update to authenticated
 using(proj_p_3634611143.membro_5s() and (user_id=auth.uid() or proj_p_3634611143.admin_5s()))
 with check(proj_p_3634611143.membro_5s() and (user_id=auth.uid() or proj_p_3634611143.admin_5s()));
revoke all on auditorias_5s from anon;
grant select,insert,update on auditorias_5s to authenticated;
create index if not exists auditorias_5s_usuario_idx on auditorias_5s(user_id);
create index if not exists auditorias_5s_data_idx on auditorias_5s(data_auditoria);
-- Evidências ficam no registro JSON da resposta (JPEG reduzido), protegidas pela mesma RLS.
-- Administradores podem editar e mover qualquer auditoria para a Lixeira.
-- Auditores só gerenciam suas próprias auditorias.
-- Programa 5S: habilita exclusão definitiva das auditorias na Lixeira.
-- Execute todo este arquivo no Editor SQL do projeto p_3634611143.
-- Não apaga nenhuma auditoria ao executar. Reexecutável, sem BEGIN/COMMIT.
set search_path to proj_p_3634611143, public;
create table if not exists auditorias_excluidas_5s (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid(),
 excluida_por uuid not null default auth.uid(),
 excluida_em timestamptz not null default now()
);
alter table auditorias_excluidas_5s enable row level security;
drop policy if exists exclusoes_leitura on auditorias_excluidas_5s;
create policy exclusoes_leitura on auditorias_excluidas_5s for select to authenticated
 using(proj_p_3634611143.membro_5s() and (user_id=auth.uid() or proj_p_3634611143.admin_5s()));
revoke all on auditorias_excluidas_5s from anon, authenticated;
grant select on auditorias_excluidas_5s to authenticated;
-- Só identificadores são conservados para sincronização; sem fotos ou conteúdo.
create or replace function proj_p_3634611143.registrar_exclusao_5s() returns trigger
language plpgsql security definer set search_path = pg_catalog as $$
begin
 insert into proj_p_3634611143.auditorias_excluidas_5s(id,user_id,excluida_por)
 values(old.id,old.user_id,auth.uid()) on conflict(id) do nothing;
 return old;
end $$;
create or replace function proj_p_3634611143.impedir_recriacao_5s() returns trigger
language plpgsql security definer set search_path = pg_catalog as $$
begin
 if exists(select 1 from proj_p_3634611143.auditorias_excluidas_5s where id=new.id) then
  raise exception 'Auditoria excluída definitivamente. Crie uma nova auditoria.';
 end if;
 return new;
end $$;
revoke all on function proj_p_3634611143.registrar_exclusao_5s() from public,anon,authenticated;
revoke all on function proj_p_3634611143.impedir_recriacao_5s() from public,anon,authenticated;
drop trigger if exists auditorias_registrar_exclusao on auditorias_5s;
create trigger auditorias_registrar_exclusao after delete on auditorias_5s
 for each row execute function proj_p_3634611143.registrar_exclusao_5s();
drop trigger if exists auditorias_impedir_recriacao on auditorias_5s;
create trigger auditorias_impedir_recriacao before insert or update on auditorias_5s
 for each row execute function proj_p_3634611143.impedir_recriacao_5s();
alter table auditorias_5s enable row level security;
drop policy if exists auditorias_exclusao_definitiva on auditorias_5s;
create policy auditorias_exclusao_definitiva on auditorias_5s for delete to authenticated
 using(proj_p_3634611143.membro_5s()
 and (user_id=auth.uid() or proj_p_3634611143.admin_5s())
 and comentarios->'_lixeira'->>'excluida'='true');
revoke all on auditorias_5s from anon;
grant delete on auditorias_5s to authenticated;
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
