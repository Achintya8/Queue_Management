// Auto-detect API URL: uses production server if not running locally, otherwise uses localhost
const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? `http://localhost:3000/api/v1`
    : `https://www.achintya-k.in/queue-flow/api/v1`;

/**
 * Perform an API request with automatic token injection.
 * @param {string} endpoint - The endpoint path (e.g., '/auth/login').
 * @param {Object} options - Fetch options (method, body, headers).
 * @returns {Promise<Object>} The JSON response.
 */
async function apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem('token');

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers,
        });

        const data = await response.json();

        if (!response.ok) {
            // Auto-logout on unauthorized
            if (response.status === 401 && endpoint !== '/auth/login' && endpoint !== '/auth/staff/login') {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = 'index.html';
            }
            throw new Error(data.error || data.message || 'API request failed');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}
