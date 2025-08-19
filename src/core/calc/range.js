
import { loadCatalog } from '../catalog/catalog.js';

export function mulRange(a,b){ return { min:a.min*b.min, max:a.max*b.max }; }
export function valRange(x){ return { min:x, max:x }; }

export function nodeEffRange(node){
  if (node.kind==='LightSource') return valRange(1);
  const cat = loadCatalog();
  const def = cat[node.kind] || {};
  let r = valRange(1);
  const factors = def.factors || {};
  for (const [key, table] of Object.entries(factors)){
    const sel = node.config?.[key];
    if (sel==null) continue;
    const f = table[sel];
    if (typeof f === 'number') r = mulRange(r, valRange(f));
    else if (f && typeof f.min==='number' && typeof f.max==='number') r = mulRange(r, f);
  }
  const hook = window.App?.Rules?.[node.kind];
  if (typeof hook==='function'){
    const h = hook(node.config||{}, def);
    if (h && typeof h.min==='number' && typeof h.max==='number') r = mulRange(r,h);
  }
  return r;
}

export function chainEffRange(nodes, chainId){
  let r = valRange(1);
  nodes.filter(n=>n.chainId===chainId && n.kind!=='LightSource' && !n.disabled)
       .forEach(n=>{ r = mulRange(r, nodeEffRange(n)); });
  return r;
}

export function chainFinalLumensRange(nodes, chain){
  const eff = chainEffRange(nodes, chain.id);
  const srcLm = (chain.ledCount||0) * (chain.lmPerLed||0);
  return { min: srcLm*eff.min, max: srcLm*eff.max };
}

export function systemSummary(nodes, chains){
  let totalMin=0, totalMax=0, totalSrc=0;
  chains.forEach(c=>{
    const lm = (c.ledCount||0) * (c.lmPerLed||0);
    const eff = chainEffRange(nodes, c.id);
    totalSrc += lm;
    totalMin += lm * eff.min;
    totalMax += lm * eff.max;
  });
  const sysEff = totalSrc>0 ? { min: totalMin/totalSrc, max: totalMax/totalSrc } : { min:0, max:0 };
  return { totalLumens:{min:totalMin,max:totalMax}, systemEfficiency: sysEff };
}
