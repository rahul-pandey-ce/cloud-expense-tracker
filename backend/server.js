const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const { connectDB } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const expenseRoutes = require('./routes/expenseRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Security Middlewares
app.use(helmet({
    // Adjust content security policy if needed, especially for static files integration
    contentSecurityPolicy: false 
}));

// CORS Middleware
app.use(cors({
    origin: '*', // In production, replace with specific origins such as your Azure Static Web App URL
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request logger & parser
app.use(morgan('dev'));
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// Main entry check
app.get('/api', (req, res) => {
    res.json({
        success: true,
        message: 'Cloud Expense Tracker API is running!',
        environment: process.env.NODE_ENV || 'development'
    });
});

// Modular Routes
app.use('/api/auth', authRoutes);
app.use('/api/expenses', expenseRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Unhandled Error:', err.message);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error'
    });
});

// Connect to database and then listen
const startServer = async () => {
    try {
        // Attempt database connection check at start
        await connectDB();
        
        app.listen(PORT, () => {
            console.log(`Server successfully active on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
        });
    } catch (dbError) {
        console.error('Failed to start server due to database connectivity issue:', dbError.message);
        // Continue server startup anyway so the container/App Service doesn't constantly crash and restart
        // letting developers view API status and diagnostic error screens.
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT} (Database Offline mode)`);
        });
    }
};

startServer();
