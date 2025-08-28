
// src/state/store.js
const state = {
  chains: [],
  nodes: [],
  selection: { ids: [] },
  viewport: { x: 0, y: 0, k: 1 },
  ui: { targetLumens: 0, activeFunction: '', boardMode: 'tree' }
};

const listeners = new Set();
export function subscribe(fn){
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function emit(){ listeners.forEach(fn => fn()); }
let batching = 0;
function maybeEmit(){ if (batching === 0) emit(); }

function mutate(updater, emitNow = true){
  updater(state);
  if (emitNow) maybeEmit();
  return state;
}

// History (undo/redo) support
const history = { past: [], future: [], pending: null };
function snapshot(){
  return JSON.parse(JSON.stringify({
    chains: state.chains,
    nodes: state.nodes,
    selection: state.selection,
    viewport: state.viewport,
    ui: state.ui
  }));
}
function applySnapshot(s){
  state.chains = JSON.parse(JSON.stringify(s.chains || []));
  state.nodes = JSON.parse(JSON.stringify(s.nodes || []));
  state.selection = JSON.parse(JSON.stringify(s.selection || { ids: [] }));
  state.viewport = JSON.parse(JSON.stringify(s.viewport || { x:0, y:0, k:1 }));
  state.ui = JSON.parse(JSON.stringify(s.ui || state.ui));
}
function recordBeforeChange(){
  if (batching > 0){
    if (!history.pending) history.pending = snapshot();
  } else {
    history.past.push(snapshot());
    history.future = [];
  }
}

export const actions = {
  beginBatch(){ batching++; },
  endBatch(){
    if (batching > 0) batching--;
    if (batching === 0 && history.pending){
      history.past.push(history.pending);
      history.pending = null;
      history.future = [];
    }
    maybeEmit();
  },

  reset(){
    recordBeforeChange();
    const keepUi = JSON.parse(JSON.stringify(state.ui || {}));
    state.chains = [];
    state.nodes = [];
    state.selection = { ids: [] };
    state.viewport = { x:0, y:0, k:1 };
    state.ui = keepUi;
    maybeEmit();
  },

  addChain(){
    recordBeforeChange();
    const id = crypto.randomUUID();
    state.chains.push({ id, label: `Group ${state.chains.length+1}`, ledCount:0, lmPerLed:0 });
    maybeEmit();
    return id;
  },

  updateChain(chainId, patch){
    recordBeforeChange();
    const c = state.chains.find(x=>x.id===chainId);
    if (c) Object.assign(c, patch);
    maybeEmit();
  },

  addNode(node){
    recordBeforeChange();
    const id = node.id || crypto.randomUUID();
    // default order for components within a chain (LightSource not ordered)
    let order = node.order;
    if (order == null && node.kind && node.kind !== 'LightSource' && node.chainId){
      const comps = state.nodes.filter(n => n.chainId === node.chainId && n.kind !== 'LightSource');
      order = comps.length; // append to end by default
    }
    state.nodes.push({ id, config:{}, order, ...node });
    maybeEmit();
    return id;
  },

  updateNode(id, patch){
    recordBeforeChange();
    const n = state.nodes.find(x=>x.id===id);
    if (n) Object.assign(n, patch);
    maybeEmit();
  },

  setNodeDisabled(id, disabled){
    recordBeforeChange();
    const n = state.nodes.find(x=>x.id===id);
    if (n) n.disabled = !!disabled;
    maybeEmit();
  },

  removeNode(id){
    recordBeforeChange();
    const node = state.nodes.find(n => n.id === id);
    state.nodes = state.nodes.filter(n => n.id !== id);
    if (state.selection.ids.includes(id)) state.selection.ids = [];
    if (node && node.kind === 'LightSource') {
      // Remove the chain if its Light Source is gone
      state.chains = state.chains.filter(c => c.id !== node.chainId);
    }
    maybeEmit();
  },

  moveNodeToChain(nodeId, newChainId){
    recordBeforeChange();
    const n = state.nodes.find(x=>x.id===nodeId);
    if (!n) return;
    n.chainId = newChainId;
    // Reset order to end when moving into a different chain (tree can reorder later)
    if (n.kind !== 'LightSource'){
      const comps = state.nodes.filter(m => m.chainId === newChainId && m.kind !== 'LightSource' && m.id !== nodeId);
      n.order = comps.length;
    }

    const SPACING_X = 280, SPACING_Y = 140, START_X = 120, START_Y = 120;
    const siblings = state.nodes
      .filter(m => m.chainId === newChainId && m.id !== nodeId)
      .sort((a,b) => a.x - b.x);
    const last = siblings[siblings.length - 1];
    if (last) {
      n.x = last.x + SPACING_X;
      n.y = last.y;
    } else {
      const row = Math.max(0, state.chains.findIndex(c => c.id === newChainId));
      n.x = START_X;
      n.y = START_Y + row * SPACING_Y;
    }
    maybeEmit();
  },

  // Reorder a component within a chain to a specific index
  reorderNodeInChain(nodeId, chainId, newIndex){
    recordBeforeChange();
    const comps = state.nodes
      .filter(n => n.chainId === chainId && n.kind !== 'LightSource')
      .sort((a,b) => (a.order??0) - (b.order??0));
    const idx = comps.findIndex(n => n.id === nodeId);
    if (idx === -1) return;
    const [moved] = comps.splice(idx, 1);
    const clamped = Math.max(0, Math.min(newIndex, comps.length));
    comps.splice(clamped, 0, moved);
    comps.forEach((n,i) => { const nn = state.nodes.find(x=>x.id===n.id); if (nn) nn.order = i; });
    maybeEmit();
  },

  selectSingle(id){
    recordBeforeChange();
    state.selection = { ids: id ? [id] : [] };
    maybeEmit();
  },

  setUi(patch){
    recordBeforeChange();
    Object.assign(state.ui, patch);
    maybeEmit();
  },

  setViewport(vp){
    Object.assign(state.viewport, vp);
    maybeEmit();
  },

  // History controls
  undo(){
    const prev = history.past.pop();
    if (!prev) return;
    const cur = snapshot();
    history.future.push(cur);
    applySnapshot(prev);
    emit();
  },
  redo(){
    const next = history.future.pop();
    if (!next) return;
    history.past.push(snapshot());
    applySnapshot(next);
    emit();
  },
  clearHistory(){ history.past = []; history.future = []; history.pending = null; },

  // Project import/export
  exportProject(){ return snapshot(); },
  loadProject(obj){
    const s = obj || {};
    history.past = []; history.future = []; history.pending = null;
    applySnapshot({
      chains: s.chains || [],
      nodes: s.nodes || [],
      selection: s.selection || { ids: [] },
      viewport: s.viewport || { x:0, y:0, k:1 },
      ui: s.ui || state.ui
    });
    emit();
  }
};

export function getState(){ return state; }
window.App = window.App || {}; window.App.Store = { getState, actions, subscribe };
