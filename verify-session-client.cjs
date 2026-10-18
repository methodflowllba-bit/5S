const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('app.js','utf8');
function extract(name){const pts=[...source.matchAll(/^  (?:async )?function ([\w$]+)\(/gm)],i=pts.findIndex(p=>p[1]===name);assert.ok(i>=0,name);return source.slice(pts[i].index,pts[i+1].index)}
const noop=()=>{};
function client(id,token,registry){
 const nodes={'#authError':{textContent:''}};
 const ctx={p:{user:{id}},T:'usuario',d:{id:'draft'},ne:[{id:'a'}],D:false,g:null,navigator:{onLine:true},portalTerminalToken:token,portalProtectionEnabled:false,crypto:{randomUUID:()=>token},readPortalTerminal:()=>token,savePortalTerminal:noop,w:noop,c:s=>nodes[s],S:()=>ctx.saved=true};
 ctx.b={rpc:async(name,args)=>{if(name==='iniciar_sessao_5s'){registry.set(id,args.novo_terminal);return{data:true}}if(name==='encerrar_sessao_5s'){if(registry.get(id)===ctx.portalTerminalToken)registry.delete(id);return{data:true}}return{data:registry.get(id)===ctx.portalTerminalToken}},auth:{signOut:async()=>ctx.signedOut=true}};
 vm.createContext(ctx);vm.runInContext(['ensurePortalSession','closeReplacedSession','releasePortalSession'].map(extract).join(''),ctx);return ctx;
}
(async()=>{
 const registry=new Map(),a=client('same-account','terminal-a',registry),b=client('same-account','terminal-b',registry),c=client('other-account','terminal-c',registry);
 assert.equal(await a.ensurePortalSession(true),true);assert.equal(await c.ensurePortalSession(true),true);
 assert.equal(await b.ensurePortalSession(true),true);assert.equal(await a.ensurePortalSession(),false);assert.equal(a.signedOut,true);assert.equal(a.saved,true);assert.equal(a.p,null);assert.equal(a.ne.length,0);
 assert.equal(await b.ensurePortalSession(),true);assert.equal(await c.ensurePortalSession(),true);
 const reload=client('same-account','terminal-a',registry);assert.equal(await reload.ensurePortalSession(),false,'Reabrir o terminal substituído não deve tomar a sessão de volta');
 const missing=client('x','x',registry);missing.b.rpc=async()=>({error:{code:'PGRST202'}});assert.equal(await missing.ensurePortalSession(),true);assert.equal(missing.portalProtectionEnabled,false);
 missing.portalProtectionEnabled=true;await assert.rejects(()=>missing.ensurePortalSession());
 const network=client('x','x',registry);network.b.rpc=async()=>{throw Error('Falha de rede')};await assert.rejects(()=>network.ensurePortalSession(),/rede/);
 const requests=[];const ctx={portalTerminalToken:'device-token',Headers,URL,AbortController,fetch:async(url,options)=>{requests.push({url,headers:options.headers});return{status:200}},setTimeout,clearTimeout};vm.createContext(ctx);vm.runInContext(extract('Oe'),ctx);
 await ctx.Oe('https://api.superdb.com.br/auditorias_5s',{headers:{apikey:'public'}});await ctx.Oe('https://auth.superdb.com.br/auth/v1/signin');
 assert.equal(requests[0].headers.get('x-programa5s-terminal'),'device-token');assert.equal(requests[0].headers.get('apikey'),'public');assert.equal(requests[1].headers.has('x-programa5s-terminal'),false);
 // The re-send action targets the selected authorized e-mail, without switching login.
 const controls=new Map();let dialog;const u={T:'administrador',z:'admin@example.com',ye:[{email:'user@example.com',ativo:true}],m:s=>s,ensurePortalSession:async()=>true,oe:e=>e.message,navigator:{clipboard:{writeText:async()=>{}}},document:{body:{append:noop},createElement:()=>{dialog={setAttribute:noop,addEventListener:noop,close:noop,remove:noop,showModal:noop,querySelector:s=>{if(!controls.has(s))controls.set(s,{});return controls.get(s)}};return dialog}},b:{auth:{resetPasswordForEmail:async(email,options)=>{u.sent={email,options};return{data:{}}}}}};
 vm.createContext(u);vm.runInContext(extract('showResendAccess'),u);u.showResendAccess({email:'user@example.com',nome:'Auditor',ativo:true});await controls.get('[data-send-access]').onclick({currentTarget:controls.get('[data-send-access]')});assert.equal(u.sent.email,'user@example.com');assert.equal(u.sent.options.redirectTo,'https://methodflowllba-bit.github.io/5S/');assert.match(controls.get('[data-access-message]').textContent,/Se este e-mail já tem uma conta/);
 console.log('Cliente aprovado: sessão por conta, substituição sem retomar ao recarregar, preservação do rascunho, falha de rede sem liberação, cabeçalho apenas na API de dados e reenvio para o usuário selecionado.');
})().catch(e=>{console.error(e);process.exitCode=1});
