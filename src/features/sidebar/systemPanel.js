
import { getState } from '../../state/store.js';
import { systemSummary } from '../../core/calc/range.js';
export function renderSystemPanel(){
  const el=document.getElementById('system-card'); if(!el) return;
  const st=getState(); const s=systemSummary(st.nodes, st.chains);
  el.innerHTML = `<h4>Total System</h4>
    <div class="row"><span>Efficiency</span><span>${s.systemEfficiency.min.toFixed(3)}–${s.systemEfficiency.max.toFixed(3)} ×</span></div>
    <div class="row"><span>Total lm</span><span>${s.totalLumens.min.toFixed(1)}–${s.totalLumens.max.toFixed(1)}</span></div>`;
}
