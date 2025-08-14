import { actions, getState } from '../../state/store.js';
import { loadCatalog, getSystemsList, getFactorsFor, getOptionsFor } from '../../core/catalog/catalog.js';
import { chainFinalLumensRange } from '../../core/calc/chainRange.js';

export function renderSidebar(){
  const st=getState(); const tables=loadCatalog();
  const sel=document.getElementById('sel-function');
  if(sel && !sel.dataset.bound){
    sel.dataset.bound='1';
    tables.lampFunctions.forEach(i=>{ const o=document.createElement('option'); o.value=i.id; o.textContent=i.label; sel.appendChild(o); });
    sel.value = st.ui.activeFunction;
    sel.addEventListener('change', ()=> actions.setUi({activeFunction: sel.value}));
  }
  const target=document.getElementById('inp-target-lm');
  if(target && !target.dataset.bound){ target.dataset.bound='1'; target.addEventListener('input', ()=> actions.setUi({targetLumens: Number(target.value)||0})); }
  if(target) target.value = String(st.ui.targetLumens||0);

  const activeChain = st.selection.ids.length ? st.nodes.find(n=>n.id===st.selection.ids[0])?.chainId : st.chains[0]?.id;
  const ch = st.chains.find(c=>c.id===activeChain);
  const chip=document.getElementById('final-range'); if(chip){ 
    if(ch){
      const rng = chainFinalLumensRange(st.nodes, ch, tables);
      chip.textContent = `${rng.min.toFixed(1)}–${rng.max.toFixed(1)} lm`;
      chip.classList.remove('range-green','range-yellow','range-red');
      const t=st.ui.targetLumens||0;
      if(rng.max < t) chip.classList.add('range-red');
      else if(rng.min > t) chip.classList.add('range-green');
      else chip.classList.add('range-yellow');
    } else chip.textContent='—';
  }
}

export function bindAddPanel(){
  const tables=loadCatalog();
  const sel=document.getElementById('sel-kind');
  sel.innerHTML=''; getSystemsList(tables).forEach(k=>{ const o=document.createElement('option'); o.value=k.key; o.textContent=k.label; sel.appendChild(o); });
  const build=()=>{
    const container=document.getElementById('add-dynamic'); container.innerHTML='';
    const spec=getFactorsFor(tables, sel.value);
    spec.forEach(f=>{
      const wrap=document.createElement('div'); wrap.className='group';
      const lab=document.createElement('label'); lab.textContent=f.label; wrap.appendChild(lab);
      let input;
      if(f.input==='number'){ input=document.createElement('input'); input.type='number'; if(f.min!=null) input.min=String(f.min); if(f.step!=null) input.step=String(f.step); }
      else{ input=document.createElement('select'); getOptionsFor(tables, sel.value, f.key).forEach(opt=>{ const o=document.createElement('option'); o.value=opt; o.textContent=opt; input.appendChild(o); }); }
      input.id='inp-'+f.key; wrap.appendChild(input); container.appendChild(wrap);
    });
  };
  sel.onchange = build; build();

  document.getElementById('btn-add').onclick = ()=>{
    const st=getState();
    const chainId = st.selection.ids.length ? st.nodes.find(n=>n.id===st.selection.ids[0])?.chainId : (st.chains[0]?.id || actions.addChain());
    const cfg={}; (getFactorsFor(tables, sel.value)||[]).forEach(f=>{ const el=document.getElementById('inp-'+f.key); cfg[f.key] = (f.input==='number') ? Number(el.value||0) : el.value; });
    const label = document.getElementById('inp-label').value || tables.opticalSystems[sel.value]?.label || sel.value;
    const notes = document.getElementById('inp-notes').value || '';
    const list = st.nodes.filter(n=>n.chainId===chainId && n.kind!=='ChainSummary');
    const pos = list.length ? { x: Math.max(...list.map(n=>n.x)) + 280, y: list[0].y } : { x:120, y:120 + (st.chains.findIndex(c=>c.id===chainId)*140) };
    actions.addNode({ chainId, kind: sel.value, label, config: {...cfg, notes}, x:pos.x, y:pos.y });
  };
}
