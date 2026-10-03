import brokers from '@/lib/brokers.json';
export async function GET(_request:Request,{params}:{params:Promise<{broker:string}>}){const {broker}=await params;const found=brokers.find(b=>b.id===broker);if(!found)return new Response('Broker not found',{status:404});return new Response(null,{status:302,headers:{Location:found.affiliateURL,'Cache-Control':'no-store'}});}
