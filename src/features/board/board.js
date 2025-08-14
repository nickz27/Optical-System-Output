// src/features/board/board.js
import { getState } from '../../state/store.js';
import { renderGroupBoxes, ensureGroupsLayer } from '../groups/groups.js';
import { drawEdges } from './edgesSvg.js'; // now a no-op

export function renderBoard(){
  const st = getState();
  const root = document.getElementById('board');
  ensureGroupsLayer(root);
  renderGroupBoxes(st);
  // edges are intentionally disabled
  const svg = document.getElementById('edges');
  drawEdges(svg, root, st.nodes);
}
