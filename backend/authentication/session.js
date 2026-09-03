/**
 * Session helpers (placeholder)
 * Prefer Supabase Auth sessions or short-lived JWTs.
 */

function createSessionPayload(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    full_name: user.full_name || null
  };
}

module.exports = { createSessionPayload };
