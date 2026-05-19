// Light/Dark Theme Controller
document.addEventListener('DOMContentLoaded', () => {
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeIcon = themeToggleBtn ? themeToggleBtn.querySelector('i') : null;

    // Retrieve previous choice or fall back to system preferences
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const currentTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');

    // Set initial theme attribute
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeIcon(currentTheme);

    // Click handler for toggle button
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const currentActive = document.documentElement.getAttribute('data-theme');
            const targetTheme = currentActive === 'dark' ? 'light' : 'dark';

            document.documentElement.setAttribute('data-theme', targetTheme);
            localStorage.setItem('theme', targetTheme);
            updateThemeIcon(targetTheme);
            
            // Re-render chart inside dashboard if present, to dynamically align axis colors
            if (typeof window.renderAnalyticsChart === 'function') {
                window.renderAnalyticsChart();
            }
        });
    }

    function updateThemeIcon(theme) {
        if (!themeIcon) return;
        if (theme === 'dark') {
            themeIcon.className = 'ri-sun-line';
        } else {
            themeIcon.className = 'ri-moon-line';
        }
    }
});
