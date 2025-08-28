import { getState, actions, subscribe } from '../../state/store.js';
import { loadCatalog } from '../../core/catalog/catalog.js';
import lampFunctions from '../../core/catalog/defaults/lampFunctions.js';
import { chainFinalLumensRange } from '../../core/calc/chainRange.js';

function getLampFunctions(){
  try {
    const tables = loadCatalog() || {};
    if (Array.isArray(tables.lampFunctions) && tables.lampFunctions.length) return tables.lampFunctions;
  } catch (_) {}
  return Array.isArray(lampFunctions) ? lampFunctions : [];
}

function renderFinalChip(){
  const st = getState();
  const chip = document.getElementById('final-range');
  if (!chip) return;
  const tables = loadCatalog() || {};
  const activeChain = st.selection.ids.length ? st.nodes.find(n=>n.id===st.selection.ids[0])?.chainId : st.chains[0]?.id;
  const ch = st.chains.find(c=>c.id===activeChain);
  if (!ch){ chip.textContent = '0–0 lm'; return; }
  const rng = chainFinalLumensRange(st.nodes, ch);
  chip.textContent = `${rng.min.toFixed(1)}–${rng.max.toFixed(1)} lm`;
  chip.classList.remove('range-green','range-yellow','range-red');
  const t = st.ui.targetLumens || 0;
  if (rng.max < t) chip.classList.add('range-red');
  else if (rng.min > t) chip.classList.add('range-green');
  else chip.classList.add('range-yellow');
}

export function renderFunctionSettings(){
  const sel = document.getElementById('sel-function');
  const target = document.getElementById('inp-target-lm');
  if (!sel || !target) return;

  const list = getLampFunctions();

  // Populate dropdown every render with current list
  const prev = sel.value;
  sel.innerHTML = '';
  list.forEach(fn => {
    const o = document.createElement('option');
    o.value = fn.id; o.textContent = fn.label || fn.id; sel.appendChild(o);
  });

  // Determine selection
  const st = getState();
  let next = prev && list.some(x=>x.id===prev) ? prev : (st.ui.activeFunction || (list[0]?.id || ''));
  if (!next && list.length) next = list[0].id;
  sel.value = next;

  // Seed target from selected function if not set or zero
  const def = list.find(x=>x.id===next);
  let req = def?.requiredLumens ?? 0;
  if (!st.ui.targetLumens) actions.setUi({ targetLumens: req });
  if (!target.value || Number(target.value)===0) target.value = String(req);
  if (st.ui.activeFunction !== next) actions.setUi({ activeFunction: next });

  // Bind once
  if (!sel.dataset.boundFn){
    sel.addEventListener('change', ()=>{
      const id = sel.value; const d = getLampFunctions().find(x=>x.id===id);
      const r = d?.requiredLumens ?? 0;
      actions.setUi({ activeFunction: id, targetLumens: r });
      const t = document.getElementById('inp-target-lm'); if (t) t.value = String(r);
      renderFinalChip();
    });
    sel.dataset.boundFn = '1';
  }
  if (!target.dataset.boundT){
    target.addEventListener('input', ()=> actions.setUi({ targetLumens: Number(target.value)||0 }));
    target.dataset.boundT = '1';
  }

  renderFinalChip();
}

// Optional helper to wire to store
export function bindFunctionSettings(){
  renderFunctionSettings();
  subscribe(()=> renderFunctionSettings());
}

