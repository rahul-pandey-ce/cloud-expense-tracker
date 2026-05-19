# Cloud Expense Tracker

A complete, modern, professional, and beginner-friendly full-stack **Expense Tracking Web Application** designed and optimized specifically to run on the **Microsoft Azure Free Tier** (almost 100% free of cost).

Featuring a stunning modern glassmorphic UI, automatic dark mode syncing, rich visual charts and analytics, JWT authentication, and secure CRUD operations backed by Azure SQL Database, this project is perfect for resumes, major college projects, cloud portfolio showcases, or personal finance tracking.

## 🚀 Key Features

*   **Premium Glassmorphic Design:** Sleek modern interface utilizing vibrant radial gradients, responsive glass layout panels (`backdrop-filter`), and customized light/dark micro-transitions.
*   **Complete Analytics & Charting:** Dynamic pie/doughnut charts showing category-wise spending (Food, Shopping, Travel, Bills, Entertainment, Health, Education, Other) powered by Chart.js.
*   **Dynamic Budget Tracking:** Track remaining budget in real-time with visual indicators and alert widgets when spending exceeds 90% of your configured threshold.
*   **Transaction Controls:** Comprehensive CRUD (Create, Read, Update, Delete) capability on expenses with search keywords and filter parameter options (category, custom date ranges).
*   **Download Reports:** Export expense reports directly to standard CSV files in one click.
*   **Secure Authentication:** User signup and signin backed by bcrypt password hashing, stateless JSON Web Tokens (JWT), and authorization route guards.
*   **Azure SQL Integration:** Optimized for connection pooling, data indexing, and SSL-encrypted queries on the Azure SQL Server Database Free Tier.
*   **100% Mobile Responsive:** Optimized navigation menu and card overlays collapsing naturally into compact views for handheld screens.

---

## 📂 Project Directory Structure

```
cloud-expense-tracker/
├── backend/
│   ├── config/
│   │   └── db.js            # SQL database connection pool module
│   ├── controllers/
│   │   ├── authController.js     # User registration, login & budget logic
│   │   └── expenseController.js  # CRUD transactions, analytics & CSV export
│   ├── middleware/
│   │   └── authMiddleware.js     # JWT token verification gatekeeper
│   ├── routes/
│   │   ├── authRoutes.js         # /api/auth routing mapping
│   │   └── expenseRoutes.js      # /api/expenses routing mapping
│   ├── .env.example              # Local / Azure environment placeholders
│   ├── .env                      # Local configuration file (ignored by Git)
│   ├── package.json              # Backend script dependencies
│   └── server.js                 # Primary Express server application listener
│
├── frontend/
│   ├── css/
│   │   └── style.css             # Light/Dark glassmorphic styling, transitions
│   ├── js/
│   │   ├── api.js                # Core Fetch wrapper, toast engine & URL config
│   │   ├── auth.js               # Sign-in/up operations & routing guards
│   │   ├── theme.js              # Local storage light/dark theme switch
│   │   └── dashboard.js          # Chart.js loaders, filters, modal triggers & CRUD
│   ├── index.html                # Premium analytics dashboard (protected)
│   ├── login.html                # Glassmorphic user login page
│   └── register.html             # Glassmorphic user sign-up page
│
├── schema.sql                    # SQL database table structures and indexes
├── AZURE_SETUP.md                # Comprehensive Azure cloud provisioning steps
├── DEPLOYMENT.md                 # Complete Git, SWA, and App Service deployment steps
└── README.md                     # General overview guide (This file)
```

---

## 🛠️ Technical Tech Stack

*   **Frontend:** HTML5, CSS3 (Vanilla transitions & custom scrollbar variables), JavaScript (Vanilla ES6 modules, Fetch API, DOM manipulation).
*   **Charting:** Chart.js library via secure CDN.
*   **Icons:** Remix Icons library via CDN.
*   **Backend:** Node.js, Express.js REST API.
*   **Database:** Azure SQL Database / Microsoft SQL Server.
*   **Authentication:** JWT (jsonwebtoken) & Bcryptjs.
*   **Cloud Hosting (Azure Free Tier):**
    *   **Frontend:** Azure Static Web Apps (Free).
    *   **Backend:** Azure App Service F1 Tier (Free).
    *   **Database:** Azure SQL Database (Free Tier - 100,000 vCore seconds/month, 32GB space).

---

## ⚡ Local Development Setup

To test the application locally before deploying, follow these commands:

### 1. Database Provisioning
Run the SQL queries in `schema.sql` on your local SQL Server instance or Azure SQL Server.

### 2. Backend Config
1. Open the `/backend` folder.
2. Create a `.env` file based on `.env.example`.
3. Provide your SQL connection details (Local SQL Server or Azure SQL Database).
4. Run commands:
   ```bash
   cd backend
   npm install
   npm run dev
   ```

### 3. Frontend Config
1. Open `frontend/js/api.js`.
2. Ensure the fallback detects `localhost` (already configured to dynamically point to `http://localhost:5000/api`).
3. Simply launch any local HTTP static server or double-click `frontend/login.html` to open it in your browser!

---

## 🛡️ Security Best Practices Implemented

*   **No Raw Passwords:** Custom user passwords are secure-hashed via `bcrypt` with 10 salt rounds before database persistence.
*   **Parameterization:** All database queries are parameter-bound using `mssql` inputs to strictly prevent SQL Injection attacks.
*   **Stateless JWTs:** Tokens expire in 7 days, carrying encrypted claims and verified using high-entropy HS256 signatures.
*   **Helmet Security:** Included express helmet middleware to prevent Clickjacking, MIME sniffing, and cross-site scripting (XSS).
*   **CORS Protection:** Configured selective origin and headers filter in Express server.
*   **Session Expiration Hook:** Automatic HTTP 401 trap in `api.js` to log users out of local storage on JWT expiration and send them to the login screen.

---

## 📚 Future Improvement Scope

*   **Push Notifications:** Budget alerts pushed directly to active devices when threshold is approached.
*   **AI Spending Insights:** Integrated Azure OpenAI service to offer personalized tips to reduce monthly bills.
*   **OCR Receipt Scanner:** Scan paper receipts in the dashboard to automatically parse title, category, and expense amount using Azure Form Recognizer AI.
*   **Multi-Currency Support:** Dynamically fetch conversion rates and render values in different currencies.

---

## 📄 License
This project is open-source and free to adapt, showcase, or build upon. Have fun deploying!
