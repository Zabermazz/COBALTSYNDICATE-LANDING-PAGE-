import {firms} from '@/lib/catalogue';
export async function GET(request:Request,{params}:{params:Promise<{firm:string}>}){const {firm}=await params;const found=firms.find(f=>f.id===firm);if(!found)return new Response('Firm not found',{status:404});return new Response(null,{status:302,headers:{Location:found.url,'Cache-Control':'no-store'}})}
