import {notFound} from 'next/navigation';
import {courseData} from '@/lib/education/catalogue';
import {LearningShell,Hero,Curriculum,s} from '@/components/education/ui';
export const dynamic='force-dynamic';
export async function generateMetadata({params}:{params:Promise<{slug:string}>}){const data=await courseData((await params).slug);return {title:data?.course.title||'Course',description:data?.course.summary};}
export default async function Course({params}:{params:Promise<{slug:string}>}){const data=await courseData((await params).slug);if(!data)notFound();return <LearningShell><Hero tag={`${data.course.level} / ${data.course.access.replace('_',' ')}`} title={data.course.title}><p>{data.course.summary}</p></Hero><h2>Course curriculum</h2><Curriculum {...data}/>{data.lessons.length>0&&<div className={s.actions}><a className={s.primary} href={`/learn/course/${data.course.id}/lesson/${data.lessons[0].slug}`}>Start learning →</a><a className={s.secondary} href="/learn/dashboard">My learning</a></div>}<p className={s.muted}>Lesson availability and access are shown above. Completing a course does not guarantee trading results.</p></LearningShell>;}
