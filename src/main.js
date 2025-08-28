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
  // Delete key handling with Light Source prompt
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Delete') return;
    const st = getState();
    const ids = st.selection?.ids || [];
    if (!ids.length) return;
    e.preventDefault();
    actions.beginBatch && actions.beginBatch();
    try {
      ids.forEach(id => {
        const n = st.nodes.find(x => x.id === id);
        if (!n) return;
        if (n.kind === 'LightSource') {
          const comps = st.nodes.filter(m => m.chainId === n.chainId && m.kind !== 'LightSource');
          const keep = window.confirm('Do you want to keep components stashed?');
          if (keep) {
            comps.forEach(m => actions.setNodeDisabled(m.id, true));
          } else {
            comps.forEach(m => actions.removeNode(m.id));
          }
          actions.removeNode(n.id);
        } else {
          actions.removeNode(n.id);
        }
      });
    } finally {
      actions.endBatch && actions.endBatch();
    }
  });
  // No default content; board may start empty
  renderAll();
  relayout();
  subscribe(renderAll);
  window.addEventListener('resize', relayout);
  const sidebarEl = document.getElementById('sidebar');
  if (sidebarEl && 'ResizeObserver' in window){ new ResizeObserver(()=>relayout()).observe(sidebarEl); }
}
document.addEventListener('DOMContentLoaded', mount);
