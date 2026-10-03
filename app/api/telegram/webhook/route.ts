import {NextResponse} from 'next/server';
import {equalSecret} from '@/lib/education/core';
import {db, rpc, baseUrl} from '@/lib/education/db';
import {issueLink, rateLimit, RateLimitError} from '@/lib/education/auth';
import {telegram, membership, invalidateMembership} from '@/lib/education/telegram';
export const runtime = 'nodejs';
export const maxDuration = 60;
type Person = {id:number;is_bot?:boolean;first_name?:string;username?:string};
type Update = {update_id:number; message?:{text?:string;chat:{id:number;type:string};from?:Person};callback_query?:{id:string;data?:string;from:Person;message?:{chat:{id:number;type:string}}};chat_member?:{chat:{id:number};new_chat_member:{user:Person}}};
export async function POST(request:Request) {
  const secret=process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || !equalSecret(request.headers.get('x-telegram-bot-api-secret-token') || '',secret)) return new Response('Unauthorized',{status:401});
  let update:Update;
  try { const raw=await request.text(); if(raw.length>65536) return new Response('Too large',{status:413}); update=JSON.parse(raw); if(!Number.isSafeInteger(update.update_id)) throw Error(); } catch {return new Response('Invalid update',{status:400});}
  let claimed=false;
  try {
    const state=await rpc<string>('edu_claim_update',{p_id:update.update_id});
    if(state==='done') return NextResponse.json({ok:true});
    if(state!=='claimed') return new Response('Retry later',{status:503});
    claimed=true;
    if(update.chat_member) {
      const configured=(process.env.TELEGRAM_PREMIUM_CHAT_IDS||'').split(',').map(s=>s.trim());
      if(configured.includes(String(update.chat_member.chat.id))) await invalidateMembership(update.chat_member.new_chat_member.user.id);
    } else {
      const chat=update.callback_query?.message?.chat || update.message?.chat;
      const person=update.callback_query?.from || update.message?.from;
      if(chat?.type==='private' && person && Number.isSafeInteger(person.id) && person.id>0 && !person.is_bot) {
        await db('edu_users?on_conflict=telegram_id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({telegram_id:person.id,first_name:(person.first_name||'Member').slice(0,128),username:person.username||null,updated_at:new Date().toISOString()})});
        const command=update.callback_query?.data==='check_again'?'/status':(update.message?.text||'').split(/[ @]/)[0].toLowerCase();
        let text='Welcome to Cobalt Syndicate. Use /login for a secure, single-use sign-in link, /courses for the curriculum, or /status to check premium membership. Never forward your sign-in link.';
        let markup:object|undefined;
        if(command==='/login' || command==='/start') {
          const link=await issueLink(person.id);
          text=link?'Your private Cobalt Syndicate sign-in link expires in 5 minutes and works once. Do not share it.':'Premium membership not detected. Join Cobalt VIP, then check again. Public lessons remain available without signing in.';
          markup={inline_keyboard:link?[[{text:'Sign in to Cobalt Syndicate',url:link}]]:[[{text:'Join Cobalt VIP',url:process.env.TELEGRAM_JOIN_URL||'https://t.me/zabermazz'}],[{text:'Check again',callback_data:'check_again'}]]};
        } else if(command==='/status') {
          await rateLimit('status',String(person.id),5,300);
          const active=await membership(person.id,true);
          text=active?'Premium membership verified. Use /login to open your learning dashboard.':'Premium membership is not currently verified. Free lessons remain available. After joining the premium community, check again. Contact @zabermazz for membership help.';
          markup={inline_keyboard:[[{text:'Check again',callback_data:'check_again'}]]};
        } else if(command==='/courses') {text=`Explore the Cobalt Syndicate curriculum: ${baseUrl()}/courses`;}
        if(update.callback_query) await telegram('answerCallbackQuery',{callback_query_id:update.callback_query.id});
        await telegram('sendMessage',{chat_id:chat.id,text,reply_markup:markup,link_preview_options:{is_disabled:true}});
      }
    }
    await db(`edu_webhook_updates?id=eq.${update.update_id}`,{method:'PATCH',body:JSON.stringify({completed:true})});
    return NextResponse.json({ok:true});
  } catch (error) {
    if(claimed && error instanceof RateLimitError) {
      // Acknowledge throttled commands so Telegram retries cannot perpetuate a flood.
      try {await db(`edu_webhook_updates?id=eq.${update.update_id}`,{method:'PATCH',body:JSON.stringify({completed:true})});}catch{return new Response('Retry later',{status:503});}
      return NextResponse.json({ok:true});
    }
    if(claimed) {try{await db(`edu_webhook_updates?id=eq.${update.update_id}`,{method:'PATCH',body:JSON.stringify({lease_until:new Date(0).toISOString()})});}catch{}}
    return new Response('Temporarily unavailable',{status:503});
  }
}
