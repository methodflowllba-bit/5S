const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('app.js','utf8');
function extract(name){const pts=[...source.matchAll(/^  (?:async )?function ([\w$]+)\(/gm)],i=pts.findIndex(p=>p[1]===name);return source.slice(pts[i].index,pts[i+1].index)}
const event={preventDefault(){}},user={id:'auditor',email:'auditor@example.com'},session={user};
function setup(){
 const nodes=new Map();const form=elements=>({elements,button:{},hidden:true,querySelector(){return this.button},reset(){Object.values(this.elements).forEach(e=>e.value='')}});
 const register=form({email:{value:user.email},password:{value:'my-new-password'},confirm:{value:'my-new-password'}}),verify=form({code:{value:'123456',focus(){}}});
 nodes.set('#firstAccessForm',register);nodes.set('#verifyEmailForm',verify);
 const ctx={g:null,p:null,T:null,d:null,ne:[],ye:[],x:false,passwordSetupInProgress:false,webPageLoginVerified:false,portalTerminalToken:'',crypto:{randomUUID:()=> 'terminal'},
 W:()=>'',m:s=>s,oe:e=>e.message||e.code,Z:()=>{ctx.login=true},Ta:email=>ctx.recovery=email,c:key=>{if(!nodes.has(key))nodes.set(key,{});return nodes.get(key)},b:{
 rpc:async(name)=>{ctx.rpcCalls??=[];ctx.rpcCalls.push(name);return ctx.rpcResult||{data:true}},
 auth:{signInWithOtp:async args=>{ctx.sent=args;ctx.sentCount=(ctx.sentCount||0)+1;return{data:{ok:true}}},verifyOtp:async()=>ctx.otpResult||{data:{session}},getUser:async()=>({data:{user:ctx.currentUser||user}}),updateUser:async args=>{ctx.updated=args;return ctx.updateResult||{data:{user}}},signOut:async()=>{ctx.signedOut=true;return{data:{}}}}}};
 vm.createContext(ctx);vm.runInContext(['terminalStorageKey','savePortalTerminal','emailCodeAccess','validateActiveFirstAccess','endFirstAccess'].map(extract).join('\n'),ctx);ctx.emailCodeAccess();
 return{ctx,nodes,register,verify};
}
async function requestCode(a){await a.register.onsubmit(event);a.verify.elements.code.value='123456'}
(async()=>{
 const a=setup();assert.match(a.nodes.get('#app').innerHTML,/name="password"/);assert.match(a.nodes.get('#app').innerHTML,/name="confirm"/);assert.ok(!a.nodes.get('#app').innerHTML.includes('Confirmar meu e-mail'));assert.ok(!a.nodes.get('#app').innerHTML.includes('Já recebi um código'));
 a.register.elements.confirm.value='different';await a.register.onsubmit(event);assert.equal(a.ctx.sent,undefined);assert.match(a.nodes.get('#firstAccessMessage').textContent,/iguais/);a.register.elements.confirm.value=a.register.elements.password.value;
 await requestCode(a);assert.equal(a.ctx.sent.email,user.email);assert.equal(a.ctx.updated,undefined);assert.equal(a.ctx.p,null);assert.equal(a.ctx.passwordSetupInProgress,true);assert.match(a.nodes.get('#firstAccessMessage').textContent,/senha ainda não foi registrada/);assert.equal(a.register.elements.email.readOnly,true);
 a.ctx.otpResult={error:{code:'invalid_otp'}};await a.verify.onsubmit(event);assert.equal(a.ctx.updated,undefined);assert.equal(a.ctx.webPageLoginVerified,false);
 a.ctx.otpResult={data:{session}};await a.verify.onsubmit(event);assert.equal(a.ctx.updated.password,'my-new-password');assert.deepEqual(a.ctx.rpcCalls.slice(0,2),['iniciar_sessao_5s','sessao_5s_ativa']);assert.equal(a.ctx.signedOut,true);assert.equal(a.ctx.login,true);assert.equal(a.ctx.p,null);assert.match(a.nodes.get('#authError').textContent,/Senha registrada/);assert.equal(a.register.elements.password.value,'');
 const inactive=setup();inactive.ctx.rpcResult={error:{code:'42501',message:'denied'}};await requestCode(inactive);await inactive.verify.onsubmit(event);assert.equal(inactive.ctx.updated,undefined);assert.equal(inactive.ctx.signedOut,true);assert.match(inactive.nodes.get('#authError').textContent,/não está ativo/);
 const revoked=setup();revoked.ctx.b.rpc=async name=>({data:name==='iniciar_sessao_5s'});await requestCode(revoked);await revoked.verify.onsubmit(event);assert.equal(revoked.ctx.updated,undefined,'Revalidar acesso imediatamente antes de gravar senha');assert.match(revoked.nodes.get('#authError').textContent,/desativado/);
 const existing=setup();existing.ctx.updateResult={error:{code:'current_password_required'}};await requestCode(existing);await existing.verify.onsubmit(event);assert.equal(existing.ctx.recovery,user.email);assert.equal(existing.ctx.signedOut,true);assert.match(existing.nodes.get('#recoveryMessage').textContent,/já possui senha/);
 const weak=setup();weak.ctx.updateResult={error:{code:'password_breached'}};await requestCode(weak);await weak.verify.onsubmit(event);assert.equal(weak.ctx.login,undefined);weak.ctx.updateResult={data:{user}};weak.register.elements.password.value=weak.register.elements.confirm.value='another-new-password';await weak.register.onsubmit(event);assert.equal(weak.ctx.updated.password,'another-new-password');assert.equal(weak.ctx.sentCount,1,'Corrigir senha recusada sem exigir outro código');assert.equal(weak.ctx.login,true);
 const cancel=setup();await cancel.nodes.get('#backFirstAccess').onclick();assert.equal(cancel.ctx.login,true);assert.equal(cancel.register.elements.password.value,'');
 const wrong=setup();wrong.ctx.currentUser={id:'other',email:'other@example.com'};await requestCode(wrong);await wrong.verify.onsubmit(event);assert.equal(wrong.ctx.updated,undefined);assert.equal(wrong.ctx.rpcCalls?.includes('iniciar_sessao_5s')||false,false);
 assert.ok(!extract('Z').includes('Entrar com código'));assert.match(extract('Z'),/Primeiro acesso — criar senha/);assert.ok(!extract('Ta').includes('emailCodeAccess'));
 console.log('Aprovado: primeiro acesso abre diretamente e-mail e duas senhas; registro somente após confirmação e acesso ativo; datas pessoais não são gravadas antes; senha divergente, código inválido, cadastro desativado e sessão trocada não gravam senha; recuperação e cancelamento funcionam.');
})().catch(e=>{console.error(e);process.exitCode=1});
