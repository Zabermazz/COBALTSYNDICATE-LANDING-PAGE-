import {manualGiveaways} from '@/lib/manual-giveaways';
import {manualState} from '@/lib/manual-giveaway-schema';
export const dynamic='force-dynamic';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){const {id}=await params;const g=manualGiveaways().find(g=>g.id===id&&g.status!=='draft');const headers={'Cache-Control':'no-store'};if(!g)return new Response('Giveaway not found.',{status:404,headers});if(manualState(g)!=='Open')return new Response('This giveaway is not accepting applications.',{status:410,headers});return new Response(null,{status:302,headers:{...headers,Location:g.entryUrl}});}
