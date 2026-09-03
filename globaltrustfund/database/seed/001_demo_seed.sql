-- ============================================================
-- Global TrustFund — Demo seed data
-- For local/demo Supabase only. Do NOT use in production.
-- Requires: auth.users entries created first (or use service role).
-- ============================================================

-- Note: In Supabase, create auth users via Dashboard or Auth API first,
-- then set their ids below. For pure SQL demos without auth.users,
-- this seed is illustrative.

-- Account types already seeded in schema.

-- Example profile/customer structure (replace UUIDs with real auth.users ids):
/*
INSERT INTO profiles (id, email, full_name, role, status, kyc_status)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'demo@globaltrustfund.example', 'Demo Customer', 'customer', 'active', 'pending'),
  ('00000000-0000-0000-0000-000000000099', 'admin@globaltrustfund.example', 'Demo Admin', 'admin', 'active', 'approved')
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role;

INSERT INTO customers (id, profile_id, customer_number)
VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'C-1001')
ON CONFLICT DO NOTHING;

INSERT INTO accounts (id, customer_id, account_type_id, account_number, currency, balance, available_balance, status)
SELECT
  '20000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  (SELECT id FROM account_types WHERE code = 'checking' LIMIT 1),
  'GTF0004521',
  'USD',
  12450.00,
  12450.00,
  'active'
WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE account_number = 'GTF0004521');

INSERT INTO accounts (id, customer_id, account_type_id, account_number, currency, balance, available_balance, status)
SELECT
  '20000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000001',
  (SELECT id FROM account_types WHERE code = 'savings' LIMIT 1),
  'GTF0008830',
  'USD',
  10200.00,
  10200.00,
  'active'
WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE account_number = 'GTF0008830');
*/

-- Permissions catalog
INSERT INTO permissions (code, description) VALUES
  ('view_customers', 'View customer list and profiles'),
  ('manage_customers', 'Update customer records and status'),
  ('view_accounts', 'View accounts'),
  ('manage_accounts', 'Create/update/freeze accounts'),
  ('view_transactions', 'View transactions'),
  ('manage_transactions', 'Post or reverse transactions'),
  ('review_compliance', 'Review KYC and compliance cases'),
  ('view_audit_logs', 'Read audit logs'),
  ('manage_users', 'Manage staff users and roles'),
  ('view_reports', 'View analytics and reports'),
  ('manage_settings', 'Change platform settings')
ON CONFLICT (code) DO NOTHING;

-- Map admin role to all permissions (by role name)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name IN ('admin', 'super_admin')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN (
  'view_customers', 'view_accounts', 'view_transactions',
  'review_compliance', 'view_reports'
)
WHERE r.name = 'manager'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN (
  'view_customers', 'view_accounts', 'view_transactions'
)
WHERE r.name = 'cashier'
ON CONFLICT DO NOTHING;
