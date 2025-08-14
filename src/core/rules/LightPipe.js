import { prodRanges } from '../calc/combine.js';
// config: { type, material, texture, lengthMm }
export function LightPipe(config, tables){
  const typeR = tables.opticalSystems.LightPipe.factors.find(f=>f.key==='type').choices[config.type] || {min:1,max:1};
  const mat = tables.materials[config.material] || { mult:{min:1,max:1}, absorptionPerMm:0 };
  const textureR = tables.textures[config.texture] ? {min:tables.textures[config.texture].min, max:tables.textures[config.texture].max} : {min:1,max:1};
  const len = Math.max(0, Number(config.lengthMm||0));
  const transmit = Math.exp(-(mat.absorptionPerMm || 0) * len);
  const absorptionR = {min:transmit, max:transmit};
  return prodRanges([typeR, mat.mult, textureR, absorptionR]);
}
