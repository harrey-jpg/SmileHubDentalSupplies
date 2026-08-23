
(function () {
  "use strict";
  const SH = window.SmileHubPremium = window.SmileHubPremium || {};
  const $ = (s, c=document) => c.querySelector(s);
  const $$ = (s, c=document) => Array.from(c.querySelectorAll(s));
  const safeJSON = (v, fallback=[]) => { try { return JSON.parse(v) ?? fallback; } catch (_) { return fallback; } };
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  const money = n => "₱" + Number(n || 0).toLocaleString("en-PH", {minimumFractionDigits:2, maximumFractionDigits:2});

  SH.toast = function(title, message="", type="success"){
    let stack = $(".sh-toast-stack");
    if(!stack){ stack=document.createElement("div"); stack.className="sh-toast-stack"; stack.setAttribute("aria-live","polite"); document.body.appendChild(stack); }
    const el=document.createElement("div"); el.className="sh-toast "+type;
    el.innerHTML="<strong>"+esc(title)+"</strong>"+(message?"<small>"+esc(message)+"</small>":"");
    stack.appendChild(el); setTimeout(()=>el.remove(),3200);
  };
  window.showPremiumToast = SH.toast;

  function addAccessibility(){
    if(!$(".sh-skip")) document.body.insertAdjacentHTML("afterbegin",'<a class="sh-skip" href="#main-content">Skip to content</a>');
    const main=$("main"); if(main&&!main.id) main.id="main-content";
    $$("img:not([alt])").forEach(i=>i.alt="");
    $$("button:not([type])").forEach(b=>b.type="button");
    $$("input,select,textarea").forEach(i=>{
      if(!i.getAttribute("aria-label")&&!i.id){
        const p=i.getAttribute("placeholder"); if(p) i.setAttribute("aria-label",p);
      }
    });
  }

  function mobileNav(){
    if(document.body.classList.contains("admin-body")||$(".sh-mobile-nav")) return;
    const page=location.pathname.split("/").pop()||"homepage.html";
    const links=[
      ["homepage.html","⌂","Home"],["products.html","⌕","Shop"],["wishlist.html","♡","Wishlist"],["cart.html","🛒","Cart"],["profile.html","☺","Account"]
    ];
    const nav=document.createElement("nav"); nav.className="sh-mobile-nav"; nav.setAttribute("aria-label","Mobile navigation");
    nav.innerHTML=links.map(([href,icon,label])=>`<a href="${href}" class="${page===href?"active":""}"><span>${icon}</span>${label}</a>`).join("");
    document.body.appendChild(nav);
  }

  function breadcrumbs(){
    if(document.body.classList.contains("admin-body")||["homepage.html","index.html","login.html","register.html"].includes(location.pathname.split("/").pop())) return;
    const main=$("main"); if(!main||$(".sh-breadcrumbs")) return;
    const page=(document.title.split("|")[0]||"Page").trim();
    const div=document.createElement("div"); div.className="sh-breadcrumbs";
    div.innerHTML='<a href="homepage.html">Home</a> <span aria-hidden="true">›</span> '+esc(page);
    main.parentNode.insertBefore(div,main);
  }

  function cartData(){
    const keys=["smilehub_cart","smilehub_simple_cart","cart"];
    for(const k of keys){ const d=safeJSON(localStorage.getItem(k),null); if(Array.isArray(d)&&d.length) return {key:k,items:d}; }
    return {key:"smilehub_simple_cart",items:[]};
  }
  function cartQty(item){ return Number(item.quantity||item.qty||1); }
  function cartPrice(item){ return Number(item.price||item.productPrice||0); }

  function miniCart(){
    if($(".sh-mini-cart")) return;
    document.body.insertAdjacentHTML("beforeend",`<div class="sh-drawer-backdrop" data-close-cart></div>
      <aside class="sh-mini-cart" aria-label="Mini cart" aria-hidden="true">
        <div class="sh-drawer-head"><div><small>Your basket</small><h2 style="margin:3px 0">Shopping cart</h2></div><button class="sh-icon-btn" data-close-cart aria-label="Close cart">✕</button></div>
        <div id="shMiniShipping" style="padding:16px 0"></div><div id="shMiniItems"></div><div id="shMiniFooter"></div>
      </aside>`);
    $$("[data-close-cart]").forEach(x=>x.addEventListener("click",closeMiniCart));
    document.addEventListener("keydown",e=>{if(e.key==="Escape") closeMiniCart();});
    document.addEventListener("click",e=>{
      const trigger=e.target.closest(".cart-link,[href='cart.html']");
      if(trigger && trigger.classList.contains("cart-link") && innerWidth>700){
        e.preventDefault(); openMiniCart();
      }
    });
  }
  function renderMiniCart(){
    const {items}=cartData(), host=$("#shMiniItems"), foot=$("#shMiniFooter"), ship=$("#shMiniShipping");
    if(!host) return;
    const subtotal=items.reduce((s,i)=>s+cartPrice(i)*cartQty(i),0), remain=Math.max(0,3000-subtotal), pct=Math.min(100,subtotal/3000*100);
    ship.innerHTML=`<small>${remain?money(remain)+" away from free shipping":"You unlocked free shipping!"}</small><div class="sh-progress" style="margin-top:8px"><span style="width:${pct}%"></span></div>`;
    if(!items.length){host.innerHTML='<div class="sh-mini-empty"><div style="font-size:44px">🛒</div><h3>Your cart is empty</h3><p>Add essentials for your clinic or studies.</p><a class="btn btn-primary" href="products.html">Browse products</a></div>';foot.innerHTML="";return;}
    host.innerHTML=items.slice(0,8).map(i=>`<div class="sh-mini-item"><img src="${esc(i.image||i.img||"assets/logo.svg")}" alt=""><div><b>${esc(i.name||i.title||"Product")}</b><small style="display:block;color:var(--sh-muted)">Qty ${cartQty(i)}</small></div><strong>${money(cartPrice(i)*cartQty(i))}</strong></div>`).join("");
    foot.innerHTML=`<div style="display:flex;justify-content:space-between;padding:18px 0"><b>Subtotal</b><strong>${money(subtotal)}</strong></div><a class="btn btn-primary" style="display:block;text-align:center" href="checkout.html">Checkout</a><a class="btn btn-light" style="display:block;text-align:center;margin-top:8px" href="cart.html">View cart</a>`;
  }
  function openMiniCart(){renderMiniCart();$(".sh-mini-cart").classList.add("open");$(".sh-drawer-backdrop").classList.add("open");$(".sh-mini-cart").setAttribute("aria-hidden","false");}
  function closeMiniCart(){const d=$(".sh-mini-cart"); if(!d)return; d.classList.remove("open");$(".sh-drawer-backdrop").classList.remove("open");d.setAttribute("aria-hidden","true");}
  SH.openCart=openMiniCart;

  function quickView(){
    if(location.pathname.split("/").pop().toLowerCase()==="wishlist.html") return;
    if(!$(".sh-modal")) document.body.insertAdjacentHTML("beforeend",'<div class="sh-modal" id="shQuickModal" role="dialog" aria-modal="true" aria-label="Product quick view"><div class="sh-modal-card"><div style="display:flex;justify-content:flex-end"><button class="sh-icon-btn" data-close-quick aria-label="Close">✕</button></div><div id="shQuickBody"></div></div></div>');
    document.addEventListener("click",e=>{
      const close=e.target.closest("[data-close-quick]"); if(close){$("#shQuickModal").classList.remove("open");return;}
      if(e.target.id==="shQuickModal") e.target.classList.remove("open");
      const card=e.target.closest(".product-card"); if(!card)return;
      if(!$(".sh-quick-actions",card)){
        const actions=document.createElement("div");actions.className="sh-quick-actions";
        actions.innerHTML='<button data-quick-view title="Quick view" aria-label="Quick view">⌕</button><button data-share-product title="Share" aria-label="Share product">↗</button>';
        card.appendChild(actions);
      }
      if(e.target.closest("[data-quick-view]")) showQuick(card);
      if(e.target.closest("[data-share-product]")) shareProduct(card);
    },true);
    $$(".product-card").forEach(card=>{
      if(!$(".sh-quick-actions",card)){const a=document.createElement("div");a.className="sh-quick-actions";a.innerHTML='<button data-quick-view title="Quick view" aria-label="Quick view">⌕</button><button data-share-product title="Share" aria-label="Share product">↗</button>';card.appendChild(a);}
    });
  }
  function productFromCard(card){
    const name=($("h3,h4,.product-name,.product-title",card)||{}).textContent||"Dental product";
    const price=($(".price,.product-price",card)||{}).textContent||"";
    const img=($("img",card)||{}).src||"assets/logo.svg";
    const link=($("a[href*='product']",card)||{}).href||"product.html";
    return {name:name.trim(),price:price.trim(),img,link};
  }
  function showQuick(card){
    const p=productFromCard(card);
    $("#shQuickBody").innerHTML=`<div class="sh-modal-grid"><img src="${esc(p.img)}" alt="${esc(p.name)}"><div><span class="sh-chip">Quick view</span><h2>${esc(p.name)}</h2><div class="sh-rating">★★★★★ <small style="color:var(--sh-muted)">4.8 rating</small></div><p class="sh-price">${esc(p.price||"See product for price")}</p><p>Clinic-ready dental supply selected for reliability, convenience, and everyday professional use.</p><div style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn btn-primary" href="${esc(p.link)}">View details</a><button class="btn btn-light" data-quick-add>Add to cart</button></div><hr style="border:0;border-top:1px solid var(--sh-border);margin:20px 0"><small>✓ Secure checkout &nbsp; ✓ Delivery support &nbsp; ✓ Easy returns</small></div></div>`;
    $("#shQuickModal").classList.add("open");
    const add=$("[data-quick-add]"); add&&add.addEventListener("click",()=>{const existing=$(".add-to-cart, [data-add-to-cart]",card); if(existing) existing.click(); else SH.toast("Open product details","Choose quantity and options on the product page.");});
  }
  function shareProduct(card){const p=productFromCard(card); if(navigator.share) navigator.share({title:p.name,url:p.link}).catch(()=>{}); else {navigator.clipboard?.writeText(p.link);SH.toast("Link copied",p.name);}}

  function commandPalette(){
    document.body.insertAdjacentHTML("beforeend",`<div class="sh-command" id="shCommand"><div class="sh-command-box"><input id="shCommandInput" placeholder="Search products, pages, or help…" aria-label="Site search"><div class="sh-command-results" id="shCommandResults"></div></div></div>`);
    const pages=[["Shop all products","products.html"],["Compare products","compare.html"],["Track orders","orders.html"],["Returns","returns.html"],["Notifications","notifications.html"],["Frequently asked questions","faq.html"],["Contact support","contact.html"],["Dental care journal","blog.html"],["Brand directory","brands.html"]];
    const input=$("#shCommandInput"), results=$("#shCommandResults"), modal=$("#shCommand");
    const render=q=>{const term=q.toLowerCase();results.innerHTML=pages.filter(x=>x[0].toLowerCase().includes(term)).slice(0,7).map(x=>`<a href="${x[1]}"><span>${x[0]}</span><small>Open →</small></a>`).join("")||'<div style="padding:18px;color:var(--sh-muted)">No matching page. Try product search.</div>';};
    render("");
    document.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();modal.classList.add("open");input.focus();} if(e.key==="Escape")modal.classList.remove("open");});
    input.addEventListener("input",()=>render(input.value));
    modal.addEventListener("click",e=>{if(e.target===modal)modal.classList.remove("open");});
    $$(".search-bar input").forEach(i=>i.title="Tip: press Ctrl/⌘ + K for quick navigation");
  }

  function homepageSections(){
    if(!/homepage\.html$/.test(location.pathname)||$(".sh-premium-home")) return;
    const main=$("main")||$(".footer");
    const wrap=document.createElement("div");wrap.className="sh-premium-home";
    wrap.innerHTML=`
    <section class="sh-premium-strip"><div class="sh-section-head"><div><span class="sh-chip">Shop by specialty</span><h2>Everything your dental workflow needs</h2><p>Browse focused collections for clinics, laboratories, students, and home care.</p></div><a href="products.html">View all products →</a></div>
    <div class="sh-category-grid">
      <a class="sh-category-card" href="products.html?category=Instruments"><i>🦷</i><div><b>Dental Instruments</b><span>Diagnostic, surgical, extraction and more</span></div></a>
      <a class="sh-category-card" href="products.html?category=Consumables"><i>🧪</i><div><b>Consumables</b><span>Reliable daily materials and disposables</span></div></a>
      <a class="sh-category-card" href="products.html?category=Infection%20Control"><i>🛡️</i><div><b>Infection Control</b><span>Protection, sterilization and disinfection</span></div></a>
      <a class="sh-category-card" href="products.html?category=Equipment"><i>⚙️</i><div><b>Equipment</b><span>Clinic technology and durable essentials</span></div></a>
    </div></section>
    <section class="sh-premium-strip"><div class="sh-section-head"><div><span class="sh-chip">Trusted names</span><h2>Popular dental brands</h2></div><a href="brands.html">Brand directory →</a></div><div class="sh-brand-grid"><div class="sh-brand-card">3M Oral Care</div><div class="sh-brand-card">Dentsply Sirona</div><div class="sh-brand-card">GC</div><div class="sh-brand-card">Ivoclar</div></div></section>
    <section class="sh-premium-strip"><div class="sh-section-head"><div><span class="sh-chip">SmileHub Journal</span><h2>Helpful dental supply guides</h2><p>Simple guidance for choosing and maintaining equipment.</p></div><a href="blog.html">Read all guides →</a></div><div class="sh-blog-grid">
      <article class="sh-blog-card"><span class="sh-chip">Buying guide</span><h3>Choosing instruments for a starter clinic</h3><p>A practical checklist for balancing quality, workflow, and budget.</p><a href="blog.html#starter-clinic">Read guide →</a></article>
      <article class="sh-blog-card"><span class="sh-chip">Infection control</span><h3>Building a safer sterilization routine</h3><p>Organize your frontend shopping list around a consistent clinic workflow.</p><a href="blog.html#sterilization">Read guide →</a></article>
      <article class="sh-blog-card"><span class="sh-chip">Maintenance</span><h3>How to care for dental handpieces</h3><p>Common maintenance reminders that help protect your equipment.</p><a href="blog.html#handpieces">Read guide →</a></article>
      <article class="sh-blog-card"><span class="sh-chip">Students</span><h3>Dental student essentials checklist</h3><p>A focused list for pre-clinical and clinical requirements.</p><a href="blog.html#students">Read guide →</a></article>
    </div></section>
    <section class="sh-premium-strip"><div class="sh-section-head"><div><span class="sh-chip">Customer stories</span><h2>Built around real dental workflows</h2></div></div><div class="sh-testimonial-grid"><blockquote class="sh-testimonial"><p>“The category layout makes reordering clinic basics much easier.”</p><b>Clinic customer</b></blockquote><blockquote class="sh-testimonial"><p>“Product comparison is especially useful for equipment purchases.”</p><b>Dental practitioner</b></blockquote><blockquote class="sh-testimonial"><p>“The student-focused sections keep the catalog less overwhelming.”</p><b>Dental student</b></blockquote><blockquote class="sh-testimonial"><p>“Clear order and return screens make the experience feel complete.”</p><b>Practice manager</b></blockquote></div></section>`;
    if(main?.classList.contains("footer")) main.parentNode.insertBefore(wrap,main); else main?.appendChild(wrap);
  }

  function authPolish(){
    const pass=$("input[type='password']");
    if(!pass) return;
    pass.addEventListener("keyup",e=>{
      let cap=pass.parentElement.querySelector(".sh-caps"); if(!cap){cap=document.createElement("div");cap.className="sh-caps";cap.textContent="Caps Lock is on";pass.parentElement.appendChild(cap);}
      cap.classList.toggle("show",e.getModifierState&&e.getModifierState("CapsLock"));
    });
    if(/register\.html$/.test(location.pathname) && !$(".sh-password-list")){
      const list=document.createElement("ul");list.className="sh-password-list";list.innerHTML='<li data-r="len">○ 8+ characters</li><li data-r="upper">○ Uppercase letter</li><li data-r="num">○ Number</li><li data-r="symbol">○ Symbol</li>';pass.insertAdjacentElement("afterend",list);
      pass.addEventListener("input",()=>{const v=pass.value,r={len:v.length>=8,upper:/[A-Z]/.test(v),num:/\d/.test(v),symbol:/[^A-Za-z0-9]/.test(v)};Object.entries(r).forEach(([k,ok])=>{const li=$(`[data-r="${k}"]`,list);li.classList.toggle("ok",ok);li.textContent=(ok?"✓":"○")+li.textContent.slice(1);});});
    }
  }

  function networkStatus(){
    const bar=document.createElement("div");bar.className="sh-offline";bar.textContent="You are offline. Saved frontend data remains available, but online services may not work.";document.body.appendChild(bar);
    const update=()=>bar.classList.toggle("show",!navigator.onLine);addEventListener("online",update);addEventListener("offline",update);update();
  }

  function adminExtras(){
    if(!document.body.classList.contains("admin-body")) return;
    const main=$(".admin-main, main"); if(!main||$(".sh-admin-kpi-grid")) return;
    const grid=document.createElement("div");grid.className="sh-admin-kpi-grid";
    const cart=cartData().items, wishlist=safeJSON(localStorage.getItem("smilehub_simple_wishlist"),[]);
    grid.innerHTML=`<div class="sh-admin-kpi"><small>Frontend health</small><strong>Ready</strong><span>All enhancement modules loaded</span></div><div class="sh-admin-kpi"><small>Saved cart items</small><strong>${cart.length}</strong><span>Local demo state</span></div><div class="sh-admin-kpi"><small>Wishlist items</small><strong>${wishlist.length}</strong><span>Local demo state</span></div><div class="sh-admin-kpi"><small>UI modules</small><strong>12</strong><span>Premium frontend tools</span></div>`;
    main.insertBefore(grid,main.firstChild);
  }

  function backTop(){
    const b=document.createElement("button");b.className="sh-backtop";b.textContent="↑";b.setAttribute("aria-label","Back to top");document.body.appendChild(b);
    addEventListener("scroll",()=>b.classList.toggle("show",scrollY>500),{passive:true});b.addEventListener("click",()=>scrollTo({top:0,behavior:"smooth"}));
  }

  function preserveFeatureFeedback(){
    document.addEventListener("click",e=>{
      const add=e.target.closest(".add-to-cart,[data-add-to-cart]");
      if(add){setTimeout(()=>{SH.toast("Added to cart","Your item is ready in the basket.");renderMiniCart();},120);}
      const wish=e.target.closest(".wishlist-btn,[data-wishlist]");
      if(wish) setTimeout(()=>SH.toast("Wishlist updated","Your saved products were updated."),100);
    });
  }

  function init(){
    addAccessibility();mobileNav();breadcrumbs();miniCart();quickView();commandPalette();homepageSections();authPolish();networkStatus();adminExtras();backTop();preserveFeatureFeedback();
    document.documentElement.classList.add("sh-premium-ready");
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init); else init();
})();