/**
 * Supabase clients (server-side)
 * - anon: user-scoped operations with user JWT when provided
 * - admin: service role for privileged server operations only
 */
const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL || '';
const anonKey = process.env.SUPABASE_ANON_KEY || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function isConfigured() {
  return Boolean(url && (anonKey || serviceKey));
}

function getAnonClient() {
  if (!url || !anonKey) return null;
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

function getServiceClient() {
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

/** Client that runs as the end-user when a JWT is supplied */
function getUserClient(accessToken) {
  if (!url || !anonKey || !accessToken) return null;
  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

module.exports = {
  isConfigured,
  getAnonClient,
  getServiceClient,
  getUserClient
};
