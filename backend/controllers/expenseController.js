const { connectDB, sql } = require('../config/db');

// @desc    Add a new expense
// @route   POST /api/expenses
// @access  Private
const addExpense = async (req, res) => {
    const { title, amount, category, date, notes } = req.body;
    const userId = req.user.id;

    // Simple validation
    if (!title || !amount || !category || !date) {
        return res.status(400).json({ success: false, message: 'Please provide title, amount, category, and date' });
    }

    if (isNaN(amount) || parseFloat(amount) <= 0) {
        return res.status(400).json({ success: false, message: 'Amount must be a positive number' });
    }

    try {
        const pool = await connectDB();
        const result = await pool.request()
            .input('user_id', sql.Int, userId)
            .input('title', sql.NVarChar, title.trim())
            .input('amount', sql.Decimal(10, 2), parseFloat(amount))
            .input('category', sql.NVarChar, category)
            .input('date', sql.Date, date)
            .input('notes', sql.NVarChar, notes ? notes.trim() : null)
            .query(`
                INSERT INTO Expenses (user_id, title, amount, category, date, notes) 
                OUTPUT Inserted.id, Inserted.title, Inserted.amount, Inserted.category, Inserted.date, Inserted.notes
                VALUES (@user_id, @title, @amount, @category, @date, @notes)
            `);

        return res.status(201).json({
            success: true,
            message: 'Expense added successfully',
            expense: result.recordset[0]
        });
    } catch (error) {
        console.error('Add expense error:', error.message);
        return res.status(500).json({ success: false, message: 'Server error adding expense' });
    }
};

// @desc    Get all expenses with search and filters
// @route   GET /api/expenses
// @access  Private
const getExpenses = async (req, res) => {
    const userId = req.user.id;
    const { category, search, startDate, endDate } = req.query;

    try {
        const pool = await connectDB();
        
        let queryStr = `
            SELECT id, title, amount, category, FORMAT(date, 'yyyy-MM-dd') as date, notes, created_at 
            FROM Expenses 
            WHERE user_id = @user_id
        `;

        const request = pool.request();
        request.input('user_id', sql.Int, userId);

        if (category && category !== 'All') {
            queryStr += ' AND category = @category';
            request.input('category', sql.NVarChar, category);
        }

        if (search) {
            queryStr += ' AND (title LIKE @search OR notes LIKE @search)';
            request.input('search', sql.NVarChar, `%${search}%`);
        }

        if (startDate) {
            queryStr += ' AND date >= @startDate';
            request.input('startDate', sql.Date, startDate);
        }

        if (endDate) {
            queryStr += ' AND date <= @endDate';
            request.input('endDate', sql.Date, endDate);
        }

        queryStr += ' ORDER BY date DESC, created_at DESC';

        const result = await request.query(queryStr);

        return res.status(200).json({
            success: true,
            count: result.recordset.length,
            expenses: result.recordset
        });
    } catch (error) {
        console.error('Get expenses error:', error.message);
        return res.status(500).json({ success: false, message: 'Server error fetching expenses' });
    }
};

// @desc    Update an expense
// @route   PUT /api/expenses/:id
// @access  Private
const updateExpense = async (req, res) => {
    const { id } = req.params;
    const { title, amount, category, date, notes } = req.body;
    const userId = req.user.id;

    if (!title || !amount || !category || !date) {
        return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }

    if (isNaN(amount) || parseFloat(amount) <= 0) {
        return res.status(400).json({ success: false, message: 'Amount must be a positive number' });
    }

    try {
        const pool = await connectDB();

        // Check if expense exists and belongs to the user
        const checkResult = await pool.request()
            .input('id', sql.Int, id)
            .input('user_id', sql.Int, userId)
            .query('SELECT id FROM Expenses WHERE id = @id AND user_id = @user_id');

        if (checkResult.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Expense not found or unauthorized' });
        }

        // Update expense
        const updateResult = await pool.request()
            .input('id', sql.Int, id)
            .input('title', sql.NVarChar, title.trim())
            .input('amount', sql.Decimal(10, 2), parseFloat(amount))
            .input('category', sql.NVarChar, category)
            .input('date', sql.Date, date)
            .input('notes', sql.NVarChar, notes ? notes.trim() : null)
            .query(`
                UPDATE Expenses 
                SET title = @title, amount = @amount, category = @category, date = @date, notes = @notes
                OUTPUT Inserted.id, Inserted.title, Inserted.amount, Inserted.category, Inserted.date, Inserted.notes
                WHERE id = @id
            `);

        return res.status(200).json({
            success: true,
            message: 'Expense updated successfully',
            expense: updateResult.recordset[0]
        });
    } catch (error) {
        console.error('Update expense error:', error.message);
        return res.status(500).json({ success: false, message: 'Server error updating expense' });
    }
};

// @desc    Delete an expense
// @route   DELETE /api/expenses/:id
// @access  Private
const deleteExpense = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    try {
        const pool = await connectDB();

        // Check if expense exists and belongs to the user
        const checkResult = await pool.request()
            .input('id', sql.Int, id)
            .input('user_id', sql.Int, userId)
            .query('SELECT id FROM Expenses WHERE id = @id AND user_id = @user_id');

        if (checkResult.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Expense not found or unauthorized' });
        }

        // Delete expense
        await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM Expenses WHERE id = @id');

        return res.status(200).json({
            success: true,
            message: 'Expense deleted successfully'
        });
    } catch (error) {
        console.error('Delete expense error:', error.message);
        return res.status(500).json({ success: false, message: 'Server error deleting expense' });
    }
};

// @desc    Get monthly expense summary and analytics
// @route   GET /api/expenses/summary
// @access  Private
const getMonthlySummary = async (req, res) => {
    const userId = req.user.id;
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1; // 1-12

    try {
        const pool = await connectDB();

        // 1. Get Monthly Budget
        const budgetResult = await pool.request()
            .input('user_id', sql.Int, userId)
            .query('SELECT monthly_budget, currency FROM Budgets WHERE user_id = @user_id');
        
        const budget = budgetResult.recordset[0] ? parseFloat(budgetResult.recordset[0].monthly_budget) : 1000.00;
        const currency = budgetResult.recordset[0] ? budgetResult.recordset[0].currency : 'USD';

        // 2. Get total spending for current month
        const monthlyTotalResult = await pool.request()
            .input('user_id', sql.Int, userId)
            .input('year', sql.Int, currentYear)
            .input('month', sql.Int, currentMonth)
            .query(`
                SELECT SUM(amount) as total_spent 
                FROM Expenses 
                WHERE user_id = @user_id 
                AND YEAR(date) = @year 
                AND MONTH(date) = @month
            `);
        
        const totalSpent = monthlyTotalResult.recordset[0].total_spent ? parseFloat(monthlyTotalResult.recordset[0].total_spent) : 0;

        // 3. Get total spending for past month (to show trend)
        const pastYear = currentMonth === 1 ? currentYear - 1 : currentYear;
        const pastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
        const pastTotalResult = await pool.request()
            .input('user_id', sql.Int, userId)
            .input('year', sql.Int, pastYear)
            .input('month', sql.Int, pastMonth)
            .query(`
                SELECT SUM(amount) as total_spent 
                FROM Expenses 
                WHERE user_id = @user_id 
                AND YEAR(date) = @year 
                AND MONTH(date) = @month
            `);
        const pastSpent = pastTotalResult.recordset[0].total_spent ? parseFloat(pastTotalResult.recordset[0].total_spent) : 0;

        // 4. Get category-wise spending for current month
        const categoryResult = await pool.request()
            .input('user_id', sql.Int, userId)
            .input('year', sql.Int, currentYear)
            .input('month', sql.Int, currentMonth)
            .query(`
                SELECT category, SUM(amount) as total_amount 
                FROM Expenses 
                WHERE user_id = @user_id 
                AND YEAR(date) = @year 
                AND MONTH(date) = @month
                GROUP BY category
                ORDER BY total_amount DESC
            `);

        // 5. Get recent 6 months total spending for line chart
        const lineChartResult = await pool.request()
            .input('user_id', sql.Int, userId)
            .query(`
                SELECT TOP 6 YEAR(date) as year, MONTH(date) as month, SUM(amount) as total_amount
                FROM Expenses
                WHERE user_id = @user_id
                GROUP BY YEAR(date), MONTH(date)
                ORDER BY year DESC, month DESC
            `);

        return res.status(200).json({
            success: true,
            summary: {
                budget,
                currency,
                totalSpent,
                pastSpent,
                remainingBudget: budget - totalSpent,
                budgetUsagePercentage: budget > 0 ? Math.min((totalSpent / budget) * 100, 100).toFixed(1) : 0,
                categories: categoryResult.recordset.map(row => ({
                    category: row.category,
                    amount: parseFloat(row.total_amount)
                })),
                monthlyTrend: lineChartResult.recordset.reverse().map(row => ({
                    label: `${row.month}/${row.year}`,
                    amount: parseFloat(row.total_amount)
                }))
            }
        });
    } catch (error) {
        console.error('Monthly summary error:', error.message);
        return res.status(500).json({ success: false, message: 'Server error generating monthly summary' });
    }
};

// @desc    Download/Export all expenses to CSV format
// @route   GET /api/expenses/export
// @access  Private
const exportExpensesCSV = async (req, res) => {
    const userId = req.user.id;

    try {
        const pool = await connectDB();
        const result = await pool.request()
            .input('user_id', sql.Int, userId)
            .query(`
                SELECT title, amount, category, FORMAT(date, 'yyyy-MM-dd') as date, ISNULL(notes, '') as notes 
                FROM Expenses 
                WHERE user_id = @user_id 
                ORDER BY date DESC
            `);

        const expenses = result.recordset;

        // Generate CSV string
        let csvContent = 'Title,Amount,Category,Date,Notes\n';
        expenses.forEach(exp => {
            // Escape double quotes in titles and notes safely (guarding null/undefined values)
            const titleVal = exp.title || '';
            const notesVal = exp.notes || '';
            const title = `"${titleVal.replace(/"/g, '""')}"`;
            const notes = `"${notesVal.replace(/"/g, '""')}"`;
            csvContent += `${title},${exp.amount},${exp.category},${exp.date},${notes}\n`;
        });

        // Set response headers for file download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=expenses_report.csv');
        return res.status(200).send(csvContent);

    } catch (error) {
        console.error('CSV export error:', error.message);
        return res.status(500).json({ success: false, message: 'Server error generating export report' });
    }
};

module.exports = {
    addExpense,
    getExpenses,
    updateExpense,
    deleteExpense,
    getMonthlySummary,
    exportExpensesCSV
};
