const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../js/admin.js'),'utf8');
test('activity categories have decorative SVG icons, including a fallback',()=>{
 const context={};vm.runInNewContext(source.slice(source.indexOf('  function getAuditCategory('),source.indexOf('  function getAuditBadge(')),context);
 for(const category of ['order','stock','product','account','cms','payment','other','unknown']) {
  const icon=context.getAuditIcon(category);assert.match(icon,/<svg/);assert.match(icon,/stroke="currentColor"/);assert.match(icon,/aria-hidden="true"/);
 }
});
test('payment alerts use an icon and readable order number without exposing the document id',()=>{
 const list={innerHTML:'',querySelectorAll:()=>[]},context={document:{getElementById:id=>id==='notifDropdownList'?list:null},getAuditLogs:()=>[],getOrders:()=>[{docId:'internal-uuid',orderNumber:'SH-123456'}],pendingPaymentClaims:[{id:'internal-uuid'}],paymentClaimError:'',roleResolved:true,currentRole:'admin',escapeHtml:value=>String(value),getAuditIcon:()=>'<svg aria-hidden="true"></svg>',needsOrderWork:()=>false};
 vm.runInNewContext(source.slice(source.indexOf('  function renderNotifDropdown('),source.indexOf('  function setNotifDropdownOpen(')),context);context.renderNotifDropdown();
 assert.match(list.innerHTML,/notif-dropdown-icon payment/);assert.match(list.innerHTML,/SH-123456/);assert.doesNotMatch(list.innerHTML,/internal-uuid/);
 context.getOrders=()=>[];context.renderNotifDropdown();assert.match(list.innerHTML,/Open payment details/);
});
