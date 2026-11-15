/* Botão para esconder e mostrar a legenda dos mapas.
   legendToggle(conteudo, {maxHeight}) devolve um elemento para view.ui.add(...). */
(function(){
  const css=`.lgt{display:flex;flex-direction:column;align-items:flex-start;gap:6px;font:12.5px Rawline,Raleway,"Segoe UI",system-ui,sans-serif}
.lgt-b{display:inline-flex;align-items:center;gap:6px;border:1px solid #DDE3EB;background:#fff;color:#0A2A5E;font:600 12.5px Rawline,Raleway,"Segoe UI",sans-serif;padding:6px 10px;border-radius:7px;cursor:pointer;box-shadow:0 1px 4px rgba(10,42,94,.18)}
.lgt-b:hover{background:#F4F7FC;border-color:#1C5FAD}
.lgt-b svg{width:15px;height:15px;flex:none}
.lgt-c{overflow:auto;max-width:320px}
.lgt.off .lgt-c{display:none}
.lgt .esri-legend{background:rgba(255,255,255,.96);border:1px solid #DDE3EB;border-radius:8px;padding:4px 2px}`;
  let done=false;
  const ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1.5" fill="currentColor"/><circle cx="4.5" cy="12" r="1.5" fill="currentColor"/><circle cx="4.5" cy="18" r="1.5" fill="currentColor"/></svg>';
  window.legendToggle=function(content,opts){
    opts=opts||{};
    if(!done){ const st=document.createElement('style'); st.textContent=css; document.head.appendChild(st); done=true; }
    const w=document.createElement('div'); w.className='lgt';
    const b=document.createElement('button'); b.type='button'; b.className='lgt-b';
    const c=document.createElement('div'); c.className='lgt-c'; if(opts.maxHeight) c.style.maxHeight=opts.maxHeight; c.appendChild(content);
    const KEY='saffp_legenda:'+location.pathname;
    let off=false; try{ off=sessionStorage.getItem(KEY)==='0'; }catch(e){}
    const paint=()=>{ w.classList.toggle('off',off); b.innerHTML=ICON+(off?'Mostrar legenda':'Ocultar legenda'); b.setAttribute('aria-expanded',String(!off)); };
    b.onclick=()=>{ off=!off; paint(); try{ sessionStorage.setItem(KEY,off?'0':'1'); }catch(e){} };
    paint(); w.append(b,c); return w;
  };
})();
