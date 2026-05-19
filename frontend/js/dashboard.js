// Main Dashboard Controller
let categoryChart = null;
let currentExpenses = [];
let editingExpenseId = null;

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', () => {
    // 1. Guard route: check if logged in
    requireAuth();

    // 2. Setup standard structural nodes
    const currentUser = getCurrentUser();
    if (currentUser) {
        document.getElementById('user-name-display').textContent = currentUser.name;
        document.getElementById('user-profile-letter').textContent = currentUser.name.charAt(0).toUpperCase();
        document.getElementById('budget-amount-display').textContent = `₹${parseFloat(currentUser.monthly_budget).toFixed(2)}`;
    }

    // 3. Attach Event Listeners
    setupEventListeners();

    // 4. Fetch initial dashboard data
    refreshDashboardData();
});

// Setup Dashboard Interaction Listeners
function setupEventListeners() {
    // Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);

    // Mobile Menu Toggle
    const menuToggle = document.getElementById('mobile-menu-toggle');
    const navLinks = document.getElementById('nav-links');
    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }

    // Add Expense Form Trigger (Modal Open)
    const addExpenseBtn = document.getElementById('add-expense-btn');
    if (addExpenseBtn) {
        addExpenseBtn.addEventListener('click', () => {
            openExpenseModal();
        });
    }

    // Edit Budget Trigger
    const editBudgetBtn = document.getElementById('edit-budget-btn');
    if (editBudgetBtn) {
        editBudgetBtn.addEventListener('click', () => {
            openBudgetModal();
        });
    }

    // Expense Form Submit
    const expenseForm = document.getElementById('expense-form');
    if (expenseForm) {
        expenseForm.addEventListener('submit', handleExpenseSubmit);
    }

    // Budget Form Submit
    const budgetForm = document.getElementById('budget-form');
    if (budgetForm) {
        budgetForm.addEventListener('submit', handleBudgetSubmit);
    }

    // Search and Filter Listeners
    const searchInput = document.getElementById('search-input');
    const categoryFilter = document.getElementById('category-filter');
    const dateStartFilter = document.getElementById('date-start-filter');
    const dateEndFilter = document.getElementById('date-end-filter');

    if (searchInput) searchInput.addEventListener('input', debounce(filterExpenses, 400));
    if (categoryFilter) categoryFilter.addEventListener('change', filterExpenses);
    if (dateStartFilter) dateStartFilter.addEventListener('change', filterExpenses);
    if (dateEndFilter) dateEndFilter.addEventListener('change', filterExpenses);

    // Download CSV Report
    const exportBtn = document.getElementById('export-report-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', downloadCSVReport);
    }

    // Close Modals
    const modalCloseBtns = document.querySelectorAll('.close-modal');
    modalCloseBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            closeAllModals();
        });
    });

    // Close Modal on clicking overlay
    const modalOverlays = document.querySelectorAll('.modal-overlay');
    modalOverlays.forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeAllModals();
            }
        });
    });
}

// Refresh all components
async function refreshDashboardData() {
    showLoadingSpinner(true);
    try {
        await Promise.all([
            fetchSummary(),
            fetchExpensesList()
        ]);
    } catch (error) {
        console.error('Error refreshing data:', error);
    } finally {
        showLoadingSpinner(false);
    }
}

// Fetch dashboard analytical summary
async function fetchSummary() {
    try {
        const res = await apiRequest('/expenses/summary');
        if (res.success) {
            updateMetrics(res.summary);
            renderAnalyticsChart(res.summary.categories);
            renderCategoryList(res.summary.categories, res.summary.budget);
        }
    } catch (error) {
        showToast('Failed to load spending summary', 'error');
    }
}

// Fetch expenses list based on active filters
async function fetchExpensesList() {
    try {
        const searchVal = document.getElementById('search-input')?.value || '';
        const categoryVal = document.getElementById('category-filter')?.value || 'All';
        const dateStartVal = document.getElementById('date-start-filter')?.value || '';
        const dateEndVal = document.getElementById('date-end-filter')?.value || '';

        let query = '/expenses?';
        if (searchVal) query += `search=${encodeURIComponent(searchVal)}&`;
        if (categoryVal && categoryVal !== 'All') query += `category=${encodeURIComponent(categoryVal)}&`;
        if (dateStartVal) query += `startDate=${dateStartVal}&`;
        if (dateEndVal) query += `endDate=${dateEndVal}&`;

        const res = await apiRequest(query);
        if (res.success) {
            currentExpenses = res.expenses;
            renderExpensesTable(res.expenses);
        }
    } catch (error) {
        showToast('Failed to load transaction history', 'error');
    }
}

// Filter inputs change handler
function filterExpenses() {
    fetchExpensesList();
}

// Update KPI cards in the dashboard
function updateMetrics(summary) {
    const totalSpent = summary.totalSpent;
    const budget = summary.budget;
    const remaining = summary.remainingBudget;
    
    // Formatter utility - configured for Indian standard groupings
    const formatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

    // Update numbers
    document.getElementById('total-spent-display').textContent = formatter.format(totalSpent);
    document.getElementById('remaining-budget-display').textContent = formatter.format(remaining);
    document.getElementById('budget-amount-display').textContent = formatter.format(budget);

    // Remaining text accent colors
    const remainingCard = document.getElementById('remaining-card');
    const remainingLabel = document.getElementById('remaining-label');
    if (remaining < 0) {
        if (remainingCard) remainingCard.style.borderLeft = '4px solid var(--danger)';
        if (remainingLabel) remainingLabel.style.color = 'var(--danger)';
        const remainingDisplay = document.getElementById('remaining-budget-display');
        if (remainingDisplay) remainingDisplay.style.color = 'var(--danger)';
    } else {
        if (remainingCard) remainingCard.style.borderLeft = 'none';
        if (remainingLabel) remainingLabel.style.color = 'var(--text-secondary)';
        const remainingDisplay = document.getElementById('remaining-budget-display');
        if (remainingDisplay) remainingDisplay.style.color = 'var(--text-primary)';
    }

    // Monthly usage percentage comparison indicator
    const percent = parseFloat(summary.budgetUsagePercentage);
    const usageIndicator = document.getElementById('usage-indicator');
    if (usageIndicator) {
        usageIndicator.textContent = `${percent}% used`;
        usageIndicator.className = `metric-change ${percent > 90 ? 'negative' : 'positive'}`;
    }

    // Progress bar fill
    const progressBar = document.getElementById('budget-progress-fill');
    if (progressBar) {
        progressBar.style.width = `${percent}%`;
        if (percent > 90) {
            progressBar.classList.add('danger');
        } else {
            progressBar.classList.remove('danger');
        }
    }

    // Trend comparisons vs last month
    const pastSpent = summary.pastSpent;
    const trendText = document.getElementById('spending-trend-text');
    if (trendText) {
        if (pastSpent > 0) {
            const diff = totalSpent - pastSpent;
            const percentageDiff = Math.abs((diff / pastSpent) * 100).toFixed(0);
            if (diff > 0) {
                trendText.innerHTML = `<span class="negative"><i class="ri-arrow-up-line"></i> ${percentageDiff}%</span> vs last month`;
            } else {
                trendText.innerHTML = `<span class="positive"><i class="ri-arrow-down-line"></i> ${percentageDiff}%</span> vs last month`;
            }
        } else {
            trendText.textContent = 'No data for last month';
        }
    }
}

// Render the transactional database entries to table
function renderExpensesTable(expenses) {
    const tableBody = document.getElementById('expenses-table-body');
    if (!tableBody) return;

    if (!expenses || expenses.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    <i class="ri-receipt-line"></i>
                    <p>No expenses found. Try adding some or modifying your search filter.</p>
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = expenses.map(exp => {
        // Safe notes fallback
        const notes = exp.notes ? exp.notes : '-';
        return `
            <tr>
                <td style="font-weight: 600; color: var(--text-primary);">${escapeHtml(exp.title)}</td>
                <td><span class="category-tag cat-${exp.category.toLowerCase()}">${exp.category}</span></td>
                <td style="font-weight: 700; color: var(--text-primary);">₹${parseFloat(exp.amount).toFixed(2)}</td>
                <td>${exp.date}</td>
                <td><small style="color: var(--text-muted);">${escapeHtml(notes)}</small></td>
                <td>
                    <div style="display: flex; gap: 0.5rem;">
                        <button class="btn-icon" onclick="editExpense(${exp.id})" title="Edit"><i class="ri-pencil-line"></i></button>
                        <button class="btn-icon" style="color: var(--danger);" onclick="deleteExpense(${exp.id})" title="Delete"><i class="ri-delete-bin-line"></i></button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Render dynamic visual breakdown inside category progress meters
function renderCategoryList(categories, budget) {
    const container = document.getElementById('category-list-container');
    if (!container) return;

    if (!categories || categories.length === 0) {
        container.innerHTML = `<p class="empty-state" style="padding: 1.5rem;"><small>No categorized spending records this month</small></p>`;
        return;
    }

    const totalSum = categories.reduce((sum, item) => sum + item.amount, 0);

    container.innerHTML = categories.map(cat => {
        const percent = totalSum > 0 ? ((cat.amount / totalSum) * 100).toFixed(0) : 0;
        return `
            <div class="cat-progress-item">
                <div class="cat-progress-header">
                    <span class="cat-progress-name"><i class="ri-checkbox-blank-circle-fill" style="color: ${getCategoryColor(cat.category)}; margin-right: 0.35rem; font-size: 0.75rem;"></i>${cat.category}</span>
                    <span class="cat-progress-val"><b>₹${cat.amount.toFixed(2)}</b> <small style="color: var(--text-muted);">(${percent}%)</small></span>
                </div>
                <div class="progress-bar-container" style="height: 5px; margin-top: 0.2rem;">
                    <div class="progress-bar-fill" style="width: ${percent}%; background: ${getCategoryColor(cat.category)}"></div>
                </div>
            </div>
        `;
    }).join('');
}

// Render dynamic ChartJS Canvas
window.renderAnalyticsChart = function(categoriesList) {
    const ctx = document.getElementById('categoryPieChart');
    if (!ctx) return;

    // Use current summary categories if not provided (called during light/dark theme toggle)
    let categories = categoriesList;
    if (!categories) {
        // Fetch values from rendered UI state or skip
        return;
    }

    const labels = categories.map(item => item.category);
    const data = categories.map(item => item.amount);
    const backgroundColors = categories.map(item => getCategoryColor(item.category));

    // Destroy existing chart to prevent canvas redraw overlapping
    if (categoryChart) {
        categoryChart.destroy();
    }

    if (categories.length === 0) {
        // Draw empty indicator text inside canvas context
        const emptyCtx = ctx.getContext('2d');
        emptyCtx.clearRect(0, 0, ctx.width, ctx.height);
        categoryChart = null;
        return;
    }

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textThemeColor = isDark ? '#cbd5e1' : '#475569';

    categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColors,
                borderWidth: isDark ? 2 : 1,
                borderColor: isDark ? '#0f162a' : '#ffffff',
                hoverOffset: 12
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: textThemeColor,
                        font: {
                            family: 'Plus Jakarta Sans',
                            size: 11,
                            weight: '600'
                        },
                        boxWidth: 12
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percent = ((value / total) * 100).toFixed(1);
                            return ` ₹${value.toFixed(2)} (${percent}%)`;
                        }
                    }
                }
            },
            cutout: '65%'
        }
    });
};

// Colors mapping matching the CSS category tag colors
function getCategoryColor(category) {
    const colors = {
        'Food': '#f59e0b',        // Amber
        'Shopping': '#8b5cf6',    // Purple
        'Travel': '#3b82f6',      // Blue
        'Bills': '#ef4444',       // Red
        'Entertainment': '#ec4899', // Pink
        'Health': '#10b981',      // Emerald
        'Education': '#06b6d4',   // Cyan
        'Other': '#6b7280'        // Grey
    };
    return colors[category] || '#6b7280';
}

// Modal Toggle Helpers
function openExpenseModal(expense = null) {
    const modal = document.getElementById('expense-modal');
    const formTitle = document.getElementById('expense-form-title');
    
    // Fields
    const titleInp = document.getElementById('exp-title');
    const amountInp = document.getElementById('exp-amount');
    const categoryInp = document.getElementById('exp-category');
    const dateInp = document.getElementById('exp-date');
    const notesInp = document.getElementById('exp-notes');

    if (expense) {
        editingExpenseId = expense.id;
        formTitle.textContent = 'Edit Expense';
        
        titleInp.value = expense.title;
        amountInp.value = expense.amount;
        categoryInp.value = expense.category;
        
        // Ensure date is formatted correctly (yyyy-MM-dd)
        dateInp.value = expense.date;
        notesInp.value = expense.notes || '';
    } else {
        editingExpenseId = null;
        formTitle.textContent = 'Add New Expense';
        
        document.getElementById('expense-form').reset();
        // Default today's date
        dateInp.value = new Date().toISOString().split('T')[0];
    }

    modal.classList.add('active');
}

function openBudgetModal() {
    const modal = document.getElementById('budget-modal');
    const currentUser = getCurrentUser();
    if (currentUser) {
        document.getElementById('bud-amount').value = currentUser.monthly_budget;
    }
    modal.classList.add('active');
}

function closeAllModals() {
    const modals = document.querySelectorAll('.modal-overlay');
    modals.forEach(m => m.classList.remove('active'));
    editingExpenseId = null;
}

// Handle Forms Submit
async function handleExpenseSubmit(e) {
    e.preventDefault();

    const title = document.getElementById('exp-title').value.trim();
    const amount = parseFloat(document.getElementById('exp-amount').value);
    const category = document.getElementById('exp-category').value;
    const date = document.getElementById('exp-date').value;
    const notes = document.getElementById('exp-notes').value.trim();

    if (!title || isNaN(amount) || amount <= 0 || !category || !date) {
        showToast('Please provide valid values for all fields', 'error');
        return;
    }

    const payload = { title, amount, category, date, notes };

    try {
        let res;
        if (editingExpenseId) {
            // Update
            res = await apiRequest(`/expenses/${editingExpenseId}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
            if (res.success) showToast('Expense updated successfully!', 'success');
        } else {
            // Create
            res = await apiRequest('/expenses', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            if (res.success) showToast('Expense added successfully!', 'success');
        }

        closeAllModals();
        refreshDashboardData();
    } catch (error) {
        showToast(error.message || 'Action failed', 'error');
    }
}

async function handleBudgetSubmit(e) {
    e.preventDefault();

    const budgetVal = parseFloat(document.getElementById('bud-amount').value);
    if (isNaN(budgetVal) || budgetVal < 0) {
        showToast('Please enter a valid positive budget amount', 'error');
        return;
    }

    try {
        const res = await apiRequest('/auth/budget', {
            method: 'PUT',
            body: JSON.stringify({ monthly_budget: budgetVal, currency: 'USD' })
        });

        if (res.success) {
            const currentUser = getCurrentUser();
            currentUser.monthly_budget = budgetVal;
            localStorage.setItem('user', JSON.stringify(currentUser));
            
            showToast('Monthly budget successfully adjusted!', 'success');
            closeAllModals();
            refreshDashboardData();
        }
    } catch (error) {
        showToast(error.message || 'Failed to adjust budget', 'error');
    }
}

// Global scope triggers for table row buttons
window.editExpense = function(id) {
    const expense = currentExpenses.find(e => e.id === id);
    if (expense) {
        openExpenseModal(expense);
    }
};

window.deleteExpense = async function(id) {
    if (confirm('Are you sure you want to permanently delete this expense?')) {
        try {
            const res = await apiRequest(`/expenses/${id}`, {
                method: 'DELETE'
            });
            if (res.success) {
                showToast('Expense successfully removed!', 'success');
                refreshDashboardData();
            }
        } catch (error) {
            showToast(error.message || 'Deletion failed', 'error');
        }
    }
};

// Trigger browser export download
async function downloadCSVReport() {
    try {
        const csvText = await apiRequest('/expenses/export');
        
        // Create local blob link and click it
        const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        link.setAttribute('href', url);
        link.setAttribute('download', `Cloud_Expense_Report_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast('Report generated and downloaded!', 'success');
    } catch (error) {
        showToast('Failed to export CSV report', 'error');
    }
}

// Helper: Toggle page spinner
function showLoadingSpinner(show) {
    const spinner = document.getElementById('dashboard-spinner');
    const content = document.getElementById('dashboard-content');
    
    if (spinner && content) {
        if (show) {
            spinner.style.display = 'flex';
            content.style.opacity = '0.4';
            content.style.pointerEvents = 'none';
        } else {
            spinner.style.display = 'none';
            content.style.opacity = '1';
            content.style.pointerEvents = 'auto';
        }
    }
}

// Utilities
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function escapeHtml(string) {
    if (!string) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return string.toString().replace(/[&<>"']/g, function(m) { return map[m]; });
}
