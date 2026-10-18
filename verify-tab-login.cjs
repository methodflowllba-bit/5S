const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('app.js','utf8');
function extract(name){const pts=[...source.matchAll(/^  (?:async )?function ([\w$]+)\(/gm)],i=pts.findIndex(p=>p[1]===name);assert.ok(i>=0,name);const tail=source.slice(pts[i].index,pts[i+1]?.index);return tail.split(name==='createWebAuthStorage'?'  var g =':'  window.addEventListener("pageshow"')[0]}
const shared=new Map([['superdb.auth.session',JSON.stringify({user:{id:'old-admin'}})],['superdb.auth.pkce','old'],['programa5s:terminal:old-admin','old-token'],['programa5s:auditor-1','draft-and-photos']]);
const localStorage={get length(){return shared.size},key:i=>[...shared.keys()][i],getItem:k=>shared.get(k)||null,setItem:(k,v)=>shared.set(k,v),removeItem:k=>shared.delete(k)};
const fakeFetch=async(url,options)=>{
 const body=JSON.parse(options.body||'{}');
 if(url.endsWith('/auth/v1/signin'))return new Response(JSON.stringify({access_token:'access:'+body.email,refresh_token:'refresh:'+body.email,data_plane_token:'data:'+body.email,expires_in:3600,user:{id:body.email,email:body.email}}),{status:200});
 if(url.endsWith('/auth/v1/token/refresh')){const email=body.refresh_token.slice('refresh:'.length);return new Response(JSON.stringify({access_token:'refreshed:'+email,refresh_token:'refresh:'+email,data_plane_token:'data:'+email,expires_in:3600,user:{id:email,email}}),{status:200})}
 return new Response('{}',{status:200});
};
(async()=>{
 const ctx={localStorage,Map,URL,URLSearchParams,Headers,Response,fetch:fakeFetch,setTimeout,clearTimeout,atob,btoa,navigator:{},TextEncoder,crypto:require('node:crypto').webcrypto};vm.createContext(ctx);
 vm.runInContext(source.slice(source.indexOf('  var Qe ='),source.indexOf('  var N = ['))+extract('createWebAuthStorage')+'\nglobalThis.makeClient=Ne;',ctx);
 const a=ctx.makeClient('https://auth.superdb.com.br','public',{project:'p_3634611143',storage:ctx.createWebAuthStorage()});
 assert.equal((await a.auth.getSession()).data.session,null);
 assert.equal(shared.has('superdb.auth.session'),false);assert.equal(shared.has('programa5s:terminal:old-admin'),false);assert.equal(shared.get('programa5s:auditor-1'),'draft-and-photos');
 await a.auth.signInWithPassword({email:'admin@example.com',password:'test-password'});
 const b=ctx.makeClient('https://auth.superdb.com.br','public',{project:'p_3634611143',storage:ctx.createWebAuthStorage()});
 assert.equal((await b.auth.getSession()).data.session,null,'Nova aba não pode herdar login da aba A');
 await b.auth.signInWithPassword({email:'auditor@example.com',password:'test-password'});
 assert.equal((await a.auth.getSession()).data.session.user.email,'admin@example.com');assert.equal((await b.auth.getSession()).data.session.user.email,'auditor@example.com');
 await a.auth.refreshSession();assert.equal((await a.auth.getSession()).data.session.user.email,'admin@example.com');assert.equal((await b.auth.getSession()).data.session.user.email,'auditor@example.com');
 await b.auth.signOut();assert.equal((await b.auth.getSession()).data.session,null);assert.equal((await a.auth.getSession()).data.session.user.email,'admin@example.com');
 const reload=ctx.makeClient('https://auth.superdb.com.br','public',{project:'p_3634611143',storage:ctx.createWebAuthStorage()});assert.equal((await reload.auth.getSession()).data.session,null);
 assert.equal(shared.has('superdb.auth.session'),false,'Nenhum token de login deve voltar ao armazenamento compartilhado');
 // Exercise the real startup branch, not only its storage adapter.
 const boot=source.slice(source.lastIndexOf('  (async () => {'),source.lastIndexOf('\n})();'));
 const start={g:null,V:'',p:{user:{id:'stale'}},T:'administrador',w:()=>start.rendered=true,b:{auth:{getSession(){throw Error('A web não deve restaurar sessão')}}},v:e=>{throw e}};vm.createContext(start);await vm.runInContext(boot,start);assert.equal(start.p,null);assert.equal(start.T,null);assert.equal(start.rendered,true);
 const callbackSource=source.slice(source.indexOf('  b.auth.onAuthStateChange((e, a) => {'),source.lastIndexOf('  (async () => {'));
 const listener={g:null,D:false,d:null,p:null,T:null,webPageLoginVerified:false,portalTerminalToken:'',ne:[],ye:[],selectedTrashAudits:new Set(),w(){},b:{auth:{onAuthStateChange:fn=>listener.callback=fn}}};vm.createContext(listener);vm.runInContext(callbackSource,listener);listener.callback('INITIAL_SESSION',{user:{id:'cached'}});assert.equal(listener.p,null);listener.webPageLoginVerified=true;listener.callback('SIGNED_IN',{user:{id:'explicit-login'}});assert.equal(listener.p.user.id,'explicit-login');
 const back={g:null,d:{id:'draft'},p:{user:{id:'admin'}},T:'administrador',ne:[1],ye:[1],webPageLoginVerified:true,S:()=>back.saved=true,w:()=>back.rendered=true,window:{location:{reload:()=>back.reloaded=true}}};vm.createContext(back);vm.runInContext(extract('requireFreshWebLogin'),back);back.requireFreshWebLogin({persisted:true});assert.equal(back.p,null);assert.equal(back.saved,true);assert.equal(back.reloaded,true);
 console.log('Aprovado com o SDK real: abas A/B com contas isoladas, nova aba/reload sem login herdado, logout e refresh independentes, remoção de credenciais antigas sem apagar rascunhos, bloqueio de restauração automática e do cache Voltar/Avançar.');
})().catch(e=>{console.error(e);process.exitCode=1});
