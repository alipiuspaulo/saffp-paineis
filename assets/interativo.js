/* Recursos interativos dos painéis SAFF-P — complementa painel.js sem substituir nada.
   - mapa e gráficos ligados: passar o mouse numa barra acende os pontos; passar o mouse num ponto destaca as barras
   - linha do tempo na visão geral: seleção de período (filtra tudo) e reprodução mês a mês
   - indicadores com contagem animada, tendência anual e variação do último ano completo
   - "Só a área visível": números e gráficos contam só o que aparece no mapa
   - modo claro/escuro, blocos ocultáveis e reordenáveis, link da visão e passeio guiado
   Opções no window.PAINEL: period:{dateField,unit,title}|false, trendUpIsBad, kpis[i].trend:false|upIsBad. */
(function(){
'use strict';
const A=window.PAINEL_API; if(!A) return;
const C=A.C, X=A.X, S=A.S, esc=A.esc, nf=A.nf;
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const PKEY=location.pathname.replace(/index\.html$/,'');
const MES=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const PC=C.period===false?null:Object.assign({dateField:C.timelapse&&C.timelapse.dateField,unit:C.timelapse&&C.timelapse.unit},C.period||{});
const HASP=!!(PC&&PC.dateField);
const WEEK=PC&&PC.unit==='week';
const UNIT=C.unitLabel||'registros';
const P={k0:0,n:0,range:null,ext:false,extGeo:null,play:false,cur:null,hover:null,vis:null,inited:false,years:[]};
const store={get:(k,d)=>{try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v);}catch(e){return d;}},set:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}};
function toast(t){ let e=$('#ixToast'); if(!e){ e=document.createElement('div'); e.id='ixToast'; e.className='ix-toast'; document.body.appendChild(e);} e.textContent=t; e.classList.add('on'); clearTimeout(e._t); e._t=setTimeout(()=>e.classList.remove('on'),2200); }
const resizeAll=()=>setTimeout(()=>{ Object.values(A.EC).forEach(c=>{try{c.resize();}catch(e){}}); if(EP) EP.resize(); },60);

/* ---------- período (unidade = mês ou semana) ---------- */
const wkDate=i=>new Date(((P.k0+i)*7-3)*864e5);
function plabel(i,long){
  if(WEEK){ const d=wkDate(i); const dd=String(d.getUTCDate()).padStart(2,'0'),mm=String(d.getUTCMonth()+1).padStart(2,'0'); return long?`sem. ${dd}/${mm}/${d.getUTCFullYear()}`:`${dd}/${mm}`; }
  const k=P.k0+i,y=Math.floor(k/12); return `${MES[k%12]}/${long?y:String(y).slice(2)}`;
}
function prepDates(){
  const D=A.D;
  D.forEach(r=>{ r._p=null; r._yr=null;
    const m=/(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(String(r[PC.dateField]||'')); if(!m) return;
    const d=+m[1],mo=+m[2],y=+m[3]; if(y<1990||y>2100||mo<1||mo>12) return;
    r._yr=y; r._p=WEEK?Math.floor((Date.UTC(y,mo-1,d)/864e5+3)/7):y*12+mo-1; });
  const ks=D.map(r=>r._p).filter(k=>k!=null); if(!ks.length) return false;
  P.k0=Math.min(...ks); P.n=Math.max(...ks)-P.k0+1;
  D.forEach(r=>{ if(r._p!=null) r._p-=P.k0; });
  P.years=[...new Set(D.map(r=>r._yr).filter(Boolean))].sort();
  return true;
}

/* ---------- filtros extras (período e área do mapa) ---------- */
X.preds.push((r,skip)=>{
  if(P.range&&skip!=='ANO'&&skip!=='_range'){ if(r._p==null||r._p<P.range[0]||r._p>P.range[1]) return false; }
  if(P.ext&&P.extGeo&&skip!=='_map'&&skip!=='ANO'){ const e=P.extGeo; if(r._x==null||r._x<e.xmin||r._x>e.xmax||r._y<e.ymin||r._y>e.ymax) return false; }
  return true;
});

/* ---------- estrutura: barra de ferramentas, cartões e janelas ---------- */
const top=$('.top-in');
const tools=document.createElement('div'); tools.className='ix-tools';
tools.innerHTML=`<button class="ix-b gold" id="ixTour" title="Passeio guiado pelos dados">▶ <span>Apresentar</span></button>
  <button class="ix-b" id="ixCustom" title="Escolher e organizar os blocos">⚙ <span>Personalizar</span></button>
  <button class="ix-b" id="ixShare" title="Copiar um link com os filtros aplicados">🔗 <span>Compartilhar visão</span></button>
  <button class="ix-b" id="ixTheme" title="Alternar modo claro/escuro">☾ <span>Escuro</span></button>`;
top.appendChild(tools);

// identificadores estáveis dos blocos
const BLOCKS=[];
const tagBlock=(el,id,label)=>{ if(!el) return; el.dataset.ix=id; BLOCKS.push({id,label}); };
tagBlock($('#kpis'),'kpis','Indicadores');
const mapcard=$('.mapcard'); tagBlock(mapcard,'map',(C.map&&C.map.title)||'Mapa');
(C.charts||[]).forEach(c=>tagBlock(document.getElementById(c._id+'_card'),c._id,c.title));
if(HASP){
  const sec=document.createElement('section'); sec.className='card ov ix-period'; sec.id='ixPeriod';
  sec.innerHTML=`<div class="card-h"><h2>${esc(PC.title||'Linha do tempo')}</h2><span class="hint">arraste as alças amarelas para escolher o período · filtra todo o painel</span><span class="sp"></span>
    <span class="ix-per" id="ixPer"></span>
    <select class="mapsel" id="ixSpeed" aria-label="Velocidade"><option value="800">Lenta</option><option value="380" selected>Normal</option><option value="160">Rápida</option></select>
    <button class="ix-play" id="ixPlay">▶ Reproduzir</button></div><div id="ixTime"></div>`;
  $('section.main').after(sec); tagBlock(sec,'period',PC.title||'Linha do tempo');
}
tagBlock($('#galCard'),'gal',(C.gallery&&C.gallery.title)||'Galeria');
const tblCard=$('#tbl')&&$('#tbl').closest('.card'); tagBlock(tblCard,'table',(C.table&&C.table.title)||'Tabela');

// alça de arrastar em cada cartão
$$('[data-ix]').forEach(el=>{ const h=el.querySelector(':scope > .card-h'); if(!h) return; const b=document.createElement('button'); b.className='ix-h'; b.type='button'; b.title='Arraste para reorganizar'; b.textContent='⠿'; h.prepend(b); });

// mapa: filtro por área visível, cartão do mouse e selo da reprodução
if(mapcard){
  const mh=mapcard.querySelector('.card-h'), bl=mh.querySelector('label[for="baseSel"]');
  const lab=document.createElement('label'); lab.className='ix-ext'; lab.title='Números e gráficos contam só o que aparece no mapa';
  lab.innerHTML='<input type="checkbox" id="ixExt"> Só a área visível'; mh.insertBefore(lab,bl);
  mapcard.insertAdjacentHTML('beforeend','<div class="ix-hov" id="ixHov"></div><div class="ix-stamp" id="ixStamp"></div>');
}
document.body.insertAdjacentHTML('beforeend',`
<div class="ix-pop" id="ixPopC"><h4>Personalizar painel</h4><div id="ixList"></div>
  <div class="n">Arraste os blocos pela alça ⠿ para mudar a ordem dentro da coluna. As escolhas ficam salvas neste navegador.</div>
  <div class="r"><button class="ix-btn" id="ixReset">Restaurar padrão</button><button class="ix-btn pri" id="ixOk">Pronto</button></div></div>
<div class="ix-pop" id="ixPopS"><h4>Link desta visão</h4><input type="text" id="ixLink" readonly><div class="n">Copie o link acima (Ctrl+C). Ele abre o painel com os mesmos filtros, período e tema.</div>
  <div class="r"><button class="ix-btn pri" id="ixOkS">Fechar</button></div></div>
<div class="ix-tour" id="ixTourBox"><div class="s" id="ixTS"></div><h4 id="ixTT"></h4><p id="ixTX"></p><div class="r"><div class="dots" id="ixTD"></div><button class="ix-btn" id="ixTE">Sair</button><button class="ix-btn pri" id="ixTN">Próximo</button></div></div>`);

/* ---------- indicadores animados com tendência ---------- */
const prevV={};
function tween(el,from,to,k){
  cancelAnimationFrame(el._raf); const dec=k.dec||0, unit=k.unit?`<small>${esc(k.unit)}</small>`:'';
  if(from===to||document.hidden){ el.innerHTML=nf(to,dec)+unit; return; }
  const t0=performance.now(),dur=650;
  const step=t=>{ const q=Math.min(1,(t-t0)/dur),e=1-Math.pow(1-q,3); el.innerHTML=nf(from+(to-from)*e,dec)+unit; if(q<1) el._raf=requestAnimationFrame(step); };
  el.innerHTML=nf(from,dec)+unit; el._raf=requestAnimationFrame(step);
}
function spark(vals,color){
  const n=vals.length; if(n<2) return '';
  const w=120,h=30,max=Math.max(1,...vals.map(v=>+v||0));
  const pts=vals.map((v,i)=>[i*(w-6)/(n-1)+3,h-3-((+v||0)/max)*(h-8)]);
  const line=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(''), L=pts[n-1], id='g'+Math.random().toString(36).slice(2,8);
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><defs><linearGradient id="${id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".28"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
    <path d="${line}L${L[0]} ${h}L3 ${h}Z" fill="url(#${id})"/><path d="${line}" fill="none" stroke="${color}" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>
    <circle cx="${L[0]}" cy="${L[1]}" r="2.6" fill="${color}"/><title>${P.years.map((y,i)=>`${y}: ${nf(vals[i],0)}`).join(' · ')}</title></svg>`;
}
function kpiFx(f){
  const cards=$$('#kpis .kpi'), D=A.D, thisYear=new Date().getFullYear();
  (C.kpis||[]).forEach((k,i)=>{
    const el=cards[i]; if(!el) return; let v; try{ v=k.value(f,D); }catch(e){ return; }
    if(typeof v!=='number'||!isFinite(v)) return;
    const vl=el.querySelector('.vl'); if(vl&&!k.note){ tween(vl,prevV[i]==null?0:prevV[i],v,k); } prevV[i]=v;
    if(k.trend===false||!HASP||P.years.length<2) return;
    const by=P.years.map(y=>{ try{ return k.value(f.filter(r=>r._yr===y),D)||0; }catch(e){ return 0; } });
    if(!by.some(x=>x)) return;
    const full=P.years.filter(y=>y<thisYear&&f.some(r=>r._yr===y));
    let d='';
    if(full.length>=2){ const a=full[full.length-2],b=full[full.length-1], va=by[P.years.indexOf(a)], vb=by[P.years.indexOf(b)];
      const na=f.filter(r=>r._yr===a).length, nb=f.filter(r=>r._yr===b).length; // só compara anos com volume parecido
      if(va>0&&na>=20&&na>=nb*.25){ const pc=100*(vb-va)/va, bad=k.upIsBad!=null?k.upIsBad:C.trendUpIsBad; const cls=(bad==null||Math.round(pc)===0)?'nt':((pc>0)===!!bad?'up':'dn');
        d=`<span class="ix-delta" title="${b} em relação a ${a}"><b class="${cls}">${pc>0?'▲':pc<0?'▼':'='} ${nf(Math.abs(pc),0)}%</b><br>${b} vs ${a}</span>`; } }
    const col=getComputedStyle(el).getPropertyValue('--ka').trim()||getComputedStyle(document.documentElement).getPropertyValue('--p').trim()||'#1C5FAD';
    const tr=document.createElement('div'); tr.className='ix-trend'; tr.innerHTML=spark(by,col)+d;
    const ft=el.querySelector('.ft'); ft?el.insertBefore(tr,ft):el.appendChild(tr);
  });
}

/* ---------- linha do tempo da visão geral ---------- */
let EP=null, suppress=false;
function cats(){
  const cb=C.map&&C.map.colorBy; if(!cb) return {cb:null,list:['_all']};
  const list=C.map.icons?Object.keys(C.map.icons):(A.ORDER[cb]||[]).slice(0,7);
  return {cb,list};
}
function periodOption(full){
  const f=A.rows('_range'), {cb,list}=cats(), T=A.tc();
  const per=list.map(()=>new Array(P.n).fill(0)), oth=new Array(P.n).fill(0);
  f.forEach(r=>{ if(r._p==null) return; const i=cb?list.indexOf(String(r[cb])):0; (i>=0?per[i]:oth)[r._p]++; });
  const op=i=>P.play&&P.cur!=null&&i>P.cur?.18:1;
  const mk=(arr,col)=>arr.map((v,i)=>({value:v,itemStyle:{color:col,opacity:op(i)}}));
  const series=list.map((v,i)=>{ const col=cb?A.catColor(cb,v,C.map.colors):(getComputedStyle(document.documentElement).getPropertyValue('--p').trim()||'#1C5FAD');
    return {id:'p'+i,name:cb?(C.map.labels&&C.map.labels[v]||v):UNIT,type:'bar',stack:'t',barCategoryGap:'20%',itemStyle:{color:col},data:mk(per[i],col)}; });
  if(oth.some(x=>x)) series.push({id:'po',name:'Outros',type:'bar',stack:'t',itemStyle:{color:'#9AA4B2'},data:mk(oth,'#9AA4B2')});
  series[0].markLine=P.play&&P.cur!=null?{silent:true,symbol:'none',lineStyle:{color:'#F2B705',width:3,type:'solid'},label:{formatter:plabel(P.cur),color:T.ink,fontWeight:700},data:[{xAxis:P.cur}]}:{data:[]};
  if(!full) return {series};
  const zr=P.range||[0,P.n-1];
  return {grid:{left:8,right:18,top:30,bottom:52,containLabel:true},
    legend:{top:0,right:8,itemWidth:12,itemHeight:12,textStyle:{color:T.ink2},type:'scroll'},
    tooltip:{trigger:'axis',axisPointer:{type:'shadow'},formatter:ps=>`<b>${plabel(ps[0].dataIndex,true)}</b><br>`+ps.filter(p=>p.value).map(p=>`${p.marker} ${esc(p.seriesName)}: <b>${nf(p.value)}</b>`).join('<br>')},
    xAxis:{type:'category',data:Array.from({length:P.n},(_,i)=>plabel(i)),axisTick:{show:false},axisLine:{lineStyle:{color:T.axis}},axisLabel:{color:T.muted,fontSize:11}},
    yAxis:{type:'value',splitLine:{lineStyle:{color:T.grid}},axisLabel:{color:T.muted,fontSize:11}},
    dataZoom:[{type:'slider',startValue:zr[0],endValue:zr[1],height:20,bottom:8,borderColor:T.axis,fillerColor:'rgba(242,183,5,.22)',
      handleStyle:{color:'#F2B705',borderColor:'#C99700'},moveHandleStyle:{color:'#F2B705'},textStyle:{color:T.muted},labelFormatter:i=>plabel(i,true),
      dataBackground:{lineStyle:{color:T.muted},areaStyle:{color:T.grid}},selectedDataBackground:{lineStyle:{color:'#C99700'},areaStyle:{color:'rgba(242,183,5,.3)'}}},
      {type:'inside',zoomOnMouseWheel:false,moveOnMouseWheel:false}],
    series};
}
function periodChart(full){
  if(!HASP||!P.n) return;
  if(!EP){ EP=echarts.init(document.getElementById('ixTime')); full=true;
    EP.on('datazoom',()=>{ if(suppress||P.play) return; const dz=EP.getOption().dataZoom[0]; const a=Math.round(dz.startValue),b=Math.round(dz.endValue);
      const nr=(a<=0&&b>=P.n-1)?null:[a,b]; if(JSON.stringify(nr)===JSON.stringify(P.range)) return; P.range=nr; A.render(); });
    EP.on('mouseover',p=>{ if(p.componentType==='series'&&!P.play) hoverIds(A.D.filter(r=>r._p===p.dataIndex).map(r=>r._oid)); });
    EP.on('mouseout',()=>{ if(!P.play) hoverIds(null); }); }
  EP.setOption(periodOption(full),full?{notMerge:true}:undefined);
  $('#ixPer').textContent=P.range?`${plabel(P.range[0],true)} – ${plabel(P.range[1],true)}`:`${plabel(0,true)} – ${plabel(P.n-1,true)} · todo o período`;
}
function syncZoom(){ if(!EP) return; suppress=true; const zr=P.range||[0,P.n-1]; EP.dispatchAction({type:'dataZoom',startValue:zr[0],endValue:zr[1]}); suppress=false; }
let playT=null;
function play(){
  if(P.play){ stopPlay(); return; }
  const a=P.range?P.range[0]:0, b=P.range?P.range[1]:P.n-1; let i=a;
  P.play=true; P.hover=null; $('#ixPlay').textContent='❚❚ Pausar'; $('#ixStamp').classList.add('on');
  const tick=()=>{ P.cur=i; P.range=[a,i]; A.render();
    const f=A.rows(); $('#ixStamp').innerHTML=`<div class="m">${plabel(i,true)}</div><div class="c"><b>${nf(f.filter(r=>r._p===i).length)}</b> ${WEEK?'na semana':'no mês'} · ${nf(f.length)} acumulados</div>`;
    if(++i>b){ playT=setTimeout(()=>stopPlay(true),1100); return; } playT=setTimeout(tick,+$('#ixSpeed').value); };
  tick();
}
function stopPlay(done){ clearTimeout(playT); if(!P.play) return; P.play=false; P.cur=null; $('#ixPlay').textContent='▶ Reproduzir'; $('#ixStamp').classList.remove('on'); syncZoom(); A.render(); if(done) toast('Reprodução concluída'); }
if(HASP) $('#ixPlay').onclick=play;

/* ---------- ligação gráfico ↔ mapa ---------- */
// limpar com um pequeno atraso evita o "pisca" ao passar de uma barra para a vizinha
function hoverIds(ids){ clearTimeout(P.ht); if(ids==null){ P.ht=setTimeout(()=>{ P.hover=null; applyEffect(); },140); return; } P.hover=ids; applyEffect(); }
const FX={hoverIn:'brightness(1.08) drop-shadow(0px 0px 2px rgba(242,183,5,.55))',hoverOut:'grayscale(65%) opacity(35%)',playIn:'brightness(1.12) drop-shadow(0px 0px 3px rgba(242,183,5,.6))',playOut:'opacity(55%)'};
X.chartHover=(field,name)=>{ if(P.play) return; hoverIds(field?A.D.filter(r=>String(r[field])===String(name)).map(r=>r._oid):null); };
function applyEffect(){
  const lv=A.ptView; if(!lv) return;
  const fx=(ids,inc,exc)=>({filter:ids.length?{objectIds:ids}:{where:'1=0'},includedEffect:inc,excludedEffect:exc});
  if(P.play&&P.cur!=null){ lv.featureEffect=fx(A.D.filter(r=>r._p===P.cur).map(r=>r._oid),FX.playIn,FX.playOut); return; }
  if(P.hover){ lv.featureEffect=fx(P.hover,FX.hoverIn,FX.hoverOut); return; }
  lv.featureEffect=null;
}
function chartsHighlight(r){
  (C.charts||[]).forEach(c=>{ const ch=A.EC[c._id]; if(!ch||!['hbar','vbar','donut'].includes(c.type)) return;
    try{ ch.dispatchAction({type:'downplay',seriesIndex:0}); if(!r) return; const v=String(r[c.field]); const o=ch.getOption();
      let idx=-1; if(c.type==='donut') idx=o.series[0].data.findIndex(d=>d.name===v); else { const ax=(c.type==='hbar'?o.yAxis:o.xAxis)[0]; idx=(ax.data||[]).indexOf(v); }
      if(idx>=0) ch.dispatchAction({type:'highlight',seriesIndex:0,dataIndex:idx}); }catch(e){} });
}
function showHov(r,ev){
  const h=$('#ixHov'); if(!h) return; let body='';
  try{ body=String(C.map.popup(r,[])||'').split(/<br\s*\/?>/i).slice(0,4).join('<br>'); }catch(e){}
  let t=''; try{ t=C.map.popupTitle(r); }catch(e){}
  h.innerHTML=`<div class="t">${esc(t)}</div><div>${body}</div><div class="m">clique para ver todos os detalhes</div>`;
  moveHov(ev); h.classList.add('on');
}
function moveHov(ev){ const h=$('#ixHov'),m=$('#map'),v=A.view; if(!h||!m||!v) return; const ox=m.offsetLeft,oy=m.offsetTop;
  let x=ev.x+16,y=ev.y+14; if(x+310>v.width) x=ev.x-316; if(y+150>v.height) y=Math.max(4,ev.y-150); h.style.left=(ox+x)+'px'; h.style.top=(oy+y)+'px'; }
const hideHov=()=>{ const h=$('#ixHov'); if(h) h.classList.remove('on'); };
X.mapReady.push(()=>{
  const view=A.view, layer=A.ptLayer; let last=null,pend=false,hl=null;
  view.highlightOptions={color:[242,183,5,1],haloOpacity:.6,fillOpacity:.1}; // seleção mais suave
  view.on('pointer-move',ev=>{ if(pend) return; pend=true; requestAnimationFrame(()=>{ pend=false;
    view.hitTest(ev,{include:[layer]}).then(h=>{ const g=h.results.find(x=>x.graphic&&(!P.vis||P.vis.has(x.graphic.attributes._oid))); const id=g?g.graphic.attributes._oid:null;
      if(id!==last){ last=id; if(hl){hl.remove();hl=null;} const r=id!=null?A.BYOID[id]:null;
        if(r&&!view.popup?.visible){ hl=A.ptView.highlight(id); showHov(r,ev); chartsHighlight(r); } else { hideHov(); chartsHighlight(null); } }
      else if(id!=null) moveHov(ev); }).catch(()=>{}); }); });
  view.on('pointer-leave',()=>{ last=null; if(hl){hl.remove();hl=null;} hideHov(); chartsHighlight(null); });
  view.on('click',()=>{ hideHov(); });
  require(['esri/core/reactiveUtils','esri/geometry/support/webMercatorUtils'],(ru,wmu)=>{
    P.wmu=wmu;
    ru.when(()=>view.stationary,()=>{ if(!P.ext) return; P.extGeo=wmu.webMercatorToGeographic(view.extent); A.render(); });
    if(P.pendM){ const m=P.pendM; P.pendM=null; setTimeout(()=>view.goTo({center:[m[0],m[1]],zoom:m[2]},{animate:false}).then(()=>{ P.ext=true; if(ext) ext.checked=true; P.extGeo=wmu.webMercatorToGeographic(view.extent); A.render(); }).catch(()=>{}),900); }
  });
  applyEffect(); applyThemeMap();
});
(C.charts||[]).forEach(c=>{
  if(c.type==='donut'){ const lg=document.getElementById(c._id+'_lg'); if(!lg) return;
    lg.addEventListener('mouseover',e=>{ const b=e.target.closest('.lg'); if(b&&!P.play){ X.chartHover(c.field,b.dataset.v); chartsHighlight({[c.field]:b.dataset.v}); } });
    lg.addEventListener('mouseleave',()=>{ X.chartHover(null); chartsHighlight(null); }); }
  if(c.type==='yn'){ const el=document.getElementById(c._id); if(!el) return;
    el.addEventListener('mouseover',e=>{ const i=e.target.closest('.yn-bar i'); if(i&&!P.play) X.chartHover(i.dataset.f,i.dataset.v); });
    el.addEventListener('mouseleave',()=>X.chartHover(null)); }
});
{ const tb=document.querySelector('#tbl tbody');
  if(tb){ tb.addEventListener('mouseover',e=>{ const tr=e.target.closest('tr[data-oid]'); if(!tr||P.play) return; const r=A.BYOID[tr.dataset.oid]; if(!r) return; hoverIds([r._oid]); chartsHighlight(r); });
    tb.addEventListener('mouseleave',()=>{ hoverIds(null); chartsHighlight(null); });
    tb.addEventListener('click',e=>{ const tr=e.target.closest('tr[data-oid]'); if(tr&&A.focus) A.focus(+tr.dataset.oid||tr.dataset.oid); }); } }
const ext=$('#ixExt'); if(ext) ext.onchange=()=>{ P.ext=ext.checked; P.extGeo=P.ext&&A.view&&P.wmu?P.wmu.webMercatorToGeographic(A.view.extent):null; A.render(); };

/* ---------- etiquetas de período/área e "Limpar filtros" ---------- */
function extraTags(){
  const a=$('#fActive'); if(!a) return;
  if(P.range&&!P.play){ const b=document.createElement('button'); b.className='tag ix-range'; b.title='Período'; b.textContent=`${plabel(P.range[0],true)} – ${plabel(P.range[1],true)}`; b.onclick=()=>{ P.range=null; syncZoom(); A.render(); }; a.appendChild(b); }
  if(P.ext){ const b=document.createElement('button'); b.className='tag'; b.title='Área do mapa'; b.textContent='Área visível no mapa'; b.onclick=()=>{ P.ext=false; if(ext) ext.checked=false; A.render(); }; a.appendChild(b); }
  if((P.range&&!P.play)||P.ext) $('#fClear').hidden=false;
}
$('#fClear').addEventListener('click',()=>{ if(P.range||P.ext){ P.range=null; P.ext=false; if(ext) ext.checked=false; syncZoom(); A.render(); } });

/* ---------- tema claro/escuro ---------- */
function applyThemeMap(){
  const v=A.view; if(!v) return; const dark=document.documentElement.dataset.theme==='dark', id=v.map.basemap&&v.map.basemap.id;
  if(dark&&id==='gray-vector'){ v.map.basemap='dark-gray-vector'; $('#baseSel').value='dark-gray-vector'; }
  if(!dark&&id==='dark-gray-vector'&&P.autoDark){ v.map.basemap='gray-vector'; $('#baseSel').value='gray-vector'; }
  P.autoDark=dark&&(id==='gray-vector'||P.autoDark);
}
function setTheme(t,silent){
  document.documentElement.dataset.theme=t; $('#ixTheme').innerHTML=t==='dark'?'☀ <span>Claro</span>':'☾ <span>Escuro</span>';
  store.set('saffp_tema',t);
  if(silent) return;
  A.render(); A.tlChart(); periodChart(true); applyThemeMap();
}
$('#ixTheme').onclick=()=>setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');
setTheme(store.get('saffp_tema','light'),true);

/* ---------- personalizar ---------- */
const LKEY='saffp_layout:'+PKEY;
const blockEl=id=>$(`[data-ix="${id}"]`);
function saveLayout(){
  const order={}; $$('[data-ix]').forEach(el=>{ const p=el.parentElement; const k=p.id||p.className.split(' ')[0]||'p'; (order[k]=order[k]||[]).push(el.dataset.ix); });
  store.set(LKEY,{hidden:BLOCKS.filter(b=>blockEl(b.id)&&blockEl(b.id).classList.contains('ix-hide')).map(b=>b.id),order});
}
function layoutFix(){ const m=$('section.main'); if(m) m.classList.toggle('ix-nomap',!!(mapcard&&mapcard.classList.contains('ix-hide'))); resizeAll(); }
function applyLayout(L){
  if(!L) return;
  (L.hidden||[]).forEach(id=>{ const el=blockEl(id); if(el) el.classList.add('ix-hide'); });
  Object.values(L.order||{}).forEach(ids=>{ const els=ids.map(blockEl).filter(Boolean); if(els.length<2) return; const p=els[0].parentElement; if(els.some(e=>e.parentElement!==p)) return;
    const anchor=document.createComment('ix'); p.insertBefore(anchor,els[0]); els.forEach(e=>p.insertBefore(e,anchor)); anchor.remove(); });
  layoutFix();
}
function renderCustom(){
  $('#ixList').innerHTML=BLOCKS.map(b=>`<label><input type="checkbox" data-id="${b.id}" ${blockEl(b.id).classList.contains('ix-hide')?'':'checked'}> ${esc(b.label)}</label>`).join('');
  $$('#ixList input').forEach(i=>i.onchange=()=>{ blockEl(i.dataset.id).classList.toggle('ix-hide',!i.checked); saveLayout(); layoutFix(); });
}
function openPop(id,btn){ $$('.ix-pop').forEach(p=>{ if(p.id!==id) p.classList.remove('on'); }); const p=$('#'+id); if(p.classList.contains('on')){ p.classList.remove('on'); return false; }
  const b=btn.getBoundingClientRect(); p.style.top=(b.bottom+8)+'px'; p.style.left=Math.max(10,Math.min(innerWidth-320,b.right-310))+'px'; p.classList.add('on'); return true; }
$('#ixCustom').onclick=e=>{ renderCustom(); openPop('ixPopC',e.currentTarget); };
$('#ixOk').onclick=()=>$('#ixPopC').classList.remove('on');
$('#ixReset').onclick=()=>{ store.set(LKEY,null); location.reload(); };
// arrastar dentro da mesma coluna
let dragEl=null;
$$('[data-ix]').forEach(el=>{
  const h=el.querySelector('.ix-h'); if(h){ h.onmousedown=()=>{ el.draggable=true; }; h.onmouseup=()=>{ el.draggable=false; }; }
  el.addEventListener('dragstart',e=>{ if(!el.draggable) return; dragEl=el; el.classList.add('ix-drag'); e.dataTransfer.effectAllowed='move'; try{e.dataTransfer.setData('text/plain',el.dataset.ix);}catch(x){} });
  el.addEventListener('dragend',()=>{ el.classList.remove('ix-drag'); el.draggable=false; $$('.ix-before,.ix-after').forEach(x=>x.classList.remove('ix-before','ix-after')); dragEl=null; });
  el.addEventListener('dragover',e=>{ if(!dragEl||dragEl===el||dragEl.parentElement!==el.parentElement) return; e.preventDefault(); const r=el.getBoundingClientRect();
    const horiz=getComputedStyle(el.parentElement).gridTemplateColumns.split(' ').length>1&&el.parentElement.classList.contains('kpis'); const after=horiz?e.clientX>r.left+r.width/2:e.clientY>r.top+r.height/2;
    el.classList.toggle('ix-after',after); el.classList.toggle('ix-before',!after); });
  el.addEventListener('dragleave',()=>el.classList.remove('ix-before','ix-after'));
  el.addEventListener('drop',e=>{ if(!dragEl||dragEl===el||dragEl.parentElement!==el.parentElement) return; e.preventDefault(); const after=el.classList.contains('ix-after');
    el.classList.remove('ix-before','ix-after'); el.parentElement.insertBefore(dragEl,after?el.nextSibling:el); saveLayout(); resizeAll(); toast('Ordem salva'); });
});
applyLayout(store.get(LKEY,null));

/* ---------- link da visão ---------- */
function viewLink(){
  const s={}; Object.entries(S).forEach(([k,v])=>{ if(v!=null) s[k]=v; });
  const o={f:s}; if(P.range) o.p=[P.range[0]+P.k0,P.range[1]+P.k0];
  if(document.documentElement.dataset.theme==='dark') o.t='dark';
  if(P.ext&&A.view) o.m=[+A.view.center.longitude.toFixed(4),+A.view.center.latitude.toFixed(4),+A.view.zoom.toFixed(2)];
  return location.href.split('#')[0]+'#visao='+encodeURIComponent(JSON.stringify(o));
}
function readLink(){
  const m=/#visao=([^&]+)/.exec(location.hash); if(!m) return null;
  try{ const o=JSON.parse(decodeURIComponent(m[1]));
    Object.entries(o.f||{}).forEach(([k,v])=>{ S[k]=v; });
    if(o.p&&HASP){ const a=o.p[0]-P.k0,b=o.p[1]-P.k0; if(b>=0&&a<P.n) P.range=[Math.max(0,a),Math.min(P.n-1,b)]; }
    if(o.t==='dark') setTheme('dark',true);
    if(o.m) P.pendM=o.m;
    return o;
  }catch(e){ return null; }
}
$('#ixShare').onclick=async e=>{
  const url=viewLink(); const btn=e.currentTarget;
  try{ await navigator.clipboard.writeText(url); toast('Link desta visão copiado'); }
  catch(x){ $('#ixLink').value=url; if(openPop('ixPopS',btn)){ const i=$('#ixLink'); i.focus(); i.select(); } }
};
$('#ixOkS').onclick=()=>$('#ixPopS').classList.remove('on');

/* ---------- passeio guiado ---------- */
let TS=0,STEPS=[];
const countBy=(R,k)=>{ const m=new Map(); R.forEach(r=>{ const v=r[k]; if(v==null||v===A.NI||v==='') return; m.set(v,(m.get(v)||0)+1); }); return [...m.entries()].sort((a,b)=>b[1]-a[1]); };
const pct=(a,b)=>b?nf(100*a/b,a/b<.1?1:0)+'%':'—';
function resetAll(){ Object.keys(S).forEach(k=>S[k]=null); P.range=null; P.ext=false; if(ext) ext.checked=false; P.hover=null; syncZoom(); }
function buildTour(){
  const D=A.D, tot=D.length; STEPS=[];
  const per=HASP&&P.n?` entre ${plabel(0,true)} e ${plabel(P.n-1,true)}`:'';
  STEPS.push({t:'Visão geral',x:`O painel reúne ${nf(tot)} ${UNIT}${per}. Os indicadores do topo, os gráficos e o mapa respondem juntos a cada filtro.`,spot:['kpis','map'],
    go:()=>{ resetAll(); A.render(); A.rezoom(); }});
  const fd=(C.filters||[])[0];
  if(fd){ const top=countBy(D,fd.field)[0];
    if(top) STEPS.push({t:'Onde se concentram',x:`${A.fold(top[0]).startsWith(A.fold(fd.label))?'':fd.label+' '}${top[0]} reúne ${nf(top[1])} ${UNIT} (${pct(top[1],tot)} do total). Com o filtro aplicado, o mapa se aproxima e todos os números passam a mostrar só esse recorte.`,spot:['kpis','map'],
      go:()=>{ resetAll(); S[fd.field]=top[0]; A.render(); }}); }
  const hb=(C.charts||[]).find(c=>c.type==='hbar'&&!blockEl(c._id).classList.contains('ix-hide'));
  if(hb){ STEPS.push({t:hb.title,x:'',spot:[hb._id,'map'],
    pre:()=>{ const R=A.rows(), top=countBy(R,hb.field)[0]; if(!top) return 'Sem dados neste recorte.';
      return `${top[0]} lidera em “${hb.title.toLowerCase()}”, com ${nf(top[1])} ${UNIT}. Os pontos correspondentes acendem no mapa enquanto os demais ficam em cinza — o mesmo acontece quando você passa o mouse em qualquer barra.`; },
    go:()=>{ const R=A.rows(), top=countBy(R,hb.field)[0]; if(!top) return; X.chartHover(hb.field,top[0]); chartsHighlight({[hb.field]:top[0]}); }}); }
  const dn=(C.charts||[]).find(c=>c.type==='donut'&&!blockEl(c._id).classList.contains('ix-hide'));
  if(dn){ const top=countBy(D,dn.field)[0]; const lab=v=>dn.labels&&dn.labels[v]||v;
    if(top) STEPS.push({t:dn.title,x:`No total, “${lab(top[0])}” responde por ${nf(top[1])} ${UNIT} (${pct(top[1],tot)}). Clique numa fatia ou num item da legenda para filtrar o painel inteiro.`,spot:[dn._id,'map'],
      go:()=>{ resetAll(); A.render(); A.rezoom(); setTimeout(()=>{ X.chartHover(dn.field,top[0]); chartsHighlight({[dn.field]:top[0]}); },400); }}); }
  if(HASP&&P.n>1&&!blockEl('period').classList.contains('ix-hide')) STEPS.push({t:'Evolução no tempo',x:`A linha do tempo reproduz os registros ${WEEK?'semana a semana':'mês a mês'}: o período em destaque acende no mapa e os indicadores acompanham. Arraste as alças amarelas para escolher um período.`,spot:['period','map','kpis'],
    go:()=>{ hoverIds(null); blockEl('period').scrollIntoView({behavior:'smooth',block:'center'}); setTimeout(()=>{ if(!P.play) play(); },700); }});
  STEPS.push({t:'Agora é com você',x:'Passe o mouse em barras e pontos, clique para filtrar, use “Só a área visível” no mapa, troque o tema e monte sua tela em “Personalizar”. “Compartilhar visão” gera um link com tudo o que está aplicado. A seleção de camadas e a legenda do mapa continuam nos botões de sempre.',spot:[],
    go:()=>{ if(P.play) stopPlay(); resetAll(); A.render(); A.rezoom(); window.scrollTo({top:0,behavior:'smooth'}); }});
}
function tourGo(i){
  TS=i; const s=STEPS[i];
  $('#ixTS').textContent=`Passo ${i+1} de ${STEPS.length}`; $('#ixTT').textContent=s.t;
  $('#ixTD').innerHTML=STEPS.map((x,j)=>`<i class="${j===i?'on':''}"></i>`).join(''); $('#ixTN').textContent=i===STEPS.length-1?'Concluir':'Próximo';
  if(P.play&&s.spot[0]!=='period') stopPlay();
  hoverIds(null);
  $$('.ix-spot').forEach(e=>e.classList.remove('ix-spot'));
  s.spot.forEach(id=>{ const el=blockEl(id); if(el&&!el.classList.contains('ix-hide')) el.classList.add('ix-spot'); });
  document.body.classList.toggle('ix-touring',s.spot.length>0);
  s.go();
  $('#ixTX').textContent=s.pre?s.pre():s.x;
  const first=s.spot.map(blockEl).find(e=>e&&!e.classList.contains('ix-hide')); if(first&&s.spot[0]!=='period') first.scrollIntoView({behavior:'smooth',block:'center'});
}
function tourEnd(){ $('#ixTourBox').classList.remove('on'); document.body.classList.remove('ix-touring'); $$('.ix-spot').forEach(e=>e.classList.remove('ix-spot')); if(P.play) stopPlay(); hoverIds(null); chartsHighlight(null); }
$('#ixTour').onclick=()=>{ if(!P.inited) return; if(document.querySelector('main.wrap.show-tl')){ const t=document.querySelector('.tab[data-t="ov"]'); if(t) t.click(); }
  buildTour(); $('#ixTourBox').classList.add('on'); tourGo(0); };
$('#ixTN').onclick=()=>{ TS<STEPS.length-1?tourGo(TS+1):tourEnd(); };
$('#ixTE').onclick=tourEnd;
document.addEventListener('keydown',e=>{ if(e.key==='Escape'){ if($('#ixTourBox').classList.contains('on')) tourEnd(); $$('.ix-pop').forEach(p=>p.classList.remove('on')); } });
document.addEventListener('click',e=>{ if(!e.target.closest('.ix-pop,#ixCustom,#ixShare')) $$('.ix-pop').forEach(p=>p.classList.remove('on')); });

/* ---------- a cada atualização do painel ---------- */
X.afterRender.push(f=>{
  if(!P.inited){
    P.inited=true;
    if(HASP&&!prepDates()){ const s=$('#ixPeriod'); if(s) s.remove(); }
    const o=readLink();
    if(o) setTimeout(()=>{ A.render(); periodChart(true); },0);
    periodChart(true);
  } else periodChart(false);
  const m=A.rows('_map'); P.vis=m.length===A.D.length?null:new Set(m.map(r=>r._oid));
  kpiFx(f); extraTags(); applyEffect();
});
window.addEventListener('resize',()=>{ if(EP) EP.resize(); });
// quando volta para a aba "Visão geral", ajusta o tamanho da linha do tempo
$$('.tab').forEach(t=>t.addEventListener('click',()=>{ if(t.dataset.t==='ov') resizeAll(); else if(P.play) stopPlay(); }));
})();
