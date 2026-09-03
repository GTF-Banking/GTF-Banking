-- ============================================================
-- Global TrustFund — Row Level Security (RLS) Policies
-- Run after 001_core.sql in Supabase SQL editor.
-- ============================================================

-- Enable RLS on sensitive tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE beneficiaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper: current user's profile id = auth.uid()
-- Helper: check if current user has admin-like role
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin', 'manager', 'cashier')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.current_customer_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM customers WHERE profile_id = auth.uid() LIMIT 1;
$$;

-- ----------------------------------------------------------
-- profiles
-- ----------------------------------------------------------
DROP POLICY IF EXISTS profiles_select_own ON profiles;
CREATE POLICY profiles_select_own ON profiles
  FOR SELECT USING (id = auth.uid() OR public.is_staff());

DROP POLICY IF EXISTS profiles_update_own ON profiles;
CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE USING (id = auth.uid() OR public.is_admin());

-- ----------------------------------------------------------
-- customers
-- ----------------------------------------------------------
DROP POLICY IF EXISTS customers_select ON customers;
CREATE POLICY customers_select ON customers
  FOR SELECT USING (
    profile_id = auth.uid() OR public.is_staff()
  );

DROP POLICY IF EXISTS customers_update_staff ON customers;
CREATE POLICY customers_update_staff ON customers
  FOR UPDATE USING (public.is_staff());

-- ----------------------------------------------------------
-- customer_addresses
-- ----------------------------------------------------------
DROP POLICY IF EXISTS addresses_select ON customer_addresses;
CREATE POLICY addresses_select ON customer_addresses
  FOR SELECT USING (
    customer_id = public.current_customer_id() OR public.is_staff()
  );

DROP POLICY IF EXISTS addresses_manage_own ON customer_addresses;
CREATE POLICY addresses_manage_own ON customer_addresses
  FOR ALL USING (
    customer_id = public.current_customer_id() OR public.is_admin()
  );

-- ----------------------------------------------------------
-- accounts
-- ----------------------------------------------------------
DROP POLICY IF EXISTS accounts_select ON accounts;
CREATE POLICY accounts_select ON accounts
  FOR SELECT USING (
    customer_id = public.current_customer_id() OR public.is_staff()
  );

DROP POLICY IF EXISTS accounts_update_staff ON accounts;
CREATE POLICY accounts_update_staff ON accounts
  FOR UPDATE USING (public.is_admin() OR public.is_staff());

-- Customers must not insert/delete accounts directly
DROP POLICY IF EXISTS accounts_insert_staff ON accounts;
CREATE POLICY accounts_insert_staff ON accounts
  FOR INSERT WITH CHECK (public.is_staff());

-- ----------------------------------------------------------
-- transactions (customers read own; staff read all)
-- ----------------------------------------------------------
DROP POLICY IF EXISTS transactions_select ON transactions;
CREATE POLICY transactions_select ON transactions
  FOR SELECT USING (
    account_id IN (
      SELECT id FROM accounts WHERE customer_id = public.current_customer_id()
    )
    OR public.is_staff()
  );

-- Inserts should go through controlled API / service role, not direct client
DROP POLICY IF EXISTS transactions_insert_staff ON transactions;
CREATE POLICY transactions_insert_staff ON transactions
  FOR INSERT WITH CHECK (public.is_staff());

-- ----------------------------------------------------------
-- beneficiaries
-- ----------------------------------------------------------
DROP POLICY IF EXISTS beneficiaries_own ON beneficiaries;
CREATE POLICY beneficiaries_own ON beneficiaries
  FOR ALL USING (
    customer_id = public.current_customer_id() OR public.is_staff()
  );

-- ----------------------------------------------------------
-- support_tickets
-- ----------------------------------------------------------
DROP POLICY IF EXISTS tickets_select ON support_tickets;
CREATE POLICY tickets_select ON support_tickets
  FOR SELECT USING (
    customer_id = public.current_customer_id() OR public.is_staff()
  );

DROP POLICY IF EXISTS tickets_insert_own ON support_tickets;
CREATE POLICY tickets_insert_own ON support_tickets
  FOR INSERT WITH CHECK (
    customer_id = public.current_customer_id()
  );

DROP POLICY IF EXISTS tickets_update_staff ON support_tickets;
CREATE POLICY tickets_update_staff ON support_tickets
  FOR UPDATE USING (public.is_staff());

-- ----------------------------------------------------------
-- notifications
-- ----------------------------------------------------------
DROP POLICY IF EXISTS notifications_own ON notifications;
CREATE POLICY notifications_own ON notifications
  FOR ALL USING (
    user_id = auth.uid() OR public.is_admin()
  );

-- ----------------------------------------------------------
-- audit_logs: staff can read; only service role should insert
-- ----------------------------------------------------------
DROP POLICY IF EXISTS audit_select_staff ON audit_logs;
CREATE POLICY audit_select_staff ON audit_logs
  FOR SELECT USING (public.is_staff());

-- No UPDATE/DELETE policies → effectively append-only for clients

-- ----------------------------------------------------------
-- account_types, roles, permissions: readable by authenticated
-- ----------------------------------------------------------
ALTER TABLE account_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS account_types_read ON account_types;
CREATE POLICY account_types_read ON account_types
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS roles_read ON roles;
CREATE POLICY roles_read ON roles
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS permissions_read ON permissions;
CREATE POLICY permissions_read ON permissions
  FOR SELECT TO authenticated USING (true);

COMMENT ON FUNCTION public.is_staff IS 'True if current user has staff role';
COMMENT ON FUNCTION public.is_admin IS 'True if current user is admin or super_admin';
COMMENT ON FUNCTION public.current_customer_id IS 'Customer row id for auth.uid()';
