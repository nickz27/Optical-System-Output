import { getState } from '../../state/store.js';
import { systemSummary } from '../../core/calc/range.js';

export function renderSystemPanel(){
  const el = document.getElementById('system-card');
  if (!el) return;
  const st = getState();
  const s = systemSummary(st.nodes, st.chains);
  // Derive efficiency from totals to avoid any stale/rounding issues
  const totalSrc = (st.chains||[]).reduce((sum,c)=> sum + ((c.ledCount||0)*(c.lmPerLed||0)), 0);
  const effMin = totalSrc>0 && Number.isFinite(s.totalLumens?.min) ? ((s.totalLumens.min / totalSrc) * 100).toFixed(1) : '-';
  const effMax = totalSrc>0 && Number.isFinite(s.totalLumens?.max) ? ((s.totalLumens.max / totalSrc) * 100).toFixed(1) : '-';
  const lmMin  = Number.isFinite(s.totalLumens.min)      ? s.totalLumens.min.toFixed(1)      : '-';
  const lmMax  = Number.isFinite(s.totalLumens.max)      ? s.totalLumens.max.toFixed(1)      : '-';
  el.innerHTML = `
    <div class="sys-metric">
      <div class="sys-label">Efficiency</div>
      <div class="sys-value"><span class="min">${effMin}%</span><span class="sep"> - </span><span class="max">${effMax}%</span></div>
    </div>
    <div class="sys-metric">
      <div class="sys-label">Total lm</div>
      <div class="sys-value"><span class="min">${lmMin}</span><span class="sep"> - </span><span class="max">${lmMax}</span></div>
    </div>
  `;
}
