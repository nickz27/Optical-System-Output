import { actions, getState } from '../../state/store.js';
import { loadCatalog } from '../../core/catalog/catalog.js';

function open(){
  const st = getState();
  const modal = document.getElementById('add-comp-modal');
  if(!modal) return;

  const selChain = document.getElementById('ac-chain');
  const selKind  = document.getElementById('ac-kind');
  const inpLabel = document.getElementById('ac-label');

  // chains
  selChain.innerHTML = '';
  st.chains.forEach(c=>{
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.label || 'Light Source';
    selChain.appendChild(opt);
  });

  // kinds from catalog
  selKind.innerHTML = '';
  const tables = loadCatalog();
  Object.keys(tables.opticalSystems || {}).forEach(k=>{
    if (k === 'LightSource') return;
    const opt = document.createElement('option');
    opt.value = k;
    opt.textContent = tables.opticalSystems[k]?.label || k;
    selKind.appendChild(opt);
  });

  inpLabel.value = '';

  modal.classList.add('show');
}

function close(){
  const modal = document.getElementById('add-comp-modal');
  modal?.classList.remove('show');
}

export function bindAddComponentModal(){
  document.getElementById('btn-add-component')?.addEventListener('click', open);
  document.getElementById('btn-ac-cancel')?.addEventListener('click', close);
  document.getElementById('btn-ac-ok')?.addEventListener('click', ()=>{
    const chainId = document.getElementById('ac-chain').value;
    const kind    = document.getElementById('ac-kind').value;
    const label   = document.getElementById('ac-label').value.trim();
    const pos     = window.App.UI.autoPlace(chainId);
    actions.addNode({ chainId, kind, label, x: pos.x, y: pos.y });
    close();
  });

  // draggable header
  const modal = document.getElementById('add-comp-modal');
  const header = document.getElementById('ac-drag');
  if (modal && header) {
    let drag=null;
    header.addEventListener('mousedown', (e)=>{
      drag={ sx:e.clientX, sy:e.clientY, left:modal.offsetLeft, top:modal.offsetTop };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp, {once:true});
    });
    function onMove(e){
      if(!drag) return;
      modal.style.left = (drag.left + (e.clientX - drag.sx)) + 'px';
      modal.style.top  = (drag.top  + (e.clientY - drag.sy)) + 'px';
      modal.style.transform = 'translate(0,0)';
    }
    function onUp(){ document.removeEventListener('mousemove', onMove); drag=null; }
  }
}
