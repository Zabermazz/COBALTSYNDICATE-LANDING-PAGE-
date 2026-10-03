# Cobalt Syndicate: Telegram course access

## What is ready

This is an additive Next.js App Router feature for the existing Vercel website. The homepage, firm data, giveaway system, agency, Google Forms and contact links are preserved. The new Courses navigation entry leads to the learning catalogue. Course pages inherit the existing typography and cobalt palette through a scoped stylesheet.

Routes:

| Page | Purpose |
| --- | --- |
| `/courses` | Public catalogue |
| `/course/[slug]` | Public course description and curriculum |
| `/learn`, `/learn/dashboard` | Sign-in prompt or personal progress |
| `/learn/course/[courseSlug]` | Redirect to the course overview |
| `/learn/course/[courseSlug]/lesson/[lessonSlug]` | Server-authorized lesson |
| `/login`, `/login/claim` | Telegram instructions and single-use link confirmation |
| `/account`, `/account/membership` | Account, membership recheck and logout |
| `/admin/courses` | Existing admin-key protected course editor |
| `/education/privacy` | Learning-specific privacy notice |

Two original introductory reading lessons work before services are configured. Intermediate and advanced courses are honestly labelled as being prepared; no videos, premium lessons or completion records are invented. The SQL seed installs those same starter courses into the database. Course access is determined from current database records, with no premium content bundled into the client.

## 1. Create the database

Use the existing Supabase project if you already use it for giveaways. In its SQL Editor run, in order:

1. `supabase-education.sql` — additive tables, restricted database functions and private `course-assets` bucket.
2. `supabase-education-seed.sql` — initial course metadata and two public lessons. This only seeds when the catalogue is empty; it will not replace your edited courses.

Do not delete or replace the giveaway schema. The education migration can be rerun. If `course-assets` already existed, verify it is **private** in Storage; the migration does not overwrite an existing bucket’s settings. Never add browser read policies that expose premium content. Check existing broad storage policies before uploading material.

Tables: `edu_users`, `edu_memberships`, `edu_login_tokens`, `edu_sessions`, `edu_courses`, `edu_sections`, `edu_lessons`, `edu_lesson_content`, `edu_progress`, `edu_rate_limits`, `edu_webhook_updates`. All use RLS and deny `anon`/`authenticated` access. Only the server service-role key can access them. Auth is custom Telegram identity + opaque server sessions, not Supabase email/password auth. There is no Excel password storage.

## 2. Create the Telegram bot

1. Open the verified **@BotFather** in Telegram, send `/newbot`, choose its name and username, and securely save its bot token.
2. Add the bot to the private premium group/supergroup as an administrator. Telegram only guarantees `getChatMember` checks for other users when the bot is an administrator. Grant only the admin permissions it needs; this feature does not post group messages or manage billing.
3. Obtain the group’s numeric chat ID, normally beginning with `-100` for a supergroup. A private invite link or group title is **not** a chat ID. A forwarded message to an untrusted ID bot may disclose private content, so use your own bot: temporarily use `getUpdates` before setting a webhook, send a group command such as `/status@YourBotUsername`, then inspect the returned `message.chat.id` locally. Telegram disallows `getUpdates` while a webhook is registered. Do not paste bot-token URLs into screenshots, browser history or chat.
4. Keep the bot in the group. If the group migrates, update the numeric chat ID and redeploy.

Multiple premium groups can be configured. Membership in **any** listed chat grants premium access. Do not put a free signal group in this list unless you intend all its members to receive premium access.

## 3. Add Vercel environment variables

Project → Settings → Environment Variables → Production. Set these and redeploy:

| Variable | Value |
| --- | --- |
| `APP_URL` | Exact canonical production origin, e.g. `https://your-site.vercel.app` |
| `NEXT_PUBLIC_SITE_URL` | Same public origin, for existing SEO |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server service-role key; never a public variable |
| `TELEGRAM_BOT_TOKEN` | BotFather token |
| `TELEGRAM_BOT_USERNAME` | Username without `@` |
| `TELEGRAM_PREMIUM_CHAT_IDS` | Numeric private chat ID(s), comma separated |
| `TELEGRAM_WEBHOOK_SECRET` | Independent random 32–256 character secret using letters, numbers, `_`, `-` |
| `AUTH_SECRET` | Independent random secret of at least 32 characters for abuse-limit hashing |
| `GIVEAWAY_ADMIN_TOKEN` | Existing admin key, or a new random key of at least 32 characters |
| `MEMBERSHIP_CACHE_MINUTES` | `30` by default; allowed effective range 1–30 |
| `TELEGRAM_JOIN_URL` | Your intended premium joining/support link; defaults to Zaber contact |
| `TELEGRAM_SUPPORT_URL` | Defaults to `https://t.me/zabermazz` |

Generate independent secrets locally with `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"`. Put them directly into Vercel or an ignored `.env.local`, never source control or chat. No `DATABASE_URL` is necessary: this implementation uses the existing Supabase REST connection. Magic links last five minutes, sessions seven days, storage links two minutes.

Use one canonical website origin. Redirect other domains to it: POST requests from a different origin are deliberately rejected. Give preview deployments a separate test bot/database or leave authentication disabled. Never point the production bot webhook at a preview deployment.

## 4. Register the webhook

After deploying and setting environment variables, create a local ignored `.env.local` containing the same bot token, webhook secret and APP_URL. Run:

```sh
node --env-file=.env.local scripts/telegram-setup.mjs
```

This sets `/api/telegram/webhook`, registers `/start`, `/login`, `/courses`, `/status`, `/help`, and enables `message`, `callback_query`, `chat_member` updates. It does not discard pending updates. It reads secrets from the environment and does not print them. Never put the token into a command argument or URL you share. Protect the local environment file and remove it when no longer needed.

Telegram documents: [membership checks](https://core.telegram.org/bots/api#getchatmember), [webhook registration](https://core.telegram.org/bots/api#setwebhook), [membership updates](https://core.telegram.org/bots/api#chatmemberupdated).

## 5. Sign-in and authorization behaviour

1. A private bot message supplies the trusted numeric Telegram ID. A username is display information only.
2. The server checks the configured chat(s). `creator`, `administrator`, `member`, and `restricted` with `is_member=true` qualify. Left, kicked, missing configuration and API failures do not grant access.
3. An active member receives a random 256-bit link. Only its SHA-256 hash is stored. Nonmembers receive join/check-again buttons and can still read public lessons.
4. The token is in the URL fragment, so browsers do not send it in HTTP requests or referrers. The claim page removes it from the address bar and submits it only after the visitor presses Continue. Link previews do not consume it. Refreshing the claim page loses the token intentionally: request another link.
5. Redemption performs a new membership check and an atomic database transaction that consumes the token and creates a hashed session. Reuse, expiry and concurrent second claims fail. A recent active membership row is required in the same transaction.
6. The session cookie is HttpOnly, SameSite=Lax, host-only, Secure on production and expires after seven days. Logout deletes the server session and cookie.
7. Premium page, progress and asset requests share one authorization function. Successful membership checks are cached for at most 30 minutes. Member events invalidate that cache, including during an in-flight check. Stale cache plus Telegram failure locks premium content until verification succeeds. A currently valid cache can be used until its configured expiry.

Public lessons need no session. `free_member` lessons need a valid session; `premium` lessons also need current group membership. By default new sign-in links are issued only to active premium members, as requested. Existing sessions can retain free-member access after leaving a premium group; they cannot read premium lessons. To add a genuinely free registration route later, extend the trusted Telegram flow without granting premium entitlement.

Magic links are bearer credentials: **the first person with the unused link can claim it**. They are single-use, not non-transferable identity proofs. Users are warned not to forward them. Browser binding or a second in-bot confirmation can be added later if you need stronger resistance to voluntary sharing. No guarantee against screen recording or downloaded copies is made.

## 6. Publish courses and videos

Open `/admin/courses`, enter the existing admin key, click Load courses, then select a course or New draft. Edit the structured configuration and Save course. It supports course/section/lesson order, descriptions, level, public/member/premium access, publication flags, lesson text, video duration and private resource paths. IDs must be unique; keep an existing lesson’s ID unchanged to retain progress. A null lesson access inherits the course setting; an explicit value overrides it.

Publish both the course and intended lessons. A course may be published with zero lessons as a coming-soon overview. To hide an existing lesson, set `published:false`; removing it from the editor payload does not delete it or its progress. Draft course content is not returned by public catalogue APIs. Bodies are plain text, safely rendered without raw HTML.

Upload MP4 videos and PDFs through Supabase Storage to **private** `course-assets`. Example relative paths: `foundations/lesson-1.mp4`, `foundations/checklist.pdf`. Enter paths, not public URLs, in `video_path` / `download_path`. Set `duration_seconds` for video progress. Use compressed videos and test your project’s current upload-size and egress limits before publishing large files.

The browser requests a short-lived signed URL only after authorization. A video URL can expire between range requests; the player provides Refresh video access and preserves the last playback position. Supabase Storage is suitable for a modest starter library, not a promise of free unlimited video streaming. Budget for storage and egress, or later use a signed playback provider such as Mux/Cloudflare Stream. [Supabase signed URLs](https://supabase.com/docs/reference/javascript/storage-from-createsignedurl).

Completion uses an explicit Mark as complete action or the video ending. Progress stores opened time, last playback position (named `watched_seconds`), completion and last update, not certified watch time. Seeking can change playback position. This system is not an examination or attendance verifier. Dashboard percentages use only currently published lessons. The editor intentionally uses the existing single team key rather than introducing a second admin identity system; role-based admin accounts are a future improvement.

## 7. Tests and local development

```sh
npm install
node --test tests/education.test.mjs
node node_modules/typescript/bin/tsc --noEmit
node node_modules/eslint/bin/eslint.js -c eslint.education.config.mjs lib/education components/education app/courses app/course app/learn app/login app/account app/education app/admin/courses app/api/auth app/api/learn app/api/telegram app/api/admin/courses
npm run build
node --test tests/education-http.test.mjs
```

The HTTP tests start the production build with a local fixture database transport on ports 3188/3189. They verify unauthorized content never reaches the HTML/API, session logout, CSRF, protected asset denial and regression checks on existing routes. They do not contact your live services.

Database integration tests run actual PostgreSQL semantics in an isolated local PGlite instance, not your production database:

```sh
npm install --prefix .test-tools --no-save --ignore-scripts @electric-sql/pglite@0.3.14
node --test tests/education-database.test.mjs
```

For local website testing, set `APP_URL=http://localhost:3000` and run `npm run dev`. For webhook tests, use a separate test bot/group plus a secure HTTPS tunnel to the local server; set APP_URL to that tunnel origin and browse through it. A production build requires HTTPS APP_URL by design. Do not reuse the production webhook for local testing.

Before enabling real premium content, verify with real Telegram accounts:

- Premium member gets a link and opens a lesson; nonmember receives join/check-again and cannot sign in.
- Expired/malformed/used links fail. Open the same link in two browsers: only the first confirmation succeeds.
- Claim requests from another origin fail; untrusted webhook secret fails.
- Direct premium URL, API and asset requests from a logged-out browser reveal no body, storage path or signed URL.
- Leave/kick a member, then use Check again: premium requests deny access. Retry after the cache window and after a member webhook event.
- Change a Telegram username: the numeric-ID account and progress remain the same.
- Logout, refresh, reopen the browser, complete a lesson and revisit the dashboard.
- Simulate Telegram outage after the cache expires: premium denies; public lessons still open.
- Check mobile menu, keyboard navigation, existing comparison, Google Forms, giveaway and agency pages.
- Repeat bot updates and burst login requests: no token replay or unbounded issuance.

Live Telegram membership, real Supabase storage playback and production secret configuration cannot be verified without your configured services. Automated checks are not a substitute for this final real-account test.

## 8. Maintenance and security

There is no automatic production cleanup job installed. Run this periodically in Supabase SQL Editor, or schedule it using your project’s supported scheduler:

```sql
delete from public.edu_login_tokens where expires_at < now() - interval '1 day';
delete from public.edu_sessions where expires_at < now();
delete from public.edu_rate_limits where reset_at < now() - interval '1 day';
delete from public.edu_webhook_updates where created_at < now() - interval '30 days';
```

For a verified account-deletion request, delete the corresponding `edu_users` row by numeric Telegram ID; foreign keys cascade its sessions, tokens, membership and progress. Retain course records. Keep normal database backups and follow your actual privacy/retention commitments.

Rate limits are durable database counters. Client IP is taken from the Vercel-provided `x-real-ip` / `x-vercel-forwarded-for`; when hosting elsewhere, configure a trusted reverse proxy that overwrites those headers. The fallback local bucket is shared. Do not trust arbitrary forwarded IP headers on an exposed origin. Bot updates use per-user limits, while failed claim attempts are limited by IP. Never log request bodies, cookies, Telegram fetch URLs, tokens or keys. Vercel request-size/time limits still apply.

Rotate a leaked bot token through BotFather and redeploy/register the webhook. Rotate leaked admin/webhook/auth secrets in Vercel. To revoke all browser sessions, delete rows in `edu_sessions`. Successful membership-cache duration bounds normal revocation delay; an already issued storage link can remain usable for up to two minutes and displayed/downloaded content cannot be recalled.

## Troubleshooting

- **Catalogue unavailable:** run both SQL files, confirm Supabase URL/key, check project is not paused. Existing site pages continue independently.
- **Sign-in being set up:** missing bot username/token or Supabase key. Add all variables and redeploy.
- **Member not detected:** verify numeric group ID, correct Telegram account, bot admin status and allowed updates. Private invitations are not chat IDs.
- **Bot does not answer:** confirm webhook setup, deployment protection does not block Telegram, secret matches, database migration exists and services are reachable. Telegram retries failed updates; rate-limited commands should wait before retrying.
- **Request origin rejected:** APP_URL must match the domain open in the browser. Canonicalize domains and redeploy after changing variables.
- **Video fails:** confirm private path, upload type and access rules. Refresh its short-lived URL. Check storage quotas/egress.
- **Progress not saved:** sign in, verify membership and retry; public reading without login deliberately does not save personal progress.

Optional next additions: browser-bound Telegram confirmation, numeric fallback codes with strict limits, richer visual course authoring, signed adaptive streaming, role-based admin accounts and payment-provider entitlements. None is required for the implemented Telegram premium flow. No payment processing or automatic billing is included.
