# Global TrustFund

**Banking Designed Around Your Future**

Production-shaped digital banking platform: public site, customer dashboard, admin/manager/cashier portals, Express API, and Supabase (Auth + PostgreSQL + RLS).

This software is **your product application**. Operating as a regulated bank or taking real deposits requires licenses, partners, and legal compliance in your jurisdiction.

---

## Quick start

```bash
cd GlobalTrustFund
npm install
cp .env.example .env
# Edit .env with your Supabase credentials
npm run dev
```

Open http://www.globaltrustfund.online

---

## Supabase setup (recommended)

1. Create a project at [supabase.com](https://supabase.com)
2. **SQL Editor** — run in order:
   - `database/schema/001_core.sql`
   - `database/policies/001_rls.sql`
   - `database/seed/001_demo_seed.sql` (permissions only is fine)
3. **Project Settings → API** — copy:
   - Project URL → `SUPABASE_URL`
   - `anon` `public` key → `SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (server only)
4. Put values in `.env` and set:
   ```env
   DEMO_MODE=false
   ALLOW_LOCAL_AUTH=false
   ```
5. Restart `npm run dev`
6. Register a user via `/signup.html` or create users in Supabase Auth
7. Promote an admin by updating `profiles.role` to `admin` in the Table Editor

### Auth flow

- Register / login use **Supabase Auth**
- A `profiles` row (and `customers` for role `customer`) is ensured after sign-up/sign-in
- API requests send `Authorization: Bearer <access_token>`
- Middleware validates the JWT with Supabase and loads role from `profiles`

### Local fallback (optional)

Only if Supabase is **not** configured and you set `ALLOW_LOCAL_AUTH=true` or `DEMO_MODE=true`:

| Email | Password | Role |
|-------|----------|------|
| demo@globaltrustfund.example | Demo1234! | customer |
| admin@globaltrustfund.example | Admin1234! | admin |

Do not use local fallback in production.

---

## Structure

```
frontend/     Public site, dashboards, portals
backend/      Express API + Supabase clients
database/     Schema, RLS, seed, migration notes
```

## Design

Deep green `#0B3D2E` · Rich green `#145A43` · Gold `#C9A227` · Soft white surfaces

---

## Security

- Service role key: **server only**
- RLS enabled on customer data tables
- Role checks on staff routes
- Never commit `.env`

## Production checklist

- [ ] Real Supabase project + schema + RLS applied
- [ ] `DEMO_MODE=false` and `ALLOW_LOCAL_AUTH=false`
- [ ] HTTPS and production `APP_URL`
- [ ] Admin users promoted via `profiles.role`
- [ ] Legal/compliance review before any real financial activity

---

© Global TrustFund
