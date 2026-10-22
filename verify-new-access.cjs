const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('app.js','utf8');
function extract(name){const pts=[...source.matchAll(/^  (?:async )?function ([\w$]+)\(/gm)],i=pts.findIndex(p=>p[1]===name);return source.slice(pts[i].index,pts[i+1].index)}
const noop=()=>{},event={preventDefault:noop},user={id:'auditor',email:'auditor@example.com'},session={user};
function setup(){
 const nodes=new Map();const form=elements=>({elements,button:{},querySelector(){return this.button},reportValidity:()=>true,reset(){Object.values(this.elements).forEach(e=>e.value='')},after(node){this.inserted=node}});
 const request=form({email:{value:user.email}}),verify=form({code:{value:'123456',focus:noop}}),password=form({password:{value:'my-new-password'},confirm:{value:'my-new-password'}});
 nodes.set('#emailCodeForm',request);nodes.set('#verifyEmailForm',verify);nodes.set('#firstPasswordForm',password);
 const ctx={p:null,T:null,d:null,ne:[],ye:[],x:false,passwordSetupInProgress:false,webPageLoginVerified:false,portalTerminalToken:'',crypto:{randomUUID:()=> 'terminal'},savePortalTerminal:noop,
 W:()=>'',m:s=>s,oe:e=>e.message||e.code,Z:()=>{ctx.login=true},Ta:email=>ctx.recovery=email,document:{createElement:()=>({})},c:key=>{if(!nodes.has(key))nodes.set(key,{});return nodes.get(key)},b:{
 rpc:async(name)=>{ctx.rpcCalls??=[];ctx.rpcCalls.push(name);return ctx.rpcResult||{data:true}},
 auth:{signInWithOtp:async args=>{ctx.sent=args;return{data:{ok:true}}},verifyOtp:async()=>ctx.otpResult||{data:{session}},getUser:async()=>({data:{user:ctx.currentUser||user}}),updateUser:async args=>{ctx.updated=args;return ctx.updateResult||{data:{user}}},signOut:async()=>{ctx.signedOut=true;return{data:{}}}}}};
 vm.createContext(ctx);vm.runInContext(['emailCodeAccess','validateActiveFirstAccess','firstAccessPassword','endFirstAccess'].map(extract).join('\n'),ctx);
 return{ctx,nodes,request,verify,password};
}
(async()=>{
 const a=setup();a.ctx.emailCodeAccess();await a.request.onsubmit(event);assert.equal(a.ctx.sent.email,user.email);assert.equal(a.ctx.passwordSetupInProgress,true);assert.equal(a.ctx.p,null);assert.match(a.nodes.get('#emailCodeMessage').textContent,/Recebimento ainda não confirmado/);
 a.verify.elements.code.value='123456';a.ctx.otpResult={error:{code:'invalid_otp'}};await a.verify.onsubmit(event);assert.equal(a.ctx.updated,undefined);assert.equal(a.ctx.p,null);
 a.ctx.otpResult={data:{session}};await a.verify.onsubmit(event);assert.match(a.nodes.get('#app').innerHTML,/Criar minha senha/);assert.equal(a.ctx.webPageLoginVerified,false);assert.equal(a.ctx.p,null);assert.ok(a.ctx.rpcCalls.includes('iniciar_sessao_5s'));
 a.password.elements.confirm.value='different';await a.password.onsubmit(event);assert.equal(a.ctx.updated,undefined);assert.match(a.nodes.get('#firstPasswordMessage').textContent,/iguais/);
 a.password.elements.confirm.value=a.password.elements.password.value;await a.password.onsubmit(event);assert.equal(a.ctx.updated.password,'my-new-password');assert.equal(a.ctx.signedOut,true);assert.equal(a.ctx.login,true);assert.equal(a.ctx.p,null);assert.equal(a.ctx.passwordSetupInProgress,false);assert.match(a.nodes.get('#authError').textContent,/Senha registrada/);assert.equal(a.password.elements.password.value,'');
 const inactive=setup();inactive.ctx.rpcResult={error:{code:'42501',message:'denied'}};inactive.ctx.emailCodeAccess();inactive.request.inserted.onclick();await inactive.verify.onsubmit(event);assert.equal(inactive.ctx.updated,undefined);assert.equal(inactive.ctx.signedOut,true);assert.match(inactive.nodes.get('#authError').textContent,/não está ativo/);
 const changed=setup();changed.ctx.emailCodeAccess();changed.request.inserted.onclick();await changed.verify.onsubmit(event);changed.ctx.rpcResult={data:false};await changed.password.onsubmit(event);assert.equal(changed.ctx.updated,undefined,'Revalidar cadastro antes de registrar senha');
 const existing=setup();existing.ctx.emailCodeAccess();existing.request.inserted.onclick();await existing.verify.onsubmit(event);existing.ctx.updateResult={error:{code:'current_password_required'}};await existing.password.onsubmit(event);assert.equal(existing.nodes.get('#existingPasswordRecovery').hidden,false);assert.match(existing.nodes.get('#firstPasswordMessage').textContent,/já possui senha/);await existing.nodes.get('#existingPasswordRecovery').onclick();assert.equal(existing.ctx.recovery,user.email);assert.equal(existing.ctx.signedOut,true);
 const wrong=setup();wrong.ctx.currentUser={id:'other',email:'other@example.com'};await assert.rejects(()=>wrong.ctx.validateActiveFirstAccess(session),/confirmação expirou/);assert.equal(wrong.ctx.rpcCalls,undefined);
 assert.ok(!extract('Z').includes('Entrar com código'));assert.match(extract('Z'),/Primeiro acesso — criar senha/);assert.match(extract('Z'),/Esqueci minha senha/);assert.ok(!extract('Ta').includes('emailCodeAccess'));
 console.log('Aprovado: primeiro acesso confirma e-mail e cadastro ativo antes de criar senha, não abre o portal por OTP, valida confirmação da senha, revalida acesso, bloqueia sessão divergente, oferece recuperação para senha existente e retorna ao login vazio.');
})().catch(e=>{console.error(e);process.exitCode=1});
