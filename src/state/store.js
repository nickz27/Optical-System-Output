
// src/state/store.js
const state = {
  chains: [],
  nodes: [],
  selection: { ids: [] },
  viewport: { x: 0, y: 0, k: 1 },
  ui: { targetLumens: 0, activeFunction: '' }
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

export const actions = {
  beginBatch(){ batching++; },
  endBatch(){ if (batching > 0) batching--; maybeEmit(); },

  reset(){
    const keepUi = JSON.parse(JSON.stringify(state.ui || {}));
    state.chains = [];
    state.nodes = [];
    state.selection = { ids: [] };
    state.viewport = { x:0, y:0, k:1 };
    state.ui = keepUi;
  },

  addChain(){
    const id = crypto.randomUUID();
    state.chains.push({ id, label: `Group ${state.chains.length+1}`, ledCount:0, lmPerLed:0 });
    maybeEmit();
    return id;
  },

  updateChain(chainId, patch){
    const c = state.chains.find(x=>x.id===chainId);
    if (c) Object.assign(c, patch);
    maybeEmit();
  },

  addNode(node){
    const id = node.id || crypto.randomUUID();
    state.nodes.push({ id, config:{}, ...node });
    maybeEmit();
    return id;
  },

  updateNode(id, patch){
    const n = state.nodes.find(x=>x.id===id);
    if (n) Object.assign(n, patch);
    maybeEmit();
  },

  setNodeDisabled(id, disabled){
    const n = state.nodes.find(x=>x.id===id);
    if (n) n.disabled = !!disabled;
    maybeEmit();
  },

  removeNode(id){
    state.nodes = state.nodes.filter(n => n.id !== id);
    if (state.selection.ids.includes(id)) state.selection.ids = [];
    maybeEmit();
  },

  moveNodeToChain(nodeId, newChainId){
    const n = state.nodes.find(x=>x.id===nodeId);
    if (!n) return;
    n.chainId = newChainId;

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

  selectSingle(id){
    state.selection = { ids: id ? [id] : [] };
    maybeEmit();
  },

  setUi(patch){
    Object.assign(state.ui, patch);
    maybeEmit();
  },

  setViewport(vp){
    Object.assign(state.viewport, vp);
    maybeEmit();
  }
};

export function getState(){ return state; }
window.App = window.App || {}; window.App.Store = { getState, actions, subscribe };
