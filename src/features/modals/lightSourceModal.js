import { actions, getState } from '../../state/store.js';

function center(modal){
  const r=modal.getBoundingClientRect();
  const x=Math.max(8,(window.innerWidth-r.width)/2);
  const y=Math.max(8,(window.innerHeight-r.height)/2);
  modal.style.left=x+'px'; modal.style.top=y+'px';
}

export function bindLightSourceModal(){
  const modal=document.getElementById('ls-modal'); const header=document.getElementById('ls-drag'); if(!modal||!header) return;
  header.addEventListener('pointerdown',(e)=>{
    e.preventDefault(); header.setPointerCapture(e.pointerId);
    const start={x:e.clientX,y:e.clientY,left:parseFloat(getComputedStyle(modal).left)||0,top:parseFloat(getComputedStyle(modal).top)||0};
    const onMove=(ev)=>{ modal.style.left=(start.left+ev.clientX-start.x)+'px'; modal.style.top=(start.top+ev.clientY-start.y)+'px'; };
    const onUp=()=>{ header.releasePointerCapture(e.pointerId); header.removeEventListener('pointermove',onMove); header.removeEventListener('pointerup',onUp); };
    header.addEventListener('pointermove',onMove); header.addEventListener('pointerup',onUp);
  });
  document.getElementById('btn-ls-ok')?.addEventListener('click',()=>{
    actions.beginBatch('edit-light-source');
    const lm = Number(document.getElementById('ed-led-lm').value)||0;
    const ct = parseInt(document.getElementById('ed-led-count').value,10)||0;
    const st = getState();
    const chainId = st.selection.ids.length? st.nodes.find(n=>n.id===st.selection.ids[0])?.chainId : st.chains[0]?.id;
    if(chainId){
      const label = document.getElementById('ed-chain-label')?.value || (getState().chains.find(c=>c.id===chainId)?.label) || '';
      actions.updateChain(chainId, { label });
      actions.setChainSource(chainId, ct, lm);
    }
    actions.endBatch();
    close();
  });
  function open(chainId){
    modal.classList.add('show');
    const st=getState(); const c=st.chains.find(x=>x.id===chainId) || st.chains[0];
    document.getElementById('ed-led-lm').value=String(c?.lmPerLed||0);
    const chainLabelEl = document.getElementById('ed-chain-label'); if(chainLabelEl) chainLabelEl.value = c?.label || '';
    document.getElementById('ed-led-count').value=String(c?.ledCount||0);
    const recompute=()=>{ const lm=Number(document.getElementById('ed-led-lm').value)||0; const ct=parseInt(document.getElementById('ed-led-count').value,10)||0; document.getElementById('ed-led-total').value=String(lm*ct); };
    ['input','change','keyup'].forEach(evt=>{
      document.getElementById('ed-led-lm').addEventListener(evt,recompute);
      document.getElementById('ed-led-count').addEventListener(evt,recompute);
    });
    recompute(); center(modal);
  }
  function close(){ modal.classList.remove('show'); }
  window.App = window.App || {}; window.App.Events = Object.assign({}, window.App.Events, { openLsModal: open, closeLsModal: close });
}
