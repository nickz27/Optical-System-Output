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
  effEl.textContent = `Eff: ${eff.min.toFixed(1)} - ${eff.max.toFixed(1)}`;
  wrap.appendChild(spacer); wrap.appendChild(effEl);
  return wrap;
}

function renderStashChain(container, chainId, nodes){
  const group = document.createElement('div'); group.className = 'tree-chain';

  // Header uses the Light Source title if present (even if disabled)
  const ls = nodes.find(n => n.chainId===chainId && n.kind==='LightSource');
  if (ls) {
    const hdr = document.createElement('div'); hdr.className = 'tree-chain-hdr'; hdr.tabIndex = 0;
    const title = document.createElement('div'); title.className = 'tree-chain-title accent-title ls';
    title.textContent = ls.label || 'Light Source';
    hdr.appendChild(title);
    // LS selection + dragging + editing from stash
    hdr.dataset.nodeId = ls.id;
    hdr.addEventListener('click', ()=> actions.selectSingle(ls.id));
    hdr.addEventListener('dblclick', ()=> window.App?.Events?.openLsModal?.(ls.chainId, ls.id));
    hdr.draggable = true;
    hdr.addEventListener('dragstart', (e)=>{
      e.dataTransfer?.setData('text/node-id', ls.id);
      e.dataTransfer?.setData('text/plain', ls.id);
      e.dataTransfer.effectAllowed = 'move';
    });
    group.appendChild(hdr);
  }

  const comps = nodes.filter(n => n.chainId===chainId && n.kind!=='LightSource');
  if (comps.length > 0){
    const ul = document.createElement('ul');
    ul.className = 'tree-list';
    if (!ls) ul.classList.add('no-branches'); // hide branches when only components
    comps.forEach(n => {
      const li = document.createElement('li'); li.className = 'tree-item'; li.dataset.nodeId = n.id; li.tabIndex = 0;
      const t = document.createElement('div'); t.className = 'tree-item-title accent-title comp'; t.textContent = (n.config?.name || n.label || n.kind);
      li.appendChild(t);
      li.addEventListener('click', ()=> actions.selectSingle(n.id));
      li.addEventListener('dblclick', ()=> window.App?.Events?.openNodeModal?.(n.id));
      li.draggable = true;
      li.addEventListener('dragstart', (e)=>{
        e.dataTransfer?.setData('text/node-id', n.id);
        e.dataTransfer?.setData('text/plain', n.id);
        e.dataTransfer.effectAllowed = 'move';
      });
      ul.appendChild(li);
    });
    group.appendChild(ul);
  }
  container.appendChild(group);
}

export function renderStash(){
  const el = document.getElementById('stash-list'); if (!el) return;
  const st = getState();
  el.innerHTML = '';
  // Render per stash group order
  (st.stashGroups || []).forEach(g => {
    const nodes = (g.nodeIds||[]).map(id => (st.nodes||[]).find(n=>n.id===id)).filter(Boolean).filter(n=>n.disabled);
    if (!nodes.length) return;
    const hasLs = nodes.some(n => n.kind==='LightSource');
    const chainId = hasLs ? (nodes.find(n=>n.kind==='LightSource')?.chainId || null) : (nodes[0]?.chainId || null);
    renderStashChain(el, chainId, nodes);
  });

  // reflect current selection
  const sel = new Set(st.selection?.ids || []);
  el.querySelectorAll('.tree-item, .tree-chain-hdr').forEach(node => {
    const id = node.dataset.nodeId;
    if (id && sel.has(id)) node.classList.add('sel'); else node.classList.remove('sel');
  });

  // DnD target: dropping here stashes the node (and whole chain if LS)
  const section = document.getElementById('stash-section') || el;
  if (!section.dataset.boundDrop){
    const onOver = (e)=>{ e.preventDefault(); };
    const onLeave = ()=>{};
    section.addEventListener('dragover', onOver);
    section.addEventListener('dragleave', onLeave);
    section.addEventListener('drop', (e)=>{
      e.preventDefault();
      onLeave();
      const id = e.dataTransfer?.getData('text/node-id');
      if (!id) return;
      const st2 = getState();
      const n = st2.nodes.find(x=>x.id===id); if (!n) return;
      // Remove the node (and its chain, if LS) from any existing stash group to avoid duplicates
      function purge(ids){
        (st2.stashGroups||[]).forEach(g => { g.nodeIds = (g.nodeIds||[]).filter(x => !ids.includes(x)); });
        st2.stashGroups = (st2.stashGroups||[]).filter(g => (g.nodeIds||[]).length > 0);
      }
      if (n.kind === 'LightSource'){
        // new stash group: LS + only currently on-board components (not already stashed)
        const chainOnBoard = st2.nodes.filter(m=>m.chainId===n.chainId && m.kind!=='LightSource' && !m.disabled);
        const ids = [n.id].concat(chainOnBoard.map(m=>m.id));
        purge(ids);
        actions.addStashGroup(ids);
        actions.setNodeDisabled(n.id, true);
        // disable only the components that were on-board for this drop
        chainOnBoard.forEach(m => actions.setNodeDisabled(m.id, true));
      } else {
        // new stash group: just this component
        purge([n.id]);
        actions.addStashGroup([n.id]);
        actions.setNodeDisabled(n.id, true);
      }
    }, { passive: false });
    section.dataset.boundDrop = '1';
  }
}

export function bindStash(){ renderStash(); }
