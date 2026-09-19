import { jsPDF } from 'jspdf';
import type { ReportContent } from './reports';
import { REPORT_COLORS as C, reportDate, reportFilename, reportSections, reportTitle, safeScore } from './report-design';

export function buildReportPdf(content: ReportContent): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  doc.setProperties({ title: content.title, author: 'Absolute Intelligence OS', subject: 'Opportunity analysis' });
  const color = (hex: string) => `#${hex}`;
  const clean = (text: string) => text.replace(/[–—]/g, '-').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\u2026/g, '...');
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
    text(label, 30, y, 17, C.navy, true);
    doc.setDrawColor(color(C.amber)); doc.setLineWidth(1); doc.line(18, y + 5, 52, y + 5); y += 16;
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
  for (const section of reportSections(content)) {
    heading(section.title);
    for (const item of section.items.length ? section.items : ['None recorded.']) paragraph(item);
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

