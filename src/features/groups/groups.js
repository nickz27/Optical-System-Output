import { chainEffRange } from '../../core/calc/range.js';
import { getState } from '../../state/store.js';

// Layout constants (must match rendering + hit-testing)
const PAD = 12;
const HEADER = 36;
const VSPACE = 16; // retained for compatibility

/** Ensure a dedicated layer for group boxes exists (drawn behind nodes). */
export function ensureGroupsLayer(boardRoot){
  if (!boardRoot) return;

  // Make sure the board is positioning context
  if (getComputedStyle(boardRoot).position === 'static') {
    boardRoot.style.position = 'relative';
  }

  let layer = document.getElementById('groups-layer');
  if (!layer){
    layer = document.createElement('div');
    layer.id = 'groups-layer';
    layer.style.position = 'absolute';
    layer.style.inset = '0';
    layer.style.zIndex = '1'; // behind nodes-layer
    layer.style.pointerEvents = 'none';

    // Try to place it immediately under the board and before nodes-layer if possible
    const nodesLayer = boardRoot.querySelector('#nodes-layer');
    if (nodesLayer && nodesLayer.parentNode === boardRoot) {
      boardRoot.insertBefore(layer, nodesLayer);
    } else {
      // Fallback: just append to the board
      boardRoot.appendChild(layer);
    }
  } else if (layer.parentNode !== boardRoot) {
    const nodesLayer = boardRoot.querySelector('#nodes-layer');
    if (nodesLayer && nodesLayer.parentNode === boardRoot) {
      boardRoot.insertBefore(layer, nodesLayer);
    } else {
      boardRoot.appendChild(layer);
    }
  }
}

/** Compute near-square grid geometry and usable area. */
function computeLayout(state){
  const boardEl = document.getElementById('board');
  if (!boardEl) return null;

  const LEFT_PAD = 12;
  const TOP_PAD = 16;
  const BOTTOM_PAD = 16;

  // Board already excludes the sidebar; do not subtract it again.
  const usableW = Math.max(1, boardEl.clientWidth - LEFT_PAD);
  const usableH = Math.max(1, boardEl.clientHeight - TOP_PAD - BOTTOM_PAD);

  const chains = state.chains.filter(c =>
    state.nodes.some(n => n.chainId === c.id && n.kind === 'LightSource' && !n.disabled)
  );
  const n = chains.length;
  const cols = Math.ceil(Math.sqrt(Math.max(1, n)));
  const rows = Math.ceil(n / cols);

  const cellW = Math.max(600, Math.floor(usableW / Math.max(1, cols)));
  const cellH = Math.max(HEADER + 160, Math.floor(usableH / Math.max(1, rows)));

  return { boardEl, chains, n, cols, rows, cellW, cellH, LEFT_PAD, TOP_PAD };
}

/** Draw group boxes with header + vertical separators based on item count. */
export function renderGroupBoxes(state){
  const layer = document.getElementById('groups-layer');
  if (!layer) return;
  layer.innerHTML = '';

  const L = computeLayout(state);
  if (!L || !L.boardEl || L.n === 0) return;
  const { chains, cols, cellW, cellH, LEFT_PAD, TOP_PAD } = L;

  // Position each group in the grid (no gaps)
  chains.forEach((c, idx) => {
    const comps = state.nodes.filter(n => n.chainId === c.id && n.kind !== 'LightSource' && !n.disabled);
    const count = 1 + comps.length; // LS + components

    const col = idx % cols;
    const row = Math.floor(idx / cols);

    const left = LEFT_PAD + col * cellW;
    const top = TOP_PAD + row * cellH;
    const width = cellW;
    const height = cellH;

    const box = document.createElement('div');
    box.className = 'group-box';
    box.style.position = 'absolute';
    box.style.left = left + 'px';
    box.style.top = top + 'px';
    box.style.width = width + 'px';
    box.style.height = height + 'px';

    // header
    const header = document.createElement('div');
    header.className = 'header';

    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = c.label || `Group ${idx + 1}`;

    const eff = chainEffRange(state.nodes, c.id);
    const stats = document.createElement('div');
    stats.className = 'stats';
    stats.textContent = `Eff: ${eff.min.toFixed(3)}–${eff.max.toFixed(3)} ×`;

    header.appendChild(title);
    header.appendChild(stats);
    box.appendChild(header);

    // vertical separators: evenly split by item count
    const innerW = width - 2 * PAD;
    for (let i = 1; i < count; i++) {
      const sep = document.createElement('div');
      sep.className = 'group-sep';
      const x = PAD + Math.round(innerW * (i / count));
      sep.style.left = x + 'px';
      box.appendChild(sep);
    }

    layer.appendChild(box);
  });
}

/**
 * Hit-test helper: given a board-space point (cx, cy) return the chainId of the
 * group box containing it, or null if the point is not inside any box.
 * Must use the exact same geometry math as renderGroupBoxes.
 */
export function groupIdAtPoint(state, cx, cy){
  const L = computeLayout(state);
  if (!L || !L.boardEl || L.n === 0) return null;

  const { chains, cols, cellW, cellH, LEFT_PAD, TOP_PAD } = L;

  for (let idx = 0; idx < chains.length; idx++) {
    const col = idx % cols;
    const row = Math.floor(idx / cols);

    const left = LEFT_PAD + col * cellW;
    const top = TOP_PAD + row * cellH;
    const width = cellW;
    const height = cellH;

    const right = left + width;
    const bottom = top + height;

    if (cx >= left && cx <= right && cy >= top && cy <= bottom) {
      return chains[idx].id;
    }
  }
  return null;
}
