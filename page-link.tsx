import type {ComponentProps} from 'react';

// Use real document navigation across hosting providers. Vinext's production
// RSC link prefetch currently throws and cancels clicks on the hosted build.
export default function PageLink(props:ComponentProps<'a'>){return <a {...props}/>}
