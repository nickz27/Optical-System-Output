import { drawEdges } from './edgesSvg.js';
import { getState } from '../../state/store.js';
export function renderBoard(){
  const st=getState();
  const svg=document.getElementById('edges');
  const root=document.getElementById('board');
  drawEdges(svg, root, st.nodes);
}
