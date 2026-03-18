// Authentication helpers

function saveAuth(token, user) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
}

function getAuth() {
    const token = localStorage.getItem('token');
    const raw = localStorage.getItem('user');
    if (!token || !raw) return { token: null, user: null };

    try {
        const user = JSON.parse(raw);
        // Invalidate legacy sessions that don't have 'type' field
        if (!user || !user.type) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            return { token: null, user: null };
        }
        return { token, user };
    } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        return { token: null, user: null };
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/index.html';
}

// Redirect helpers — uses 'type' field ('user' or 'staff') for role detection
function requireAuth(type) {
    const { token, user } = getAuth();

    if (!token || !user) {
        window.location.href = '/index.html';
        return null;
    }

    if (type && user.type !== type) {
        // Silently redirect to correct portal
        window.location.href = user.type === 'staff' ? '/admin.html' : '/dashboard.html';
        return null;
    }

    return user;
}

function requireNoAuth() {
    const { token, user } = getAuth();
    if (token && user) {
        window.location.href = user.type === 'staff' ? '/admin.html' : '/dashboard.html';
    }
}
