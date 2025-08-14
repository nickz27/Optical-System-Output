import { LightPipe } from './LightPipe.js';
export const rules = {
  LightPipe,
  __default: (config, tables, kind) => {
    const spec = tables.opticalSystems[kind]?.factors || [];
    let acc = {min:1,max:1};
    for(const f of spec){
      let r = {min:1,max:1};
      if(f.source==='inline'){ r = f.choices?.[config[f.key]] || {min:1,max:1}; }
      else if(f.source==='materials'){ r = tables.materials?.[config[f.key]]?.mult || {min:1,max:1}; }
      else if(f.source==='textures'){ const t=tables.textures?.[config[f.key]]; r = t?{min:t.min,max:t.max}:{min:1,max:1}; }
      acc = {min: acc.min*(r.min??r), max: acc.max*(r.max??r)};
    }
    return acc;
  }
};
