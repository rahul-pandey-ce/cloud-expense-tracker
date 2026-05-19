const realSql = require('mssql');
require('dotenv').config();

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    port: parseInt(process.env.DB_PORT || '1433', 10),
    options: {
        encrypt: true, // Mandatory for Azure SQL Database
        trustServerCertificate: false, // Change to true for local dev if self-signed cert
        enableArithAbort: true
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

// ==========================================
// 🛡️ LOCAL IN-MEMORY MOCK SQL ENGINE
// ==========================================
const mockState = {
    users: [
        {
            id: 1,
            name: 'Demo Admin',
            email: 'admin@example.com',
            // bcrypt hash of 'password123'
            password: '$2a$10$tM2x24R8zQ6Bq0U.8N.hGecq1f.9e4zM3bUj1WbXlIhe3kLw4n8uC',
            created_at: new Date()
        }
    ],
    budgets: [
        {
            id: 1,
            user_id: 1,
            monthly_budget: 1500.00,
            currency: 'INR'
        }
    ],
    expenses: [
        {
            id: 1,
            user_id: 1,
            title: 'Office Coworking space rent',
            amount: 450.00,
            category: 'Bills',
            date: new Date().toISOString().split('T')[0],
            notes: 'Monthly desk space fee',
            created_at: new Date(Date.now() - 3600000 * 2)
        },
        {
            id: 2,
            user_id: 1,
            title: 'Team Luncheon at Bistro',
            amount: 120.50,
            category: 'Food',
            date: new Date().toISOString().split('T')[0],
            notes: 'Hosted welcome lunch',
            created_at: new Date(Date.now() - 3600000 * 3)
        },
        {
            id: 3,
            user_id: 1,
            title: 'Premium Cloud hosting server',
            amount: 85.00,
            category: 'Bills',
            date: new Date().toISOString().split('T')[0],
            notes: 'Local dev database hosting',
            created_at: new Date(Date.now() - 3600000 * 4)
        },
        {
            id: 4,
            user_id: 1,
            title: 'Uber to Conference Center',
            amount: 32.40,
            category: 'Travel',
            date: new Date().toISOString().split('T')[0],
            notes: 'Cloud summit keynote transit',
            created_at: new Date(Date.now() - 3600000 * 5)
        },
        {
            id: 5,
            user_id: 1,
            title: 'JavaScript Masterclass Books',
            amount: 95.00,
            category: 'Education',
            date: new Date().toISOString().split('T')[0],
            notes: 'vanilla reference guides',
            created_at: new Date(Date.now() - 3600000 * 6)
        }
    ]
};

class MockRequest {
    constructor() {
        this.inputs = {};
    }

    input(name, type, value) {
        this.inputs[name] = value;
        return this;
    }

    async query(queryString) {
        const query = queryString.trim();
        
        // 1. Check if user already exists
        if (query.includes('SELECT id FROM Users WHERE email')) {
            const email = this.inputs.email;
            const user = mockState.users.find(u => u.email === email);
            return { recordset: user ? [{ id: user.id }] : [] };
        }

        // 2. Insert User (Registration)
        if (query.includes('INSERT INTO Users') && query.includes('VALUES')) {
            const { name, email, password } = this.inputs;
            const newUser = {
                id: mockState.users.length + 1,
                name: name.trim(),
                email: email.toLowerCase().trim(),
                password,
                created_at: new Date()
            };
            mockState.users.push(newUser);
            return { recordset: [newUser] };
        }

        // 3. Insert Default Budget
        if (query.includes('INSERT INTO Budgets') && query.includes('VALUES') && !query.includes('UPDATE')) {
            const { user_id, monthly_budget, currency } = this.inputs;
            const newBudget = {
                id: mockState.budgets.length + 1,
                user_id: parseInt(user_id),
                monthly_budget: parseFloat(monthly_budget),
                currency: currency || 'USD'
            };
            mockState.budgets.push(newBudget);
            return { recordset: [newBudget] };
        }

        // 4. Find user by email (Login query)
        if (query.includes('FROM Users u') && query.includes('WHERE u.email = @email')) {
            const email = this.inputs.email;
            const user = mockState.users.find(u => u.email === email);
            if (!user) return { recordset: [] };
            const budget = mockState.budgets.find(b => b.user_id === user.id) || { monthly_budget: 1000.00, currency: 'USD' };
            return {
                recordset: [{
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    password: user.password,
                    monthly_budget: budget.monthly_budget,
                    currency: budget.currency
                }]
            };
        }

        // 5. Get user profile
        if (query.includes('FROM Users u') && query.includes('WHERE u.id = @user_id')) {
            const userId = this.inputs.user_id;
            const user = mockState.users.find(u => u.id === userId);
            if (!user) return { recordset: [] };
            const budget = mockState.budgets.find(b => b.user_id === user.id) || { monthly_budget: 1000.00, currency: 'USD' };
            return {
                recordset: [{
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    monthly_budget: budget.monthly_budget,
                    currency: budget.currency
                }]
            };
        }

        // 6. Check budget exists
        if (query.includes('SELECT id FROM Budgets WHERE user_id')) {
            const userId = this.inputs.user_id;
            const budget = mockState.budgets.find(b => b.user_id === userId);
            return { recordset: budget ? [{ id: budget.id }] : [] };
        }

        // 7. Update budget
        if (query.includes('UPDATE Budgets SET monthly_budget')) {
            const userId = this.inputs.user_id;
            const { monthly_budget, currency } = this.inputs;
            const budget = mockState.budgets.find(b => b.user_id === userId);
            if (budget) {
                budget.monthly_budget = parseFloat(monthly_budget);
                budget.currency = currency || 'USD';
            }
            return { recordset: [] };
        }

        // 7.5. Fetch monthly budget details specifically
        if (query.includes('FROM Budgets') && query.includes('WHERE user_id = @user_id')) {
            const userId = parseInt(this.inputs.user_id);
            const budget = mockState.budgets.find(b => b.user_id === userId);
            return { recordset: budget ? [budget] : [] };
        }

        // 8. Add expense
        if (query.includes('INSERT INTO Expenses')) {
            const { user_id, title, amount, category, date, notes } = this.inputs;
            const newExpense = {
                id: mockState.expenses.length + 1,
                user_id: parseInt(user_id),
                title,
                amount: parseFloat(amount),
                category,
                date: date, // Keep original YYYY-MM-DD format directly
                notes: notes || null,
                created_at: new Date()
            };
            mockState.expenses.push(newExpense);
            return { recordset: [newExpense] };
        }

        // 9. Get expenses list
        if (query.includes('FROM Expenses') && query.includes('WHERE user_id = @user_id') && !query.includes('SUM(')) {
            const userId = parseInt(this.inputs.user_id);
            let list = mockState.expenses.filter(e => e.user_id === userId);

            const category = this.inputs.category;
            const search = this.inputs.search;
            const startDate = this.inputs.startDate;
            const endDate = this.inputs.endDate;

            if (category && category !== 'All') {
                list = list.filter(e => e.category === category);
            }
            if (search) {
                const searchClean = search.replace(/%/g, '').toLowerCase();
                list = list.filter(e => 
                    (e.title && e.title.toLowerCase().includes(searchClean)) || 
                    (e.notes && e.notes.toLowerCase().includes(searchClean))
                );
            }
            if (startDate) {
                list = list.filter(e => e.date >= startDate);
            }
            if (endDate) {
                list = list.filter(e => e.date <= endDate);
            }

            // Sort DESC
            list.sort((a, b) => {
                if (a.date !== b.date) {
                    return b.date.localeCompare(a.date);
                }
                return b.created_at - a.created_at;
            });

            return { recordset: list };
        }

        // 10. Check expense exists
        if (query.includes('SELECT id FROM Expenses WHERE id = @id')) {
            const { id, user_id } = this.inputs;
            const exp = mockState.expenses.find(e => e.id === parseInt(id) && e.user_id === parseInt(user_id));
            return { recordset: exp ? [{ id: exp.id }] : [] };
        }

        // 11. Update expense
        if (query.includes('UPDATE Expenses SET')) {
            const { id, title, amount, category, date, notes } = this.inputs;
            const exp = mockState.expenses.find(e => e.id === parseInt(id));
            if (exp) {
                exp.title = title.trim();
                exp.amount = parseFloat(amount);
                exp.category = category;
                exp.date = date; // Keep original YYYY-MM-DD string directly
                exp.notes = notes ? notes.trim() : null;
            }
            return { recordset: [exp] };
        }

        // 12. Delete expense
        if (query.includes('DELETE FROM Expenses WHERE id = @id')) {
            const id = this.inputs.id;
            const index = mockState.expenses.findIndex(e => e.id === parseInt(id));
            if (index !== -1) {
                mockState.expenses.splice(index, 1);
            }
            return { recordset: [] };
        }

        // 13. Total Spent Sum
        if (query.includes('SUM(amount) as total_spent')) {
            const userId = parseInt(this.inputs.user_id);
            const year = parseInt(this.inputs.year);
            const month = parseInt(this.inputs.month);

            const userExpenses = mockState.expenses.filter(e => {
                const [y, m] = e.date.split('-').map(Number);
                return e.user_id === userId && y === year && m === month;
            });

            const sum = userExpenses.reduce((acc, curr) => acc + curr.amount, 0);
            return { recordset: [{ total_spent: sum }] };
        }

        // 14. Group spends by Category
        if (query.includes('SUM(amount) as total_amount') && query.includes('GROUP BY category')) {
            const userId = parseInt(this.inputs.user_id);
            const year = parseInt(this.inputs.year);
            const month = parseInt(this.inputs.month);

            const userExpenses = mockState.expenses.filter(e => {
                const [y, m] = e.date.split('-').map(Number);
                return e.user_id === userId && y === year && m === month;
            });

            const group = {};
            userExpenses.forEach(e => {
                group[e.category] = (group[e.category] || 0) + e.amount;
            });

            const recordset = Object.keys(group).map(cat => ({
                category: cat,
                total_amount: group[cat]
            }));

            recordset.sort((a, b) => b.total_amount - a.total_amount);
            return { recordset };
        }

        // 15. Six Month Trend
        if (query.includes('TOP 6 YEAR(date)') || (query.includes('GROUP BY YEAR(date), MONTH(date)') && query.includes('total_amount'))) {
            const userId = parseInt(this.inputs.user_id);
            const userExpenses = mockState.expenses.filter(e => e.user_id === userId);

            const group = {};
            userExpenses.forEach(e => {
                const [y, m] = e.date.split('-').map(Number);
                const key = `${y}-${m}`;
                group[key] = (group[key] || 0) + e.amount;
            });

            const recordset = Object.keys(group).map(key => {
                const [year, month] = key.split('-');
                return {
                    year: parseInt(year),
                    month: parseInt(month),
                    total_amount: group[key]
                };
            });

            recordset.sort((a, b) => {
                if (a.year !== b.year) return b.year - a.year;
                return b.month - a.month;
            });

            return { recordset: recordset.slice(0, 6) };
        }

        return { recordset: [] };
    }
}

class MockTransaction {
    constructor(pool) {
        this.pool = pool;
    }
    async begin() {
        return this;
    }
    request() {
        return new MockRequest();
    }
    async commit() {
        return this;
    }
    async rollback() {
        return this;
    }
}

const mockPool = {
    isMock: true,
    request: () => new MockRequest(),
    connect: async () => mockPool
};

// ==========================================
// 🔌 UNIFIED DATABASE DRIVER INTERFACE
// ==========================================
let poolPromise;
let useMockDB = false;

const connectDB = async () => {
    if (useMockDB) {
        return mockPool;
    }

    try {
        if (!poolPromise) {
            console.log('Connecting to Azure SQL Database...');
            poolPromise = new realSql.ConnectionPool(dbConfig)
                .connect()
                .then(pool => {
                    console.log('Successfully connected to Azure SQL Database!');
                    return pool;
                })
                .catch(err => {
                    console.warn('\n⚠️  Azure SQL connection failed! Falling back to Local Mock Database.');
                    console.warn('   The application will run fully offline using dummy seed records.\n');
                    useMockDB = true;
                    poolPromise = null;
                    return mockPool;
                });
        }
        return poolPromise;
    } catch (error) {
        console.warn('⚠️  Database connection exception, starting local Mock DB fallback:', error.message);
        useMockDB = true;
        return mockPool;
    }
};

// Intercept Transaction constructor calls when using Mock Database
const sql = new Proxy(realSql, {
    get(target, prop) {
        if (prop === 'Transaction') {
            return function(pool) {
                if (pool && pool.isMock) {
                    return new MockTransaction(pool);
                }
                return new realSql.Transaction(pool);
            };
        }
        return target[prop];
    }
});

module.exports = {
    sql,
    connectDB
};
