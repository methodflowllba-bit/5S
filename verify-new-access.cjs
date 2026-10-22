const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('app.js','utf8');
function extract(name){const pts=[...source.matchAll(/^  (?:async )?function ([\w$]+)\(/gm)],i=pts.findIndex(p=>p[1]===name);assert.ok(i>=0,name);return source.slice(pts[i].index,pts[i+1].index)}
const event={preventDefault(){}},user={id:'auditor',email:'auditor@example.com'},session={user};
function setup(){
 const nodes=new Map(),form={elements:{email:{value:' AUDITOR@example.com '},password:{value:'my-new-password'},confirm:{value:'my-new-password'}},button:{},querySelector(){return this.button},reset(){Object.values(this.elements).forEach(field=>field.value='')}};
 nodes.set('#firstAccessForm',form);
 const forbidden=()=>{throw Error('Não deve enviar e-mail nem sobrescrever senha existente')};
 const ctx={g:null,p:null,T:null,d:null,ne:[],ye:[],x:false,passwordSetupInProgress:false,webPageLoginVerified:false,portalTerminalToken:'',crypto:{randomUUID:()=> 'terminal'},
 W:()=>'',m:s=>s,oe:e=>e.message||e.code,Z:()=>{ctx.login=true},c:key=>{if(!nodes.has(key))nodes.set(key,{});return nodes.get(key)},b:{
 rpc:async name=>{ctx.rpcCalls??=[];ctx.rpcCalls.push(name);return ctx.rpcResult||{data:true}},
 auth:{signUp:async args=>{ctx.registered=args;ctx.registerCount=(ctx.registerCount||0)+1;return ctx.result||{data:{session}}},getUser:async()=>({data:{user:ctx.currentUser||user}}),signOut:async()=>{ctx.signedOut=true;return{data:{}}},signInWithOtp:forbidden,verifyOtp:forbidden,resetPasswordForEmail:forbidden,resetPassword:forbidden,updateUser:forbidden}}};
 vm.createContext(ctx);vm.runInContext(['isExistingAccountError','firstAccessRegistration','validateActiveFirstAccess','endFirstAccess','Ta','Ue'].map(extract).join('\n'),ctx);ctx.firstAccessRegistration();
 return{ctx,nodes,form};
}
(async()=>{
 const a=setup();assert.match(a.nodes.get('#app').innerHTML,/name="password"/);assert.match(a.nodes.get('#app').innerHTML,/name="confirm"/);assert.ok(!a.nodes.get('#app').innerHTML.includes('verifyEmailForm'));
 a.form.elements.confirm.value='wrong';await a.form.onsubmit(event);assert.equal(a.ctx.registered,undefined);assert.match(a.nodes.get('#firstAccessMessage').textContent,/iguais/);a.form.elements.confirm.value=a.form.elements.password.value;
 await a.form.onsubmit(event);assert.equal(a.ctx.registered.email,user.email);assert.equal(a.ctx.registered.password,'my-new-password');assert.ok(a.ctx.rpcCalls.includes('iniciar_sessao_5s'));assert.equal(a.ctx.p,null);assert.equal(a.ctx.webPageLoginVerified,false);assert.equal(a.ctx.login,true);assert.match(a.nodes.get('#authError').textContent,/acesso ativo confirmado/);assert.equal(a.form.elements.password.value,'');
 const inactive=setup();inactive.ctx.rpcResult={error:{code:'42501',message:'denied'}};await inactive.form.onsubmit(event);assert.equal(inactive.ctx.p,null);assert.equal(inactive.ctx.signedOut,true);assert.match(inactive.nodes.get('#authError').textContent,/não está ativo/);
 const existing=setup();existing.ctx.result={error:{code:'user_already_exists',message:'already registered'}};await existing.form.onsubmit(event);assert.equal(existing.ctx.p,null);assert.equal(existing.ctx.rpcCalls,undefined);assert.match(existing.nodes.get('#firstAccessMessage').textContent,/não sobrescreve a senha/);assert.match(existing.nodes.get('#firstAccessMessage').textContent,/ainda não está disponível/);
 const wrong=setup();wrong.ctx.currentUser={id:'other',email:'other@example.com'};await wrong.form.onsubmit(event);assert.equal(wrong.ctx.p,null);assert.equal(wrong.ctx.signedOut,true);assert.equal((wrong.ctx.rpcCalls||[]).includes('iniciar_sessao_5s'),false);
 const cancel=setup();await cancel.nodes.get('#backFirstAccess').onclick();assert.equal(cancel.ctx.login,true);assert.equal(cancel.ctx.registered,undefined);
 const recovery=setup();recovery.ctx.Ta();assert.ok(!recovery.nodes.get('#app').innerHTML.includes('<form'));assert.match(recovery.nodes.get('#app').innerHTML,/ainda não está disponível/);recovery.ctx.V='old-email-token';recovery.ctx.Ue();assert.equal(recovery.ctx.V,'');
 assert.ok(!/b\.auth\.(signInWithOtp|verifyOtp|resetPasswordForEmail|resetPassword)\(/.test(source),'Nenhum fluxo do portal pode solicitar e-mail');
 console.log('Aprovado: cadastro direto por senha sem OTP/e-mail; liberação do portal somente com cadastro ativo; senha divergente bloqueada; conta existente não tem senha sobrescrita; recuperação expõe limitação administrativa sem enviar mensagens.');
})().catch(error=>{console.error(error);process.exitCode=1});
