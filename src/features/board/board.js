import { getState, actions } from '../../state/store.js';
import { renderGroupBoxes, ensureGroupsLayer } from '../groups/groups.js';
import { ensureTreeLayer, renderTreeBoard } from './treeBoard.js';
import { renderSystemPanel } from '../sidebar/systemPanel.js';
import '../groups/gridEnhance.js';

export function renderBoard(){
  const st = getState();
  const root = document.getElementById('board');
  const mode = st.ui?.boardMode || 'tree';
  renderSystemPanel();
  // Board accepts drops to unstash a Light Source
  if (root && !root.dataset.boundDrop){
    root.addEventListener('dragover', (e)=>{ e.preventDefault(); });
    root.addEventListener('drop', (e)=>{
      e.preventDefault();
      const id = e.dataTransfer?.getData('text/node-id');
      if (!id) return;
      const stNow = getState();
      const n = (stNow.nodes||[]).find(x=>x.id===id);
      if (n && n.kind === 'LightSource'){
        if (n.disabled) actions.setNodeDisabled(n.id, false);
        (stNow.nodes||[]).filter(m=>m.chainId===n.chainId && m.id!==n.id && m.disabled)
          .forEach(m=> actions.setNodeDisabled(m.id, false));
      }
    });
    root.dataset.boundDrop = '1';
  }

  if (mode === 'tree'){
    // Hide node/edge/group layers and render the tree board
    try{
      const nl = document.getElementById('nodes-layer'); if (nl) nl.style.display = 'none';
      const eg = document.getElementById('edges'); if (eg) eg.style.display = 'none';
      const gl = document.getElementById('groups-layer'); if (gl) gl.style.display = 'none';
    }catch(_){ /* no-op */ }

    ensureTreeLayer(root);
    renderTreeBoard(st);
  } else {
    // Original board/cards mode
    try{
      const nl = document.getElementById('nodes-layer'); if (nl) nl.style.display = '';
      const eg = document.getElementById('edges'); if (eg) eg.style.display = '';
    }catch(_){ /* no-op */ }
    ensureGroupsLayer(root);
    if(window.__gridEnhance){ window.__gridEnhance.refresh(); }
    // Group boxes are managed elsewhere (relayout) to avoid double work
  }
}
