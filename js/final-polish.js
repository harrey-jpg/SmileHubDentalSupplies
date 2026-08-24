
(function(){
  'use strict';
  function byId(id){ return document.getElementById(id); }
  function localDigits(input){
    if (!input) return '';
    var d=String(input.value||'').replace(/\D/g,'');
    if (d.indexOf('63')===0) d=d.slice(2);
    if (d.indexOf('0')===0) d=d.slice(1);
    return d.slice(0,10);
  }
  function e164(input){
    var d=localDigits(input);
    return /^9\d{9}$/.test(d)?'+63'+d:'';
  }
  function syncVerificationBadges(){
    var profileStatus=byId('profilePhoneStatus');
    var verificationStatus=byId('verificationPhoneStatus');
    var current=profileStatus && /verified/i.test(profileStatus.textContent||'');
    if (verificationStatus && current){
      verificationStatus.textContent='✓ Phone verified';
      verificationStatus.className='verification-badge is-verified';
      var send=byId('sendOtpButton'); if(send) send.hidden=true;
    }
  }
  function setupPhoneEdit(){
    var btn=byId('changePhoneButton'), input=byId('profilePhone');
    if(!btn||!input) return;
    var originalValue=input.value;
    var editing=false;
    function render(){
      input.readOnly=!editing;
      input.disabled=!editing;
      input.classList.toggle('profile-phone-editing',editing);
      btn.textContent=editing?'Cancel editing':'Edit phone number';
      if(editing){ input.focus(); input.select(); }
    }
    btn.addEventListener('click',function(){
      editing=!editing;
      if(!editing) input.value=originalValue;
      render();
    });
    var form=byId('profileForm');
    if(form) form.addEventListener('submit',function(){
      originalValue=input.value;
      editing=false;
      render();
      var old=byId('verificationPhoneStatus');
      if(old && old.classList.contains('is-verified')){
        old.textContent='Not verified';
        old.className='verification-badge is-pending';
      }
      var send=byId('sendOtpButton'); if(send) send.hidden=false;
    });
    render();
  }
  function improveBillingError(){
    document.addEventListener('click',function(){
      setTimeout(function(){
        ['profileOtpStatus','checkoutOtpStatus'].forEach(function(id){
          var n=byId(id); if(!n) return;
          if(/billing-not-enabled/i.test(n.textContent||'')){
            n.textContent='Real SMS is unavailable on the current Firebase plan. For development, use the configured Firebase test number and its fixed 6-digit code.';
            n.classList.add('is-error');
          }
        });
      },300);
    });
  }
  function quietRoutineToasts(){
    var routine=/added to cart|removed from cart|added to wishlist|removed from wishlist|button clicked|opened/i;
    var observer=new MutationObserver(function(records){
      records.forEach(function(r){ r.addedNodes.forEach(function(node){
        if(node.nodeType!==1) return;
        var text=(node.textContent||'').trim();
        if((node.classList.contains('toast')||node.classList.contains('sh-toast'))&&routine.test(text)){
          node.remove();
        }
      });});
    });
    observer.observe(document.body,{childList:true,subtree:true});
  }
  function ensureBuyNow(){
    document.querySelectorAll('.product-card').forEach(function(card){
      // Cards rendered by catalog.js/homepage templates already ship a working
      // .buy-now button; only fill in cards that have none of the variants.
      if(card.querySelector('[data-buy-now],.buy-now-btn,.buy-now')) return;
      var id=card.dataset.productId||card.getAttribute('data-id');
      var price=card.dataset.price;
      var actions=card.querySelector('.product-actions');
      if(!actions||!id||!price) return;
      var b=document.createElement('button');
      b.type='button'; b.className='btn buy-now-btn'; b.dataset.buyNow=id;
      b.dataset.id=id; b.dataset.name=card.dataset.name||'Product'; b.dataset.price=price;
      b.dataset.image=card.dataset.image||'assets/products/default.svg';
      b.textContent='⚡ Buy Now';
      b.addEventListener('click',function(){ if(window.buyNow) window.buyNow(b); });
      actions.appendChild(b);
    });
  }
  document.addEventListener('DOMContentLoaded',function(){
    setupPhoneEdit();
    syncVerificationBadges();
    improveBillingError();
    quietRoutineToasts();
    ensureBuyNow();
  });
})();
