import { jsPDF } from 'jspdf';
import type { ReportContent } from './reports';
import { REPORT_COLORS as C, reportDate, reportFilename, reportSections, reportTitle, safeScore } from './report-design';

export function buildReportPdf(content: ReportContent): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  doc.setProperties({ title: content.title, author: 'Absolute Intelligence OS', subject: 'Opportunity analysis' });
  const color = (hex: string) => `#${hex}`;
  const clean = (text: string) => text.replace(/[–—]/g, '-').replace(/→/g,' to ').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\u2026/g, '...');
  const text = (value: string, x: number, y: number, size = 11, fill = C.ink, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(size); doc.setTextColor(color(fill));
    doc.text(clean(value), x, y);
  };
  doc.setFillColor(color(C.navy)); doc.rect(0, 0, 210, 297, 'F');
  doc.setFillColor(color(C.teal)); doc.rect(0, 0, 7, 297, 'F');
  doc.setFillColor(color(C.violet)); doc.circle(192, 35, 40, 'F');
  doc.setFillColor(color(C.amber)); doc.rect(20, 51, 27, 3, 'F');
  text('ABSOLUTE INTELLIGENCE OS', 20, 28, 11, 'FFFFFF', true);
  text('OPPORTUNITY REPORT', 20, 43, 10, 'BDD4E7');
  const title = clean(reportTitle(content));
  let titleSize = 29;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(titleSize);
  while (doc.splitTextToSize(title, 164).length > 7 && titleSize > 14) { titleSize--; doc.setFontSize(titleSize); }
  doc.setTextColor('#FFFFFF'); doc.text(doc.splitTextToSize(title, 164), 20, 74);
  text(reportDate(content), 20, 173, 11, 'BDD4E7');
  const first = content.opportunityPortfolio[0];
  for (const [i, metric] of [
    { label: 'OPPORTUNITY SCORE', value: first?.opportunityScore ?? 0, fill: C.teal },
    { label: 'CONFIDENCE', value: first?.confidenceScore ?? 0, fill: C.violet },
  ].entries()) {
    const x = 20 + i * 88;
    doc.setFillColor(color(metric.fill)); doc.roundedRect(x, 191, 80, 49, 3, 3, 'F');
    text(metric.label, x + 7, 203, 9, 'FFFFFF', true);
    text(`${safeScore(metric.value)}/100`, x + 7, 225, 25, 'FFFFFF', true);
  }
  text('Analysis for validation and planning', 20, 261, 12, 'FFFFFF', true);
  text('Scores are assessments, not guarantees of investment performance.', 20, 271, 9, 'BDD4E7');
  let y = 0;
  let sectionNumber = 0;
  const newPage = () => {
    doc.addPage(); doc.setFillColor(color(C.paper)); doc.rect(0, 0, 210, 19, 'F');
    text('ABSOLUTE INTELLIGENCE OS', 18, 12, 8, C.muted, true); y = 32;
  };
  const heading = (label: string) => {
    if (y === 0 || y > 238) newPage();
    sectionNumber++;
    text(String(sectionNumber).padStart(2, '0'), 18, y, 12, C.teal, true);
    doc.setFont('helvetica','bold');doc.setFontSize(15);
    const lines=doc.splitTextToSize(clean(label),160) as string[];
    for(const line of lines){if(y>260)newPage();text(line,30,y,15,C.navy,true);y+=6;}
    doc.setDrawColor(color(C.amber)); doc.setLineWidth(1); doc.line(18, y + 2, 52, y + 2); y += 10;
  };
  const paragraph = (value: string) => {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5);
    const lines: string[] = doc.splitTextToSize(clean(value || 'None recorded.'), 170);
    if (lines.length * 5.4 < 230 && y + lines.length * 5.4 > 272) newPage();
    for (const line of lines) {
      if (y > 272) newPage();
      text(line, 20, y, 10.5); y += 5.4;
    }
    y += 5;
  };
  if (!content.hideScorecard) {
  newPage();
  heading('Opportunity scorecard');
  paragraph(content.confidenceSummary);
  for (const [i, score] of (content.scores ?? []).entries()) {
    if (y > 253) newPage();
    text(score.label, 20, y, 10, C.ink, true);
    text(`${safeScore(score.value)}/100`, 172, y, 10, C.muted);
    doc.setFillColor('#E5EAF2'); doc.roundedRect(20, y + 3, 170, 3.5, 1, 1, 'F');
    doc.setFillColor(color([C.teal, C.violet, C.amber][i % 3]));
    if (score.value > 0) doc.roundedRect(20, y + 3, 170 * safeScore(score.value) / 100, 3.5, 1, 1, 'F');
    y += 16;
  }
  }
  const table = (headers: string[], rows: string[][]) => {
    const width=170/headers.length;
    const header=()=>{
      if(y>246)newPage();
      doc.setFillColor(color(C.navy));doc.rect(20,y-4,170,12,'F');
      headers.forEach((h,i)=>{doc.setFontSize(8);const lines=doc.splitTextToSize(clean(h),width-4);doc.setTextColor('#FFFFFF');doc.text(lines,22+i*width,y);});y+=14;
    };
    if(rows.length){
      doc.setFont('helvetica','normal');doc.setFontSize(9);
      const firstLines=Math.min(22,Math.max(...rows[0].map(v=>doc.splitTextToSize(clean(v||'Not recorded'),width-5).length)));
      if(y+20+firstLines*4.2>273)newPage();
    }
    header();
    for(const row of rows){
      doc.setFont('helvetica','normal');doc.setFontSize(9);
      const cells=row.map(v=>doc.splitTextToSize(clean(v||'Not recorded'),width-5) as string[]);
      const length=Math.max(...cells.map(c=>c.length));
      for(let start=0;start<length;start+=22){
        const parts=cells.map(c=>c.slice(start,start+22));
        const height=Math.max(...parts.map(c=>c.length))*4.2+6;
        if(y+height>273){newPage();header();}
        parts.forEach((lines,i)=>{doc.setFillColor(color(C.paper));doc.setDrawColor('#DFE5EF');doc.rect(20+i*width,y-3,width,height,'FD');doc.setFontSize(9);doc.setTextColor(color(C.ink));if(lines.length)doc.text(lines,22+i*width,y+1);});y+=height;
      }
    }
    y+=8;
  };
  for (const section of reportSections(content)) {
    heading(section.title);
    for (const item of section.items.length ? section.items : section.table||section.chart?[]:['None recorded.']) paragraph(item);
    if(section.chart)for(const metric of section.chart){
      if(y>251)newPage();
      paragraph(`${metric.label}: ${metric.value}/100`);
      doc.setFillColor(color(C.teal));doc.rect(20,y-4,170*safeScore(metric.value)/100,3,'F');y+=5;
    }
    if(section.timeline){
      if(y>220)newPage();
      const phases=['validation','prototype','pilot','commercial_validation','scale'];
      phases.forEach((phase,i)=>{text(`${i+1}. ${phase.replace(/_/g,' ')}`,20,y,10,C.navy,true);doc.setFillColor(color([C.teal,C.violet,C.amber][i%3]));doc.rect(102+i*15,y-3,16,3,'F');y+=8;});y+=5;
    }
    if(section.table)table(section.table.headers,section.table.rows);
  }
  const count = doc.getNumberOfPages();
  for (let page = 2; page <= count; page++) {
    doc.setPage(page); doc.setDrawColor('#DFE5EF'); doc.setLineWidth(0.3); doc.line(18, 282, 192, 282);
    text('OPPORTUNITY INTELLIGENCE  |  ' + reportDate(content), 18, 289, 8, C.muted);
    text(`${page} / ${count}`, 178, 289, 8, C.muted);
  }
  return doc;
}

export function exportReportPdf(content: ReportContent): void {
  buildReportPdf(content).save(`${reportFilename(reportTitle(content))}.pdf`);
}

