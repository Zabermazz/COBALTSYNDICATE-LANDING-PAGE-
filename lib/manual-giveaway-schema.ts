import {z} from 'zod';
const https=z.string().url().max(2000).refine(v=>{try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password}catch{return false}},'Use an HTTPS link without login credentials');
export const manualGiveawaySchema=z.object({
  id:z.string().regex(/^[a-z0-9-]{3,80}$/),firm:z.string().trim().min(2).max(100),
  title:z.string().trim().min(3).max(150),accountSize:z.string().trim().min(2).max(100),accountType:z.string().trim().min(2).max(150),
  winners:z.number().int().min(1).max(1000),status:z.enum(['draft','open','paused','closed']),
  startsAt:z.string().datetime({offset:true}),endsAt:z.string().datetime({offset:true}),
  entryUrl:z.union([https,z.literal('')]),rules:z.string().trim().min(30).max(5000),
  tasks:z.array(z.object({label:z.string().trim().min(3).max(250),url:z.union([https,z.literal('')])})).max(20)
}).refine(g=>Date.parse(g.endsAt)>Date.parse(g.startsAt),'Closing date must be after opening date')
  .refine(g=>g.status!=='open'||!!g.entryUrl,'Add your entry form link before opening');
export const manualGiveawaysSchema=z.array(manualGiveawaySchema).max(100).refine(gs=>new Set(gs.map(g=>g.id)).size===gs.length,'Each giveaway needs a different id');
export type ManualGiveaway=z.infer<typeof manualGiveawaySchema>;
export function manualState(g:ManualGiveaway,now=Date.now()) {if(g.status==='draft')return 'Draft';if(g.status==='closed'||now>=Date.parse(g.endsAt))return 'Closed';if(g.status==='paused')return 'Paused';return now<Date.parse(g.startsAt)?'Upcoming':'Open';}
export function giveawayTemplate():ManualGiveaway{return {id:'your-firm-october-2026',firm:'Your firm',title:'Your firm account giveaway',accountSize:'$10K',accountType:'Instant account — confirm exact program',winners:3,status:'draft',startsAt:'2026-10-25T18:00:00+05:30',endsAt:'2026-10-31T21:00:00+05:30',entryUrl:'',rules:'Replace with eligibility, eligible countries, age limit, free entry conditions, winner selection method, announcement date and prize delivery conditions. Account size is not a cash prize.',tasks:[{label:'Visit our Telegram community',url:'https://t.me/zabermazz'},{label:'Submit your name, email and task proof in the entry form',url:''}]};}
