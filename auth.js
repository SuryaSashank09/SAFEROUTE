/* ============================================================
   auth.js — SafeRoute shared auth utilities
   Loaded by every page via <script src="auth.js"></script>
   ============================================================ */

const API = 'http://localhost:3000/api';

// ── Storage helpers ──────────────────────────────────────────
function getToken() { return sessionStorage.getItem('sr_token'); }
function getUser()  {
    try { return JSON.parse(sessionStorage.getItem('sr_user') || 'null'); }
    catch(e) { return null; }
}
function saveAuth(token, user) {
    sessionStorage.setItem('sr_token', token);
    sessionStorage.setItem('sr_user', JSON.stringify(user));
}
function clearAuth() {
    sessionStorage.removeItem('sr_token');
    sessionStorage.removeItem('sr_user');
}

// ── Auth guards ──────────────────────────────────────────────
function requireAuth() {
    if (!getToken() || !getUser()) {
        window.location.replace('login.html');
        return false;
    }
    return true;
}

function requireAdmin() {
    const user = getUser();
    if (!getToken() || !user) {
        window.location.replace('login.html');
        return false;
    }
    if (user.role === 'user') {
        window.location.replace('map.html');
        return false;
    }
    return true;
}

// ── Logout ───────────────────────────────────────────────────
async function logout() {
    const token = getToken();
    if (token) {
        try {
            await fetch(API + '/auth/logout', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + token }
            });
        } catch(e) { /* server might be down, clear anyway */ }
    }
    clearAuth();
    window.location.replace('login.html');
}

// ── Authenticated fetch ──────────────────────────────────────
async function authFetch(url, options = {}) {
    const token = getToken();
    const res = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': 'Bearer ' + token } : {}),
            ...(options.headers || {})
        }
    });
    // Auto-logout on 401 (expired token)
    if (res.status === 401) {
        clearAuth();
        window.location.replace('login.html');
        return null;
    }
    return res;
}

// ── UI helpers ───────────────────────────────────────────────
function getTimeAgo(iso) {
    if (!iso) return '—';
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)  return 'Just now';
    if (m < 60) return m + 'm ago';
    const h = Math.floor(m / 60);
    if (h < 24) return h + 'h ago';
    return Math.floor(h / 24) + 'd ago';
}

function showGlobalToast(msg, type = 'success', duration = 4000) {
    let toast = document.getElementById('_globalToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = '_globalToast';
        toast.style.cssText = [
            'position:fixed', 'top:80px', 'right:24px', 'z-index:99999',
            'padding:0.85rem 1.4rem', 'border-radius:12px', 'font-family:Syne,sans-serif',
            'font-size:0.9rem', 'font-weight:700', 'max-width:340px',
            'box-shadow:0 8px 30px rgba(0,0,0,0.4)', 'transition:opacity 0.3s',
            'pointer-events:none'
        ].join(';');
        document.body.appendChild(toast);
    }
    toast.textContent = (type === 'error' ? '❌ ' : type === 'warn' ? '⚠️ ' : '✅ ') + msg;
    toast.style.background = type === 'error' ? 'linear-gradient(135deg,#FF3D00,#ff6b35)'
        : type === 'warn' ? 'linear-gradient(135deg,#FFD600,#FFA000)'
        : 'linear-gradient(135deg,#00E676,#00C853)';
    toast.style.color = (type === 'success') ? '#0a1a0a' : '#fff';
    toast.style.opacity = '1';
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { toast.style.opacity = '0'; }, duration);
}

// ── Populate nav user info ───────────────────────────────────
function populateNavUser(nameSelector, roleSelector) {
    const user = getUser();
    if (!user) return;
    const nameEl = document.querySelector(nameSelector);
    const roleEl = document.querySelector(roleSelector);
    if (nameEl) nameEl.textContent = user.name || user.email;
    if (roleEl) roleEl.textContent = user.role;
}
