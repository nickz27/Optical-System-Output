import { getState } from '../../state/store.js';
export function renderFooter(){
  const el=document.getElementById('chain-footer'); if(!el) return;
  const st=getState();
  let chainId = st.selection.ids.length ? st.nodes.find(n=>n.id===st.selection.ids[0])?.chainId : st.chains[0]?.id;
  const labels = st.nodes.filter(n=>n.chainId===chainId && n.kind!=='SystemSummary').sort((a,b)=>a.x-b.x).map(n=>n.label || n.kind);
  el.textContent = labels.join(' → ');
}
