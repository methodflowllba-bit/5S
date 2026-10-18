// npm install --no-save @electric-sql/pglite, then node verify-session-sql.cjs
const fs=require('node:fs'),assert=require('node:assert/strict');
let PGlite;try{({PGlite}=require('@electric-sql/pglite'))}catch{({PGlite}=require('../qa-db/node_modules/@electric-sql/pglite'))}
const schema='proj_p_3634611143',user='10000000-0000-4000-8000-000000000001',other='10000000-0000-4000-8000-000000000002';
const a='20000000-0000-4000-8000-000000000001',b='20000000-0000-4000-8000-000000000002',c='20000000-0000-4000-8000-000000000003';
(async()=>{
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create schema auth;create schema ${schema};grant usage on schema auth,${schema} to authenticated;
 create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
 create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;
 create function auth.email() returns text language sql stable as $$select auth.jwt()->>'email'$$;`);
 await db.exec(fs.readFileSync('configuracao-superdb.sql','utf8'));
 await db.exec(fs.readFileSync('Sessao_Unica_5S.sql','utf8'));
 await db.exec(fs.readFileSync('Sessao_Unica_5S.sql','utf8'));
 await db.exec(`insert into ${schema}.membros_5s(email,nome,perfil) values('user@example.com','Auditor','usuario'),('other@example.com','Outro','usuario')`);
 async function terminal(id,email,token){await db.exec('reset role');await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:id,email,role:'authenticated'})]);await db.query("select set_config('request.headers',$1,false)",[JSON.stringify({'x-programa5s-terminal':token})]);await db.exec(`set role authenticated;set search_path to ${schema},public`)}
 const active=async()=> (await db.query('select sessao_5s_ativa() as ok')).rows[0].ok;
 await terminal(user,'user@example.com',a);assert.equal(await active(),false);
 await db.query('select iniciar_sessao_5s($1)',[a]);assert.equal(await active(),true);
 await db.exec("insert into auditorias_5s(id,area,data_auditoria,auditor) values('30000000-0000-4000-8000-000000000001','Linha','2026-10-18','Auditor')");
 await assert.rejects(()=>db.query('select * from sessoes_5s'),/permission denied/);
 await terminal(other,'other@example.com',c);await db.query('select iniciar_sessao_5s($1)',[c]);assert.equal(await active(),true);assert.equal((await db.query('select * from auditorias_5s')).rows.length,0);
 await terminal(user,'user@example.com',b);await db.query('select iniciar_sessao_5s($1)',[b]);assert.equal(await active(),true);assert.equal((await db.query('select * from auditorias_5s')).rows.length,1);
 await terminal(user,'user@example.com',a);assert.equal(await active(),false);assert.equal((await db.query('select * from auditorias_5s')).rows.length,0);assert.equal((await db.query('select * from membros_5s')).rows.length,0);
 await assert.rejects(()=>db.exec("insert into auditorias_5s(area,data_auditoria,auditor) values('Bloqueada','2026-10-18','Auditor')"),/row-level security/);
 assert.equal((await db.query("update auditorias_5s set area='Indevida' returning id")).rows.length,0);
 await db.exec('select encerrar_sessao_5s()'); // The displaced terminal cannot log out the active one.
 await terminal(user,'user@example.com',b);assert.equal(await active(),true);
 await db.exec('select encerrar_sessao_5s()');assert.equal(await active(),false);
 await terminal(other,'other@example.com',c);assert.equal(await active(),true);
 await terminal(user,'user@example.com','invalid');assert.equal(await active(),false);
 await assert.rejects(()=>db.query('select iniciar_sessao_5s($1)',[a]),/Identificação/);
 await terminal(user,'user@example.com',a);await db.exec('reset role');await db.exec(`update ${schema}.membros_5s set ativo=false where email='user@example.com';set role authenticated`);
 await assert.rejects(()=>db.query('select iniciar_sessao_5s($1)',[a]),/não autorizado/);
 await db.close();console.log('SQL aprovado em PostgreSQL/PGlite: idempotência, RLS, troca A→B, bloqueio de leitura/gravação do terminal A, isolamento entre contas, logout e acesso desativado.');
})().catch(e=>{console.error(e);process.exitCode=1});
