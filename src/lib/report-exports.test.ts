// @vitest-environment node
import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { buildReportPdf } from './report-pdf';
import { buildReportPptxBytes } from './report-pptx';
import { splitReportText } from './report-design';
import type { ReportContent } from './reports';

const report: ReportContent = {
  title: 'Circular materials', generatedAt: '2026-09-19T12:00:00Z', executiveSummary: 'Recover useful materials from waste.',
  currentReality: 'Validate local demand.', criticalFacts: [], assumptions: [{ statement: 'Buyers accept the grade.', validation_method: 'Test samples.' }],
  unknowns: [{ question: 'What is the yield?', why_it_matters: 'It determines cost.' }],
  opportunityPortfolio: [{ title: 'Circular materials', summary: 'Recover materials.', opportunityScore: 73, confidenceScore: 28, readiness: 'Validation', recommendedNextAction: 'Test samples.' }],
  evidenceSummary: [], next30Days: ['Test samples.'], next90Days: ['Reassess the opportunity.'],
  confidenceSummary: 'Opportunity 73/100; confidence 28/100. Requires validation.',
  scores: [{ label: 'Market attractiveness', value: 73 }, { label: 'Technology readiness', value: 0 }],
};
describe('downloadable reports', () => {
  it('retains all words when long paragraphs need continuation slides', () => {
    const original = 'Validate commercial demand before investing. '.repeat(100).trim();
    const chunks = splitReportText(original);
    expect(chunks.every((c) => c.length <= 380)).toBe(true);
    expect(chunks.join(' ')).toBe(original);
  });
  it('writes a multipage PDF containing the final action after long content', () => {
    const pdf = buildReportPdf({ ...report, executiveSummary: 'Long analysis with retained content. '.repeat(250) });
    expect(pdf.getNumberOfPages()).toBeGreaterThan(3);
    expect(pdf.output()).toContain('Reassess the opportunity.');
    expect(pdf.output().startsWith('%PDF-')).toBe(true);
  });
  it('writes a valid editable PPTX with separate confidence and opportunity scores', async () => {
    const result = await buildReportPptxBytes(report);
    const zip = await JSZip.loadAsync(result);
    const manifest=await zip.file('[Content_Types].xml')!.async('string');
    for(const match of manifest.matchAll(/PartName="([^"]+)"/g)) expect(zip.file(match[1].replace(/^\//,''))).not.toBeNull();
    expect(zip.file('[Content_Types].xml')).not.toBeNull();
    const files = Object.keys(zip.files).filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p));
    const xml = (await Promise.all(files.map((p) => zip.file(p)!.async('string')))).join('');
    expect(xml).toContain('Opportunity score');
    expect(xml).toContain('Confidence');
    expect(xml).toContain('73');
    expect(xml).toContain('28');
    expect(xml).toContain('Reassess the opportunity.');
    expect(xml).toContain('<a:t>');
  });
  it('retains long section table contents through PDF and editable PowerPoint pagination',async()=>{
    const expanded={...report,sections:[{title:'Execution — DRAFT',items:['Draft generated 20 September 2026.'],table:{headers:['Task','Method','KPI'],rows:[['Pilot','Long method with sampling and measurement. '.repeat(80)+'FINAL_TABLE_MARKER','Success criteria']]}}]};
    const pdf=buildReportPdf(expanded);expect(pdf.output()).toContain('FINAL_TABLE_MARKER');
    const zip=await JSZip.loadAsync(await buildReportPptxBytes(expanded));
    const slides=Object.keys(zip.files).filter(p=>/^ppt\/slides\/slide\d+\.xml$/.test(p));
    const xml=(await Promise.all(slides.map(p=>zip.file(p)!.async('string')))).join('');
    expect(xml).toContain('FINAL_TABLE_MARKER');expect(xml).toContain('<a:tbl>');expect(xml).toContain('DRAFT');
  });
});

