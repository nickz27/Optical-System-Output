import { actions } from '../../state/store.js';
import { loadCatalog } from '../../core/catalog/catalog.js';

function h(type, attrs={}, ...children){
  const el = document.createElement(type);
  for(const [k,v] of Object.entries(attrs||{})) {
    if (k === 'class') el.className = v;
    else if (k.startsWith('data-')) el.setAttribute(k, v);
    else if (k === 'draggable') el.draggable = !!v;
    else el.setAttribute(k, v);
  }
  children.forEach(c => el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
  return el;
}

function systemTitle(state){
  // Use the selected Function name if you store it, else fallback
  const fnSel = document.getElementById('sel-function');
  const fnLabel = fnSel?.selectedOptions?.[0]?.textContent?.trim();
  return fnLabel || 'System';
}

function makeItem(nodeOrChain, type, label, lsNodeId){
  const id = type==='source' ? nodeOrChain.chainId : nodeOrChain.id;
  const el = h('div', { class: `tree-item ${type}${nodeOrChain.disabled?' disabled':''}`, 'data-type':type, 'data-id': id });
  el.appendChild(h('span', { class:'label' }, label));
  if (type!=='system'){
    const badgeText = (type==='source' ? 'Source' : 'Component');
    el.appendChild(h('span', { class:'badge' }, badgeText));
  }
  if (type==='source' && lsNodeId) el.setAttribute('data-node', lsNodeId);
  if (type==='component') el.setAttribute('data-node', nodeOrChain.id);
  return el;
}

function buildTree(state){
  const root = document.getElementById('sidebar-tree');
  if(!root) return;
  root.innerHTML = '';

  const systemLi = h('li', {}, makeItem({ label: systemTitle(state) }, 'system', systemTitle(state)));
  const ulSources = h('ul');

  // Stash (disabled) bucket
  const stash = [];

  // Group by chain: first LS, then components
   state.chains.forEach(chain => {
    const ls = state.nodes.find(n => n.chainId===chain.id && n.kind==='LightSource' && !n.disabled);
    const chainLi = h('li');
    if (ls) {
      const sourceLabel = (chain.label && chain.label.trim()) || 'Light Source';
      const item = makeItem(ls, 'source', sourceLabel, ls.id);
      item.setAttribute('data-chain', chain.id);
      chainLi.appendChild(item);

      const compsUl = h('ul');
      state.nodes
        .filter(n => n.chainId===chain.id && n.kind!=='LightSource')
        .forEach(n => {
          if (n.disabled) { stash.push(n); return; }
          const li = h('li');
          // Component label should match the card header: node.label (fallback kind)
          const compLabel = (n.label && n.label.trim()) || n.kind;
          const ti = makeItem(n, 'component', compLabel)
          ti.setAttribute('data-chain', chain.id);
          ti.setAttribute('data-node', n.id);
          ti.setAttribute('draggable', true);
          li.appendChild(ti);
          compsUl.appendChild(li);
        });
      chainLi.appendChild(compsUl);
      ulSources.appendChild(chainLi);
    }
  });

  // Stash section
  const stashSection = h('div', { class:'section' }, h('span', {class:'label'}, 'Stash'));
  const stashUl = h('ul');
  stash.forEach(n => {
    const li = h('li');
    const label = (n.label && n.label.trim()) || n.kind;
    const ti = makeItem(n, 'component', label);
    ti.classList.add('disabled');
    ti.setAttribute('data-node', n.id);
    ti.setAttribute('draggable', true);
    li.appendChild(ti);
    stashUl.appendChild(li);
  });

  const tree = h('div', { class:'tree' }, h('ul', {}, systemLi, ulSources), stashSection, stashUl);
  root.appendChild(tree);

  bindTreeHandlers(root);
}

function findChainId(el){
  return el.getAttribute('data-chain') || el.closest('[data-chain]')?.getAttribute('data-chain');
}

function highlightTreeNode(nodeId, on){
  const sel = `#sidebar-tree .tree-item.component[data-node="${nodeId}"], #sidebar-tree .tree-item.source[data-node="${nodeId}"]`;
  document.querySelectorAll(sel).forEach(el => el.classList.toggle('hover', !!on));
}

function bindTreeHandlers(root){
  // dbl-click: open modals
  root.addEventListener('dblclick', (e)=>{
    const item = e.target.closest('.tree-item'); if(!item) return;
    const type = item.getAttribute('data-type');
    if (type === 'source') {
      const chainId = findChainId(item) || item.getAttribute('data-id');
      window.App?.Events?.openLsModal && window.App.Events.openLsModal(chainId);
    } else if (type === 'component') {
      const nodeId = item.getAttribute('data-node') || item.getAttribute('data-id');
      window.App?.Events?.openNodeModal && window.App.Events.openNodeModal(nodeId);
    }
  root.addEventListener('click', (e)=>{
    const item = e.target.closest('.tree-item'); if(!item) return;
    const nodeId = item.getAttribute('data-node');
    if(!window.App?.Store?.actions?.selectSingle) return;
    window.App.Store.actions.selectSingle(nodeId || null);
    // locally update selected row visual immediately
    document.querySelectorAll('#sidebar-tree .tree-item.sel').forEach(el=>el.classList.remove('sel'));
    if (nodeId) item.classList.add('sel');

  });
+
  // hover over tree item -> highlight both tree row and board card
  root.addEventListener('mouseenter', (e)=>{
    const item = e.target.closest('.tree-item'); if(!item) return;
    const nodeId = item.getAttribute('data-node'); if(!nodeId) return;
    item.classList.add('hover');
    const card = document.getElementById(nodeId);
    card && card.classList.add('hover');
  }, true);
  root.addEventListener('mouseleave', (e)=>{
    const item = e.target.closest('.tree-item'); if(!item) return;
    const nodeId = item.getAttribute('data-node'); if(!nodeId) return;
    item.classList.remove('hover');
    const card = document.getElementById(nodeId);
    card && card.classList.remove('hover');
  }, true);    
  });


  // context menu: remove to stash / restore from stash
  root.addEventListener('contextmenu', (e)=>{
    const item = e.target.closest('.tree-item'); if(!item) return;
    e.preventDefault();
    const type = item.getAttribute('data-type');
    if (type !== 'component') return;
    const id = item.getAttribute('data-node') || item.getAttribute('data-id');
    const disabled = item.classList.contains('disabled');
    actions.setNodeDisabled(id, !disabled);
    // re-render so the item jumps between section & stash immediately
    window.requestAnimationFrame(()=> window.App?.Sidebar?.render && window.App.Sidebar.render());
   });

  // drag & drop: move components between chains (or out of stash)
  let dragId = null;
  root.addEventListener('dragstart', (e)=>{
    const item = e.target.closest('.tree-item.component'); if(!item) return;
     dragId = item.getAttribute('data-node') || item.getAttribute('data-id');
     e.dataTransfer.setData('text/plain', dragId);
     e.dataTransfer.effectAllowed = 'move';
     item.classList.add('dragging');    
  });
  root.addEventListener('dragover', (e)=>{
    const overSource = e.target.closest('.tree-item.source');
    if (!overSource) return;
    e.preventDefault();                 // allow drop
    e.dataTransfer.dropEffect = 'move';
    // highlight ONLY the current target
    document
      .querySelectorAll('#sidebar-tree .tree-item.source.drop-target')
      .forEach(el => { if (el !== overSource) el.classList.remove('drop-target'); });
    overSource.classList.add('drop-target');
  })
  root.addEventListener('dragleave', (e)=>{
     const overSource = e.target.closest('.tree-item.source');
     overSource && overSource.classList.remove('drop-target');
  });
  root.addEventListener('drop', (e)=>{
     const sourceItem = e.target.closest('.tree-item.source');
     if (!sourceItem) return;
     e.preventDefault();
     sourceItem.classList.remove('drop-target');
     const id = dragId || e.dataTransfer.getData('text/plain');
     if(!id) return;
     const chainId = findChainId(sourceItem) || sourceItem.getAttribute('data-id');
     actions.beginBatch && actions.beginBatch('tree-move');
     actions.setNodeDisabled(id, false);
     actions.moveNodeToChain(id, chainId);
     actions.endBatch && actions.endBatch();
     dragId = null
     window.requestAnimationFrame(()=> window.App?.Sidebar?.render && window.App.Sidebar.render());
  });
   root.addEventListener('dragend', ()=>{
     root.querySelector('.dragging')?.classList.remove('dragging');
   });
}

export function renderSidebarTree(){
  const st = window.App.Store.getState();
  buildTree(st);
  // reflect selection in the tree
  const sel = new Set(st.selection?.ids || []);
  document.querySelectorAll('#sidebar-tree .tree-item').forEach(el=>{
    const nodeId = el.getAttribute('data-node');
    el.classList.toggle('sel', nodeId && sel.has(nodeId));
  });
}

export function bindSidebarTree(){
  renderSidebarTree();
  // expose render fn for internal refreshes
  window.App = window.App || {};
  window.App.Sidebar = { render: renderSidebarTree, highlight: highlightTreeNode }
}
