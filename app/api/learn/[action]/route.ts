import {NextResponse} from 'next/server';
import {assertOrigin, rateLimit} from '@/lib/education/auth';
import {authorizeLesson, lessonContent, signedAsset} from '@/lib/education/catalogue';
import {rpc} from '@/lib/education/db';
import {z} from 'zod';
export const runtime='nodejs';
export async function POST(request:Request,{params}:{params:Promise<{action:string}>}) {
  try {assertOrigin(request);}catch{return NextResponse.json({error:'Request origin rejected'},{status:403});}
  try {
    const {action}=await params;
    if(!['progress','asset'].includes(action))return new Response('Not found',{status:404});
    const body=z.object({course:z.string().max(100),lesson:z.string().max(100),seconds:z.number().optional(),complete:z.boolean().optional(),kind:z.enum(['video','download']).optional()}).parse(await request.json());
    if(typeof body.course!=='string'||typeof body.lesson!=='string'||body.course.length>100||body.lesson.length>100)return new Response('Invalid lesson',{status:400});
    const auth=await authorizeLesson(body.course,body.lesson);
    if(!auth)return new Response('Not found',{status:404});
    if(!auth.allowed)return NextResponse.json({error:'Membership required or verification unavailable.'},{status:403});
    if(action==='progress') {
      if(!auth.user)return NextResponse.json({error:'Sign in to save progress.'},{status:401});
      await rateLimit('progress',String(auth.user.telegram_id),120,600);
      const seconds=typeof body.seconds==='number'&&Number.isFinite(body.seconds)?Math.min(Math.max(0,Math.floor(body.seconds)),auth.lesson.duration_seconds):0;
      await rpc('edu_save_progress',{p_user:auth.user.telegram_id,p_lesson:auth.lesson.id,p_seconds:seconds,p_complete:body.complete===true});
      return NextResponse.json({ok:true});
    }
    if(auth.user)await rateLimit('assets',String(auth.user.telegram_id),60,600);
    const content=await lessonContent(auth.lesson.id);
    const path=body.kind==='video'?content?.video_path:body.kind==='download'?content?.download_path:null;
    if(!path)return NextResponse.json({error:'This asset is not available.'},{status:404});
    return NextResponse.json({url:await signedAsset(path),expiresIn:120},{headers:{'Cache-Control':'private, no-store'}});
  }catch{return NextResponse.json({error:'This request is temporarily unavailable.'},{status:503});}
}
