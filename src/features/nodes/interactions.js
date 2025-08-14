// src/features/nodes/interactions.js
import { actions, getState } from '../../state/store.js';
import { renderBoard } from '../board/board.js';
import { groupIdAtPoint } from '../groups/groups.js';

const GRID = 16;
const ALIGN_THRESH = 6;
const CARD_W = 260, CARD_H = 100;

function clearGuides(){
  const g = document.getElementById('guides');
  if(g) g.innerHTML = '';
}
function showV(x){
  const g=document.getElementById('guides'); if(!g) return;
  const d=document.createElement('div'); d.className='guide-v'; d.style.left = x+'px'; g.appendChild(d);
}
function showH(y){
  const g=document.getElementById('guides'); if(!g) return;
  const d=document.createElement('div'); d.className='guide-h'; d.style.top = y+'px'; g.appendChild(d);
}

export function bindNodeInteractions(){
  const layer = document.getElementById('nodes-layer');
  if(!layer) return;

  // Single click => single selection
  layer.addEventListener('click',(e)=>{
    const card = e.target.closest('.node');
    const act = window.App?.Store?.actions;
    if(!act?.selectSingle) return;
    act.selectSingle(card ? card.id : null);
  });

  // Double click -> open respective modal
  layer.addEventListener('dblclick',(e)=>{
    const card = e.target.closest('.node'); if(!card) return;
    const st = getState();
    const n = st.nodes.find(x=>x.id===card.id); if(!n) return;
    if(n.kind === 'LightSource'){
      window.App?.Events?.openLsModal && window.App.Events.openLsModal(n.chainId);
    } else {
      window.App?.Events?.openNodeModal && window.App.Events.openNodeModal(card.id);
    }
  });

  // Drag cards by header (with snap + alignment guides)
  let drag=null;
  const START_TOL = 3;

  layer.addEventListener('mousedown',(e)=>{
    const handle=e.target.closest('[data-drag-handle]'); if(!handle) return;
    const card=e.target.closest('.node'); if(!card) return;
    const st=getState();
    const ids = new Set(st.selection.ids.length?st.selection.ids:[card.id]);
    const base=Array.from(ids).map(id=>{ const n=st.nodes.find(x=>x.id===id); return {id, x:n.x, y:n.y}; });
    const k = st.viewport?.k || 1;  // respect zoom
    drag={ sx:e.clientX, sy:e.clientY, base, ids, firstId: card.id, moved:false, k };
    actions.beginBatch && actions.beginBatch('drag');
    e.preventDefault();
  });

  window.addEventListener('mousemove',(e)=>{
    if(!drag) return;
    const dx=(e.clientX-drag.sx)/drag.k, dy=(e.clientY-drag.sy)/drag.k;
    if(!drag.moved && (Math.abs(dx)>START_TOL || Math.abs(dy)>START_TOL)) drag.moved = true;
    if(!drag.moved) return;

    clearGuides();
    const st=getState();
    const firstBase = drag.base.find(b=>b.id===drag.firstId);
    let nx = firstBase.x + dx;
    let ny = firstBase.y + dy;
    nx = Math.round(nx/GRID)*GRID;
    ny = Math.round(ny/GRID)*GRID;

    const selfIds = new Set(drag.base.map(b=>b.id));
    const others = st.nodes.filter(n=> !selfIds.has(n.id));
    let snapDx = 0, snapDy = 0;
    const firstRect = { left:nx, top:ny, right:nx+CARD_W, bottom:ny+CARD_H, cx:nx+CARD_W/2, cy:ny+CARD_H/2 };

    for(const o of others){
      const el=document.getElementById(o.id);
      const r=el?.getBoundingClientRect(); if(!r) continue;
      const targetsX = [r.left, r.left+r.width/2, r.right];
      const targetsY = [r.top, r.top+r.height/2, r.bottom];
      const candX = [firstRect.left, firstRect.cx, firstRect.right];
      const candY = [firstRect.top, firstRect.cy, firstRect.bottom];
      for(const cx of candX){ for(const tx of targetsX){ if(Math.abs(cx-tx)<=ALIGN_THRESH){ snapDx=cx-tx; showV(cx); } } }
      for(const cy of candY){ for(const ty of targetsY){ if(Math.abs(cy-ty)<=ALIGN_THRESH){ snapDy=cy-ty; showH(cy); } } }
    }

    const adx = (nx + snapDx) - firstBase.x;
    const ady = (ny + snapDy) - firstBase.y;
    drag.base.forEach(b=> actions.updateNode(b.id,{x:b.x+adx,y:b.y+ady}) );
    renderBoard();
  });

  window.addEventListener('mouseup',()=>{
    if(!drag){ return; }
    // On drop: reassign group by current position (center of first moved node)
    const st = getState();
    const first = drag.base[0] && st.nodes.find(n => n.id === drag.base[0].id);
    if (first){
      const nx = first.x; const ny = first.y; // already updated during move
      const cx = nx + CARD_W/2, cy = ny + CARD_H/2;
      const targetGroup = groupIdAtPoint(st, cx, cy);
      if (targetGroup){
        // move each dragged node to that group (skip light sources)
        drag.base.forEach(b => {
          const n = st.nodes.find(x => x.id === b.id);
          if (!n || n.kind === 'LightSource') return; // one LS per group
          if (n.chainId !== targetGroup) actions.moveNodeToChain(n.id, targetGroup);
          if (n.disabled) actions.setNodeDisabled(n.id, false);
        });
      } else {
        // dropped outside any box → stash components
        drag.base.forEach(b => {
          const n = st.nodes.find(x => x.id === b.id);
          if (!n || n.kind === 'LightSource') return;
          actions.setNodeDisabled(n.id, true);
        });
      }
    }
    actions.endBatch && actions.endBatch();
    drag = null;
    clearGuides();
  });

  // Board hover -> highlight matching tree row
  function setTreeHover(nodeId, on){
    window.App?.Sidebar?.highlight && window.App.Sidebar.highlight(nodeId, on);
  }
  layer.addEventListener('mouseenter', (e)=>{
    const card = e.target.closest('.node'); if(!card) return;
    setTreeHover(card.id, true);
  }, true);
  layer.addEventListener('mouseleave', (e)=>{
    const card = e.target.closest('.node'); if(!card) return;
    setTreeHover(card.id, false);
  }, true);
}
