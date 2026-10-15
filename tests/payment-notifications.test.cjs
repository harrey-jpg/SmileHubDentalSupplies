const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
function reviewFixture(failure = false) {
  const records = new Map([
    ['orders/order-1', { userId:'alice', orderNumber:'SH-ONE', paymentMethod:'GCash', paymentStatus:'unpaid', status:'Pending Payment', total:100 }],
    ['gcash_payment_claims/order-1', { status:'For Verification', reference:'12345678', submittedAt:{ toMillis:()=>12345 } }]
  ]);
  let writes = 0; const errors = [];
  const db = { collection:name=>({doc:(id='audit-1')=>({path:name+'/'+id})}), async runTransaction(fn) {
    const changes=[]; await fn({get:async ref=>({exists:records.has(ref.path),data:()=>records.get(ref.path)}),update:(ref,value)=>changes.push([ref.path,{...records.get(ref.path),...value}]),set:(ref,value)=>changes.push([ref.path,value])});
    if(failure) throw new Error('Permission denied');
    changes.forEach(([key,value])=>{records.set(key,value);writes++;});
  }};
  const context = { db, user:{uid:'staff',email:'staff@example.test'}, processing:false, selectedId:'order-1', console:{error(){}},
    $:()=>({disabled:false,checked:true,close(){}}), showError:message=>{if(message)errors.push(message);},showToast(){},render(){},
    firebase:{firestore:{FieldValue:{serverTimestamp:()=>1,arrayUnion:value=>[value]},Timestamp:{now:()=>1}}}
  };
  const html=read('gcash-admin.html');vm.runInNewContext(html.slice(html.indexOf('    async function reviewPayment('),html.indexOf('    function startQueue()')),context);
  return {context,records,errors,writes:()=>writes};
}
test('approval and rejection create one customer alert in the payment transaction',async()=>{
  for(const decision of ['Paid','Rejected']) {
    const app=reviewFixture();await app.context.reviewPayment('order-1',decision,'Reference did not match');
    const notifications=[...app.records.entries()].filter(([key])=>key.startsWith('notifications/'));
    assert.equal(notifications.length,1);const note=notifications[0][1];
    assert.equal(note.userId,'alice');assert.equal(note.orderId,'order-1');assert.equal(note.read,false);
    assert.equal(note.type,decision==='Paid'?'payment_verified':'payment_rejected');
    assert.equal(app.records.get('orders/order-1').paymentStatus,decision==='Paid'?'paid':'unpaid');
    if(decision==='Rejected')assert.match(note.message,/Reference did not match/);
    const count=app.writes();await app.context.reviewPayment('order-1',decision,'Again');assert.equal(app.writes(),count);
  }
});
test('failed review saves neither payment changes nor misleading alerts',async()=>{
  const app=reviewFixture(true);await app.context.reviewPayment('order-1','Paid','');
  assert.equal(app.writes(),0);assert.equal(app.records.get('orders/order-1').paymentStatus,'unpaid');
  assert.equal(app.records.get('gcash_payment_claims/order-1').status,'For Verification');assert.equal(app.errors.length,1);
});
test('customer notifications sync once, preserve reads, and clear on account changes',()=>{
  const storage=new Map(),listeners={},auth={currentUser:{uid:'alice'},onAuthStateChanged(fn){listeners.auth=fn;}},updates=[];
  const db={collection:()=>({where:(_,__,uid)=>({onSnapshot:(_,next)=>{listeners[uid]=next;return()=>{};}}),doc:id=>({id})}),batch:()=>({update:(ref,value)=>updates.push([ref.id,value]),commit:()=>Promise.resolve()})};
  const context={document:{body:{classList:{contains:()=>false}},readyState:'loading',addEventListener(){},getElementById:()=>null,dispatchEvent(){}},
    localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},CustomEvent:class{},console,
    firebase:{auth:()=>auth,firestore:()=>db},addEventListener(){}};
  context.window=context;vm.runInNewContext(read('js/customer-notify.js'),context);
  listeners.auth(auth.currentUser);
  const snapshot={docs:[{id:'payment-1',data:()=>({userId:'alice',kind:'order',type:'payment_verified',title:'Verified',orderId:'order-1',read:false,createdAt:{toDate:()=>new Date(1)}})}],metadata:{hasPendingWrites:false}};
  listeners.alice(snapshot);listeners.alice(snapshot);assert.equal(context.CustomerNotify.getAll().length,1);
  assert.equal(context.CustomerNotify.unreadCount(),1);context.CustomerNotify.markRead('payment-1');assert.equal(updates.length,1);assert.equal(context.CustomerNotify.unreadCount(),0);
  listeners.alice({...snapshot,metadata:{hasPendingWrites:true}});assert.equal(context.CustomerNotify.unreadCount(),0);
  auth.currentUser={uid:'bob'};listeners.auth(auth.currentUser);assert.equal(context.CustomerNotify.getAll().length,0);
  listeners.alice(snapshot);assert.equal(context.CustomerNotify.getAll().length,0);
});
test('admin bell receives pending GCash claims without duplicating repeated snapshots',()=>{
  const listeners={},auth={currentUser:{uid:'staff'},onAuthStateChanged(fn){listeners.auth=fn;}};let updates=0;
  const context={roleResolved:true,currentRole:'staff',window:{addEventListener(){}},firebase:{auth:()=>auth,firestore:()=>({collection:()=>({where:(_,__,status)=>{assert.equal(status,'For Verification');return {onSnapshot:(next,error)=>{listeners.next=next;listeners.error=error;return()=>{};}};}})})},updateDashboard:()=>updates++,fetchAuditLogs:fn=>fn(),renderNotifDropdown(){}};
  context.window.firebase=context.firebase;
  const source=read('js/admin.js');vm.runInNewContext(source.slice(source.indexOf('  var pendingPaymentClaims ='),source.indexOf('  function formatNotifTime(')),context);
  context.startPaymentNotifications();const snapshot={docs:[{id:'order-1',data:()=>({status:'For Verification'})}]};
  listeners.next(snapshot);listeners.next(snapshot);assert.equal(context.pendingPaymentClaims.length,1);assert.equal(updates,2);
  auth.currentUser=null;listeners.auth(null);assert.equal(context.pendingPaymentClaims.length,0);
  auth.currentUser={uid:'customer'};context.currentRole='customer';const old=updates;context.startPaymentNotifications();assert.equal(updates,old);
});

test('a payment notification opens its actual order document once',()=>{
  const source=read('js/orders.js');
  const snippet=source.slice(source.indexOf('    var requestedOrder ='),source.indexOf('  function reorder(')).replace(/\s*}\s*$/,'');
  let opened=0;const rows=[0,1].map(()=>({classList:{add(){}},nextElementSibling:{classList:{remove(){}},scrollIntoView:()=>opened++}}));
  const context={URLSearchParams,location:{search:'?order=mobile-real-id'},notificationOrderOpened:false,filtered:[{docId:'other-id'},{docId:'mobile-real-id'}],table:{querySelectorAll:()=>rows}};
  vm.runInNewContext(snippet,context);vm.runInNewContext(snippet,context);
  assert.equal(opened,1);assert.equal(context.notificationOrderOpened,true);
});
