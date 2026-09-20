import { dimensionKeys, phases, scenarioTypes } from '../supabase/functions/_shared/section-contracts';
const base={summary:'Test opportunity-specific analysis',caveats:['All commercial estimates need validation.']};
export const fixtures={
 overview:{...base,transformation:'Convert recovered shells to a filtered mineral input.',commercialPotential:'Validate demand with three ceramics buyers.',products:['Mineral input'],applications:['Ceramics'],customers:['Regional ceramics manufacturers'],markets:['Lagos'],nextSteps:['Test purity with a qualified lab.']},
 scoring:{...base,dimensions:dimensionKeys.map(key=>({key,score:60,explanation:'Promising but unverified.',evidenceGaps:['Obtain independent measurements.']}))},
 evidence:{...base,assumptions:[{statement:'A buyer will pay for consistent purity.',priority:'high',validationMethod:'Interview buyers with a sample.',evidenceNeeded:'Written specifications.'}],unknowns:[{question:'Can the pilot meet purity targets?',whyItMatters:'Determines use.',evidenceNeeded:'Lab assay.'}]},
 redteam:{...base,objections:[{objection:'Purity may vary.',failureCondition:'Batch fails buyer specification.',counterargument:'Sorting may improve consistency.',mitigation:'Measure input variability before scaling.'}]},
 experiments:{...base,experiments:[{title:'Purity test',hypothesis:'Sorting improves purity.',method:'Compare three sorted batches.',successCriteria:'Meet buyer specification in all samples.',resources:'Accredited lab and three samples.'}]},
 scenarios:{...base,baselineMargin:30,inputAssumptions:['Baseline margin is an estimate.'],scenarios:scenarioTypes.map((type,i)=>({name:type,type,narrative:'Illustrative sensitivity case.',variables:[{name:'Sales index',unit:'index',baselineValue:100,newValue:i===0?100:100+i*10,marginImpactPerPercent:0.4}]}))},
 execution:{...base,tasks:phases.map(phase=>({title:`${phase} gate`,description:'Review lab and customer evidence.',phase,milestone:'Written go/no-go decision.',dependency:'Prior gate or initial discovery.',suggestedOwner:'Project lead',kpi:'One documented decision.'}))},
};
export const context={opportunity:{id:'test'},weights:null,evidence:[],assumptions:[],unknowns:[],sections:[]};

