const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../js/delivery-settings.js'), 'utf8');
const admin = fs.readFileSync(path.join(__dirname, '../js/admin.js'), 'utf8');
const checkout = fs.readFileSync(path.join(__dirname, '../js/checkout.js'), 'utf8').replace(/\r\n/g,'\n');
const next = () => new Promise(setImmediate);
function fixture() {
  const elements = new Map(), listeners = new Map();
  const state = { reads: 0, writes: 0, stored: null, timers: [], payments: 0, orderWrites: [], role: 'admin' };
  function element(id) {
    if (!elements.has(id)) elements.set(id, { value: 'Example', hidden: false, checked: false, style: {}, dataset: {}, textContent: '', attributes: {},
      setAttribute(k,v) { this.attributes[k]=v; }, removeAttribute(k) { delete this.attributes[k]; }, focus() { this.focused=true; }, contains() { return false; },
      addEventListener(event, fn) { this[event]=fn; }, querySelector: () => element('submit'), querySelectorAll: () => [element('submit')] });
    return elements.get(id);
  }
  const user = { uid: 'admin-1' };
  const reference = {
    get(options) { assert.equal(options.source,'server'); state.reads++; return new Promise((resolve,reject) => { state.readResolve=()=>resolve({exists:!!state.stored,data:()=>state.stored});state.readReject=reject; }); },
    set(data,options) { assert.equal(options.merge,true); state.writes++; return new Promise((resolve,reject)=>{state.writeResolve=()=>{state.stored=data;resolve();};state.writeReject=reject;}); }
  };
  const context = vm.createContext({ console, Promise, Event: class { constructor(type){this.type=type;} },
    setTimeout(fn) { state.timers.push(fn); return fn; }, clearTimeout() {},
    firebase: { auth: ()=>({currentUser:user}),firestore:()=>({collection(name){assert.equal(name,'cms');return {doc(id){assert.equal(id,'delivery');return reference;}};}}) },
    window: {}, document: { body: {classList:{contains:()=>false}},activeElement:null,getElementById:element,
      querySelector:()=>({value:'Cash on Delivery'}),querySelectorAll:()=>[],
      addEventListener(event,fn) { const list=listeners.get(event)||[];list.push(fn);listeners.set(event,list); },dispatchEvent(event){for(const fn of listeners.get(event.type)||[])fn();} },
    settingsAuthUser:()=>user, canEditStoreInformation:()=>state.role==='admin'||state.role==='superadmin',
    getCurrentUserRoleFresh:async()=>state.role, addAuditLog(){state.audit=(state.audit||0)+1;} });
  vm.runInContext(source,context);
  return { context, state, element, api:context.window.SmileHubDelivery };
}
test('Delivery values, shared calculations, loaded states, and acknowledged saves', async()=>{
  const f=fixture(), {api,state}=f;
  for(const data of [{standardFee:-1,freeShippingThreshold:3000},{standardFee:1.001,freeShippingThreshold:3000},{standardFee:150,freeShippingThreshold:0},{standardFee:'',freeShippingThreshold:3000},{standardFee:'1e3',freeShippingThreshold:3000}]) assert.ok(Object.keys(api.validate(data).errors).length);
  assert.equal(Object.keys(api.validate({standardFee:'0.00',freeShippingThreshold:'2500.50'}).errors).length,0);
  const first=api.refresh(), duplicate=api.refresh(); assert.equal(first,duplicate); assert.equal(state.reads,1); assert.equal(api.status(),'loading');
  state.readResolve(); await first; assert.equal(api.status(),'ready');
  for(const [subtotal,fee] of [[0,0],[2999.99,150],[3000,0],[4500,0]])assert.equal(api.calculate(subtotal).shipping,fee);
  api.apply({standardFee:75.25,freeShippingThreshold:2500.50});
  const standard=f.element('standardPromotion'),custom=f.element('customPromotion');
  standard.dataset.deliveryMessage='promotion';custom.dataset.deliveryMessage='promotion';custom.dataset.deliveryCustom='true';custom.textContent='Clinic Starter Sale';
  f.context.document.querySelectorAll=selector=>selector==='[data-delivery-message]'?[standard,custom]:[];
  api.apply(api.settings());assert.match(standard.textContent,/2,500.50/);assert.equal(custom.textContent,'Clinic Starter Sale');
  assert.equal(api.calculate(2500.49).remaining,0.01);assert.equal(api.calculate(2500.50).shipping,0);
  assert.equal(api.calculate(1000).shipping,75.25); assert.equal(api.calculate(0).progress,0);
  api.apply({standardFee:0,freeShippingThreshold:2500.50}); assert.equal(api.calculate(1).shipping,0);assert.match(api.promotion(),/Free standard shipping/);
  const old=api.settings(); const saving=api.save({standardFee:200,freeShippingThreshold:4000});assert.equal(api.settings().standardFee,old.standardFee);
  state.writeResolve();await saving;assert.equal(api.settings().standardFee,200);
  const failure=api.save({standardFee:99,freeShippingThreshold:4000});state.writeReject({code:'permission-denied'});await assert.rejects(failure);assert.equal(api.settings().standardFee,200);
  const failedRead=api.refresh();state.readReject(new Error('offline'));await assert.rejects(failedRead);assert.equal(api.status(),'error');assert.match(api.answer(),/unavailable/);
  const retry=api.refresh();state.readResolve();await retry;assert.equal(api.status(),'ready');
  state.stored={standardFee:-1,freeShippingThreshold:3000};const invalid=api.refresh();state.readResolve();await assert.rejects(invalid);assert.equal(api.status(),'error');
});
test('Admin editor blocks duplicate saves, validates fields, and preserves failed entries',async()=>{
  const f=fixture(),{context,state,element}=f;
  vm.runInContext(admin.slice(admin.indexOf('  // --- DELIVERY SETTINGS ---'),admin.indexOf('  // --- SIDEBAR NAVIGATION ---')),context);
  const loading=context.loadDeliverySettings();state.readReject(new Error('offline'));await loading;assert.equal(context.deliveryEditorState,'error');
  const retry=context.loadDeliverySettings();state.readResolve();await retry;assert.equal(context.deliveryEditorState,'ready');
  const event={preventDefault(){}};
  element('settingsStandardFee').value='1.001';await context.saveDeliverySettings(event);assert.equal(state.writes,0);assert.equal(element('settingsStandardFee').focused,true);
  element('settingsStandardFee').value='75.25';element('settingsFreeThreshold').value='2500.50';
  const save=context.saveDeliverySettings(event);await next();await context.saveDeliverySettings(event);assert.equal(state.writes,1);assert.equal(element('settingsDeliveryFields').disabled,true);
  state.timers.at(-1)();assert.match(element('settingsDeliveryFeedback').textContent,/Still saving/);assert.equal(state.audit,undefined);
  state.writeReject({code:'permission-denied'});await save;assert.equal(element('settingsStandardFee').value,'75.25');assert.equal(element('settingsDeliveryFields').disabled,false);
  const success=context.saveDeliverySettings(event);await next();state.writeResolve();await success;assert.equal(state.audit,1);assert.equal(element('settingsDeliveryFeedback').dataset.state,'success');
  state.role='staff';context.renderDeliverySettings();assert.equal(element('settingsDeliveryCard').hidden,true);await context.saveDeliverySettings(event);assert.equal(state.writes,2);
  state.role='superadmin';context.renderDeliverySettings();assert.equal(element('settingsDeliveryCard').hidden,false);
});
function setupCheckout(f) {
  const {context,state,element}=f;
  Object.assign(context,{cart:[{id:1,name:'Test product',price:1000,quantity:1}],checkoutProfile:null,checkoutVal:()=> 'Address',normalizePHPhone:()=>'+639123456789',
    couponDiscountRate:()=>0,getAppliedCoupon:()=>null,getStoredList:()=>[],money:n=>'₱'+n,
    renderSummary(){state.summary=f.api.calculate(1000).shipping;},renderExpressBanner(){},showToast(){},copyShippingToBilling(){},
    processPayment(order,total,callback){state.payments++;state.paymentOrder=order;callback(null,{status:'unpaid'});},
    SmileHubData:{saveOrder(order,callback){state.orderWrites.push({...order});state.orderCallback=callback;}} });
  context.window.validateCheckoutStep=()=>true;
  const totals=checkout.slice(checkout.indexOf('  function getOrderTotals()'),checkout.indexOf('  function applyCouponFromInput()'));
  const start=checkout.indexOf('  var retryOrderSave = null;'),end=checkout.indexOf('\n  });\n});',start)+7;
  vm.runInContext(totals+checkout.slice(start,end),context);
  return ()=>element('checkoutForm').submit.call(element('checkoutForm'),{preventDefault(){}});
}
test('Checkout requires current pricing, review after changes, and frozen order-save retries',async()=>{
  const f=fixture(),{state,element,api}=f;
  const submit=setupCheckout(f);
  assert.equal(element('submit').disabled,true);await submit();assert.equal(state.payments,0);
  const initial=api.refresh();state.readReject(new Error('offline'));await assert.rejects(initial);assert.equal(element('submit').disabled,true);
  const retry=api.refresh();state.readResolve();await retry;assert.equal(element('submit').disabled,false);
  state.stored={standardFee:200,freeShippingThreshold:4000};
  const checking=submit();await next();const duplicate=submit();state.readResolve();await checking;await duplicate;
  assert.equal(state.payments,0);assert.equal(state.summary,200);assert.match(element('checkoutDeliveryStatus').textContent,/pricing changed/);
  const confirmed=submit();await next();state.readResolve();await confirmed;assert.equal(state.payments,1);assert.equal(state.orderWrites[0].shipping,200);
  const original=JSON.stringify(state.orderWrites[0]);state.orderCallback(new Error('offline'));
  api.apply({standardFee:999,freeShippingThreshold:9999});
  const reads=state.reads;await submit();assert.equal(state.payments,1);assert.equal(state.reads,reads);assert.equal(JSON.stringify(state.orderWrites[1]),original);
});
test('Cart and delivery hints agree on custom pricing and pre-discount thresholds',()=>{
  const f=fixture(),{context,api,element}=f;
  api.apply({standardFee:75.25,freeShippingThreshold:2500.50});
  Object.assign(context,{couponDiscountRate:()=>0.1,getAppliedCoupon:()=> 'SMILE10',money:n=>'₱'+Number(n).toFixed(2)});
  const cart=fs.readFileSync(path.join(__dirname,'../js/cart.js'),'utf8');
  vm.runInContext(cart.slice(cart.indexOf('function updateSummary('),cart.indexOf("document.addEventListener('smilehub:data-synced'")),context);
  context.updateSummary([{price:1000,quantity:1}]);
  assert.equal(element('cartShipping').textContent,'₱75.25');assert.equal(element('cartTotal').textContent,'₱1083.25');
  assert.match(element('shipProgressText').textContent,/1500.50/);
  context.updateSummary([{price:2500.50,quantity:1}]);assert.equal(element('cartShipping').textContent,'₱0.00');
  const html=fs.readFileSync(path.join(__dirname,'../checkout.html'),'utf8');
  context.getCartSubtotal=()=>1000;
  vm.runInContext(html.slice(html.indexOf('  function updateDeliveryFees(){'),html.indexOf('  updateDeliveryFees();'))+'updateDeliveryFees();',context);
  assert.equal(element('deliveryFeeStandard').textContent,'₱75.25');assert.match(element('deliveryHint').textContent,/1,500.50/);
  assert.equal(element('deliveryFeeExpress').textContent,'Unavailable in demo');
});
