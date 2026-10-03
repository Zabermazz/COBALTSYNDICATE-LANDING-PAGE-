import {firms} from '@/lib/catalogue';
import {firmDestination} from '@/lib/firm-links';
export async function GET(request:Request,{params}:{params:Promise<{firm:string}>}){const {firm}=await params;const found=firms.find(f=>f.id===firm);if(!found)return new Response('Firm not found',{status:404});const destination=firmDestination(found);if(!destination)return new Response(null,{status:302,headers:{Location:new URL(`/firms/${found.id}`,request.url).href,'Cache-Control':'no-store'}});return new Response(null,{status:302,headers:{Location:destination,'Cache-Control':'no-store'}})}
