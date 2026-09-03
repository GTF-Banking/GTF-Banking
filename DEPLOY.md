# Deploy Global TrustFund

## 1. GitHub

```bash
cd GlobalTrustFund
git init
git add .
git commit -m "Initial Global TrustFund platform"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

Never commit `.env`. Only `.env.example`.

## 2. Supabase

1. Create project at https://supabase.com
2. SQL Editor — run in order:
   - `database/schema/001_core.sql`
   - `database/policies/001_rls.sql`
   - `database/seed/001_demo_seed.sql`
3. Settings → API — copy URL, anon key, service_role key

## 3. Live server (Node host)

Works on any Node host: Railway, Render, Fly.io, VPS, etc.

### Environment variables on the host

```
NODE_ENV=production
PORT=3000
APP_URL=https://your-domain.com
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DEMO_MODE=false
ALLOW_LOCAL_AUTH=false
SESSION_SECRET=long-random-string
```

### Start command

```
npm install
node backend/main.js
```

Or with process manager:

```
npm install
npm start
```

### Render example

1. New → Web Service → connect GitHub repo
2. Build: `npm install`
3. Start: `node backend/main.js`
4. Add env vars above
5. Deploy

### Railway example

1. New project → Deploy from GitHub
2. Add the same env vars
3. Start command: `node backend/main.js`

## 4. After go-live

1. Open `https://your-domain.com/signup.html` and create your user
2. In Supabase → Table Editor → `profiles` → set your row `role` to `admin`
3. Sign in at `/admin/login.html`
4. Confirm HTTPS is on

## 5. Optional: custom domain

Point DNS to your host and set `APP_URL` to that domain.
