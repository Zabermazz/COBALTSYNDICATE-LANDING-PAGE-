import Link from '@/components/page-link';
import {giveawayPrograms} from '@/lib/giveaway-programs';

export function GiveawayPrograms(){return <section className="stack" aria-labelledby="giveaway-programs-title">
  <div><span className="eyebrow">THE PRIZE LINEUP</span><h2 id="giveaway-programs-title">A monthly tradition. More on the way.</h2><p>Partner allocations announced by Cobalt Syndicate. Enter individual rounds below when applications open.</p></div>
  <div className="subtle-grid">{giveawayPrograms.map(p=><article className="panel stack" key={p.id}>
    <img src={p.logo} alt={p.name} width={140} height={64} style={{objectFit:'contain',objectPosition:'left center',maxWidth:'100%'}}/>
    <span className="eyebrow">{p.cadence}</span><h3>{p.prize}</h3><p>{p.description}</p><p className="help">{p.note}</p>
    <Link className="text-link" href={`/firms/${p.id}`}>Explore {p.name} ↗</Link>
  </article>)}</div>
  <p className="help">These are announced allocations, not a live count of remaining prizes. Account size describes the trading program, not a cash prize. Eligibility and provider rules will be shown for each round.</p>
  <h2>Giveaway rounds</h2>
</section>}
