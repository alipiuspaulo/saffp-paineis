/* Protótipo interativo — Acidentes Ferroviários (SAFF-P)
   Recursos: mapa e gráficos ligados (passar o mouse destaca nos dois), filtros por clique,
   linha do tempo com seleção de período e reprodução, indicadores animados com tendência,
   modo claro/escuro, blocos reorganizáveis, visão salva no link e passeio guiado. */
'use strict';
const LAYER='https://services.arcgis.com/4CZwpdWHGNPLU7QQ/arcgis/rest/services/Acidentes_Ferrovi%C3%A1rios/FeatureServer/0';
const MALHA_URL='https://services.arcgis.com/4CZwpdWHGNPLU7QQ/arcgis/rest/services/Ferrovias_Concedidas_(2021)/FeatureServer/0';
const NI='Não informado';
const UFREG={AC:'Norte',AM:'Norte',AP:'Norte',PA:'Norte',RO:'Norte',RR:'Norte',TO:'Norte',AL:'Nordeste',BA:'Nordeste',CE:'Nordeste',MA:'Nordeste',PB:'Nordeste',PE:'Nordeste',PI:'Nordeste',RN:'Nordeste',SE:'Nordeste',DF:'Centro-Oeste',GO:'Centro-Oeste',MS:'Centro-Oeste',MT:'Centro-Oeste',ES:'Sudeste',MG:'Sudeste',RJ:'Sudeste',SP:'Sudeste',PR:'Sul',RS:'Sul',SC:'Sul'};
const REGIOES=['Norte','Nordeste','Centro-Oeste','Sudeste','Sul'];
const FERROVIAS={EFC:'Estrada de Ferro Carajás',EFVM:'Estrada de Ferro Vitória a Minas',FCA:'Ferrovia Centro-Atlântica',FNSTN:'Ferrovia Norte-Sul Tramo Norte',FTC:'Ferrovia Tereza Cristina',FTL:'Ferrovia Transnordestina Logística',MRS:'MRS Logística',RMC:'Rumo Malha Central',RMN:'Rumo Malha Norte',RMO:'Rumo Malha Oeste',RMP:'Rumo Malha Paulista',RMS:'Rumo Malha Sul',EFPO:'Estrada de Ferro Paraná Oeste (Ferroeste)'};
const GRUPO={RMS:'Rumo',RMP:'Rumo',RMN:'Rumo',RMO:'Rumo',RMC:'Rumo',FCA:'VLI',FNSTN:'VLI',EFC:'Vale',EFVM:'Vale',MRS:'MRS',FTL:'Transnordestina',FTC:'FTC',EFPO:'Ferroeste'};
const GRUPO_COR={Rumo:'#1C5FAD',VLI:'#1E9E5A',Vale:'#7B3FA0',MRS:'#0A91A8',Transnordestina:'#E0A800',FTC:'#A3214F',Ferroeste:'#6A7486'};
const MES=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const FIELDS=['REGIAO','UF','Ferrovia','Natureza','Causa','Grave'];
const FLABEL={REGIAO:'Região',UF:'UF',Ferrovia:'Ferrovia',Natureza:'Natureza',Causa:'Causa',Grave:'Gravidade'};
const CARDS=[{id:'kpis',label:'Indicadores'},{id:'map',label:'Mapa'},{id:'ferrovia',label:'Por ferrovia'},{id:'gravidade',label:'Gravidade'},{id:'timeline',label:'Linha do tempo'},{id:'natureza',label:'Natureza do acidente'},{id:'causa',label:'Causa direta'}];
const LS='saffp_proto_acidentes_layout_v1';

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const fmt=(n,d=0)=>(+n).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const css=v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const num=v=>(v!==null&&v!==''&&isFinite(+v))?+v:0;
const clean=v=>{const s=String(v??'').trim();return s?s:NI;};
const median=a=>{const v=a.filter(x=>x!=null&&isFinite(x)).sort((x,y)=>x-y);if(!v.length)return 0;const h=v.length>>1;return v.length%2?v[h]:(v[h-1]+v[h])/2;};
const mlabel=(i,long)=>{const [y,m]=MONTHS[i].split('-');return `${MES[+m-1]}/${long?y:y.slice(2)}`;};
function toast(t){const e=$('#toast');e.textContent=t;e.classList.add('on');clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove('on'),2200);}

/* ---------- estado ---------- */
const S={f:Object.fromEntries(FIELDS.map(k=>[k,null])),range:null,extent:false,extGeo:null,mode:'pts',hover:null,play:false,cur:null,theme:'light'};
let D=[],MONTHS=[],YEARS=[];
const CH={};           // instâncias ECharts
let VIEW=null,FL=null,LV=null,MALHA=null,ESRI={},VIS=null;
let suppressZoom=false;

/* ---------- dados ---------- */
async function load(){
  const out=[];let off=0;
  for(;;){
    const p=new URLSearchParams({where:'1=1',outFields:'*',returnGeometry:'true',outSR:'4326',geometryPrecision:'5',resultOffset:off,resultRecordCount:2000,f:'json'});
    const j=await (await fetch(LAYER+'/query?'+p)).json();
    if(j.error) throw new Error(j.error.message);
    out.push(...j.features);
    if(!j.exceededTransferLimit||!j.features.length) break;
    off+=j.features.length;
  }
  const ym=new Set();
  D=out.map((f,i)=>{
    const a=f.attributes, r={OID:i+1,FID:a.FID,raw:a};
    r.Grave=clean(a.Grave); r.Ferrovia=clean(a.Ferrovia); r.UF=clean(a.UF).toUpperCase(); r.REGIAO=UFREG[r.UF]||NI;
    r.Natureza=clean(a.Natureza); r.Causa=clean(a.Causa_Dire);
    r.Mun=clean(a['Município']!=null&&String(a['Município']).trim()?a['Município']:a.Municipio);
    r.FER=num(a['Nº_Ferido'])||num(a.N_Feridos); r.OBI=num(a['Nº_Óbito'])||num(a.N_Obitos);
    r.INT=a.Tempo_de_I!=null&&a.Tempo_de_I!==''?+a.Tempo_de_I:null;
    let ds=String(a.Data_da_Oc||'').trim().replace(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/,(x,d,mo,y)=>`${d}/${mo}/20${y}`);
    const m=/^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(ds);
    if(m&&+m[3]>=2000&&+m[3]<=2030&&+m[2]>=1&&+m[2]<=12){ r.date=`${m[1].padStart(2,'0')}/${m[2].padStart(2,'0')}/${m[3]}`; r.ym=`${m[3]}-${m[2].padStart(2,'0')}`; r.ano=+m[3]; ym.add(r.ym); }
    if(f.geometry&&isFinite(f.geometry.x)&&isFinite(f.geometry.y)&&(f.geometry.x||f.geometry.y)){ r.x=f.geometry.x; r.y=f.geometry.y; }
    return r;
  });
  // meses contínuos do primeiro ao último
  const s=[...ym].sort(); if(s.length){ let [y,mo]=s[0].split('-').map(Number); const [y2,m2]=s[s.length-1].split('-').map(Number);
    while(y<y2||(y===y2&&mo<=m2)){ MONTHS.push(`${y}-${String(mo).padStart(2,'0')}`); if(++mo>12){mo=1;y++;} } }
  const idx=Object.fromEntries(MONTHS.map((k,i)=>[k,i]));
  D.forEach(r=>{ r.mi=r.ym!=null?idx[r.ym]:null; });
  YEARS=[...new Set(D.filter(r=>r.ano).map(r=>r.ano))].sort();
}

function rows(o={}){
  const ext=S.extent&&S.extGeo&&!o.noExtent?S.extGeo:null;
  return D.filter(r=>{
    for(const k of FIELDS){ if(k===o.except) continue; const v=S.f[k]; if(v&&r[k]!==v) return false; }
    if(S.range&&!o.noRange){ if(r.mi==null||r.mi<S.range[0]||r.mi>S.range[1]) return false; }
    if(ext){ if(r.x==null||r.x<ext.xmin||r.x>ext.xmax||r.y<ext.ymin||r.y>ext.ymax) return false; }
    return true;
  });
}
const countBy=(R,k)=>{const m=new Map();R.forEach(r=>m.set(r[k],(m.get(r[k])||0)+1));return [...m.entries()].sort((a,b)=>b[1]-a[1]);};

/* ---------- filtros ---------- */
function setF(k,v){
  S.f[k]=(S.f[k]===v?null:v);
  if(k==='REGIAO'&&S.f.UF&&S.f.REGIAO&&UFREG[S.f.UF]!==S.f.REGIAO) S.f.UF=null;
  if(k==='UF'&&S.f.UF) S.f.REGIAO=UFREG[S.f.UF]||null;
  render();
}
function renderFilterBar(){
  $('#fReg').innerHTML=[`<button class="chip ${!S.f.REGIAO?'on':''}" data-v="">Brasil</button>`,...REGIOES.map(g=>`<button class="chip ${S.f.REGIAO===g?'on':''}" data-v="${g}">${g}</button>`)].join('');
  $$('#fReg .chip').forEach(b=>b.onclick=()=>{ S.f.REGIAO=null; if(b.dataset.v) setF('REGIAO',b.dataset.v); else { S.f.UF=null; render(); } });
  const ufs=[...new Set(D.filter(r=>!S.f.REGIAO||r.REGIAO===S.f.REGIAO).map(r=>r.UF))].filter(u=>u!==NI).sort();
  $('#fUF').innerHTML=`<option value="">Todas</option>`+ufs.map(u=>`<option ${S.f.UF===u?'selected':''}>${u}</option>`).join('');
  const fer=[...new Set(D.map(r=>r.Ferrovia))].filter(u=>u!==NI).sort();
  $('#fFer').innerHTML=`<option value="">Todas</option>`+fer.map(u=>`<option value="${u}" ${S.f.Ferrovia===u?'selected':''}>${u} — ${esc(FERROVIAS[u]||u)}</option>`).join('');
}
$('#fUF').onchange=e=>{ S.f.UF=null; e.target.value?setF('UF',e.target.value):render(); };
$('#fFer').onchange=e=>{ S.f.Ferrovia=null; e.target.value?setF('Ferrovia',e.target.value):render(); };

function renderPills(){
  const p=[];
  FIELDS.forEach(k=>{ if(S.f[k]){ const v=k==='Grave'?(S.f[k]==='Sim'?'Grave':'Não grave'):k==='Ferrovia'?S.f[k]:S.f[k]; p.push(`<span class="pill">${FLABEL[k]}: <b>${esc(v)}</b><button data-k="${k}" title="Remover">×</button></span>`);} });
  if(S.range) p.push(`<span class="pill">Período: <b>${mlabel(S.range[0],1)} – ${mlabel(S.range[1],1)}</b><button data-k="range" title="Remover">×</button></span>`);
  if(S.extent) p.push(`<span class="pill">Área: <b>visível no mapa</b><button data-k="extent" title="Remover">×</button></span>`);
  if(p.length>1) p.push(`<span class="pill clear" id="clearAll">Limpar tudo</span>`);
  $('#pills').innerHTML=p.join('');
  $$('#pills button').forEach(b=>b.onclick=()=>{ const k=b.dataset.k; if(k==='range'){S.range=null;syncZoom();} else if(k==='extent'){S.extent=false;$('#tExt').checked=false;} else S.f[k]=null; render(); });
  const c=$('#clearAll'); if(c) c.onclick=()=>{ FIELDS.forEach(k=>S.f[k]=null); S.range=null; S.extent=false; $('#tExt').checked=false; syncZoom(); render(); };
}

/* ---------- indicadores ---------- */
const KPIS=[
  {id:'n',label:'Acidentes',color:'--accent',val:R=>R.length,sub:R=>`${fmt(R.filter(r=>r.Grave==='Sim').length)} graves`},
  {id:'g',label:'Acidentes graves',color:'--grave',val:R=>R.filter(r=>r.Grave==='Sim').length,sub:R=>R.length?`${fmt(100*R.filter(r=>r.Grave==='Sim').length/R.length,1)}% do total`:'—'},
  {id:'f',label:'Vítimas feridas',color:'--gold',val:R=>R.reduce((s,r)=>s+r.FER,0),sub:R=>`${fmt(R.filter(r=>r.FER>0).length)} acidentes com feridos`},
  {id:'o',label:'Óbitos',color:'--bad',val:R=>R.reduce((s,r)=>s+r.OBI,0),sub:R=>`${fmt(R.filter(r=>r.OBI>0).length)} acidentes com óbito`}
];
function buildKPIs(){ $('#kpis').innerHTML=KPIS.map(k=>`<div class="kpi" id="k_${k.id}" style="--kc:var(${k.color})"><div class="t">${k.label}</div><div class="v" data-v="0">0</div><div class="d"></div><svg class="spark"></svg><div class="skel"></div></div>`).join(''); }
function tween(el,to,dec=0){
  const from=+el.dataset.v||0; el.dataset.v=to; cancelAnimationFrame(el._raf);
  const t0=performance.now(),dur=650;
  const step=t=>{const k=Math.min(1,(t-t0)/dur),e=1-Math.pow(1-k,3);el.textContent=fmt(from+(to-from)*e,dec);if(k<1)el._raf=requestAnimationFrame(step);};
  el._raf=requestAnimationFrame(step);
}
function renderKPIs(R){
  KPIS.forEach(k=>{
    const box=$('#k_'+k.id); tween(box.querySelector('.v'),k.val(R));
    // tendência anual (série dentro dos filtros atuais)
    const by=YEARS.map(y=>k.val(R.filter(r=>r.ano===y)));
    // compara os dois últimos anos completos (o ano corrente ainda está em andamento)
    const yrs=YEARS.filter(y=>y<new Date().getFullYear()&&R.some(r=>r.ano===y));
    let d=`<span>${k.sub(R)}</span>`;
    if(yrs.length>=2){ const a=yrs[yrs.length-2],b=yrs[yrs.length-1]; const va=k.val(R.filter(r=>r.ano===a)),vb=k.val(R.filter(r=>r.ano===b));
      if(va>0){ const pc=100*(vb-va)/va; d+=` · <span class="${pc>0?'up':'dn'}" title="${b} em relação a ${a}">${pc>0?'▲':'▼'} ${fmt(Math.abs(pc),0)}%</span><span>${b} vs ${a}</span>`; } }
    box.querySelector('.d').innerHTML=d;
    spark(box.querySelector('svg'),by,css(k.color));
  });
}
function spark(svg,v,color){
  const w=svg.clientWidth||160,h=48,max=Math.max(1,...v),n=v.length;
  if(n<2){svg.innerHTML='';return;}
  const pts=v.map((y,i)=>[i*(w-6)/(n-1)+3,h-4-(y/max)*(h-10)]);
  const line=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join('');
  const last=pts[n-1];
  svg.setAttribute('viewBox',`0 0 ${w} ${h}`);
  svg.innerHTML=`<defs><linearGradient id="g${color.replace('#','')}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".28"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
  <path d="${line}L${last[0]} ${h}L3 ${h}Z" fill="url(#g${color.replace('#','')})"/><path d="${line}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
  <circle cx="${last[0]}" cy="${last[1]}" r="3.5" fill="${color}"/>${YEARS.map((y,i)=>`<title>${y}: ${fmt(v[i])}</title>`).join('')}`;
}

/* ---------- gráficos ---------- */
function baseOpt(){ return {textStyle:{fontFamily:'Inter, system-ui, sans-serif',color:css('--ink')},animationDuration:500,animationDurationUpdate:450,
  tooltip:{backgroundColor:css('--card'),borderColor:css('--line'),textStyle:{color:css('--ink')},extraCssText:'border-radius:10px;box-shadow:0 6px 20px rgba(0,0,0,.15)'}}; }
function initChart(id,field){
  const c=echarts.init(document.getElementById(id),null,{renderer:'canvas'}); CH[id]=c;
  if(field){
    c.on('mouseover',p=>{ if(p.data&&p.data.key!=null) hoverFrom(field,p.data.key); });
    c.on('mouseout',()=>hoverFrom(null));
    c.on('click',p=>{ if(p.data&&p.data.key!=null) setF(field,p.data.key); });
  }
  return c;
}
function hbar(id,field,top,opts={}){
  const R=rows({except:field}); let data=countBy(R,field).filter(([k])=>k!==NI||opts.keepNI);
  data=data.slice(0,top);
  const sel=S.f[field], muted=css('--muted');
  const items=data.map(([k,v])=>({value:v,key:k,name:opts.short?k:k,
    itemStyle:{color:opts.color?opts.color(k):css('--accent'),opacity:sel&&sel!==k?.28:1,borderRadius:[0,6,6,0]}}));
  CH[id].setOption({...baseOpt(),grid:{left:8,right:44,top:6,bottom:6,containLabel:true},
    tooltip:{...baseOpt().tooltip,trigger:'item',formatter:p=>`<b>${esc(opts.names?.[p.data.key]||p.data.key)}</b><br>${fmt(p.value)} acidentes`},
    xAxis:{type:'value',show:false,max:'dataMax'},
    yAxis:{type:'category',inverse:true,data:items.map(i=>i.name),axisLine:{show:false},axisTick:{show:false},
      axisLabel:{color:css('--ink'),width:opts.labelWidth||150,overflow:'truncate',fontSize:12}},
    series:[{type:'bar',data:items,barMaxWidth:18,showBackground:true,backgroundStyle:{color:css('--soft'),borderRadius:[0,6,6,0]},
      label:{show:true,position:'right',color:muted,fontSize:11.5,formatter:p=>fmt(p.value)},
      emphasis:{focus:'self',itemStyle:{shadowBlur:10,shadowColor:'rgba(0,0,0,.25)'}},blur:{itemStyle:{opacity:.25}}}]},{notMerge:true});
}
function donut(){
  const R=rows({except:'Grave'}); const g=R.filter(r=>r.Grave==='Sim').length,n=R.filter(r=>r.Grave==='Não').length, sel=S.f.Grave;
  const it=(key,name,v,c)=>({key,name,value:v,itemStyle:{color:c,opacity:sel&&sel!==key?.3:1,borderColor:css('--card'),borderWidth:3}});
  const tot=g+n;
  CH.cGrave.setOption({...baseOpt(),tooltip:{...baseOpt().tooltip,trigger:'item',formatter:p=>`<b>${p.name}</b><br>${fmt(p.value)} (${fmt(p.percent,1)}%)`},
    legend:{bottom:4,icon:'circle',textStyle:{color:css('--ink')},selectedMode:false},
    title:{text:fmt(sel?(sel==='Sim'?g:n):tot),subtext:sel?(sel==='Sim'?'graves':'não graves'):'acidentes',left:'center',top:'36%',textStyle:{fontSize:26,fontWeight:800,color:css('--ink')},subtextStyle:{color:css('--muted'),fontSize:12},itemGap:2},
    series:[{type:'pie',radius:['52%','74%'],center:['50%','45%'],avoidLabelOverlap:true,label:{show:false},
      emphasis:{scale:true,scaleSize:8},data:[it('Sim','Grave',g,css('--grave')),it('Não','Não grave',n,css('--nao'))]}]},{notMerge:true});
}
function timeline(full){
  const R=rows({noRange:true}); const gs=new Array(MONTHS.length).fill(0),ns=new Array(MONTHS.length).fill(0);
  R.forEach(r=>{ if(r.mi==null) return; (r.Grave==='Sim'?gs:ns)[r.mi]++; });
  const op=i=>S.play&&S.cur!=null&&i>S.cur?.18:1;
  const mk=(arr,c)=>arr.map((v,i)=>({value:v,itemStyle:{color:c,opacity:op(i)}}));
  const series=[{name:'Não graves',type:'bar',stack:'t',data:mk(ns,css('--nao')),barCategoryGap:'18%'},
    {name:'Graves',type:'bar',stack:'t',data:mk(gs,css('--grave')),itemStyle:{borderRadius:[3,3,0,0]},
     markLine:S.play&&S.cur!=null?{symbol:'none',silent:true,lineStyle:{color:css('--gold'),width:2},label:{formatter:mlabel(S.cur,1),color:css('--ink'),fontWeight:700},data:[{xAxis:S.cur}]}:undefined}];
  if(!full){ CH.cTime.setOption({series}); return; }
  const zr=S.range||[0,MONTHS.length-1];
  CH.cTime.setOption({...baseOpt(),grid:{left:40,right:18,top:24,bottom:58},
    legend:{top:0,right:10,textStyle:{color:css('--ink')},icon:'roundRect'},
    tooltip:{...baseOpt().tooltip,trigger:'axis',axisPointer:{type:'shadow'},formatter:ps=>`<b>${mlabel(ps[0].dataIndex,1)}</b><br>`+ps.map(p=>`${p.marker} ${p.seriesName}: ${fmt(p.value)}`).join('<br>')},
    xAxis:{type:'category',data:MONTHS.map((m,i)=>mlabel(i)),axisLine:{lineStyle:{color:css('--line')}},axisLabel:{color:css('--muted')},axisTick:{show:false}},
    yAxis:{type:'value',splitLine:{lineStyle:{color:css('--line')}},axisLabel:{color:css('--muted')}},
    dataZoom:[{type:'slider',startValue:zr[0],endValue:zr[1],height:22,bottom:10,borderColor:css('--line'),fillerColor:'rgba(242,183,5,.25)',
      handleStyle:{color:css('--gold'),borderColor:css('--gold')},moveHandleStyle:{color:css('--gold')},textStyle:{color:css('--muted')},
      dataBackground:{lineStyle:{color:css('--muted')},areaStyle:{color:css('--soft')}},selectedDataBackground:{lineStyle:{color:css('--gold')},areaStyle:{color:'rgba(242,183,5,.3)'}},
      labelFormatter:i=>mlabel(i,1),zoomOnMouseWheel:false},{type:'inside',zoomOnMouseWheel:false,moveOnMouseWheel:false}],
    series},{notMerge:true});
}
function syncZoom(){ if(!CH.cTime) return; suppressZoom=true; const zr=S.range||[0,MONTHS.length-1]; CH.cTime.dispatchAction({type:'dataZoom',startValue:zr[0],endValue:zr[1]}); suppressZoom=false; }
function renderPeriod(){ $('#period').textContent=MONTHS.length?(S.range?`${mlabel(S.range[0],1)} – ${mlabel(S.range[1],1)}`:`${mlabel(0,1)} – ${mlabel(MONTHS.length-1,1)} (todo o período)`):''; }

/* ligação gráfico → mapa e mapa → gráfico */
function hoverFrom(field,key){ S.hover=field?{field,key}:null; applyEffect(); }
function q(v){ return "'"+String(v).replace(/'/g,"''")+"'"; }
function applyEffect(){
  if(!LV) return;
  if(S.play&&S.cur!=null){ LV.featureEffect={filter:{where:`mi = ${S.cur}`},includedEffect:'bloom(1.6, 0.6px, 0) drop-shadow(0px, 0px, 6px, #F2B705)',excludedEffect:'opacity(45%)'}; return; }
  if(S.hover){ LV.featureEffect={filter:{where:`${S.hover.field} = ${q(S.hover.key)}`},includedEffect:'bloom(1, 0.4px, 0.1)',excludedEffect:'grayscale(100%) opacity(15%)'}; return; }
  LV.featureEffect=null;
}
function chartsHighlight(r){
  const pairs=[['cFer','Ferrovia'],['cNat','Natureza'],['cCausa','Causa']];
  pairs.forEach(([id,k])=>{ const c=CH[id]; c.dispatchAction({type:'downplay',seriesIndex:0}); if(r){ const opt=c.getOption(); const i=opt.series[0].data.findIndex(d=>d.key===r[k]); if(i>=0) c.dispatchAction({type:'highlight',seriesIndex:0,dataIndex:i}); } });
  CH.cGrave.dispatchAction({type:'downplay',seriesIndex:0}); if(r) CH.cGrave.dispatchAction({type:'highlight',seriesIndex:0,dataIndex:r.Grave==='Sim'?0:1});
}

/* ---------- mapa ---------- */
function pointRenderer(){
  const ol=S.theme==='dark'?[10,18,34,.9]:[255,255,255,.95];
  if(S.mode==='heat') return {type:'heatmap',radius:16,maxDensity:0.035,minDensity:0,colorStops:[{ratio:0,color:'rgba(242,183,5,0)'},{ratio:.15,color:'rgba(242,183,5,.55)'},{ratio:.45,color:'rgba(234,120,20,.8)'},{ratio:.75,color:'rgba(194,40,30,.9)'},{ratio:1,color:'rgba(110,20,20,1)'}]};
  return {type:'unique-value',field:'Grave',defaultSymbol:{type:'simple-marker',size:6,color:css('--nao'),outline:{color:ol,width:.8}},
    uniqueValueInfos:[{value:'Sim',symbol:{type:'simple-marker',size:10,color:css('--grave'),outline:{color:ol,width:1.2}}},
      {value:'Não',symbol:{type:'simple-marker',size:6.5,color:css('--nao'),outline:{color:ol,width:.8}}}]};
}
function malhaRenderer(){ const c=S.theme==='dark'?[232,236,242,.45]:[40,52,76,.5]; return {type:'simple',symbol:{type:'simple-line',color:c,width:1.3}}; }
function initMap(){
  return new Promise(res=>require(['esri/Map','esri/views/MapView','esri/layers/FeatureLayer','esri/Graphic','esri/geometry/Extent','esri/geometry/support/webMercatorUtils','esri/core/reactiveUtils'],
  (EMap,MapView,FeatureLayer,Graphic,Extent,wmu,ru)=>{
    ESRI={Extent,wmu};
    const src=D.filter(r=>r.x!=null).map(r=>new Graphic({geometry:{type:'point',longitude:r.x,latitude:r.y},
      attributes:{OID:r.OID,Grave:r.Grave,Ferrovia:r.Ferrovia,Natureza:r.Natureza,Causa:r.Causa,UF:r.UF,REGIAO:r.REGIAO,mi:r.mi==null?-1:r.mi}}));
    FL=new FeatureLayer({source:src,objectIdField:'OID',geometryType:'point',spatialReference:{wkid:4326},title:'Acidentes',
      fields:[{name:'OID',type:'oid'},...['Grave','Ferrovia','Natureza','Causa','UF','REGIAO'].map(n=>({name:n,type:'string'})),{name:'mi',type:'integer'}],
      renderer:pointRenderer(),popupEnabled:false});
    MALHA=new FeatureLayer({url:MALHA_URL,definitionExpression:"TIP_SITUAC IN ('Em Operação','Em Obra')",renderer:malhaRenderer(),popupEnabled:false,title:'Malha federal'});
    const map=new EMap({basemap:S.theme==='dark'?'dark-gray-vector':'gray-vector',layers:[MALHA,FL]});
    VIEW=new MapView({container:'mapv',map,center:[-50,-16],zoom:4,constraints:{minZoom:3},ui:{components:['zoom']},highlightOptions:{color:'#F2B705',haloOpacity:1,fillOpacity:.2}});
    VIEW.whenLayerView(FL).then(lv=>{ LV=lv; res(); });
    // passar o mouse no ponto → cartão + destaque nos gráficos
    let last=null,pending=false,hl=null;
    VIEW.on('pointer-move',ev=>{ if(pending) return; pending=true; requestAnimationFrame(()=>{ pending=false;
      VIEW.hitTest(ev,{include:[FL]}).then(h=>{ const g=h.results[0]?.graphic; const id=g?.attributes?.OID;
        if(id!==last){ last=id; hl?.remove(); hl=null; const r=id&&(!VIS||VIS.has(id))?D[id-1]:null;
          if(r&&S.mode==='pts'){ hl=LV.highlight(id); showHover(r,ev); chartsHighlight(r); VIEW.container.style.cursor='pointer'; }
          else { hideHover(); chartsHighlight(null); VIEW.container.style.cursor=''; } }
        else if(id) moveHover(ev); }); }); });
    VIEW.on('pointer-leave',()=>{ last=null; hl?.remove(); hl=null; hideHover(); chartsHighlight(null); });
    VIEW.on('click',ev=>VIEW.hitTest(ev,{include:[FL]}).then(h=>{ const g=h.results.find(x=>!VIS||VIS.has(x.graphic?.attributes?.OID))?.graphic; if(g) openDrawer(D[g.attributes.OID-1]); }));
    ru.when(()=>VIEW.stationary,()=>{ if(!S.extent) return; S.extGeo=wmu.webMercatorToGeographic(VIEW.extent); render({fromMap:true}); });
  }));
}
function renderMap(){
  if(!LV) return;
  const R=rows({noExtent:true});
  const ids=R.filter(r=>r.x!=null).map(r=>r.OID);
  VIS=R.length===D.length?null:new Set(ids);
  LV.filter=VIS?{objectIds:ids}:null;
  applyEffect();
}
function showHover(r,ev){
  const h=$('#hov');
  h.innerHTML=`<div class="tt">${esc(r.Natureza)} <span class="tag" style="background:${r.Grave==='Sim'?css('--grave'):css('--nao')}">${r.Grave==='Sim'?'GRAVE':'não grave'}</span></div>
    <div>${esc(r.date||'data não informada')} · <b>${esc(r.Ferrovia)}</b> ${esc(FERROVIAS[r.Ferrovia]?'— '+FERROVIAS[r.Ferrovia]:'')}</div>
    <div>${esc(r.Mun!==NI?r.Mun+'/':'')}${esc(r.UF)} · causa: ${esc(r.Causa)}</div>
    <div style="color:var(--muted);margin-top:4px">${r.FER} feridos · ${r.OBI} óbitos · clique para detalhes</div>`;
  moveHover(ev); h.classList.add('on');
}
function moveHover(ev){ const h=$('#hov'),W=VIEW.width; let x=ev.x+16,y=ev.y+14; if(x+290>W) x=ev.x-300; if(y+120>VIEW.height) y=ev.y-130; h.style.left=x+'px'; h.style.top=y+'px'; }
function hideHover(){ $('#hov').classList.remove('on'); }
function openDrawer(r){
  const a=r.raw, F=[['Data',r.date],['Hora',a.Hora_da_Oc],['Ferrovia',`${r.Ferrovia}${FERROVIAS[r.Ferrovia]?' — '+FERROVIAS[r.Ferrovia]:''}`],['Linha',a.Linha],['Km',a.Km_Inicial],
    ['Município/UF',`${r.Mun}/${r.UF}`],['Natureza',r.Natureza],['Causa direta',r.Causa],['Detalhamento',a.Detalhamen],['Gravidade',r.Grave==='Sim'?'Grave':'Não grave'],
    ['Feridos',r.FER],['Óbitos',r.OBI],['Interrupção',r.INT!=null?fmt(r.INT,1)+' h':null],['Comunicação',a.Tempo_Comu!=null?fmt(a.Tempo_Comu,1)+' h':null]];
  $('#dTitle').innerHTML=`${esc(r.Natureza)}<div style="font-size:12.5px;color:var(--muted);font-weight:500;margin-top:3px">Ocorrência FID ${r.FID}</div>`;
  $('#dBody').innerHTML='<dl>'+F.filter(([,v])=>v!=null&&v!==''&&v!==NI).map(([k,v])=>`<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')+'</dl>'+
    `<div class="row" style="margin-top:16px;display:flex;gap:8px"><button class="btn" id="dZoom">Aproximar no mapa</button><button class="btn" id="dSame">Filtrar esta ferrovia</button></div>`;
  $('#drawer').classList.add('on');
  $('#dZoom').onclick=()=>VIEW.goTo({center:[r.x,r.y],zoom:12},{duration:1200});
  $('#dSame').onclick=()=>{ S.f.Ferrovia=null; setF('Ferrovia',r.Ferrovia); };
}
$('#dClose').onclick=()=>$('#drawer').classList.remove('on');
$('#tExt').onchange=e=>{ S.extent=e.target.checked; S.extGeo=S.extent&&VIEW?ESRI.wmu.webMercatorToGeographic(VIEW.extent):null; render(); };
$$('#segMode button').forEach(b=>b.onclick=()=>{ S.mode=b.dataset.m; $$('#segMode button').forEach(x=>x.classList.toggle('on',x===b)); if(FL) FL.renderer=pointRenderer(); hideHover(); });
function extentOf(R){ const P=R.filter(r=>r.x!=null); if(!P.length) return null; const xs=P.map(r=>r.x).sort((a,b)=>a-b),ys=P.map(r=>r.y).sort((a,b)=>a-b);
  const pick=(a,p)=>a[Math.max(0,Math.min(a.length-1,Math.round(p*(a.length-1))))]; // ignora pontos extremos (2%)
  return new ESRI.Extent({xmin:pick(xs,.02),xmax:pick(xs,.98),ymin:pick(ys,.02),ymax:pick(ys,.98),spatialReference:{wkid:4326}}).expand(1.25); }

/* ---------- render geral ---------- */
let rq=null;
function render(o={}){
  if(rq) clearTimeout(rq);
  rq=setTimeout(()=>{ rq=null;
    const R=rows();
    renderFilterBar(); renderPills(); renderKPIs(R); renderPeriod();
    hbar('cFer','Ferrovia',13,{color:k=>GRUPO_COR[GRUPO[k]]||'#6A7486',names:FERROVIAS,labelWidth:60});
    hbar('cNat','Natureza',8,{labelWidth:180});
    hbar('cCausa','Causa',8,{labelWidth:180,color:()=>css('--gold')});
    donut();
    timeline(!!o.fullTimeline);
    if(!o.fromMap) renderMap();
    writeHash();
  },16);
}

/* ---------- linha do tempo: período e reprodução ---------- */
let playT=null;
function play(){
  if(S.play){ stopPlay(); return; }
  const a=S.range?S.range[0]:0, b=S.range?S.range[1]:MONTHS.length-1; let i=a;
  S.play=true; $('#bPlay').innerHTML='⏸ Pausar'; $('#mlab').classList.add('on');
  const tick=()=>{ S.cur=i; S.range=[a,i];
    const R=rows(); $('#mlab').innerHTML=`${mlabel(i,1)}<small>${fmt(R.length)} acidentes acumulados · ${fmt(R.filter(r=>r.mi===i).length)} no mês</small>`;
    render(); if(++i>b){ playT=setTimeout(()=>stopPlay(true),900); return; } playT=setTimeout(tick,+$('#speed').value); };
  tick();
}
function stopPlay(done){
  clearTimeout(playT); S.play=false; S.cur=null; $('#bPlay').innerHTML='▶ Reproduzir'; $('#mlab').classList.remove('on');
  syncZoom(); render(); if(done) toast('Reprodução concluída');
}
$('#bPlay').onclick=play;

/* ---------- tema ---------- */
function setTheme(t,silent){
  S.theme=t; document.documentElement.dataset.theme=t; $('#bTheme').innerHTML=t==='dark'?'☀ Claro':'☾ Escuro';
  try{localStorage.setItem('saffp_proto_theme',t);}catch(e){}
  if(VIEW){ VIEW.map.basemap=t==='dark'?'dark-gray-vector':'gray-vector'; FL.renderer=pointRenderer(); MALHA.renderer=malhaRenderer(); }
  if(!silent) setTimeout(()=>render({fullTimeline:true}),50);
}
$('#bTheme').onclick=()=>setTheme(S.theme==='dark'?'light':'dark');

/* ---------- personalizar: mostrar/ocultar, largura e ordem ---------- */
function getLayout(){ try{return JSON.parse(localStorage.getItem(LS))||null;}catch(e){return null;} }
function saveLayout(){
  const L={order:$$('#grid .card').map(c=>c.dataset.card),hidden:CARDS.filter(c=>c.id==='kpis'?$('#kpis').classList.contains('hidden'):$(`.card[data-card="${c.id}"]`).classList.contains('hidden')).map(c=>c.id),
    wide:$$('#grid .card').filter(c=>c.dataset.span==='12'&&c.dataset.defSpan!=='12').map(c=>c.dataset.card)};
  try{localStorage.setItem(LS,JSON.stringify(L));}catch(e){}
}
function applyLayout(L){
  const g=$('#grid');
  if(L?.order) L.order.forEach(id=>{ const c=g.querySelector(`.card[data-card="${id}"]`); if(c) g.appendChild(c); });
  $$('#grid .card').forEach(c=>{ c.classList.toggle('hidden',!!L?.hidden?.includes(c.dataset.card)); c.dataset.span=L?.wide?.includes(c.dataset.card)?'12':c.dataset.defSpan; });
  $('#kpis').classList.toggle('hidden',!!L?.hidden?.includes('kpis'));
  resizeAll();
}
function resizeAll(){ setTimeout(()=>{ Object.values(CH).forEach(c=>c.resize()); if(CH.cTime) renderKPIs(rows()); },60); }
function renderCustom(){
  $('#pList').innerHTML=CARDS.map(c=>{ const hid=c.id==='kpis'?$('#kpis').classList.contains('hidden'):$(`.card[data-card="${c.id}"]`).classList.contains('hidden');
    return `<label><input type="checkbox" data-id="${c.id}" ${hid?'':'checked'}> ${c.label}</label>`; }).join('');
  $$('#pList input').forEach(i=>i.onchange=()=>{ const el=i.dataset.id==='kpis'?$('#kpis'):$(`.card[data-card="${i.dataset.id}"]`); el.classList.toggle('hidden',!i.checked); saveLayout(); resizeAll(); });
}
$('#bCustom').onclick=e=>{ const p=$('#pCustom'); if(p.classList.contains('on')){p.classList.remove('on');return;} renderCustom(); const b=e.currentTarget.getBoundingClientRect();
  p.style.top=(b.bottom+8)+'px'; p.style.left=Math.max(10,Math.min(innerWidth-310,b.right-300))+'px'; p.classList.add('on'); };
$('#pOk').onclick=()=>$('#pCustom').classList.remove('on');
$('#pReset').onclick=()=>{ try{localStorage.removeItem(LS);}catch(e){} const def=['map','ferrovia','gravidade','timeline','natureza','causa']; applyLayout({order:def,hidden:[],wide:[]}); renderCustom(); toast('Layout padrão restaurado'); };
$$('#grid .wide').forEach(b=>b.onclick=()=>{ const c=b.closest('.card'); c.dataset.span=c.dataset.span==='12'?c.dataset.defSpan:'12'; if(c.dataset.defSpan==='12') c.dataset.span='12'; saveLayout(); resizeAll(); });
// arrastar e soltar pela alça
let dragEl=null;
$$('#grid .handle').forEach(h=>{ const c=h.closest('.card'); h.onmousedown=()=>{c.draggable=true;}; h.onmouseup=()=>{c.draggable=false;}; });
$$('#grid .card').forEach(c=>{
  c.addEventListener('dragstart',e=>{ dragEl=c; c.classList.add('dragging'); e.dataTransfer.effectAllowed='move'; try{e.dataTransfer.setData('text/plain',c.dataset.card);}catch(x){} });
  c.addEventListener('dragend',()=>{ c.classList.remove('dragging'); c.draggable=false; $$('.drop-before,.drop-after').forEach(x=>x.classList.remove('drop-before','drop-after')); dragEl=null; });
  c.addEventListener('dragover',e=>{ if(!dragEl||dragEl===c) return; e.preventDefault(); const b=c.getBoundingClientRect(); const after=e.clientX>b.left+b.width/2;
    c.classList.toggle('drop-after',after); c.classList.toggle('drop-before',!after); });
  c.addEventListener('dragleave',()=>c.classList.remove('drop-before','drop-after'));
  c.addEventListener('drop',e=>{ e.preventDefault(); if(!dragEl||dragEl===c) return; const after=c.classList.contains('drop-after'); c.classList.remove('drop-before','drop-after');
    c.parentNode.insertBefore(dragEl,after?c.nextSibling:c); saveLayout(); resizeAll(); toast('Ordem salva'); });
});

/* ---------- visão no link ---------- */
function writeHash(){
  const p=new URLSearchParams(); FIELDS.forEach(k=>{ if(S.f[k]) p.set(k,S.f[k]); });
  if(S.range&&!S.play) p.set('periodo',MONTHS[S.range[0]]+'_'+MONTHS[S.range[1]]);
  if(S.mode==='heat') p.set('modo','calor');
  if(S.extent&&VIEW){ p.set('mapa',[VIEW.center.longitude.toFixed(3),VIEW.center.latitude.toFixed(3),VIEW.zoom.toFixed(1)].join(',')); }
  const h=p.toString(); history.replaceState(null,'',h?'#'+h:location.pathname+location.search);
}
function readHash(){
  const p=new URLSearchParams(location.hash.slice(1)); FIELDS.forEach(k=>{ if(p.get(k)) S.f[k]=p.get(k); });
  const per=p.get('periodo'); if(per){ const [a,b]=per.split('_').map(m=>MONTHS.indexOf(m)); if(a>=0&&b>=a) S.range=[a,b]; }
  if(p.get('modo')==='calor'){ S.mode='heat'; $$('#segMode button').forEach(x=>x.classList.toggle('on',x.dataset.m==='heat')); }
  return p.get('mapa');
}
$('#bShare').onclick=async()=>{ writeHash(); try{ await navigator.clipboard.writeText(location.href); toast('Link desta visão copiado'); }catch(e){ prompt('Copie o link desta visão:',location.href); } };

/* ---------- passeio guiado ---------- */
let TS=0,STEPS=[];
function buildTour(){
  const all=D, tot=all.length, regs=countBy(all.filter(r=>r.REGIAO!==NI),'REGIAO'), reg=regs[0];
  const inReg=all.filter(r=>r.REGIAO===reg[0]); const fer=countBy(inReg.filter(r=>r.Ferrovia!==NI),'Ferrovia')[0];
  const gr=all.filter(r=>r.Grave==='Sim').length; const nat=countBy(all.filter(r=>r.Natureza!==NI),'Natureza')[0];
  const reset=()=>{ FIELDS.forEach(k=>S.f[k]=null); S.range=null; S.extent=false; $('#tExt').checked=false; S.hover=null; syncZoom(); };
  STEPS=[
    {t:'Visão geral',x:`São ${fmt(tot)} acidentes comunicados entre ${mlabel(0,1)} e ${mlabel(MONTHS.length-1,1)}. Cada ponto é uma ocorrência — os maiores, em laranja, são os graves.`,spot:['map','kpis'],
      go:()=>{ reset(); render(); VIEW.goTo({center:[-50,-16],zoom:4},{duration:1400}); }},
    {t:`Onde se concentram`,x:`A região ${reg[0]} reúne ${fmt(reg[1])} ocorrências (${fmt(100*reg[1]/tot,0)}% do total). Os números e gráficos já mostram só essa região.`,spot:['map','kpis'],
      go:()=>{ reset(); S.f.REGIAO=reg[0]; render(); const e=extentOf(inReg); if(e) VIEW.goTo(e,{duration:1600}); }},
    {t:'Ferrovia com mais ocorrências',x:`Na região ${reg[0]}, a ${fer[0]} (${FERROVIAS[fer[0]]||fer[0]}) lidera com ${fmt(fer[1])} acidentes — destacados no mapa enquanto os demais ficam em cinza.`,spot:['map','ferrovia'],
      go:()=>{ hoverFrom('Ferrovia',fer[0]); const R=CH.cFer.getOption().series[0].data; const i=R.findIndex(d=>d.key===fer[0]); CH.cFer.dispatchAction({type:'highlight',seriesIndex:0,dataIndex:i}); }},
    {t:'Gravidade',x:`${fmt(gr)} acidentes foram graves (${fmt(100*gr/tot,1)}%). A natureza mais comum é ${nat[0].toLowerCase()}, com ${fmt(nat[1])} casos.`,spot:['gravidade','natureza','map'],
      go:()=>{ reset(); render(); VIEW.goTo({center:[-50,-16],zoom:4},{duration:1200}); setTimeout(()=>hoverFrom('Grave','Sim'),300); }},
    {t:'Evolução no tempo',x:'A linha do tempo reproduz as ocorrências mês a mês: os pontos do mês acendem no mapa e os indicadores acompanham.',spot:['timeline','map','kpis'],
      go:()=>{ S.hover=null; applyEffect(); $('[data-card="timeline"]').scrollIntoView({behavior:'smooth',block:'center'}); setTimeout(()=>{ if(!S.play) play(); },700); }},
    {t:'Agora é com você',x:'Passe o mouse em barras e pontos, clique para filtrar, arraste as alças da linha do tempo, troque o tema e use “Personalizar” para montar sua tela. “Compartilhar visão” copia um link com tudo o que está aplicado.',spot:[],
      go:()=>{ if(S.play) stopPlay(); reset(); render(); window.scrollTo({top:0,behavior:'smooth'}); }}
  ];
}
function tourGo(i){
  TS=i; const s=STEPS[i]; $('#tStep').textContent=`Passo ${i+1} de ${STEPS.length}`; $('#tTitle').textContent=s.t; $('#tText').textContent=s.x;
  $('#tDots').innerHTML=STEPS.map((x,j)=>`<i class="${j===i?'on':''}"></i>`).join(''); $('#tNext').textContent=i===STEPS.length-1?'Concluir':'Próximo';
  $$('.spot').forEach(e=>e.classList.remove('spot'));
  s.spot.forEach(id=>{ const el=id==='kpis'?$('#kpis'):$(`.card[data-card="${id}"]`); el?.classList.add('spot'); });
  document.body.classList.toggle('touring',s.spot.length>0);
  const first=s.spot[0]&&(s.spot[0]==='kpis'?$('#kpis'):$(`.card[data-card="${s.spot[0]}"]`)); if(first&&s.spot[0]!=='timeline') first.scrollIntoView({behavior:'smooth',block:'center'});
  s.go();
}
function tourEnd(){ $('#tour').classList.remove('on'); document.body.classList.remove('touring'); $$('.spot').forEach(e=>e.classList.remove('spot')); if(S.play) stopPlay(); S.hover=null; applyEffect(); }
$('#bTour').onclick=()=>{ if(!VIEW) return; buildTour(); $('#tour').classList.add('on'); tourGo(0); };
$('#tNext').onclick=()=>{ if(S.play&&TS===4) stopPlay(); TS<STEPS.length-1?tourGo(TS+1):tourEnd(); };
$('#tExit').onclick=tourEnd;
document.addEventListener('keydown',e=>{ if(e.key==='Escape'){ tourEnd(); $('#drawer').classList.remove('on'); $('#pCustom').classList.remove('on'); } });

/* ---------- início ---------- */
(async function(){
  let t='light'; try{ t=localStorage.getItem('saffp_proto_theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'); }catch(e){}
  setTheme(t,true);
  applyLayout(getLayout());
  buildKPIs();
  try{ await load(); }catch(e){ document.querySelector('main').insertAdjacentHTML('afterbegin',`<div class="card" style="padding:16px;margin-bottom:14px">Não foi possível carregar os dados: ${esc(e.message)}</div>`); return; }
  const mapHash=readHash();
  initChart('cFer','Ferrovia'); initChart('cNat','Natureza'); initChart('cCausa','Causa'); initChart('cGrave','Grave'); initChart('cTime');
  CH.cTime.on('datazoom',()=>{ if(suppressZoom||S.play) return; const dz=CH.cTime.getOption().dataZoom[0]; const a=Math.round(dz.startValue),b=Math.round(dz.endValue);
    S.range=(a<=0&&b>=MONTHS.length-1)?null:[a,b]; render(); });
  document.body.classList.add('loaded'); $$('.skel').forEach(s=>s.remove());
  render({fullTimeline:true});
  await initMap();
  if(mapHash){ const [x,y,z]=mapHash.split(',').map(Number); S.extent=true; $('#tExt').checked=true; VIEW.goTo({center:[x,y],zoom:z},{animate:false}).then(()=>{ S.extGeo=ESRI.wmu.webMercatorToGeographic(VIEW.extent); render(); }); }
  renderMap();
  addEventListener('resize',()=>Object.values(CH).forEach(c=>c.resize()));
})();
