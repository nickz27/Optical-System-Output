
let _catalog = {
  LightPipe: {
    label: "Light Pipe",
    modifiers: [
      { key:'type', label:'type', input:'select', options:['Single','Double']},
      { key:'material', label:'material', input:'select', options:['PMMA','PC']},
      { key:'texture', label:'texture', input:'select', options:['MT11020','MT11030','MT11040']},
      { key:'lengthMm', label:'abs.', input:'number', step:1, min:0 }
    ],
    factors: {
      type: { Single:{min:0.40,max:0.50}, Double:{min:0.35,max:0.45} },
      material: { PMMA:{min:0.98,max:0.99}, PC:{min:0.96,max:0.98} },
      texture: { MT11020:{min:0.60,max:0.65}, MT11030:{min:0.50,max:0.55}, MT11040:{min:0.40,max:0.45} }
    }
  }
};
export function loadCatalog(){ return _catalog; }
export function setCatalog(obj){ _catalog = obj || _catalog; }
