/* Aviso "Ambiente de demonstração" (mesmo da página inicial). Aparece uma vez por sessão em cada página.
   Não aparece com #semaviso no endereço nem nas abas de download (#baixar=...). */
(function(){
  if(/semaviso|baixar=/.test(location.hash)) return;
  const KEY='saffp_aviso:'+location.pathname.replace(/index\.html$/,'');
  try{ if(sessionStorage.getItem(KEY)==='1') return; }catch(e){}
  const LOGO='https://imagem-govfed.maps.arcgis.com/sharing/rest/content/items/b9b84e3d709e4bd9af5e652588ace76e/resources/images/logo_antt_header.png';
  const css=`.saffp-av{position:fixed;inset:0;background:rgba(6,18,42,.72);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;z-index:100000;padding:20px;font:14px/1.45 Rawline,Raleway,"Segoe UI",system-ui,sans-serif}
.saffp-av .dlg{width:min(560px,100%);background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,.4);animation:saffpPop .25s ease-out}
.saffp-av .tp{background:linear-gradient(100deg,#0A2A5E,#1C5FAD);padding:22px 26px;display:flex;align-items:center;gap:16px;border-bottom:5px solid #F2B705}
.saffp-av .tp img{height:46px}
.saffp-av .tp span{color:#fff;font-size:12px;letter-spacing:.08em;text-transform:uppercase;font-weight:600;opacity:.85}
.saffp-av .bd{padding:22px 26px 8px}
.saffp-av h2{margin:0 0 10px;font-size:20px;color:#0A2A5E;display:flex;align-items:center;gap:10px}
.saffp-av h2 svg{width:24px;height:24px;color:#C77C00;flex:none}
.saffp-av p{margin:0 0 10px;color:#4A5568;font-size:14px}
.saffp-av .ft{padding:12px 26px 22px;display:flex;justify-content:flex-end}
.saffp-av button{display:inline-flex;align-items:center;background:#0A2A5E;color:#fff;font:600 13.5px Rawline,Raleway,"Segoe UI",sans-serif;padding:9px 16px;border-radius:7px;border:0;cursor:pointer}
.saffp-av button:hover{background:#1C5FAD}
@keyframes saffpPop{from{transform:translateY(10px) scale(.98);opacity:0}to{transform:none;opacity:1}}`;
  function show(){
    const st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);
    const m=document.createElement('div'); m.className='saffp-av'; m.setAttribute('role','dialog'); m.setAttribute('aria-modal','true'); m.setAttribute('aria-labelledby','saffpAvT');
    m.innerHTML=`<div class="dlg"><div class="tp"><img src="${LOGO}" alt="ANTT"><span>Aviso importante</span></div>
      <div class="bd"><h2 id="saffpAvT"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17v.5"/></svg>Ambiente de demonstração</h2>
      <p>Este sistema é uma <b>demonstração</b> dos painéis SAFF-P da Superintendência de Transporte Ferroviário (SUFER).</p>
      <p>As informações apresentadas são <b>meramente demonstrativas</b> e <b>não correspondem a dados oficiais</b> da ANTT. Não devem ser usadas como fonte para decisões, publicações ou comunicações externas.</p></div>
      <div class="ft"><button type="button">Entendi, continuar</button></div></div>`;
    const close=()=>{ m.remove(); document.removeEventListener('keydown',esc); try{ sessionStorage.setItem(KEY,'1'); }catch(e){} };
    const esc=e=>{ if(e.key==='Escape') close(); };
    m.querySelector('button').onclick=close; m.onclick=e=>{ if(e.target===m) close(); }; document.addEventListener('keydown',esc);
    document.body.appendChild(m); m.querySelector('button').focus();
  }
  if(document.body) show(); else document.addEventListener('DOMContentLoaded',show);
})();
