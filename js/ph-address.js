(function(){
  'use strict';
  var CACHE=null, LOADING=null;
  var JSON_PATH='data/assets/ph-locations.json';
  var LS_KEY='ph_locations_v2';

  function fetchLocations(){
    if(CACHE) return Promise.resolve(CACHE);
    if(LOADING) return LOADING;
    try{ var raw=localStorage.getItem(LS_KEY); if(raw){ CACHE=JSON.parse(raw); } }catch(e){}
    if(CACHE) return Promise.resolve(CACHE);
    LOADING=fetch(JSON_PATH,{cache:'force-cache'}).then(function(r){
      if(!r.ok) throw new Error('ph-locations fetch '+r.status);
      return r.json();
    }).then(function(j){
      CACHE=j; try{ localStorage.setItem(LS_KEY, JSON.stringify(j)); }catch(e){}
      return j;
    }).catch(function(e){
      console.warn('[PHAddress] locations unavailable, falling back to free text',e);
      throw e;
    });
    return LOADING;
  }

  function fillSelect(sel, items, placeholder){
    if(!sel) return;
    var cur=sel.value;
    sel.innerHTML='';
    var ph=document.createElement('option'); ph.value=''; ph.textContent=placeholder||'Select'; ph.disabled=false; sel.appendChild(ph);
    items.forEach(function(it){
      var o=document.createElement('option');
      o.value=it.value!=null?it.value:it.name;
      o.textContent=it.label||it.name;
      if(it.zip) o.dataset.zip=it.zip;
      if(it.code) o.dataset.code=it.code;
      sel.appendChild(o);
    });
    if(cur) sel.value=cur;
  }

  function findProvince(data, name){ if(!name) return null; var n=name.trim().toLowerCase(); return data.provinces.find(function(p){return p.name.toLowerCase()===n;})||null; }
  function findCity(prov, name){ if(!prov||!name) return null; var n=name.trim().toLowerCase(); return prov.cities.find(function(c){return c.name.toLowerCase()===n;})||null; }

  function setupCascade(opts){
    var provSel=document.getElementById(opts.provinceId);
    var citySel=document.getElementById(opts.cityId);
    var brgySel=document.getElementById(opts.barangayId);
    var postalSel=document.getElementById(opts.postalId);
    var brgyOther=document.getElementById(opts.barangayOtherId);
    var cityOther=document.getElementById(opts.cityOtherId);
    var provOther=document.getElementById(opts.provinceOtherId);
    if(!provSel||!citySel||!brgySel||!postalSel) return Promise.resolve();
    provSel.disabled=true; citySel.disabled=true; brgySel.disabled=true; postalSel.disabled=true;
    function showOther(input, show){ if(!input) return; input.classList.toggle('hidden',!show); if(show) input.focus(); }
    function resetCity(){ fillSelect(citySel,[], 'Select city / municipality'); citySel.disabled=true; resetBrgy(); resetPostal(); showOther(cityOther,false); }
    function resetBrgy(){ fillSelect(brgySel,[], 'Select barangay'); brgySel.disabled=true; showOther(brgyOther,false); }
    function resetPostal(){ fillSelect(postalSel,[], 'Select postal code'); postalSel.disabled=true; }
    var dataRef=null;
    function onProvinceChange(){
      var provName=provSel.value;
      if(!provName || provName==='__other__'){ resetCity(); if(provName==='__other__') showOther(provOther,true); return; }
      showOther(provOther,false);
      var prov=findProvince(dataRef, provName);
      if(!prov){ resetCity(); return; }
      var cities=prov.cities.map(function(c){return {name:c.name, value:c.name, code:c.code, zip:c.zip};});
      fillSelect(citySel, cities, 'Select city / municipality');
      citySel.disabled=false;
      resetBrgy(); resetPostal();
      var o=document.createElement('option'); o.value='__other__'; o.textContent='Other (not listed)'; citySel.appendChild(o);
      announce('Province selected: '+provName+'. Choose a city.');
    }
    function onCityChange(){
      var provName=provSel.value; var cityName=citySel.value;
      if(!cityName || cityName==='__other__'){ resetBrgy(); resetPostal(); if(cityName==='__other__') showOther(cityOther,true); return; }
      showOther(cityOther,false);
      var prov=findProvince(dataRef, provName);
      var city=findCity(prov, cityName);
      if(!city){ resetBrgy(); resetPostal(); return; }
      var brgys=city.barangays.map(function(b){return {name:b, value:b};});
      fillSelect(brgySel, brgys, 'Select barangay');
      brgySel.disabled=false;
      var bo=document.createElement('option'); bo.value='__other__'; bo.textContent='Other (not listed)'; brgySel.appendChild(bo);
      fillSelect(postalSel, city.zip? [{name:city.zip, value:city.zip}]:[], 'Select postal code');
      if(city.zip){ postalSel.value=city.zip; postalSel.disabled=false; } else { postalSel.disabled=true; }
      var po=document.createElement('option'); po.value='__other__'; po.textContent='Other / manual'; postalSel.appendChild(po);
      showOther(brgyOther,false);
      announce('City selected: '+cityName+'. Choose a barangay.');
    }
    function onBrgyChange(){ var v=brgySel.value; showOther(brgyOther, v==='__other__'); }
    function onPostalChange(){
      var sel=postalSel.value;
      if(sel==='__other__'){
        var input=document.getElementById(opts.postalId+'_other');
        if(input){ input.classList.remove('hidden'); input.required=true; postalSel.classList.add('hidden'); input.focus(); }
      }
    }
    provSel.addEventListener('change', onProvinceChange);
    citySel.addEventListener('change', onCityChange);
    brgySel.addEventListener('change', onBrgyChange);
    postalSel.addEventListener('change', onPostalChange);
    var postalOther=document.getElementById(opts.postalId+'_other');
    if(postalOther) postalOther.addEventListener('blur', function(){ if(!postalOther.value.trim()){ postalOther.classList.add('hidden'); postalSel.classList.remove('hidden'); postalSel.value=''; } });
    return fetchLocations().then(function(data){
      dataRef=data;
      var provs=data.provinces.map(function(p){return {name:p.name, value:p.name, code:p.code};});
      fillSelect(provSel, provs, 'Select province');
      var po=document.createElement('option'); po.value='__other__'; po.textContent='Other (not listed)'; provSel.appendChild(po);
      provSel.disabled=false;
      var savedProv=provSel.getAttribute('data-saved')||'';
      var savedCity=citySel.getAttribute('data-saved')||'';
      var savedBrgy=brgySel.getAttribute('data-saved')||'';
      var savedPostal=postalSel.getAttribute('data-saved')||'';
      if(savedProv){
        var hasProv=[].slice.call(provSel.options).some(function(o){return o.value.toLowerCase()===savedProv.toLowerCase();});
        if(hasProv){
          provSel.value=savedProv; onProvinceChange();
          if(savedCity){
            setTimeout(function(){
              var hasCity=[].slice.call(citySel.options).some(function(o){return o.value.toLowerCase()===savedCity.toLowerCase();});
              if(hasCity){
                citySel.value=savedCity; citySel.dispatchEvent(new Event('change'));
                setTimeout(function(){
                  if(savedBrgy){
                    var hasBrgy=[].slice.call(brgySel.options).some(function(o){return o.value.toLowerCase()===savedBrgy.toLowerCase();});
                    if(hasBrgy) brgySel.value=savedBrgy; else if(brgyOther){ brgySel.value='__other__'; brgyOther.classList.remove('hidden'); brgyOther.value=savedBrgy; }
                  }
                  if(savedPostal){
                    var opt=postalSel.querySelector('option[value="'+savedPostal+'"]');
                    if(opt) postalSel.value=savedPostal;
                  }
                },0);
              } else if(cityOther){ citySel.value='__other__'; showOther(cityOther,true); cityOther.value=savedCity; }
            },0);
          }
        } else if(provOther){ provSel.value='__other__'; showOther(provOther,true); provOther.value=savedProv; }
      }
      return data;
    }).catch(function(){
      provSel.disabled=false; citySel.disabled=false; brgySel.disabled=false; postalSel.disabled=false;
      announce('Location data unavailable — you can still type your address.');
    });
  }

  function prefill(prefix, addr){
    if(!addr) return Promise.resolve();
    var provId=prefix+'Province', cityId=prefix+'City', brgyId=prefix+'Barangay', postalId=prefix+'Postal';
    var provSel=document.getElementById(provId), citySel=document.getElementById(cityId), brgySel=document.getElementById(brgyId), postalSel=document.getElementById(postalId);
    if(!provSel||!citySel||!brgySel||!postalSel) return Promise.resolve();
    // wait for setup to have loaded data
    return fetchLocations().then(function(data){
      function setSelect(sel, value, otherId){
        if(!sel) return;
        if(!value){ sel.value=''; sel.dispatchEvent(new Event('change')); return; }
        var has=[].slice.call(sel.options).some(function(o){ return o.value.toLowerCase()===String(value).toLowerCase(); });
        if(has){
          sel.value=value;
          sel.dispatchEvent(new Event('change'));
        } else {
          var other=document.getElementById(otherId)||document.getElementById(sel.id+'Other')||document.getElementById(sel.id+'_other');
          if(other){
            sel.value='__other__';
            sel.dispatchEvent(new Event('change'));
            other.value=value;
            other.classList.remove('hidden');
          } else {
            sel.setAttribute('data-saved', value);
          }
        }
      }
      // set province first, then city, then barangay/postal via chained timeouts to allow cascade to populate
      setSelect(provSel, addr.province, prefix+'ProvinceOther');
      setTimeout(function(){
        setSelect(citySel, addr.city, prefix+'CityOther');
        setTimeout(function(){
          setSelect(brgySel, addr.barangay, prefix+'BarangayOther');
          setSelect(postalSel, addr.postal, prefix+'Postal_other');
          if(addr.postal){
            var hasPostal=[].slice.call(postalSel.options).some(function(o){ return o.value===String(addr.postal); });
            if(!hasPostal){
              var po=document.getElementById(postalId+'_other')||document.getElementById(postalId+'Other');
              if(po){ postalSel.value='__other__'; postalSel.dispatchEvent(new Event('change')); po.value=addr.postal; po.classList.remove('hidden'); }
            }
          }
        }, 80);
      }, 80);
    }).catch(function(){});
  }

  function announce(msg){
    var r=document.getElementById('siteLiveRegion');
    if(!r){ r=document.createElement('div'); r.id='siteLiveRegion'; r.className='sr-only'; r.setAttribute('aria-live','polite'); r.setAttribute('aria-atomic','true'); document.body.appendChild(r); }
    r.textContent=''; setTimeout(function(){ r.textContent=msg; },20);
  }

  window.PHAddress={ setup:setupCascade, prefill:prefill, load:fetchLocations };
})();
