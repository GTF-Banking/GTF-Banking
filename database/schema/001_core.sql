-- ============================================================
-- Global TrustFund — Core Schema (PostgreSQL / Supabase)
-- Run in order. Adjust as needed for your Supabase project.
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------
-- Roles & Permissions (application-level)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL UNIQUE,          -- customer, cashier, manager, admin, super_admin
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permissions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code        TEXT NOT NULL UNIQUE,          -- view_customers, manage_accounts, etc.
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- ----------------------------------------------------------
-- Users / Profiles (extends Supabase auth.users)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  full_name     TEXT,
  phone         TEXT,
  role          TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','cashier','manager','admin','super_admin')),
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','closed')),
  kyc_status    TEXT NOT NULL DEFAULT 'pending' CHECK (kyc_status IN ('pending','under_review','approved','rejected','requires_info')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- ----------------------------------------------------------
-- Customers (banking-specific profile)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id      UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  customer_number TEXT UNIQUE,                 -- human-readable reference
  date_of_birth   DATE,
  nationality     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_addresses (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id  UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  type         TEXT NOT NULL DEFAULT 'residential',
  line1        TEXT NOT NULL,
  line2        TEXT,
  city         TEXT NOT NULL,
  state        TEXT,
  postal_code  TEXT,
  country      TEXT NOT NULL DEFAULT 'US',
  is_primary   BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------
-- Accounts
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS account_types (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code        TEXT NOT NULL UNIQUE,          -- checking, savings, business, etc.
  name        TEXT NOT NULL,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS accounts (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id      UUID NOT NULL REFERENCES customers(id),
  account_type_id  UUID NOT NULL REFERENCES account_types(id),
  account_number   TEXT NOT NULL UNIQUE,     -- internal / masked display
  currency         CHAR(3) NOT NULL DEFAULT 'USD',
  balance          NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  available_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','frozen','closed','pending')),
  opened_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at        TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_accounts_customer ON accounts(customer_id);
CREATE INDEX idx_accounts_status ON accounts(status);

-- ----------------------------------------------------------
-- Transactions
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS transactions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id      UUID NOT NULL REFERENCES accounts(id),
  type            TEXT NOT NULL CHECK (type IN ('deposit','withdrawal','transfer_in','transfer_out','payment','fee','interest','reversal')),
  amount          NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  currency        CHAR(3) NOT NULL DEFAULT 'USD',
  balance_after   NUMERIC(18,2),
  description     TEXT,
  reference       TEXT,
  status          TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending','completed','failed','reversed')),
  related_tx_id   UUID REFERENCES transactions(id),
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at    TIMESTAMPTZ
);

CREATE INDEX idx_transactions_account ON transactions(account_id);
CREATE INDEX idx_transactions_created ON transactions(created_at DESC);
CREATE INDEX idx_transactions_status ON transactions(status);

-- ----------------------------------------------------------
-- Beneficiaries (for transfers)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS beneficiaries (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id     UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  account_number  TEXT,
  bank_name       TEXT,
  currency        CHAR(3) DEFAULT 'USD',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------
-- Support Tickets
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS support_tickets (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id  UUID NOT NULL REFERENCES customers(id),
  subject      TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','waiting_customer','resolved','closed')),
  priority     TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at    TIMESTAMPTZ
);

-- ----------------------------------------------------------
-- Audit Logs (append-oriented)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id     UUID,                         -- profile id
  actor_role   TEXT,
  action       TEXT NOT NULL,
  resource     TEXT,
  resource_id  TEXT,
  result       TEXT NOT NULL DEFAULT 'success',
  ip_address   INET,
  user_agent   TEXT,
  metadata     JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_actor ON audit_logs(actor_id);

-- ----------------------------------------------------------
-- Notifications
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type         TEXT NOT NULL,               -- security, transaction, account, verification, support, system
  title        TEXT NOT NULL,
  body         TEXT,
  is_read      BOOLEAN NOT NULL DEFAULT false,
  priority     TEXT DEFAULT 'normal',
  link         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);

-- ----------------------------------------------------------
-- Seed minimal roles
-- ----------------------------------------------------------
INSERT INTO roles (name, description) VALUES
  ('customer', 'Standard banking customer'),
  ('cashier', 'Branch / teller operations'),
  ('manager', 'Supervisory and approval workflows'),
  ('admin', 'Administrative access'),
  ('super_admin', 'System-level configuration')
ON CONFLICT (name) DO NOTHING;

INSERT INTO account_types (code, name) VALUES
  ('checking', 'Checking Account'),
  ('savings', 'Savings Account'),
  ('business', 'Business Account')
ON CONFLICT (code) DO NOTHING;
