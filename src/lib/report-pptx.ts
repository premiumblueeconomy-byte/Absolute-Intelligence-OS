import pptxgen from 'pptxgenjs';
import JSZip from 'jszip';
import type { ReportContent } from './reports';
import { REPORT_COLORS as C, reportDate, reportFilename, reportSections, reportTitle, safeScore, splitReportText } from './report-design';

export function buildReportPptx(content: ReportContent): pptxgen {
  const deck = new pptxgen();
  deck.layout = 'LAYOUT_WIDE'; deck.author = 'Absolute Intelligence OS';
  deck.subject = 'Opportunity analysis'; deck.title = content.title; deck.company = 'Absolute Intelligence OS';
  deck.theme = { headFontFace: 'Aptos Display', bodyFontFace: 'Aptos' };
  let page = 0;
  const slide = (title: string, accent = C.teal) => {
    const s = deck.addSlide(); page++; s.background = { color: C.paper };
    s.addShape(deck.ShapeType.rect, { x: 0, y: 0, w: 0.14, h: 7.5, fill: { color: accent }, line: { color: accent } });
    s.addText(title, { x: 0.65, y: 0.55, w: 12, h: 0.9, fontSize: 30, bold: true, color: C.navy, margin: 0, fit: 'shrink' });
    s.addShape(deck.ShapeType.line, { x: 0.65, y: 1.53, w: 0.8, h: 0, line: { color: accent, width: 4 } });
    s.addText(`ABSOLUTE INTELLIGENCE OS   /   ${page}`, { x: 0.65, y: 7.06, w: 12, h: 0.2, fontSize: 9, color: C.muted, margin: 0 });
    return s;
  };
  const cover = deck.addSlide(); page++; cover.background = { color: C.navy };
  cover.addShape(deck.ShapeType.rect, { x: 0, y: 0, w: 0.18, h: 7.5, fill: { color: C.teal }, line: { color: C.teal } });
  cover.addShape(deck.ShapeType.rect, { x: 10.8, y: 0, w: 2.53, h: 7.5, fill: { color: C.violet }, line: { color: C.violet } });
  cover.addShape(deck.ShapeType.rect, { x: 0.7, y: 1.25, w: 0.9, h: 0.06, fill: { color: C.amber }, line: { color: C.amber } });
  cover.addText('ABSOLUTE INTELLIGENCE OS', { x: 0.7, y: 0.6, w: 9.4, h: 0.4, fontSize: 15, bold: true, color: 'FFFFFF', margin: 0 });
  cover.addText(reportTitle(content), { x: 0.7, y: 1.65, w: 9.4, h: 2.75, fontSize: 38, bold: true, color: 'FFFFFF', margin: 0, fit: 'shrink', valign: 'middle' });
  cover.addText(`Opportunity briefing\n${reportDate(content)}`, { x: 0.7, y: 5.4, w: 9, h: 0.8, fontSize: 17, color: 'CAD8EC', margin: 0 });
  cover.addText('Evidence, possibilities, and next steps', { x: 0.7, y: 6.75, w: 9.4, h: 0.3, fontSize: 13, color: 'CAD8EC', margin: 0 });
  if (!content.hideScorecard) {
  const o = content.opportunityPortfolio[0];
  const summary = slide('Opportunity and confidence', C.violet);
  for (const [i, m] of [{ label: 'Opportunity score', value: o?.opportunityScore ?? 0, color: C.teal }, { label: 'Confidence', value: o?.confidenceScore ?? 0, color: C.violet }].entries()) {
    const x = 0.75 + i * 6.1;
    summary.addText(`${safeScore(m.value)}`, { x, y: 2, w: 4.7, h: 1.2, fontSize: 68, color: m.color, bold: true, margin: 0 });
    summary.addText(`${m.label} / 100`, { x, y: 3.25, w: 5.6, h: 0.45, fontSize: 20, color: C.ink, margin: 0 });
  }
  summary.addText(content.confidenceSummary, { x: 0.75, y: 4.6, w: 11.8, h: 1.65, fontSize: 22, color: C.ink, margin: 0, fit: 'shrink' });
  const scores = content.scores ?? [];
  for (let offset = 0; offset < scores.length; offset += 5) {
    const s = slide(offset ? 'Scorecard continued' : 'Opportunity scorecard');
    scores.slice(offset, offset + 5).forEach((metric, i) => {
      const y = 1.95 + i * 0.92;
      const fill = [C.teal, C.violet, C.amber][i % 3];
      s.addText(metric.label, { x: 0.75, y, w: 5, h: 0.45, fontSize: 19, color: C.ink, margin: 0 });
      s.addShape(deck.ShapeType.rect, { x: 6, y: y + 0.06, w: 5.1, h: 0.25, fill: { color: 'DFE5EF' }, line: { color: 'DFE5EF' } });
      if (metric.value > 0) s.addShape(deck.ShapeType.rect, { x: 6, y: y + 0.06, w: 5.1 * safeScore(metric.value) / 100, h: 0.25, fill: { color: fill }, line: { color: fill } });
      s.addText(String(safeScore(metric.value)), { x: 11.5, y, w: 1, h: 0.45, fontSize: 19, bold: true, color: fill, margin: 0 });
    });
  }
  }
  reportSections(content).forEach((section, sectionIndex) => {
    const chunks = section.items.flatMap((item) => splitReportText(item));
    if (!chunks.length && !section.table && !section.chart) chunks.push('None recorded.');
    for (let offset = 0; offset < chunks.length; offset += 2) {
      const accent = [C.teal, C.violet, C.amber][sectionIndex % 3];
      const s = slide(section.title + (offset ? ' · continued' : ''), accent);
      chunks.slice(offset, offset + 2).forEach((part, i) => {
        const y = 1.95 + i * 2.3;
        s.addShape(deck.ShapeType.rect, { x: 0.7, y: y + 0.04, w: 0.06, h: 1.85, fill: { color: accent }, line: { color: accent } });
        s.addText(part, { x: 0.95, y, w: 11.45, h: 1.98, fontSize: 21, color: C.ink, margin: 0, valign: 'top', fit: 'shrink' });
      });
    }
    if(section.chart){
      for(let start=0;start<section.chart.length;start+=5){
        const s=slide(section.title+' — comparison');
        section.chart.slice(start,start+5).forEach((m,i)=>{
          const y=2+i*0.85;
          s.addText(m.label,{x:0.7,y,w:5.3,h:0.6,fontSize:16,color:C.ink,margin:0,fit:'shrink'});
          s.addShape(deck.ShapeType.rect,{x:6,y:y+0.1,w:5*safeScore(m.value)/100||0.01,h:0.25,fill:{color:C.teal},line:{color:C.teal}});
          s.addText(String(m.value),{x:11.3,y,w:1.3,h:0.5,fontSize:18,color:C.violet,margin:0});
        });
      }
    }
    if(section.timeline){
      const s=slide('Execution timeline — proposed phases');
      ['validation','prototype','pilot','commercial_validation','scale'].forEach((p,i)=>{
        const y=2+i*0.85;
        s.addText(`${i+1}. ${p.replace(/_/g,' ')}`,{x:0.75,y,w:5,h:0.55,fontSize:18,color:C.ink,margin:0});
        s.addShape(deck.ShapeType.rect,{x:6+i*1.1,y:y+0.05,w:1.2,h:0.3,fill:{color:[C.teal,C.violet,C.amber][i%3]},line:{color:C.paper}});
      });
    }
    if(section.table){
      // Bound text per cell, retaining continuation rows and repeating headers.
      const rows=section.table.rows.flatMap(row=>{
        const cells=row.map(v=>splitReportText(v||'Not recorded',170));
        return Array.from({length:Math.max(...cells.map(c=>c.length))},(_,i)=>cells.map(c=>c[i]||''));
      });
      for(let start=0;start<rows.length;start+=2){
        const s=slide(section.title+(start?' — continued':''));
        s.addTable([section.table.headers.map(text=>({text,options:{bold:true,color:'FFFFFF',fill:{color:C.navy}}})),...rows.slice(start,start+2).map(row=>row.map(text=>({text})))],{x:0.7,y:1.9,w:11.9,colW:Array(section.table.headers.length).fill(11.9/section.table.headers.length),rowH:1.45,fontSize:14,color:C.ink,fill:{color:C.paper},border:{type:'solid',pt:0.5,color:'DFE5EF'},margin:0.12,valign:'top',autoPage:false});
      }
    }
  });
  return deck;
}

export async function buildReportPptxBytes(content:ReportContent):Promise<Uint8Array<ArrayBuffer>> {
  const raw=await buildReportPptx(content).write({outputType:'uint8array'});
  const zip=await JSZip.loadAsync(raw as Uint8Array);
  // PptxGenJS 4 emits a master content-type override per slide even though it
  // creates one master. Remove only overrides whose target does not exist.
  const manifest=zip.file('[Content_Types].xml')!;
  const xml=(await manifest.async('string')).replace(/<Override\b[^>]*\bPartName="([^"]+)"[^>]*\/>/g,(entry,path:string)=>zip.file(path.replace(/^\//,''))?entry:'');
  zip.file('[Content_Types].xml',xml);
  return await zip.generateAsync({type:'uint8array',compression:'DEFLATE'}) as Uint8Array<ArrayBuffer>;
}

export async function exportReportPptx(content: ReportContent): Promise<void> {
  const bytes=await buildReportPptxBytes(content);
  const url=URL.createObjectURL(new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.presentationml.presentation'}));
  const anchor=document.createElement('a');anchor.href=url;anchor.download=`${reportFilename(reportTitle(content))}.pptx`;document.body.appendChild(anchor);anchor.click();anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(url),60000);
}

