const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('app.js','utf8'),start=source.indexOf('  function prepareBlankLogin('),end=source.indexOf('  function Z()',start);
function field(type){const events={};return{type,value:'saved-value',defaultValue:'saved-value',attributes:{},setAttribute(k,v){this.attributes[k]=v},addEventListener(name,callback){events[name]=callback},fire(name){events[name]?.()}}}
const email=field('email'),password=field('password'),form={elements:{email,password},setAttribute(k,v){this[k]=v}};
const ctx={};vm.createContext(ctx);vm.runInContext(source.slice(start,end),ctx);ctx.prepareBlankLogin(form);
assert.equal(form.autocomplete,'off');for(const f of [email,password]){assert.equal(f.value,'');assert.equal(f.defaultValue,'');assert.equal(f.readOnly,true);f.value='browser-fill';f.fire('input');assert.equal(f.value,'')}
assert.equal(password.attributes.autocomplete,'new-password');assert.equal(email.attributes.autocomplete,'off');
email.fire('pointerdown');email.value='manual@example.com';email.fire('focus');email.fire('input');assert.equal(email.value,'manual@example.com');assert.equal(email.readOnly,false);
password.fire('focus');password.value='typed-password';password.fire('input');password.fire('focus');assert.equal(password.value,'typed-password');assert.equal(password.readOnly,false);
const loginTemplate=source.split('\n').find(line=>line.includes('<form id="authForm"'));
assert.match(loginTemplate,/<form id="authForm" autocomplete="off">/);assert.match(loginTemplate,/name="email" type="email" autocomplete="off" readonly/);assert.match(loginTemplate,/name="password" type="password" autocomplete="new-password" readonly/);assert.ok(!loginTemplate.includes('current-password'));
console.log('Aprovado: login inicia vazio, preenchimento antes da interação é descartado, campos são liberados com mouse/teclado e a digitação é preservada. O preenchimento forçado pelo gerenciador externo depende do navegador.');
