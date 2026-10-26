const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('app.js','utf8');
function extract(name){const pts=[...source.matchAll(/^  (?:async )?function ([\w$]+)\(/gm)],i=pts.findIndex(p=>p[1]===name);assert.ok(i>=0,name);return source.slice(pts[i].index,pts[i+1]?.index||source.length)}
const nodes=new Map(),events=new Map();let photoReady;
const photo={alt:'Foto da ação',decode:()=>new Promise(resolve=>{photoReady=resolve})};
const ctx={p:{user:{id:'auditor',email:'auditor@example.com'}},T:'usuario',ne:[],M:()=>[],
 actionReportFilters:{owner:'auditor',area:'',from:'',to:'',status:''},
 m:s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
 c:key=>{if(!nodes.has(key))nodes.set(key,{value:'',innerHTML:''});return nodes.get(key)},Y:()=>'',W:()=>'<div>Programa 5S · Method Flow</div>',h:msg=>ctx.message=msg,
 document:{querySelectorAll:()=>[],querySelector:()=>null,body:{append:report=>ctx.report=report},createElement:()=>({querySelectorAll:()=>[photo],remove:()=>ctx.removed=true})},
 window:{addEventListener:(event,fn)=>events.set(event,fn),removeEventListener:event=>events.delete(event),print:()=>ctx.printed=true}};
vm.createContext(ctx);vm.runInContext(['methodFlowFooter','ke','canManageAudit','I','ee','dashboardArea','dashboardDate','actionReportRows','Ca','printActionPlans'].map(extract).join('\n'),ctx);ctx.$=row=>row.comentarios?._lixeira?.excluida===true;
const a={id:'A',user_id:'auditor',area:'Montagem',auditor:'Maria',data_auditoria:'2026-10-01',status:'concluida',_pending:true,acoes:[{descricao:'Organizar bancada',responsavel:'João',prazo:'2026-10-30',status:'aberta',fotos:['data:image/jpeg;base64,/9j/2Q==']},{descricao:'Concluída fora do filtro',responsavel:'Ana',status:'concluida'}]};
const b={...a,id:'B',area:'Logística',data_auditoria:'2026-10-22',acoes:[{descricao:'Separar materiais',status:'aberta'}]};
const filters={area:'Montagem',from:'2026-10-01',to:'2026-10-22',status:'aberta'};
(async()=>{
 ctx.ne=[a,b,{...a,id:'old',data_auditoria:'2026-09-30'},{...a,id:'trash',comentarios:{_lixeira:{excluida:true}}},{...a,id:'other-user',user_id:'other'}];
 const rows=ctx.actionReportRows(ctx.I(),filters);assert.equal(rows.length,1);assert.equal(rows[0].descricao,'Organizar bancada');assert.equal(rows[0].index,0);
 ctx.Ca();assert.equal(ctx.c('#printActionPlans').disabled,false);ctx.c('#actionReportArea').value='Montagem';ctx.c('#actionReportArea').onchange();assert.equal(ctx.actionReportFilters.area,'Montagem');ctx.Ca();assert.equal(ctx.actionReportFilters.area,'Montagem');
 ctx.actionReportFilters.from='2026-11-01';ctx.actionReportFilters.to='2026-10-01';ctx.Ca();assert.equal(ctx.c('#printActionPlans').disabled,true);assert.match(ctx.c('#content').innerHTML,/data inicial/);
 ctx.printActionPlans(rows,filters);assert.equal(ctx.printed,undefined,'Impressão aguarda imagens');await Promise.resolve();assert.equal(ctx.printed,undefined);photoReady();await new Promise(setImmediate);assert.equal(ctx.printed,true);
 const html=ctx.report.innerHTML;for(const value of ['Organizar bancada','João','30/10/2026','Montagem','01/10/2026','22/10/2026','Envio pendente','data:image/jpeg;base64,'])assert.ok(html.includes(value),value);
 assert.ok(!html.includes('Logística'));assert.ok(!html.includes('Concluída fora do filtro'));assert.match(html,/Status das ações:<\/b> Abertas/);assert.equal(ctx.report.className,'actionPlansPrint');
 fs.writeFileSync('/tmp/action-plans-print-qa.html','<!doctype html><html lang="pt-BR"><meta charset="utf-8"><style>'+fs.readFileSync('style.css','utf8')+'</style><body><div id="printReport" class="actionPlansPrint">'+html+'</div></body></html>');
 events.get('afterprint')();assert.equal(ctx.removed,true);assert.equal(events.has('afterprint'),false);
 ctx.printed=false;ctx.printActionPlans([],filters);assert.equal(ctx.printed,false);assert.match(ctx.message,/Não há ações/);ctx.printActionPlans(rows,{from:'2026-11-01',to:'2026-10-01'});assert.equal(ctx.printed,false);
 ctx.p.user.id='new-account';ctx.Ca();assert.equal(ctx.actionReportFilters.area,'');assert.equal(ctx.c('#printActionPlans').disabled,true,'Conta sem ações não deve imprimir registros alheios');
 assert.match(source,/id="printThisActionPlan"/);assert.match(source,/printActionPlans\(\(d.acoes \|\| \[\]\)/);
 console.log('Aprovado: relatório somente das ações autorizadas e filtradas por área/data/status, campos e fotos preservados, espera por imagens, sem mutação de dados, impressão vazia bloqueada e limpeza após imprimir.');
})().catch(e=>{console.error(e);process.exitCode=1});
