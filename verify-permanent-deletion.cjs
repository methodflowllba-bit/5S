const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('app.js','utf8');
function extract(name){const pts=[...source.matchAll(/^  (?:async )?function ([\w$]+)\(/gm)],i=pts.findIndex(p=>p[1]===name);assert.ok(i>=0);return source.slice(pts[i].index,pts[i+1].index)}
const audit={id:'a',user_id:'user',area:'Linha 1',data_auditoria:'2026-10-18',comentarios:{_lixeira:{excluida:true}},respostas:{fotos:['evidencia']}};
function setup({deny=false,cancel=false,pending=false,role='administrador'}={}){
 const ctx={R:false,D:false,p:{user:{id:role==='administrador'?'admin':'user'}},navigator:{onLine:true},rows:[{...structuredClone(audit),_trashPending:pending}],ne:[audit],selectedTrashAudits:new Set(['a']),document:{createElement:()=>({remove(){}}),body:{append(){}}},confirm:()=>!cancel,h(msg){ctx.message=msg},w(){},canManageAudit:r=>role==='administrador'||r.user_id===ctx.p.user.id,$:r=>r.comentarios?._lixeira?.excluida===true};
 ctx.ensurePortalSession=async()=>true;ctx.I=()=>ctx.rows;ctx.M=()=>ctx.rows;ctx.ce=x=>ctx.rows=x;ctx.calls=[];
 ctx.b={auth:{getUser:async()=>({data:{user:ctx.p.user}})},from:table=>({delete(){ctx.calls.push(table);return this},eq(){return this},select:async()=>deny?{error:{message:'RLS recusou'}}:{data:[{id:'a'}]}})};
 vm.createContext(ctx);vm.runInContext(extract('purgeSelectedAudits'),ctx);return ctx;
}
(async()=>{
 for(const role of ['administrador','usuario']){const ctx=setup({role});await ctx.purgeSelectedAudits();assert.equal(ctx.rows.length,0);assert.equal(ctx.ne.length,0);assert.equal(ctx.selectedTrashAudits.size,0);assert.equal(ctx.R,false)}
 for(const opts of [{deny:true},{cancel:true},{pending:true}]){const ctx=setup(opts);await ctx.purgeSelectedAudits();assert.equal(ctx.rows.length,1);if(!opts.deny)assert.equal(ctx.calls.length,0)}
 const offline=setup();offline.navigator.onLine=false;await offline.purgeSelectedAudits();assert.equal(offline.calls.length,0);
 // Purges from the server invalidate pending cached copies and open editors.
 const ctx=setup();ctx.d=structuredClone(audit);ctx.ze=()=>{throw Error('Não pode salvar novamente uma auditoria apagada')};
 ctx.b.from=table=>({select:()=>table==='auditorias_excluidas_5s'?Promise.resolve({data:[{id:'a'}]}):{order:async()=>({data:[]})}});
 ctx.readAllAuditPages=async table=>table==='auditorias_excluidas_5s'?{data:[{id:'a'}]}:{data:[]};
 vm.runInContext(extract('ue'),ctx);await ctx.ue(false);assert.equal(ctx.rows.length,0);assert.equal(ctx.d,null);
 const sql=fs.readFileSync('Exclusao_Definitiva_5S.sql','utf8');assert.match(sql,/enable row level security/);assert.match(sql,/for delete to authenticated/);assert.match(sql,/comentarios->'_lixeira'->>'excluida'='true'/);assert.match(sql,/user_id=auth.uid\(\) or proj_p_3634611143.admin_5s\(\)/);assert.match(sql,/after delete/);assert.match(sql,/before insert or update/);assert.ok(!/disable row level security|service_role/i.test(sql));
 console.log('Aprovado: exclusão selecionada, confirmação, falha RLS sem perda local, bloqueio offline/pendente e remoção de cópias antigas após sincronização.');
})().catch(e=>{console.error(e);process.exitCode=1});
