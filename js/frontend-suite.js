
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
    tray.innerHTML='<div><strong>Compare products</strong><span id="compareCount">0 selected</span></div><div id="compareNames"></div><button class="btn btn-primary" id="openCompare">Compare now</button><button class="btn btn-light" id="clearCompare">Clear</button>';
    document.body.appendChild(tray);
    var selected=STORE.get('smilehub_compare',[]);
    function render(){
      var names=document.getElementById('compareNames'), count=document.getElementById('compareCount');
      count.textContent=selected.length+' selected'; names.innerHTML=selected.map(function(x){return '<span>'+x.name+'</span>';}).join('');
      tray.classList.toggle('hidden', selected.length===0);
    }
    function attach(){
      document.querySelectorAll('#productGrid .product-card').forEach(function(card){
        if(card.querySelector('.compare-toggle')) return;
        var id=Number((card.querySelector('[data-id]')||{}).dataset && (card.querySelector('[data-id]')||{}).dataset.id) || Number(new URL((card.querySelector('a[href*="product.html"]')||{}).href||'',location.href).searchParams.get('id'));
        var name=(card.querySelector('h3,h4')||{}).textContent||'Product';
        var priceText=(card.querySelector('.price')||{}).textContent||'0';
        var price=Number(priceText.replace(/[^\d.]/g,''));
        var category=card.dataset.category||'General', brand=card.dataset.brand||'';
        var b=document.createElement('button'); b.type='button'; b.className='compare-toggle';
        b.textContent=selected.some(function(x){return x.id===id;})?'✓ Added to compare':'+ Compare';
        b.addEventListener('click',function(){
          var idx=selected.findIndex(function(x){return x.id===id;});
          if(idx>=0){selected.splice(idx,1); b.textContent='+ Compare';}
          else if(selected.length>=4){toast('You can compare up to 4 products.',true); return;}
          else {selected.push({id:id,name:name,price:price,category:category,brand:brand}); b.textContent='✓ Added to compare';}
          STORE.set('smilehub_compare',selected); render();
        });
        card.appendChild(b);
      });
    }
    new MutationObserver(attach).observe(document.getElementById('productGrid'),{childList:true,subtree:true});
    attach(); render();
    document.getElementById('clearCompare').onclick=function(){selected=[];STORE.set('smilehub_compare',[]);document.querySelectorAll('.compare-toggle').forEach(function(b){b.textContent='+ Compare';});render();};
    document.getElementById('openCompare').onclick=function(){location.href='compare.html';};
  }

  function initProductExtras(){
    if(!document.getElementById('detailName')) return;
    var main=document.querySelector('main .container'); if(!main) return;
    var extra=document.createElement('section'); extra.className='product-extras-grid';
    extra.innerHTML='<article class="card form-card"><div class="eyebrow">Buy smarter</div><h2>Frequently bought together</h2><div class="bundle-row"><label><input checked type="checkbox"> This product</label><label><input checked type="checkbox"> Disposable examination gloves</label><label><input type="checkbox"> Surface disinfectant</label></div><button class="btn btn-primary" id="bundleAdd">Add selected bundle</button></article>'+
      '<article class="card form-card"><div class="eyebrow">Questions</div><h2>Product Q&amp;A</h2><div id="qaList"><p><strong>Is this suitable for clinics?</strong><br><span class="muted">Yes. Check the specifications and intended-use details before ordering.</span></p></div><form id="qaForm"><div class="form-group"><label for="qaQuestion">Ask a question</label><input id="qaQuestion" required placeholder="What would you like to know?"></div><button class="btn btn-light">Submit question</button></form></article>';
    main.appendChild(extra);
    document.getElementById('bundleAdd').onclick=function(){toast('Bundle items added to cart.');};
    document.getElementById('qaForm').onsubmit=function(e){e.preventDefault();var q=document.getElementById('qaQuestion');var list=STORE.get('smilehub_questions',[]);list.unshift({id:uid(),question:q.value,date:new Date().toISOString()});STORE.set('smilehub_questions',list);document.getElementById('qaList').insertAdjacentHTML('afterbegin','<p><strong>'+q.value.replace(/[<>]/g,'')+'</strong><br><span class="muted">Submitted for review.</span></p>');q.value='';toast('Question submitted.');};
    var reviewForm=document.querySelector('#reviewsTab form');
    if(reviewForm) reviewForm.addEventListener('submit',function(e){e.preventDefault();var ta=reviewForm.querySelector('textarea');var reviews=STORE.get('smilehub_reviews',[]);reviews.unshift({id:uid(),text:ta.value,rating:reviewForm.querySelector('select').value,date:new Date().toISOString(),status:'pending'});STORE.set('smilehub_reviews',reviews);ta.value='';toast('Review submitted for moderation.');});
  }

  function initProfileExtras(){
    var profile=document.querySelector('.profile-layout section'); if(!profile) return;
    var saved=STORE.get('smilehub_addresses',[]);
    var box=document.createElement('section'); box.className='card form-card admin-section';
    box.innerHTML='<div class="section-heading-row"><div><div class="eyebrow">Account tools</div><h2>Saved addresses & preferences</h2></div></div><div id="savedAddressList" class="saved-address-grid"></div><button class="btn btn-light" id="saveCurrentAddress">Save current address</button><hr><h3>Shopping preferences</h3><div class="form-grid"><label class="payment-option"><input type="checkbox" id="prefRestock"> <span><strong>Restock alerts</strong><br><small class="muted">Notify me when saved products return.</small></span></label><label class="payment-option"><input type="checkbox" id="prefDeals"> <span><strong>Offers and deals</strong><br><small class="muted">Show relevant promotions.</small></span></label></div>';
    profile.appendChild(box);
    function render(){document.getElementById('savedAddressList').innerHTML=saved.length?saved.map(function(a,i){return '<article class="mini-card"><strong>'+a.label+'</strong><p>'+a.value+'</p><button class="link-button" data-remove="'+i+'">Remove</button></article>';}).join(''):'<p class="muted">No saved addresses yet.</p>';}
    render();
    box.addEventListener('click',function(e){if(e.target.dataset.remove){saved.splice(Number(e.target.dataset.remove),1);STORE.set('smilehub_addresses',saved);render();}});
    document.getElementById('saveCurrentAddress').onclick=function(){var v=(document.getElementById('profileAddress')||{}).value;if(!v){toast('Enter an address first.',true);return;}saved.push({label:'Address '+(saved.length+1),value:v});STORE.set('smilehub_addresses',saved);render();toast('Address saved on this device.');};
    ['prefRestock','prefDeals'].forEach(function(id){var el=document.getElementById(id);el.checked=STORE.get(id,false);el.onchange=function(){STORE.set(id,el.checked);};});
    var menu=document.querySelector('.profile-menu'); if(menu){menu.querySelector('a[href="#addresses"]').insertAdjacentHTML('beforebegin','<a href="returns.html">Returns</a>');}
  }

  function initCheckoutSteps(){
    var form=document.getElementById('checkoutForm'); if(!form) return;
    var steps=document.createElement('div'); steps.className='checkout-progress'; steps.innerHTML='<span class="active">1 Cart</span><span class="active">2 Delivery</span><span>3 Payment</span><span>4 Confirmation</span>';
    var layout=document.querySelector('.checkout-layout'); layout.parentNode.insertBefore(steps,layout);
    var h=form.querySelector('h2'); if(h) h.insertAdjacentHTML('beforebegin','<div class="checkout-note"><strong>Frontend preview</strong><span>No real payment will be charged until backend integration is enabled.</span></div>');
    var shipping=document.createElement('div'); shipping.innerHTML='<h2>Delivery Method</h2><div class="payment-options"><label class="payment-option"><input checked name="shippingMethod" type="radio" value="Standard"><span><strong>Standard delivery</strong><br><small class="muted">1–3 business days • ₱150 or free over ₱3,000</small></span></label><label class="payment-option"><input name="shippingMethod" type="radio" value="Express"><span><strong>Express delivery</strong><br><small class="muted">Same/next day where available • demo option</small></span></label></div>';
    var paymentHeading=Array.from(form.querySelectorAll('h2')).find(function(x){return /Payment Method/.test(x.textContent);});
    if(paymentHeading) paymentHeading.parentNode.insertBefore(shipping,paymentHeading);
    form.querySelectorAll('input,textarea,select').forEach(function(el){el.addEventListener('blur',function(){el.classList.toggle('field-invalid',!el.checkValidity());});});
  }

  function initOrderTools(){
    var body=document.getElementById('ordersBody'); if(!body) return;
    document.querySelectorAll('#ordersBody tr').forEach(function(row){
      var last=row.lastElementChild;
      if(last && !last.querySelector('.order-tools')){
        last.insertAdjacentHTML('beforeend','<div class="order-tools"><button class="btn btn-light reorder-btn">Reorder</button><a class="btn btn-light" href="returns.html">Return</a></div>');
      }
    });
    body.addEventListener('click',function(e){if(e.target.classList.contains('reorder-btn')) toast('Items from this order were added to your cart.');});
  }

  function initGlobal(){
    document.querySelectorAll('img').forEach(function(i){i.loading='lazy';});
    document.querySelectorAll('button:not([aria-label]),a.icon-link:not([aria-label])').forEach(function(el){if(!el.textContent.trim() && el.title)el.setAttribute('aria-label',el.title);});
    var header=document.querySelector('.header-actions');
  }


  document.addEventListener('DOMContentLoaded',function(){
    initGlobal(); initCompareButtons(); initProductExtras(); initProfileExtras(); initCheckoutSteps(); initOrderTools();
  });
})();
