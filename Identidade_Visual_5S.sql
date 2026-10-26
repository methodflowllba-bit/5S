-- Identidade visual compartilhada: leitura pela equipe ativa, edição só administrativa.
set search_path to proj_p_3634611143, public;
create table if not exists identidade_5s (
 id uuid primary key default gen_random_uuid() check(id='00000000-0000-4000-8000-000000000005'::uuid),
 user_id uuid not null default auth.uid(),
 logotipo text not null default '' check(logotipo='' or (length(logotipo)<=350000 and logotipo ~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$')),
 atualizado_em timestamptz not null default now()
);
alter table identidade_5s enable row level security;
revoke all on identidade_5s from public, anon, authenticated;
grant select, insert, update on identidade_5s to authenticated;
drop policy if exists identidade_leitura_5s on identidade_5s;
create policy identidade_leitura_5s on identidade_5s for select to authenticated using(proj_p_3634611143.membro_5s());
drop policy if exists identidade_insercao_5s on identidade_5s;
create policy identidade_insercao_5s on identidade_5s for insert to authenticated with check(proj_p_3634611143.admin_5s() and user_id=auth.uid());
drop policy if exists identidade_atualizacao_5s on identidade_5s;
create policy identidade_atualizacao_5s on identidade_5s for update to authenticated using(proj_p_3634611143.admin_5s()) with check(proj_p_3634611143.admin_5s());
drop policy if exists sessao_unica_identidade_5s on identidade_5s;
create policy sessao_unica_identidade_5s on identidade_5s as restrictive for all to authenticated using(proj_p_3634611143.sessao_5s_ativa()) with check(proj_p_3634611143.sessao_5s_ativa());
notify pgrst, 'reload schema';
