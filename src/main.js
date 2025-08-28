// Sidebar: stash instead of tree
import { renderStash, bindStash } from './features/sidebar/stash.js';
import { bindConfirmLsDelete, openConfirmLsDelete } from './features/modals/confirmLsDelete.js';
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
import { renderFunctionSettings } from './features/sidebar/functionSettings.js';
import { ensureGroupsLayer, renderGroupBoxes } from './features/groups/groups.js';


window.App = window.App || {};
window.App.Store = { getState, actions, subscribe };

function renderAll() {
  renderBoard();
  renderNodes();
  const board = document.getElementById('board');
  ensureGroupsLayer(board);
  renderSystemPanel();
  // Ensure Function Settings is rendered/bound
  try { renderFunctionSettings(); } catch (e) {}
  try{ renderStash(); }catch(e){}
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
  bindStash();
  bindConfirmLsDelete();

  // Delete key handling with async LS confirmation (Yes/No/Cancel)
  document.addEventListener('keydown', async (e) => {
    // Esc: close any open modal or clear selection
    if (e.key === 'Escape'){
      const closeIfShown = (id, closer)=>{
        const m = document.getElementById(id);
        if (m && m.classList.contains('show')){ closer?.(); return true; }
        return false;
      };
      if (
        closeIfShown('confirm-ls-del', ()=>{ document.getElementById('btn-cls-cancel')?.click(); }) ||
        closeIfShown('ls-modal', ()=>{ window.App?.Events?.closeLsModal?.(); }) ||
        closeIfShown('add-comp-modal', ()=>{ const el=document.getElementById('add-comp-modal'); el?.classList.remove('show'); }) ||
        closeIfShown('node-modal', ()=>{ window.App?.Events?.closeNodeModal?.(); })
      ){
        e.preventDefault();
        return;
      }
      // no modals open: clear selection
      const st0 = getState();
      if (st0.selection?.ids?.length){ actions.selectSingle(null); e.preventDefault(); }
      return;
    }
    if (e.key !== 'Delete') return;
    const st = getState();
    const ids = st.selection?.ids || [];
    if (!ids.length) return;
    e.preventDefault();

    const id = ids[0];
    const n = st.nodes.find(x=>x.id===id);

    // Components delete immediately; LS asks via modal
    if (!n) return;
    if (n.kind !== 'LightSource') {
      actions.removeNode(n.id);
      return;
    }

    const comps = st.nodes.filter(m => m.chainId === n.chainId && m.kind !== 'LightSource');
    const ans = await openConfirmLsDelete(); // 'yes' | 'no' | 'stash-ls' | 'cancel'
    if (ans === 'cancel') return; // abort
    actions.beginBatch && actions.beginBatch();
    try{
      if (ans === 'yes'){
        comps.forEach(m => actions.setNodeDisabled(m.id, true));
        actions.removeNode(n.id);
      } else if (ans === 'no'){
        comps.forEach(m => actions.removeNode(m.id));
        actions.removeNode(n.id);
      } else if (ans === 'stash-ls'){
        // Stash only the LS; delete components
        actions.setNodeDisabled(n.id, true);
        comps.forEach(m => actions.removeNode(m.id));
      }
    } finally { actions.endBatch && actions.endBatch(); }
  });

  // Clicking empty space on the board clears selection
  const boardRoot = document.getElementById('board');
  if (boardRoot && !boardRoot.dataset.boundClear){
    boardRoot.addEventListener('click', (e)=>{
      const t = e.target;
      if (t.closest('.tree-item') || t.closest('.tree-chain-hdr') || t.closest('.node')) return;
      actions.selectSingle(null);
    });
    boardRoot.dataset.boundClear = '1';
  }
  // No default content; board may start empty
  renderAll();
  relayout();
  subscribe(renderAll);
  window.addEventListener('resize', relayout);
  const sidebarEl = document.getElementById('sidebar');
  if (sidebarEl && 'ResizeObserver' in window){ new ResizeObserver(()=>relayout()).observe(sidebarEl); }
}
document.addEventListener('DOMContentLoaded', mount);
