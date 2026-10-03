import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {assertOrigin, COOKIE, cookieOptions, rateLimit, redeem, requestIp, session} from '@/lib/education/auth';
import {hashToken} from '@/lib/education/core';
import {db} from '@/lib/education/db';
import {membership} from '@/lib/education/telegram';
import {z} from 'zod';
export const runtime='nodejs';
export async function POST(request:Request,{params}:{params:Promise<{action:string}>}) {
  const {action}=await params;
  try {assertOrigin(request);} catch{return NextResponse.json({error:'Request origin rejected.'},{status:403});}
  try {
    if(action==='claim') {
      await rateLimit('claim-ip',requestIp(request),15,600);
      const body=z.object({token:z.string().max(100)}).parse(await request.json());
      const token=await redeem(body.token);
      const response=NextResponse.json({ok:true});
      response.cookies.set(COOKIE,token,{...cookieOptions,maxAge:7*86400});
      return response;
    }
    if(action==='logout') {
      const raw=(await cookies()).get(COOKIE)?.value;
      if(raw) await db(`edu_sessions?token_hash=eq.${hashToken(raw)}`,{method:'DELETE'});
      const response=NextResponse.json({ok:true});response.cookies.set(COOKIE,'',{...cookieOptions,maxAge:0});return response;
    }
    if(action==='recheck') {
      const user=await session();if(!user)return NextResponse.json({error:'Sign in first.'},{status:401});
      await rateLimit('recheck',String(user.telegram_id),5,300);
      return NextResponse.json({premium:await membership(user.telegram_id,true)});
    }
    return new Response('Not found',{status:404});
  } catch {return NextResponse.json({error:action==='claim'?'Sign-in could not be completed. The link may be used or expired, or verification may be unavailable. Wait a moment or request a new /login link.':'Unable to complete this request. Please wait and try again.'},{status:400});}
}
export async function GET(_request:Request,{params}:{params:Promise<{action:string}>}) {
  if((await params).action!=='status')return new Response('Not found',{status:404});
  try {const user=await session();return NextResponse.json({user,premium:user?await membership(user.telegram_id):false},{headers:{'Cache-Control':'no-store'}});}catch{return NextResponse.json({error:'Verification unavailable'},{status:503});}
}
