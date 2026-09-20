import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach,afterEach,it,expect,vi } from 'vitest';
import { SectionWorkspace } from './SectionWorkspace';
import { fixtures } from '../../../tests/section-fixtures';
import type { SectionRun,Section } from '@/lib/opportunity-sections';
import type { Opportunity } from '@/lib/opportunities';
import type { Project } from '@/lib/projects';
const api=vi.hoisted(()=>({runs:[] as SectionRun[],generate:vi.fn(),review:vi.fn()}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:{id:'owner'}})}));
vi.mock('@/lib/opportunity-sections',async()=>{
 const original=await vi.importActual<typeof import('@/lib/opportunity-sections')>('@/lib/opportunity-sections');
 return {...original,listSectionRuns:async()=>api.runs,generateOpportunitySection:api.generate,reviewSection:api.review};
});
vi.mock('sonner',()=>({toast:{error:vi.fn(),success:vi.fn()}}));
let root:ReturnType<typeof createRoot>,container:HTMLDivElement;
const opportunity={id:'opp',user_id:'owner'} as Opportunity,project={id:'project'} as Project;
const render=async()=>{await act(async()=>root.render(<SectionWorkspace opportunity={opportunity} project={project} section="overview" onApplied={async()=>{}} onSectionChange={()=>{}}/>));};
const click=async(label:string)=>{const button=[...container.querySelectorAll('button')].find(b=>b.textContent===label);expect(button).toBeTruthy();await act(async()=>button!.click());};
beforeEach(()=>{vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);localStorage.clear();api.runs=[];api.generate.mockReset();api.review.mockReset();container=document.createElement('div');root=createRoot(container);});
afterEach(async()=>{await act(async()=>root.unmount());vi.unstubAllGlobals();});
function run(section:Section,batch:string):SectionRun{return {id:section,section,batch_id:batch,opportunity_id:'opp',version:1,status:'completed',review_state:'draft',result:fixtures[section],calculations:{},source_context:{},created_at:'2026-09-20T00:00:00Z',finished_at:null,reviewed_at:null,error:null} as SectionRun;}
it('saves progress and resumes without repeating successful sections after a failure',async()=>{
 let failed=false;
 api.generate.mockImplementation(async(_id,section:Section,batch:string)=>{if(section==='scoring'&&!failed){failed=true;throw new Error('Interrupted');}const r=run(section,batch);api.runs.unshift(r);return r;});
 await render();await click('Generate All');
 expect(api.generate.mock.calls.map(c=>c[1])).toEqual(['overview','scoring']);
 await click('Resume Generate All');
 expect(api.generate.mock.calls.map(c=>c[1])).toEqual(['overview','scoring','scoring','evidence','redteam','experiments','scenarios','execution']);
 expect(container.textContent).toContain('7/7 sections generated');
});
it('prevents duplicate clicks while a generation is in flight',async()=>{
 let finish!:(r:SectionRun)=>void;
 api.generate.mockImplementation(()=>new Promise(r=>{finish=r;}));
 await render();await click('Generate Overview');await click('Generate Overview');expect(api.generate).toHaveBeenCalledTimes(1);
 await act(async()=>{const r=run('overview','batch');api.runs=[r];finish(r);});
 expect(container.textContent).toContain('Review draft');
});
it('stops the sequence when leaving the page and preserves the completed draft',async()=>{
 let finish!:(r:SectionRun)=>void;api.generate.mockImplementation(()=>new Promise(r=>{finish=r;}));
 await render();await click('Generate All');await act(async()=>root.unmount());
 const r=run('overview',api.generate.mock.calls[0][2]);api.runs=[r];await act(async()=>finish(r));
 expect(api.generate).toHaveBeenCalledTimes(1);
 root=createRoot(container);await render();expect(container.textContent).toContain('Resume Generate All');
});
