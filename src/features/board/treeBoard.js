import { getState, actions } from '../../state/store.js';
import { chainEffRange, nodeEffRange } from '../../core/calc/range.js';

function byOrderOrLabel(a, b){
  const ao = (a.order ?? 0), bo = (b.order ?? 0);
  if (ao !== bo) return ao - bo;
  return (a.label || a.kind || '').localeCompare(b.label || b.kind || '');
}

export function ensureTreeLayer(boardRoot){
  if (!boardRoot) return null;
  let layer = document.getElementById('tree-layer');
  if (!layer){
    layer = document.createElement('div');
    layer.id = 'tree-layer';
    layer.className = 'tree-board-layer';
    boardRoot.appendChild(layer);
  }
  return layer;
}

function renderChainHeader(c, nodes){
  const eff = chainEffRange(nodes, c.id);
  const ls = (nodes||[]).find(n => n.chainId === c.id && n.kind === 'LightSource' && !n.disabled);
  const titleText = ls?.label || 'Light Source';

  const hdr = document.createElement('div');
  hdr.className = 'tree-chain-hdr';
  hdr.tabIndex = 0;

  const title = document.createElement('div');
  title.className = 'tree-chain-title accent-title ls';
  title.textContent = titleText;

  const metrics = document.createElement('div');
  metrics.className = 'metric-line';
  const chain = c;
  const leds = chain.ledCount || 0;
  const lm   = chain.lmPerLed || 0;
  const tot  = leds * lm;
  metrics.innerHTML = `
    <span class="kv"><span class="k">LEDs:</span><span class="v">${leds}</span></span>
    <span class="kv"><span class="k">lm/LED:</span><span class="v">${lm}</span></span>
    <span class="kv"><span class="k">Total lm:</span><span class="v">${tot}</span></span>
    <span class="spacer"></span>
    <span class="eff">Eff: ${(eff.min*100).toFixed(1)}% - ${(eff.max*100).toFixed(1)}%</span>`;

  hdr.appendChild(title);
  hdr.appendChild(metrics);

  // Make header draggable (to allow dragging LS to stash)
  if (ls) {
    hdr.draggable = true;
    hdr.addEventListener('dragstart', (e)=>{
      e.dataTransfer?.setData('text/node-id', ls.id);
      e.dataTransfer?.setData('text/plain', ls.id);
      e.dataTransfer.effectAllowed = 'move';
    });
  }

  // allow dropping components onto header to move to chain
  hdr.dataset.chainId = c.id;
  if (ls) hdr.dataset.nodeId = ls.id;
  hdr.addEventListener('dragover', (e)=>{ e.preventDefault(); hdr.style.background = 'rgba(0,122,204,0.08)'; });
  hdr.addEventListener('dragleave', ()=>{ hdr.style.background = ''; });
  hdr.addEventListener('drop', (e)=>{
    e.preventDefault(); hdr.style.background = '#fafafa';
    const nodeId = e.dataTransfer?.getData('text/node-id');
    if (!nodeId) return;
    actions.moveNodeToChain(nodeId, c.id);
  });

  // Select Light Source on click
  if (ls) {
    hdr.addEventListener('click', () => actions.selectSingle(ls.id));
    hdr.addEventListener('dblclick', (e)=>{ e.stopPropagation(); window.App?.Events?.openLsModal?.(ls.chainId, ls.id); });
  }

  return hdr;
}

function metricLineForComponent(n){
  const wrap = document.createElement('div');
  wrap.className = 'metric-line';
  const cfg = n.config || {};
  const entries = Object.entries(cfg).filter(([k]) => k !== 'notes' && k !== 'name');
  if (!entries.length) {
    wrap.innerHTML = '<span class="kv"><span class="k">Type:</span><span class="v">' + (n.kind || 'Component') + '</span></span>';
  } else {
    wrap.innerHTML = entries.map(([k,v]) => `<span class="kv"><span class="k">${k}:</span><span class="v">${v}</span></span>`).join('');
  }
  // append right-aligned efficiency
  try {
    const eff = nodeEffRange(n);
    const spacer = document.createElement('span'); spacer.className = 'spacer';
    const effEl = document.createElement('span'); effEl.className = 'eff';
    effEl.textContent = `Eff: ${(eff.min*100).toFixed(1)}% - ${(eff.max*100).toFixed(1)}%`;
    wrap.appendChild(spacer); wrap.appendChild(effEl);
  } catch (_) {}
  return wrap;
}

function renderNodeItem(n){
  const li = document.createElement('li');
  li.className = 'tree-item';
  li.tabIndex = 0;
  li.dataset.nodeId = n.id;

  const title = document.createElement('div');
  title.className = 'tree-item-title accent-title comp';
  title.textContent = (n.config?.name || n.label || n.kind);

  const metrics = metricLineForComponent(n);

  li.appendChild(title);
  li.appendChild(metrics);

  // selection on click
  li.addEventListener('click', () => actions.selectSingle(n.id));

  if (n.kind !== 'LightSource'){
    li.draggable = true;
    li.addEventListener('dragstart', (e)=>{
      e.dataTransfer?.setData('text/node-id', n.id);
      e.dataTransfer?.setData('text/plain', n.id);
      e.dataTransfer.effectAllowed = 'move';
    });
  }

  // Double-click opens appropriate modal if available
  li.addEventListener('dblclick', (e)=>{
    e.stopPropagation();
    if (n.kind === 'LightSource') {
      window.App?.Events?.openLsModal?.(n.chainId, n.id);
    } else {
      window.App?.Events?.openNodeModal?.(n.id);
    }
  });

  return li;
}

export function renderTreeBoard(state){
  const st = state || getState();
  const board = document.getElementById('board');
  const layer = ensureTreeLayer(board);
  if (!layer) return;

  layer.innerHTML = '';

  // Render only chains that still have a Light Source present
  (st.chains || []).forEach(c => {
    const hasLs = (st.nodes||[]).some(n => n.chainId===c.id && n.kind==='LightSource' && !n.disabled);
    if (!hasLs) return; // hide chains without a Light Source

    const group = document.createElement('div');
    group.className = 'tree-chain';
    group.dataset.chainId = c.id;

    const hdr = renderChainHeader(c, st.nodes || []);
    group.appendChild(hdr);

    const ul = document.createElement('ul');
    ul.className = 'tree-list';

    // LightSource is represented by the chain header; list contains only components

    // Components
    const comps = (st.nodes||[])
      .filter(n => n.chainId===c.id && n.kind!=='LightSource' && !n.disabled)
      .slice()
      .sort(byOrderOrLabel);
    comps.forEach(n => ul.appendChild(renderNodeItem(n)));
    if (comps.length === 0) { ul.style.display = 'none'; }

    // Allow dropping onto the list area as well
    function indexFromY(ulEl, clientY){
      const items = Array.from(ulEl.querySelectorAll(':scope > .tree-item'));
      if (!items.length) return 0;
      for (let i=0;i<items.length;i++){
        const r = items[i].getBoundingClientRect();
        const mid = r.top + r.height/2;
        if (clientY < mid) return i;
      }
      return items.length;
    }

    function clearDropIndicator(ulEl){
      ulEl.querySelectorAll(':scope > .tree-drop').forEach(el => el.remove());
      delete ulEl.dataset.dropIndex;
    }
    function showDropIndicator(ulEl, index){
      // Remove any existing
      clearDropIndicator(ulEl);
      const items = Array.from(ulEl.querySelectorAll(':scope > .tree-item'));
      const marker = document.createElement('li');
      marker.className = 'tree-drop';
      if (index <= 0 || items.length === 0){
        ulEl.insertBefore(marker, items[0] || null);
      } else if (index >= items.length){
        ulEl.appendChild(marker);
      } else {
        ulEl.insertBefore(marker, items[index]);
      }
    }

    ul.addEventListener('dragover', (e)=>{
      e.preventDefault();
      const idx = indexFromY(ul, e.clientY);
      ul.dataset.dropIndex = String(idx);
      showDropIndicator(ul, idx);
    });
    ul.addEventListener('dragleave', ()=>{ clearDropIndicator(ul); });
    ul.addEventListener('drop', (e)=>{
      e.preventDefault();
      const nodeId = e.dataTransfer?.getData('text/node-id');
      if (!nodeId) return;
      const stNow = getState();
      const n = stNow.nodes.find(x=>x.id===nodeId);
      const idx = parseInt(ul.dataset.dropIndex || '0', 10) || 0;
      if (!n) return;
      if (n.chainId !== c.id){
        actions.moveNodeToChain(nodeId, c.id);
      }
      actions.reorderNodeInChain(nodeId, c.id, idx);
      if (n.disabled) actions.setNodeDisabled(nodeId, false);
      clearDropIndicator(ul);
    });

    // Header can accept drops at index 0 for quick move-to-top
    hdr.addEventListener('dragover', (e)=>{ e.preventDefault(); showDropIndicator(ul, 0); ul.dataset.dropIndex = '0'; });
    hdr.addEventListener('dragleave', ()=>{ clearDropIndicator(ul); });
    hdr.addEventListener('drop', (e)=>{ e.preventDefault(); const nodeId = e.dataTransfer?.getData('text/node-id'); if (!nodeId) return; const stD = getState(); const nd = stD.nodes.find(x=>x.id===nodeId); if (!nd) return; if (nd.chainId !== c.id) actions.moveNodeToChain(nodeId, c.id); actions.reorderNodeInChain(nodeId, c.id, 0); if (nd.disabled) actions.setNodeDisabled(nodeId, false); clearDropIndicator(ul); });

    group.appendChild(ul);
    layer.appendChild(group);
  });

  // selection highlight
  const sel = new Set(st.selection?.ids || []);
  layer.querySelectorAll('.tree-item').forEach(el => {
    const id = el.dataset.nodeId;
    if (id && sel.has(id)) el.classList.add('sel'); else el.classList.remove('sel');
  });
  layer.querySelectorAll('.tree-chain-hdr').forEach(el => {
    const id = el.dataset.nodeId;
    if (id && sel.has(id)) el.classList.add('sel'); else el.classList.remove('sel');
  });
}
