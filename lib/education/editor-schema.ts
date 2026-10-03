import {z} from 'zod';
const slug=z.string().min(1).max(100).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);
const access=z.enum(['public','free_member','premium']);
const path=z.string().max(500).regex(/^[a-zA-Z0-9_/-]+\.[a-zA-Z0-9]+$/).refine(v=>!v.startsWith('/')&&!v.includes('..')).nullable();
export const courseSchema=z.object({
  id:slug,title:z.string().min(1).max(180),summary:z.string().max(2000),level:z.enum(['beginner','intermediate','advanced']),access,
  published:z.boolean(),position:z.number().int().min(0).max(10000),sections:z.array(z.object({
    id:slug,title:z.string().min(1).max(180),position:z.number().int().min(0).max(10000),lessons:z.array(z.object({
      id:slug,slug,title:z.string().min(1).max(180),summary:z.string().max(2000),access:access.nullable(),published:z.boolean(),position:z.number().int().min(0).max(10000),
      duration_seconds:z.number().int().min(0).max(86400),body:z.string().max(100000),video_path:path,download_path:path,
    })).max(200),
  })).max(50),
}).superRefine((c,ctx)=>{
  const ids=c.sections.map(s=>s.id),lessons=c.sections.flatMap(s=>s.lessons);
  if(new Set(ids).size!==ids.length||new Set(lessons.map(l=>l.id)).size!==lessons.length||new Set(lessons.map(l=>l.slug)).size!==lessons.length)ctx.addIssue({code:'custom',message:'Section IDs, lesson IDs and lesson slugs must be unique.'});
  for(const l of lessons)if(l.published&&!l.body.trim()&&!l.video_path)ctx.addIssue({code:'custom',message:`Published lesson ${l.slug} needs text or a video.`});
});
