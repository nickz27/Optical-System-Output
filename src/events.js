// src/events.js

import { subscribe, actions, getState } from './state/store.js';
import { renderAll } from './ui.js';

import { bindNodeInteractions } from './features/nodes/interactions.js';
import { bindLasso } from './features/nodes/lasso.js';

import { bindViewport } from './features/board/viewport.js';

import { bindLightSourceModal } from './features/modals/lightSourceModal.js';
import { bindNodeModal } from './features/modals/nodeEditModal.js';

import { bindToolbar } from './features/toolbar/toolbar.js';

import { bindSidebarTree, renderSidebarTree } from './features/sidebar/tree.js';
import { bindAddComponentModal } from './features/modals/addComponentModal.js';

let mounted = false; // 🟩 NEW/CHANGED: guard to prevent double-binding

export function mount(){
  if (mounted) return;             // 🟩 NEW/CHANGED
  mounted = true;                  // 🟩 NEW/CHANGED

  const st = getState();

  // 🟩 NEW/CHANGED: ensure we always start with one chain + a Light Source node
  if (!st.chains.length) {
    const cid = actions.addChain();
    actions.addNode({
      chainId: cid,
      kind: 'LightSource',
      label: 'Light Source',
      x: 120,
      y: 120
    });
  }

  // Bind once, in a predictable order
  bindToolbar();                   // 🟩 NEW/CHANGED
  bindNodeInteractions();          // 🟩 NEW/CHANGED
  bindLasso();                     // 🟩 NEW/CHANGED
  bindViewport();                  // 🟩 NEW/CHANGED
  bindLightSourceModal();          // 🟩 NEW/CHANGED
  bindNodeModal();                 // 🟩 NEW/CHANGED
  bindAddComponentModal();         // 🟩 NEW/CHANGED
  bindSidebarTree();               // 🟩 NEW/CHANGED: bind tree once (no duplicates)

  // 🟩 NEW/CHANGED: Delete key → remove selected; if LS, stash its components first
  document.addEventListener('keydown', (e)=>{
    if (e.key !== 'Delete') return;
    const st = getState();
    const ids = st.selection?.ids || [];
    if (!ids.length) return;
    e.preventDefault();

    ids.forEach(id => {
      const n = st.nodes.find(x => x.id === id);
      if (!n) return;

      if (n.kind === 'LightSource') {
        st.nodes
          .filter(m => m.chainId === n.chainId && m.kind !== 'LightSource')
          .forEach(m => actions.setNodeDisabled(m.id, true)); // move to Stash
      }
      actions.removeNode(n.id);
    });
  });

  // 🟩 NEW/CHANGED: single subscription to keep board + tree in sync
  subscribe(() => {
    renderAll();
    renderSidebarTree();
  });

  // Initial render
  renderAll();                     // 🟩 NEW/CHANGED
  renderSidebarTree();             // 🟩 NEW/CHANGED

  // 🟩 NEW/CHANGED: expose a convenient fit-to-view helper
  window.App = window.App || {};
  // Fit button removed
}
