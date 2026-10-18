const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('app.js','utf8');
function extract(name){const pts=[...source.matchAll(/^  (?:async )?function ([\w$]+)\(/gm)],i=pts.findIndex(p=>p[1]===name);return source.slice(pts[i].index,pts[i+1].index)}
const entry={id:'member-1',email:'auditor@example.com',nome:'Auditor',ativo:true};
function setup(opts={}){
 const ctx={T:opts.role||'administrador',R:false,D:false,p:{user:{email:'admin@example.com'}},z:'primary@example.com',ye:[structuredClone(entry)],navigator:{onLine:!opts.offline},confirm:()=>!opts.cancel,ensurePortalSession:async()=>true,h:msg=>ctx.message=msg,$e:async()=>ctx.reloaded=true};
 ctx.b={from:table=>({delete(){ctx.writes=(ctx.writes||0)+1;assert.equal(table,'membros_5s');return this},eq(){return this},select:async()=>opts.deny?{error:{message:'RLS recusou'}}:opts.empty?{data:[]}:{data:[{id:'member-1'}]}})};
 vm.createContext(ctx);vm.runInContext(extract('deleteMemberAccess'),ctx);return ctx;
}
(async()=>{
 for(const opts of [{},{deny:true},{empty:true},{cancel:true},{offline:true},{role:'usuario'}]){const ctx=setup(opts),button={};await ctx.deleteMemberAccess(entry.id,button);assert.equal(ctx.ye.length,Object.keys(opts).length?1:0);assert.equal(ctx.R,false);if(opts.cancel||opts.offline||opts.role)assert.ok(!ctx.writes)}
 for(const email of ['primary@example.com','admin@example.com']){const ctx=setup();ctx.ye[0].email=email;await ctx.deleteMemberAccess(entry.id);assert.ok(!ctx.writes)}
 let PGlite;try{({PGlite}=require('@electric-sql/pglite'))}catch{({PGlite}=require('../qa-db/node_modules/@electric-sql/pglite'))}
 const db=new PGlite(),schema='proj_p_3634611143';
 await db.exec(`create role anon;create role authenticated;create schema auth;create schema ${schema};grant usage on schema auth,${schema} to authenticated;
 create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
 create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;
 create function auth.email() returns text language sql stable as $$select auth.jwt()->>'email'$$;`);
 await db.exec(fs.readFileSync('configuracao-superdb.sql','utf8'));
 await db.exec(fs.readFileSync('Excluir_Acessos_5S.sql','utf8'));await db.exec(fs.readFileSync('Excluir_Acessos_5S.sql','utf8'));
 await db.exec(`insert into ${schema}.membros_5s(email,nome,perfil) values('alvaro.batistella@method-flow.com','Principal','administrador'),('delegate@example.com','Delegado','administrador'),('auditor@example.com','Auditor','usuario')`);
 const user='10000000-0000-4000-8000-000000000001',admin='10000000-0000-4000-8000-000000000002',delegate='10000000-0000-4000-8000-000000000003';
 async function login(id,email){await db.exec('reset role');await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:id,email})]);await db.query("select set_config('request.headers',$1,false)",[JSON.stringify({'x-programa5s-terminal':id})]);await db.exec(`set role authenticated;set search_path to ${schema},public`);await db.query('select iniciar_sessao_5s($1)',[id])}
 await login(user,'auditor@example.com');await db.exec("insert into auditorias_5s(area,data_auditoria,auditor) values('Linha','2026-10-18','Auditor')");
 assert.equal((await db.query("delete from membros_5s where email='delegate@example.com' returning id")).rows.length,0);
 await login(delegate,'delegate@example.com');assert.equal((await db.query("delete from membros_5s where email='delegate@example.com' returning id")).rows.length,0);assert.equal((await db.query("delete from membros_5s where email='alvaro.batistella@method-flow.com' returning id")).rows.length,0);
 await login(admin,'alvaro.batistella@method-flow.com');assert.equal((await db.query("delete from membros_5s where email='auditor@example.com' returning id")).rows.length,1);assert.equal((await db.query('select * from auditorias_5s')).rows.length,1,'Auditorias devem permanecer após excluir a autorização');
 await db.exec('reset role');await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:user,email:'auditor@example.com'})]);await db.query("select set_config('request.headers',$1,false)",[JSON.stringify({'x-programa5s-terminal':user})]);await db.exec(`set role authenticated;set search_path to ${schema},public`);
 assert.equal((await db.query('select sessao_5s_ativa() as ok')).rows[0].ok,false);assert.equal((await db.query('select * from auditorias_5s')).rows.length,0);await assert.rejects(()=>db.query('select iniciar_sessao_5s($1)',[user]),/não autorizado/);
 await db.close();console.log('Aprovado: excluir acesso com confirmação, falha sem remover da lista, RLS apenas para administradores, principal/próprio acesso protegidos, sessão revogada e auditorias preservadas.');
})().catch(e=>{console.error(e);process.exitCode=1});
