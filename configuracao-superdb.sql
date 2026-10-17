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
create policy auditorias_atualizacao on auditorias_5s for update to authenticated using(proj_p_3634611143.membro_5s() and user_id=auth.uid()) with check(proj_p_3634611143.membro_5s() and user_id=auth.uid());
revoke all on auditorias_5s from anon;
grant select,insert,update on auditorias_5s to authenticated;
create index if not exists auditorias_5s_usuario_idx on auditorias_5s(user_id);
create index if not exists auditorias_5s_data_idx on auditorias_5s(data_auditoria);
-- Evidências ficam no registro JSON da resposta (JPEG reduzido), protegidas pela mesma RLS.
-- Não há exclusão definitiva no app. Desative membros para revogar acesso ao portal.
