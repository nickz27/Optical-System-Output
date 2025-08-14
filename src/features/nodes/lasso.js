import { actions, getState } from '../../state/store.js';

export function bindLasso(){
  const board=document.getElementById('board');
  const layer=document.getElementById('nodes-layer');
  const box=document.createElement('div'); box.id='lasso'; board.appendChild(box);
  let start=null;
  board.addEventListener('mousedown',(e)=>{
    if(e.target.closest('.node')) return;
    start={x:e.clientX,y:e.clientY}; box.style.left=start.x+'px'; box.style.top=start.y+'px'; box.style.width='0px'; box.style.height='0px'; box.style.display='block';
  });
  window.addEventListener('mousemove',(e)=>{
    if(!start) return;
    const x=Math.min(e.clientX,start.x), y=Math.min(e.clientY,start.y);
    const w=Math.abs(e.clientX-start.x), h=Math.abs(e.clientY-start.y);
    box.style.left=x+'px'; box.style.top=y+'px'; box.style.width=w+'px'; box.style.height=h+'px';
    const st=getState(); const ids=[];
    st.nodes.forEach(n=>{
      const r={left:n.x, top:n.y, right:n.x+260, bottom:n.y+100};
      if(r.left>=x && r.top>=y && r.right<=x+w && r.bottom<=y+h) ids.push(n.id);
    });
    actions.setSelection(ids);
  });
  window.addEventListener('mouseup',()=>{ if(start){ start=null; box.style.display='none'; }});
}
