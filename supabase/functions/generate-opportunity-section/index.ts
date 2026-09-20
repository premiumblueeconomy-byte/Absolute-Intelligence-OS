import { z } from 'zod';
import { sectionSchema, type SectionRun } from '../_shared/section-contracts.ts';
import { generateSection } from './generation.ts';
const cors = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
const inputSchema=z.object({opportunityId:z.string().uuid(),section:sectionSchema,batchId:z.string().uuid(),instructions:z.string().max(4000).default('')}).strict();

Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response(null,{headers:cors});
 if(req.method!=='POST')return reply({error:'Use POST'},405);
 let runId:string|undefined;
 const url=Deno.env.get('SUPABASE_URL')!;
 const authorization=req.headers.get('authorization');
 const rpc=async(name:string,body:unknown,service=false)=>{
  const key=Deno.env.get(service?'SUPABASE_SERVICE_ROLE_KEY':'SUPABASE_ANON_KEY')!;
  const res=await fetch(`${url}/rest/v1/rpc/${name}`,{method:'POST',headers:{Authorization:service?`Bearer ${key}`:authorization!,apikey:key,'Content-Type':'application/json','Content-Profile':'public','Accept-Profile':'public'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
  const data=await res.json();
  if(!res.ok)throw new Error(data.message || 'Could not save section. Please retry.');
  return data;
 };
 try{
  if(!authorization?.startsWith('Bearer '))return reply({error:'Please sign in.'},401);
  const auth=await fetch(`${url}/auth/v1/user`,{headers:{Authorization:authorization,apikey:Deno.env.get('SUPABASE_ANON_KEY')!},signal:AbortSignal.timeout(10000)});
  if(!auth.ok)return reply({error:'Your session expired. Please sign in again.'},401);
  const raw=await req.text();if(raw.length>10000)return reply({error:'Request too large.'},413);
  const input=inputSchema.parse(JSON.parse(raw));
  const key=Deno.env.get('DEEPSEEK_API_KEY');if(!key)return reply({error:'AI generation is not configured.'},503);
  const start=await rpc('begin_opportunity_section',{p_opportunity:input.opportunityId,p_section:input.section,p_batch:input.batchId,p_instructions:input.instructions}) as {claimed:boolean;run:SectionRun};
  if(!start.claimed)return reply({run:start.run},start.run.status==='generating'?202:200);
  runId=start.run.id;
  const deadline=AbortSignal.timeout(135000);
  const output=await generateSection(input.section,start.run.source_context,input.instructions,async(role,system,content,maxTokens)=>{
   const res=await fetch('https://api.deepseek.com/chat/completions',{method:'POST',signal:AbortSignal.any([deadline,AbortSignal.timeout(role==='integrator'?65000:35000)]),headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model:Deno.env.get('AIOS_MODEL')||'deepseek-chat',max_tokens:maxTokens,response_format:{type:'json_object'},messages:[{role:'system',content:system},{role:'user',content}]})});
   if(!res.ok)throw new Error(res.status===402?'AI provider balance is insufficient. Please top up the DeepSeek account.':'AI provider is busy or unavailable. Retry this section.');
   const data=await res.json();const choice=data?.choices?.[0];
   if(choice?.finish_reason==='length')throw new SyntaxError('Model JSON was truncated.');
   return JSON.parse(String(choice?.message?.content||'').replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,''));
  });
  const run=await rpc('finish_opportunity_section',{p_id:runId,p_result:output.result,p_calculations:{...output.calculations,model:Deno.env.get('AIOS_MODEL')||'deepseek-chat'}},true);
  return reply({run});
 }catch(e){
  const message=e instanceof z.ZodError || e instanceof SyntaxError?'The section format was incomplete. Retry this section.':e instanceof Error&&['TimeoutError','AbortError'].includes(e.name)?'Generation timed out. Retry this section.':e instanceof Error?e.message:'Section generation failed.';
  if(runId)try{await rpc('finish_opportunity_section',{p_id:runId,p_result:null,p_error:message},true);}catch{console.error('Could not finalize section',runId);}
  return reply({error:message},message.includes('limit')?429:message.includes('owner')||message.includes('active')?403:runId?502:400);
 }
});
