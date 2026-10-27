const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const source = fs.readFileSync('app.js', 'utf8');
function extract(name) {
  const points = [...source.matchAll(/^  (?:async )?function ([\w$]+)\(/gm)], i = points.findIndex(x => x[1] === name);
  assert.ok(i >= 0, name); return source.slice(points[i].index, points[i + 1]?.index || source.length);
}
const nodes = new Map(), c = id => { if (!nodes.has(id)) nodes.set(id, { value:'', innerHTML:'', textContent:'' }); return nodes.get(id); };
const ctx = { console, Set, Number, Math, Date, p:{user:{id:'admin',email:'admin@example.com'}},T:'administrador',ne:[],M:()=>[], c,
  dashboardFilters:{owner:'admin',area:'',from:'',to:''},
  X:['SEIRI','SEITON','SEISO','SEIKETSU','SHITSUKE'],
  O:v=>v == null ? '—' : v.toLocaleString('pt-BR',{maximumFractionDigits:1})+'%',
  m:v=>String(v).replace(/[&<>"']/g, ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])),
  Y:()=>'',W:()=>'<div>Programa 5S</div>',h:message=>ctx.message=message,
  v:err=>{throw err},ue:async()=>{},window:{addEventListener(){},removeEventListener(){},print(){ctx.printed=true}},
  document:{querySelector:()=>null,body:{append:report=>{ctx.report=report}},createElement:()=>({querySelectorAll:()=>[],remove(){ctx.removed=true}})} };
vm.createContext(ctx);
vm.runInContext(source.slice(source.indexOf('  var N = ['),source.indexOf('  function createWebAuthStorage')),ctx);
ctx.portalBrandLogo='';
vm.runInContext(['validBrandLogo','methodFlowFooter','ke','auditSenses','le','U','canManageAudit','I','dashboardArea','dashboardDate','dashboardModel','dashboardRadar','dashboardGrouping','dashboardValidDate','dashboardPeriod','dashboardGroups','dashboardEvolution','dashboardGroupBars','dashboardPeriodResults','dashboardResults','showDashboard','printDashboard'].map(extract).join('\n'),ctx);
ctx.$=row=>row.comentarios?._lixeira?.excluida===true;
function audit(id,area,date,values,extra={}) {
 const respostas={};ctx.N.forEach((s,i)=>s.items.forEach(item=>{respostas[item.id]={nota:values[i]}}));
 return {id,area,data_auditoria:date,user_id:'auditor',auditor:'Maria',status:'concluida',respostas,...extra};
}
const a=audit('start','Montagem','2026-10-01',[0,25,50,75,100]);
const b=audit('end','Montagem','2026-10-22',[100,75,50,25,0],{_pending:true});
const outside=audit('outside','Montagem','2026-09-30',[100,100,100,100,100]);
const other=audit('other','Logística','2026-10-22',[25,25,25,25,25]);
const draft=audit('draft','Montagem','2026-10-10',[100,100,100,100,100],{status:'rascunho'});
const trash=audit('trash','Montagem','2026-10-10',[100,100,100,100,100],{comentarios:{_lixeira:{excluida:true}}});
const incomplete=audit('incomplete','Montagem','2026-10-10',[100,100,100,100,100]);delete incomplete.respostas[ctx.N[0].items[0].id];
const rows=[a,b,outside,other,draft,trash,incomplete], filters={area:'Montagem',from:'2026-10-01',to:'2026-10-22'};
(async()=>{
 const model=ctx.dashboardModel(rows,filters);
 assert.equal(ctx.dashboardPeriod('2026-02-30','day'),null);
 assert.equal(ctx.dashboardPeriod('2026-01-01','week').key,'2025-12-29');
 assert.equal(ctx.dashboardPeriod('2026-10-25','week').key,'2026-10-19');
 const grouped=ctx.dashboardGroups(ctx.dashboardModel([a,b,outside,other],{}),'month');
 assert.equal(grouped.periods.length,2);assert.equal(grouped.periods[0].label,'Set/2026');assert.equal(grouped.periods[0].count,1);assert.equal(grouped.periods[0].average,100);assert.equal(grouped.periods[1].count,3);assert.ok(Math.abs(grouped.periods[1].average-125/3)<1e-10);
 assert.equal(grouped.areas.length,2);assert.ok(Math.abs(grouped.areas.find(x=>x.label==='Montagem').average-200/3)<1e-10);
 assert.equal(ctx.dashboardGroups(model,'day').periods.length,2);assert.equal(ctx.dashboardGroups(model,'year').periods.length,1);assert.equal(ctx.dashboardGroups(model,'week').periods.length,2);
 vm.runInContext(extract('readAllAuditPages'),ctx);const history=Array.from({length:1234},(_,i)=>({id:String(i)}));let calls=0;
 ctx.b={from:()=>({select:()=>({order:()=>({range:async(from,to)=>{calls++;return{data:history.slice(from,to+1)}}})})})};const full=await ctx.readAllAuditPages('auditorias_5s');assert.equal(full.data.length,1234);assert.equal(calls,7);
 ctx.b={from:()=>({select:()=>({order:()=>({range:async()=>({error:{message:'Sessão encerrada'}})})})})};assert.equal((await ctx.readAllAuditPages('auditorias_5s')).error.message,'Sessão encerrada');
 const invalidDate=audit('bad-date','Montagem','2026-02-30',[100,100,100,100,100]);assert.equal(ctx.dashboardModel([invalidDate],{}).rows.length,0);
 const many=Array.from({length:30},(_,i)=>audit('many'+i,'Montagem',`${2024+Math.floor(i/12)}-${String(i%12+1).padStart(2,'0')}-01`,[50,50,50,50,50]));const timeline=ctx.dashboardEvolution(ctx.dashboardGroups(ctx.dashboardModel(many,{}),'month').periods);assert.equal((timeline.match(/<svg/g)||[]).length,3);assert.ok(timeline.includes('Jun/2026'));assert.ok(!/NaN|undefined/.test(timeline));
 assert.deepEqual(Array.from(model.rows,item=>item.row.id),['start','end']);
 assert.deepEqual(Array.from(model.scores),[50,50,50,50,50]);assert.equal(model.average,50);assert.equal(model.areas,1);assert.equal(model.pending,1);assert.equal(model.excluded,1);
 const zero=ctx.dashboardModel([audit('zero','Montagem','2026-10-22',[0,0,0,0,0])],filters);assert.equal(zero.average,0);assert.ok(ctx.dashboardRadar(zero.scores).includes('0%'));
 assert.match(ctx.dashboardModel(rows,{...filters,from:'2026-11-01'}).error,/data inicial/);
 const empty=ctx.dashboardModel(rows,{...filters,area:'Sem registros'});assert.equal(empty.rows.length,0);assert.equal(empty.scores[0],null);assert.ok(!ctx.dashboardResults(empty).includes('<svg'));
 assert.equal(ctx.dashboardModel(rows,{area:'',from:'',to:''}).rows.length,4);
 ctx.ne=rows;ctx.T='usuario';ctx.p.user.id='another-user';assert.equal(ctx.dashboardModel(ctx.I(),filters).rows.length,0,'Usuário não pode consultar auditorias alheias');
 ctx.T='administrador';ctx.p.user.id='admin';
 ctx.showDashboard();c('#dashboardArea').value='Montagem';c('#dashboardFrom').value='2026-10-01';c('#dashboardTo').value='2026-10-22';c('#dashboardFrom').onchange();
 assert.match(c('#dashboardSummary').textContent,/01\/10\/2026.*22\/10\/2026/);assert.equal(c('#printDashboard').disabled,false);assert.match(c('#dashboardResults').innerHTML,/50%/);
 c('#dashboardGrouping').value='week';c('#dashboardGrouping').onchange();assert.equal(ctx.dashboardFilters.groupBy,'week');assert.match(c('#dashboardResults').innerHTML,/Semana 19\/10\/2026/);
 ctx.showDashboard();assert.equal(ctx.dashboardFilters.area,'Montagem','Atualização conserva o filtro');
 await ctx.printDashboard(model,filters);await Promise.resolve();assert.equal(ctx.printed,true);
 assert.match(ctx.report.innerHTML,/01\/10\/2026.*22\/10\/2026/);assert.match(ctx.report.innerHTML,/<svg/);assert.ok(!ctx.report.innerHTML.includes('30/09/2026'));assert.ok(!ctx.report.innerHTML.includes('Logística'));assert.match(ctx.report.innerHTML,/Envio pendente/);
 ctx.printed=false;ctx.printDashboard(empty,filters);assert.equal(ctx.printed,false);
 const injection=audit('escape','<img src=x onerror=alert(1)>','2026-10-22',[25,25,25,25,25]);assert.ok(!ctx.dashboardResults(ctx.dashboardModel([injection],{})).includes('<img src=x'));
 const radar=ctx.dashboardRadar(model.scores);assert.ok(!/NaN|undefined/.test(radar));fs.writeFileSync('/tmp/dashboard-radar-qa.svg',radar.replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" '));
 fs.writeFileSync('/tmp/dashboard-print-qa.html','<!doctype html><html lang="pt-BR"><meta charset="utf-8"><style>'+fs.readFileSync('style.css','utf8')+'</style><body><div id="printReport" class="dashboardPrint">'+ctx.report.innerHTML+'</div></body></html>');
 console.log('Aprovado: médias reais do checklist, limites inclusivos, área e permissões, exclusão de rascunhos/lixeira/notas incompletas, zero real, vazio, datas invertidas, filtros persistentes e impressão restrita ao período selecionado.');
})().catch(error=>{console.error(error);process.exitCode=1});
