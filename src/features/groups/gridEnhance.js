//
// Dynamic Group Grid v2 (overlay cells + highlight + snap/swap)
// Non-invasive: does not change groups.js exports or app state.
// Selector fix: GROUP_BOX_SELECTOR = '.group-box'
//
(function(){
  const GROUP_LAYER_SELECTOR = '#groups-layer, .groups-layer';
  const GROUP_BOX_SELECTOR   = '.group-box';  // <-- FIXED selector
  const BOARD_SELECTOR       = '#board';
  const NODE_SELECTOR        = '.node';

  // Map: groupId -> { rows, cols, ids:[nodeId|null,...] }
  const gridState = new Map();

  function bySel(root, sel){ return root ? Array.from(root.querySelectorAll(sel)) : []; }
  function gridDims(n){ const cols=Math.ceil(Math.sqrt(Math.max(1,n))); const rows=Math.ceil(n/cols); return {rows,cols}; }
  function rect(el){ return el.getBoundingClientRect(); }
  function nodeCenter(el){ const r=rect(el); return { x:r.left+r.width/2, y:r.top+r.height/2 }; }
  function idOf(el){ return el?.dataset?.id || el?.id || null; }
  function gidOf(box){
    return box?.dataset?.groupId || (box?.id?.startsWith('group-') ? box.id.slice(6) : null);
  }
  function boardCoords(boardEl, x, y){ const br=rect(boardEl); return { x:x-br.left, y:y-br.top }; }
  function placeAtCenter(boardEl, nodeEl, cx, cy){
    const r = rect(nodeEl);
    const {x,y} = boardCoords(boardEl, cx, cy);
    nodeEl.style.position = 'absolute';
    nodeEl.style.left = `${Math.round(x - r.width/2)}px`;
    nodeEl.style.top  = `${Math.round(y - r.height/2)}px`;
  }

  function ensureOverlay(box, rows, cols){
    let ol = box.querySelector(':scope > .grid-overlay');
    if(!ol){
      ol = document.createElement('div');
      ol.className = 'grid-overlay';
      ol.style.position = 'absolute';
      ol.style.left = '0'; ol.style.top = '0';
      ol.style.right = '0'; ol.style.bottom = '0';
      ol.style.pointerEvents = 'none'; // cells will enable events
      box.appendChild(ol);
    }
    // Build cells
    const need = rows*cols;
    const cells = Array.from(ol.children);
    for(let i=cells.length;i<need;i++){
      const c = document.createElement('div');
      c.className = 'grid-cell';
      c.dataset.idx = i;
      c.style.position = 'absolute';
      c.style.pointerEvents = 'auto';
      ol.appendChild(c);
    }
    // Remove extra
    while(ol.children.length > need){
      ol.removeChild(ol.lastChild);
    }

    // Layout cells
    const r = rect(box);
    const cw = r.width / cols;
    const ch = r.height / rows;
    Array.from(ol.children).forEach((c, i)=>{
      const col = i % cols;
      const row = Math.floor(i / cols);
      c.style.left = `${Math.round(col*cw)}px`;
      c.style.top  = `${Math.round(row*ch)}px`;
      c.style.width  = `${Math.round(cw)}px`;
      c.style.height = `${Math.round(ch)}px`;
      c.classList.remove('over');
    });

    return ol;
  }

  function computeOwnership(groups, nodes){
    const map = new Map();
    for(const g of groups){
      const gr = rect(g.box);
      const inNodes = nodes.filter(n=>{
        const c = nodeCenter(n);
        return c.x>=gr.left && c.x<=gr.right && c.y>=gr.top && c.y<=gr.bottom;
      });
      map.set(g.id, inNodes);
    }
    return map;
  }

  function refresh(){
    const boardEl = document.querySelector(BOARD_SELECTOR);
    if(!boardEl) return;

    // find group layer then boxes
    const layer = document.querySelector(GROUP_LAYER_SELECTOR);
    const boxes = bySel(layer, GROUP_BOX_SELECTOR);
    const groups = boxes.map(b=>({ box:b, id: gidOf(b) })).filter(g=>g.id);

    const allNodes = Array.from(document.querySelectorAll(NODE_SELECTOR));

    const ownership = computeOwnership(groups, allNodes);

    for(const g of groups){
      const nodes = ownership.get(g.id) || [];
      const n = nodes.length;
      if(n===0){ 
        gridState.delete(g.id);
        // still ensure empty overlay to make drop target obvious
        ensureOverlay(g.box, 1, 1);
        continue;
      }

      const {rows, cols} = gridDims(n);
      const total = rows*cols;

      let state = gridState.get(g.id);
      if(!state) state = { rows, cols, ids: new Array(total).fill(null) };

      // expand/shrink preserving placement
      const next = new Array(total).fill(null);
      const ids = nodes.map(idOf).filter(Boolean);

      for(let i=0;i<Math.min(state.ids.length, next.length);i++){
        if(state.ids[i] && ids.includes(state.ids[i])) next[i] = state.ids[i];
      }
      for(const nid of ids){
        if(!next.includes(nid)){
          const spot = next.indexOf(null);
          if(spot>=0) next[spot] = nid;
        }
      }
      state.rows = rows; state.cols = cols; state.ids = next;
      gridState.set(g.id, state);

      const overlay = ensureOverlay(g.box, rows, cols);

      // position nodes to cell centers
      const br = rect(g.box);
      state.ids.forEach((nid, idx)=>{
        if(!nid) return;
        const el = nodes.find(n=>idOf(n)===nid);
        if(!el) return;
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const cw = br.width / cols, ch = br.height / rows;
        const cx = br.left + col*cw + cw/2;
        const cy = br.top  + row*ch + ch/2;
        placeAtCenter(boardEl, el, cx, cy);
      });

      // Wire DnD on cells (highlight + swap)
      Array.from(overlay.children).forEach(cell=>{
        cell.ondragenter = (e)=>{ e.preventDefault(); cell.classList.add('over'); };
        cell.ondragover  = (e)=>{ e.preventDefault(); cell.classList.add('over'); };
        cell.ondragleave = ()=>{ cell.classList.remove('over'); };
        cell.ondrop = (e)=>{
          e.preventDefault();
          cell.classList.remove('over');
          const nid = e.dataTransfer.getData('text/node-id');
          if(!nid) return;
          const idx = Number(cell.dataset.idx);
          const curIdx = state.ids.findIndex(x=>x===nid);
          if(curIdx===-1){
            // insert or swap
            if(state.ids[idx]){
              const tmp = state.ids[idx];
              state.ids[idx] = nid;
              // remove nid from any other group
              for (const [gid, st] of gridState){
                if(gid === g.id) continue;
                const i = st.ids.findIndex(x=>x===nid);
                if(i>=0) st.ids[i] = null;
              }
              // try put tmp to first empty in same group
              const empty = state.ids.indexOf(null);
              if(empty>=0) state.ids[empty] = tmp;
            }else{
              state.ids[idx] = nid;
            }
          }else if(curIdx !== idx){
            const tmp = state.ids[idx];
            state.ids[idx] = state.ids[curIdx];
            state.ids[curIdx] = tmp ?? null;
          }
          refresh(); // reflow after change
        };
      });
    }
  }

  function enableNodeDrag(){
    const boardEl = document.querySelector(BOARD_SELECTOR);
    if(!boardEl) return;
    boardEl.addEventListener('dragstart', (e)=>{
      const nodeEl = e.target.closest(NODE_SELECTOR);
      if(!nodeEl) return;
      nodeEl.setAttribute('draggable', 'true');
      e.dataTransfer.setData('text/node-id', idOf(nodeEl) || '');
      e.dataTransfer.effectAllowed = 'move';
    });
  }

let draggingId = null;
let dragLocked = false;

function lockDrag(id){ draggingId = id || null; dragLocked = true; }
function unlockDrag(){ draggingId = null; dragLocked = false; }

if (dragLocked && draggingId && nid === draggingId) return;
  // public hooks
  window.__gridEnhance = { refresh, lockDrag, unlockDrag };

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', ()=>{ refresh(); enableNodeDrag(); });
  }else{
    refresh(); enableNodeDrag();
  }
})();

