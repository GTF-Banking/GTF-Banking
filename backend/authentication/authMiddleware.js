/**
 * Authentication middleware
 * Accepts Supabase JWT (when configured) or local development tokens.
 */
const { isConfigured, getAnonClient, getServiceClient } = require('../supabase');

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Local development token
  if (token.startsWith('local.')) {
    try {
      const parts = token.split('.');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      if (payload.exp && Date.now() > payload.exp) {
        return res.status(401).json({ error: 'Session expired' });
      }
      req.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        full_name: payload.full_name || null
      };
      req.accessToken = token;
      return next();
    } catch {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }
  }

  // Supabase JWT
  if (isConfigured()) {
    try {
      const anon = getAnonClient();
      const { data, error } = await anon.auth.getUser(token);
      if (error || !data.user) {
        return res.status(401).json({ error: 'Invalid or expired session' });
      }

      let role = data.user.user_metadata?.role || 'customer';
      let full_name = data.user.user_metadata?.full_name || null;
      let kyc_status = 'pending';
      let phone = null;

      const service = getServiceClient();
      if (service) {
        const { data: profile } = await service
          .from('profiles')
          .select('role, full_name, phone, kyc_status')
          .eq('id', data.user.id)
          .maybeSingle();
        if (profile) {
          role = profile.role || role;
          full_name = profile.full_name || full_name;
          phone = profile.phone;
          kyc_status = profile.kyc_status || kyc_status;
        }
      }

      req.user = {
        id: data.user.id,
        email: data.user.email,
        role,
        full_name,
        phone,
        kyc_status
      };
      req.accessToken = token;
      return next();
    } catch (err) {
      console.error('[authMiddleware]', err.message);
      return res.status(401).json({ error: 'Invalid or expired session' });
    }
  }

  return res.status(401).json({ error: 'Invalid or expired session' });
}

module.exports = { requireAuth };
