import { actions, getState } from '../../state/store.js';

function el(id){ return document.getElementById(id); }

let __currentChainId = null;

function recomputeTotal(){
  const count = parseFloat(el('ed-led-count')?.value || '0') || 0;
  const lm = parseFloat(el('ed-led-lm')?.value || '0') || 0;
  const tot = (count * lm) || 0;
  if (el('ed-led-total')) el('ed-led-total').value = String(tot);
}

export function open(chainId, nodeId){
  window.__lsNodeId = nodeId;
  const st = getState();
  const c = (st.chains || []).find(x => x.id === chainId);
  if(!c){ console.warn('[LS Modal] chain not found for id', chainId); return; }
  __currentChainId = chainId;

  // fill inputs
  if (el('ed-chain-label')) {
    const st2 = getState();
    const node = (st2.nodes||[]).find(n=>n.id===nodeId);
    el('ed-chain-label').value = (node?.label || 'Light Source');
  }
  if (el('ed-led-count'))  el('ed-led-count').value  = String(c.ledCount ?? 0);
  if (el('ed-led-lm'))     el('ed-led-lm').value     = String(c.lmPerLed ?? 0);
  recomputeTotal();

  // live recompute
  if (el('ed-led-count')) el('ed-led-count').oninput = recomputeTotal;
  if (el('ed-led-lm'))    el('ed-led-lm').oninput    = recomputeTotal;

  const modal = el('ls-modal');
  if (modal){
    modal.dataset.chainId = chainId;
    modal.classList.add('show');
    modal.style.zIndex = 10000;
  }
}

export function close(){
  const modal = el('ls-modal');
  if (modal){
    delete modal.dataset.chainId;
    modal.classList.remove('show');
  }
  __currentChainId = null;
}

function save(){
  const chainId = __currentChainId || el('ls-modal')?.dataset?.chainId;
  if (!chainId){ console.warn('[LS Modal] no chainId to save'); return close(); }

  const patchChain = {
    ledCount: parseFloat(el('ed-led-count')?.value || '0') || 0,
    lmPerLed: parseFloat(el('ed-led-lm')?.value || '0') || 0
  };
  const name = el('ed-chain-label')?.value ?? '';
  // Update LightSource node label (card title)
  if (window.__lsNodeId) actions.updateNode(window.__lsNodeId, { label: name });
  // Update chain props for LEDs/lm
  actions.updateChain(chainId, patchChain);
  close();
}

export function bind(){
  el('btn-ls-close')?.addEventListener('click', close);
  el('btn-ls-ok')?.addEventListener('click', save);

  // drag support
  const hdr = el('ls-drag');
  hdr?.addEventListener('mousedown', (e) => {
    const m = el('ls-modal');
    if (!m) return;
    const drag = { sx: e.clientX, sy: e.clientY, left: m.offsetLeft, top: m.offsetTop };
    function mv(ev){
      m.style.left = (drag.left + (ev.clientX - drag.sx)) + 'px';
      m.style.top  = (drag.top  + (ev.clientY - drag.sy)) + 'px';
      m.style.transform = 'translate(0,0)';
    }
    function up(){
      document.removeEventListener('mousemove', mv);
      document.removeEventListener('mouseup', up);
    }
    document.addEventListener('mousemove', mv);
    document.addEventListener('mouseup', up);
  });
}

// expose to global event bus used by interactions.js
window.App = window.App || {};
window.App.Events = { ...(window.App.Events || {}), openLsModal: open, closeLsModal: close };
