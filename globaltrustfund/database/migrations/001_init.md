# Database migration order

1. `schema/001_core.sql` — tables, indexes, base seeds (roles, account_types)
2. `policies/001_rls.sql` — RLS helpers + policies
3. `seed/001_demo_seed.sql` — permissions mapping + optional demo rows

## Supabase steps

1. Create a new Supabase project
2. Open **SQL Editor**
3. Paste and run `001_core.sql`
4. Paste and run `001_rls.sql`
5. Create Auth users in Authentication → Users (demo customer + admin)
6. Optionally run seed with matching user UUIDs
7. Copy project URL + anon key into `.env` (`SUPABASE_URL`, `SUPABASE_ANON_KEY`)
8. Keep `SUPABASE_SERVICE_ROLE_KEY` server-side only

## Notes

- RLS ensures customers only see their own data
- Staff roles use `is_staff()` / `is_admin()` helpers
- Audit logs are readable by staff; clients cannot update/delete them
- Transaction inserts are restricted to staff (real money movement should go through service role + business logic)
