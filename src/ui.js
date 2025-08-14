import { renderBoard } from './features/board/board.js';
import { renderNodes } from './features/nodes/render.js';
import { renderFooter } from './features/board/footer.js';
import { renderSidebar } from './features/sidebar/sidebar.js';
import { getState } from './state/store.js';

export function renderAll(){
  renderNodes();
  renderBoard();
  renderFooter();
  renderSidebar();
  const st=getState();
  const vp=document.getElementById('viewport');
  vp.style.transform = `translate(${st.viewport.x}px, ${st.viewport.y}px) scale(${st.viewport.k})`;
}
