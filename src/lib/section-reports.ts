import { assembleOpportunityReport } from './reports';
import { listSectionRuns, SECTION_ORDER, SECTION_LABEL, type Section, type SectionRun } from './opportunity-sections';
import { sectionDocument, type ReportBlock } from './section-document';
import { listExperiments } from './experiments';
import { listTasks } from './execution';
import { listScenarios } from './scenarios';
import { listRedTeamRuns } from './red-team';
import { getOpportunity, type Opportunity } from './opportunities';
import type { Project } from './projects';
import { sectionContracts } from './opportunity-sections';
import { DIMENSION_LABEL } from './scoring';

export async function assembleSectionReport(project:Project,opportunity:Opportunity,section?:Section,draft?:SectionRun){
 const fresh=await getOpportunity(opportunity.id);if(!fresh)throw new Error('Opportunity unavailable.');
 const [base,runs,experiments,tasks,scenarios,redteam]=await Promise.all([assembleOpportunityReport(project,fresh),listSectionRuns(fresh.id),listExperiments(fresh.id),listTasks(fresh.id),listScenarios(fresh.id),listRedTeamRuns(fresh.id)]);
 const manual:Record<Section,ReportBlock[]>={
  overview:[{title:'Saved overview',items:[fresh.summary,`Transformation: ${fresh.transformation}`,`Customers: ${fresh.customers.join('; ')}`,`Products: ${fresh.products.join('; ')}`,`Applications: ${fresh.applications.join('; ')}`,`Markets: ${fresh.markets.join('; ')}`,`Next action: ${fresh.recommended_next_action}`]}],
  scoring:[{title:'Saved scoring',items:[base.confidenceSummary],chart:base.scores}],
  evidence:[{title:'Recorded assumptions',items:base.assumptions.map(a=>`${a.statement}\nValidation: ${a.validation_method}`)},{title:'Recorded unknowns',items:base.unknowns.map(u=>`${u.question}\n${u.why_it_matters}`)},{title:'Evidence register',items:base.evidenceSummary.map(e=>`${e.source} — ${e.status}; confidence ${e.confidence}/100`)},{title:'Claims requiring validation',items:base.claimsToValidate||[]},{title:'Verified facts',items:base.criticalFacts}],
  redteam:redteam.map(r=>({title:`Recorded Red Team — ${new Date(r.created_at).toLocaleDateString()}`,items:readStrings(r.result)})),
  experiments:experiments.length?[{title:'Recorded experiments and actual results',items:[],table:{headers:['Experiment / status','Design','Actual results / learning'],rows:experiments.map(e=>[`${e.title}\n${e.status}`,`Hypothesis: ${e.hypothesis}\nMethod: ${e.method}\nSuccess: ${e.success_metric}\nResources: ${e.required_resources}`,`Actual: ${e.actual_result||'Not recorded'}\nConclusion: ${e.conclusion||'Not recorded'}\nLearning: ${e.learning||'Not recorded'}`])}}]:[],
  scenarios:scenarios.map(s=>({title:`Saved scenario: ${s.name}`,items:[`Created ${new Date(s.created_at).toLocaleString()}. What-if illustration using estimated inputs.`,...readStrings(s.variables),...readStrings(s.results)]})),
  execution:tasks.length?[{title:'Recorded execution progress',items:[],timeline:tasks.map(t=>({phase:t.phase,label:t.title})),table:{headers:['Phase / task / status','Description / dependency','Owner / KPI'],rows:tasks.map(t=>[`${t.phase}\n${t.title}\n${t.status}`,`${t.description}\nDependency: ${t.dependency}`,`${t.owner||'Unassigned'}\nKPI: ${t.kpi}`])}}]:[],
 };
 const selected=section?[section]:SECTION_ORDER;
 base.title=`${fresh.title} — ${draft?'DRAFT ':''}${section?SECTION_LABEL[section]:'Complete report'}`;
 // The title must identify draft and section on covers and filenames too.
 base.opportunityPortfolio[0].title=base.title;
 base.hideScorecard=!!section&&section!=='scoring';
 if(draft?.section==='scoring'){
  base.scores=sectionContracts.scoring.parse(draft.result).dimensions.map(d=>({label:DIMENSION_LABEL[d.key],value:d.score}));
  base.opportunityPortfolio[0].opportunityScore=Number(draft.calculations.overallScore);
  base.opportunityPortfolio[0].confidenceScore=Number(draft.calculations.confidence);
  base.confidenceSummary=`DRAFT: Opportunity ${draft.calculations.overallScore}/100; evidence confidence ${draft.calculations.confidence}/100. Not yet applied.`;
 }
 base.sections=selected.flatMap(s=>{
  const version=draft?.section===s?draft:runs.find(r=>r.section===s&&r.review_state==='applied');
  if(draft&&version===draft)return sectionDocument(draft);
  const rich=version?sectionDocument(version):[{title:SECTION_LABEL[s],items:['No generated analysis applied. Saved content follows where available.']}];
  return [...rich,...manual[s].length?manual[s]:[{title:`${SECTION_LABEL[s]} — missing content`,items:['No saved content available. Generate this section to create a draft.']}]];
 });
 return base;
}
function readStrings(value:unknown,prefix=''):string[]{
 if(value==null)return [];
 if(Array.isArray(value))return value.flatMap(v=>readStrings(v,prefix));
 if(typeof value==='object')return Object.entries(value).flatMap(([k,v])=>readStrings(v,k.replace(/([A-Z])/g,' $1').replace(/_/g,' ')));
 return [`${prefix?prefix+': ':''}${String(value)}`];
}
