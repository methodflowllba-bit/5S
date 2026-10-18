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
-- Inclui também a permissão de gerenciamento da Lixeira por administradores.
drop policy if exists auditorias_atualizacao on auditorias_5s;
create policy auditorias_atualizacao on auditorias_5s for update to authenticated
 using(proj_p_3634611143.membro_5s() and (user_id=auth.uid() or proj_p_3634611143.admin_5s()))
 with check(proj_p_3634611143.membro_5s() and (user_id=auth.uid() or proj_p_3634611143.admin_5s()));
drop policy if exists auditorias_exclusao_definitiva on auditorias_5s;
create policy auditorias_exclusao_definitiva on auditorias_5s for delete to authenticated
 using(proj_p_3634611143.membro_5s()
 and (user_id=auth.uid() or proj_p_3634611143.admin_5s())
 and comentarios->'_lixeira'->>'excluida'='true');
revoke all on auditorias_5s from anon;
grant select,insert,update,delete on auditorias_5s to authenticated;
