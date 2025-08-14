// src/features/board/render.js
import { getState } from '../../state/store.js';
import { chainEffRange, chainFinalLumensRange, systemSummary } from '../../core/calc/chainRange.js';
import { loadCatalog } from '../../core/catalog/catalog.js';

const SPACING_X = 280, SPACING_Y = 140;

function nodeHtml(n, tables){
  const isLight = n.kind==='LightSource';
  let body='';
  if(isLight){
    const chain = getState().chains.find(c=>c.id===n.chainId) || {ledCount:0,lmPerLed:0};
    const leds=chain.ledCount||0, lm=chain.lmPerLed||0, tot=leds*lm;
    body += `<div><div class="metric">LEDs</div><div>${leds}</div></div>`;
    body += `<div><div class="metric">lm/LED</div><div>${lm}</div></div>`;
    body += `<div><div class="metric">Total lm</div><div>${tot}</div></div>`;
  } else {
    const ruleEff = window.App.RulesSingle(n, tables);
    body += `<div><div class="metric">Efficiency</div><div class="value">${ruleEff.min.toFixed(3)}–${ruleEff.max.toFixed(3)}</div></div>`;
    Object.entries(n.config||{}).forEach(([k,v])=>{ if(k==='notes') return; body += `<div><div class="metric">${k}</div><div>${v}</div></div>`; });
  }
  const extraClass = isLight?' light':'';
  return `<div class="node${extraClass}" id="${n.id}" style="left:${n.x}px;top:${n.y}px">
    <div class="node-header" data-drag-handle><div class="node-title">${n.label||n.kind}</div></div>
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
  layer.innerHTML = st.nodes.map(n=>nodeHtml(n, tables)).join('');
  document.querySelectorAll('.node.sel').forEach(el=>el.classList.remove('sel'));
  st.selection.ids.forEach(id=>{ const el=document.getElementById(id); if(el) el.classList.add('sel'); });
}

export function autoPlace(chainId){
  const st=getState();
  const last = st.nodes.filter(n=>n.chainId===chainId).sort((a,b)=>a.x-b.x).slice(-1)[0];
  return last ? { x: last.x + SPACING_X, y:last.y } : { x:120, y:120+ (st.chains.findIndex(c=>c.id===chainId)*SPACING_Y) };
}
