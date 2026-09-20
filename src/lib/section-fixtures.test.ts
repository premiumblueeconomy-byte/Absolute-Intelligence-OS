import { describe,it,expect } from 'vitest';
import { sectionContracts, SECTION_ORDER, dimensionKeys, phases, scenarioTypes } from '../../supabase/functions/_shared/section-contracts';
import { generateSection } from '../../supabase/functions/generate-opportunity-section/generation';
import { pendingSections } from './opportunity-sections';
import { sectionDocument } from './section-document';
import type { SectionRun } from './opportunity-sections';
import { fixtures, context } from '../../tests/section-fixtures';
describe('section generation contracts',()=>{
 for(const section of SECTION_ORDER)it(`${section}: validates, synthesizes and renders without inventing actual results`,async()=>{
  const calls:string[]=[];
  const generated=await generateSection(section,context,'Keep estimates clear',async(role)=>{calls.push(role);return role==='integrator'?fixtures[section]:role==='critic'?{disagreements:[],rejected_ideas:[],required_corrections:[],validation_priorities:[]}:{summary:'Brief',findings:[],candidates:[],risks:[],evidence_gaps:[]};});
  expect(calls).toEqual(['discovery','market','evidence','critic','integrator']);
  const run={id:'run',section,result:generated.result,calculations:generated.calculations,created_at:'2026-09-20T00:00:00Z',finished_at:null,review_state:'draft',version:1} as SectionRun;
  expect(sectionDocument(run)[0].items[0]).toContain('DRAFT');
  if(section==='scoring'){expect(generated.calculations.overallScore).toBe(60);expect(generated.calculations.confidence).toBe(0);}
  if(section==='scenarios')expect(Object.keys(generated.calculations.scenarios as object)).toHaveLength(5);
 });
 it('rejects incomplete dimensions, illegal scores, and fabricated experiment results',()=>{
  expect(()=>sectionContracts.scoring.parse({...fixtures.scoring,dimensions:fixtures.scoring.dimensions.slice(1)})).toThrow();
  expect(()=>sectionContracts.scoring.parse({...fixtures.scoring,dimensions:fixtures.scoring.dimensions.map(d=>({...d,score:101}))})).toThrow();
  expect(()=>sectionContracts.experiments.parse({...fixtures.experiments,experiments:[{...fixtures.experiments.experiments[0],actual_result:'Completed!'}]})).toThrow();
  expect(()=>sectionContracts.execution.parse({...fixtures.execution,tasks:fixtures.execution.tasks.slice(1)})).toThrow();
 });
 it('resumes only missing sections in the selected batch',()=>{
  const runs=[{section:'overview',batch_id:'batch',status:'completed'},{section:'scoring',batch_id:'batch',status:'failed'},{section:'scoring',batch_id:'other',status:'completed'}] as SectionRun[];
  expect(pendingSections(runs,'batch',SECTION_ORDER)).toEqual(SECTION_ORDER.slice(1));
 });
});

