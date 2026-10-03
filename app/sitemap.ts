import {siteUrl} from '@/lib/site-url';
import {firms,guides} from '@/lib/catalogue';
import {courses} from '@/lib/education/catalogue';
export const dynamic='force-dynamic';
export default async function sitemap(){const root=siteUrl();if(!root)return [];let education:string[]=[];try{education=(await courses()).map(c=>`/course/${c.id}`);}catch{}return ['','/courses',...education,'/firms','/giveaways','/updates','/list-your-firm','/research-index','/compare','/offers','/guides','/agency','/agency/creators','/agency/brands','/about','/methodology','/tools/consistency',...firms.map(f=>`/firms/${f.id}`),...guides.map(g=>`/guides/${g.slug}`)].map(path=>({url:root+path}));}
