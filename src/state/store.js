// src/state/store.js

// ---------- State ----------
const state = {
  chains: [],                  // groups
  nodes: [],                   // cards (LightSource or components)
  selection: { ids: [] },      // single-select (we just keep 0/1 id here)
  viewport: { x: 0, y: 0, k: 1 },
  ui: { targetLumens: 0, activeFunction: '' }
};

// Ensure each chain has a default group box (for visual grouping)
function hydrateBoxes(st){
  st.chains.forEach((c, i) => {
    if (!c.box) c.box = { x: 80 + (i*40), y: 60 + (i*40), w: 700, h: 320 };
  });
}
hydrateBoxes(state);

// ---------- Event bus ----------
const listeners = new Set();
export function subscribe(fn){
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function emit(){ listeners.forEach(fn => fn()); }

// Simple batching so multiple actions render once
let batching = 0;
function maybeEmit(){ if (batching === 0) emit(); }

// All state updates go through here
function mutate(updater, emitNow = true){
  updater(state);
  if (emitNow) maybeEmit();
  return state;
}

// ---------- Actions ----------
export const actions = {
  beginBatch(label){ batching++; },
  endBatch(){ if (batching > 0) batching--; maybeEmit(); },

  // Groups
  addChain(){
    const id = crypto.randomUUID();
    mutate(st => {
      const idx = st.chains.length;
      st.chains.push({
        id,
        label: `Group ${idx + 1}`,
        ledCount: 0,
        lmPerLed: 0,
        box: { x: 80 + (idx*40), y: 60 + (idx*40), w: 700, h: 320 }
      });
    });
    return id;
  },
  updateChain(chainId, patch){
    mutate(st => {
      const c = st.chains.find(x => x.id === chainId);
      if (c) Object.assign(c, patch);
    });
  },

  // Nodes
  addNode(node){
    mutate(st => {
      const id = node.id || crypto.randomUUID();
      st.nodes.push({ id, config:{}, ...node });
    });
    return state.nodes[state.nodes.length - 1].id;
  },
  updateNode(id, patch){
    mutate(st => {
      const n = st.nodes.find(x => x.id === id);
      if (n) Object.assign(n, patch);
    }, false);
  },
  setNodeDisabled(id, disabled){
    mutate(st => {
      const n = st.nodes.find(x => x.id === id);
      if (n) n.disabled = !!disabled;
    });
  },
  removeNode(id){
    mutate(st => {
      st.nodes = st.nodes.filter(n => n.id !== id);
      if (st.selection.ids.includes(id)) st.selection.ids = [];
    });
  },

  // Move node to another group (safe placement at the end of that group)
  moveNodeToChain(nodeId, newChainId){
    mutate(st => {
      const n = st.nodes.find(x => x.id === nodeId);
      if (!n) return;
      n.chainId = newChainId;

      const SPACING_X = 280, SPACING_Y = 140, START_X = 120, START_Y = 120;
      const siblings = st.nodes
        .filter(m => m.chainId === newChainId && m.id !== nodeId)
        .sort((a,b) => a.x - b.x);
      const last = siblings[siblings.length - 1];

      if (last) {
        n.x = last.x + SPACING_X;
        n.y = last.y;
      } else {
        const row = Math.max(0, st.chains.findIndex(c => c.id === newChainId));
        n.x = START_X;
        n.y = START_Y + row * SPACING_Y;
      }
    });
  },

  // Selection (single-select)
  selectSingle(id){
    mutate(st => { st.selection = { ids: id ? [id] : [] }; });
  },

  // UI
  setUi(patch){
    mutate(st => { Object.assign(st.ui, patch); });
  },

  // Viewport
  setViewport(vp){
    mutate(st => { Object.assign(st.viewport, vp); });
  }
};

// ---------- Accessors ----------
export function getState(){ return state; }

// Expose for convenience in console / other modules without import
window.App = window.App || {};
window.App.Store = { getState, actions, subscribe };
