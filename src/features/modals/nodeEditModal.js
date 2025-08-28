import { actions, getState } from '../../state/store.js';

// Derived helpers since catalog.js only exports loadCatalog/setCatalog
function getSystemsList(tables){
  return Object.keys(tables).map(key => ({ key, label: tables[key]?.label || key }));
}
function getFactorsFor(tables, kind){
  const spec = tables[kind]?.modifiers || [];
  return spec.map(m => ({
    key: m.key,
    label: m.label ?? m.key,
    input: m.input ?? 'text',
    min: m.min,
    max: m.max,
    step: m.step,
    options: m.options || []
  }));
}
function getOptionsFor(tables, kind, key){
  const mods = tables[kind]?.modifiers || [];
  const m = mods.find(x => x.key === key);
  return m?.options || [];
}
import { loadCatalog } from '../../core/catalog/catalog.js';

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
    let name = (document.getElementById('nm-name')?.value || '').trim();
    const notes = document.getElementById('nm-notes').value||'';

    // If name left blank, auto-generate: "<Kind Label> <#>"
    if (!name){
      const stNow = getState();
      const node = stNow.nodes.find(n=>n.id===id);
      const chainId = node?.chainId;
      const base = (tables[kind]?.label || kind);
      const count = (stNow.nodes||[]).filter(n => n.id!==id && n.chainId===chainId && n.kind===kind && !n.disabled).length;
      name = `${base} ${count + 1}`;
    }

    actions.updateNode(id,{ kind, label: name, config: { ...cfg, name, notes } });
    close();
  });
  document.getElementById('btn-nm-close')?.addEventListener('click', ()=> close());
  function open(nodeId){
    const tables=loadCatalog();
    const st=getState(); const n=st.nodes.find(x=>x.id===nodeId); if(!n) return;
    modal.dataset.nodeId=nodeId;
    modal.classList.add('show'); center(modal);
    kindSel.innerHTML=''; getSystemsList(tables).forEach(k=>{ const o=document.createElement('option'); o.value=k.key; o.textContent=k.label; kindSel.appendChild(o); });
    kindSel.value=n.kind;
    const nmName = document.getElementById('nm-name'); if(nmName) nmName.value = n.config?.name || '';
    document.getElementById('nm-notes').value = n.config?.notes || '';
    buildDynamic(document.getElementById('nm-dynamic'), tables, n.kind, n.config);
    kindSel.onchange = ()=> buildDynamic(document.getElementById('nm-dynamic'), tables, kindSel.value, {});
  }
  function close(){ modal.classList.remove('show'); }
  window.App = window.App || {}; window.App.Events = Object.assign({}, window.App.Events, { openNodeModal: open, closeNodeModal: close });
}
