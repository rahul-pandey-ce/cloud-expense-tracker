// Central API client wrapper for Cloud Expense Tracker
// Adjust this URL to point to your deployed Azure App Service URL in production
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || !window.location.hostname || window.location.protocol === 'file:'
    ? 'http://localhost:5000/api'
    : 'https://cloud-expense-tracker-api.azurewebsites.net/api'; // Replace with your Azure backend URL

const apiRequest = async (endpoint, options = {}) => {
    const token = localStorage.getItem('token');
    
    // Set headers
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        ...options,
        headers
    };

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        
        // Handle 401 unauthorized errors (token expired/invalid)
        if (response.status === 401) {
            console.warn('Session expired or unauthorized. Redirecting to login...');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            
            // Avoid infinite redirect loops if we are already on login or register page
            const currentPath = window.location.pathname;
            if (!currentPath.includes('login.html') && !currentPath.includes('register.html')) {
                window.location.href = 'login.html?expired=true';
            }
            throw new Error('Session expired. Please log in again.');
        }

        // Handle file/csv downloads directly if header matches
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/csv')) {
            return await response.text();
        }

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Something went wrong');
        }

        return data;
    } catch (error) {
        console.error(`API Error [${endpoint}]:`, error.message);
        throw error;
    }
};

// Toast notification helper function
const showToast = (message, type = 'info') => {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconClass = 'ri-info-card-line';
    if (type === 'success') iconClass = 'ri-checkbox-circle-line';
    if (type === 'error') iconClass = 'ri-error-warning-line';

    toast.innerHTML = `
        <i class="${iconClass}"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    // Fade out and remove
    setTimeout(() => {
        toast.style.animation = 'none';
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
};
