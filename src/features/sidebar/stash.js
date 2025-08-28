import { getState, actions } from '../../state/store.js';
import { nodeEffRange } from '../../core/calc/range.js';

function kv(label, value){
  const s = document.createElement('span'); s.className = 'kv';
  const k = document.createElement('span'); k.className = 'k'; k.textContent = label + ':';
  const v = document.createElement('span'); v.className = 'v'; v.textContent = String(value);
  s.appendChild(k); s.appendChild(v); return s;
}

function metricLineFor(n){
  const wrap = document.createElement('div'); wrap.className = 'metric-line';
  const cfg = n.config || {};
  Object.entries(cfg).forEach(([k,v])=>{
    if (k==='name' || k==='notes') return;
    wrap.appendChild(kv(k, v));
  });
  const spacer = document.createElement('span'); spacer.className = 'spacer';
  const eff = nodeEffRange(n); const effEl = document.createElement('span'); effEl.className = 'eff';
  effEl.textContent = `Eff: ${eff.min.toFixed(3)} – ${eff.max.toFixed(3)}`;
  wrap.appendChild(spacer); wrap.appendChild(effEl);
  return wrap;
}

function renderStashChain(container, chainId, nodes){
  const group = document.createElement('div'); group.className = 'tree-chain';

  // Header uses the Light Source title if present (even if disabled)
  const ls = nodes.find(n => n.chainId===chainId && n.kind==='LightSource');
  const hdr = document.createElement('div'); hdr.className = 'tree-chain-hdr';
  const title = document.createElement('div'); title.className = 'tree-chain-title';
  title.textContent = ls?.label || 'Light Source';
  hdr.appendChild(title);
  // LS selection + dragging from stash
  if (ls){
    hdr.dataset.nodeId = ls.id;
    hdr.addEventListener('click', ()=> actions.selectSingle(ls.id));
    hdr.draggable = true;
    hdr.addEventListener('dragstart', (e)=>{
      e.dataTransfer?.setData('text/node-id', ls.id);
      e.dataTransfer?.setData('text/plain', ls.id);
      e.dataTransfer.effectAllowed = 'move';
    });
  }
  group.appendChild(hdr);

  const ul = document.createElement('ul'); ul.className = 'tree-list';
  const comps = nodes.filter(n => n.chainId===chainId && n.kind!=='LightSource');
  comps.forEach(n => {
    const li = document.createElement('li'); li.className = 'tree-item'; li.dataset.nodeId = n.id;
    const t = document.createElement('div'); t.className = 'tree-item-title'; t.textContent = (n.config?.name || n.label || n.kind);
    li.appendChild(t);
    li.addEventListener('click', ()=> actions.selectSingle(n.id));
    li.draggable = true;
    li.addEventListener('dragstart', (e)=>{
      e.dataTransfer?.setData('text/node-id', n.id);
      e.dataTransfer?.setData('text/plain', n.id);
      e.dataTransfer.effectAllowed = 'move';
    });
    ul.appendChild(li);
  });

  group.appendChild(ul); container.appendChild(group);
}

export function renderStash(){
  const el = document.getElementById('stash-list'); if (!el) return;
  const st = getState();
  el.innerHTML = '';
  // Stashed nodes are disabled; group by chainId
  const disabledNodes = (st.nodes||[]).filter(n => n.disabled);
  const chainIds = Array.from(new Set(disabledNodes.map(n=>n.chainId))).filter(Boolean);
  chainIds.forEach(cid => renderStashChain(el, cid, disabledNodes));

  // reflect current selection
  const sel = new Set(st.selection?.ids || []);
  el.querySelectorAll('.tree-item, .tree-chain-hdr').forEach(node => {
    const id = node.dataset.nodeId;
    if (id && sel.has(id)) node.classList.add('sel'); else node.classList.remove('sel');
  });

  // DnD target: dropping here stashes the node (and whole chain if LS)
  const section = document.getElementById('stash-section') || el;
  if (!section.dataset.boundDrop){
    const onOver = (e)=>{ e.preventDefault(); el.classList.add('drop-over'); };
    const onLeave = ()=>{ el.classList.remove('drop-over'); };
    section.addEventListener('dragover', onOver);
    section.addEventListener('dragleave', onLeave);
    section.addEventListener('drop', (e)=>{
      e.preventDefault();
      onLeave();
      const id = e.dataTransfer?.getData('text/node-id');
      if (!id) return;
      const st2 = getState();
      const n = st2.nodes.find(x=>x.id===id); if (!n) return;
      if (n.kind === 'LightSource'){
        // stash LS and all its components
        actions.setNodeDisabled(n.id, true);
        st2.nodes.filter(m=>m.chainId===n.chainId && m.id!==n.id).forEach(m=> actions.setNodeDisabled(m.id, true));
      } else {
        actions.setNodeDisabled(n.id, true);
      }
    }, { passive: false });
    section.dataset.boundDrop = '1';
  }
}

export function bindStash(){ renderStash(); }
