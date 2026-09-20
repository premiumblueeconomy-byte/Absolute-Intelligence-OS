import { SECTION_LABEL, sectionContracts, type SectionRun } from './opportunity-sections';
import { DIMENSION_LABEL } from './scoring';
import type { ScenarioResults } from './scenarios';
export interface ReportBlock {
 title:string; items:string[];
 table?:{headers:string[];rows:string[][]};
 chart?:{label:string;value:number}[];
 timeline?:{phase:string;label:string}[];
}
export function sectionDocument(run:SectionRun):ReportBlock[]{
 const c=run.result;if(!c)return [{title:SECTION_LABEL[run.section],items:['Not generated yet.']}];
 const meta=`${run.review_state==='draft'?'DRAFT — awaiting review':run.review_state.toUpperCase()} · Version ${run.version} · Generated ${new Date(run.finished_at||run.created_at).toLocaleString()}`;
 const blocks:ReportBlock[]=[{title:SECTION_LABEL[run.section],items:[meta,c.summary]}];
 switch(run.section){
 case 'overview':{const d=sectionContracts.overview.parse(c);blocks.push({title:'Commercial potential and pathway',items:[d.commercialPotential,d.transformation,...(['products','applications','customers','markets'] as const).map(k=>`${k[0].toUpperCase()+k.slice(1)}: ${d[k].join('; ')}`)]},{title:'Next steps',items:d.nextSteps});break;}
 case 'scoring':{const d=sectionContracts.scoring.parse(c);blocks.push({title:'Weighted scoring',items:[`Overall score: ${run.calculations.overallScore}/100. Evidence confidence: ${run.calculations.confidence}/100. These are separate measures.`],chart:d.dimensions.map(x=>({label:DIMENSION_LABEL[x.key],value:x.score})),table:{headers:['Dimension / weight','Score / explanation','Evidence gaps'],rows:d.dimensions.map(x=>[`${DIMENSION_LABEL[x.key]} / ${(run.calculations.weights as Record<string,number>)?.[x.key]??'—'}`,`${x.score}/100. ${x.explanation}`,x.evidenceGaps.join('; ')])}});break;}
 case 'evidence':{const d=sectionContracts.evidence.parse(c);blocks.push({title:'Prioritized assumptions',items:[],table:{headers:['Priority / assumption','Validation','Evidence needed'],rows:d.assumptions.map(a=>[`${a.priority}: ${a.statement}`,a.validationMethod,a.evidenceNeeded])}},{title:'Unknowns',items:[],table:{headers:['Question','Why it matters','Evidence needed'],rows:d.unknowns.map(u=>[u.question,u.whyItMatters,u.evidenceNeeded])}});break;}
 case 'redteam':{const d=sectionContracts.redteam.parse(c);blocks.push({title:'Objections and mitigations',items:d.objections.map(o=>`Objection: ${o.objection}\nFailure condition: ${o.failureCondition}\nCounterargument: ${o.counterargument}\nMitigation: ${o.mitigation}`)});break;}
 case 'experiments':{const d=sectionContracts.experiments.parse(c);blocks.push({title:'Proposed experiments',items:['Designs only. Actual results must be recorded after conducting the experiments.'],table:{headers:['Experiment / hypothesis','Method / resources','Success criteria'],rows:d.experiments.map(e=>[`${e.title}\n${e.hypothesis}`,`${e.method}\nResources: ${e.resources}`,e.successCriteria])}});break;}
 case 'scenarios':{const d=sectionContracts.scenarios.parse(c);const results=run.calculations.scenarios as Record<string,ScenarioResults>;blocks.push({title:'Scenario input assumptions',items:[`Estimated baseline margin: ${d.baselineMargin}%. What-if illustrations, not financial forecasts.`,...d.inputAssumptions]},{title:'Scenario comparisons',items:[],chart:d.scenarios.map(s=>({label:s.name,value:results[s.type].projectedOpportunityScore})),table:{headers:['Scenario','Estimated margin','Opportunity score / risk'],rows:d.scenarios.map(s=>[s.name,`${results[s.type].projectedMargin}%`,`${results[s.type].projectedOpportunityScore}/100 / ${results[s.type].riskDelta}`])}});for(const s of d.scenarios)blocks.push({title:s.name,items:[s.narrative],table:{headers:['Estimated input / unit','Baseline → scenario','Margin sensitivity'],rows:s.variables.map(v=>[`${v.name} (${v.unit})`,`${v.baselineValue} → ${v.newValue}`,String(v.marginImpactPerPercent)])}});break;}
 case 'execution':{const d=sectionContracts.execution.parse(c);blocks.push({title:'Proposed execution timeline',items:['Timing and responsibilities are suggestions. Existing task progress remains authoritative.'],timeline:d.tasks.map(t=>({phase:t.phase,label:t.title})),table:{headers:['Phase / milestone','Task / dependency','Suggested responsibility / KPI'],rows:d.tasks.map(t=>[`${t.phase.replace(/_/g,' ')}\n${t.milestone}`,`${t.title}\n${t.description}\nDependency: ${t.dependency}`,`${t.suggestedOwner}\nKPI: ${t.kpi}`])}});break;}
 }
 blocks.push({title:'Assumptions and limitations',items:c.caveats});return blocks;
}
