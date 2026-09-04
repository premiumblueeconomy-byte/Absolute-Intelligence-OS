import { jsPDF } from "jspdf";
import type { ReportContent } from "@/lib/reports";

const MARGIN = 18;
const PAGE_W = 210;
const MAX_W = PAGE_W - MARGIN * 2;
const NAVY = "#141c2b";
const AMBER = "#f2a71b";
const BODY = "#242c3a";
const MUTED = "#6b7280";

export function exportReportPdf(content: ReportContent): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGIN;

  const heading = (text: string) => {
    if (y > 270) { doc.addPage(); y = MARGIN; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(NAVY);
    doc.text(text, MARGIN, y);
    y += 2;
    doc.setDrawColor(AMBER);
    doc.setLineWidth(0.6);
    doc.line(MARGIN, y, MARGIN + 24, y);
    y += 7;
  };

  const paragraph = (text: string, opts: { size?: number; color?: string; bold?: boolean } = {}) => {
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(opts.size ?? 10.5);
    doc.setTextColor(opts.color ?? BODY);
    const lines = doc.splitTextToSize(text || "—", MAX_W);
    for (const line of lines) {
      if (y > 285) { doc.addPage(); y = MARGIN; }
      doc.text(line, MARGIN, y);
      y += 5.2;
    }
    y += 2;
  };

  const bulletList = (items: string[]) => {
    if (!items.length) { paragraph("None recorded.", { color: MUTED }); return; }
    for (const item of items) {
      if (y > 285) { doc.addPage(); y = MARGIN; }
      const lines = doc.splitTextToSize(`•  ${item}`, MAX_W);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);
      doc.setTextColor(BODY);
      for (const line of lines) {
        if (y > 285) { doc.addPage(); y = MARGIN; }
        doc.text(line, MARGIN, y);
        y += 5.2;
      }
    }
    y += 2;
  };

  // Cover
  doc.setFillColor(NAVY);
  doc.rect(0, 0, PAGE_W, 60, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(AMBER);
  doc.text("ABSOLUTE INTELLIGENCE OS — REPORT", MARGIN, 22);
  doc.setFontSize(19);
  doc.setTextColor("#ffffff");
  const titleLines = doc.splitTextToSize(content.title, MAX_W);
  doc.text(titleLines, MARGIN, 34);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor("#c7cedb");
  doc.text(new Date(content.generatedAt).toLocaleString(), MARGIN, 53);
  y = 72;

  heading("Executive Intelligence Summary");
  paragraph(content.executiveSummary);

  heading("Current Reality");
  paragraph(content.currentReality);

  heading("Critical Facts");
  bulletList(content.criticalFacts);

  heading("Assumptions");
  bulletList(content.assumptions.map((a) => `${a.statement}${a.validation_method ? ` — validate via: ${a.validation_method}` : ""}`));

  heading("Unknowns");
  bulletList(content.unknowns.map((u) => `${u.question}${u.why_it_matters ? ` — ${u.why_it_matters}` : ""}`));

  heading("Opportunity Portfolio");
  for (const o of content.opportunityPortfolio) {
    paragraph(o.title, { bold: true, size: 11.5 });
    paragraph(o.summary);
    paragraph(`Opportunity score: ${o.opportunityScore}/100   ·   Confidence: ${o.confidenceScore}/100   ·   ${o.readiness}`, { color: MUTED, size: 9.5 });
    paragraph(`Recommended next action: ${o.recommendedNextAction || "—"}`, { size: 9.5 });
    y += 2;
  }

  heading("Evidence Summary");
  bulletList(content.evidenceSummary.map((e) => `${e.source} — ${e.status.replace(/_/g, " ")} (confidence ${e.confidence}/100)`));

  heading("30-Day Actions");
  bulletList(content.next30Days);

  heading("90-Day Actions");
  bulletList(content.next90Days);

  heading("Confidence Summary");
  paragraph(content.confidenceSummary, { bold: true });

  const fileName = `${content.title.replace(/[^a-zA-Z0-9]+/g, "_").slice(0, 80)}.pdf`;
  doc.save(fileName);
}
