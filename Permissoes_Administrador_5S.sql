-- Programa 5S / Method Flow - projeto p_3634611143
-- Execute TODO este arquivo no Editor SQL do projeto já configurado.
-- Mantém RLS ligada, a autoria das auditorias e a exclusão recuperável pela Lixeira.
-- Reexecutável, sem BEGIN/COMMIT. Não altera o sistema de autenticação.
set search_path to proj_p_3634611143, public;
alter table auditorias_5s enable row level security;
drop policy if exists auditorias_atualizacao on auditorias_5s;
create policy auditorias_atualizacao on auditorias_5s for update to authenticated
 using (
  proj_p_3634611143.membro_5s()
  and (user_id = auth.uid() or proj_p_3634611143.admin_5s())
 )
 with check (
  proj_p_3634611143.membro_5s()
  and (user_id = auth.uid() or proj_p_3634611143.admin_5s())
 );
revoke all on auditorias_5s from anon;
grant select, insert, update on auditorias_5s to authenticated;
-- Excluir e restaurar atualizam comentarios._lixeira, protegidos pela policy acima.
-- A autoria (user_id) permanece inalterada pelo aplicativo.
