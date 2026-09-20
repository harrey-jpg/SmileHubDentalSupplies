
(function () {
  'use strict';
  var STORE = {
    get: function(k, d){ try { var v=localStorage.getItem(k); return v?JSON.parse(v):d; } catch(e){return d;} },
    set: function(k,v){ localStorage.setItem(k,JSON.stringify(v)); }
  };
  function toast(msg, error){
    if (window.showToast) { window.showToast(msg, !!error); return; }
    var t=document.createElement('div'); t.className='toast suite-toast'; t.textContent=msg;
    if(error) t.classList.add('toast-error'); document.body.appendChild(t);
    setTimeout(function(){t.remove();},2800);
  }
  function money(n){ return '₱'+Number(n||0).toLocaleString('en-PH',{minimumFractionDigits:2}); }
  function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,7); }

  function initCompareButtons(){
    if (!/products\.html$/.test(location.pathname) && !document.getElementById('productGrid')) return;
    var tray=document.createElement('aside'); tray.id='compareTray'; tray.className='compare-tray hidden';
    tray.innerHTML='<div><strong>Compare products</strong><span id="trayCompareCount">0 selected</span></div><div id="trayCompareNames"></div><button class="btn btn-primary" id="trayOpenCompare">Compare now</button><button class="btn btn-light" id="trayClearCompare">Clear</button>';
    document.body.appendChild(tray);
    var selected=STORE.get('smilehub_compare',[]);
    function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
    function render(){
      var names=document.getElementById('trayCompareNames'), count=document.getElementById('trayCompareCount');
      count.textContent=selected.length+' selected'; names.innerHTML=selected.map(function(x){return '<span>'+esc(x.name)+'</span>';}).join('');
      tray.classList.toggle('hidden', selected.length===0);
      document.body.classList.toggle('has-compare', selected.length>0);
    }
    function attach(){
      document.querySelectorAll('#productGrid .product-card').forEach(function(card){
        if(card.querySelector('.compare-toggle')) return;
        var id=Number((card.querySelector('[data-id]')||{}).dataset && (card.querySelector('[data-id]')||{}).dataset.id) || Number(new URL((card.querySelector('a[href*="product.html"]')||{}).href||'',location.href).searchParams.get('id'));
        var name=(card.querySelector('h3,h4')||{}).textContent||'Product';
        var priceText=(card.querySelector('.price')||{}).textContent||'0';
        var price=Number(priceText.replace(/[^\d.]/g,''));
        var category=card.dataset.category||'General';
        var brandSku=((card.querySelector('.product-brand')||{}).textContent||'').split('·');
        var brand=(brandSku[0]||'').trim()||card.dataset.brand||'';
        var sku=(brandSku[1]||'').trim();
        var imgEl=card.querySelector('.product-image img, img');
        var image=imgEl?imgEl.getAttribute('src'):'';
        var stockRaw=card.dataset.stock;
        var stock=(stockRaw===undefined||stockRaw==='')?null:Number(stockRaw);
        var b=document.createElement('button'); b.type='button'; b.className='compare-toggle'; b.setAttribute('data-compare-btn','true');
        b.textContent=selected.some(function(x){return x.id===id;})?'✓ Added to compare':'+ Compare';
        b.addEventListener('click',function(){
          var idx=selected.findIndex(function(x){return x.id===id;});
          if(idx>=0){selected.splice(idx,1); b.textContent='+ Compare';}
          else if(selected.length>=4){toast('You can compare up to 4 products.',true); return;}
          else {selected.push({id:id,name:name,price:price,category:category,brand:brand,image:image,stock:stock,sku:sku}); b.textContent='✓ Added to compare';}
          STORE.set('smilehub_compare',selected); render();
        });
        card.appendChild(b);
      });
    }
    new MutationObserver(attach).observe(document.getElementById('productGrid'),{childList:true,subtree:true});
    attach(); render();
    document.getElementById('trayClearCompare').onclick=function(){selected=[];STORE.set('smilehub_compare',[]);document.querySelectorAll('[data-compare-btn]').forEach(function(b){b.textContent='+ Compare';b.setAttribute('aria-pressed','false');});render();};
    document.getElementById('trayOpenCompare').onclick=function(){location.href='compare.html';};
  }

  function currentProductId(){
    var id=Number(new URLSearchParams(location.search).get('id'));
    return Number.isInteger(id) && id>0 ? id : 1;
  }

  // Review submit + own-review render live in js/product.js (single owner).
  // This file keeps only the product Q&A extra.
  function initProductExtras(){
    if(!document.getElementById('detailName')) return;
    var main=document.querySelector('main .container'); if(!main) return;
    var extra=document.createElement('section'); extra.className='product-extras-grid';
    extra.innerHTML='<article class="card form-card"><div class="eyebrow">Questions</div><h2>Product Q&amp;A</h2><div id="qaList"><p><strong>Is this suitable for clinics?</strong><br><span class="muted">Yes. Check the specifications and intended-use details before ordering.</span></p></div><form id="qaForm"><div class="form-group"><label for="qaQuestion">Ask a question</label><input id="qaQuestion" required maxlength="200" placeholder="What would you like to know?"></div><button class="btn btn-light">Submit question</button></form></article>';
    main.appendChild(extra);
    document.getElementById('qaForm').onsubmit=function(e){e.preventDefault();var q=document.getElementById('qaQuestion');if(!q.value.trim()){q.focus();return;}var list=STORE.get('smilehub_questions',[]);list.unshift({id:uid(),productId:currentProductId(),question:q.value.trim(),date:new Date().toISOString()});STORE.set('smilehub_questions',list);document.getElementById('qaList').insertAdjacentHTML('afterbegin','<p><strong>'+q.value.replace(/[<>]/g,'')+'</strong><br><span class="muted">Submitted for review.</span></p>');q.value='';toast('Question submitted.');};
  }

  function initProfileExtras(){
    // Single canonical address lives in the profile form (Firestore).
    // This section surfaces the REAL restock list built from Notify-me taps
    // on out-of-stock products — no parallel address stubs, no placebo prefs.
    if(document.getElementById('restockList')) return;
    var profile=document.querySelector('.profile-layout section'); if(!profile) return;
    function getRestock(){
      var raw=STORE.get('smilehub_restock',[]);
      return raw.map(function(entry){
        if (typeof entry === 'number') return { id: entry, name: 'Product #' + entry };
        return { id: Number(entry.id), name: entry.name || ('Product #' + entry.id) };
      }).filter(function(entry){ return Number.isFinite(entry.id); });
    }
    var box=document.createElement('section'); box.className='card form-card admin-section';
    box.innerHTML='<div class="section-heading-row"><div><div class="eyebrow">Account tools</div><h2>Restock alerts</h2></div></div><p class="muted">Products you asked to be notified about when they return.</p><div id="restockList" class="saved-address-grid"></div>';
    profile.appendChild(box);
    function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
    function render(){
      var saved=getRestock();
      document.getElementById('restockList').innerHTML=saved.length?saved.map(function(a){
        return '<article class="mini-card"><strong>'+esc(a.name)+'</strong><p><a href="product.html?id='+a.id+'">View product</a></p><button class="link-button" data-restock-remove="'+a.id+'">Remove</button></article>';
      }).join(''):'<p class="muted">No restock alerts yet. Tap Notify me on any out-of-stock product.</p>';
    }
    render();
    box.addEventListener('click',function(e){
      var id=e.target.getAttribute && e.target.getAttribute('data-restock-remove');
      if(!id) return;
      var raw=STORE.get('smilehub_restock',[]);
      raw=raw.filter(function(entry){
        var entryId=(typeof entry === 'number') ? entry : Number(entry.id);
        return entryId !== Number(id);
      });
      STORE.set('smilehub_restock',raw);render();toast('Removed from restock alerts.');
    });
    document.addEventListener('visibilitychange',function(){ if(!document.hidden) render(); });
    var menu=document.querySelector('.profile-menu'); if(menu){var addr=menu.querySelector('a[href="#addresses"]'); if(addr) addr.insertAdjacentHTML('beforebegin','<a href="returns.html">Returns</a>');}
  }

  function initCheckoutSteps(){
    var form=document.getElementById('checkoutForm'); if(!form) return;
    // Real delivery block now lives in checkout.html — don't double-render on cached pages
    if(!document.getElementById('deliverySection')){
      var shipping=document.createElement('div'); shipping.innerHTML='<h2>Delivery Method</h2><div class="payment-options"><label class="payment-option"><input checked name="shippingMethod" type="radio" value="Standard"><span><strong>Standard delivery</strong><br><small class="muted">1–3 business days • ₱150 or free over ₱3,000</small></span></label><label class="payment-option"><input name="shippingMethod" type="radio" value="Express"><span><strong>Express delivery</strong><br><small class="muted">Same/next day where available • demo option</small></span></label></div>';
      var paymentHeading=Array.from(form.querySelectorAll('h2')).find(function(x){return /Payment Method/.test(x.textContent);});
      if(paymentHeading) paymentHeading.parentNode.insertBefore(shipping,paymentHeading);
    }
    var steps=document.createElement('div'); steps.className='checkout-progress'; steps.innerHTML='<span class="active">1 Cart</span><span class="active">2 Delivery</span><span>3 Payment</span><span>4 Confirmation</span>';
    var layout=document.querySelector('.checkout-layout');
    if(layout && !document.querySelector('.checkout-progress')) layout.parentNode.insertBefore(steps,layout);
    var h=form.querySelector('h2'); if(h && !document.querySelector('.checkout-note')) h.insertAdjacentHTML('beforebegin','<div class="checkout-note"><strong>Frontend preview</strong><span>No real payment will be charged until backend integration is enabled.</span></div>');
    form.querySelectorAll('input,textarea,select').forEach(function(el){el.addEventListener('blur',function(){el.classList.toggle('field-invalid',!el.checkValidity());});});
  }

  function initOrderTools(){
    var body=document.getElementById('ordersBody'); if(!body) return;
    // New orders UI (search/filter + View/Reorder/Invoice/Remove) owns its own tools — don't double-render
    if(document.getElementById('ordersSearch')) return;
    document.querySelectorAll('#ordersBody tr').forEach(function(row){
      if(row.querySelector('td[colspan]')) return;
      if(!row.hasAttribute('data-order')) return;
      var last=row.lastElementChild;
      if(last && !last.querySelector('.order-tools')){
        last.insertAdjacentHTML('beforeend','<div class="order-tools"><button class="btn btn-light reorder-btn">Reorder</button><a class="btn btn-light" href="returns.html">Return</a></div>');
      }
    });
    body.addEventListener('click',function(e){if(e.target.classList.contains('reorder-btn')) toast('Items from this order were added to your cart.');});
  }

  var COMPARE_KEY='smilehub_compare', COMPARE_MAX=4;

  function isInCompare(id){
    var list=STORE.get(COMPARE_KEY,[]);
    return Array.isArray(list)&&list.some(function(x){return x&&String(x.id)===String(id);});
  }

  function toggleCompareEntry(entry){
    var list=STORE.get(COMPARE_KEY,[]);
    if(!Array.isArray(list)) list=[];
    var idx=list.findIndex(function(x){return x&&String(x.id)===String(entry.id);});
    if(idx>=0){list.splice(idx,1);STORE.set(COMPARE_KEY,list);return 'removed';}
    if(list.length>=COMPARE_MAX){toast('You can compare up to '+COMPARE_MAX+' products.',true);return 'full';}
    list.push(entry);STORE.set(COMPARE_KEY,list);return 'added';
  }

  function avgRatingFor(productId){
    var all=[];try{all=JSON.parse(localStorage.getItem('smilehub_reviews')||'[]');}catch(e){all=[];}
    var mine=all.filter(function(r){return r&&Number(r.productId)===Number(productId);});
    if(!mine.length) return null;
    var sum=mine.reduce(function(s,r){return s+(Number(r.rating)||5);},0);
    return {avg:Math.round(sum/mine.length*10)/10,count:mine.length};
  }

  function lookupCatalogOnce(cb){
    var done=false;
    function once(list){if(done)return;done=true;cb(list||[]);}
    try{
      if(window.SmileHubData&&SmileHubData.defaultProducts&&SmileHubData.defaultProducts.length){
        once(SmileHubData.defaultProducts.slice());return;
      }
    }catch(e){}
    try{
      if(window.SmileHubData&&SmileHubData.getProducts){
        SmileHubData.getProducts(function(live){once(live);});
        setTimeout(function(){once([]);},5000);return;
      }
    }catch(e){}
    once([]);
  }

  function hydrateCompareItems(items,done){
    function persist(){try{localStorage.setItem(COMPARE_KEY,JSON.stringify(items));}catch(e){}}
    function apply(catalog){
      var map={};(catalog||[]).forEach(function(p){map[Number(p.id)]=p;});
      var changed=false;
      items.forEach(function(x){
        var p=map[Number(x.id)];if(!p)return;
        if(!x.image&&p.image){x.image=p.image;changed=true;}
        if((x.stock===undefined||x.stock===null)&&typeof p.stock==='number'){x.stock=p.stock;changed=true;}
        if(!x.brand&&p.brand){x.brand=p.brand;changed=true;}
        if(!x.sku&&p.sku){x.sku=p.sku;changed=true;}
        if((!x.category||x.category==='General')&&p.category){x.category=p.category;changed=true;}
      });
      if(changed)persist();
      done(items);
    }
    var sync=null;
    try{if(window.SmileHubData&&SmileHubData.defaultProducts&&SmileHubData.defaultProducts.length)sync=SmileHubData.defaultProducts;}catch(e){}
    if(sync){
      apply(sync);
      try{if(window.SmileHubData&&SmileHubData.getProducts)SmileHubData.getProducts(function(live){if(live&&live.length)apply(live);});}catch(e){}
    }else{
      try{
        if(window.SmileHubData&&SmileHubData.getProducts)SmileHubData.getProducts(function(live){apply(live||[]);});
        else apply([]);
      }catch(e){apply([]);}
    }
  }
  window.SmileHubCompare={key:COMPARE_KEY,max:COMPARE_MAX,isIn:isInCompare,toggle:toggleCompareEntry,avg:avgRatingFor,hydrate:hydrateCompareItems};

  function initDetailCompare(){
    if(!document.getElementById('detailName')||document.getElementById('detailCompare'))return;
    var wish=document.getElementById('detailWishlist');
    if(!wish||!wish.parentNode)return;
    var id=Number(new URLSearchParams(location.search).get('id'));
    if(!Number.isInteger(id)||id<1)return;
    var btn=document.createElement('button');
    btn.type='button';btn.id='detailCompare';btn.className='btn btn-light';
    btn.textContent='+ Compare';btn.setAttribute('aria-pressed','false');btn.setAttribute('data-compare-btn','true');
    wish.parentNode.insertBefore(btn,wish.nextSibling);
    window.addEventListener('storage',function(e){if(e.key===COMPARE_KEY)refresh();});
    function refresh(){
      var added=isInCompare(id);
      btn.textContent=added?'\u2713 Added to compare':'+ Compare';
      btn.setAttribute('aria-pressed',added?'true':'false');
    }
    lookupCatalogOnce(function(catalog){
      var p=null;catalog.forEach(function(c){if(Number(c.id)===id)p=c;});
      if(!p){btn.disabled=true;btn.textContent='Compare unavailable';return;}
      refresh();
      btn.addEventListener('click',function(){
        var res=toggleCompareEntry({id:p.id,name:p.name,price:p.price,category:p.category||'General',brand:p.brand||'',image:p.image,stock:(typeof p.stock==='number'?p.stock:null),sku:p.sku});
        if(res==='added')toast('Added to comparison.');
        else if(res==='removed')toast('Removed from comparison.');
        refresh();
      });
    });
  }

  function initWishlistCompare(){
    var grid=document.getElementById('wishlistGrid');if(!grid)return;
    function attach(){
      grid.querySelectorAll('.product-card').forEach(function(card){
        if(card.querySelector('.compare-toggle'))return;
        var id=Number(card.getAttribute('data-wish-id'));
        if(!Number.isInteger(id)||id<1){
          var d=card.querySelector('[data-id]');
          id=d?Number(d.getAttribute('data-id')):NaN;
        }
        if(!Number.isInteger(id)||id<1)return;
        var name=((card.querySelector('h3')||{}).textContent||'Product').trim();
        var price=Number(((card.querySelector('.price')||{}).textContent||'0').replace(/[^\d.]/g,''));
        var im=card.querySelector('.product-image img, img');
        var image=im?im.getAttribute('src'):'';
        var b=document.createElement('button');
        b.type='button';b.className='compare-toggle';b.setAttribute('data-compare-btn','true');
        var added=isInCompare(id);
        b.textContent=added?'\u2713 Added to compare':'+ Compare';
        b.setAttribute('aria-pressed',added?'true':'false');
        b.setAttribute('aria-label',(added?'Remove ':'Compare ')+name);
        b.addEventListener('click',function(){
          var res=toggleCompareEntry({id:id,name:name,price:price,category:'General',brand:'',image:image||undefined,stock:null,sku:undefined});
          if(res==='added'){b.textContent='\u2713 Added to compare';b.setAttribute('aria-pressed','true');toast('Added to comparison.');}
          else if(res==='removed'){b.textContent='+ Compare';b.setAttribute('aria-pressed','false');toast('Removed from comparison.');}
        });
        var host=card.querySelector('.product-actions')||card;
        host.appendChild(b);
      });
    }
    new MutationObserver(attach).observe(grid,{childList:true,subtree:true});
    attach();
  }

  function initGlobal(){
    document.querySelectorAll('img').forEach(function(i){i.loading='lazy';});
    document.querySelectorAll('button:not([aria-label]),a.icon-link:not([aria-label])').forEach(function(el){if(!el.textContent.trim() && el.title)el.setAttribute('aria-label',el.title);});
    var header=document.querySelector('.header-actions');
  }


  document.addEventListener('DOMContentLoaded',function(){
    initGlobal(); initCompareButtons(); initDetailCompare(); initWishlistCompare(); initProductExtras(); initProfileExtras(); initCheckoutSteps(); initOrderTools();
  });
})();
