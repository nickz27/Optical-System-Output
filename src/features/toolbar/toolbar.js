import { actions, getState } from '../../state/store.js';
import { loadCatalog, saveCatalog, buildTables } from '../../core/catalog/catalog.js';
import { fitView } from '../board/viewport.js';

export function bindToolbar(){
  document.getElementById('btn-reset').onclick = ()=> actions.reset();
  document.getElementById('btn-fit').onclick = ()=> fitView();

  const undoBtn = document.getElementById('btn-undo');
  const redoBtn = document.getElementById('btn-redo');
  if(undoBtn) undoBtn.onclick = ()=> actions.undo();
  if(redoBtn) redoBtn.onclick = ()=> actions.redo();

  const addLs = document.getElementById('btn-add-light-source');
  if(addLs){
    addLs.onclick = ()=>{
      const chainId = actions.addChain();
      const st = getState();
      const row = st.chains.findIndex(c=>c.id===chainId);
      const x = 120, y = 120 + row * 140;
      actions.addNode({ chainId, kind:'LightSource', label:'Light Source', x, y });
      fitView();
    };
  }

  document.getElementById('btn-export-state').onclick = ()=>{
    const blob = new Blob([JSON.stringify(getState(), null, 2)], {type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='chain_state.json'; a.click(); URL.revokeObjectURL(a.href);
  };
  document.getElementById('btn-import-state').onclick = ()=>{
    const inp=document.createElement('input'); inp.type='file'; inp.accept='application/json';
    inp.onchange=()=>{
      const f=inp.files[0]; if(!f) return;
      const fr=new FileReader(); fr.onload=()=>{ try{ const o=JSON.parse(String(fr.result)); actions.importState(o); }catch(e){ alert('Bad JSON'); } };
      fr.readAsText(f);
    };
    inp.click();
  };

  document.getElementById('btn-export-catalog').onclick = ()=>{
    const tables = loadCatalog();
    const blob = new Blob([JSON.stringify({ opticalSystems: tables.opticalSystems, materials: tables.materials, textures: tables.textures, lampFunctions: tables.lampFunctions }, null, 2)], {type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='efficiency_tables.json'; a.click(); URL.revokeObjectURL(a.href);
  };
  document.getElementById('btn-import-catalog').onclick = ()=>{
    const inp=document.createElement('input'); inp.type='file'; inp.accept='application/json';
    inp.onchange=()=>{
      const f=inp.files[0]; if(!f) return;
      const fr=new FileReader(); fr.onload=()=>{ try{ const raw=JSON.parse(String(fr.result)); const tables=buildTables(raw); saveCatalog(tables); location.reload(); }catch(e){ alert('Bad tables JSON'); } };
      fr.readAsText(f);
    };
    inp.click();
  };
}
