// Local only: firebase emulators:exec --config firebase.security-emulator.json --project demo-smilehub-security --only firestore,storage "node tests/shared-permissions.emulator.cjs"
const assert=require('node:assert/strict'), fs=require('node:fs');
const host=process.env.FIRESTORE_EMULATOR_HOST;
assert.match(host||'',/^(localhost|127\.0\.0\.1):\d+$/);
const project='demo-smilehub-security', db=`projects/${project}/databases/(default)`,base=`http://${host}/v1/${db}/documents`;
const fields=data=>Object.fromEntries(Object.entries(data).map(([k,v])=>[k,typeof v==='number'?{integerValue:String(v)}:typeof v==='boolean'?{booleanValue:v}:{stringValue:v}]));
function token(uid){const enc=v=>Buffer.from(JSON.stringify(v)).toString('base64url'),now=Math.floor(Date.now()/1000);return enc({alg:'none',typ:'JWT'})+'.'+enc({sub:uid,user_id:uid,email:uid+'@example.test',email_verified:true,aud:project,iss:'https://securetoken.google.com/'+project,iat:now,exp:now+3600,firebase:{sign_in_provider:'custom'}})+'.';}
async function req(uid,method,path,body,expected=200){const r=await fetch(base+path,{method,headers:{Authorization:'Bearer '+(uid==='owner'?'owner':token(uid)),'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});const result=await r.json();assert.equal(r.status,expected,JSON.stringify(result));return result;}
const write=(path,data,mask)=>({update:{name:db+'/documents/'+path,fields:fields(data)},...(mask?{updateMask:{fieldPaths:mask}}:{})});
const commit=(uid,writes,expected)=>req(uid,'POST',':commit',{writes},expected);
(async()=>{
for(const [uid,role] of [['alice','customer'],['bob','customer'],['staff','staff'],['admin','admin'],['super','superadmin'],['suspended','customer']])await commit('owner',[write('users/'+uid,{email:uid+'@example.test',role,status:uid==='suspended'?'suspended':'active'})]);
await commit('owner',[write('user_registrations/invited@example.test',{role:'staff',claimed:false})]);
await commit('invited',[write('users/invited',{email:'invited@example.test',role:'staff'})]);
await commit('invited',[write('accounts/invited@example.test',{email:'invited@example.test',role:'staff',status:'active'})]);
await commit('owner',[write('users/mirror-suspended',{email:'mirror-suspended@example.test',role:'customer'}),write('accounts/mirror-suspended@example.test',{role:'customer',status:'suspended'})]);
await commit('mirror-suspended',[write('users/mirror-suspended',{fullName:'Blocked'},['fullName'])],403);
await commit('alice',[write('users/alice',{fullName:'Alice Smith'},['fullName'])]);
for(const fields of [{role:'admin'},{status:'suspended'},{permissions:'admin'}])await commit('alice',[write('users/alice',fields,Object.keys(fields))],403);
await commit('suspended',[write('users/suspended',{status:'active'},['status'])],403);
await req('suspended','DELETE','/users/suspended',null,403);
await commit('alice',[write('accounts/alice@example.test',{email:'alice@example.test',role:'admin',status:'active'})],403);
await commit('alice',[write('accounts/alice@example.test',{email:'alice@example.test',role:'customer',status:'active'})]);
await commit('admin',[write('users/staff',{role:'superadmin'},['role'])],403);
await commit('admin',[write('users/super',{fullName:'Changed'},['fullName'])],403);
await commit('admin',[write('user_registrations/new@example.test',{role:'superadmin',claimed:'false'})],403);
await commit('super',[write('users/staff',{role:'admin'},['role'])]);
await commit('admin',[write('users/bob',{status:'suspended'},['status'])]);
await commit('bob',[write('users/bob',{status:'active'},['status'])],403);
await commit('owner',[write('products/p',{stock:5,price:100}),write('orders/o',{userId:'alice',status:'Pending',paymentStatus:'unpaid',total:100})]);
await commit('alice',[write('products/p',{stock:100},['stock'])],403);
await commit('alice',[write('orders/o',{paymentStatus:'paid'},['paymentStatus'])],403);
await commit('admin',[write('products/p',{stock:10},['stock'])]);
await commit('alice',[write('orders/new',{userId:'alice',status:'Pending',paymentStatus:'unpaid',total:100})]);
await req('alice','GET','/orders/o');
await req('bob','GET','/orders/o',null,403);
if(process.env.FIREBASE_STORAGE_EMULATOR_HOST){
const storage='http://'+process.env.FIREBASE_STORAGE_EMULATOR_HOST+'/v0/b/demo-smilehub-security.appspot.com/o';
async function upload(uid,name,expected,type='image/png'){
const r=await fetch(storage+'?uploadType=media&name='+encodeURIComponent('product-images/'+name),{method:'POST',headers:{Authorization:'Bearer '+token(uid),'Content-Type':type},body:Buffer.from('test-image')});
assert.equal(r.status,expected,await r.text());
}
await upload('admin','allowed.png',200);
await upload('super','allowed-super.png',200);
await upload('alice','denied.png',403);
await upload('alice','allowed.png',403);
await commit('owner',[write('users/image-staff',{email:'image-staff@example.test',role:'staff'})]);
await upload('image-staff','staff.png',403);
await upload('suspended','suspended.png',403);
await upload('admin','invalid.txt',403,'text/plain');
console.log('PASS: Storage customer denial, admin uploads, suspension and file type checks.');
}
const legacy=fs.readFileSync(require('node:path').join(__dirname,'payment-notifications.emulator.cjs'),'utf8').replaceAll('demo-smilehub-payments',project);
require('node:vm').runInNewContext(legacy,{require,process,Buffer,fetch,console},{filename:'payment-notifications.emulator.cjs'});
console.log('PASS: customer profile, role escalation, suspension bypass, admin hierarchy, product stock and order payment rules.');
})().catch(e=>{console.error(e);process.exitCode=1;});

