import { uid } from '../core/util/id.js';
import { saveState, loadState } from '../core/util/persist.js';

const listeners = [];
const initial = loadState() || {
  nodes: [],
  chains: [],
  selection: { ids: [] },
  viewport: { x:0, y:0, k:1 },
  ui: { activeFunction: 'DRL', targetLumens: 100 }
};

let state = initial;
let history = [];
let future = [];
let batch = { active:false, saved:false, label:null };

function clone(o){ return JSON.parse(JSON.stringify(o)); }
export function subscribe(fn){ listeners.push(fn); return ()=>{ const i=listeners.indexOf(fn); if(i>=0) listeners.splice(i,1); }; }
function emit(){ try{ saveState(state); }catch(e){} listeners.forEach(fn=>fn(state)); }
function pushHistory(prev){ if(batch.active){ if(!batch.saved){ history.push(prev); future=[]; batch.saved=true; } } else { history.push(prev); future=[]; } }
function mutate(mutator, track=true){ const prev = track ? clone(state) : null; state = mutator(clone(state)); if(track && prev) pushHistory(prev); emit(); }

export const actions = {
  beginBatch(label){ batch={active:true,saved:false,label:label||null}; },
  endBatch(){ batch={active:false,saved:false,label:null}; },

  undo(){ if(!history.length) return; const prev=history.pop(); future.push(clone(state)); state=prev; emit(); },
  redo(){ if(!future.length) return; const next=future.pop(); history.push(clone(state)); state=next; emit(); },

  addChain(){
    const id = 'c'+uid();
    mutate(st=>{ st.chains=[...st.chains,{id,label:'Chain '+(st.chains.length+1),ledCount:10,lmPerLed:100}]; return st; }, true);
    return id;
  },
  updateChain(chainId, patch){
    mutate(st=>{ st.chains=st.chains.map(c=>c.id===chainId?{...c, ...patch}:c); return st; }, true);
  },

  setChainSource(chainId, ledCount, lmPerLed){
    mutate(st=>{ st.chains=st.chains.map(c=>c.id===chainId?{...c,ledCount,lmPerLed}:c); return st; }, true);
  },
  addNode({chainId, kind, label, config, x, y}){
    const id=uid('n');
    mutate(st=>{ const node={id,chainId,kind,label:label||kind,config:config||{},x:x||100,y:y||100}; st.nodes=[...st.nodes,node]; st.selection={ids:[id]}; return st; }, true);
    return id;
  },
  updateNode(id, patch){
    mutate(st=>{ st.nodes=st.nodes.map(n=>n.id===id?{...n,...patch,config:{...n.config, ...(patch.config||{})}}:n); return st; }, true);
  },
  removeSelected(){
    mutate(st=>{ const ids=new Set(st.selection.ids); st.nodes=st.nodes.filter(n=>!ids.has(n.id)); st.selection={ids:[]}; return st; }, true);
  },
  select(id, additive=false){
    const ids = new Set(state.selection.ids);
    if(additive){ ids.has(id)?ids.delete(id):ids.add(id);} else { ids.clear(); ids.add(id); }
    state={...state, selection:{ids:[...ids]}}; emit();
  },
  setSelection(ids){ state={...state, selection:{ids:[...ids]}}; emit(); },
  setViewport(vp){ state={...state, viewport:{...state.viewport, ...vp}}; emit(); },
  setUi(p){ state={...state, ui:{...state.ui, ...p}}; emit(); },
  importState(newState){ mutate(_=> clone(newState), true); },
  reset(){ mutate(_=> clone(initial), true); },
  moveNodeToChain(nodeId, newChainId) {
   mutate(st => {
     const n = st.nodes.find(x => x.id === nodeId);
     if (!n) return st;
     n.chainId = newChainId;

     // Compute a safe placement at the end of the target chain.
     // (Don’t rely on window.App.UI here—avoid init order issues.)
     const SPACING_X = 280, SPACING_Y = 140, START_X = 120, START_Y = 120;
     const siblings = st.nodes
       .filter(m => m.chainId === newChainId && m.kind !== 'ChainSummary' && m.id !== nodeId)
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
     return st;
   }, true)
  },
  setNodeDisabled(nodeId, disabled) {
    mutate(st => {
      const n = st.nodes.find(x => x.id === nodeId);
      if (n) n.disabled = !!disabled;
      return st;
    }, true);
  },  
  selectSingle(id){
    mutate(st => { st.selection = { ids: id ? [id] : [] }; return st; }, true);
  },
  removeNode(id){
    mutate(st => {
      st.nodes = st.nodes.filter(n => n.id !== id);
      st.selection.ids = (st.selection.ids||[]).filter(x => x !== id);
      return st;
    }, true);
  },  
};
export function getState(){ return state; }
window.App = window.App || {};
window.App.Store = { getState, actions };