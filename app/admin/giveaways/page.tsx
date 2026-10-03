import {GiveawayBuilder} from '@/components/giveaway-builder';
export const metadata={title:'Manual giveaway builder',robots:{index:false,follow:false}};
export default function Page(){return <main id="main" className="page"><div className="page-head"><span className="eyebrow">COBALT TEAM</span><h1>Build your next giveaway.</h1><p>Any firm. Your dates. Your tasks.</p></div><GiveawayBuilder/></main>;}
