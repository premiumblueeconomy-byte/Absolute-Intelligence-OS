import type { ReportContent } from './reports';

export const REPORT_COLORS = { navy: '15243D', teal: '087F8C', violet: '6956C7', amber: 'E9A23B', ink: '25344A', muted: '637189', paper: 'F4F7FB' };
export const reportFilename = (title: string) => title.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 100) || 'Opportunity_report';
export const reportTitle = (c: ReportContent) => c.opportunityPortfolio[0]?.title || c.title;
export const reportDate = (c: ReportContent) => new Date(c.generatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
export const safeScore = (value: number) => Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));

export function reportSections(c: ReportContent): { title: string; items: string[] }[] {
  return [
    { title: 'Executive summary', items: [c.executiveSummary] },
    { title: 'Project objective', items: [c.currentReality] },
    { title: 'Commercial opportunity', items: (c.commercialDetails ?? []).map((x) => `${x.label}: ${x.text || 'Not recorded.'}`) },
    { title: 'Verified facts', items: c.criticalFacts },
    { title: 'Claims requiring validation', items: c.claimsToValidate ?? [] },
    { title: 'Assumptions to test', items: c.assumptions.map((a) => `${a.statement}\nValidation: ${a.validation_method || 'Define a validation method.'}`) },
    { title: 'Unanswered questions', items: c.unknowns.map((u) => `${u.question}\nWhy it matters: ${u.why_it_matters || 'Not recorded.'}`) },
    { title: 'Evidence register', items: c.evidenceSummary.map((e) => `${e.source}\n${e.status.replace(/_/g, ' ')} | Confidence ${e.confidence}/100`) },
    { title: 'Next 30 days', items: c.next30Days },
    { title: 'Next 90 days', items: c.next90Days },
    { title: 'Decision guidance', items: [c.confidenceSummary] },
  ];
}

/** Preserve all text while putting a bounded amount on each presentation slide. */
export function splitReportText(text: string, max = 380): string[] {
  const chunks: string[] = [];
  let remaining = text.trim();
  while (remaining.length > max) {
    let end = remaining.lastIndexOf(' ', max);
    if (end < max / 2) end = max;
    chunks.push(remaining.slice(0, end));
    remaining = remaining.slice(end).trimStart();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

