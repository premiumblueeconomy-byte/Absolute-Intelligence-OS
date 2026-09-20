import { z } from 'zod';

export const SECTION_ORDER = ['overview', 'scoring', 'evidence', 'redteam', 'experiments', 'scenarios', 'execution'] as const;
export const sectionSchema = z.enum(SECTION_ORDER);
export type Section = z.infer<typeof sectionSchema>;
export const SECTION_LABEL: Record<Section, string> = { overview: 'Overview', scoring: 'Scoring', evidence: 'Assumptions & Unknowns', redteam: 'Red Team', experiments: 'Experiments', scenarios: 'Scenarios', execution: 'Execution' };
const text = z.string().trim().min(1).max(1800);
const list = z.array(text).min(1).max(12);
const score = z.number().finite().min(0).max(100);
export const dimensionKeys = ['marketAttractiveness','resourceAvailability','technologyReadiness','competitiveAdvantage','financialAttractiveness','executionFeasibility','strategicImportance','employmentPotential','tradePotential','regenerativeImpact'] as const;
export const phases = ['validation','prototype','pilot','commercial_validation','scale'] as const;
export const scenarioTypes = ['baseline','optimistic','adverse','black_swan','transformative'] as const;
const base = { summary: text, caveats: list };
const overview = z.object({ ...base, transformation: text, commercialPotential: text, products: list, applications: list, customers: list, markets: list, nextSteps: list }).strict();
const scoring = z.object({ ...base, dimensions: z.array(z.object({ key: z.enum(dimensionKeys), score, explanation: text, evidenceGaps: list }).strict()).length(10).refine(a => new Set(a.map(d => d.key)).size === 10, 'All ten distinct dimensions are required') }).strict();
const evidence = z.object({ ...base, assumptions: z.array(z.object({ statement: text, priority: z.enum(['high','medium','low']), validationMethod: text, evidenceNeeded: text }).strict()).min(1).max(10), unknowns: z.array(z.object({ question: text, whyItMatters: text, evidenceNeeded: text }).strict()).min(1).max(10) }).strict();
const redteam = z.object({ ...base, objections: z.array(z.object({ objection: text, failureCondition: text, counterargument: text, mitigation: text }).strict()).min(1).max(10) }).strict();
const experiments = z.object({ ...base, experiments: z.array(z.object({ title: text, hypothesis: text, method: text, successCriteria: text, resources: text }).strict()).min(1).max(10) }).strict();
const scenarios = z.object({ ...base, baselineMargin: z.number().finite().min(-100).max(100), inputAssumptions: list, scenarios: z.array(z.object({ name: text, type: z.enum(scenarioTypes), narrative: text, variables: z.array(z.object({ name: text, unit: text, baselineValue: z.number().finite().positive().max(1e12), newValue: z.number().finite().min(0).max(1e12), marginImpactPerPercent: z.number().finite().min(-1).max(1) }).strict()).min(1).max(6) }).strict()).length(5).refine(a => new Set(a.map(s => s.type)).size === 5, 'All five scenarios are required').refine(a => a.filter(s=>s.type==='baseline').every(s=>s.variables.every(v=>v.baselineValue===v.newValue)), 'Baseline inputs must be unchanged') }).strict();
const execution = z.object({ ...base, tasks: z.array(z.object({ title: text, description: text, phase: z.enum(phases), milestone: text, dependency: text, suggestedOwner: text, kpi: text }).strict()).min(5).max(15).refine(a=>phases.every(p=>a.some(t=>t.phase===p)), 'Cover all five phases') }).strict();
export const sectionContracts = { overview, scoring, evidence, redteam, experiments, scenarios, execution };
export type SectionContent = { [K in Section]: z.infer<typeof sectionContracts[K]> }[Section];
export const SECTION_SHAPES: Record<Section,string> = {
 overview: '{summary, caveats:[string], transformation, commercialPotential, products:[string], applications:[string], customers:[string], markets:[string], nextSteps:[string]}',
 scoring: '{summary,caveats:[string],dimensions:[{key,score,explanation,evidenceGaps:[string]}]}. Exactly ten unique keys: '+dimensionKeys.join(', ')+'. Scores must be numbers from 0 to 100; do not calculate overall score or confidence.',
 evidence: '{summary,caveats:[string],assumptions:[{statement,priority:"high|medium|low",validationMethod,evidenceNeeded}],unknowns:[{question,whyItMatters,evidenceNeeded}]}',
 redteam: '{summary,caveats:[string],objections:[{objection,failureCondition,counterargument,mitigation}]}',
 experiments: '{summary,caveats:[string],experiments:[{title,hypothesis,method,successCriteria,resources}]}. Designs only. Never return actual results, conclusions, completed status or learning.',
 scenarios: '{summary,caveats:[string],baselineMargin:number,inputAssumptions:[string],scenarios:[{name,type,narrative,variables:[{name,unit,baselineValue:number,newValue:number,marginImpactPerPercent:number}]}]}. Exactly five types: baseline, optimistic, adverse, black_swan, transformative. All inputs are estimates. Baseline scenario newValue equals baselineValue. Baseline values positive; new values nonnegative; elasticity -1 to 1; baselineMargin -100 to 100. Use the SAME baseline values and units across scenarios. Do not calculate results.',
 execution: '{summary,caveats:[string],tasks:[{title,description,phase,milestone,dependency,suggestedOwner,kpi}]}. Cover validation, prototype, pilot, commercial_validation, scale phases. Responsibilities are suggestions, dependencies refer to task titles or external prerequisites. Never claim work is complete.',
};
export interface SectionRun {
 id: string; opportunity_id: string; section: Section; batch_id: string; version: number;
 status: 'generating'|'completed'|'failed'; review_state: 'draft'|'applied'|'superseded'|'discarded';
 result: SectionContent | null; calculations: Record<string, unknown>; source_context: Record<string, unknown>;
 created_at: string; finished_at: string | null; reviewed_at: string | null; error: string | null;
}
