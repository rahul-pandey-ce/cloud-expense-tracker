const express = require('express');
const { 
    addExpense, 
    getExpenses, 
    updateExpense, 
    deleteExpense, 
    getMonthlySummary,
    exportExpensesCSV
} = require('../controllers/expenseController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes here are protected by JWT authentication
router.use(protect);

router.post('/', addExpense);
router.get('/', getExpenses);
router.get('/summary', getMonthlySummary);
router.get('/export', exportExpensesCSV);
router.put('/:id', updateExpense);
router.delete('/:id', deleteExpense);

module.exports = router;
