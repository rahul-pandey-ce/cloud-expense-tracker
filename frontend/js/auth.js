// Auth logic handles registration, login, logout and access guards

// Check if user is logged in
const isAuthenticated = () => {
    return !!localStorage.getItem('token');
};

// Guard route: redirect to login if not authenticated
const requireAuth = () => {
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
    }
};

// Guard route: redirect to dashboard if already authenticated (for login/register pages)
const redirectIfAuth = () => {
    if (isAuthenticated()) {
        window.location.href = 'index.html';
    }
};

// Register user
const register = async (name, email, password) => {
    try {
        const data = await apiRequest('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ name, email, password })
        });
        
        if (data.success) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            showToast('Registration successful! Welcome.', 'success');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        }
    } catch (error) {
        showToast(error.message || 'Registration failed', 'error');
    }
};

// Login user
const login = async (email, password) => {
    try {
        const data = await apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        if (data.success) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            showToast('Welcome back! Logged in successfully.', 'success');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        }
    } catch (error) {
        showToast(error.message || 'Login failed', 'error');
    }
};

// Logout user
const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    showToast('Logged out successfully.', 'info');
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 800);
};

// Get current user information from local memory
const getCurrentUser = () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
};
