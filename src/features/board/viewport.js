import { actions, getState } from '../../state/store.js';
export function bindViewport(){
  const vpEl = document.getElementById('viewport');
  let pan=null;
  vpEl.addEventListener('wheel', (e)=>{
    e.preventDefault();
    const st=getState(); const k=st.viewport.k; const delta = e.deltaY<0 ? 1.1 : 0.9;
    const nk=Math.min(3,Math.max(.3,k*delta));
    actions.setViewport({k:nk});
    vpEl.style.transform = `translate(${st.viewport.x}px, ${st.viewport.y}px) scale(${nk})`;
  }, {passive:false});
  vpEl.addEventListener('mousedown', (e)=>{
    if(e.buttons!==1 || (!e.altKey and e.button!==1 and !e.shiftKey)) return;
  });
  // simpler: hold Alt to pan
  vpEl.addEventListener('mousedown', (e)=>{
    if(!(e.altKey || e.button===1)) return;
    const st=getState(); 
    const start={sx:e.clientX, sy:e.clientY, x:st.viewport.x, y:st.viewport.y};
    const onMove=(ev)=>{ actions.setViewport({x: start.x + (ev.clientX-start.sx), y: start.y + (ev.clientY-start.sy)});
      vpEl.style.transform = `translate(${getState().viewport.x}px, ${getState().viewport.y}px) scale(${getState().viewport.k})`; };
    const onUp=()=>{ window.removeEventListener('mousemove',onMove); window.removeEventListener('mouseup',onUp); };
    window.addEventListener('mousemove',onMove); window.addEventListener('mouseup',onUp);
  });
}
export function fitView(){
  const st=getState();
  const vpEl=document.getElementById('viewport');
  if(!st.nodes.length){ actions.setViewport({x:0,y:0,k:1}); vpEl.style.transform='translate(0px,0px) scale(1)'; return; }
  const pad=100;
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  st.nodes.forEach(n=>{ minX=Math.min(minX,n.x); minY=Math.min(minY,n.y); maxX=Math.max(maxX,n.x+260); maxY=Math.max(maxY,n.y+100); });
  const root=document.getElementById('board').getBoundingClientRect();
  const w=maxX-minX+pad*2, h=maxY-minY+pad*2;
  const k=Math.min((root.width)/w,(root.height)/h);
  const x = -minX* k + pad;
  const y = -minY* k + pad;
  actions.setViewport({x,y,k});
  vpEl.style.transform = `translate(${x}px, ${y}px) scale(${k})`;
}
