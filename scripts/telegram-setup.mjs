// Run with: node --env-file=.env.local scripts/telegram-setup.mjs
// Secrets are read from the environment and never printed.
const {TELEGRAM_BOT_TOKEN:token,TELEGRAM_WEBHOOK_SECRET:secret,APP_URL:app}=process.env;
if(!token||!secret||!app||!/^https:\/\//.test(app)||!/^[-_a-zA-Z0-9]{32,256}$/.test(secret))throw Error('Set the bot token, a 32–256 character webhook secret and HTTPS APP_URL first.');
async function call(method,body){try{const r=await fetch(`https://api.telegram.org/bot${token}/${method}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});const data=await r.json();if(!r.ok||!data.ok)throw Error();return data.result;}catch{throw Error('Telegram setup failed. Check bot configuration and network access. No secrets have been logged.');}}
await call('setWebhook',{url:new URL('/api/telegram/webhook',app).href,secret_token:secret,allowed_updates:['message','callback_query','chat_member'],drop_pending_updates:false});
await call('setMyCommands',{commands:[{command:'start',description:'Welcome and secure course access'},{command:'login',description:'Get a one-time sign-in link'},{command:'courses',description:'Browse the course catalogue'},{command:'status',description:'Check premium membership'},{command:'help',description:'Get help using the course portal'}]});
const result=await call('getWebhookInfo',{});
console.log(`Webhook configured for ${new URL(result.url).origin}. Pending updates: ${result.pending_update_count}.`);
