const LS_STATE='optflow_state_v2', LS_CATALOG='optflow_tables_v1';
export function saveState(st){ try{ localStorage.setItem(LS_STATE, JSON.stringify(st)); }catch(e){} }
export function loadState(){ try{ return JSON.parse(localStorage.getItem(LS_STATE)||'null'); }catch(e){ return null; } }
export function saveTables(t){ try{ localStorage.setItem(LS_CATALOG, JSON.stringify(t)); }catch(e){} }
export function loadTables(){ try{ return JSON.parse(localStorage.getItem(LS_CATALOG)||'null'); }catch(e){ return null; } }
export const KEYS = { LS_STATE, LS_CATALOG };
