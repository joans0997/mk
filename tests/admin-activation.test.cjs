const {JSDOM}=require('jsdom'),fs=require('fs'),assert=require('node:assert/strict');
const root=require('node:path').join(__dirname,'../');
async function scenario({invalid=false,retry=false}={}){
 const html=fs.readFileSync(root+'admin.html','utf8').replace(/<script[\s\S]*?<\/script>/g,'');
 const d=new JSDOM(html,{url:'https://example.test/admin.html#token_hash=private-test-token&type=invite',runScripts:'outside-only'}),w=d.window;w.AbortSignal=AbortSignal;let verifies=0,updates=0,fail=retry;
 w.fetch=async(url,opts)=>{let payload={};let ok=true,status=200;
 if(url.endsWith('/verify')){verifies++;if(invalid){ok=false;status=403;}else payload={access_token:'test-access',user:{app_metadata:{role:'catalog_admin'}}};}
 if(url.endsWith('/user')){updates++;assert.equal(opts.headers.Authorization,'Bearer test-access');assert.equal(JSON.parse(opts.body).password,'a-secure-test-password');if(fail){fail=false;throw new Error('network');}}
 return {ok,status,text:async()=>JSON.stringify(payload)};};
 for(const f of ['config','catalog','admin'])w.eval(fs.readFileSync(root+'assets/js/'+f+'.js','utf8'));
 const $=id=>w.document.getElementById(id);assert.equal(w.location.hash,'');assert.equal($('login').hidden,true);assert.equal($('activateAccount').hidden,false);
 async function submit(){ $('activateAccount').dispatchEvent(new w.SubmitEvent('submit',{cancelable:true}));await new Promise(r=>setTimeout(r,10)); }
 $('newPassword').value='a-secure-test-password';$('confirmPassword').value='different-password';await submit();assert.equal(verifies,0);
 $('confirmPassword').value='a-secure-test-password';await submit();
 if(retry){assert.equal($('activateAccount').hidden,false);await submit();assert.equal(verifies,1);assert.equal(updates,2);}
 if(invalid){assert.equal(updates,0);assert.equal($('activateAccount').hidden,false);}else{assert.equal($('activateAccount').hidden,true);assert.equal($('login').hidden,false);assert.match($('status').textContent,/Contraseña guardada/);assert.equal($('newPassword').value,'');}
 w.close();
}
(async()=>{await scenario();await scenario({invalid:true});await scenario({retry:true});console.log('PASS activation: private fragment removed, mismatches rejected, valid link sets password, expired link blocked, retry preserves session without consuming invite twice');})();
