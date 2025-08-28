import { getState } from '../../state/store.js';
import { systemSummary } from '../../core/calc/range.js';

export function renderSystemPanel(){
  const el = document.getElementById('system-card');
  if (!el) return;
  const st = getState();
  const s = systemSummary(st.nodes, st.chains);
  const effMin = Number.isFinite(s.systemEfficiency.min) ? s.systemEfficiency.min.toFixed(1) : '-';
  const effMax = Number.isFinite(s.systemEfficiency.max) ? s.systemEfficiency.max.toFixed(1) : '-';
  const lmMin  = Number.isFinite(s.totalLumens.min)      ? s.totalLumens.min.toFixed(1)      : '-';
  const lmMax  = Number.isFinite(s.totalLumens.max)      ? s.totalLumens.max.toFixed(1)      : '-';
  el.innerHTML = `
    <h4>Total System</h4>
    <div class="row"><span>Efficiency</span><span>${effMin}% – ${effMax}%</span></div>
    <div class="row"><span>Total lm</span><span>${lmMin} – ${lmMax}</span></div>
  `;
}
