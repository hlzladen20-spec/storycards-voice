import {retentionChart} from './retention-history.js';
import {speakingChart} from './speaking-metrics.js';
const ns='http://www.w3.org/2000/svg';
const decimal=value=>value.toLocaleString('de-DE',{maximumFractionDigits:1});
function node(tag,text='',className=''){const el=document.createElement(tag);el.textContent=text;if(className)el.className=className;return el;}
function svgNode(tag,attributes,text){const el=document.createElementNS(ns,tag);for(const [key,value]of Object.entries(attributes))el.setAttribute(key,String(value));if(text!==undefined)el.textContent=text;return el;}
export function setupLearningChart(host,{getCards=()=>[],getVocabulary=()=>({}),getStats=()=>({}),language='en',now=()=>new Date()}={}){
 let mode='week',view='retention',metric='pace';
 host.className='learning-chart';host.setAttribute('aria-label','Deine Entwicklung');
 const heading=node('h3','Deine Entwicklung'),subtitle=node('p','','chart-subtitle');
 const views=node('div','','chart-switch'),periods=node('div','','chart-periods'),metrics=node('label','Messwert ','chart-metric');
 views.setAttribute('role','group');views.setAttribute('aria-label','Art der Entwicklung');periods.setAttribute('role','group');periods.setAttribute('aria-label','Zeitraum');
 const select=node('select');select.setAttribute('aria-label','Sprachmesswert');for(const [value,label]of [['pace','Wörter pro Minute'],['segment','Länge der Sprechabschnitte']]){const option=node('option',label);option.value=value;select.append(option);}select.value=metric;select.onchange=()=>{metric=select.value;refresh();};metrics.append(select);
 const viewButtons=[],periodButtons=[];
 for(const [key,label]of [['retention','Behalten'],['speech','Sprechen']]){const button=node('button',label);button.type='button';button.onclick=()=>{view=key;refresh();};views.append(button);viewButtons.push([key,button]);}
 for(const [key,label]of [['week','Woche'],['month','Monat']]){const button=node('button',label);button.type='button';button.onclick=()=>{mode=key;refresh();};periods.append(button);periodButtons.push([key,button]);}
 const toolbar=node('div','','chart-toolbar');toolbar.append(views,periods);
 const legend=node('div','','chart-legend'),plot=node('div','','chart-plot'),status=node('p','','chart-status'),selected=node('p','','chart-selected'),details=node('details','','chart-explanation');
 status.setAttribute('role','status');selected.setAttribute('aria-live','polite');
 host.append(heading,subtitle,toolbar,metrics,legend,plot,status,selected,details);
 function refresh(){
  const retention=view==='retention';
  for(const [key,button]of viewButtons)button.setAttribute('aria-pressed',String(view===key));
  for(const [key,button]of periodButtons)button.setAttribute('aria-pressed',String(mode===key));
  subtitle.textContent=retention?'Wie viel bleibt hängen?':'Dein Sprechen im Verlauf';metrics.hidden=retention;
  const chart=retention?retentionChart({cards:getCards(),vocabulary:getVocabulary(),stats:getStats()},{mode,now:now()}):speakingChart(getStats(),{mode,metric,language,now:now()});
  legend.replaceChildren();for(const series of chart.series){const key=node('span',series.label,'chart-key chart-key-'+series.key);legend.append(key);}
  const width=400,height=222,left=43,right=16,top=18,bottom=36,w=width-left-right,h=height-top-bottom;
  const values=chart.series.flatMap(s=>s.points.map(p=>p.value).filter(v=>v!==null));
  const maximum=retention?100:Math.max(metric==='segment'?10:100,Math.ceil(Math.max(0,...values)*1.15/(metric==='segment'?5:50))*(metric==='segment'?5:50));
  const x=index=>left+index*w/(chart.periods.length-1),y=value=>top+h-value/maximum*h;
  const svg=svgNode('svg',{viewBox:`0 0 ${width} ${height}`,role:'group','aria-label':(retention?'Sicher erinnerte Karten in Prozent':metric==='segment'?'Mittlere Sprechabschnitte in Sekunden':'Sprechtempo in Wörtern pro Minute')+' · '+(mode==='week'?'acht Wochen':'sechs Monate')});
  for(let i=0;i<=4;i++){const value=maximum*i/4;svg.append(svgNode('line',{x1:left,x2:width-right,y1:y(value),y2:y(value),class:'chart-grid'}),svgNode('text',{x:left-8,y:y(value)+4,'text-anchor':'end',class:'chart-axis'},retention?value+'%':decimal(value)));}
  chart.periods.forEach((period,index)=>{if(mode==='week'&&index%2===0)return;svg.append(svgNode('text',{x:x(index),y:height-12,'text-anchor':'middle',class:'chart-axis'},period.label));});
  function pointText(series,point,index){return chart.periods[index].title+': '+series.label+' · '+(retention?`${point.good} von ${point.total} sicher erinnert (${Math.round(point.value)} %).`:`${decimal(point.value)} ${chart.unit} aus ${point.total} Gesprächen.`);}
  let latest='';
  for(const series of chart.series){
   let segment=[];const flush=()=>{if(segment.length>1)svg.append(svgNode('polyline',{points:segment.join(' '),class:'chart-line chart-line-'+series.key}));segment=[];};
   series.points.forEach((point,index)=>{if(point.value===null){flush();return;}segment.push(x(index)+','+y(point.value));});flush();
   series.points.forEach((point,index)=>{
    if(point.value===null)return;
    const description=pointText(series,point,index);if(index===chart.periods.length-1)latest+=(latest?' · ':'')+(retention?`${series.key==='cards'?'Sätze':'Vokabeln'}: ${point.good}/${point.total}`:`${decimal(point.value)} ${chart.unit}`);
    const marker=svgNode('g',{role:'button',tabindex:0,'aria-label':description,class:'chart-point chart-point-'+series.key});
    marker.append(svgNode('title',{},description),svgNode('circle',{cx:x(index),cy:y(point.value),r:13,class:'chart-hit'}),svgNode('circle',{cx:x(index),cy:y(point.value),r:4,class:'chart-dot'}));
    const choose=()=>{selected.textContent=description;};marker.onclick=choose;marker.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();choose();}};svg.append(marker);
   });
  }
  plot.replaceChildren(svg);selected.textContent=chart.hasData?'Tippe auf einen Punkt für die genauen Zahlen.':'';
  const current=chart.series.map(s=>({label:s.key==='cards'?'Satzkarten':s.key==='vocabulary'?'Vokabeln':'Gespräche',point:s.points.at(-1)}));
  status.textContent=chart.hasData?(latest?'Aktuell · '+latest+' · laufender Zeitraum':'Vergangene Lernwerte · aktueller Zeitraum noch ohne Messpunkt'):retention?'Deine Kurve wächst mit dir. Für einen Punkt brauchen wir mindestens 20 erste Abrufe je Kartenart und Zeitraum.':'Deine Sprechkurve entsteht ab jetzt. Für einen Punkt brauchen wir mindestens 3 ausreichend lange Gespräche im selben Zeitraum.';
  if(!chart.hasData||current.some(item=>item.point.value===null))status.textContent+=' '+current.filter(item=>item.point.value===null).map(item=>item.label+': '+item.point.total+'/'+chart.minimum).join(' · ');
  const summary=node('summary','So werden die Werte gemessen');
  details.replaceChildren(summary,...(retention?[
   node('p','Gezählt wird der erste bewertete Abruf pro Karte und Kalendertag, wenn du die Karte bereits an einem früheren Tag geübt hast. Neue Karten und sofortige Wiederholungen zählen nicht. Freiwilliges Üben bereits erledigter Vokabeln zählt ebenfalls nicht.'),
   node('p','„Gewusst“ zählt als sicher erinnert. „Nochmal“ und „Mit Mühe“ zählen als noch nicht sicher. Decke die Antwort zur Selbstkontrolle auf und bewerte ehrlich. Die Kurve misst deine Selbstbewertung, nicht deinen gesamten Wortschatz.'),
   node('p','Mindestens 20 gültige Abrufe pro Kartenart und Woche oder Monat. Kleine Stichproben und fehlende Daten bleiben Lücken. Der aktuelle Zeitraum läuft noch. Unterschiedliche Karten und ihre Schwierigkeit beeinflussen die Quote. Vorhandene echte Bewertungen werden verwendet; fehlende Vergangenheit wird nicht ergänzt. Gelöschte Karten verändern frühere Ergebnisse nicht.')
  ]:[
   node('p','Die Spracherkennung zählt deine Wörter. Erkannte eigene Sprechabschnitte liefern die Zeitbasis; technische Vorlauf- und Nachlaufzeiten werden abgezogen. Emma, Pausen mit ausgeschaltetem Mikrofon und unvollständige Abschnitte zählen nicht. Die Messung bleibt näherungsweise.'),
   node('p','Ein Gespräch zählt ab 4 gemessenen eigenen Sprechabschnitten, insgesamt 40 Wörtern und 20 Sekunden eigener Sprache. Pro Zeitraum sind mindestens 3 normale Gespräche nötig. Nur neue Messungen zählen; frühere Gesprächszeiten werden nicht umgerechnet.'),
   node('p','Schneller sprechen oder längere Abschnitte bedeuten nicht automatisch besseres Englisch. Thema und Aufgaben beeinflussen die Werte. Es gibt hier keine Prozentnote für Sprachfluss und keine Aussprachebewertung. Gespeichert werden nur Messwerte, keine zusätzlichen Tonaufnahmen.')
  ]));
 }
 refresh();return {refresh};
}
