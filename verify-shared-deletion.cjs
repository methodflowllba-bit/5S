const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const source = fs.readFileSync('app.js', 'utf8');
function extract(name) {
  const points = [...source.matchAll(/^  (?:async )?function ([\w$]+)\(/gm)];
  const i = points.findIndex(x => x[1] === name);
  return source.slice(points[i].index, points[i + 1].index);
}
const base = { id:'a', user_id:'user', data_auditoria:'2026-10-18', comentarios:{geral:'Notas'}, respostas:{foto:'preservada'}, _pending:true };
const deleted = {...base, comentarios:{_lixeira:{excluida:true,em:'2026-10-18T16:00:00Z',por:'admin'}}};
(async () => {
  for (const actor of ['admin', 'user']) {
    const ctx = { p:{user:{id:actor}}, D:false, d:null, ne:[], local:[structuredClone(base)], h(){}, w(){}, Map, String, document:{visibilityState:'visible'} };
    ctx.$ = x => x.comentarios?._lixeira?.excluida === true;
    ctx.M = () => ctx.local; ctx.ce = x => ctx.local = x;
    ctx.b = {from:()=>({select:()=>({order:async()=>({data:[structuredClone(deleted)]})})})};
    ctx.ensurePortalSession=async()=>true;vm.createContext(ctx); vm.runInContext(extract('ke') + extract('ue'), ctx);
    await ctx.ue(false);
    assert.equal(ctx.local[0].comentarios._lixeira.excluida,true);
    assert.equal(ctx.local[0].respostas.foto,'preservada');
    assert.equal(ctx.ke(ctx.ne,ctx.local).length,0,'Exclusão compartilhada oculta a cópia local pendente');
    assert.equal(ctx.ke(ctx.ne,ctx.local,true).length,1,'Permanece recuperável na Lixeira');
    // A newer server restoration must also replace an old local tombstone.
    ctx.b.from = () => ({select:()=>({order:async()=>({data:[{...base,comentarios:{_lixeira:{excluida:false,em:'2026-10-18T16:01:00Z'}}}]})})});
    await ctx.ue(false); assert.equal(ctx.ke(ctx.ne,ctx.local).length,1);
    // Preserve a newer offline deletion until it can be uploaded.
    ctx.local[0]._trashPending = true;
    ctx.local[0].comentarios._lixeira = {excluida:true,em:'2026-10-18T16:02:00Z'};
    await ctx.ue(false); assert.equal(ctx.local[0]._trashPending,true);
    assert.equal(ctx.ke(ctx.ne,ctx.local).length,0);
  }
  const ctx={p:{user:{id:'user'}},D:false,R:false,navigator:{onLine:true},document:{visibilityState:'visible'},M:()=>[],w(){this.renders++},renders:0};
  ctx.ensurePortalSession=async()=>true;ctx.ue=async()=>{ctx.reads=(ctx.reads||0)+1};vm.createContext(ctx);
  vm.runInContext('let refreshingSharedAudits=false;'+extract('refreshSharedAudits'),ctx);
  await Promise.all([ctx.refreshSharedAudits(),ctx.refreshSharedAudits()]);assert.equal(ctx.reads,1);
  ctx.navigator.onLine=false;await ctx.refreshSharedAudits();assert.equal(ctx.reads,1);
  ctx.navigator.onLine=true;ctx.M=()=>[{_trashPending:true}];ctx.canManageAudit=()=>true;ctx.Me=async()=>{ctx.sent=true};
  await ctx.refreshSharedAudits();assert.equal(ctx.sent,true);
  console.log('Aprovado: exclusão/ restauração compartilhada, cache pendente preservado, atualização automática sem concorrência e envio ao reconectar.');
})().catch(e=>{console.error(e);process.exitCode=1});
