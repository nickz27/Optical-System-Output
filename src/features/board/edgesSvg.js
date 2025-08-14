// src/features/board/edgesSvg.js
export function drawEdges(svg, root, nodes){
  if (!svg) return;
  // Clear any existing paths and keep <defs> if present
  while (svg.lastChild && svg.lastChild.tagName !== 'defs') svg.removeChild(svg.lastChild);
  // No arrows/edges in group mode
}
