import {NextResponse} from 'next/server';
import {canManage} from '@/lib/giveaway-store';
import {db,rpc} from '@/lib/education/db';
import {assertOrigin} from '@/lib/education/auth';
import {courseSchema} from '@/lib/education/editor-schema';
import type {Course,Section,Lesson,Content} from '@/lib/education/catalogue';
export const runtime='nodejs';
export async function GET(request:Request){
  if(!await canManage(request))return new Response('Unauthorized',{status:401});
  try{const id=new URL(request.url).searchParams.get('id');if(!id)return NextResponse.json(await db('edu_courses?select=id,title,published&order=position'),{headers:{'Cache-Control':'no-store'}});
    const course=(await db<Course[]>(`edu_courses?id=eq.${encodeURIComponent(id)}&select=*`))[0];if(!course)return new Response('Not found',{status:404});
    const sections=await db<Section[]>(`edu_sections?course_id=eq.${encodeURIComponent(id)}&select=*&order=position`);
    const lessons=await db<(Lesson&{edu_lesson_content:Content|null})[]>(`edu_lessons?course_id=eq.${encodeURIComponent(id)}&select=*,edu_lesson_content(body,video_path,download_path)&order=position`);
    return NextResponse.json({...course,sections:sections.map(s=>({...s,lessons:lessons.filter(l=>l.section_id===s.id).map(l=>({...l,...(l.edu_lesson_content||{body:'',video_path:null,download_path:null})}))}))},{headers:{'Cache-Control':'no-store'}});
  }catch{return NextResponse.json({error:'Course storage is not configured or is unavailable.'},{status:503});}
}
export async function POST(request:Request){
  if(!await canManage(request))return new Response('Unauthorized',{status:401});
  try{assertOrigin(request);}catch{return new Response('Invalid origin',{status:403});}
  try{const raw=await request.text();if(raw.length>2000000)return new Response('Course too large',{status:413});const parsed=courseSchema.safeParse(JSON.parse(raw));if(!parsed.success)return NextResponse.json({error:parsed.error.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('\n')},{status:400});await rpc('edu_save_course',{p_course:parsed.data});return NextResponse.json({ok:true});}catch{return NextResponse.json({error:'Unable to save. Check storage configuration and ensure IDs do not belong to another course.'},{status:503});}
}
