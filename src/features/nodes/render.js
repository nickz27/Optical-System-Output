import { getState } from '../../state/store.js';
function nodeHtml(n){
  const isLight = n.kind==='LightSource';
  const st = getState();
  let body = '';
  if (isLight){
    const chain = st.chains.find(c => c.id === n.chainId) || { ledCount:0, lmPerLed:0 };
    const leds = chain.ledCount || 0, lm = chain.lmPerLed || 0, tot = leds * lm;
    body += `<div><div class="metric">LEDs</div><div>${leds}</div></div>`;
    body += `<div><div class="metric">lm/LED</div><div>${lm}</div></div>`;
    body += `<div><div class="metric">Total lm</div><div>${tot}</div></div>`;
  } else {
    const cfg = n.config || {};
    const labelMap = { lengthMm: 'abs.' };
    Object.entries(cfg).forEach(([k,v]) => {
      if (k === 'notes' || k === 'name') return;
      const dk = labelMap[k] || k;
      body += `<div><div class="metric">${dk}</div><div>${v}</div></div>`;
    });
  }
  const title = (!isLight ? (n.config?.name || n.label || n.kind) : (n.label || n.kind));
   return `<div class="node${isLight?' light':''}" id="${n.id}" data-id="${n.id}" style="left:${n.x}px;top:${n.y}px">
    <div class="node-header" data-drag-handle><div class="node-title">${title}</div></div>
    <div class="node-body">${body}</div>
  </div>`;
}
export function renderNodes(){
  const st=getState(); const layer=document.getElementById('nodes-layer'); if(!layer) return;
  const visible=st.nodes.filter(n=>!n.disabled);
  layer.innerHTML = visible.map(nodeHtml).join('');
  document.querySelectorAll('.node.sel').forEach(el=>el.classList.remove('sel'));
  st.selection.ids.forEach(id=>{ const el=document.getElementById(id); if(el) el.classList.add('sel'); });
}