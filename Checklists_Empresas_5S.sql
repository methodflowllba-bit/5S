-- Programa 5S: modelos de checklist por empresa.
-- Execute no projeto p_3634611143. Reexecutável, sem BEGIN/COMMIT.
-- Não altera autenticação nem auditorias existentes.
set search_path to proj_p_3634611143, public;
create table if not exists checklists_5s (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid(),
 nome text not null check(length(trim(nome)) between 1 and 120),
 empresa text not null check(length(trim(empresa)) between 1 and 160),
 sensos jsonb not null check(jsonb_typeof(sensos)='array' and jsonb_array_length(sensos)=5),
 criado_em timestamptz not null default now(),
 atualizado_em timestamptz not null default now()
);
alter table checklists_5s enable row level security;
revoke all on checklists_5s from public, anon, authenticated;
grant select, insert, update on checklists_5s to authenticated;
drop policy if exists checklists_leitura_5s on checklists_5s;
create policy checklists_leitura_5s on checklists_5s for select to authenticated
 using(proj_p_3634611143.membro_5s());
drop policy if exists checklists_insercao_5s on checklists_5s;
create policy checklists_insercao_5s on checklists_5s for insert to authenticated
 with check(proj_p_3634611143.admin_5s() and user_id=auth.uid());
drop policy if exists checklists_atualizacao_5s on checklists_5s;
create policy checklists_atualizacao_5s on checklists_5s for update to authenticated
 using(proj_p_3634611143.admin_5s()) with check(proj_p_3634611143.admin_5s());
do $$ begin
 if to_regprocedure('proj_p_3634611143.sessao_5s_ativa()') is not null then
  execute 'drop policy if exists sessao_unica_checklists_5s on proj_p_3634611143.checklists_5s';
  execute 'create policy sessao_unica_checklists_5s on proj_p_3634611143.checklists_5s as restrictive for all to authenticated using(proj_p_3634611143.sessao_5s_ativa()) with check(proj_p_3634611143.sessao_5s_ativa())';
 end if;
end $$;
notify pgrst, 'reload schema';
