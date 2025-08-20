import { renderNodes } from './render.js';
import { actions, getState } from '../../state/store.js';
import { renderBoard } from '../board/board.js';
import { groupIdAtPoint } from '../groups/groups.js';

function GE(){ return (window.__gridEnhance || {}); }

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

  // 🔒 prevent grid reflows
 const lockId = card.dataset?.id || card.id;
 if (lockId && GE().lockDrag) GE().lockDrag(lockId);

  actions.beginBatch && actions.beginBatch('drag');
});

window.addEventListener('mousemove', (e)=>{
  if(!drag) return;
  const dx = (e.clientX - drag.sx) / drag.k;
  const dy = (e.clientY - drag.sy) / drag.k;
  if(!drag.moved && (Math.abs(dx) > START || Math.abs(dy) > START)) { drag.moved = true; if (typeof e.preventDefault==='function') e.preventDefault(); }
  if(!drag.moved) return;

  clearGuides();

  // snap to grid only (no alignment guides)
  const st = getState();
  const firstBase = drag.base.find(b=>b.id===drag.firstId);
  let nx = firstBase.x + dx;
  let ny = firstBase.y + dy;
  nx = Math.round(nx / GRID) * GRID;
  ny = Math.round(ny / GRID) * GRID;

  const adx = nx - firstBase.x;
  const ady = ny - firstBase.y;

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

    // Use the hit-test to decide destination group (or stash)
    const target = groupIdAtPoint(st, cx, cy);
    if (target) {
      // move selection into the chain and enable
      drag.base.forEach(b=>{
        const n = st.nodes.find(x=>x.id===b.id);
        if(!n || n.kind==='LightSource') return;
        if (n.chainId !== target) actions.moveNodeToChain(n.id, target);
        if (n.disabled) actions.setNodeDisabled(n.id, false);
      });

      // --- SNAP TO GRID CELL + SWAP (for the primary dragged card) ---
      try {
        const boardEl = document.getElementById('board');
        const boxEl =
          document.getElementById('group-' + target) ||
          document.querySelector(`.group-box[data-group-id="${target}"]`);
        if (boardEl && boxEl) {
          const br = boardEl.getBoundingClientRect();
          const gr = boxEl.getBoundingClientRect();

          // nodes that belong to this chain and are visible (not disabled)
          const nodesIn = getState().nodes.filter(n => n.chainId === target && !n.disabled);

          const ncount = nodesIn.length;
          const cols = Math.ceil(Math.sqrt(Math.max(1, ncount)));
          const rows = Math.ceil(ncount / cols);
          const cw = gr.width / cols, ch = gr.height / rows;

          // figure out which cell the primary drop center is in
          const dropClientX = cx + br.left;
          const dropClientY = cy + br.top;
          let col = Math.floor((dropClientX - gr.left) / cw);
          let row = Math.floor((dropClientY - gr.top)  / ch);
          col = Math.max(0, Math.min(cols - 1, col));
          row = Math.max(0, Math.min(rows - 1, row));

          const idx = row * cols + col;


          // target cell center (client coords)
          const ccx = gr.left + col * cw + cw / 2;
          const ccy = gr.top  + row * ch + ch / 2;

          const movedId = drag.firstId;

          // find current occupant of that cell (if any)
          function centerOf(n){
            const el = document.getElementById(n.id);
            const r = el?.getBoundingClientRect();
            return r ? { x: r.left + r.width/2, y: r.top + r.height/2 } : null;
          }
          let occupant = null, occDist = Infinity;
          for (const n of nodesIn){
            const c = centerOf(n); if (!c) continue;
            const cCol = Math.floor((c.x - gr.left) / cw);
            const cRow = Math.floor((c.y - gr.top ) / ch);
            if (cCol === col && cRow === row) {
              const d = Math.hypot(c.x - ccx, c.y - ccy);
              if (d < occDist) { occDist = d; occupant = n; }
            }
          }

          // compute final board-space x/y for moved card at cell center
          const newX = Math.round((ccx - br.left) - (CARD_W / 2));
          const newY = Math.round((ccy - br.top ) - (CARD_H / 2));
          actions.updateNode(movedId, { x: newX, y: newY });

          // if occupied, swap the occupant to the original pre-snap position
          if (occupant && occupant.id !== movedId) {
            const oldCx = nx + CARD_W/2 + br.left;
            const oldCy = ny + CARD_H/2 + br.top;
            const swapX = Math.round((oldCx - br.left) - (CARD_W / 2));
            const swapY = Math.round((oldCy - br.top ) - (CARD_H / 2));
            actions.updateNode(occupant.id, { x: swapX, y: swapY });
          }

          if (GE().moveNodeToCell) {
            GE().moveNodeToCell(target, movedId, idx);
          }          
        }
      } catch (err) {
        // non-fatal; keep going
        console.warn('snap/swap failed', err);
      }
      // --- end SNAP TO GRID CELL + SWAP ---

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

  // repaint once
  renderNodes();

  // 🔓 allow grid to reflow once after drop
  if (GE().unlockDrag) GE().unlockDrag();
  if (GE().refresh) GE().refresh();

  drag = null;
  clearGuides();
});
}
