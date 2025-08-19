import { getState } from '../../state/store.js';
import { renderGroupBoxes, ensureGroupsLayer } from '../groups/groups.js';
import { renderSystemPanel } from '../sidebar/systemPanel.js';
import '../groups/gridEnhance.js';

export function renderBoard(){
  const st = getState();
  const root = document.getElementById('board');
  ensureGroupsLayer(root);
  renderSystemPanel();
  if(window.__gridEnhance){ window.__gridEnhance.refresh(); }
}
