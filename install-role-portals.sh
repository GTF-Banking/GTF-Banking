#!/bin/sh
set -eu

ROOT="/root/GTF-Banking"

echo "=============================================="
echo " GTF BANKING - ROLE PORTAL INSTALLER"
echo "=============================================="

cd "$ROOT"

# ------------------------------------------------
# BACKUP
# ------------------------------------------------

BACKUP="backup-before-role-portals-$(date +%Y%m%d-%H%M%S)"

echo "[1/8] Creating backup: $BACKUP"

mkdir -p "$BACKUP"

for item in main.js backend frontend package.json; do
    if [ -e "$item" ]; then
        cp -R "$item" "$BACKUP/"
    fi
done

# ------------------------------------------------
# DIRECTORIES
# ------------------------------------------------

echo "[2/8] Creating portal directories"

mkdir -p frontend/dashboard
mkdir -p frontend/cashier
mkdir -p frontend/manager
mkdir -p frontend/admin
mkdir -p frontend/js
mkdir -p frontend/css
mkdir -p frontend/assets

mkdir -p backend/authentication
mkdir -p backend/api

# ------------------------------------------------
# ROLE MIDDLEWARE
# ------------------------------------------------

echo "[3/8] Installing role middleware"

cat > backend/authentication/roleMiddleware.js <<'EOF'
'use strict';

/*
 * Role authorization middleware.
 *
 * Authentication and authorization are deliberately separate:
 *
 * authMiddleware:
 *   verifies the Supabase access token
 *
 * roleMiddleware:
 *   verifies the authenticated application's role
 */

function roleMiddleware(...allowedRoles) {
  return (req, res, next) => {

    if (!req.user || !req.user.profile) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.'
      });
    }

    const role = String(req.user.profile.role || '')
      .trim()
      .toLowerCase();

    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to access this resource.'
      });
    }

    req.userRole = role;

    next();
  };
}

module.exports = roleMiddleware;
EOF

# ------------------------------------------------
# SESSION HELPERS
# ------------------------------------------------

echo "[4/8] Installing session helpers"

cat > backend/authentication/session.js <<'EOF'
'use strict';

function getSessionUser(req) {
  if (!req || !req.user) {
    return null;
  }

  return req.user;
}

function requireSession(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required.'
    });
  }

  next();
}

function requireRole(...roles) {
  return (req, res, next) => {

    if (!req.user || !req.user.profile) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.'
      });
    }

    const role = String(req.user.profile.role || '')
      .trim()
      .toLowerCase();

    if (!roles.includes(role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions.'
      });
    }

    next();
  };
}

module.exports = {
  getSessionUser,
  requireSession,
  requireRole
};
EOF

# ------------------------------------------------
# ROLE API
# ------------------------------------------------

echo "[5/8] Installing role information API"

cat > backend/api/roles.js <<'EOF'
'use strict';

const express = require('express');

const router = express.Router();

router.get('/me', (req, res) => {

  if (!req.user || !req.user.profile) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required.'
    });
  }

  return res.json({
    success: true,
    user: {
      id: req.user.id,
      email: req.user.email,
      full_name: req.user.profile.full_name,
      role: req.user.profile.role,
      created_at: req.user.profile.created_at
    }
  });
});

module.exports = router;
EOF

# ------------------------------------------------
# FRONTEND AUTH
# ------------------------------------------------

echo "[6/8] Installing frontend authentication"

cat > frontend/js/auth.js <<'EOF'
'use strict';

const GTF_ACCESS_TOKEN = 'gtf_access_token';
const GTF_USER = 'gtf_user';

function getAuthToken() {
  return localStorage.getItem(GTF_ACCESS_TOKEN);
}

function getCurrentUser() {
  const raw = localStorage.getItem(GTF_USER);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem(GTF_USER);
    return null;
  }
}

function saveSession(data) {

  if (!data || !data.access_token) {
    throw new Error('No access token was returned.');
  }

  localStorage.setItem(
    GTF_ACCESS_TOKEN,
    data.access_token
  );

  if (data.user) {
    localStorage.setItem(
      GTF_USER,
      JSON.stringify(data.user)
    );
  }
}

function clearSession() {
  localStorage.removeItem(GTF_ACCESS_TOKEN);
  localStorage.removeItem(GTF_USER);
}

async function login(email, password) {

  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email,
      password
    })
  });

  const data = await response.json().catch(() => ({
    success: false,
    error: 'Invalid server response.'
  }));

  if (!response.ok || !data.success) {
    throw new Error(
      data.error || 'Unable to sign in.'
    );
  }

  saveSession(data);

  return data;
}

async function logout() {

  const token = getAuthToken();

  try {

    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: token
        ? {
            Authorization: `Bearer ${token}`
          }
        : {}
    });

  } finally {

    clearSession();

    window.location.href = '/login.html';
  }
}

async function authenticatedFetch(url, options = {}) {

  const token = getAuthToken();

  if (!token) {
    window.location.href = '/login.html';
    throw new Error('Authentication required.');
  }

  const headers = new Headers(
    options.headers || {}
  );

  headers.set(
    'Authorization',
    `Bearer ${token}`
  );

  if (
    options.body &&
    typeof options.body === 'string' &&
    !headers.has('Content-Type')
  ) {
    headers.set(
      'Content-Type',
      'application/json'
    );
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (response.status === 401) {
    clearSession();
    window.location.href = '/login.html';
    throw new Error('Your session has expired.');
  }

  return response;
}

window.GTFAuth = {
  login,
  logout,
  getAuthToken,
  getCurrentUser,
  clearSession,
  authenticatedFetch
};
EOF

# ------------------------------------------------
# FRONTEND ROLE GUARD
# ------------------------------------------------

cat > frontend/js/role-guard.js <<'EOF'
'use strict';

(function () {

  const token =
    localStorage.getItem('gtf_access_token');

  const userRaw =
    localStorage.getItem('gtf_user');

  const path =
    window.location.pathname;

  const rolePaths = {
    customer: '/dashboard/',
    cashier: '/cashier/',
    manager: '/manager/',
    admin: '/admin/'
  };

  function loginForRole(role) {

    if (role === 'customer') {
      return '/login.html';
    }

    return `/${role}/login.html`;
  }

  function getRole() {

    if (!userRaw) {
      return null;
    }

    try {
      const user = JSON.parse(userRaw);

      return String(
        user.role || ''
      ).trim().toLowerCase();

    } catch {
      return null;
    }
  }

  /*
   * Login pages remain publicly accessible.
   */
  const isLoginPage =
    path === '/login.html' ||
    path.endsWith('/cashier/login.html') ||
    path.endsWith('/manager/login.html') ||
    path.endsWith('/admin/login.html');

  if (isLoginPage) {
    return;
  }

  /*
   * Only protect portal paths.
   */
  let requiredRole = null;

  if (path.startsWith('/dashboard/')) {
    requiredRole = 'customer';
  } else if (path.startsWith('/cashier/')) {
    requiredRole = 'cashier';
  } else if (path.startsWith('/manager/')) {
    requiredRole = 'manager';
  } else if (path.startsWith('/admin/')) {
    requiredRole = 'admin';
  }

  if (!requiredRole) {
    return;
  }

  if (!token) {
    window.location.replace(
      loginForRole(requiredRole)
    );

    return;
  }

  const role = getRole();

  if (!role) {
    localStorage.removeItem(
      'gtf_access_token'
    );

    localStorage.removeItem(
      'gtf_user'
    );

    window.location.replace(
      loginForRole(requiredRole)
    );

    return;
  }

  if (role !== requiredRole) {

    const destination =
      rolePaths[role];

    if (destination) {
      window.location.replace(destination);
    } else {
      localStorage.removeItem(
        'gtf_access_token'
      );

      localStorage.removeItem(
        'gtf_user'
      );

      window.location.replace(
        loginForRole(requiredRole)
      );
    }
  }

})();
EOF

# ------------------------------------------------
# PORTAL GENERATOR
# ------------------------------------------------

echo "[7/8] Creating separate portal pages"

create_portal() {

    ROLE="$1"
    TITLE="$2"
    LOGIN_PATH="$3"

    mkdir -p "frontend/$ROLE"

    cat > "frontend/$ROLE/login.html" <<EOF
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>$TITLE Login | GTF Banking</title>
<link rel="stylesheet" href="/css/styles.css">
</head>

<body>

<main class="auth">

<section class="auth-card">

<img
src="/assets/gtf-logo.svg"
alt="GTF Banking"
style="max-width:180px;height:auto"
>

<div class="section-head">
<div class="eyebrow">$TITLE</div>
<h1>Secure sign in</h1>
<p class="muted">
Authorized $TITLE access.
</p>
</div>

<form class="form" id="roleLoginForm">

<div class="field">
<label for="email">Email address</label>
<input
id="email"
type="email"
autocomplete="username"
required
>
</div>

<div class="field">
<label for="password">Password</label>
<input
id="password"
type="password"
autocomplete="current-password"
required
>
</div>

<button
class="btn dark"
id="loginButton"
type="submit"
>
Sign in
</button>

<div
id="status"
class="form-status muted"
hidden
></div>

</form>

<a href="/" class="muted">
Return to GTF Banking
</a>

</section>

</main>

<script src="/js/auth.js"></script>

<script>
const form =
document.getElementById('roleLoginForm');

const button =
document.getElementById('loginButton');

const status =
document.getElementById('status');

form.addEventListener('submit', async function(event) {

  event.preventDefault();

  button.disabled = true;
  button.textContent = 'Signing in…';

  status.hidden = true;

  try {

    const result =
      await GTFAuth.login(
        document.getElementById('email').value.trim(),
        document.getElementById('password').value
      );

    const role =
      String(
        result.user?.role || ''
      ).toLowerCase();

    if (role !== '$ROLE') {

      GTFAuth.clearSession();

      throw new Error(
        'This account is not authorized for this portal.'
      );
    }

    window.location.href =
      '/$ROLE/index.html';

  } catch (error) {

    status.textContent =
      error.message || 'Unable to sign in.';

    status.hidden = false;

    button.disabled = false;
    button.textContent = 'Sign in';
  }

});
</script>

</body>
</html>
EOF

    cat > "frontend/$ROLE/index.html" <<EOF
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>$TITLE Portal | GTF Banking</title>
<link rel="stylesheet" href="/css/styles.css">
</head>

<body>

<div class="dashboard">

<aside class="sidebar">

<div class="side-brand">
<span>GTF</span> $TITLE
</div>

<nav class="side-nav">

<a class="active" href="/$ROLE/index.html">
Dashboard
</a>

<a href="/$ROLE/customers.html">
Customers
</a>

<a href="/$ROLE/transactions.html">
Transactions
</a>

<a href="/$ROLE/profile.html">
Profile
</a>

<a href="#" id="logoutLink">
Sign out
</a>

</nav>

</aside>

<main class="main">

<header class="topbar">
<strong>$TITLE Portal</strong>
<span class="muted">
Authorized Workspace
</span>
</header>

<section class="content">

<div class="section-head">

<div class="eyebrow">
$TITLE
</div>

<h2>
Welcome to the $TITLE portal
</h2>

<p class="muted">
Authenticated operational workspace.
Real account information will be loaded from authorized backend services.
</p>

</div>

<div class="metrics">

<div class="metric">
<small>Records</small>
<strong>—</strong>
</div>

<div class="metric">
<small>Pending</small>
<strong>—</strong>
</div>

<div class="metric">
<small>Alerts</small>
<strong>—</strong>
</div>

<div class="metric">
<small>Status</small>
<strong>Online</strong>
</div>

</div>

<div class="table-panel">

<h3>Workspace</h3>

<p class="muted">
No operational data has been loaded.
Connect authorized backend data to populate this workspace.
</p>

</div>

</section>

</main>

</div>

<script src="/js/auth.js"></script>
<script src="/js/role-guard.js"></script>

<script>
document
.getElementById('logoutLink')
.addEventListener('click', function(event) {

  event.preventDefault();

  GTFAuth.logout();

});
</script>

</body>
</html>
EOF
}

create_portal "cashier" "Cashier" "/cashier/login.html"
create_portal "manager" "Manager" "/manager/login.html"
create_portal "admin" "Administrator" "/admin/login.html"

# ------------------------------------------------
# CUSTOMER PORTAL GUARD
# ------------------------------------------------

echo "[8/8] Protecting customer dashboard"

for file in frontend/dashboard/*.html; do

    if [ -f "$file" ]; then

        if ! grep -q '/js/role-guard.js' "$file"; then

            sed -i \
              's#</body>#<script src="/js/role-guard.js"></script></body>#' \
              "$file"

        fi

        if ! grep -q '/js/auth.js' "$file"; then

            sed -i \
              's#</body>#<script src="/js/auth.js"></script></body>#' \
              "$file"

        fi

    fi

done

# ------------------------------------------------
# SYNTAX CHECK
# ------------------------------------------------

echo ""
echo "Running JavaScript checks..."

node --check backend/authentication/authMiddleware.js
node --check backend/authentication/roleMiddleware.js
node --check backend/authentication/session.js
node --check backend/api/roles.js
node --check frontend/js/auth.js
node --check frontend/js/role-guard.js
node --check main.js

echo ""
echo "=============================================="
echo " INSTALLATION COMPLETE"
echo "=============================================="
echo ""
echo "Backup:"
echo "  $ROOT/$BACKUP"
echo ""
echo "Customer:"
echo "  /login.html"
echo "  /dashboard/"
echo ""
echo "Cashier:"
echo "  /cashier/login.html"
echo "  /cashier/"
echo ""
echo "Manager:"
echo "  /manager/login.html"
echo "  /manager/"
echo ""
echo "Administrator:"
echo "  /admin/login.html"
echo "  /admin/"
echo ""
echo "IMPORTANT:"
echo "The backend must enforce roles before sensitive"
echo "banking operations are enabled."
echo ""
echo "Restart the server after installation:"
echo ""
echo "  npm start"
echo ""
