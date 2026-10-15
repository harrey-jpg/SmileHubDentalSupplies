const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../js/admin-payments.js'), 'utf8');
function fixture(embedded, preference = '"light"') {
  const state = { dark: false, parentDark: true, preference, observers: [], events: {}, parentEvents: {} };
  const dialog = { style: {}, getBoundingClientRect: () => ({ height: 300 }) };
  const parent = { innerHeight:800, document:{body:{classList:{contains:()=>state.parentDark}}},
    addEventListener(event,callback) {state.parentEvents[event]=callback;},removeEventListener(event){delete state.parentEvents[event];} };
  const context = vm.createContext({ localStorage:{getItem:()=>state.preference},MutationObserver:class {
    constructor(callback){this.callback=callback;state.observers.push(this);}
    observe(){} disconnect(){this.disconnected=true;}
  },window:{parent,innerHeight:1200,frameElement:{getBoundingClientRect:()=>({top:-400})},addEventListener(event,callback){state.events[event]=callback;}},
    document:{documentElement:{classList:{contains:()=>embedded}},body:{classList:{toggle(_name,value){state.dark=value;}}},querySelectorAll:()=>[dialog]} });
  vm.runInContext(source,context);
  return {state,dialog};
}
test('Payment page follows saved and parent themes and keeps embedded dialogs visible',()=>{
  for(const saved of ['dark','"dark"'])assert.equal(fixture(false,saved).state.dark,true);
  const standalone=fixture(false);assert.equal(standalone.state.dark,false);
  standalone.state.preference='"dark"';standalone.state.events.storage({key:'smilehub_theme'});assert.equal(standalone.state.dark,true);
  const embedded=fixture(true);assert.equal(embedded.state.dark,true);
  embedded.state.parentDark=false;embedded.state.observers[0].callback();assert.equal(embedded.state.dark,false);
  embedded.state.observers[1].callback();
  const visibleTop=parseFloat(embedded.dialog.style.top)-400;
  assert(visibleTop>=16 && visibleTop+300<=784);
  embedded.state.events.pagehide();assert(embedded.state.observers.every(observer=>observer.disconnected));assert.equal(embedded.state.parentEvents.scroll,undefined);
});
