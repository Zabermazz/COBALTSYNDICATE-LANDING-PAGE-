import {siteUrl} from '@/lib/site-url';
import {firms,guides} from '@/lib/catalogue';
export default function sitemap(){const root=siteUrl();if(!root)return [];return ['','/firms','/giveaways','/updates','/list-your-firm','/research-index','/compare','/offers','/guides','/agency','/agency/creators','/agency/brands','/about','/methodology','/tools/consistency',...firms.map(f=>`/firms/${f.id}`),...guides.map(g=>`/guides/${g.slug}`)].map(path=>({url:root+path,lastModified:'2026-10-02'}));}
