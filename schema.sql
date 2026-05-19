-- Cloud Expense Tracker Database Schema
-- Optimized for Azure SQL Database (Free Tier)

-- Create Users Table
CREATE TABLE Users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL,
    email NVARCHAR(100) NOT NULL UNIQUE,
    password NVARCHAR(255) NOT NULL,
    created_at DATETIME2 DEFAULT GETDATE()
);

-- Create Expenses Table
CREATE TABLE Expenses (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    title NVARCHAR(150) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    category NVARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    notes NVARCHAR(500) NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_Expenses_Users FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

-- Create Budget Table (Additional Feature)
CREATE TABLE Budgets (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    monthly_budget DECIMAL(10,2) NOT NULL DEFAULT 1000.00,
    currency NVARCHAR(10) NOT NULL DEFAULT 'USD',
    updated_at DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_Budgets_Users FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

-- Indexes for performance optimization
CREATE INDEX IX_Expenses_User ON Expenses(user_id);
CREATE INDEX IX_Expenses_Date ON Expenses(date);
CREATE INDEX IX_Users_Email ON Users(email);
