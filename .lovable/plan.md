# Second-Look — accounts, $10 lifetime access, three sections

Rebrand FamilyShield into **Second-Look**: a public landing page anyone can read, and the real
scam checker behind sign-in plus a one-time $10 payment.

## 1. Sign in
- Email + password, plus a Google button.
- New `/auth` page: sign in / create account, clear large fields, friendly error messages.
- Header shows the person's email and a Sign out button once they're in.

## 2. The $10 lifetime paywall
- Each account gets a profile record holding `has_paid`.
- Signed-in but unpaid → a "Get Lifetime Access — $10" page explaining what they get.
- Paid → full access to checking messages forever.
- After a successful payment the account is marked paid automatically and lands on the checker.

**One blocker:** built-in Stripe checkout needs a paid Lovable plan; this workspace is on Free.
I'll build everything around it now — the payment page, the paid/unpaid gate, the success flow —
and wire the actual card checkout as soon as you either upgrade or tell me you'd rather connect
your own Stripe account with your own key. Until then the button will explain that payment isn't
live yet, and I can flip an account to paid manually for testing.

## 3. Pages
Header tabs: **Check a Message**, **Verified Directory**, **Caregiver Alerts**, plus account status.

- **Landing (public)** — trust-building intro, how it works, a worked sample scam breakdown
  (real-looking bank text with risk badge, warning signs, what not to do), and the $10 button.
- **Check a Message** — today's paste-or-photo form and AI risk report, now for paid users only,
  each check saved to that person's own history.
- **Verified Directory** — searchable list of official phone numbers and websites (IRS, Social
  Security, Medicare, major banks, USPS) so people can verify a caller themselves. Starter list
  now; you send me your own entries later and I'll swap them in.
- **Caregiver Alerts** — save a caregiver's email and an on/off switch. Settings are stored; no
  email is actually sent yet (per your choice), and the page says so plainly.

## 4. Stored data
Message checks start fresh with ownership attached: owner, pasted text, photo, category, risk
score, link/domain findings, and the full report. Caregiver settings are stored per account.
Everyone can only ever see and change their own rows.

## Technical notes
- Migration: drop and recreate `public.submissions` (user_id, raw_text, image_url, category,
  risk_score, domain_data jsonb, ai_analysis jsonb, created_at); new `caregiver_settings`
  (user_id unique, caregiver_email, alert_enabled) and `profiles` (id, email, has_paid,
  paid_at). GRANTs + RLS scoped to `auth.uid()`; trigger creates a profile on signup.
- Routes: public `/` (landing), `/auth`, `/directory`; gated `_authenticated/check`,
  `_authenticated/caregivers`, `_authenticated/upgrade`. Managed `_authenticated/route.tsx`
  gate; paid check runs inside each gated page against `profiles.has_paid`.
- Call `supabase--configure_social_auth` for Google in the same change as the Google button.
- Keep `analyzeWithAI` server function and Gemini key handling exactly as-is; add `.middleware([requireSupabaseAuth])`
  and a server-side `has_paid` check before analysis.
- Keep the current navy / amber / crimson token system and type scale; extend it, don't replace.
