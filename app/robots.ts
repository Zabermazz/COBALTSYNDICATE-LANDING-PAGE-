import {siteUrl} from '@/lib/site-url';
export default function robots(){const root=siteUrl();return {rules:{userAgent:'*',allow:root?'/':undefined,disallow:root?['/api/','/admin','/portal','/go/']:'/'},sitemap:root?root+'/sitemap.xml':undefined}}
