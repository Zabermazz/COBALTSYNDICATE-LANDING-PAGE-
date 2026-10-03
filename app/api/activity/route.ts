export async function POST(){return new Response(null,{status:204})}
export async function GET(){return Response.json({error:'Tracking is not enabled in this Google Forms edition.'},{status:404})}
