import { actions, getState } from '../../state/store.js';
import { renderBoard } from '../board/board.js';

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
  const layer=document.getElementById('nodes-layer');
  layer.addEventListener('click',(e)=>{
    const card=e.target.closest('.node'); if(!card) return;
    const additive = e.ctrlKey || e.metaKey || e.shiftKey;
    actions.select(card.id, additive);
  });
  layer.addEventListener('dblclick',(e)=>{
    const card=e.target.closest('.node'); if(!card) return;
    const n=getState().nodes.find(x=>x.id===card.id);
    if(!n) return;
    if(n.kind==='LightSource') window.App.Events.openLsModal(n.chainId);
    else window.App.Events.openNodeModal(card.id);
  });
  let drag=null;
  layer.addEventListener('mousedown',(e)=>{
    const handle=e.target.closest('[data-drag-handle]'); if(!handle) return;
    const card=e.target.closest('.node'); if(!card) return;
    const st=getState();
    const ids = new Set(st.selection.ids.length?st.selection.ids:[card.id]);
    const base=Array.from(ids).map(id=>{ const n=st.nodes.find(x=>x.id===id); return {id, x:n.x, y:n.y}; });
    drag={ sx:e.clientX, sy:e.clientY, base, ids, firstId: card.id };
    actions.beginBatch('drag');
    e.preventDefault();
  });
  window.addEventListener('mousemove',(e)=>{
    if(!drag) return;
    clearGuides();
    const dx=e.clientX-drag.sx, dy=e.clientY-drag.sy;
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
      const rx = { left:o.x, top:o.y, right:o.x+CARD_W, bottom:o.y+CARD_H, cx:o.x+CARD_W/2, cy:o.y+CARD_H/2 };
      const candidatesX = [rx.left, rx.cx, rx.right];
      const targetsX    = [firstRect.left, firstRect.cx, firstRect.right];
      for(const cx of candidatesX){
        for(const tx of targetsX){
          if(Math.abs(cx - tx) <= ALIGN_THRESH){ snapDx = cx - tx; showV(cx); }
        }
      }
      const candidatesY = [rx.top, rx.cy, rx.bottom];
      const targetsY    = [firstRect.top, firstRect.cy, firstRect.bottom];
      for(const cy of candidatesY){
        for(const ty of targetsY){
          if(Math.abs(cy - ty) <= ALIGN_THRESH){ snapDy = cy - ty; showH(cy); }
        }
      }
    }
    const adx = (nx + snapDx) - firstBase.x;
    const ady = (ny + snapDy) - firstBase.y;
    drag.base.forEach(b=> actions.updateNode(b.id,{x:b.x+adx,y:b.y+ady}) );
    renderBoard();
  });
  window.addEventListener('mouseup',()=>{ if(drag){ actions.endBatch(); drag=null; clearGuides(); }});
}
