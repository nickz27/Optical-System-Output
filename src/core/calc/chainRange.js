import { prodRanges, addRanges } from './combine.js';
import { rules } from '../rules/index.js';

export function nodeEffRange(node, tables){
  if(node.kind==='LightSource' || node.kind==='ChainSummary' || node.kind==='SystemSummary') return {min:1,max:1};
  const rule = rules[node.kind] || rules.__default;
  return rule(node.config||{}, tables, node.kind);
}
export function chainEffRange(nodes, chainId, tables){
  const ranges = nodes.filter(n=>n.chainId===chainId && !['LightSource','ChainSummary','SystemSummary'].includes(n.kind))
                      .map(n=>nodeEffRange(n, tables));
  return prodRanges(ranges);
}
export function chainFinalLumensRange(nodes, chain, tables){
  const src = (chain.ledCount||0) * (chain.lmPerLed||0);
  const eff = chainEffRange(nodes, chain.id, tables);
  return { min: src * eff.min, max: src * eff.max };
}
export function systemSummary(nodes, chains, tables){
  const finals = chains.map(c=>chainFinalLumensRange(nodes, c, tables));
  const total = addRanges(finals);
  const totalSource = chains.reduce((s,c)=>s + (c.ledCount||0)*(c.lmPerLed||0), 0);
  const eff = totalSource>0 ? { min: total.min/totalSource, max: total.max/totalSource } : {min:0,max:0};
  return { totalLumens: total, systemEfficiency: eff };
}
