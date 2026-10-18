-- Programa 5S / Method Flow - p_3634611143
-- Execute todo o arquivo no Editor SQL. Reexecutável.
-- Habilita o botão Excluir acesso sem apagar nenhuma pessoa ao executar o SQL.
-- Remove somente autorizações; não altera o login nem as auditorias.
set search_path to proj_p_3634611143, public;
alter table membros_5s enable row level security;
drop policy if exists membros_exclusao on membros_5s;
create policy membros_exclusao on membros_5s for delete to authenticated
 using (
  proj_p_3634611143.admin_5s()
  and email <> 'alvaro.batistella@method-flow.com'
  and email <> lower(auth.email())
 );
revoke all on membros_5s from anon;
grant select,insert,update,delete on membros_5s to authenticated;
-- A policy restritiva de sessão única, quando instalada, permanece em vigor.
