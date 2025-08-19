import { getState } from '../../state/store.js';

export function renderTree(state){
  try{
    const el = document.getElementById('tree-root') || document.querySelector('[data-tree-root]');
    if(!el) return;
    const st = state || getState();
    el.innerHTML = '';
    const ul = document.createElement('ul');
    (st.chains||[]).forEach(c=>{
      const li = document.createElement('li');
      li.textContent = c.label || ('Group ' + (c.id||''));
      const inner = document.createElement('ul');
      (st.nodes||[]).filter(n=>n.chainId===c.id).forEach(n=>{
        const ni = document.createElement('li');
        ni.textContent = (n.kind || 'Node') + ' — ' + (n.label || n.id);
        inner.appendChild(ni);
      });
      li.appendChild(inner);
      ul.appendChild(li);
    });
    el.appendChild(ul);
  }catch(e){ /* no-op */ }
}
