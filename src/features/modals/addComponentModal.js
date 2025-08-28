import { actions, getState } from '../../state/store.js';
import { loadCatalog } from '../../core/catalog/catalog.js';
import { renderNodes } from '../nodes/render.js';

function el(id) { return document.getElementById(id); }

/* Build dynamic modifier inputs for the chosen kind */
function buildDynamic(kind) {
  const wrap = el('ac-dynamic');
  if (!wrap) return;
  wrap.innerHTML = '';

  const cat = loadCatalog();
  const def = cat[kind] || {};
  const spec = def.modifiers || [];

  spec.forEach(m => {
    const g = document.createElement('div');
    g.className = 'group';

    const lbl = document.createElement('label');
    lbl.textContent = m.label || m.key;
    g.appendChild(lbl);

    let input;
    if (m.input === 'select') {
      input = document.createElement('select');
      const opts = (m.options && m.options.length)
        ? m.options
        : Object.keys(((def.factors || {})[m.key]) || {});

      opts.forEach(opt => {
        const o = document.createElement('option');
        o.value = String(opt);
        o.textContent = String(opt);
        input.appendChild(o);
      });
    } else {
      input = document.createElement('input');
      input.type = 'number';
      if (m.step) input.step = String(m.step);
      if (typeof m.min !== 'undefined') input.min = String(m.min);
      if (typeof m.max !== 'undefined') input.max = String(m.max);
    }

    input.id = `ac-mod-${m.key}`;
    g.appendChild(input);
    wrap.appendChild(g);
  });
}

/* Populate the kind dropdown from Catalog (skips LightSource) */
function populateKinds() {
  const sel = el('ac-kind');
  if (!sel) return;

  const cat = loadCatalog();
  sel.innerHTML = '';

  Object.keys(cat).forEach(k => {
    if (k === 'LightSource') return;
    const o = document.createElement('option');
    o.value = k;
    o.textContent = cat[k].label || k;
    sel.appendChild(o);
  });

  sel.onchange = () => buildDynamic(sel.value);
  if (sel.value) buildDynamic(sel.value);
}

let currentChainId = null;

/* === Exported: open the Add Component modal === */
export function openAddComponentModal(chainId) {
  currentChainId = chainId || null;

  populateKinds();
  const sel = el('ac-kind');
  if (sel && sel.value) buildDynamic(sel.value);

  const modal = el('add-comp-modal');
  if (!modal) return;
  modal.classList.add('show');
  modal.style.zIndex = 10000;
}

/* Close helper */
function close() {
  const modal = el('add-comp-modal');
  modal && modal.classList.remove('show');
}

/* === Exported: wire modal events (call once at startup) === */
export function bindAddComponentModal() {
  // Close / Cancel
  el('btn-ac-close')?.addEventListener('click', close);

  // Drag the modal by its header
  const hdr = el('ac-drag');
  hdr?.addEventListener('mousedown', (e) => {
    const modal = el('add-comp-modal');
    if (!modal) return;

    const drag = {
      sx: e.clientX,
      sy: e.clientY,
      left: modal.offsetLeft,
      top:  modal.offsetTop
    };

    function onMove(ev) {
      modal.style.left = (drag.left + (ev.clientX - drag.sx)) + 'px';
      modal.style.top  = (drag.top  + (ev.clientY - drag.sy)) + 'px';
      modal.style.transform = 'translate(0,0)';
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });

  // OK = add component to the target chain
  el('btn-ac-ok')?.addEventListener('click', () => {
    const st = getState();

    // Determine which chain to add to:
    // 1) explicit chainId passed to openAddComponentModal
    // 2) selected node's chain
    // 3) first chain
    let chainId = currentChainId;
    if (!chainId && st.selection?.ids?.length) {
      const n = st.nodes.find(x => x.id === st.selection.ids[0]);
      chainId = n?.chainId || null;
    }
    if (!chainId) chainId = st.chains[0]?.id;
    if (!chainId) return;

    const kindSel = el('ac-kind');
    const kind = kindSel?.value;
    if (!kind) return;

    const cat = loadCatalog();
    const def = cat[kind] || {};
    const spec = def.modifiers || [];

    const config = {};
    spec.forEach(m => {
      const input = el(`ac-mod-${m.key}`);
      if (!input) return;
      config[m.key] = (m.input === 'number')
        ? parseFloat(input.value || '0')
        : input.value;
    });

    // Determine name (blank = auto increment by kind)
    const rawName = (el('ac-label')?.value || '').trim();
    let name = rawName;
    if (!name) {
      const stNow = getState();
      const base = (def.label || kind);
      const count = (stNow.nodes || []).filter(n => n.chainId === chainId && n.kind === kind && !n.disabled).length;
      name = `${base} ${count + 1}`;
    }

    const notes = (el('ac-notes')?.value || '').trim();
    if (notes) config.notes = notes;
    config.name = name;

    actions.addNode({
      chainId,
      kind,
      label: name,
      x: 120,
      y: 120,
      config
    });

    try {
      renderNodes();
      window.__gridEnhance?.refresh?.();
    // Ensure DOM reflects grid-based state updates
      requestAnimationFrame(() => { renderNodes(); });
    } catch (e) { /* ignore */ }

    close();
  });
}

/* Optional console helpers for debugging */
window.App = window.App || {};
window.App.Events = {
  ...(window.App.Events || {}),
  openAddComponentModal
};
