import opticalSystems from './defaults/opticalSystems.js';
import materials from './defaults/materials.js';
import textures from './defaults/textures.js';
import lampFunctions from './defaults/lampFunctions.js';
import { loadTables, saveTables } from '../util/persist.js';

export function buildTables(raw){
  return {
    opticalSystems: raw.opticalSystems,
    materials: raw.materials,
    textures: raw.textures,
    lampFunctions: raw.lampFunctions
  };
}

export function loadCatalog(){
  const o = loadTables();
  const raw = o || { opticalSystems, materials, textures, lampFunctions };
  return buildTables(raw);
}

export function saveCatalog(tables){ saveTables(tables); }

export function getSystemsList(tables){
  return Object.entries(tables.opticalSystems).map(([key, val]) => ({ key, label: val.label || key }));
}
export function getFactorsFor(tables, kind){
  return tables.opticalSystems[kind]?.factors || [];
}
export function getOptionsFor(tables, kind, key){
  const f = getFactorsFor(tables, kind).find(x=>x.key===key);
  if(!f) return [];
  if(f.source === 'materials'){ return Object.keys(tables.materials); }
  if(f.source === 'textures'){ return Object.keys(tables.textures); }
  if(f.source === 'inline'){ return Object.keys(f.choices || {}); }
  return [];
}
