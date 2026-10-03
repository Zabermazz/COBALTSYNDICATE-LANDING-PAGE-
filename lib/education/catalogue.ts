import 'server-only';
import type {Access} from './core';
import {configured, db} from './db';
import {session} from './auth';
import {membership} from './telegram';
import {mayRead} from './core';

export type Course = {id: string; title: string; summary: string; level: string; access: Access; published: boolean; position: number};
export type Section = {id: string; course_id: string; title: string; position: number};
export type Lesson = {id: string; course_id: string; section_id: string; slug: string; title: string; summary: string; access: Access | null; published: boolean; position: number; duration_seconds: number};
export type Content = {body: string; video_path: string | null; download_path: string | null};
export type Progress = {lesson_id: string; watched_seconds: number; completed_at: string | null; updated_at: string};
export const starterCourses: Course[] = [
  {id:'trading-foundations',title:'Trading foundations',summary:'Start with risk, market mechanics and a repeatable learning routine. Two introductory reading lessons are available now.',level:'beginner',access:'public',published:true,position:1},
  {id:'gold-and-execution',title:'Gold & execution',summary:'A planned curriculum on market context, execution and review. Lessons will appear here when published.',level:'intermediate',access:'free_member',published:true,position:2},
  {id:'premium-playbook',title:'The premium playbook',summary:'A dedicated learning space for verified members of the Cobalt Syndicate premium community. Course content is being prepared.',level:'advanced',access:'premium',published:true,position:3},
];
export const starterSections: Section[] = [{id:'foundations-start',course_id:'trading-foundations',title:'Start with the process',position:1}];
export const starterLessons: Lesson[] = [
  {id:'foundations-risk',course_id:'trading-foundations',section_id:'foundations-start',slug:'risk-before-reward',title:'Risk before reward',summary:'Define what you can lose before deciding what you hope to make.',access:'public',published:true,position:1,duration_seconds:0},
  {id:'foundations-journal',course_id:'trading-foundations',section_id:'foundations-start',slug:'build-a-review-routine',title:'Build a review routine',summary:'Separate the quality of a decision from its outcome.',access:'public',published:true,position:2,duration_seconds:0},
];
const starterBodies: Record<string, Content> = {
  'foundations-risk':{body:'A trading plan starts with a limit, not a target. Before entering a position, write down the conditions that would invalidate the idea and the maximum loss you are prepared to accept.\n\nLeverage magnifies both gains and losses. A stop order does not guarantee its execution price in a fast or gapping market. Spread, commissions and slippage all affect the final result. Practise with a simulated account before committing money.\n\nA prop-firm evaluation adds its own rules. Read the current daily loss, total drawdown, position and news restrictions for the exact program. Never assume the advertised account size is money that belongs to you. Evaluation fees may be lost.\n\nYour exercise: create a checklist with the entry condition, invalidation condition, intended risk and any program limits. If you cannot explain an item clearly, pause before trading.\n\nThis lesson provides general education, not personal financial advice or a promise of results.',video_path:null,download_path:null},
  'foundations-journal':{body:'A profitable trade can follow a poor decision, and a carefully planned trade can still lose. Review the process independently of the outcome.\n\nFor each practice trade, record the date, market context, reason for entry, intended risk, execution, result and one observation. Save a chart if it helps explain the decision. Avoid changing your rules after every individual result.\n\nAt the end of a review period, ask whether you followed the same process, whether costs affected execution and whether your sample is large enough to support a conclusion. A short winning streak is not proof of a reliable edge.\n\nYour exercise: review five simulated trades and identify one repeatable process improvement. Keep the next practice session focused on that improvement.\n\nTrading involves risk. These exercises do not guarantee profitability.',video_path:null,download_path:null},
};
export async function courses(): Promise<Course[]> { return configured() ? db('edu_courses?published=eq.true&select=*&order=position') : starterCourses; }
export async function courseData(slug: string) {
  const course = (await courses()).find(c=>c.id===slug);
  if (!course) return null;
  const [sections, lessons] = configured() ? await Promise.all([
    db<Section[]>(`edu_sections?course_id=eq.${encodeURIComponent(slug)}&select=*&order=position`),
    db<Lesson[]>(`edu_lessons?course_id=eq.${encodeURIComponent(slug)}&published=eq.true&select=*&order=position`),
  ]) : [starterSections.filter(s=>s.course_id===slug),starterLessons.filter(l=>l.course_id===slug)];
  return {course,sections,lessons};
}
export async function authorizeLesson(courseSlug: string, lessonSlug: string) {
  const data = await courseData(courseSlug);
  const lesson = data?.lessons.find(l=>l.slug===lessonSlug);
  if (!data || !lesson) return null;
  const access = lesson.access || data.course.access;
  let user = null, premium = false, unavailable = false;
  if (configured()) {
    try { user = await session(); if (user && access==='premium') premium = await membership(user.telegram_id); }
    catch { unavailable = true; }
  }
  return {...data,lesson,user,access,unavailable,allowed: !unavailable && mayRead(access,!!user,premium) || access==='public'};
}
export async function lessonContent(id: string): Promise<Content | null> {
  return configured() ? (await db<Content[]>(`edu_lesson_content?lesson_id=eq.${encodeURIComponent(id)}&select=body,video_path,download_path`))[0] || null : starterBodies[id] || null;
}
export async function progress(userId: number) { return db<Progress[]>(`edu_progress?user_id=eq.${userId}&select=lesson_id,watched_seconds,completed_at,updated_at&order=updated_at.desc`); }
export async function signedAsset(path: string) {
  const url=process.env.SUPABASE_URL, key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || path.startsWith('/') || path.includes('..')) throw new Error('Asset unavailable');
  const response = await fetch(`${url}/storage/v1/object/sign/course-assets/${path.split('/').map(encodeURIComponent).join('/')}`, {
    method:'POST',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({expiresIn:120}),cache:'no-store',signal:AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error('Asset unavailable');
  const data = await response.json() as {signedURL?:string};
  if (!data.signedURL) throw new Error('Asset unavailable');
  return `${url}/storage/v1${data.signedURL}`;
}
