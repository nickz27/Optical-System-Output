import { renderTree } from './features/sidebar/tree.js';
import { getState, actions, subscribe } from './state/store.js';
import { renderNodes } from './features/nodes/render.js';
import { renderBoard } from './features/board/board.js';
import './features/groups/gridEnhance.js';
import { bindNodeInteractions } from './features/nodes/interactions.js';
import { bindToolbar } from './features/toolbar/toolbar.js';
import { bindAddComponentModal, openAddComponentModal } from './features/modals/addComponentModal.js';
import { bind as bindLightSourceModal } from './features/modals/lightSourceModal.js';
import { bindNodeModal } from './features/modals/nodeEditModal.js';
import { renderSystemPanel } from './features/sidebar/systemPanel.js';
import { ensureGroupsLayer, renderGroupBoxes } from './features/groups/groups.js';


window.App = window.App || {};
window.App.Store = { getState, actions, subscribe };

function initialSeed() {
  const st = getState();
  if (!st.chains.length) {
    const id = actions.addChain();
    actions.addNode({ chainId:id, kind:'LightSource', label:'Light Source', x:120, y:120 });
  }
}

function renderAll() {
  renderBoard();
  renderNodes();
  const board = document.getElementById('board');
  ensureGroupsLayer(board);
  renderSystemPanel();
  try{ renderTree(getState()); }catch(e){}
  if (window.__gridEnhance) { window.__gridEnhance.refresh(); }
  }


function relayout() {
  const board = document.getElementById('board');
  if (!board) return;
  ensureGroupsLayer(board);
  renderGroupBoxes(getState());
}

function mount(){
  bindToolbar();
  bindNodeInteractions();
  bindAddComponentModal();
  document.getElementById('btn-add-component')?.addEventListener('click', ()=>{
    const st = getState();
    const selId = st.selection?.ids?.[0] || null;
    let chainId = null;
    if (selId){ const n = st.nodes.find(x=>x.id===selId); chainId = n?.chainId || null; }
    if (!chainId) chainId = st.chains?.[0]?.id || null;
    window.App?.Events?.openAddComponentModal?.(chainId);
  });
  bindLightSourceModal();
  bindNodeModal();
  initialSeed();
  renderAll();
  relayout();
  subscribe(renderAll);
  window.addEventListener('resize', relayout);
  const sidebarEl = document.getElementById('sidebar');
  if (sidebarEl && 'ResizeObserver' in window){ new ResizeObserver(()=>relayout()).observe(sidebarEl); }
}
document.addEventListener('DOMContentLoaded', mount);
