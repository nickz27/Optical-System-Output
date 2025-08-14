// src/features/groups/groups.js
const BOX_CLASS = 'group-box';
const DEFAULT_W = 700, DEFAULT_H = 320;

export function ensureGroupsLayer(boardRoot){
  if (!boardRoot) return;
  let layer = document.getElementById('groups-layer');
  if (!layer){
    layer = document.createElement('div');
    layer.id = 'groups-layer';
    layer.style.position = 'absolute';
    layer.style.inset = '0';
    layer.style.zIndex = '1'; // below nodes-layer
    boardRoot.insertBefore(layer, document.getElementById('nodes-layer'));
  }
}

function ensureBoxOnChain(chain, idx){
  if (!chain.box){
    chain.box = { x: 80 + (idx*40), y: 60 + (idx*40), w: DEFAULT_W, h: DEFAULT_H };
  }
}

export function groupIdAtPoint(state, x, y){
  for (const c of state.chains){
    if (!c.box) continue;
    const {x:bx,y:by,w,h} = c.box;
    if (x>=bx && y>=by && x<=bx+w && y<=by+h) return c.id;
  }
  return null;
}

export function renderGroupBoxes(state){
  const layer = document.getElementById('groups-layer');
  if (!layer) return;

  // Ensure default boxes exist
  state.chains.forEach((c,i)=> ensureBoxOnChain(c,i));

  layer.innerHTML = '';
  state.chains.forEach((c)=>{
    // Render only if the group still has an LS node (prevents lingering summaries)
    const hasLS = state.nodes.some(n => n.chainId===c.id && n.kind==='LightSource' && !n.disabled);
    if (!hasLS) return;
    const el = document.createElement('div');
    el.className = BOX_CLASS;
    el.style.position = 'absolute';
    el.style.left = c.box.x + 'px';
    el.style.top  = c.box.y + 'px';
    el.style.width  = c.box.w + 'px';
    el.style.height = c.box.h + 'px';
    el.style.border = '2px solid var(--border)';
    el.style.borderRadius = '14px';
    el.style.background = 'rgba(255,255,255,0.03)';
    el.style.backdropFilter = 'blur(1px)';
    el.style.pointerEvents = 'none'; // box itself is not interactive

    // Title
    const title = document.createElement('div');
    title.textContent = c.label || 'Group';
    title.style.position = 'absolute';
    title.style.left = '12px';
    title.style.top = '-22px';
    title.style.fontWeight = '600';
    title.style.opacity = '0.85';
    el.appendChild(title);

    layer.appendChild(el);
  });
}
