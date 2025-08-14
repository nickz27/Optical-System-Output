import { subscribe, actions, getState } from './state/store.js';
import { renderAll } from './ui.js';
import { bindNodeInteractions } from './features/nodes/interactions.js';
import { bindLasso } from './features/nodes/lasso.js';
import { bindViewport, fitView } from './features/board/viewport.js';
import { bindLightSourceModal } from './features/modals/lightSourceModal.js';
import { bindNodeModal } from './features/modals/nodeEditModal.js';
import { bindToolbar } from './features/toolbar/toolbar.js';
import { bindSidebarTree, renderSidebarTree } from './features/sidebar/tree.js';
import { bindAddComponentModal } from './features/modals/addComponentModal.js';


export function mount(){
  const st=getState();
  if(!st.chains.length){
    const cid = actions.addChain();
    const userLabel = (document.getElementById('inp-label')?.value || '').trim();
    actions.addNode({ chainId, kind: selectedKind, label: userLabel, x, y });
  }
  bindToolbar();
  bindNodeInteractions();
  bindLasso();
  bindViewport();
  bindLightSourceModal();
  bindNodeModal();
  subscribe(renderAll);
  bindAddComponentModal();
  if (window.App?.Store?.subscribe) {
    window.App.Store.subscribe(()=>{ renderNodes(); renderSidebarTree(); });
  }
  window.App = window.App || {};
  window.App.View = { fit: fitView };
}

  bindSidebarTree();
  // Delete key: delete selected nodes (stash components if LS)
  document.addEventListener('keydown', (e)=>{
    if(e.key !== 'Delete') return;
    const st = window.App.Store.getState();
    const ids = st.selection?.ids || [];
    if(!ids.length) return;
    e.preventDefault();
    ids.forEach(id=>{
      const n = st.nodes.find(x=>x.id===id);
      if(!n) return;
      if(n.kind === 'LightSource'){
        // Stash all components in this chain
        st.nodes.filter(m => m.chainId===n.chainId && m.kind!=='LightSource')
          .forEach(m => window.App.Store.actions.setNodeDisabled(m.id, true));
        // Remove the light source
        window.App.Store.actions.removeNode(n.id);
      }else{
        window.App.Store.actions.removeNode(n.id);
      }
    });
  });