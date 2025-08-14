import { subscribe, actions, getState } from './state/store.js';
import { renderAll } from './ui.js';
import { bindNodeInteractions } from './features/nodes/interactions.js';
import { bindLasso } from './features/nodes/lasso.js';
import { bindViewport, fitView } from './features/board/viewport.js';
import { bindLightSourceModal } from './features/modals/lightSourceModal.js';
import { bindNodeModal } from './features/modals/nodeEditModal.js';
import { bindToolbar } from './features/toolbar/toolbar.js';
import { bindAddPanel } from './features/sidebar/sidebar.js';

export function mount(){
  const st=getState();
  if(!st.chains.length){
    const cid = actions.addChain();
    actions.addNode({ chainId: cid, kind:'LightSource', label:'Light Source', x:120, y:120 });
  }
  bindToolbar();
  bindAddPanel();
  bindNodeInteractions();
  bindLasso();
  bindViewport();
  bindLightSourceModal();
  bindNodeModal();
  subscribe(renderAll);
  renderAll();
  window.App = window.App || {};
  window.App.View = { fit: fitView };
}
