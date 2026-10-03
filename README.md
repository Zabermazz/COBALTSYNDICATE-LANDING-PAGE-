# Cobalt Syndicate — Vercel edition

## Telegram learning portal

Courses, Telegram premium verification, private lesson access, progress and a team course editor are included. Read [the setup guide](docs/TELEGRAM_PREMIUM_SETUP.md), run `supabase-education.sql` followed by `supabase-education-seed.sql`, then configure the server environment variables and bot webhook. Public starter lessons work before setup; live member sign-in requires your own bot and Supabase project. The existing website features remain in place.

All public pages, firm logos, comparison, search, calculator, Google Form and WhatsApp/Telegram links are included.

1. Upload this folder to your Git repository. In Vercel, import it using the Next.js preset.
2. Keep install command npm ci, build command npm run build, output directory automatic, Node 22.x.
3. Set NEXT_PUBLIC_SITE_URL to your final https:// domain (without a trailing slash) and redeploy. Until set, search-engine indexing is disabled to avoid publishing the wrong canonical host.
4. Google Forms is already connected. /admin links to the Google-protected response editor; responses are not public. No secrets are required.

Local: npm ci, then npm run dev.

This package intentionally excludes the Sites database and ChatGPT login. Historical records stay on the original host. There is no click/purchase analytics backend in this edition; no sales or saves are fabricated. Firm links are official destinations, not configured affiliate referral URLs.

Vercel Hobby is restricted to personal non-commercial use. This affiliate/agency site needs a suitable commercial plan or an alternative hosting service. See https://vercel.com/docs/plans/hobby .

## Giveaways
The public /giveaways page and /admin manager are included. On Vercel, create a Supabase project and run supabase-giveaways.sql in its SQL editor. Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and a random GIVEAWAY_ADMIN_TOKEN (32+ characters) in Vercel server environment variables, then redeploy. None may use a NEXT_PUBLIC prefix. Enter your admin token at /admin; it stays in memory. Rotate it from hosting settings if exposed. Rows are protected with RLS; only server routes use the service role. Without these settings, giveaways show an honest unavailable state and cannot accept entries. Google enquiry forms still work.

Giveaway drafts, published dates and private entries persist in Supabase. Dates are UTC. Pause or close via Edit; the server enforces the deadline even if a visitor leaves the page open. No giveaway is invented or pre-published. Entry confirmation proves storage, not email ownership: check eligibility and confirm the winner by email before awarding a prize. The daily email limit and honeypot are basic abuse controls, not a full bot-defense service.

Firm catalogue and ratings are dated snapshots, not a live feed. Change partner flags in lib/firm-data.json only after agreement/payment confirmation, keep paid relationship disclosures, then rebuild. The wider lib/universe.json index is explicitly unverified. No rating may be fabricated or increased for payment.
