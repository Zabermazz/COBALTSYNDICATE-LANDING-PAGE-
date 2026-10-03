import {LearningShell,Hero,s} from '@/components/education/ui';
import {ClaimLink} from '@/components/education/actions';
export const metadata={title:'Confirm secure sign-in'};
export default function Claim(){return <LearningShell><div className={s.narrow}><Hero tag="Secure sign-in" title="One quick check. Then you’re in."><p>Continue to verify your current Telegram membership and open your learning dashboard. Only continue if you requested this link from the Cobalt bot.</p></Hero><ClaimLink/><p className={s.muted}>Links expire after five minutes and can be used once. If you refreshed this page or the link expired, request a new <strong>/login</strong> link in Telegram.</p><a className={s.secondary} href="/login">Get a new sign-in link</a></div></LearningShell>;}
