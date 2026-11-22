/* Página inicial SAFF-P: indicadores, vitrine interativa dos painéis com mapa panorâmico, trem de carga e maria-fumaça. */
'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const R='https://imagem-govfed.maps.arcgis.com/sharing/rest/content/items/26c68a6e20144b5199923c22b1722c3e/resources/images/';
const EXP='https://experience.arcgis.com/experience/', DSH='https://imagem-govfed.maps.arcgis.com/apps/dashboards/';
const SVC='https://services.arcgis.com/4CZwpdWHGNPLU7QQ/arcgis/rest/services/';
const nf=(v,d=0)=>(+v||0).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d});
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const I={
  train:'<rect x="6" y="2.5" width="12" height="13" rx="3"/><path d="M6 9.5h12M9.5 5.5h5"/><path d="M9 15.5 6.5 21.5M15 15.5l2.5 6M7.6 19h8.8"/>',
  pit:'<path d="M3 17h18M5 17V9l7-4 7 4v8"/><path d="M9 17v-4h6v4"/>',
  fico:'<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  acid:'<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17v.5"/>',
  route:'<circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="6" r="2.5"/><path d="M8.5 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5"/>',
  leaf:'<path d="M5 19c0-8 5-13 15-14-1 10-6 15-14 15"/><path d="M5 19l7-7"/>',
  shield:'<path d="M12 3 4 6v6c0 4.5 3.4 8.2 8 9 4.6-.8 8-4.5 8-9V6z"/><path d="M8.5 12.5 11 15l4.5-5"/>'
};
const svg=k=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${I[k]}</svg>`;

/* ilustração do cartão Faixa de Domínio (o item não tem miniatura) */
const FAIXA_IMG='data:image/svg+xml;utf8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 120"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2E6B3A"/><stop offset="1" stop-color="#1D4A27"/></linearGradient><pattern id="p" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="2" fill="#3F8A4C"/><circle cx="10" cy="9" r="2.4" fill="#356F3F"/></pattern></defs>
<rect width="400" height="120" fill="url(#g)"/><rect width="400" height="120" fill="url(#p)" opacity=".7"/>
<path d="M-20 120 C110 70 230 80 420 10 L420 50 C250 105 130 100 -20 160Z" fill="#C9A86A" opacity=".55"/>
<path d="M-20 120 C110 70 230 80 420 10" stroke="#F2B705" stroke-width="3" stroke-dasharray="10 6" fill="none"/><path d="M-20 160 C130 100 250 105 420 50" stroke="#F2B705" stroke-width="3" stroke-dasharray="10 6" fill="none"/>
<path d="M-20 140 C120 85 240 92 420 30" stroke="#5B4636" stroke-width="10" fill="none"/><path d="M-20 140 C120 85 240 92 420 30" stroke="#D9DEE6" stroke-width="2.2" stroke-dasharray="3 7" fill="none"/>
<g transform="translate(300 34)"><circle r="13" fill="#B4372B" stroke="#fff" stroke-width="3"/><path d="M0-6v7M0 5v.5" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/></g>
<g transform="translate(150 70)"><circle r="11" fill="#1C5FAD" stroke="#fff" stroke-width="3"/><path d="M-4 0l3 3 5-6" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round"/></g></svg>`);

/* painéis: cat = categoria do filtro; layer = camada pública mostrada no mapa panorâmico */
const P=[
  {id:'aut',t:'Autorizações Ferroviárias',d:'Contratos de adesão e requerimentos de autorização de novas ferrovias.',c:'#1C5FAD',i:'train',cat:'terr',img:R+'widget_460/1776101652744.png',url:EXP+'99652a1a4f7a4ee89a8e3c1d6af5d9bb',old:DSH+'b9b84e3d709e4bd9af5e652588ace76e',
    layer:{u:'AUT___AP___20_02_26/FeatureServer/0',geom:'line',title:f=>f.TRECHO,sub:f=>`${f.REQUERENTE||''} · ${f.STATUS||''}`,fields:['TRECHO','REQUERENTE','STATUS']},
    metric:{stat:'EXTENSÃO',unit:'km',lab:'em trechos autorizados ou requeridos',date:{f:'PUBLICACAO',ms:true},spark:'publicações por ano'}},
  {id:'pit',t:'Projetos de Interesse de Terceiros (PIT)',d:'Travessias, paralelismos e interferências de terceiros na faixa ferroviária.',c:'#0F7C80',i:'pit',cat:'terr',img:R+'widget_3/1776101665127.png',url:EXP+'f554b9b22f8e4cfe9470046ad6b45a4a',old:DSH+'8d834b7aae7d4b549e3348f8d133bf55',
    layer:{u:'Projeto_de_Interesse_de_Terceiros_(PIT)/FeatureServer/0',geom:'point',title:f=>`PIT ${f.ID||''} · ${f.Classifica||'processo'}`,sub:f=>`${f.Concession||''} · ${f.Status||''}`,fields:['ID','Classifica','Concession','Status']},
    metric:{lab:'processos de interesse de terceiros',date:{f:'Data_de_en'},spark:'entradas por ano'}},
  {id:'faixa',t:'Faixa de Domínio',d:'Aplicativo de vistorias, registro de alertas, retorno de campo e visão gerencial da faixa de domínio ferroviária.',c:'#B86B00',i:'shield',cat:'terr',img:FAIXA_IMG,url:EXP+'7ed9d005f349427da5b44d30ad7f9f8a',restricted:true,
    mods:['Vistorias','Visão gerencial','Retorno de campo','Registrar alerta']},
  {id:'fico',t:'Fiscalização FICO',d:'Obras da Ferrovia de Integração Centro-Oeste, com registros fotográficos.',c:'#1F8A4C',i:'fico',cat:'obras',img:R+'widget_4/1776101680715.png',url:EXP+'20d9b3d0ec0c4383b7834ee8c11c7068',old:DSH+'df0398e7fcea4d9c9919e67bdca24cdd',
    layer:{u:'survey123_f534c787ea064a64b119e9984448af56_results/FeatureServer/0',geom:'point',title:f=>`${f.trecholote_inspecionado||'Levantamento'}`,sub:f=>`Fiscal: ${f.fiscal_respons_vel||'—'}`,fields:['trecholote_inspecionado','fiscal_respons_vel']},
    metric:{lab:'levantamentos de fiscalização na obra',date:{f:'data_da_visita',ms:true,month:true},spark:'levantamentos por mês'}},
  {id:'aci',t:'Acidentes Ferroviários',d:'Ocorrências por ferrovia, causa e gravidade, com linha do tempo e alertas.',c:'#B4372B',i:'acid',cat:'obras',img:R+'widget_5/1776101691414.png',url:EXP+'8dcb0c4121d643b6ae0b9e2e304288e8',old:DSH+'56dc12a1126c49acb3bf70559ab33477',
    layer:{u:'Acidentes_Ferrovi%C3%A1rios/FeatureServer/0',geom:'point',title:f=>`${f.Natureza||'Acidente'} · ${f.Data_da_Oc||''}`,sub:f=>`${f.Ferrovia||''} · ${f.Grave==='Sim'?'grave':'não grave'}`,fields:['Natureza','Data_da_Oc','Ferrovia','Grave']},
    metric:{lab:'acidentes ferroviários comunicados',date:{f:'Data_da_Oc'},spark:'acidentes por ano'}},
  {id:'amb',t:'Painel Ambiental',d:'Demonstrativo de dados ambientais relacionados às concessões ferroviárias.',c:'#7B3FA0',i:'leaf',cat:'amb',img:R+'widget_637/1776173961556.jpg',url:DSH+'7cb56f035ee845f59900881a756dfaa6'},
  {id:'rms',t:'Malha Sul (RMS)',d:'Acompanhamento da ferrovia concedida à Rumo Malha Sul.',c:'#6A7486',i:'train',cat:'dev',img:R+'background_setting/1783278204299.jpg',dev:true}
];
const CATS=[['all','Todos'],['terr','Território e contratos'],['obras','Obras e segurança'],['amb','Meio ambiente'],['dev','Em desenvolvimento']];

/* ---------- indicadores do topo ---------- */
const K=[
  {c:'#1C5FAD',i:'route',l:'Extensão em autorizações ferroviárias',p:'aut',unit:'km'},
  {c:'#0F7C80',i:'pit',l:'Processos de interesse de terceiros',p:'pit'},
  {c:'#1F8A4C',i:'fico',l:'Levantamentos de fiscalização na FICO',p:'fico'},
  {c:'#B4372B',i:'acid',l:'Acidentes ferroviários registrados',p:'aci'}
];
$('#kpis').innerHTML=K.map((k,i)=>`<div class="kpi" style="--c:${k.c}" data-p="${k.p}" title="Ver no mapa"><div class="ic">${svg(k.i)}</div><div><div class="v" id="k${i}">—</div><div class="l">${k.l}</div></div></div>`).join('');
function countUp(el,to,unit,d=0){ const t0=performance.now(),dur=1100; const u=unit?`<small>${unit}</small>`:'';
  const step=t=>{ const q=Math.min(1,(t-t0)/dur),e=1-Math.pow(1-q,3); el.innerHTML=nf(to*e,d)+u; if(q<1) requestAnimationFrame(step); };
  if(document.hidden||matchMedia('(prefers-reduced-motion: reduce)').matches) el.innerHTML=nf(to,d)+u; else requestAnimationFrame(step); }

/* ---------- vitrine ---------- */
let CAT='all';
function catCount(c){ return c==='all'?P.length:P.filter(p=>p.cat===c).length; }
$('#cats').innerHTML=CATS.map(([k,l])=>`<button class="chip ${k==='all'?'on':''}" data-c="${k}">${l}<span class="n">${catCount(k)}</span></button>`).join('');
$$('#cats .chip').forEach(b=>b.onclick=()=>{ CAT=b.dataset.c; $$('#cats .chip').forEach(x=>x.classList.toggle('on',x===b)); filterCards(); });
$('#srch').oninput=filterCards;
const fold=s=>String(s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
function filterCards(){ const q=fold($('#srch').value.trim());
  P.forEach(p=>{ const el=$(`.card[data-p="${p.id}"]`); const ok=(CAT==='all'||p.cat===CAT)&&(!q||fold(p.t+' '+p.d+' '+(p.mods||[]).join(' ')).includes(q)); el.classList.toggle('hide',!ok); }); }

$('#cards').innerHTML=P.map(p=>`
  <article class="card" style="--c:${p.c}" data-p="${p.id}">
    <div class="img"><div class="ph" style="background-image:url('${p.img}')"></div><span class="ic">${svg(p.i)}</span>
      <span class="st ${p.dev?'dev':p.restricted?'lock':''}">${p.dev?'Em desenvolvimento':p.restricted?'🔒 Acesso da organização':p.layer?'<i></i>Ao vivo':'Disponível'}</span>
      <div class="ttl">${esc(p.t)}</div></div>
    <div class="body"><p>${esc(p.d)}</p>
      ${p.metric?`<div class="metric"><div class="num" id="m_${p.id}">—</div><div class="lab">${esc(p.metric.lab)}</div></div><div class="trend"><svg id="sp_${p.id}" viewBox="0 0 96 34" preserveAspectRatio="none"></svg><span id="ms_${p.id}"></span></div>`:''}
      ${p.mods?`<div class="mods">${p.mods.map(m=>`<span>${esc(m)}</span>`).join('')}</div>`:''}
      ${p.restricted?`<div class="note">Requer login na conta ArcGIS da organização para abrir.</div>`:''}
      <div class="acts">${p.url?`<a class="btn" href="${p.url}" target="_blank" rel="noopener">Abrir painel ↗</a>`:`<span class="btn" aria-disabled="true">Em breve</span>`}
        ${p.layer?`<button class="btn ghost" data-go="${p.id}" type="button">📍 No mapa</button>`:''}
        ${p.old?`<a class="old" href="${p.old}" target="_blank" rel="noopener">versão anterior</a>`:''}</div></div>
  </article>`).join('');

// inclinação suave do cartão acompanhando o mouse
if(!matchMedia('(prefers-reduced-motion: reduce)').matches) $$('.card').forEach(c=>{
  c.addEventListener('mousemove',e=>{ const r=c.getBoundingClientRect(); const x=(e.clientX-r.left)/r.width-.5, y=(e.clientY-r.top)/r.height-.5; c.style.setProperty('--ry',(x*5).toFixed(2)+'deg'); c.style.setProperty('--rx',(-y*5).toFixed(2)+'deg'); });
  c.addEventListener('mouseleave',()=>{ c.style.setProperty('--ry','0deg'); c.style.setProperty('--rx','0deg'); });
});

/* ---------- dados ao vivo de cada painel: total e série no tempo ---------- */
function sparkSVG(vals,labels,color){
  const n=vals.length; if(n<2) return ''; const w=96,h=34,max=Math.max(1,...vals), bw=(w-4)/n;
  return vals.map((v,i)=>{ const bh=Math.max(1.5,(v/max)*(h-6)); return `<rect x="${(2+i*bw+bw*.12).toFixed(1)}" y="${(h-bh).toFixed(1)}" width="${(bw*.76).toFixed(1)}" height="${bh.toFixed(1)}" rx="1.5" fill="${color}" opacity="${i===n-1?1:.55}"><title>${labels[i]}: ${nf(v)}</title></rect>`; }).join('');
}
async function fetchAll(u,fields){
  let out=[],off=0;
  for(;;){ const p=new URLSearchParams({where:'1=1',outFields:fields,returnGeometry:'false',resultOffset:off,resultRecordCount:2000,f:'json'});
    const j=await (await fetch(SVC+u+'/query?'+p)).json(); if(j.error) throw new Error(j.error.message);
    out=out.concat(j.features.map(f=>f.attributes)); if(!j.exceededTransferLimit||!j.features.length) break; off+=j.features.length; }
  return out;
}
const MES=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
P.filter(p=>p.metric).forEach(async p=>{ try{
  const m=p.metric, fields=[m.date.f].concat(m.stat?[m.stat]:[]).join(',');
  const rows=await fetchAll(p.layer.u,fields);
  const total=m.stat?rows.reduce((s,r)=>s+(+r[m.stat]||0),0):rows.length;
  countUp($('#m_'+p.id),total,m.unit);
  const ki=K.findIndex(k=>k.p===p.id); if(ki>=0) countUp($('#k'+ki),total,K[ki].unit);
  const key=r=>{ const v=r[m.date.f]; if(v==null||v==='') return null;
    if(m.date.ms){ const d=new Date(v); return m.date.month?d.getFullYear()*12+d.getMonth():d.getFullYear(); }
    const x=/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/.exec(String(v)); if(!x) return null; let y=+x[3]; if(y<100) y+=2000; return y; };
  const cnt={}; rows.forEach(r=>{ const k=key(r); if(k!=null&&k<=(m.date.month?new Date().getFullYear()*12+new Date().getMonth():new Date().getFullYear())) cnt[k]=(cnt[k]||0)+1; });
  let ks=Object.keys(cnt).map(Number).sort((a,b)=>a-b); if(ks.length>8) ks=ks.slice(-8);
  const labs=ks.map(k=>m.date.month?`${MES[k%12]}/${Math.floor(k/12)}`:String(k));
  $('#sp_'+p.id).innerHTML=sparkSVG(ks.map(k=>cnt[k]),labs,p.c);
  $('#ms_'+p.id).textContent=ks.length>1?`${m.spark}: ${labs[0]}–${labs[labs.length-1]}`:'';
}catch(e){ const el=$('#m_'+p.id); if(el) el.textContent='—'; } });
$('#upd').textContent='Dados em tempo real · consultados em '+new Date().toLocaleString('pt-BR');

/* ---------- mapa panorâmico ---------- */
const ML=P.filter(p=>p.layer);
$('#lchips').innerHTML=ML.map(p=>`<button class="lchip" style="--c:${p.c}" data-l="${p.id}" title="Mostrar ou ocultar"><i></i>${esc(p.t.replace(/ \(.*\)/,''))}</button>`).join('');
let VIEW=null, LY={}, pinned=null;
function focusPanel(id,from){
  Object.entries(LY).forEach(([k,l])=>{ l.effect=!id||k===id?null:'grayscale(85%) opacity(22%)'; });
  $$('.card').forEach(c=>c.classList.toggle('lit',!!id&&c.dataset.p===id&&from!=='card'));
  $$('.lchip').forEach(c=>c.classList.toggle('lit',c.dataset.l===id));
  $('#reset').classList.toggle('on',!!pinned);
}
let ft=null;
const unfocus=()=>{ clearTimeout(ft); ft=setTimeout(()=>focusPanel(pinned,'card'),150); };
$$('.card').forEach(c=>{ c.addEventListener('mouseenter',()=>{ clearTimeout(ft); if(LY[c.dataset.p]) focusPanel(c.dataset.p,'card'); }); c.addEventListener('mouseleave',unfocus); });
$$('.lchip').forEach(b=>{
  b.onclick=()=>{ const l=LY[b.dataset.l]; if(!l) return; l.visible=!l.visible; b.classList.toggle('off',!l.visible); };
  b.onmouseenter=()=>{ clearTimeout(ft); focusPanel(b.dataset.l); }; b.onmouseleave=unfocus; });
function goPanel(id){
  pinned=id; focusPanel(id); const l=LY[id]; if(!l||!VIEW) return;
  if(!l.visible){ l.visible=true; $(`.lchip[data-l="${id}"]`).classList.remove('off'); }
  if(innerWidth<1200) $('.pano').scrollIntoView({behavior:'smooth',block:'start'});
  l.queryExtent().then(r=>{ if(r.extent) VIEW.goTo(r.extent.expand(1.25),{duration:900}).catch(()=>{}); }).catch(()=>{});
}
$$('[data-go]').forEach(b=>b.onclick=()=>goPanel(b.dataset.go));
$$('.kpi').forEach(k=>k.onclick=()=>goPanel(k.dataset.p));
$('#reset').onclick=()=>{ pinned=null; focusPanel(null); if(VIEW) VIEW.goTo({center:[-52,-15],zoom:3.6},{duration:800}).catch(()=>{}); };

require(['esri/Map','esri/views/MapView','esri/layers/FeatureLayer'],(EMap,MapView,FeatureLayer)=>{
  const ord=['aut','pit','fico','aci'];
  const make=p=>{ const c=p.c, L=p.layer;
    const sym=L.geom==='line'?{type:'simple-line',color:c,width:2.6,cap:'round'}:{type:'simple-marker',size:p.id==='aci'?4.5:7,color:c,outline:{color:[255,255,255,.9],width:p.id==='aci'?.4:.9}};
    return new FeatureLayer({url:SVC+L.u,title:p.t,outFields:L.fields,minScale:0,maxScale:0,renderer:{type:'simple',symbol:sym},popupEnabled:true,
      popupTemplate:{title:f=>esc(L.title(f.graphic.attributes)),content:f=>`<div style="font-size:13px">${esc(L.sub(f.graphic.attributes))}</div><p style="margin:10px 0 0"><a href="${p.url}" target="_blank" rel="noopener" style="display:inline-block;background:#0A2A5E;color:#fff;padding:7px 12px;border-radius:7px;text-decoration:none;font-weight:600">Abrir ${esc(p.t)} ↗</a></p>`}}); };
  ord.map(id=>P.find(p=>p.id===id)).reverse().forEach(p=>{ LY[p.id]=make(p); });
  const bsel=$('#pBase'); const map=new EMap({basemap:bsel.value,layers:ord.map(id=>LY[id])}); bsel.onchange=e=>{ map.basemap=e.target.value; };
  VIEW=new MapView({container:'pmap',map,center:[-52,-15],zoom:3.6,constraints:{minZoom:3,snapToZoom:false},ui:{components:['zoom','attribution']},
    highlightOptions:{color:[242,183,5,1],haloOpacity:.6,fillOpacity:.1},popup:{dockEnabled:false,dockOptions:{buttonEnabled:false}}});
  VIEW.navigation.mouseWheelZoomEnabled=false;
  VIEW.on('click',()=>{ VIEW.navigation.mouseWheelZoomEnabled=true; });
  VIEW.on('pointer-leave',()=>{ VIEW.navigation.mouseWheelZoomEnabled=false; tip.classList.remove('on'); });
  // passar o mouse sobre um ponto/trecho: dica e destaque do cartão correspondente
  const tip=$('#mtip'); let pend=false,last=null,hl=null;
  VIEW.on('pointer-move',ev=>{ if(pend) return; pend=true; requestAnimationFrame(()=>{ pend=false;
    VIEW.hitTest(ev,{include:Object.values(LY).filter(l=>l.visible)}).then(h=>{
      const g=h.results.find(r=>r.graphic&&r.graphic.layer); const id=g?Object.keys(LY).find(k=>LY[k]===g.graphic.layer):null;
      const key=g?id+':'+g.graphic.getObjectId():null;
      if(key!==last){ last=key; if(hl){hl.remove();hl=null;}
        if(g){ const p=P.find(x=>x.id===id); VIEW.whenLayerView(g.graphic.layer).then(lv=>{ if(last===key) hl=lv.highlight(g.graphic); });
          tip.style.setProperty('--c',p.c); tip.innerHTML=`<b>${esc(p.layer.title(g.graphic.attributes))}</b><span>${esc(p.layer.sub(g.graphic.attributes))}</span><br><span style="color:${p.c};font-weight:700">${esc(p.t)} · clique para abrir</span>`;
          tip.classList.add('on'); $$('.card').forEach(c=>c.classList.toggle('lit',c.dataset.p===id)); VIEW.container.style.cursor='pointer'; }
        else { tip.classList.remove('on'); $$('.card').forEach(c=>c.classList.remove('lit')); VIEW.container.style.cursor=''; } }
      if(g){ let x=ev.x+14,y=ev.y+14; if(x+290>VIEW.width) x=ev.x-296; if(y+90>VIEW.height) y=ev.y-90; tip.style.left=x+'px'; tip.style.top=y+'px'; }
    }).catch(()=>{}); }); });
});

/* ---------- trem de carga (faixa superior) ---------- */
(function(){
  // paisagem: duas camadas de morros e postes, repetidas para rolar sem emenda
  const hillsA='<svg viewBox="0 0 1200 96" preserveAspectRatio="none"><path d="M0 70 C120 40 220 58 330 46 S560 24 690 50 S940 38 1060 52 S1160 60 1200 70V96H0Z" fill="#DCE5F0"/></svg>';
  const hillsB='<svg viewBox="0 0 1200 96" preserveAspectRatio="none"><path d="M0 80 C90 66 170 74 260 64 S430 58 520 70 S700 60 820 72 S1040 62 1200 80V96H0Z" fill="#CFDAE8"/><g fill="#B9C9DC">'+
    [80,240,470,610,880,1010,1130].map(x=>`<path d="M${x} 78l9-22 9 22z"/><rect x="${x+8}" y="74" width="2" height="6"/>`).join('')+'</g></svg>';
  const poles='<svg viewBox="0 0 1200 96" preserveAspectRatio="none"><g stroke="#9AA8BD" stroke-width="2">'+[60,360,660,960].map(x=>`<path d="M${x} 82V40M${x-8} 46h16"/>`).join('')+
    '</g><path d="M60 46 Q210 56 360 46 T660 46 T960 46 T1260 46" stroke="#B5C1D2" stroke-width="1" fill="none"/></svg>';
  $('#hills').innerHTML=hillsA+hillsA; $('#hills2').innerHTML=hillsB+hillsB; $('#poles').innerHTML=poles+poles;

  const N='#0A2A5E',N2='#16407F',Y='#F2B705';
  const wheel=(x,y,r)=>`<g class="whl"><circle cx="${x}" cy="${y}" r="${r}" fill="#1B2638"/><circle cx="${x}" cy="${y}" r="${r-.9}" fill="url(#wg)"/><path d="M${x-r+1.2} ${y}h${2*r-2.4}M${x} ${y-r+1.2}v${2*r-2.4}" stroke="#1B2638" stroke-width=".8"/><circle cx="${x}" cy="${y}" r="${r*.3}" fill="#1B2638"/></g>`;
  const bogie=(x,y,gap)=>`<rect x="${x-4}" y="${y-2.6}" width="${gap+8}" height="3.6" rx="1.6" fill="#243149"/>`+wheel(x,y+1.6,3.4)+wheel(x+gap,y+1.6,3.4);
  const tbogie=(x,y,g)=>`<rect x="${x-4}" y="${y-2.6}" width="${2*g+8}" height="3.6" rx="1.6" fill="#243149"/>`+wheel(x,y+1.6,3.4)+wheel(x+g,y+1.6,3.4)+wheel(x+2*g,y+1.6,3.4);
  const GER=['GECOF','GEFEF','GEPEF','GEREF','GIFER'];
  const hopper=(x,t)=>`<g transform="translate(${x} 0)"><g class="body">
    <path d="M4 12 Q32 2 60 12Z" fill="url(#ore)"/>
    <path d="M1 12h62v10l-8 8H9l-8-8z" fill="url(#hop)"/><path d="M1 12h62v2H1z" fill="#6E95CC"/>
    ${[13,24,40,51].map(v=>`<path d="M${v} 14v12" stroke="#244B85" stroke-width="1" opacity=".7"/>`).join('')}
    <rect x="15" y="15.5" width="34" height="8" rx="1.5" fill="${N}"/><text x="32" y="21.8" font-size="6.4" letter-spacing=".5" fill="#fff" font-family="Rawline,Raleway,'Segoe UI',sans-serif" font-weight="800" text-anchor="middle">${t}</text></g>
    <rect x="0" y="30" width="64" height="2" fill="#243149"/>${bogie(9,34,9)}${bogie(46,34,9)}<rect x="-3" y="28.6" width="4.5" height="1.8" rx=".6" fill="#243149"/></g>`;
  const NW=GER.length, WW=67, lx=NW*WW+4, fw=lx+108;
  let f=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -8 ${fw} 50"><defs>
    <linearGradient id="hop" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4C7BBE"/><stop offset="1" stop-color="#28508F"/></linearGradient>
    <linearGradient id="ore" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#A57D52"/><stop offset="1" stop-color="#6E4F33"/></linearGradient>
    <linearGradient id="loc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2459A3"/><stop offset=".55" stop-color="${N2}"/><stop offset="1" stop-color="${N}"/></linearGradient>
    <linearGradient id="gls" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#EAF3FF"/><stop offset="1" stop-color="#9EC2EA"/></linearGradient>
    <radialGradient id="wg"><stop offset="0" stop-color="#9AA8BD"/><stop offset="1" stop-color="#4B5A73"/></radialGradient>
    <linearGradient id="beam" x1="0" x2="1"><stop offset="0" stop-color="#FFF3B0" stop-opacity=".55"/><stop offset="1" stop-color="#FFF3B0" stop-opacity="0"/></linearGradient></defs>
    <ellipse cx="${fw/2}" cy="40" rx="${fw/2}" ry="2.2" fill="#0A2A5E" opacity=".12"/>`;
  for(let i=0;i<NW;i++) f+=hopper(3+i*WW,GER[i]);
  f+=`<g transform="translate(${lx} 0)">
    <path d="M100 18 L150 10 L150 30 L100 24Z" fill="url(#beam)"/>
    <g class="body">
      <path d="M4 10h66v20H4z" fill="url(#loc)"/><path d="M70 3h14q10 0 14 10v17H70z" fill="url(#loc)"/>
      <path d="M74 6h10q6 0 9 7H74z" fill="url(#gls)"/><path d="M76 7.2l5 0-4 4.6h-2z" fill="#fff" opacity=".7"/>
      ${[12,26,40,54].map(x=>`<rect x="${x}" y="13" width="9" height="5" rx="1" fill="#0B2148" opacity=".55"/>`).join('')}
      <rect x="4" y="22" width="94" height="2.6" fill="${Y}"/><path d="M86 24.6l6-6h4l-6 6zM92 24.6l5-5v3l-2 2z" fill="${Y}"/>
      <rect x="10" y="6.5" width="14" height="3.5" rx="1" fill="${N}"/><rect x="30" y="6.5" width="22" height="3.5" rx="1" fill="${N}"/>
      <rect x="57" y="4" width="4" height="6" rx="1" fill="#243149"/><rect x="63" y="5" width="3" height="5" rx="1" fill="#243149"/>
      <text x="36" y="20.2" font-size="6.6" letter-spacing="1.2" fill="#fff" font-family="Rawline,Raleway,'Segoe UI',sans-serif" font-weight="800" text-anchor="middle">SUFER · ANTT</text>
      <path d="M6 9h62" stroke="#9FC0EA" stroke-width=".6" opacity=".6"/>
      <circle cx="97" cy="19" r="1.7" fill="#FFF6C8"/><circle cx="97" cy="19" r="3.4" fill="#FFF3B0" opacity=".35"/></g>
    <rect x="0" y="30" width="100" height="2.4" fill="#243149"/>${tbogie(12,34,10)}${tbogie(64,34,10)}</g></svg>`;
  $('#frt').innerHTML=f;
  // fumaça discreta do escapamento da locomotiva
  const frt=$('#frt'), ex=(lx+59)/fw;
  for(let i=0;i<5;i++){ const d=document.createElement('span'); d.className='exh'; d.style.left=`calc(${(ex*100).toFixed(2)}% - 6px)`; d.style.top='-2px'; d.style.animationDelay=`${-i*.36}s`; frt.appendChild(d); }
  // sinaleiros ao longo da via
  const sc=$('#scene');
  ['22%','68%'].forEach((l,i)=>{ const d=document.createElement('div'); d.className='sig'; d.style.left=l;
    d.innerHTML=`<svg viewBox="0 0 9 44"><rect x="3.6" y="13" width="1.8" height="31" fill="#8C99AE"/><rect x=".5" y="0" width="8" height="15" rx="2.4" fill="${N}"/><circle class="lamp" cx="4.5" cy="4.2" r="2" fill="#1E9E5A" style="animation-delay:${-i*3}s"/><circle cx="4.5" cy="10.4" r="2" fill="#2A3A55"/></svg>`;
    sc.insertBefore(d,sc.querySelector('.frt')); });
  const sym=$('#sym');
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches) setInterval(()=>{ sym.classList.remove('pulse'); void sym.offsetWidth; sym.classList.add('pulse'); },14000);
})();

/* ---------- maria-fumaça (faixa inferior) ---------- */
(function(){
  const K='#14181F',G='#D9A520',GL='#FFE9A8',R='#A8322A';
  const spokes=(cx,cy,r)=>{ let o=`<g class="whl${r<8?' s':''}"><circle cx="${cx}" cy="${cy}" r="${r}" fill="${R}"/><circle cx="${cx}" cy="${cy}" r="${r-1.4}" fill="none" stroke="#5E1B16" stroke-width="1"/>`;
    for(let a=0;a<180;a+=(r<8?45:22.5)){ const t=a*Math.PI/180, dx=Math.cos(t)*(r-1.6), dy=Math.sin(t)*(r-1.6); o+=`<path d="M${(cx-dx).toFixed(2)} ${(cy-dy).toFixed(2)}L${(cx+dx).toFixed(2)} ${(cy+dy).toFixed(2)}" stroke="#5E1B16" stroke-width="${r<8?.9:1.1}"/>`; }
    return o+`<circle cx="${cx}" cy="${cy}" r="${r*.3}" fill="${G}"/><circle cx="${cx}" cy="${cy}" r="${r*.12}" fill="#5E1B16"/></g>`; };
  const coach=(x)=>`<g transform="translate(${x} 0)"><g class="body">
    <path d="M1 14q46-8 92 0v3H1z" fill="#2B2F36"/><rect x="2" y="17" width="90" height="32" rx="2.5" fill="url(#cg)"/>
    ${[9,23,37,51,65].map(v=>`<rect x="${v}" y="22" width="10" height="11" rx="2" fill="url(#win)"/><rect x="${v}" y="22" width="10" height="3" rx="1.5" fill="#fff" opacity=".25"/>`).join('')}
    <rect x="80" y="22" width="7" height="22" rx="1.5" fill="#1D3A2B"/><circle cx="85.5" cy="33" r=".9" fill="${G}"/>
    <rect x="2" y="37" width="90" height="1.6" fill="${G}"/><rect x="2" y="19" width="90" height="1" fill="${G}" opacity=".7"/><rect x="2" y="44" width="90" height="5" fill="#1D3A2B"/></g>
    <rect x="0" y="49" width="94" height="3" fill="${K}"/>${spokes(16,59,6.5)}${spokes(30,59,6.5)}${spokes(64,59,6.5)}${spokes(78,59,6.5)}<rect x="92" y="46" width="8" height="2" fill="${K}"/></g>`;
  const tender=x=>`<g transform="translate(${x} 0)"><g class="body"><path d="M6 21q24-10 48 0z" fill="#2A2A2A"/><circle cx="20" cy="18" r="2" fill="#3A3A3A"/><circle cx="34" cy="17" r="2.4" fill="#333"/><circle cx="44" cy="19" r="1.8" fill="#3A3A3A"/>
    <rect x="4" y="21" width="52" height="28" rx="2.5" fill="url(#bk)"/><rect x="8" y="26" width="44" height="1.6" fill="${G}"/><rect x="8" y="42" width="44" height="1.6" fill="${G}"/>
    <text x="30" y="37.5" font-size="7.5" letter-spacing="1" fill="${G}" font-family="Rawline,Raleway,'Segoe UI',sans-serif" font-weight="800" text-anchor="middle">SUFER</text></g>
    <rect x="2" y="49" width="56" height="3" fill="${K}"/>${spokes(16,59,7)}${spokes(44,59,7)}<rect x="56" y="46" width="8" height="2" fill="${K}"/></g>`;
  const loco=x=>`<g transform="translate(${x} 0)">
    <path d="M140 49h10l7 15h-17z" fill="${R}"/><path d="M143 53h8M144 57h9M145 61h9" stroke="#5E1B16" stroke-width="1"/>
    <g class="body">
      <rect x="8" y="8" width="46" height="5" rx="2" fill="#2B2F36"/><rect x="12" y="13" width="38" height="36" rx="1.5" fill="url(#cab)"/>
      <rect x="18" y="18" width="12" height="12" rx="2" fill="url(#win)"/><rect x="34" y="18" width="10" height="12" rx="2" fill="url(#win)"/>
      <text x="31" y="43.5" font-size="9.5" letter-spacing=".6" fill="${G}" font-family="Rawline,Raleway,'Segoe UI',sans-serif" font-weight="800" text-anchor="middle">ANTT</text>
      <rect x="48" y="24" width="88" height="24" rx="4" fill="url(#bk)"/><rect x="128" y="21" width="12" height="28" rx="3" fill="#2B2F36"/>
      <path d="M62 24v24M82 24v24M104 24v24" stroke="${G}" stroke-width="1.8"/><path d="M50 30h84" stroke="#fff" stroke-width=".8" opacity=".18"/>
      <path d="M85 24a8 8 0 0 1 16 0z" fill="${G}"/><rect x="91" y="14" width="4" height="4" rx="1" fill="${G}"/>
      <path d="M64 24a6 6 0 0 1 12 0z" fill="#2B2F36"/>
      <path d="M126 21l2-11-6-6h20l-6 6 2 11z" fill="url(#bk)"/><rect x="121" y="3" width="22" height="2.6" rx="1" fill="${G}"/>
      <rect x="136" y="13" width="8" height="7" rx="1.5" fill="${G}"/><circle cx="144" cy="16.5" r="2.4" fill="#FFF6C8"/><path d="M146 14 L176 8 L176 26 L146 19Z" fill="url(#lamp)"/>
      <rect x="10" y="48" width="134" height="3" fill="${R}"/>
    </g>
    ${spokes(62,54,11)}${spokes(88,54,11)}${spokes(114,54,11)}${spokes(134,59,6)}${spokes(30,59,6)}
    <g class="rod"><rect x="60" y="53" width="56" height="2.8" rx="1.4" fill="#D4D9E0"/><circle cx="62" cy="54.4" r="1.7" fill="${G}"/><circle cx="88" cy="54.4" r="1.7" fill="${G}"/><circle cx="114" cy="54.4" r="1.7" fill="${G}"/></g>
  </g>`;
  const W=262+180;
  $('#mf').innerHTML=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} 66"><defs>
    <linearGradient id="bk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3C4250"/><stop offset=".45" stop-color="#1C2028"/><stop offset="1" stop-color="#0E1116"/></linearGradient>
    <linearGradient id="cab" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8E2B24"/><stop offset="1" stop-color="#5E1B16"/></linearGradient>
    <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2F6B4C"/><stop offset="1" stop-color="#1D4A33"/></linearGradient>
    <linearGradient id="win" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF4C9"/><stop offset="1" stop-color="#F3C969"/></linearGradient>
    <linearGradient id="lamp" x1="0" x2="1"><stop offset="0" stop-color="#FFF3B0" stop-opacity=".5"/><stop offset="1" stop-color="#FFF3B0" stop-opacity="0"/></linearGradient></defs>
    <ellipse cx="${W/2-10}" cy="65.5" rx="${W/2-10}" ry="1.6" fill="#0A2A5E" opacity=".14"/>${coach(0)}${coach(98)}${tender(196)}${loco(262)}</svg>`;
  const mf=$('#mf'), chx=(262+132)/W, chy=3/66;
  for(let i=0;i<8;i++){ const d=document.createElement('span'); d.className='puff'; d.style.left=`calc(${(chx*100).toFixed(2)}% - 9px)`; d.style.top=`calc(${(chy*100).toFixed(2)}% - 12px)`; d.style.animationDelay=`${-i*0.35}s`; mf.appendChild(d); }
  const cyx=(262+146)/W;
  for(let i=0;i<3;i++){ const d=document.createElement('span'); d.className='steam'; d.style.left=`calc(${(cyx*100).toFixed(2)}% - 6px)`; d.style.bottom='4px'; d.style.animationDelay=`${-i*0.33}s`; mf.appendChild(d); }
})();

/* ---------- aviso inicial: aparece a cada nova sessão do navegador ---------- */
const modal=$('#modal');
const openM=()=>{ modal.classList.add('on'); $('#ok').focus(); };
const closeM=()=>{ modal.classList.remove('on'); try{ sessionStorage.setItem('saffp_aviso','1'); }catch(e){} };
$('#ok').onclick=closeM; $('#reopen').onclick=openM;
modal.onclick=e=>{ if(e.target===modal) closeM(); };
document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&modal.classList.contains('on')) closeM(); });
if(/mock/.test(location.search)) $('#mocknav').hidden=false;
let seen=false; try{ seen=sessionStorage.getItem('saffp_aviso')==='1'; }catch(e){}
if(!seen && !/semaviso/.test(location.hash)) openM();
