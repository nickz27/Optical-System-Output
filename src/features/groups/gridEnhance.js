//
// Dynamic Group Grid — state-driven placement with stored cell centers
// - Each group keeps rows/cols, ids[], and precomputed cell centers (board coords).
// - On any change, recompute centers and update node (x,y) in app state.
// - During drag: freeze rows/cols/ids, skip updating the dragged node; others still follow grid.
// Requirements:
//   1) Every .node has: id, data-id (same value), data-chain-id
//   2) Group boxes have: id="group-<id>" and data-group-id="<id>"
//   3) CARD_W / CARD_H match your card size (260 x 100)
//
import { actions, getState } from '../../state/store.js';

(function(){
  const GROUP_LAYER_SELECTOR = '#groups-layer, .groups-layer';
  const GROUP_BOX_SELECTOR   = '.group-box';
  const BOARD_SELECTOR       = '#board';
  const NODE_SELECTOR        = '.node';

  const CARD_W = 260;
  const CARD_H = 100;

  // groupId -> { rows, cols, ids:[nodeId|null,...], centers:[{x,y}, ...] }
  const gridState = new Map();

  // Drag-freeze (Option B)
  let dragLocked = false;
  let draggingId = null;
  let frozen = null; // Map<groupId,{rows,cols,ids}>

  // Refresh scheduling / re-entrancy guard
  let _refreshQueued = false;
  let _refreshRunning = false;

  // ---------- helpers ----------
  const bySel = (root, sel) => root ? Array.from(root.querySelectorAll(sel)) : [];
  const rect  = (el) => el.getBoundingClientRect();
  const idOf  = (el) => el?.dataset?.id || el?.id || null;
  const gidOf = (box) => box?.dataset?.groupId || (box?.id?.startsWith('group-') ? box.id.slice(6) : null);

  function gridDims(n){
    const cols = Math.ceil(Math.sqrt(Math.max(1,n)));
    const rows = Math.ceil(n/cols);
    return { rows, cols };
  }

  // ownership by chain id (robust vs geometry)
  function computeOwnership(groups){
    const nodes = Array.from(document.querySelectorAll(NODE_SELECTOR));
    const byChain = new Map();
    for (const el of nodes){
      const cid = el?.dataset?.chainId;
      if(!cid) continue;
      if(!byChain.has(cid)) byChain.set(cid, []);
      byChain.get(cid).push(el);
    }
    const map = new Map();
    for(const g of groups){
      map.set(g.id, byChain.get(String(g.id)) || []);
    }
    return map;
  }

  // compute cell centers in BOARD coordinates
  function computeCenters(boardEl, boxEl, rows, cols){
    const brd = rect(boardEl);
    const box = rect(boxEl);
    const cw = box.width / cols;
    const ch = box.height / rows;
    const centers = [];
    for(let r=0; r<rows; r++){
      for(let c=0; c<cols; c++){
        const cx = (box.left + c*cw + cw/2) - brd.left; // board coords
        const cy = (box.top  + r*ch + ch/2) - brd.top;
        centers.push({ x: Math.round(cx - CARD_W/2), y: Math.round(cy - CARD_H/2) });
      }
    }
    return centers;
  }

  function ensureOverlay(box, rows, cols){
    let ol = box.querySelector(':scope > .grid-overlay');
    if(!ol){
      ol = document.createElement('div');
      ol.className = 'grid-overlay';
      Object.assign(ol.style, { position:'absolute', left:'0', top:'0', right:'0', bottom:'0', pointerEvents:'none' });
      box.appendChild(ol);
    }
    const need = rows*cols;
    while(ol.children.length < need){
      const c = document.createElement('div');
      c.className = 'grid-cell';
      c.dataset.idx = ol.children.length;
      Object.assign(c.style, { position:'absolute', pointerEvents:'auto' });
      ol.appendChild(c);
    }
    while(ol.children.length > need) ol.removeChild(ol.lastChild);

    const r = rect(box);
    const cw = r.width / cols;
    const ch = r.height / rows;
    Array.from(ol.children).forEach((c, i)=>{
      const col = i % cols;
      const row = Math.floor(i / cols);
      c.style.left   = `${Math.round(col*cw)}px`;
      c.style.top    = `${Math.round(row*ch)}px`;
      c.style.width  = `${Math.round(cw)}px`;
      c.style.height = `${Math.round(ch)}px`;
      c.classList.remove('over');

      // bind once
      if (!c.dataset.bound){
        c.ondragenter = (e)=>{ e.preventDefault(); c.classList.add('over'); };
        c.ondragover  = (e)=>{ e.preventDefault(); c.classList.add('over'); };
        c.ondragleave = ()=>{ c.classList.remove('over'); };
        c.ondrop = (e)=>{
          e.preventDefault(); c.classList.remove('over');
          const nid = e.dataTransfer.getData('text/node-id'); if(!nid) return;

          // find group state via the parent overlay's group
          const groupBox = box;
          const gid = gidOf(groupBox);
          const gst = gid ? gridState.get(gid) : null;
          if (!gid || !gst) return;

          const idx = Number(c.dataset.idx);
          const cur = gst.ids.findIndex(x=>x===nid);
          if (cur === -1){
            if (gst.ids[idx]) {
              // swap with occupant
              const tmp = gst.ids[idx];
              gst.ids[idx] = nid;
              // remove nid from any other group
              for (const [otherId, otherSt] of gridState){
                if(otherId === gid) continue;
                const i = otherSt.ids.findIndex(x=>x===nid);
                if(i>=0) otherSt.ids[i] = null;
              }
              // put displaced tmp into first empty
              const empty = gst.ids.indexOf(null);
              if(empty>=0) gst.ids[empty] = tmp;
            } else {
              gst.ids[idx] = nid;
            }
          } else if (cur !== idx) {
            const tmp = gst.ids[idx];
            gst.ids[idx] = gst.ids[cur];
            gst.ids[cur] = tmp ?? null;
          }
          // reflow positions from state after swap
          applyStatePositions(gid);
        };
        c.dataset.bound = '1';
      }
    });
    return ol;
  }

  // ---------- scheduled, re-entrancy-safe refresh ----------
  function refresh(){
    if (_refreshRunning) return;          // don't re-enter
    if (_refreshQueued) return;           // coalesce
    _refreshQueued = true;
    requestAnimationFrame(_doRefresh);
  }

  function _doRefresh(){
    _refreshQueued = false;
    if (_refreshRunning) return;
    _refreshRunning = true;

    const boardEl = document.querySelector(BOARD_SELECTOR);
    if(!boardEl){ _refreshRunning = false; return; }

    const layer  = document.querySelector(GROUP_LAYER_SELECTOR);
    const boxes  = bySel(layer, GROUP_BOX_SELECTOR);
    const groups = boxes.map(b=>({ box:b, id: gidOf(b) })).filter(g=>g.id);

    const ownership = computeOwnership(groups);

    for(const g of groups){
      const nodeEls = ownership.get(g.id) || [];
      const idsNow  = nodeEls.map(idOf).filter(Boolean);
      const n       = idsNow.length;

      if(n === 0){
        gridState.delete(g.id);
        ensureOverlay(g.box, 1, 1);
        continue;
      }

      // (A) determine rows/cols (freeze if dragging)
      const frozenSt = dragLocked ? (frozen && frozen.get(g.id)) : null;
      const dims     = frozenSt ? { rows:frozenSt.rows, cols:frozenSt.cols } : gridDims(n);
      const rows     = dims.rows, cols = dims.cols, total = rows*cols;

      // (B) reconcile ids (freeze exact layout if dragging)
      let st = gridState.get(g.id);
      if(!st) st = { rows, cols, ids: new Array(total).fill(null), centers: new Array(total).fill(null) };

      let nextIds;
      if (dragLocked && frozenSt){
        nextIds = frozenSt.ids.slice(0, total);
        if (nextIds.length < total) nextIds = nextIds.concat(new Array(total - nextIds.length).fill(null));
      } else {
        nextIds = new Array(total).fill(null);
        // keep existing
        for(let i=0; i<Math.min(st.ids.length, nextIds.length); i++){
          if (st.ids[i] && idsNow.includes(st.ids[i])) nextIds[i] = st.ids[i];
        }
        // place new
        for(const nid of idsNow){
          if(!nextIds.includes(nid)){
            const spot = nextIds.indexOf(null);
            if(spot >= 0) nextIds[spot] = nid;
          }
        }
      }

      // (C) recompute centers for this grid
      const centers = computeCenters(boardEl, g.box, rows, cols);

      // (D) commit group grid state
      st.rows = rows; st.cols = cols; st.ids = nextIds; st.centers = centers;
      gridState.set(g.id, st);

      // (E) draw overlay cells
      ensureOverlay(g.box, rows, cols);

      // (F) update node positions in STATE (not DOM) so everything stays consistent
      //     Skip the actively dragged node while locked.
      applyStatePositions(g.id);
    }

    _refreshRunning = false;
  }

  // Write positions to state from stored centers for one group
  function applyStatePositions(groupId){
    const st = gridState.get(groupId);
    if(!st) return;
    const app = getState();

    const updates = [];

    for(let i=0; i<st.ids.length; i++){
      const nid = st.ids[i];
      if(!nid) continue;
      if (dragLocked && draggingId && nid === draggingId) continue; // don't fight dragging
      const center = st.centers[i];
      if(!center) continue;

      // Only update nodes that belong to this chain
      const node = app.nodes.find(n => n.id === nid && String(n.chainId) === String(groupId));
      if(!node) continue;

      // If already at target, skip
      if (node.x === center.x && node.y === center.y) continue;

      updates.push([nid, center.x, center.y]);
    }

    if (updates.length){
      actions.beginBatch && actions.beginBatch('grid-layout');
      for (const [nid, x, y] of updates){
        actions.updateNode(nid, { x, y });
      }
      actions.endBatch && actions.endBatch();
    }
    // Rendering is assumed to be triggered by store subscribers.
    // If your app doesn't auto-render, call renderNodes() after window.__gridEnhance.refresh().
  }
  // Allow external callers to place a node into a specific grid cell.

// Allow external callers to place a node into a specific grid cell.

  // Mirrors the logic used by the drop handler above but without requiring
  // a DOM drag/drop event. Updates the internal grid mapping so that later
  // refreshes preserve the new layout.
  function moveNodeToCell(groupId, nodeId, cellIndex){
    const gid = String(groupId);
    const gst = gridState.get(gid);
    if (!gst) return;
    const idx = Number(cellIndex);
    const cur = gst.ids.findIndex(x => x === nodeId);

    if (cur === -1){
      if (gst.ids[idx]) {
        const tmp = gst.ids[idx];
        gst.ids[idx] = nodeId;
        for (const [otherId, otherSt] of gridState){
          if (otherId === gid) continue;
          const i = otherSt.ids.findIndex(x => x === nodeId);
          if (i >= 0) otherSt.ids[i] = null;
        }
        const empty = gst.ids.indexOf(null);
        if (empty >= 0) gst.ids[empty] = tmp;
      } else {
        gst.ids[idx] = nodeId;
      }
    } else if (cur !== idx) {
      const tmp = gst.ids[idx];
      gst.ids[idx] = gst.ids[cur];
      gst.ids[cur] = tmp ?? null;
    }

    applyStatePositions(gid);
  }

  // Lock / unlock API (Option B)
  function lockDrag(id){
    dragLocked = true;
    draggingId = id || null;
    frozen = new Map();
    for (const [gid, st] of gridState){
      frozen.set(gid, { rows: st.rows, cols: st.cols, ids: st.ids.slice() });
    }

    // allow grid cells to receive drag events
    const layer = document.querySelector(GROUP_LAYER_SELECTOR);
    if (layer) layer.style.pointerEvents = 'auto';
    if (layer) {
      const boxes = layer.querySelectorAll(GROUP_BOX_SELECTOR);
      boxes.forEach(b => b.style.pointerEvents = 'auto');
    }
  }
  function unlockDrag(){
    dragLocked = false;
    draggingId = null;
    frozen = null;

     // revert pointer events so group boxes don't block clicks when idle
     const layer = document.querySelector(GROUP_LAYER_SELECTOR);
     if (layer) layer.style.pointerEvents = 'none';
     if (layer) {
       const boxes = layer.querySelectorAll(GROUP_BOX_SELECTOR);
       boxes.forEach(b => b.style.pointerEvents = 'none');
     }
  }

  // Public hooks
  window.__gridEnhance = { refresh, lockDrag, unlockDrag, moveNodeToCell };

  // First run
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', ()=>{ refresh(); });
  }else{
    refresh();
  }
})();
