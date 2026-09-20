import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { SECTION_ORDER, SECTION_LABEL, listSectionRuns, generateOpportunitySection, reviewSection, pendingSections, type Section, type SectionRun } from '@/lib/opportunity-sections';
import { sectionDocument, type ReportBlock } from '@/lib/section-document';
import { assembleSectionReport } from '@/lib/section-reports';
import type { Opportunity } from '@/lib/opportunities';
import type { Project } from '@/lib/projects';

export function SectionWorkspace({opportunity,project,section,onApplied,onSectionChange}:{opportunity:Opportunity;project:Project;section:Section;onApplied:()=>Promise<void>;onSectionChange:(s:Section)=>void}){
 const {user}=useAuth();
 const owner=user?.id===opportunity.user_id;
 const [runs,setRuns]=useState<SectionRun[]>([]),[batch,setBatch]=useState(''),[busy,setBusy]=useState(''),[error,setError]=useState(''),[instructions,setInstructions]=useState(''),[reviewing,setReviewing]=useState<string|null>(null),[loaded,setLoaded]=useState(false);
 const lock=useRef(false),mounted=useRef(true),stop=useRef(false);
 const key=`opportunity-sections:${opportunity.id}`;
 const refresh=useCallback(async()=>{const latest=await listSectionRuns(opportunity.id);if(mounted.current){setRuns(latest);setLoaded(true);}return latest;},[opportunity.id]);
 useEffect(()=>{
  mounted.current=true;setLoaded(false);
  void refresh().then(latest=>{if(!mounted.current)return;let saved='';try{saved=localStorage.getItem(key)||'';}catch{/* Server history remains available. */}setBatch(saved||latest[0]?.batch_id||'');}).catch(e=>{if(mounted.current)setError(e.message);});
  return()=>{mounted.current=false;stop.current=true;};
 },[key,refresh]);
 const saveBatch=(id:string)=>{setBatch(id);try{localStorage.setItem(key,id);}catch{/* History can restore the latest batch. */}};
 const fail=(e:unknown)=>{const message=e instanceof Error?e.message:'Could not complete this action.';if(mounted.current)setError(message);toast.error(message);};
 const waitForRun=async(run:SectionRun)=>{
  let current=run;
  while(current.status==='generating'){
   if(!mounted.current||stop.current)return null;
   if(Date.now()-Date.parse(current.created_at)>185000)throw new Error('Generation was interrupted. Resume to retry the unfinished section.');
   await new Promise(resolve=>setTimeout(resolve,2500));
   current=(await refresh()).find(r=>r.id===run.id)||current;
  }
  if(current.status==='failed')throw new Error(current.error||'Generation failed.');
  return current;
 };
 const generate=async(all:boolean,fresh=false)=>{
  if(lock.current||!owner)return;lock.current=true;stop.current=false;setError('');
  const id=all&&!fresh&&batch?batch:crypto.randomUUID();saveBatch(id);
  try{
   let latest=await refresh();
   const todo=all?pendingSections(latest,id,SECTION_ORDER):[section];
   for(const next of todo){
    if(!mounted.current||stop.current)break;
    setBusy(`Generating ${SECTION_LABEL[next]}…`);onSectionChange(next);
    const result=await generateOpportunitySection(opportunity.id,next,id,instructions);
    const completed=await waitForRun(result);
    if(!completed)break;
    latest=await refresh();
    if(mounted.current)setReviewing(completed.id);
   }
   if(mounted.current&&!stop.current)toast.success('Drafts saved. Review each section before applying.');
  }catch(e){fail(e);await refresh().catch(()=>{});}finally{lock.current=false;if(mounted.current)setBusy('');}
 };
 const review=async(run:SectionRun,action:'apply'|'discard')=>{
  if(lock.current)return;lock.current=true;setBusy(action==='apply'?'Applying draft…':'Discarding draft…');setError('');
  try{await reviewSection(run.id,action);await refresh();if(action==='apply')await onApplied();setReviewing(null);toast.success(action==='apply'?'Draft applied. Existing recorded work preserved.':'Draft discarded.');}catch(e){fail(e);}finally{lock.current=false;if(mounted.current)setBusy('');}
 };
 const download=async(format:'pdf'|'pptx',scope?:Section,draft?:SectionRun)=>{
  if(lock.current)return;lock.current=true;setBusy(`Preparing ${format.toUpperCase()}…`);setError('');
  try{const content=await assembleSectionReport(project,opportunity,scope,draft);if(format==='pdf'){const {exportReportPdf}=await import('@/lib/report-pdf');exportReportPdf(content);}else{const {exportReportPptx}=await import('@/lib/report-pptx');await exportReportPptx(content);}toast.success('Download started.');}catch(e){fail(e);}finally{lock.current=false;if(mounted.current)setBusy('');}
 };
 const remaining=pendingSections(runs,batch,SECTION_ORDER);
 const drafts=runs.filter(r=>r.section===section&&r.status==='completed'&&r.review_state==='draft');
 const applied=runs.find(r=>r.section===section&&r.review_state==='applied');
 const activeReview=drafts.find(r=>r.id===reviewing);
 const disabled=!!busy||!loaded;
 return <div className="space-y-4 my-5">
  <Card className="p-4 space-y-3 border-accent/30">
   <div className="flex flex-wrap gap-2 items-center">
    <Button disabled={disabled||!owner||!!batch&&remaining.length===0} onClick={()=>void generate(true)}>{batch&&remaining.length>0&&remaining.length<7?'Resume Generate All':'Generate All'}</Button>
    {batch&&remaining.length===0&&<Button variant="outline" disabled={disabled||!owner} onClick={()=>void generate(true,true)}>Generate new set</Button>}
    <Button variant="outline" disabled={disabled} onClick={()=>void download('pdf')}>Complete report PDF</Button>
    <Button variant="outline" disabled={disabled} onClick={()=>void download('pptx')}>Complete report PowerPoint</Button>
   </div>
   <p className="text-xs text-muted-foreground">Each successful section uses one AI run. Results are saved as drafts. Downloads use saved content and do not use AI runs. Keep this page open to continue the sequence.</p>
   {batch&&<p className="text-xs">This set: {7-remaining.length}/7 sections generated. {remaining.length===0?'All drafts saved.':''}</p>}
   <label className="block text-sm">Optional generation instructions<textarea aria-label="Optional generation instructions" value={instructions} maxLength={4000} onChange={e=>setInstructions(e.target.value)} disabled={!!busy} placeholder="For example: focus on a small pilot in Lagos and keep estimated costs explicit." className="mt-1 w-full min-h-20 rounded-md border bg-background p-2"/></label>
   {!owner&&<p className="text-sm">You can download saved reports. Only the opportunity owner can generate and apply drafts.</p>}
   {busy&&<div role="status" className="text-sm text-accent">{busy} {busy.startsWith('Generating')&&<Button size="sm" variant="ghost" onClick={()=>{stop.current=true;}}>Stop after this section</Button>}</div>}
   {error&&<div role="alert" className="text-sm text-destructive">{error} <Button variant="ghost" size="sm" disabled={!!busy} onClick={()=>void refresh().then(()=>setError('')).catch(fail)}>Refresh saved progress</Button></div>}
  </Card>
  <Card className="p-4 space-y-3">
   <h2 className="font-bold">{SECTION_LABEL[section]}</h2>
   <div className="flex flex-wrap gap-2">
    <Button disabled={disabled||!owner} onClick={()=>void generate(false)}>Generate {SECTION_LABEL[section]}</Button>
    <Button variant="outline" disabled={disabled} onClick={()=>void download('pdf',section)}>Download PDF</Button>
    <Button variant="outline" disabled={disabled} onClick={()=>void download('pptx',section)}>Download PowerPoint</Button>
   </div>
   {drafts.map(d=><div key={d.id} className="border rounded-md p-3 flex flex-wrap gap-2 items-center text-sm"><span>Draft v{d.version} · {new Date(d.finished_at||d.created_at).toLocaleString()}</span><Button variant="outline" size="sm" onClick={()=>setReviewing(reviewing===d.id?null:d.id)}>Review</Button></div>)}
   {activeReview&&<div className="border-2 border-amber-500/50 rounded-lg p-4 space-y-4">
    <p className="font-semibold">Review draft — compare with the saved content below</p>
    <DocumentPreview blocks={sectionDocument(activeReview)}/>
    <p className="text-sm">Applying Overview or Scoring replaces those fields if they have not changed. Other sections add new proposals; matching existing experiments and tasks keep their recorded work.</p>
    <div className="flex flex-wrap gap-2"><Button disabled={disabled||!owner} onClick={()=>void review(activeReview,'apply')}>Apply draft</Button><Button variant="outline" disabled={disabled||!owner} onClick={()=>void review(activeReview,'discard')}>Discard draft</Button><Button variant="outline" disabled={disabled} onClick={()=>void download('pdf',section,activeReview)}>Download draft PDF</Button><Button variant="outline" disabled={disabled} onClick={()=>void download('pptx',section,activeReview)}>Download draft PowerPoint</Button></div>
   </div>}
   {applied&&<details open><summary className="cursor-pointer font-semibold">Applied analysis · version {applied.version}</summary><DocumentPreview blocks={sectionDocument(applied)}/></details>}
  </Card>
 </div>;
}

export function DocumentPreview({blocks}:{blocks:ReportBlock[]}){
 return <div className="space-y-5">{blocks.map((b,i)=><section key={i} className="space-y-2"><h3 className="font-semibold text-sm">{b.title}</h3>{b.items.map((v,j)=><p key={j} className="text-sm whitespace-pre-wrap break-words">{v}</p>)}{b.chart&&<div className="space-y-2">{b.chart.map((c,j)=><div key={j} className="text-xs">{c.label} · {c.value}/100<div className="h-2 rounded bg-muted"><div className="h-2 rounded bg-accent" style={{width:`${Math.max(0,Math.min(100,c.value))}%`}}/></div></div>)}</div>}{b.table&&<div className="overflow-x-auto"><table className="w-full text-xs border-collapse"><thead><tr>{b.table.headers.map(h=><th key={h} className="border p-2 text-left bg-muted">{h}</th>)}</tr></thead><tbody>{b.table.rows.map((r,j)=><tr key={j}>{r.map((v,k)=><td key={k} className="border p-2 align-top whitespace-pre-wrap min-w-40">{v}</td>)}</tr>)}</tbody></table></div>}</section>)}</div>;
}
