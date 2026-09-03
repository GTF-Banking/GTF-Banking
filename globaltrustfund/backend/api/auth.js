/**
 * Auth routes — Supabase Auth when configured, optional local fallback for development.
 */
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { isConfigured, getAnonClient, getServiceClient } = require('../supabase');

const allowLocalFallback =
  process.env.DEMO_MODE === 'true' || process.env.ALLOW_LOCAL_AUTH === 'true';

const localUsers = new Map();
localUsers.set('demo@globaltrustfund.example', {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'demo@globaltrustfund.example',
  password: 'Demo1234!',
  full_name: 'Demo Customer',
  role: 'customer',
  phone: null,
  kyc_status: 'pending'
});
localUsers.set('admin@globaltrustfund.example', {
  id: '00000000-0000-0000-0000-000000000099',
  email: 'admin@globaltrustfund.example',
  password: 'Admin1234!',
  full_name: 'Platform Admin',
  role: 'admin',
  phone: null,
  kyc_status: 'approved'
});

function issueLocalToken(user) {
  const payload = Buffer.from(
    JSON.stringify({
      sub: user.id,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000
    })
  ).toString('base64url');
  return `local.${payload}.${crypto.randomBytes(8).toString('hex')}`;
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name || null,
    role: user.role || 'customer',
    phone: user.phone || null,
    kyc_status: user.kyc_status || 'pending'
  };
}

async function ensureProfile(service, authUser, extras = {}) {
  if (!service) return extras;
  const { data: existing } = await service
    .from('profiles')
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle();

  if (existing) return existing;

  const fullName =
    extras.full_name ||
    [extras.first_name, extras.last_name].filter(Boolean).join(' ') ||
    authUser.user_metadata?.full_name ||
    null;

  const row = {
    id: authUser.id,
    email: authUser.email,
    full_name: fullName,
    phone: extras.phone || null,
    role: extras.role || 'customer',
    status: 'active',
    kyc_status: 'pending'
  };

  const { data, error } = await service.from('profiles').upsert(row).select().single();
  if (error) {
    console.error('[auth] profile upsert', error.message);
    return row;
  }

  // Ensure customer row for banking users
  if ((data.role || 'customer') === 'customer') {
    await service.from('customers').upsert(
      {
        profile_id: data.id,
        customer_number: 'C-' + String(Date.now()).slice(-6)
      },
      { onConflict: 'profile_id' }
    );
  }

  return data;
}

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, first_name, last_name, phone } = req.body || {};
    if (!email || !password || !first_name || !last_name) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'First name, last name, email, and password are required.'
      });
    }
    if (String(password).length < 8) {
      return res.status(400).json({
        error: 'Weak password',
        message: 'Password must be at least 8 characters.'
      });
    }

    if (isConfigured()) {
      const anon = getAnonClient();
      const service = getServiceClient();
      const full_name = `${String(first_name).trim()} ${String(last_name).trim()}`;

      const { data, error } = await anon.auth.signUp({
        email: String(email).trim().toLowerCase(),
        password,
        options: {
          data: { full_name, phone: phone || null }
        }
      });

      if (error) {
        return res.status(400).json({ error: 'Registration failed', message: error.message });
      }

      const authUser = data.user;
      if (!authUser) {
        return res.status(201).json({
          message: 'Check your email to confirm your account before signing in.'
        });
      }

      const profile = await ensureProfile(service, authUser, {
        full_name,
        phone,
        first_name,
        last_name,
        role: 'customer'
      });

      return res.status(201).json({
        token: data.session?.access_token || null,
        user: publicUser({
          id: authUser.id,
          email: authUser.email,
          full_name: profile.full_name,
          role: profile.role,
          phone: profile.phone,
          kyc_status: profile.kyc_status
        }),
        message: data.session
          ? 'Account created.'
          : 'Account created. Confirm your email if required, then sign in.'
      });
    }

    if (!allowLocalFallback) {
      return res.status(503).json({
        error: 'Auth not configured',
        message: 'Set SUPABASE_URL and SUPABASE_ANON_KEY in .env'
      });
    }

    const key = String(email).toLowerCase().trim();
    if (localUsers.has(key)) {
      return res.status(409).json({
        error: 'Email in use',
        message: 'An account with this email already exists.'
      });
    }
    const user = {
      id: crypto.randomUUID(),
      email: key,
      password,
      full_name: `${String(first_name).trim()} ${String(last_name).trim()}`,
      role: 'customer',
      phone: phone || null,
      kyc_status: 'pending'
    };
    localUsers.set(key, user);
    return res.status(201).json({
      token: issueLocalToken(user),
      user: publicUser(user)
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({
        error: 'Missing credentials',
        message: 'Email and password are required.'
      });
    }

    if (isConfigured()) {
      const anon = getAnonClient();
      const service = getServiceClient();
      const { data, error } = await anon.auth.signInWithPassword({
        email: String(email).trim().toLowerCase(),
        password
      });

      if (error || !data.session || !data.user) {
        return res.status(401).json({
          error: 'Invalid credentials',
          message: 'Invalid email or password.'
        });
      }

      const profile = await ensureProfile(service, data.user, {
        full_name: data.user.user_metadata?.full_name
      });

      return res.json({
        token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        user: publicUser({
          id: data.user.id,
          email: data.user.email,
          full_name: profile.full_name,
          role: profile.role,
          phone: profile.phone,
          kyc_status: profile.kyc_status
        })
      });
    }

    if (!allowLocalFallback) {
      return res.status(503).json({
        error: 'Auth not configured',
        message: 'Set SUPABASE_URL and SUPABASE_ANON_KEY in .env'
      });
    }

    const key = String(email).toLowerCase().trim();
    const user = localUsers.get(key);
    if (!user || user.password !== password) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Invalid email or password.'
      });
    }
    return res.json({ token: issueLocalToken(user), user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', async (req, res) => {
  res.json({ success: true, message: 'Logged out' });
});

router.post('/forgot-password', async (req, res) => {
  const email = req.body?.email;
  if (isConfigured() && email) {
    try {
      const anon = getAnonClient();
      await anon.auth.resetPasswordForEmail(String(email).trim().toLowerCase(), {
        redirectTo: (process.env.APP_URL || 'http://localhost:3000') + '/login.html'
      });
    } catch (e) {
      // still generic response
    }
  }
  res.json({
    success: true,
    message: 'If an account exists for that email, reset instructions will be sent.'
  });
});

module.exports = router;
