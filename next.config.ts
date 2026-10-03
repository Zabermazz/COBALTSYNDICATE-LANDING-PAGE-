import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers(){return [
    {source:'/:path*',headers:[{key:'X-Content-Type-Options',value:'nosniff'},{key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},{key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'}]},
    ...['/login/:path*','/learn/:path*','/account/:path*','/admin/courses','/api/auth/:path*','/api/learn/:path*','/api/admin/courses'].map(source=>({source,headers:[{key:'Cache-Control',value:'private, no-store, max-age=0'},{key:'Referrer-Policy',value:'no-referrer'},{key:'X-Robots-Tag',value:'noindex, nofollow'},{key:'Content-Security-Policy',value:"frame-ancestors 'none'; object-src 'none'; base-uri 'self'"}]})),
  ]},
};

export default nextConfig;
