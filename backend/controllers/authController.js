const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { connectDB, sql } = require('../config/db');
require('dotenv').config();

// Generate JWT token helper
const generateToken = (user) => {
    return jwt.sign(
        { id: user.id, name: user.name, email: user.email },
        process.env.JWT_SECRET || 'super_secret_jwt_key_change_me_in_production',
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    const { name, email, password } = req.body;

    // Simple validation
    if (!name || !email || !password) {
        return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }

    if (password.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
    }

    try {
        const pool = await connectDB();

        // 1. Check if user already exists
        const checkUserResult = await pool.request()
            .input('email', sql.NVarChar, email.toLowerCase().trim())
            .query('SELECT id FROM Users WHERE email = @email');

        if (checkUserResult.recordset.length > 0) {
            return res.status(400).json({ success: false, message: 'User already exists with this email' });
        }

        // 2. Hash Password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 3. Start a transaction to insert user and their initial budget
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            // Insert User
            const userInsertResult = await transaction.request()
                .input('name', sql.NVarChar, name.trim())
                .input('email', sql.NVarChar, email.toLowerCase().trim())
                .input('password', sql.NVarChar, hashedPassword)
                .query('INSERT INTO Users (name, email, password) OUTPUT Inserted.id, Inserted.name, Inserted.email VALUES (@name, @email, @password)');

            const newUser = userInsertResult.recordset[0];

            // Insert Default Budget (e.g. 1000 INR)
            await transaction.request()
                .input('user_id', sql.Int, newUser.id)
                .input('monthly_budget', sql.Decimal(10, 2), 1000.00)
                .input('currency', sql.NVarChar, 'INR')
                .query('INSERT INTO Budgets (user_id, monthly_budget, currency) VALUES (@user_id, @monthly_budget, @currency)');

            // Commit Transaction
            await transaction.commit();

            // Generate token
            const token = generateToken(newUser);

            return res.status(201).json({
                success: true,
                message: 'User registered successfully',
                token,
                user: {
                    id: newUser.id,
                    name: newUser.name,
                    email: newUser.email,
                    monthly_budget: 1000.00,
                    currency: 'INR'
                }
            });
        } catch (txError) {
            await transaction.rollback();
            throw txError;
        }

    } catch (error) {
        console.error('Registration error:', error.message);
        return res.status(500).json({ success: false, message: 'Server error during registration' });
    }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    const { email, password } = req.body;

    // Simple validation
    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    try {
        const pool = await connectDB();

        // Find user by email
        const userResult = await pool.request()
            .input('email', sql.NVarChar, email.toLowerCase().trim())
            .query(`
                SELECT u.id, u.name, u.email, u.password, b.monthly_budget, b.currency 
                FROM Users u
                LEFT JOIN Budgets b ON u.id = b.user_id
                WHERE u.email = @email
            `);

        if (userResult.recordset.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid credentials' });
        }

        const user = userResult.recordset[0];

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Invalid credentials' });
        }

        // Generate token
        const token = generateToken(user);

        return res.status(200).json({
            success: true,
            message: 'Logged in successfully',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                monthly_budget: user.monthly_budget || 1000.00,
                currency: user.currency || 'USD'
            }
        });

    } catch (error) {
        console.error('Login error:', error.message);
        return res.status(500).json({ success: false, message: 'Server error during login' });
    }
};

// @desc    Get user profile and budget
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = async (req, res) => {
    try {
        const pool = await connectDB();

        const userResult = await pool.request()
            .input('user_id', sql.Int, req.user.id)
            .query(`
                SELECT u.id, u.name, u.email, b.monthly_budget, b.currency 
                FROM Users u
                LEFT JOIN Budgets b ON u.id = b.user_id
                WHERE u.id = @user_id
            `);

        if (userResult.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        return res.status(200).json({
            success: true,
            user: userResult.recordset[0]
        });
    } catch (error) {
        console.error('Profile fetch error:', error.message);
        return res.status(500).json({ success: false, message: 'Server error fetching profile' });
    }
};

// @desc    Update user budget
// @route   PUT /api/auth/budget
// @access  Private
const updateUserBudget = async (req, res) => {
    const { monthly_budget, currency } = req.body;

    if (monthly_budget === undefined || monthly_budget === null || isNaN(monthly_budget)) {
        return res.status(400).json({ success: false, message: 'Please provide a valid budget amount' });
    }

    try {
        const pool = await connectDB();

        // Check if budget exists, if yes update, if not insert
        const checkBudget = await pool.request()
            .input('user_id', sql.Int, req.user.id)
            .query('SELECT id FROM Budgets WHERE user_id = @user_id');

        if (checkBudget.recordset.length > 0) {
            await pool.request()
                .input('user_id', sql.Int, req.user.id)
                .input('monthly_budget', sql.Decimal(10, 2), parseFloat(monthly_budget))
                .input('currency', sql.NVarChar, currency || 'USD')
                .query(`
                    UPDATE Budgets 
                    SET monthly_budget = @monthly_budget, currency = @currency, updated_at = GETDATE()
                    WHERE user_id = @user_id
                `);
        } else {
            await pool.request()
                .input('user_id', sql.Int, req.user.id)
                .input('monthly_budget', sql.Decimal(10, 2), parseFloat(monthly_budget))
                .input('currency', sql.NVarChar, currency || 'USD')
                .query(`
                    INSERT INTO Budgets (user_id, monthly_budget, currency) 
                    VALUES (@user_id, @monthly_budget, @currency)
                `);
        }

        return res.status(200).json({
            success: true,
            message: 'Budget updated successfully',
            budget: {
                monthly_budget: parseFloat(monthly_budget),
                currency: currency || 'USD'
            }
        });
    } catch (error) {
        console.error('Budget update error:', error.message);
        return res.status(500).json({ success: false, message: 'Server error updating budget' });
    }
};

module.exports = {
    registerUser,
    loginUser,
    getUserProfile,
    updateUserBudget
};
