import { actions, getState } from '../../state/store.js';
import { loadCatalog, getSystemsList, getFactorsFor, getOptionsFor } from '../../core/catalog/catalog.js';

function center(modal){
  const r=modal.getBoundingClientRect();
  modal.style.left=Math.max(8,(window.innerWidth-r.width)/2)+'px';
  modal.style.top=Math.max(8,(window.innerHeight-r.height)/2)+'px';
}

function buildDynamic(container, tables, kind, config){
  container.innerHTML='';
  const spec=getFactorsFor(tables, kind);
  spec.forEach(f=>{
    const wrap=document.createElement('div'); wrap.className='group';
    const lab=document.createElement('label'); lab.textContent=f.label; wrap.appendChild(lab);
    let input;
    if(f.input==='number'){
      input=document.createElement('input'); input.type='number'; if(f.min!=null) input.min=String(f.min); if(f.step!=null) input.step=String(f.step);
    }else{
      input=document.createElement('select');
      getOptionsFor(tables, kind, f.key).forEach(opt=>{ const o=document.createElement('option'); o.value=opt; o.textContent=opt; input.appendChild(o); });
    }
    input.id='nm-'+f.key; input.value = config?.[f.key] ?? input.value ?? '';
    wrap.appendChild(input); container.appendChild(wrap);
  });
}

export function bindNodeModal(){
  const modal=document.getElementById('node-modal'); const header=document.getElementById('node-drag');
  if(!modal||!header) return;
  const kindSel=document.getElementById('nm-kind');
  header.addEventListener('pointerdown',(e)=>{
    e.preventDefault(); header.setPointerCapture(e.pointerId);
    const start={x:e.clientX,y:e.clientY,left:parseFloat(getComputedStyle(modal).left)||0,top:parseFloat(getComputedStyle(modal).top)||0};
    const onMove=(ev)=>{ modal.style.left=(start.left+ev.clientX-start.x)+'px'; modal.style.top=(start.top+ev.clientY-start.y)+'px'; };
    const onUp=()=>{ header.releasePointerCapture(e.pointerId); header.removeEventListener('pointermove',onMove); header.removeEventListener('pointerup',onUp); };
    header.addEventListener('pointermove',onMove); header.addEventListener('pointerup',onUp);
  });
  document.getElementById('btn-nm-ok')?.addEventListener('click',()=>{
    const id = modal.dataset.nodeId;
    const tables=loadCatalog();
    const kind = kindSel.value;
    const spec = getFactorsFor(tables, kind);
    const cfg={};
    spec.forEach(f=>{
      const el=document.getElementById('nm-'+f.key);
      cfg[f.key] = (f.input==='number')? Number(el.value||0): el.value;
    });
    const label = document.getElementById('nm-label').value || tables.opticalSystems[kind]?.label || kind;
    const notes = document.getElementById('nm-notes').value||'';
    actions.updateNode(id,{ kind, label, config: { ...cfg, notes } });
    close();
  });
  function open(nodeId){
    const tables=loadCatalog();
    const st=getState(); const n=st.nodes.find(x=>x.id===nodeId); if(!n) return;
    modal.dataset.nodeId=nodeId;
    modal.classList.add('show'); center(modal);
    kindSel.innerHTML=''; getSystemsList(tables).forEach(k=>{ const o=document.createElement('option'); o.value=k.key; o.textContent=k.label; kindSel.appendChild(o); });
    kindSel.value=n.kind;
    document.getElementById('nm-label').value = n.label || '';
    document.getElementById('nm-notes').value = n.config?.notes || '';
    buildDynamic(document.getElementById('nm-dynamic'), tables, n.kind, n.config);
    kindSel.onchange = ()=> buildDynamic(document.getElementById('nm-dynamic'), tables, kindSel.value, {});
  }
  function close(){ modal.classList.remove('show'); }
  window.App = window.App || {}; window.App.Events = Object.assign({}, window.App.Events, { openNodeModal: open, closeNodeModal: close });
}
