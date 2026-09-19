import {act,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {it,expect,vi} from 'vitest';
import {AuthProvider,useAuth} from './AuthContext';
const api=vi.hoisted(()=>({callback:null as null|((event:string,session:unknown)=>void),single:vi.fn(),clear:vi.fn()}));
vi.mock('@tanstack/react-query',()=>({useQueryClient:()=>({clear:api.clear})}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{auth:{onAuthStateChange:(callback:typeof api.callback)=>{api.callback=callback;return {data:{subscription:{unsubscribe:vi.fn()}}};}},from:()=>({select:()=>({eq:()=>({single:api.single})})})}}));
it('keeps page state mounted during a background token refresh',async()=>{
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
 const profile={id:'owner',onboarded:true,is_platform_admin:true,account_status:'active'};
 api.single.mockResolvedValue({data:profile,error:null});
 let mounts=0;function Child(){useState(()=>{mounts++;return 1;});return <p>In-progress work</p>;}
 function Gate(){const {loading}=useAuth();return loading?<p>Loading</p>:<Child/>;}
 const element=document.createElement('div');const root=createRoot(element);
 await act(async()=>{root.render(<AuthProvider><Gate/></AuthProvider>);});
 await act(async()=>{api.callback?.('SIGNED_IN',{user:{id:'owner'}});});
 const mounted=mounts;
 let resolve!:(v:unknown)=>void;api.single.mockImplementationOnce(()=>new Promise(r=>{resolve=r;}));
 await act(async()=>{api.callback?.('TOKEN_REFRESHED',{user:{id:'owner'}});});
 expect(element.textContent).toContain('In-progress work');expect(mounts).toBe(mounted);
 await act(async()=>{resolve({data:profile,error:null});});
 expect(mounts).toBe(mounted);
 await act(async()=>root.unmount());vi.unstubAllGlobals();
});

