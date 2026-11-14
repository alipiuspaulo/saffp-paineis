/* Motor dos painéis SAFF-P / ANTT — lê a camada ao vivo do ArcGIS Online e monta
   cartões, filtros, gráficos (ECharts), mapa (ArcGIS Maps SDK), tabela e galeria. */
(function(){
'use strict';
const C = window.PAINEL;
const root = document.documentElement.style;
Object.entries({'--p':C.theme.primary,'--pd':C.theme.dark,'--ps':C.theme.soft,'--hd':C.theme.header})
  .forEach(([k,v])=>root.setProperty(k,v));
if(C.theme.headerBg) root.setProperty('--hdbg',C.theme.headerBg);
if(C.theme.headerBorder) root.setProperty('--hdbd',C.theme.headerBorder);
if(C.theme.button){ root.setProperty('--btn',C.theme.button); root.setProperty('--btnt',C.theme.buttonText||'#14213D'); root.setProperty('--btnh',C.theme.buttonHover||C.theme.button); }

const LOGO='https://imagem-govfed.maps.arcgis.com/sharing/rest/content/items/b9b84e3d709e4bd9af5e652588ace76e/resources/images/logo_antt_header.png';
const UFSVC='https://services.arcgis.com/4CZwpdWHGNPLU7QQ/arcgis/rest/services/UF/FeatureServer/0';
const UFREG={AC:'Norte',AM:'Norte',AP:'Norte',PA:'Norte',RO:'Norte',RR:'Norte',TO:'Norte',AL:'Nordeste',BA:'Nordeste',CE:'Nordeste',MA:'Nordeste',PB:'Nordeste',PE:'Nordeste',PI:'Nordeste',RN:'Nordeste',SE:'Nordeste',DF:'Centro-Oeste',GO:'Centro-Oeste',MS:'Centro-Oeste',MT:'Centro-Oeste',ES:'Sudeste',MG:'Sudeste',RJ:'Sudeste',SP:'Sudeste',PR:'Sul',RS:'Sul',SC:'Sul'};
const REGIOES=['Norte','Nordeste','Centro-Oeste','Sudeste','Sul'];
const PALETTE=['#1C5FAD','#E0A800','#7B3FA0','#1E9E5A','#C2410C','#0A91A8','#A3214F'];
const OTHER='#9AA4B2', NI='Não informado';
const ICONS={
  doc:'<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h6M10 16h6"/>',
  check:'<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  building:'<path d="M4 21V5l8-2v18M12 21V9l8 2v10M4 21h16M7 8h2M7 12h2M7 16h2M15 14h2M15 17h2"/>',
  pin:'<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  train:'<rect x="6" y="2.5" width="12" height="13" rx="3"/><path d="M6 9.5h12M9.5 5.5h5"/><circle cx="9" cy="12.5" r=".9" fill="currentColor"/><circle cx="15" cy="12.5" r=".9" fill="currentColor"/><path d="M9 15.5 6.5 21.5M15 15.5l2.5 6M7.6 19h8.8"/>',
  camera:'<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  alert:'<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17v.5"/>',
  leaf:'<path d="M5 19c0-8 5-13 15-14-1 10-6 15-14 15"/><path d="M5 19l7-7"/>',
  sign:'<path d="M12 3v18M6 5h11l2 3-2 3H6zM7 21h10"/>',
  clip:'<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h4"/>',
  injury:'<circle cx="12" cy="12" r="9"/><path d="M12 7v10M7 12h10"/>',
  ribbon:'<path d="M12 3a4 4 0 0 0-4 4c0 3 4 7 4 7s4-4 4-7a4 4 0 0 0-4-4z"/><path d="M9 13l-3 8 3-2 2 2 1-5M15 13l3 8-3-2-2 2-1-5"/>',
  users:'<circle cx="9" cy="9" r="3"/><circle cx="17" cy="10" r="2.4"/><path d="M3.5 19c.6-3 2.8-4.6 5.5-4.6S13.9 16 14.5 19M15 14.6c2.6 0 4.7 1.4 5.3 4.4"/>',
  hourglass:'<path d="M7 3h10M7 21h10M8 3c0 5 8 6 8 9s-8 4-8 9M16 3c0 5-8 6-8 9s8 4 8 9"/>'
};
const icon=k=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${ICONS[k]||ICONS.doc}</svg>`;
const nf=(v,d=0)=>(+v||0).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d});
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fold=s=>String(s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
const natural=(a,b)=>String(a).localeCompare(String(b),'pt-BR',{numeric:true});
window.PAINEL_UTIL={UFREG,nf,fold,NI};
/* marcadores ilustrados (SVG em data-URL) para o mapa e as legendas */
const MKC={};
function markerURL(v){
  const ic=C.map&&C.map.icons&&C.map.icons[v]; if(!ic) return null;
  if(MKC[v]) return MKC[v];
  const col=catColor(C.map.colorBy,v,C.map.colors);
  const s=`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 48 48"><circle cx="24" cy="25.5" r="20" fill="#000" opacity=".25"/><circle cx="24" cy="24" r="20.5" fill="${col}" stroke="#fff" stroke-width="3"/><g transform="translate(12 12)" fill="none" stroke="#fff" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">${ic.glyph}</g></svg>`;
  return MKC[v]='data:image/svg+xml;base64,'+btoa(s);
}
const legendMark=(v,col)=>{ const u=markerURL(v); return u?`<img class="mk" src="${u}" alt="">`:`<i class="dot" style="background:${col}"></i>`; };

/* ---------- estrutura da página ---------- */
const slots={}; (C.charts||[]).forEach((c,i)=>{c._id='ch'+i; (slots[c.slot]=slots[c.slot]||[]).push(c);});
const cardChart=c=>`<div class="card" id="${c._id}_card" style="display:flex;flex-direction:column">
  <div class="card-h"><h2>${esc(c.title)}</h2><span class="sp"></span><span class="hint">${esc(c.hint||'clique para filtrar')}</span></div>
  ${c.type==='yn'?`<div class="yn" id="${c._id}"></div>`:`<div id="${c._id}" class="chart" style="height:${c.height||(c.type==='donut'?200:300)}px"></div>`}
  ${c.type==='donut'?`<div class="legend" id="${c._id}_lg"></div>`:''}
  ${c.legendItems?`<div class="blegend">${c.legendItems.map(x=>`<span><i style="background:${x.color}"></i>${esc(x.label)}</span>`).join('')}</div>`:''}
  ${c.type==='hbar'?`<button class="more" id="${c._id}_more" hidden></button>`:''}
</div>`;
const app=document.getElementById('app');
app.innerHTML=`
<header class="top ${C.theme.headerLight?'light-end':''}"><div class="top-in">
  <img class="logo" src="${LOGO}" alt="ANTT – Agência Nacional de Transportes Terrestres">
  <span class="vsep" aria-hidden="true"></span>
  <div><h1>${esc(C.title)}</h1><div class="sub">${esc(C.subtitle||'')}</div></div>
  <span class="sp"></span>
  ${C.home?`<a class="pill btn-home" href="${C.home}" target="_blank" rel="noopener">⌂ Página inicial SAFF-P</a>`:''}
  <span class="pill">Dados em Tempo Real</span>
</div></header>
${C.timelapse?`<div class="tabs" role="tablist" aria-label="Seções do painel">
  <button class="tab on" role="tab" aria-selected="true" data-t="ov">${icon('doc')}Visão geral</button>
  <button class="tab" role="tab" aria-selected="false" data-t="tl">${icon('clock')}${esc(C.timelapse.tabTitle||'Histórico e alertas')}<span class="abadge" id="aBadge" hidden></span></button>
  <span class="sp"></span><span class="newdata" id="newData" hidden></span></div>`:''}
<nav class="filters" aria-label="Filtros"><div class="fgroup" id="fbox" style="gap:10px 18px"></div>
  <div class="active" id="fActive"></div><button class="clear" id="fClear" hidden>Limpar filtros</button></nav>
<main class="wrap">
  <div id="loading" class="loading">Carregando dados da camada…</div>
  <section class="kpis ov" id="kpis" style="--nk:${(C.kpis||[]).length}"></section>
  <section class="main ov">
    <div class="col">${(slots.left||[]).map(cardChart).join('')}</div>
    <div class="card mapcard">
      <div class="card-h"><h2>${esc((C.map&&C.map.title)||'Mapa')}</h2><span class="sp"></span>
        <label class="hint" for="baseSel">Mapa base</label>
        <select id="baseSel" class="mapsel"><option value="gray-vector">Cinza claro</option><option value="dark-gray-vector">Cinza escuro</option>
        <option value="streets-vector">Ruas</option><option value="topo-vector">Topográfico</option><option value="hybrid">Imagem de satélite</option><option value="osm">OpenStreetMap</option></select></div>
      <div id="map"></div>
    </div>
    <div class="col" style="grid-template-rows:${(slots.right||[]).length>1?'auto 1fr':'1fr'}">${(slots.right||[]).map(cardChart).join('')}</div>
  </section>
  ${C.gallery?`<section class="card ov" id="galCard"><div class="card-h gal-h"><h2>${esc(C.gallery.title)}</h2><span class="hint" id="galCount"></span><span class="sp"></span>
    ${(C.gallery.tags||[]).length?`<div class="seg" id="galTags"></div>`:''}
    <div class="gsize" id="galSize" role="group" aria-label="Tamanho das fotos"><button data-s="200">Compacto</button><button data-s="280" class="on">Médio</button><button data-s="400">Grande</button></div></div>
    <div class="hint" style="padding:0 16px 6px">Clique na foto para abrir o visualizador, com navegação, ampliação e localização no mapa.</div><div class="gallery" id="gallery"></div></section>`:''}
  ${C.timelapse?`<section class="tlpane">
    <div class="tl-grid">
      <div class="card tl-mapcard">
        <div class="card-h"><h2>${esc(C.timelapse.mapTitle||'Linha do tempo dos acidentes')}</h2><span class="sp"></span><span class="hint">${esc(C.timelapse.note||'')}</span></div>
        <div class="tl-ctrl">
          <button id="tlPlay" class="tl-play" aria-label="Pausar">❚❚</button>
          <input type="range" id="tlRange" min="0" max="0" value="0" aria-label="Mês exibido">
          <span class="tl-now" id="tlNow">—</span>
          <label class="hint" for="tlSpeed">Velocidade</label>
          <select id="tlSpeed" class="mapsel"><option value="1300">Lenta</option><option value="650" selected>Normal</option><option value="260">Rápida</option></select>
          <label class="hint tl-acc"><input type="checkbox" id="tlAcc" checked> Acumular ${C.timelapse.unit==='week'?'semanas':'meses'} do ano</label>
        </div>
        <div id="tlMap"></div>
      </div>
      <div class="card alerts">
        <div class="card-h"><h2>Alertas de inclusão</h2><span class="sp"></span><span class="hint">pisca por ${C.timelapse.alertDays||7} dias</span></div>
        <div id="alertHead" class="alert-head"></div>
        <div id="alertList" class="alert-list"></div>
      </div>
    </div>
    <div class="card"><div class="card-h"><h2>${esc(C.timelapse.chartTitle||'Acidentes por mês')}</h2><span class="sp"></span><span class="hint">clique em ${C.timelapse.unit==='week'?'uma semana':'um mês'} para ir até ${C.timelapse.unit==='week'?'ela':'ele'}</span></div>
      <div id="tlChart" class="chart" style="height:250px"></div></div>
  </section>`:''}
  <section class="bottom ov">
    <div class="col" style="grid-template-rows:1fr">${(slots.bottom||[]).map(cardChart).join('')}</div>
    <div class="card"><div class="card-h"><h2>${esc(C.table.title)}</h2><span class="hint" id="tblCount"></span><span class="sp"></span>
      <input class="search" id="tblSearch" type="search" placeholder="Buscar…" aria-label="Buscar na tabela"></div>
      <div class="tbl-wrap"><table id="tbl"><thead><tr>${C.table.columns.map(c=>`<th data-k="${c.f}" class="${c.num?'num':''}">${esc(c.label)}</th>`).join('')}</tr></thead><tbody></tbody></table></div>
      <div class="tbl-note" id="tblNote" hidden></div></div>
  </section>
</main>
<div class="foot">Fonte: camada “${esc(C.sourceName)}”. Dados em tempo real, atualizados em <span id="upd">—</span>.${C.footNote?' '+esc(C.footNote):''}</div>
<div class="lightbox" id="lb" role="dialog" aria-modal="true" aria-label="Visualizador de fotos">
  <div class="lb-main"><div class="lb-stage" id="lbStage"><img alt="" id="lbImg"><button class="nav prev" aria-label="Foto anterior">‹</button><button class="nav next" aria-label="Próxima foto">›</button><span class="lb-count" id="lbCount"></span><span class="lb-tip">clique na foto para ampliar · ← → para navegar · Esc para fechar</span></div>
    <div class="lb-strip" id="lbStrip"></div></div>
  <aside class="lb-side"><button class="x" aria-label="Fechar">×</button><div class="lb-info" id="lbInfo"></div>
    <div class="lb-acts"><button class="bt" id="lbMap">📍 Ver no mapa</button><a class="bt out" id="lbOpen" target="_blank" rel="noopener">Abrir original ↗</a></div></aside>
</div>`;
if(C.map&&C.map.basemap) document.getElementById('baseSel').value=C.map.basemap; else document.getElementById('baseSel').value='hybrid';

/* ---------- dados ---------- */
let D=[], ORDER={}, ATT={};
const S={};
async function fetchAll(){
  let feats=[], offset=0;
  for(;;){
    const p=new URLSearchParams({where:C.where||'1=1',outFields:'*',returnGeometry:'true',outSR:'4326',geometryPrecision:'5',resultOffset:offset,resultRecordCount:2000,f:'json'});
    const j=await (await fetch(C.layer+'/query?'+p)).json();
    if(j.error) throw new Error(j.error.message||'erro na consulta');
    feats=feats.concat(j.features);
    if(!j.features.length || (!j.exceededTransferLimit && j.features.length<2000)) break;
    offset+=j.features.length;
  }
  return feats;
}
function normalize(rows){
  (C.normFields||[]).forEach(f=>{
    const variants={};
    rows.forEach(r=>{ let v=r[f]; v=(v==null||String(v).trim()==='')?NI:String(v).trim(); r[f]=v; const k=fold(v); (variants[k]=variants[k]||{})[v]=((variants[k]||{})[v]||0)+1; });
    const canon={}; Object.entries(variants).forEach(([k,m])=>{ canon[k]=Object.entries(m).sort((a,b)=>b[1]-a[1])[0][0]; });
    rows.forEach(r=>{ r[f]=canon[fold(r[f])]; });
  });
}
async function loadAttachments(){
  if(!C.gallery) return;
  const ids=D.map(r=>r._oid); ATT={};
  for(let i=0;i<ids.length;i+=200){
    const p=new URLSearchParams({objectIds:ids.slice(i,i+200).join(','),returnUrl:'true',f:'json'});
    const j=await (await fetch(C.layer+'/queryAttachments?'+p)).json();
    (j.attachmentGroups||[]).forEach(g=>{ ATT[g.parentObjectId]=g.attachmentInfos.filter(a=>/^image\//.test(a.contentType)); });
  }
  window.__ATTN=Object.fromEntries(Object.entries(ATT).map(([k,v])=>[k,v.length]));
}

/* ---------- filtros ---------- */
const pass=(r,skip)=>Object.entries(S).every(([k,v])=>k===skip||v==null||r[k]===v);
const rows=skip=>D.filter(r=>pass(r,skip));
function set(k,v){ S[k]=(S[k]===v?null:v); if(k==='REGIAO'&&S.UF&&S.REGIAO&&UFREG[S.UF]!==S.REGIAO) S.UF=null; render(); }
const count=(rs,f)=>{const m=new Map(); rs.forEach(r=>m.set(r[f],(m.get(r[f])||0)+1)); return m;};
function renderFilters(){
  const box=document.getElementById('fbox');
  box.innerHTML=(C.filters||[]).map((fd,i)=>{
    const base=rows(fd.field), m=count(base,fd.field);
    let vals=[...m.keys()].filter(v=>v!==NI||fd.showNI);
    if(fd.type==='chips'){
      if(fd.order) vals=fd.order.filter(v=>m.has(v)||true); else vals.sort(natural);
      return `<div class="fgroup"><span class="flabel">${esc(fd.label)}</span><div class="seg">
        <button class="chip ${S[fd.field]==null?'on':''}" data-f="${i}" data-v="">${esc(fd.allLabel||'Todos')}<span class="n">${base.length}</span></button>
        ${vals.map(v=>`<button class="chip ${S[fd.field]===v?'on':''}" data-f="${i}" data-v="${esc(v)}" ${m.get(v)?'':'disabled'}>${esc(v)}<span class="n">${m.get(v)||0}</span></button>`).join('')}</div></div>`;
    }
    vals.sort(natural);
    return `<div class="fgroup"><span class="flabel">${esc(fd.label)}</span><select data-f="${i}" aria-label="${esc(fd.label)}">
      <option value="">${esc(fd.allLabel||'Todos')}</option>${vals.map(v=>`<option value="${esc(v)}" ${S[fd.field]===v?'selected':''}>${esc(v)} (${m.get(v)})</option>`).join('')}</select></div>`;
  }).join('');
  box.querySelectorAll('.chip').forEach(b=>b.onclick=()=>{ const fd=C.filters[b.dataset.f]; S[fd.field]=b.dataset.v||null; if(fd.field==='REGIAO'&&S.UF&&S.REGIAO&&UFREG[S.UF]!==S.REGIAO) S.UF=null; render(); });
  box.querySelectorAll('select').forEach(s=>s.onchange=()=>{ const fd=C.filters[s.dataset.f]; S[fd.field]=s.value||null; render(); });
  const lab=f=>{ const fd=(C.filters||[]).find(x=>x.field===f); if(fd) return fd.label; const ch=(C.charts||[]).find(x=>x.field===f); return ch?ch.title:f; };
  const act=Object.entries(S).filter(([k,v])=>v!=null);
  const a=document.getElementById('fActive');
  a.innerHTML=act.map(([k,v])=>`<button class="tag" data-k="${esc(k)}" title="${esc(lab(k))}">${esc(String(v).length>34?String(v).slice(0,34)+'…':v)}</button>`).join('');
  a.querySelectorAll('.tag').forEach(b=>b.onclick=()=>{ S[b.dataset.k]=null; render(); });
  document.getElementById('fClear').hidden=!act.length;
}
document.getElementById('fClear').onclick=()=>{ Object.keys(S).forEach(k=>S[k]=null); render(); };

/* ---------- cartões ---------- */
function fmtVal(v,k){ if(typeof v==='string') return esc(v); return nf(v,k.dec||0)+(k.unit?`<small>${esc(k.unit)}</small>`:''); }
function renderKPIs(f){
  document.getElementById('kpis').innerHTML=(C.kpis||[]).map((k,i)=>{
    const v=k.value(f,D), s=k.sub?k.sub.value(f,D):null;
    const ac=C.theme.kpiAccents?C.theme.kpiAccents[i%C.theme.kpiAccents.length]:null;
    const style=`style="${k.sub&&k.sub.color?`--kc:${k.sub.color};--kt:${k.sub.textColor||k.sub.color};`:''}${ac?`--ka:${ac.c};--kab:${ac.bg};--kaf:${ac.fg};`:''}"`;
    return `<div class="card kpi" ${style}><div class="ic">${icon(k.icon)}</div><div class="lb">${esc(k.label)}</div>
      <div class="vl">${fmtVal(v,k)}${k.note?`<small style="font-size:12px;color:var(--muted);font-weight:500"> ${esc(k.note(f,D))}</small>`:''}</div>
      ${k.sub?`<div class="ft"><span class="k">${esc(k.sub.label)}</span><b>${fmtVal(s,k.sub)}</b></div>`:''}</div>`;
  }).join('');
}

/* ---------- gráficos ---------- */
const EC={};
const catColor=(field,v,fixed)=>{ if(fixed&&fixed[v]) return fixed[v]; if(v===NI) return '#C9D2DE'; const i=(ORDER[field]||[]).indexOf(v); return i>=0&&i<PALETTE.length?PALETTE[i]:OTHER; };
/* cor das barras: fixa por categoria (colors), paleta categórica (palette:'cat'), rampa sequencial (palette:'seq') ou cor do tema */
const SEQ=['#BFD6EF','#0A2A5E'];
function mix(a,b,t){ const h=x=>[1,3,5].map(i=>parseInt(x.slice(i,i+2),16)); const A=h(a),B=h(b); return '#'+A.map((v,i)=>Math.round(v+(B[i]-v)*t).toString(16).padStart(2,'0')).join(''); }
function barColor(c,v,list){
  if(c.colors) return catColor(c.field,v,c.colors);
  if(c.palette==='cat') return catColor(c.field,v);
  if(c.palette==='seq'){ const ks=list.map(x=>x[0]).sort(natural); const i=ks.indexOf(v); return mix(SEQ[0],SEQ[1],ks.length>1?i/(ks.length-1):1); }
  return S[c.field]===v?C.theme.dark:C.theme.primary;
}
function ec(id,c){ if(!EC[id]){ EC[id]=echarts.init(document.getElementById(id)); if(c) EC[id].on('click',p=>{ if(p.componentType==='series'&&p.name!=null&&p.name!=='') set(c.field,p.name); }); } return EC[id]; }
const fullName=(c,v)=>(c.names&&c.names[v]?`${esc(v)} · ${esc(c.names[v])}`:esc(v))+(c.groups&&c.groups[v]?`<br><span style="color:#6A7486">Grupo: ${esc(c.groups[v])}</span>`:'');
function renderChart(c){
  const base=rows(c.field);
  if(c.type==='yn') return renderYN(c);
  const m=count(base,c.field); let list=[...m.entries()].filter(([v])=>v!==NI||c.showNI);
  const tot=list.reduce((s,x)=>s+x[1],0);
  if(c.type==='donut'){
    list.sort((a,b)=>b[1]-a[1]);
    const data=list.map(([v,n])=>({name:v,value:n,itemStyle:{color:catColor(c.field,v,c.colors),opacity:S[c.field]==null||S[c.field]===v?1:.25}}));
    ec(c._id,c).setOption({tooltip:{trigger:'item',formatter:p=>`<b>${esc(p.name)}</b><br>${nf(p.value)} · ${nf(p.percent,1)}%`},
      series:[{type:'pie',radius:['58%','84%'],center:['50%','52%'],padAngle:1.5,itemStyle:{borderColor:'#fff',borderWidth:2,borderRadius:3},
        label:{show:true,position:'center',formatter:()=>`{v|${nf(S[c.field]!=null?(m.get(S[c.field])||0):tot)}}\n{l|${esc(c.centerLabel||'registros')}}`,
          rich:{v:{fontSize:26,fontWeight:700,color:'#14213D',lineHeight:30},l:{fontSize:12,color:'#6A7486'}}},
        emphasis:{scale:true,scaleSize:4,label:{show:true}},labelLine:{show:false},data}]},true);
    const lg=document.getElementById(c._id+'_lg');
    lg.innerHTML=data.slice(0,c.legendMax||8).map(d=>`<button class="lg ${S[c.field]!=null&&S[c.field]!==d.name?'off':''}" data-v="${esc(d.name)}">${C.map&&C.map.colorBy===c.field?legendMark(d.name,d.itemStyle.color):`<i class="dot" style="background:${d.itemStyle.color}"></i>`}<span>${esc(c.labels&&c.labels[d.name]||d.name)}</span><span class="c">${nf(d.value)}</span><span class="pc">${tot?nf(d.value/tot*100,1):0}%</span></button>`).join('');
    lg.querySelectorAll('.lg').forEach(b=>b.onclick=()=>set(c.field,b.dataset.v));
    return;
  }
  if(c.type==='hbar'){
    list.sort((a,b)=>b[1]-a[1]||natural(a[0],b[0]));
    const N=c.top||10, total=list.length, rest=list.slice(N);
    if(!c._all) list=list.slice(0,N);
    list.reverse();
    const h=Math.max(c.height||300,list.length*26+30);
    document.getElementById(c._id).style.height=h+'px'; ec(c._id,c).resize();
    ec(c._id,c).setOption({grid:{left:8,right:40,top:6,bottom:6,containLabel:true},
      tooltip:{trigger:'item',formatter:p=>`<b>${fullName(c,p.name)}</b><br>${nf(p.value)} ${esc(C.unitLabel||'registros')} · ${tot?nf(p.value/tot*100,1):0}%<br><span style="color:#6A7486">clique para filtrar</span>`},
      xAxis:{type:'value',splitLine:{lineStyle:{color:'#EDF0F4'}},axisLabel:{color:'#6A7486',fontSize:11}},
      yAxis:{type:'category',data:list.map(x=>x[0]),axisTick:{show:false},axisLine:{lineStyle:{color:'#DDE3EB'}},axisLabel:{color:'#14213D',fontSize:12,width:c.labelWidth||170,overflow:'truncate'}},
      series:[{type:'bar',barMaxWidth:16,data:list.map(([v,n])=>({value:n,itemStyle:{color:barColor(c,v,list),opacity:S[c.field]==null||S[c.field]===v?1:.3,borderRadius:[0,4,4,0]}})),
        label:{show:true,position:'right',color:'#4A5568',fontSize:11,formatter:p=>nf(p.value)}}]},true);
    const more=document.getElementById(c._id+'_more');
    more.hidden=total<=N; more.textContent=c._all?`Mostrar apenas os ${N} maiores`:`+ ${rest.length} categorias (${nf(rest.reduce((s,x)=>s+x[1],0))} registros) · ver todas →`;
    more.onclick=()=>{c._all=!c._all; renderChart(c);};
    return;
  }
  // vbar
  if(c.order) list.sort((a,b)=>c.order.indexOf(a[0])-c.order.indexOf(b[0])); else if(c.sort==='label') list.sort((a,b)=>natural(a[0],b[0])); else list.sort((a,b)=>b[1]-a[1]);
  ec(c._id,c).setOption({grid:{left:8,right:12,top:22,bottom:4,containLabel:true},
    tooltip:{trigger:'item',formatter:p=>`<b>${esc(p.name)}</b><br>${nf(p.value)}`},
    xAxis:{type:'category',data:list.map(x=>x[0]),axisTick:{show:false},axisLine:{lineStyle:{color:'#DDE3EB'}},axisLabel:{color:'#14213D',fontSize:12,interval:0,rotate:list.length>8?30:0,width:90,overflow:'truncate'}},
    yAxis:{type:'value',splitLine:{lineStyle:{color:'#EDF0F4'}},axisLabel:{color:'#6A7486',fontSize:11}},
    series:[{type:'bar',barMaxWidth:30,data:list.map(([v,n])=>({value:n,itemStyle:{color:barColor(c,v,list),opacity:S[c.field]==null||S[c.field]===v?1:.3,borderRadius:[4,4,0,0]}})),
      label:{show:true,position:'top',color:'#4A5568',fontSize:11,formatter:p=>nf(p.value)}}]},true);
}
function renderYN(c){
  const el=document.getElementById(c._id);
  el.innerHTML=c.items.map(it=>{
    const base=rows(it.field), m=count(base,it.field), n=base.length||1;
    const good=m.get(it.good)||0, bad=m.get(it.bad)||0, oth=base.length-good-bad;
    const seg=(v,n2,col,lbl)=>n2?`<i style="width:${n2/n*100}%;background:${col}" title="${esc(lbl)}: ${n2}" data-f="${it.field}" data-v="${esc(v)}"></i>`:'';
    return `<div class="yn-row"><span class="q">${esc(it.label)}</span>
      <div class="yn-bar">${seg(it.good,good,'#1E9E5A',it.good)}${seg(it.bad,bad,'#C2410C',it.bad)}${seg(NI,oth,'#C9D2DE',NI)}</div>
      <span class="ct"><span>● ${esc(it.good)}: <b>${good}</b></span><span style="color:#9A3412">● ${esc(it.bad)}: <b>${bad}</b>${S[it.field]?` · filtro: ${esc(S[it.field])}`:''}</span></span></div>`;
  }).join('');
  el.querySelectorAll('.yn-bar i').forEach(i=>{ i.style.cursor='pointer'; i.onclick=()=>set(i.dataset.f,i.dataset.v); });
}

/* ---------- tabela ---------- */
let sortK=C.table.sort&&C.table.sort.f, sortDir=(C.table.sort&&C.table.sort.dir)||-1;
function cell(c,r){ const v=c.get?c.get(r):r[c.f]; if(c.num) return nf(v,c.dec||0); if(c.color){ const col=catColor(c.color,r[c.color],(C.map&&C.map.colorBy===c.color)?C.map.colors:null); return `<span class="st"><i style="background:${col}"></i>${esc(v)}</span>`; } return esc(v); }
function renderTable(f){
  const q=fold(document.getElementById('tblSearch').value||'');
  let t=f.filter(r=>!q||fold(C.table.columns.map(c=>c.get?c.get(r):r[c.f]).join(' ')).includes(q));
  if(sortK){ const col=C.table.columns.find(c=>c.f===sortK)||{}; const g=r=>col.sortGet?col.sortGet(r):(col.get?col.get(r):r[sortK]); t.sort((a,b)=>{const x=g(a),y=g(b); return (typeof x==='number'&&typeof y==='number'?x-y:natural(x??'',y??''))*sortDir;}); }
  const max=C.table.max||400;
  document.querySelector('#tbl tbody').innerHTML=t.slice(0,max).map(r=>`<tr>${C.table.columns.map(c=>`<td class="${c.num?'num':''}">${cell(c,r)}</td>`).join('')}</tr>`).join('');
  document.getElementById('tblCount').textContent=`${nf(t.length)} de ${nf(D.length)}`;
  const note=document.getElementById('tblNote'); note.hidden=t.length<=max; note.textContent=`Mostrando os primeiros ${nf(max)} registros. Use os filtros ou a busca para refinar.`;
  document.querySelectorAll('#tbl th').forEach(th=>th.setAttribute('aria-sort',th.dataset.k===sortK?(sortDir>0?'ascending':'descending'):'none'));
}
document.querySelectorAll('#tbl th').forEach(th=>th.onclick=()=>{ const k=th.dataset.k; if(sortK===k) sortDir*=-1; else {sortK=k; sortDir=th.classList.contains('num')?-1:1;} renderTable(rows()); });
document.getElementById('tblSearch').oninput=()=>renderTable(rows());

/* ---------- galeria e visualizador de fotos ---------- */
let GAL=[], GALALL=[], gi=0, galTag=null;
function renderGallery(f){
  if(!C.gallery) return;
  GALALL=[]; f.forEach(r=>(ATT[r._oid]||[]).forEach((a,k,arr)=>GALALL.push({r,a,k:k+1,n:arr.length})));
  if(C.gallery.sort) GALALL.sort((x,y)=>C.gallery.sort(x.r,y.r));
  const tags=C.gallery.tags||[];
  const tb=document.getElementById('galTags');
  if(tb){ tb.innerHTML=`<button class="chip ${galTag==null?'on':''}" data-t="">Todas<span class="n">${GALALL.length}</span></button>`+tags.map((t,i)=>{ const n=GALALL.filter(x=>t.test(x.r,x.a)).length; return `<button class="chip ${galTag===i?'on':''}" data-t="${i}" ${n?'':'disabled'}>${esc(t.label)}<span class="n">${n}</span></button>`; }).join('');
    tb.querySelectorAll('.chip').forEach(c=>c.onclick=()=>{ galTag=c.dataset.t===''?null:+c.dataset.t; renderGallery(rows()); }); }
  GAL=galTag==null?GALALL:GALALL.filter(x=>tags[galTag].test(x.r,x.a));
  document.getElementById('galCount').textContent=`${nf(GAL.length)} fotos de ${nf(new Set(GAL.map(x=>x.r._oid)).size)} levantamentos`;
  const g=document.getElementById('gallery');
  g.innerHTML=GAL.length?GAL.map((x,i)=>{ const b=C.gallery.badge&&C.gallery.badge(x.r,x.a);
    return `<button class="ph" data-i="${i}" aria-label="Abrir foto ${i+1}"><img loading="lazy" decoding="async" src="${x.a.url}" alt="${esc(C.gallery.caption(x.r))}">
      ${b?`<span class="badge">${esc(b)}</span>`:''}${x.n>1?`<span class="multi">${x.k}/${x.n}</span>`:''}<span class="cap"><b>${esc(C.gallery.caption(x.r))}</b>${esc(C.gallery.sub(x.r))}</span></button>`; }).join('')
    :'<div class="hint" style="padding:12px">Nenhuma foto para os filtros atuais.</div>';
  g.querySelectorAll('.ph').forEach(b=>b.onclick=()=>openLB(+b.dataset.i));
}
document.querySelectorAll('#galSize button').forEach(b=>b.onclick=()=>{ document.querySelectorAll('#galSize button').forEach(x=>x.classList.toggle('on',x===b)); document.getElementById('gallery').style.setProperty('--ph',b.dataset.s+'px'); });
const lb=document.getElementById('lb'), lbImg=document.getElementById('lbImg'), lbStage=document.getElementById('lbStage');
const closeLB=()=>{ lb.classList.remove('on'); lbStage.classList.remove('zoom'); document.body.style.overflow=''; };
function openLB(i){
  if(!GAL.length) return; gi=(i+GAL.length)%GAL.length; const x=GAL[gi];
  lbStage.classList.remove('zoom'); lbImg.src=x.a.url; lbImg.alt=C.gallery.caption(x.r);
  document.getElementById('lbCount').textContent=`${gi+1} / ${GAL.length}`;
  const info=C.gallery.info?C.gallery.info(x.r,x.a):[];
  document.getElementById('lbInfo').innerHTML=`<div class="k">${esc(C.gallery.kicker||'Registro fotográfico')}</div><h3>${esc(C.gallery.caption(x.r))}</h3>
    <div class="s">${esc(C.gallery.sub(x.r))}${x.n>1?` · foto ${x.k} de ${x.n} deste levantamento`:''}</div>
    ${info.length?`<table class="attr">${info.filter(([,v])=>v!=null&&v!=='').map(([l,v])=>`<tr><th>${esc(l)}</th><td>${esc(v)}</td></tr>`).join('')}</table>`:''}`;
  document.getElementById('lbOpen').href=x.a.url;
  document.getElementById('lbMap').hidden=x.r._x==null;
  const st=document.getElementById('lbStrip');
  const from=Math.max(0,gi-12), to=Math.min(GAL.length,gi+13);
  st.innerHTML=GAL.slice(from,to).map((y,k)=>`<button class="${from+k===gi?'on':''}" data-i="${from+k}" aria-label="Foto ${from+k+1}"><img loading="lazy" src="${y.a.url}" alt=""></button>`).join('');
  st.querySelectorAll('button').forEach(b=>b.onclick=()=>openLB(+b.dataset.i));
  const cur=st.querySelector('.on'); if(cur) cur.scrollIntoView({inline:'center',block:'nearest'});
  lb.classList.add('on'); document.body.style.overflow='hidden';
}
lbImg.onclick=()=>lbStage.classList.toggle('zoom');
lb.querySelector('.x').onclick=closeLB;
lb.querySelector('.prev').onclick=()=>openLB(gi-1); lb.querySelector('.next').onclick=()=>openLB(gi+1);
lb.onclick=e=>{ if(e.target===lb) closeLB(); };
document.getElementById('lbMap').onclick=()=>{ const x=GAL[gi]; closeLB(); focusOnMap(x.r._oid); };
document.addEventListener('keydown',e=>{ if(!lb.classList.contains('on')) return; if(e.key==='Escape') closeLB(); if(e.key==='ArrowLeft') openLB(gi-1); if(e.key==='ArrowRight') openLB(gi+1); });
window.PAINEL_OPEN_PHOTO=(oid)=>{ const i=GAL.findIndex(x=>x.r._oid===oid); if(i>=0) openLB(i); };
/* leva o mapa até o registro e abre o popup */
function focusOnMap(oid){
  const r=BYOID[oid]; if(!r||r._x==null||!view) return;
  document.querySelector('.mapcard').scrollIntoView({behavior:'smooth',block:'center'});
  view.goTo({center:[r._x,r._y],zoom:16},{duration:900}).then(()=>ptLayer.queryFeatures({objectIds:[oid],returnGeometry:true,outFields:['*']}))
    .then(fs=>{ if(fs.features.length) view.openPopup({features:fs.features,location:fs.features[0].geometry}); }).catch(()=>{});
}

/* ---------- mapa ---------- */
let view=null, ptLayer=null, ptView=null, hlLayer=null, lastKey=null, Extent=null;
const q=s=>"'"+String(s).replace(/'/g,"''")+"'";
function mapColor(r){ return catColor(C.map.colorBy,r[C.map.colorBy],C.map.colors); }
function pointRenderer(scale){
  const cats=[...new Set(D.map(r=>String(r[C.map.colorBy])))];
  const sym=v=>{ const u=markerURL(v), ic=C.map.icons&&C.map.icons[v];
    if(u){ const s=(ic.size||20)*(scale||1); return {type:'picture-marker',url:u,width:s,height:s}; }
    return {type:'simple-marker',size:(C.map.size||8)*(scale||1),color:catColor(C.map.colorBy,v,C.map.colors),outline:{color:[255,255,255,.9],width:.8}}; };
  return {type:'unique-value',field:'_cat',defaultSymbol:{type:'simple-marker',size:C.map.size||8,color:OTHER,outline:{color:[255,255,255,.9],width:.8}},
    uniqueValueInfos:cats.map(v=>({value:v,symbol:sym(v),label:C.map.labels&&C.map.labels[v]||v}))};
}
const iconOrder=v=>{ const k=C.map.icons?Object.keys(C.map.icons):[]; const i=k.indexOf(String(v)); return i<0?99:i; };
function pointGraphics(Graphic,extra){
  return D.filter(r=>r._x!=null).map(r=>new Graphic({geometry:{type:'point',longitude:r._x,latitude:r._y},
    attributes:Object.assign({_oid:r._oid,_cat:String(r[C.map.colorBy]),_ord:iconOrder(r[C.map.colorBy])},extra?extra(r):{})}));
}
const popupTpl=()=>({title:f=>{const r=BYOID[f.graphic.attributes._oid]; return esc(C.map.popupTitle(r));},
  content:f=>{const r=BYOID[f.graphic.attributes._oid]; return C.map.popup(r,ATT[r._oid]||[]);}});
function mapLegend(){
  const lg=document.createElement('div'); lg.className='mlegend';
  const cats=[...new Set(D.map(r=>r[C.map.colorBy]))];
  const top=(C.map.icons?Object.keys(C.map.icons):(ORDER[C.map.colorBy]||cats)).filter(v=>cats.includes(v)).slice(0,C.map.legendMax||8);
  lg.innerHTML=`<div class="t">${esc(C.map.legendTitle||'')}</div>`+top.map(v=>`<div class="li">${legendMark(v,catColor(C.map.colorBy,v,C.map.colors))}${esc(C.map.labels&&C.map.labels[v]||v)}</div>`).join('');
  return lg;
}
let heatLayer=null, heatView=null;
function initMap(){ return new Promise(res=>{
  require(['esri/Map','esri/views/MapView','esri/layers/FeatureLayer','esri/Graphic','esri/geometry/Extent','esri/widgets/LayerList','esri/widgets/Expand'],(EMap,MapView,FeatureLayer,Graphic,Ext,LayerList,Expand)=>{
    Extent=Ext; window.__ESRI={EMap,MapView,FeatureLayer,Graphic,LayerList,Expand};
    ptLayer=new FeatureLayer({title:C.map.layerTitle||C.title,source:pointGraphics(Graphic),objectIdField:'_oid',geometryType:'point',spatialReference:{wkid:4326},
      fields:[{name:'_oid',type:'oid'},{name:'_cat',type:'string'},{name:'_ord',type:'integer'}],
      orderBy:[{field:'_ord',order:'ascending'}],
      renderer:pointRenderer(1),popupTemplate:popupTpl()});
    const layers=[];
    if(C.regionFromUF){
      layers.push(new FeatureLayer({url:UFSVC,title:'Limites estaduais',popupEnabled:false,renderer:{type:'simple',symbol:{type:'simple-fill',color:[0,0,0,0],outline:{color:[255,255,255,.55],width:.7}}}}));
      hlLayer=new FeatureLayer({url:UFSVC,listMode:'hide',popupEnabled:false,definitionExpression:'1=0',renderer:{type:'simple',symbol:{type:'simple-fill',color:[255,255,255,.08],outline:{color:[242,183,5,1],width:2}}}});
      layers.push(hlLayer);
    }
    (C.map.extraLayers||[]).forEach(u=>layers.push(new FeatureLayer(Object.assign({popupEnabled:false},u))));
    if(C.map.heatmap){
      heatLayer=new FeatureLayer({title:'Mapa de calor (concentração)',visible:false,source:pointGraphics(Graphic),objectIdField:'_oid',geometryType:'point',spatialReference:{wkid:4326},
        fields:[{name:'_oid',type:'oid'},{name:'_cat',type:'string'},{name:'_ord',type:'integer'}],popupEnabled:false,
        renderer:{type:'heatmap',radius:14,maxDensity:0.04,minDensity:0,colorStops:[{ratio:0,color:'rgba(242,183,5,0)'},{ratio:.15,color:'rgba(242,183,5,.55)'},{ratio:.45,color:'rgba(234,120,20,.8)'},{ratio:.75,color:'rgba(194,40,30,.9)'},{ratio:1,color:'rgba(110,20,20,1)'}]}});
      layers.push(heatLayer);
    }
    layers.push(ptLayer);
    const sel=document.getElementById('baseSel');
    const m=new EMap({basemap:sel.value,layers});
    view=new MapView({container:'map',map:m,center:[-52,-14.5],zoom:4,constraints:{snapToZoom:false},ui:{components:['zoom','attribution']},popup:{dockEnabled:false,dockOptions:{buttonEnabled:false}}});
    view.navigation.mouseWheelZoomEnabled=false;
    view.on('click',()=>{view.navigation.mouseWheelZoomEnabled=true;});
    view.on('pointer-leave',()=>{view.navigation.mouseWheelZoomEnabled=false;});
    view.ui.add(mapLegend(),'bottom-left');
    if(C.map.layerList!==false){
      view.ui.add(new Expand({view,content:new LayerList({view}),expandIcon:'layers',expandTooltip:'Camadas do mapa',group:'tr',expanded:false}),'top-right');
    }
    sel.onchange=e=>{ m.basemap=e.target.value; };
    if(heatLayer) view.whenLayerView(heatLayer).then(lv=>{ heatView=lv; if(ptView) renderMap(rows(),true); });
    view.whenLayerView(ptLayer).then(lv=>{ ptView=lv; res(); });
  });
}); }
let BYOID={};
function renderMap(f,noZoom){
  if(!view||!ptView) return;
  const flt=f.length===D.length?null:{objectIds:f.map(r=>r._oid)};
  ptView.filter=flt; if(heatView) heatView.filter=flt;
  if(noZoom) return;
  if(hlLayer) hlLayer.definitionExpression=S.UF?'SIGLA_UF='+q(S.UF):S.REGIAO?(S.REGIAO==='Centro-Oeste'?"NM_REGIAO IN ('Centro-Oeste','Centro-oeste')":'NM_REGIAO='+q(S.REGIAO)):'1=0';
  const key=JSON.stringify(S); if(key===lastKey) return; lastKey=key;
  const bb=(C.map&&C.map.bbox)||[-75,-35,-28,7]; // enquadra só pontos dentro do Brasil (ignora coordenadas erradas)
  const pts=f.filter(r=>r._x!=null&&r._x>bb[0]&&r._x<bb[2]&&r._y>bb[1]&&r._y<bb[3]); if(!pts.length) return;
  let xmin=180,ymin=90,xmax=-180,ymax=-90; pts.forEach(r=>{xmin=Math.min(xmin,r._x);xmax=Math.max(xmax,r._x);ymin=Math.min(ymin,r._y);ymax=Math.max(ymax,r._y);});
  if(pts.length===1||(xmax-xmin<.02&&ymax-ymin<.02)) view.goTo({center:[pts[0]._x,pts[0]._y],zoom:11},{duration:600}).catch(()=>{});
  else view.goTo(new Extent({xmin,ymin,xmax,ymax,spatialReference:{wkid:4326}}).expand(1.25),{duration:600}).catch(()=>{});
}

/* ---------- aba Histórico e alertas (time lapse + alertas de inclusão) ---------- */
const TLC=C.timelapse;
const MES=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const TL={on:false,ready:false,mk0:0,n:0,cur:0,timer:null,playing:true,hold:0,view:null,layer:null,lv:null,alertLayer:null,blinkT:null,chart:null,preview:null,maxCreated:0};
const WEEK=TLC&&TLC.unit==='week';
const N1=(TLC&&TLC.noun)||'acidente', N2=(TLC&&TLC.nounPl)||'acidentes';
const wkDate=i=>new Date(((TL.mk0+i)*7-3)*864e5); // início (segunda-feira) da semana i
const yearOf=i=>WEEK?wkDate(i).getUTCFullYear():Math.floor((TL.mk0+i)/12);
const mLabel=(i,long)=>{ if(WEEK){ const d=wkDate(i), dd=String(d.getUTCDate()).padStart(2,'0'), mm=String(d.getUTCMonth()+1).padStart(2,'0'); return long?`Sem. ${dd}/${mm}/${d.getUTCFullYear()}`:`${dd}/${mm}`; }
  const k=TL.mk0+i, y=Math.floor(k/12); return `${MES[k%12]}/${long?y:String(y).slice(2)}`; };
const fmtDT=t=>new Date(t).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
function tlPrep(){
  D.forEach(r=>{ const m=/(\d{2})\/(\d{2})\/(\d{4})/.exec(String(r[TLC.dateField]||'')); r._mk=!m?null:WEEK?Math.floor((Date.UTC(+m[3],+m[2]-1,+m[1])/864e5+3)/7):(+m[3])*12+(+m[2]-1); });
  const ks=D.map(r=>r._mk).filter(k=>k!=null); TL.mk0=Math.min(...ks); TL.n=Math.max(...ks)-TL.mk0+1;
  D.forEach(r=>{ r._t=r._mk==null?-1:r._mk-TL.mk0; });
  TL.cur=0; TL.maxCreated=D.reduce((m,r)=>Math.max(m,+r[TLC.createdField]||0),0);
  const rg=document.getElementById('tlRange'); rg.max=TL.n-1; rg.value=0;
}
const tlRows=()=>rows('ANO');
function tlSeries(f){
  const cats=C.map.icons?Object.keys(C.map.icons):(ORDER[C.map.colorBy]||[]);
  const per=cats.map(()=>new Array(TL.n).fill(0));
  f.forEach(r=>{ if(r._t<0) return; const i=cats.indexOf(String(r[C.map.colorBy])); if(i>=0) per[i][r._t]++; });
  return {cats,per};
}
function initTL(){ if(TL.ready||!window.__ESRI) return; TL.ready=true;
  const {EMap,MapView,FeatureLayer,Graphic}=window.__ESRI;
  require(['esri/layers/GraphicsLayer'],GraphicsLayer=>{
    TL.layer=new FeatureLayer({title:TLC.layerTitle||'Acidentes no tempo',source:pointGraphics(Graphic,r=>({_t:r._t})),objectIdField:'_oid',geometryType:'point',spatialReference:{wkid:4326},
      fields:[{name:'_oid',type:'oid'},{name:'_cat',type:'string'},{name:'_ord',type:'integer'},{name:'_t',type:'integer'}],
      orderBy:[{field:'_ord',order:'ascending'}],renderer:pointRenderer(.85),popupTemplate:popupTpl()});
    TL.alertLayer=new GraphicsLayer({title:'Alertas',listMode:'hide'});
    const extra=(C.map.extraLayers||[]).map(u=>new FeatureLayer(Object.assign({popupEnabled:false},u)));
    const m=new EMap({basemap:'dark-gray-vector',layers:[...extra,TL.layer,TL.alertLayer]});
    TL.view=new MapView({container:'tlMap',map:m,center:[-50,-17],zoom:4,constraints:{snapToZoom:false},ui:{components:['zoom','attribution']},popup:{dockEnabled:false,dockOptions:{buttonEnabled:false}}});
    TL.view.navigation.mouseWheelZoomEnabled=false;
    TL.view.on('click',()=>{TL.view.navigation.mouseWheelZoomEnabled=true;});
    const st=document.createElement('div'); st.className='tl-stamp'; st.id='tlStamp'; TL.view.ui.add(st,'top-left');
    TL.view.ui.add(mapLegend(),'bottom-left');
    TL.view.whenLayerView(TL.layer).then(lv=>{ TL.lv=lv; tlFrame();
      if(TLC.fit){ const bb=C.map.bbox||[-75,-35,-28,7]; const pts=D.filter(r=>r._x!=null&&r._x>bb[0]&&r._x<bb[2]&&r._y>bb[1]&&r._y<bb[3]); if(pts.length){ let x0=180,y0=90,x1=-180,y1=-90; pts.forEach(r=>{x0=Math.min(x0,r._x);x1=Math.max(x1,r._x);y0=Math.min(y0,r._y);y1=Math.max(y1,r._y);}); TL.view.goTo(new Extent({xmin:x0,ymin:y0,xmax:x1,ymax:y1,spatialReference:{wkid:4326}}).expand(1.3),{animate:false}).catch(()=>{}); } } });
    TL.chart=echarts.init(document.getElementById('tlChart'));
    TL.chart.on('click',p=>{ if(p.dataIndex!=null){ TL.cur=p.dataIndex; tlPlay(false); tlFrame(); } });
    tlChart(); renderAlerts(); tlPlay(TL.playing);
  });
}
function tlChart(){
  if(!TL.chart) return;
  const {cats,per}=tlSeries(tlRows());
  TL.chart.setOption({grid:{left:8,right:16,top:30,bottom:4,containLabel:true},
    legend:{top:0,right:8,itemWidth:12,itemHeight:12,textStyle:{color:'#4A5568'}},
    tooltip:{trigger:'axis',axisPointer:{type:'shadow'},formatter:ps=>`<b>${mLabel(ps[0].dataIndex,true)}</b><br>`+ps.map(p=>`${p.marker} ${esc(p.seriesName)}: <b>${nf(p.value)}</b>`).join('<br>')},
    xAxis:{type:'category',data:Array.from({length:TL.n},(_,i)=>mLabel(i)),axisTick:{show:false},axisLine:{lineStyle:{color:'#DDE3EB'}},axisLabel:{color:'#6A7486',fontSize:11}},
    yAxis:{type:'value',splitLine:{lineStyle:{color:'#EDF0F4'}},axisLabel:{color:'#6A7486',fontSize:11}},
    series:cats.map((v,i)=>({id:'s'+i,name:C.map.labels&&C.map.labels[v]||v,type:'bar',stack:'t',barCategoryGap:'25%',data:per[i],
      itemStyle:{color:catColor(C.map.colorBy,v,C.map.colors)}}))},true);
  tlMark();
}
function tlMark(){
  if(!TL.chart) return;
  TL.chart.setOption({series:[{id:'s0',markLine:{silent:true,symbol:'none',lineStyle:{color:'#F2B705',width:3,type:'solid'},label:{show:true,position:'end',formatter:()=>mLabel(TL.cur),color:'#7A5A00',fontWeight:700},data:[{xAxis:TL.cur}]}}]});
}
function tlFrame(){
  if(!TL.ready) return;
  const f=tlRows(), acc=document.getElementById('tlAcc').checked;
  let y0=TL.cur; while(y0>0&&yearOf(y0-1)===yearOf(TL.cur)) y0--; // início do ano exibido: anos anteriores ficam ocultos
  const inM=f.filter(r=>r._t===TL.cur), accN=f.filter(r=>r._t>=y0&&r._t<=TL.cur).length;
  if(TL.lv){
    const ids=f.length===D.length?null:f.map(r=>r._oid);
    const where=acc?`_t >= ${y0} AND _t <= ${TL.cur}`:`_t = ${TL.cur}`;
    const pvOn=TL.preview&&TL.preview.until>Date.now();
    TL.lv.filter=pvOn?{where:'1=0'}:(ids?{where,objectIds:ids}:{where}); // na pré-visualização só o alerta fica visível
    if(pvOn){ TL.lv.featureEffect=null; const st=document.getElementById('tlStamp'); if(st) st.innerHTML='<div class="m">Alerta</div><div class="c">pré-visualização · só os alertas visíveis</div>'; return; }
    TL.lv.featureEffect=acc?{filter:{where:`_t = ${TL.cur}`},includedEffect:'drop-shadow(0px 0px 6px #F2B705) brightness(1.2)',excludedEffect:'opacity(40%)'}:null;
  }
  const firstCat=C.map.icons?Object.keys(C.map.icons)[0]:null, gl=firstCat&&C.map.labels?C.map.labels[firstCat]:'';
  const g=firstCat?inM.filter(r=>String(r[C.map.colorBy])===firstCat).length:0;
  const st=document.getElementById('tlStamp');
  if(st) st.innerHTML=`<div class="m">${mLabel(TL.cur,true)}</div><div class="c"><b>${nf(inM.length)}</b> ${WEEK?'na semana':'no mês'}${gl?` · <b>${nf(g)}</b> ${esc(gl.toLowerCase())}${g===1?'':'s'}`:''}</div><div class="c">acumulado em ${yearOf(TL.cur)}: <b>${nf(accN)}</b></div>`;
  document.getElementById('tlNow').textContent=mLabel(TL.cur,true);
  document.getElementById('tlRange').value=TL.cur;
  tlMark();
}
function tlStep(){
  if(TL.cur>=TL.n-1){ if(++TL.hold<4) return; TL.hold=0; TL.cur=0; } else TL.cur++;
  tlFrame();
}
function tlPlay(on){
  TL.playing=on; clearInterval(TL.timer); TL.timer=null;
  const b=document.getElementById('tlPlay'); b.textContent=on?'❚❚':'▶'; b.setAttribute('aria-label',on?'Pausar':'Reproduzir');
  if(on&&TL.on) TL.timer=setInterval(tlStep,+document.getElementById('tlSpeed').value);
}
/* alertas: registros incluídos (campo de criação) há menos de N dias piscam */
function alertState(){
  const now=Date.now(), W=(TLC.alertDays||7)*864e5, cf=TLC.createdField;
  const recs=D.filter(r=>+r[cf]).sort((a,b)=>(b[cf]-a[cf])||(b._oid-a._oid));
  const pv=TL.preview&&TL.preview.until>now?TL.preview.oid:null;
  const active=recs.filter(r=>now-r[cf]<W||r._oid===pv);
  return {recs,active,now,W,cf,pv};
}
function renderAlerts(){
  const {recs,active,now,W,cf,pv}=alertState();
  const days=TLC.alertDays||7;
  const b=document.getElementById('aBadge'); b.hidden=!active.length; b.textContent=active.length;
  const last=recs[0], ago=t=>Math.floor((now-t)/864e5);
  document.getElementById('alertHead').innerHTML=active.length
    ? `<div class="ah on"><span class="pulse"></span><div><b>${active.length===1?`1 ${N1} incluído`:`${active.length} ${N2} incluídos`} ${pv?'(pré-visualização)':`nos últimos ${days} dias`}</b><small>${pv?'Pré-visualização: o mapa mostra apenas os alertas.':`O registro novo pisca no mapa até completar ${days} dias da inclusão.`}</small></div>${pv?'<button class="pv" id="pvEnd">Encerrar</button>':''}</div>`
    : `<div class="ah"><div><b>Nenhum ${N1} incluído nos últimos ${days} dias</b><small>${last?`Última inclusão em ${fmtDT(+last[cf])} (há ${ago(+last[cf])} dias). `:''}Quando um novo registro entrar na camada, ele aparece aqui e pisca no mapa por ${days} dias.</small></div>
       ${last?`<button class="pv" id="pvBtn">Pré-visualizar alerta</button>`:''}</div>`;
  const pvb=document.getElementById('pvBtn');
  if(pvb) pvb.onclick=()=>{ const pr=recs.find(r=>r._x!=null&&r._x>-75&&r._x<-28&&r._y>-35&&r._y<7)||last; TL.wasPlaying=TL.playing; tlPlay(false); TL.preview={oid:pr._oid,until:Date.now()+20000}; renderAlerts(); tlFrame(); tlGoTo(pr._oid,true); clearTimeout(TL.pvT); TL.pvT=setTimeout(endPreview,20300); };
  const pve=document.getElementById('pvEnd'); if(pve) pve.onclick=endPreview;
  document.getElementById('alertList').innerHTML=(pv?active:recs.slice(0,TLC.alertList||8)).map(r=>{ const on=active.includes(r), t=+r[cf];
    return `<button class="al ${on?'blink':''}" data-oid="${r._oid}">${legendMark(String(r[C.map.colorBy]),catColor(C.map.colorBy,r[C.map.colorBy],C.map.colors))}
      <span class="tx"><b>${esc(TLC.alertTitle?TLC.alertTitle(r):r._oid)}</b><small>${esc(TLC.alertSub?TLC.alertSub(r):'')}</small>
      <small class="inc">Incluído em ${fmtDT(t)}${on?` · <em>NOVO — pisca até ${fmtDT(r._oid===pv?TL.preview.until:t+W)}</em>`:` · há ${ago(t)} dias`}</small></span></button>`; }).join('');
  document.querySelectorAll('#alertList .al').forEach(el=>el.onclick=()=>tlGoTo(+el.dataset.oid));
  drawAlertGraphics(active);
}
function endPreview(){ clearTimeout(TL.pvT); TL.preview=null; renderAlerts(); tlFrame(); if(TL.view) TL.view.goTo({center:[-50,-17],zoom:4},{duration:600}).catch(()=>{}); if(TL.wasPlaying) tlPlay(true); }
function drawAlertGraphics(active){
  if(!TL.alertLayer) return;
  clearInterval(TL.blinkT); TL.alertLayer.removeAll();
  const pts=active.filter(r=>r._x!=null); if(!pts.length) return;
  const {Graphic}=window.__ESRI;
  const ringSym=big=>({type:'simple-marker',size:big?54:26,color:[242,183,5,big?.06:.32],outline:{color:[242,183,5,big?.3:1],width:3}});
  const ring=pts.map(r=>new Graphic({geometry:{type:'point',longitude:r._x,latitude:r._y},symbol:ringSym(false)}));
  const ic=pts.map(r=>{ const u=markerURL(String(r[C.map.colorBy])); return new Graphic({geometry:{type:'point',longitude:r._x,latitude:r._y},
    symbol:u?{type:'picture-marker',url:u,width:32,height:32}:{type:'simple-marker',size:16,color:'#C2410C'}}); });
  TL.alertLayer.addMany([...ring,...ic]);
  let k=0; TL.blinkT=setInterval(()=>{ k++; const big=k%2===0;
    ring.forEach(g=>{ g.symbol=ringSym(big); }); ic.forEach(g=>{ g.visible=!big||k%4!==0; }); },550);
}
function tlGoTo(oid,keepFrame){
  const r=BYOID[oid]; if(!r||!TL.view) return;
  if(!keepFrame&&r._t>=0){ TL.cur=r._t; tlPlay(false); tlFrame(); }
  if(r._x==null) return;
  TL.view.goTo({center:[r._x,r._y],zoom:keepFrame?6:10},{duration:800}).then(()=>keepFrame?null:TL.layer.queryFeatures({objectIds:[oid],returnGeometry:true,outFields:['*']}))
    .then(fs=>{ if(fs&&fs.features.length) TL.view.openPopup({features:fs.features,location:fs.features[0].geometry}); }).catch(()=>{});
}
function showTab(t){
  document.querySelectorAll('.tab').forEach(b=>{ const on=b.dataset.t===t; b.classList.toggle('on',on); b.setAttribute('aria-selected',on); });
  document.querySelector('main.wrap').classList.toggle('show-tl',t==='tl');
  TL.on=t==='tl';
  if(TL.on){ initTL(); if(TL.chart) setTimeout(()=>TL.chart.resize(),0); tlPlay(TL.playing); }
  else { clearInterval(TL.timer); TL.timer=null; setTimeout(()=>Object.values(EC).forEach(c=>c.resize()),0); }
}
function initTabs(){
  tlPrep();
  document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>showTab(b.dataset.t));
  document.getElementById('tlPlay').onclick=()=>tlPlay(!TL.playing);
  document.getElementById('tlSpeed').onchange=()=>tlPlay(TL.playing);
  document.getElementById('tlRange').oninput=e=>{ TL.cur=+e.target.value; tlPlay(false); tlFrame(); };
  document.getElementById('tlAcc').onchange=()=>tlFrame();
  renderAlerts();
  setInterval(renderAlerts,60000); // encerra o pisca-pisca quando completa o prazo
  // verifica novas inclusões na camada a cada 3 minutos
  setInterval(async()=>{ try{
    const ts=new Date(TL.maxCreated).toISOString().slice(0,19).replace('T',' ');
    const p=new URLSearchParams({where:`${TLC.createdField} > timestamp '${ts}'`,returnCountOnly:'true',f:'json'});
    const j=await (await fetch(C.layer+'/query?'+p)).json();
    if(j.count>0){ const n=document.getElementById('newData'); n.hidden=false;
      n.innerHTML=`<span class="pulse"></span>${j.count===1?`1 novo ${N1} incluído`:`${j.count} novos ${N2} incluídos`} <button id="reload">Atualizar painel</button>`;
      document.getElementById('reload').onclick=()=>location.reload(); }
  }catch(e){} },180000);
}
function renderTL(){ if(!TL.ready) return; tlChart(); tlFrame(); }

/* ---------- render ---------- */
function render(){
  const f=rows();
  renderFilters(); renderKPIs(f); (C.charts||[]).forEach(renderChart); renderTable(f); renderGallery(f); renderMap(f); if(TLC) renderTL();
}
(async()=>{
  try{
    const feats=await fetchAll();
    D=feats.map(ft=>{ const r=Object.assign({},ft.attributes); r._oid=ft.attributes[C.oid]; r._x=ft.geometry&&isFinite(ft.geometry.x)?ft.geometry.x:null; r._y=ft.geometry&&isFinite(ft.geometry.y)?ft.geometry.y:null; return r; });
    normalize(D);
    if(C.regionFromUF) D.forEach(r=>{ r.REGIAO=UFREG[r[C.regionFromUF]]||NI; });
    if(C.derive) D.forEach(C.derive);
    BYOID=Object.fromEntries(D.map(r=>[r._oid,r]));
    // ordem fixa das categorias (frequência no total): a cor segue a categoria, não a posição filtrada
    const fieldsForColor=new Set([...(C.charts||[]).map(c=>c.field), C.map&&C.map.colorBy].filter(Boolean));
    fieldsForColor.forEach(fl=>{ ORDER[fl]=[...count(D,fl).entries()].filter(([v])=>v!==NI).sort((a,b)=>b[1]-a[1]).map(x=>x[0]); });
    await loadAttachments();
  }catch(e){ document.getElementById('loading').textContent='Não foi possível carregar os dados da camada: '+e.message; return; }
  document.getElementById('loading').remove();
  document.getElementById('upd').textContent=new Date().toLocaleString('pt-BR');
  if(TLC) initTabs();
  render();
  await initMap(); lastKey=null; renderMap(rows());
  if(TLC&&/historico/.test(location.hash)) showTab('tl'); // link direto para a aba
  const fm=/#foto(?:\/(\d+))?/.exec(location.hash); if(fm&&C.gallery) openLB(+(fm[1]||0));
})();
window.addEventListener('resize',()=>{ Object.values(EC).forEach(c=>c.resize()); if(TL.chart) TL.chart.resize(); });
})();
