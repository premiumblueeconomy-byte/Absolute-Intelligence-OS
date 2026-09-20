import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { type Section, type SectionRun } from '../../supabase/functions/_shared/section-contracts';
export { SECTION_ORDER, SECTION_LABEL, sectionContracts, type Section, type SectionRun } from '../../supabase/functions/_shared/section-contracts';

// This additive API is isolated until generated database types include the new table.
const db = supabase as unknown as {
 from(table:'opportunity_section_runs'): {select(columns:string):{eq(key:string,value:string):{order(key:string,options:{ascending:boolean}):Promise<{data:SectionRun[]|null;error:Error|null}>}}};
 rpc(name:string,args:Record<string,Json>):Promise<{data:SectionRun|null;error:Error|null}>;
};
export async function listSectionRuns(opportunityId:string){
 const {data,error}=await db.from('opportunity_section_runs').select('*').eq('opportunity_id',opportunityId).order('created_at',{ascending:false});
 if(error)throw error; return data || [];
}
export async function reviewSection(id:string,action:'apply'|'discard'){
 const {data,error}=await db.rpc('review_opportunity_section',{p_id:id,p_action:action});if(error)throw error;return data!;
}
export async function generateOpportunitySection(opportunityId:string,section:Section,batchId:string,instructions:string){
 const {data,error}=await supabase.functions.invoke('generate-opportunity-section',{body:{opportunityId,section,batchId,instructions}});
 if(error){
  let message=error.message;
  try{const body=await error.context?.json();if(body?.error)message=body.error;}catch{/* Network error has no JSON response. */}
  throw new Error(message);
 }
 const run=data.run as SectionRun;
 if(run.status==='failed')throw new Error(run.error || 'Generation failed.');
 return run;
}
export function pendingSections(runs:SectionRun[],batchId:string,order:readonly Section[]){
 return order.filter(section=>!runs.some(r=>r.batch_id===batchId&&r.section===section&&r.status==='completed'));
}
