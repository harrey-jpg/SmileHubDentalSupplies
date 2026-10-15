// Run with: firebase emulators:exec --config firebase.payments-emulator.json --project demo-smilehub-payments --only firestore "node tests/payment-notifications.emulator.cjs"
const assert = require('node:assert/strict');
const host = process.env.FIRESTORE_EMULATOR_HOST;
assert.match(host || '', /^(127\.0\.0\.1|localhost):\d+$/, 'This test only runs against a local emulator');
const project = 'demo-smilehub-payments', database = `projects/${project}/databases/(default)`;
const base = `http://${host}/v1/${database}/documents`;
const fields = data => Object.fromEntries(Object.entries(data).map(([key,value]) => [key, typeof value === 'string' ? { stringValue:value } : typeof value === 'boolean' ? {booleanValue:value} : {integerValue:String(value)}]));
function token(uid) {
  const now = Math.floor(Date.now()/1000);
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  return encode({alg:'none',typ:'JWT'}) + '.' + encode({sub:uid,user_id:uid,email:uid+'@example.test',aud:project,iss:'https://securetoken.google.com/'+project,iat:now,exp:now+3600,firebase:{sign_in_provider:'custom'}}) + '.';
}
async function request(url, method, body, uid='owner') {
  const response = await fetch(url,{method,headers:{Authorization:'Bearer '+(uid==='owner'?'owner':token(uid)),'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
  return {status:response.status,body:await response.json()};
}
const write = (id,data,mask) => ({update:{name:database+'/documents/'+id,fields:fields(data)},...(mask?{updateMask:{fieldPaths:mask}}:{})});
async function commit(uid,writes,expected=200) {
  const result = await request(base+':commit','POST',{writes},uid);
  assert.equal(result.status,expected,JSON.stringify(result.body)); return result;
}
async function seed(id) {
  await commit('owner',[
    write('orders/'+id,{userId:'alice',paymentMethod:'GCash',paymentStatus:'unpaid',status:'Pending Payment',total:100}),
    write('gcash_payment_claims/'+id,{orderId:id,userId:'alice',reference:'12345678',status:'For Verification'})
  ]);
}
async function main() {
  await commit('owner',[write('users/staff',{role:'staff'}),write('users/alice',{role:'customer'}),write('users/bob',{role:'customer'})]);
  await seed('paid');
  await commit('staff',[
    write('orders/paid',{paymentStatus:'paid'},['paymentStatus']),
    write('gcash_payment_claims/paid',{status:'Paid'},['status']),
    write('notifications/paid',{userId:'alice',orderId:'paid',type:'payment_verified',read:false})
  ]);
  await seed('rejected');
  await commit('staff',[
    write('gcash_payment_claims/rejected',{status:'Rejected',reason:'Reference mismatch'},['status','reason']),
    write('notifications/rejected',{userId:'alice',orderId:'rejected',type:'payment_rejected',read:false})
  ]);
  await seed('pending');
  for(const [actor,notification] of [
    ['alice',{userId:'bob',orderId:'pending',type:'payment_verified'}],
    ['staff',{userId:'alice',orderId:'pending',type:'payment_verified'}],
    ['staff',{userId:'alice',orderId:'pending',type:'payment_rejected'}],
    ['staff',{userId:'bob',orderId:'paid',type:'payment_verified'}],
    ['staff',{userId:'alice',orderId:'paid',type:'unrelated'}]
  ]) await commit(actor,[write('notifications/denied-'+actor+'-'+notification.type+'-'+notification.userId,notification)],403);
  await commit('staff',[
    write('orders/pending',{paymentStatus:'paid'},['paymentStatus']),
    write('notifications/invalid-review',{userId:'alice',orderId:'pending',type:'payment_verified'})
  ],403);
  const order = await request(base+'/orders/pending','GET',null,'alice');
  assert.equal(order.body.fields.paymentStatus.stringValue,'unpaid');
  await commit('alice',[write('notifications/submitted',{userId:'alice',orderId:'pending',type:'payment_submitted',read:false})]);
  await commit('alice',[write('notifications/paid',{read:true},['read'])]);
  const deniedRead=await request(base+'/notifications/paid','GET',null,'bob');assert.equal(deniedRead.status,403);
  console.log('Firestore payment notification rules passed: staff decisions, owner reads, denied forged alerts, and atomic rollback.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
