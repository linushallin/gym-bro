# Träningsdagbok

Workout log: Next.js 16 (App Router) + Prisma + Supabase (Postgres and Auth), deployed on Vercel.

## How auth works

- **Supabase Auth** does accounts, password hashing, email confirmation, reset emails and rate limiting. All calls happen server-side (Server Actions, `app/auth/confirm`, `proxy.ts`). The session lives in `httpOnly` cookies.
- **`proxy.ts`** refreshes the session on each request and redirects logged-out visitors to `/logga-in`. It's a convenience, not the security boundary.
- **`requireUser()`** in `lib/auth.ts` is the security boundary. Every page and Server Action calls it. Every query in `lib/queries.ts` and every write in `lib/actions.ts` filters on that user's id, so other users' rows can't be read or changed even with a guessed id.
- **Caching** is per user: cache keys include the user id, and each user has their own invalidation tag (`userDataTag`).
- **Postgres RLS** is enabled on every table with no policies, which blocks Supabase's public REST API from reading them. Prisma connects as the table owner and is unaffected.

## Setup

1. `cp .env.example .env` and fill in the values. Add the same variables in Vercel → Project Settings → Environment Variables.
2. Apply migrations: `npm run db:migrate`.
3. Configure Supabase (Dashboard → Authentication):
   - **URL Configuration**: set *Site URL* to the production URL. Add `https://<your-domain>/auth/confirm**` and `http://localhost:3000/auth/confirm**` to *Redirect URLs*.
   - **Emails → SMTP Settings**: set up custom SMTP (e.g. Resend, Postmark). The built-in sender only delivers to your own team's addresses, at a few emails per hour, so real users won't get confirmation mails without this.
   - **Emails → Templates**: point the links at the app, so they also work when opened on another device:
     - *Confirm signup*: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`
     - *Reset password*: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/nytt-losenord`
   - **Sign In / Providers → Email**: set minimum password length to 8. Turn *Confirm email* on once custom SMTP is set up.
     - Current setup: no custom SMTP, so *Confirm email* is **off**. Sign-up logs users straight in, and password-reset emails only reach the Supabase team's own addresses. `signUp()` handles both modes; enabling SMTP + confirmation needs no code change.
   - **Rate Limits**: auth calls come from Vercel's servers, not users' browsers, so per-IP limits are shared between users. Raise the sign-in limit if users report "För många försök".
4. Project Settings → JWT Keys: switch to asymmetric signing keys. The proxy and `requireUser()` can then verify sessions locally instead of calling Supabase on every request.
5. Fill in the contact details on the privacy page (`app/(auth)/integritet/page.tsx`).

## Development

```bash
npm run dev
```
