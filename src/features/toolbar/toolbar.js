// Clean, idempotent toolbar binding.
// Targets the styled Add Light Source button (#btn-add-light-source).

import { actions, getState } from '../../state/store.js';
import { renderNodes } from '../nodes/render.js';          // ⬅️ add this

let __toolbarBound = false;

// layout constants to match groups.js and node card size
const LEFT_PAD = 12;
const TOP_PAD = 16;
const HEADER = 36;
const MIN_CELL_W = 600;
const MIN_CELL_H = HEADER + 160;
const CARD_W = 260; // matches interactions.js

function computeGroupRectForIndex(idx, total){
  const boardEl = document.getElementById('board');
  if (!boardEl || total <= 0) return null;

  const usableW = Math.max(1, boardEl.clientWidth - LEFT_PAD);
  const usableH = Math.max(1, boardEl.clientHeight - TOP_PAD - TOP_PAD);

  const cols = Math.ceil(Math.sqrt(Math.max(1, total)));
  const rows = Math.ceil(total / cols);

  const cellW = Math.max(MIN_CELL_W, Math.floor(usableW / Math.max(1, cols)));
  const cellH = Math.max(MIN_CELL_H, Math.floor(usableH / Math.max(1, rows)));

  const col = idx % cols;
  const row = Math.floor(idx / cols);

  const left = LEFT_PAD + col * cellW;
  const top  = TOP_PAD + row * cellH;

  return { left, top, width: cellW, height: cellH, header: HEADER };
}

function onAddLight() {
  try {
    // 1) create chain + light source
    const chainId = actions.addChain();
    let nodeId = actions.addNode({ chainId, kind:'LightSource', label:'Light Source' });

    // Fallback if addNode doesn't return id
    if (!nodeId) {
      const st1 = getState();
      const candidates = st1.nodes.filter(n => n.chainId === chainId && n.kind === 'LightSource');
      nodeId = candidates.length ? candidates[candidates.length - 1].id : null;
    }

    // 2) Position LS at top-center of its group's box
    // Determine the index of this chain among visible chains (those with LS)
    const st = getState();
    const visibleChains = st.chains.filter(c =>
      st.nodes.some(n => n.chainId === c.id && n.kind === 'LightSource' && !n.disabled)
    );
    const idx = visibleChains.findIndex(c => c.id === chainId);
    const rect = computeGroupRectForIndex(idx, visibleChains.length);

    if (nodeId && rect) {
      const x = Math.round(rect.left + (rect.width - CARD_W) / 2);
      const y = Math.round(rect.top + rect.header + 16); // top content area
      actions.updateNode(nodeId, { x, y });
    }

    // 3) ensure the node is rendered, then reflow and repaint once more
    renderNodes();
    window.__gridEnhance?.refresh?.();
    requestAnimationFrame(() => { renderNodes(); });
    
  } catch (e) { /* no-op */ }
}

export function bindToolbar() {
  if (__toolbarBound) return;

  // Use the specified id
  const btn = document.getElementById('btn-add-light-source');

  if (btn && !btn.dataset.boundAddLight) {
    btn.addEventListener('click', onAddLight);
    btn.dataset.boundAddLight = '1';
  }

  __toolbarBound = true;
}
