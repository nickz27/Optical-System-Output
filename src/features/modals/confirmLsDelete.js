// 3-button confirmation modal for deleting a Light Source

function el(id){ return document.getElementById(id); }

export function bindConfirmLsDelete(){
  const m = el('confirm-ls-del'); if (!m) return;

  // drag support
  const hdr = el('cls-drag');
  hdr?.addEventListener('mousedown', (e)=>{
    const r = { sx:e.clientX, sy:e.clientY, left:m.offsetLeft, top:m.offsetTop };
    function mv(ev){ m.style.left = (r.left + (ev.clientX-r.sx))+'px'; m.style.top = (r.top + (ev.clientY-r.sy))+'px'; m.style.transform='translate(0,0)'; }
    function up(){ document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); }
    document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up);
  });
}

export function openConfirmLsDelete(){
  const m = el('confirm-ls-del'); if (!m) return Promise.resolve('cancel');
  m.classList.add('show'); m.style.zIndex = 10000;
  return new Promise((resolve)=>{
    const yes = el('btn-cls-yes');
    const no  = el('btn-cls-no');
    const stashLs = el('btn-cls-stash-ls');
    const cancel = el('btn-cls-cancel');
    function cleanup(result){
      m.classList.remove('show');
      yes?.removeEventListener('click', onYes);
      no?.removeEventListener('click', onNo);
      stashLs?.removeEventListener('click', onStashLs);
      cancel?.removeEventListener('click', onCancel);
      resolve(result);
    }
    function onYes(){ cleanup('yes'); }
    function onNo(){ cleanup('no'); }
    function onStashLs(){ cleanup('stash-ls'); }
    function onCancel(){ cleanup('cancel'); }
    yes?.addEventListener('click', onYes);
    no?.addEventListener('click', onNo);
    stashLs?.addEventListener('click', onStashLs);
    cancel?.addEventListener('click', onCancel);
  });
}

// expose for other modules if needed
window.App = window.App || {};
window.App.Events = { ...(window.App.Events||{}), openConfirmLsDelete };
