const fs=require('fs'),path=require('path');
const m=require('../.opencode/node_modules/@aivangogh/ph-address/dist/index.js');
const provs=m.getAllProvinces();
const muns=m.getAllMunicipalities();
const brgys=m.getAllBarangays();

const postalByMun=new Map();
for(const p of m.getAllPostalCodes()){
  const k=p.municipalityCode; if(!postalByMun.has(k)) postalByMun.set(k,[]);
  postalByMun.get(k).push(p.postalCode);
}
const munsByProv=new Map(); for(const p of provs) munsByProv.set(p.psgcCode,[]);
for(const mu of muns){ if(!munsByProv.has(mu.provinceCode)) munsByProv.set(mu.provinceCode,[]); munsByProv.get(mu.provinceCode).push(mu); }
const brgyByMun=new Map();
for(const b of brgys){ const k=b.municipalCityCode||b.municipalityCode; if(!brgyByMun.has(k)) brgyByMun.set(k,[]); brgyByMun.get(k).push(b.name); }
// Sort barangays alpha, cities alpha, provinces alpha (NCR first for UX)
const NCR='1300000000';
const sortedProvs=[...provs].sort((a,b)=>{
  if(a.psgcCode===NCR) return -1; if(b.psgcCode===NCR) return 1; return a.name.localeCompare(b.name);
});
const synthetic=[];
const knownProv=new Set(sortedProvs.map(p=>p.psgcCode));
for(const [code, list] of munsByProv.entries()){
  if(knownProv.has(code)) continue;
  // NCR pseudo-province
  if(code==='1300000000'){
    synthetic.push({ name:'Metro Manila', code, regionCode:'1300000000', cities:list });
    continue;
  }
  // HUC / orphan: synthesize 1-city province named after the city itself if we can resolve
  const first=list[0]; const label=first?first.name:code;
  synthetic.push({ name:label, code, regionCode:first? (muns.find(x=>x.psgcCode===code)?.provinceCode||'') : '', cities:list });
}
const out={ version:'ph-address 2025.x + generated '+new Date().toISOString().slice(0,10), provinces:[]};
for(const pr of sortedProvs){
  const cities=(munsByProv.get(pr.psgcCode)||[]).slice().sort((a,b)=>a.name.localeCompare(b.name)).map(mu=>{
    const z=(postalByMun.get(mu.psgcCode)||[])[0]||'';
    const bl=(brgyByMun.get(mu.psgcCode)||[]).slice().sort((a,b)=>a.localeCompare(b));
    return { name:mu.name, code:mu.psgcCode, zip:z, barangays:bl };
  });
  out.provinces.push({ name:pr.name, code:pr.psgcCode, regionCode:pr.regionCode, cities });
}
// Map synthetic cities to include zip/barangays like normal provinces
for(const s of synthetic){
  s.cities = s.cities.slice().sort((a,b)=>a.name.localeCompare(b.name)).map(mu=>{
    const z=(postalByMun.get(mu.psgcCode)||[])[0]||'';
    const bl=(brgyByMun.get(mu.psgcCode)||[]).slice().sort((a,b)=>a.localeCompare(b));
    return { name:mu.name, code:mu.psgcCode, zip:z, barangays:bl };
  });
}
// Metro Manila first, then the rest alphabetically after Abra
if(synthetic.length){ synthetic.sort((a,b)=> a.name==='Metro Manila'?-1 : b.name==='Metro Manila'?1 : a.name.localeCompare(b.name)); out.provinces.unshift(...synthetic.filter(s=>s.name==='Metro Manila')); out.provinces.push(...synthetic.filter(s=>s.name!=='Metro Manila')); }
// Keep file small: we only need name/code/zip + barangay names; HUC already in province list via their PSGC parent, NCR's 17 cities are under NCR pseudo-province in this dataset
const dir=__dirname + '/../data/assets';
fs.mkdirSync(dir,{recursive:true});
const p=path.join(dir,'ph-locations.json');
fs.writeFileSync(p, JSON.stringify(out));
console.log('wrote',p,'bytes',fs.statSync(p).size,'provinces',out.provinces.length,'cities',muns.length,'barangays',brgys.length);
const gz=require('zlib').gzipSync(fs.readFileSync(p));
console.log('gzip',gz.length);
// sanity checks
const findZip=(prov,city)=>{ const pr=out.provinces.find(x=>x.name===prov); const ci=pr?.cities.find(x=>x.name===city); return ci?.zip||null; };
console.log('QC zip',findZip('National Capital Region','Quezon City')||findZip('NCR','Quezon City')||'n/a'); // provider uses NCR region name effectively
// Also show Manila
console.log('Manila zip',JSON.stringify(postalByMun.get('1339000000')||'missing'));
