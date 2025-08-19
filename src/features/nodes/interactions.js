import { renderNodes } from './render.js';
import { actions, getState } from '../../state/store.js';
import { renderBoard } from '../board/board.js';
import { groupIdAtPoint } from '../groups/groups.js';

const GRID = 16;
const ALIGN = 6;
const CARD_W = 260;
const CARD_H = 100;

// FIX25 dblclick detection
let __lastClick = { id: null, t: 0, x: 0, y: 0 };
const DBL_MS = 300; // ms
const DBL_PX = 6;  // px


function clearGuides(){
  const g = document.getElementById('guides');
  if (g) g.innerHTML = '';
}
function showV(x){
  const g = document.getElementById('guides'); if(!g) return;
  const d = document.createElement('div'); d.className = 'guide-v'; d.style.left = x + 'px'; g.appendChild(d);
}
function showH(y){
  const g = document.getElementById('guides'); if(!g) return;
  const d = document.createElement('div'); d.className = 'guide-h'; d.style.top = y + 'px'; g.appendChild(d);
}

export function bindNodeInteractions(){
  const layer = document.getElementById('nodes-layer'); if(!layer) return;

  // single-selection: board and tree stay in sync
layer.addEventListener('click', (e) => {
  const card = e.target.closest('.node');
  const cardId = card ? card.id : null;

  // If a drag actually occurred, ignore
  if (typeof drag === 'object' && drag?.moved) {
    __lastClick = { id: null, t: 0, x: 0, y: 0 };
    return;
  }

  // --- detect double-click BEFORE any selection re-render ---
  const now = performance.now();
  const dx = e.clientX - (__lastClick.x || 0);
  const dy = e.clientY - (__lastClick.y || 0);
  const sameCard = __lastClick.id === cardId;
  const quick = (now - (__lastClick.t || 0)) <= DBL_MS;
  const steady = (dx*dx + dy*dy) <= (DBL_PX*DBL_PX);

  if (cardId && sameCard && quick && steady) {
    const st = getState();
    const n = st.nodes.find(x => x.id === cardId);
    if (n) {
      if (n.kind === 'LightSource') {
        window.App?.Events?.openLsModal?.(n.chainId, n.id);
      } else {
        window.App?.Events?.openNodeModal?.(n.id);
      }
    }
    __lastClick = { id: null, t: 0, x: 0, y: 0 };
    return; // don't select; avoid re-render between clicks
  }

  // single-click selection after dbl-check
  actions.selectSingle(cardId || null);
  __lastClick = { id: cardId, t: now, x: e.clientX, y: e.clientY };
}); // dbl-click: open appropriate modal

  // drag by header only
  let drag = null;
  const START = 3;

  layer.addEventListener('mousedown', (e)=>{
    const handle = e.target.closest('[data-drag-handle]'); if(!handle) return;
    const card = e.target.closest('.node'); if(!card) return;

    const st = getState();
    const ids = new Set(st.selection.ids.length ? st.selection.ids : [card.id]);
    const base = Array.from(ids).map(id=>{
      const n = st.nodes.find(x=>x.id===id);
      return { id, x:n.x, y:n.y };
    });
    const k = st.viewport?.k || 1;
    drag = { sx:e.clientX, sy:e.clientY, base, firstId:card.id, moved:false, k };

    actions.beginBatch && actions.beginBatch('drag');
});

  window.addEventListener('mousemove', (e)=>{
    if(!drag) return;
    const dx = (e.clientX - drag.sx) / drag.k;
    const dy = (e.clientY - drag.sy) / drag.k;

    if(!drag.moved && (Math.abs(dx) > START || Math.abs(dy) > START)) { drag.moved = true; if (typeof e.preventDefault==='function') e.preventDefault(); }
    if(!drag.moved) return;

    clearGuides();

    // snap and alignment guides
    const st = getState();
    const firstBase = drag.base.find(b=>b.id===drag.firstId);
    let nx = firstBase.x + dx;
    let ny = firstBase.y + dy;
    nx = Math.round(nx / GRID) * GRID;
    ny = Math.round(ny / GRID) * GRID;

    const self = new Set(drag.base.map(b=>b.id));
    const others = st.nodes.filter(n=>!self.has(n.id));
    let sx = 0, sy = 0;
    const rect = { left:nx, top:ny, right:nx+CARD_W, bottom:ny+CARD_H, cx:nx+CARD_W/2, cy:ny+CARD_H/2 };

    for(const o of others){
      const el = document.getElementById(o.id);
      const r = el?.getBoundingClientRect();
      if(!r) continue;
      const tx = [r.left, r.left + r.width/2, r.right];
      const ty = [r.top,  r.top  + r.height/2, r.bottom];
      const cx = [rect.left, rect.cx, rect.right];
      const cy = [rect.top,  rect.cy, rect.bottom];

      for(const a of cx){ for(const b of tx){ if(Math.abs(a-b)<=ALIGN){ sx = a-b; showV(a); } } }
      for(const a of cy){ for(const b of ty){ if(Math.abs(a-b)<=ALIGN){ sy = a-b; showH(a); } } }
    }

    const adx = (nx + sx) - firstBase.x;
    const ady = (ny + sy) - firstBase.y;

    drag.base.forEach(b => actions.updateNode(b.id, { x:b.x + adx, y:b.y + ady }));
    renderNodes();
});

  window.addEventListener('mouseup', ()=>{
    if(!drag) return;

    const st = getState();
    const first = drag.base[0] && st.nodes.find(n=>n.id===drag.base[0].id);
    if(first){
      const nx = first.x, ny = first.y;
      const cx = nx + CARD_W/2, cy = ny + CARD_H/2;

      // Use the new hit-test to decide the destination group (or stash)
      const target = groupIdAtPoint(st, cx, cy);
      if (target) {
        drag.base.forEach(b=>{
          const n = st.nodes.find(x=>x.id===b.id);
          if(!n || n.kind==='LightSource') return;
          if (n.chainId !== target) actions.moveNodeToChain(n.id, target);
          if (n.disabled) actions.setNodeDisabled(n.id, false);
        });
      } else {
        // Stash: mark components disabled if outside any group box
        drag.base.forEach(b=>{
          const n = st.nodes.find(x=>x.id===b.id);
          if(!n || n.kind==='LightSource') return;
          actions.setNodeDisabled(n.id, true);
        });
      }
    }

    actions.endBatch && actions.endBatch();
    drag = null;
    clearGuides();
  });
}
