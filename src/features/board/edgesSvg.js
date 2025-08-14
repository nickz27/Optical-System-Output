export function sizeSvg(svg, root){
  const r = root.getBoundingClientRect();
  svg.setAttribute('width', String(r.width));
  svg.setAttribute('height', String(r.height));
  svg.setAttribute('viewBox', `0 0 ${r.width} ${r.height}`);
  svg.style.width='100%'; svg.style.height='100%'; svg.setAttribute('preserveAspectRatio','none');
  if(!svg.querySelector('defs')){
    const defs=document.createElementNS('http://www.w3.org/2000/svg','defs');
    const marker=document.createElementNS('http://www.w3.org/2000/svg','marker');
    marker.setAttribute('id','arrow'); marker.setAttribute('viewBox','0 0 10 10'); marker.setAttribute('refX','10'); marker.setAttribute('refY','5'); marker.setAttribute('markerWidth','8'); marker.setAttribute('markerHeight','8'); marker.setAttribute('orient','auto-start-reverse');
    const path=document.createElementNS('http://www.w3.org/2000/svg','path'); path.setAttribute('d','M 0 0 L 10 5 L 0 10 z');
    marker.appendChild(path); defs.appendChild(marker); svg.appendChild(defs);
  }
}
export function drawEdges(svg, root, nodes){
  sizeSvg(svg, root);
  while(svg.lastChild && svg.lastChild.tagName!=='defs') svg.removeChild(svg.lastChild);
  const chains = new Map();
  nodes.forEach(n=>{ if(!chains.has(n.chainId)) chains.set(n.chainId, []); chains.get(n.chainId).push(n); });
  for(const arr of chains.values()){
    const ordered = arr.filter(n=>!['ChainSummary','SystemSummary'].includes(n.kind)).sort((a,b)=>a.x-b.x);
    for(let i=0;i<ordered.length-1;i++){
      const a=ordered[i], b=ordered[i+1];
      const x1=a.x+260,y1=a.y+40, x2=b.x, y2=b.y+40;
      const dx=Math.max(80,(x2-x1)/2);
      const d=`M ${x1} ${y1} C ${x1+dx} ${y1} ${x2-dx} ${y2} ${x2} ${y2}`;
      const p=document.createElementNS('http://www.w3.org/2000/svg','path'); p.setAttribute('class','edge'); p.setAttribute('d',d); p.setAttribute('marker-end','url(#arrow)'); svg.appendChild(p);
    }
  }
}
