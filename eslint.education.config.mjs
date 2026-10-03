import next from 'eslint-config-next/core-web-vitals';
import ts from 'eslint-config-next/typescript';
// Preserve the existing site's full-page navigation. Auth transitions deliberately
// reload server state instead of retaining a client-prefetched protected payload.
export default [...next,...ts,{ignores:['node_modules/**','.next/**','.test-tools/**']},{rules:{'@next/next/no-html-link-for-pages':'off','@next/next/no-location-assign-relative-destination':'off'}}];
