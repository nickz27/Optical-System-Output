import { getState, actions } from '../../state/store.js';
import { chainEffRange, chainFinalLumensRange, systemSummary } from '../../core/calc/chainRange.js';
import { loadCatalog } from '../../core/catalog/catalog.js';

const SPACING_X = 280, SPACING_Y = 140;

function nodeHtml(n, tables){
  const isLight = n.kind==='LightSource';
  const isSummary = n.kind==='ChainSummary';
  const isSystem = n.kind==='SystemSummary';
  let body='';
  if(isLight){
    const chain = getState().chains.find(c=>c.id===n.chainId) || {ledCount:0,lmPerLed:0};
    const leds=chain.ledCount||0, lm=chain.lmPerLed||0, tot=leds*lm;
    body += `<div><div class="metric">LEDs</div><div>${leds}</div></div>`;
    body += `<div><div class="metric">lm/LED</div><div>${lm}</div></div>`;
    body += `<div><div class="metric">Total lm</div><div>${tot}</div></div>`;
  } else if(isSummary){
    const chain = getState().chains.find(c=>c.id===n.chainId);
    const eff=chainEffRange(getState().nodes, n.chainId, tables);
    const lum=chainFinalLumensRange(getState().nodes, chain, tables);
    body += `<div><div class="metric">Chain Eff</div><div class="value">${eff.min.toFixed(3)}–${eff.max.toFixed(3)} ×</div></div>`;
    body += `<div><div class="metric">Final lm</div><div class="value">${lum.min.toFixed(1)}–${lum.max.toFixed(1)}</div></div>`;
  } else if(isSystem){
    const s = systemSummary(getState().nodes, getState().chains, tables);
    body += `<div><div class="metric">System Eff</div><div class="value">${s.systemEfficiency.min.toFixed(3)}–${s.systemEfficiency.max.toFixed(3)} ×</div></div>`;
    body += `<div><div class="metric">Total lm</div><div class="value">${s.totalLumens.min.toFixed(1)}–${s.totalLumens.max.toFixed(1)}</div></div>`;
  } else {
    const ruleEff = window.App.RulesSingle(n, tables);
    body += `<div><div class="metric">Efficiency</div><div class="value">${ruleEff.min.toFixed(3)}–${ruleEff.max.toFixed(3)}</div></div>`;
    Object.entries(n.config||{}).forEach(([k,v])=>{ if(k==='notes') return; body += `<div><div class="metric">${k}</div><div>${v}</div></div>`; });
  }
  const extraClass = isLight?' light':(isSummary?' summary':(isSystem?' system':''));
  return `<div class="node${extraClass}" id="${n.id}" style="left:${n.x}px;top:${n.y}px">
    <div class="node-header" data-drag-handle><div class="node-title">${n.label||n.kind}</div><div class="pill">${n.kind==='LightSource'?'Source':n.kind}</div></div>
    <div class="node-body">${body}</div>
  </div>`;
}

import { rules } from '../../core/rules/index.js';
function singleEff(n, tables){
  const rule = rules[n.kind] || rules.__default;
  return rule(n.config||{}, tables, n.kind);
}
window.App = window.App || {}; window.App.RulesSingle = singleEff;

export function renderNodes(){
  const st=getState(); const tables=loadCatalog();
  const layer=document.getElementById('nodes-layer');
  const withSummaries = [...st.nodes];
  st.chains.forEach(c=>{
    const last = st.nodes.filter(n=>n.chainId===c.id && n.kind!=='ChainSummary').sort((a,b)=>a.x-b.x).slice(-1)[0];
    const sx = last ? last.x + SPACING_X : 120;
    const sy = last ? last.y : 120 + (st.chains.findIndex(x=>x.id===c.id)*SPACING_Y);
    const id = `summary-${c.id}`;
    const exists = withSummaries.find(n=>n.id===id);
    if(exists){ exists.x=sx; exists.y=sy; }
    else withSummaries.push({ id, chainId:c.id, kind:'ChainSummary', x:sx, y:sy, label:'Summary' });
  });
  if(st.chains.length>1){
    const id='system-summary';
    const exists = withSummaries.find(n=>n.id===id);
    const sx = 140, sy = 40;
    if(!exists) withSummaries.push({ id, chainId:'system', kind:'SystemSummary', x:sx, y:sy, label:'System Summary' });
  }
  layer.innerHTML = withSummaries.map(n=>nodeHtml(n, tables)).join('');
  document.querySelectorAll('.node.sel').forEach(el=>el.classList.remove('sel'));
  st.selection.ids.forEach(id=>{ const el=document.getElementById(id); if(el) el.classList.add('sel'); });
}

export function autoPlace(chainId){
  const st=getState();
  const last = st.nodes.filter(n=>n.chainId===chainId && n.kind!=='ChainSummary').sort((a,b)=>a.x-b.x).slice(-1)[0];
  return last ? { x: last.x + SPACING_X, y:last.y } : { x:120, y:120+ (st.chains.findIndex(c=>c.id===chainId)*SPACING_Y) };
}
