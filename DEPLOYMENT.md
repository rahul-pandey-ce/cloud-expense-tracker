# Complete Deployment Guide

This document details the exact commands and steps required to push your Cloud Expense Tracker project to **GitHub**, deploy the backend REST API on **Azure App Service**, deploy the frontend on **Azure Static Web Apps (SWA)**, and establish secure cross-origin communications.

---

## Part 1: GitHub Repository Initialization

Before setting up Azure hosting, the codebase must be version-controlled on GitHub.

### 1. Create a `.gitignore` file
Create a file named `.gitignore` in the **root** folder `cloud-expense-tracker/` to prevent committing heavy modules and sensitive local keys:
```
# Dependency folders
node_modules/

# Local Environment Secrets
.env
.env.local

# Operating System files
.DS_Store
Thumbs.db
```

### 2. Initialize Git and Push to GitHub
1. Sign in to your [GitHub Account](https://github.com/).
2. Create a new repository:
   *   **Repository Name:** `cloud-expense-tracker`
   *   **Public/Private:** Select **Private** (recommended to keep your code private) or **Public**.
   *   Do **NOT** initialize with a README, `.gitignore`, or License (as they are already present in the workspace).
   *   Click **Create repository**.
3. Open your local terminal, navigate to the `cloud-expense-tracker` root folder, and execute the following commands:
   ```bash
   # Initialize Git local registry
   git init

   # Stage all files for commit
   git add .

   # Commit staged changes
   git commit -m "feat: complete initial project structure for expense tracker"

   # Rename branch to main
   git branch -M main

   # Link to your remote GitHub Repository (Replace with your actual repo URL)
   git remote add origin https://github.com/YOUR_USERNAME/cloud-expense-tracker.git

   # Push to GitHub
   git push -u origin main
   ```

---

## Part 2: Deploying the Backend API (Azure App Service)

The simplest and most robust way to deploy your backend is using **Local Git** configuration directly inside the Azure Portal, or via the **VS Code Azure App Service Extension**. Here is the Portal-driven Git deployment flow:

### 1. Set Up Deployment Credentials
1. In the Azure Portal, open your deployed **App Service** dashboard.
2. Navigate to **Deployment** -> **Deployment Center** in the side pane.
3. Click the **Settings** tab.
4. For **Source**, select **Local Git**. Click **Save**.
5. Copy the generated **Git Clone URL** displayed in the dashboard.
6. Click the **Local Git/FTPS Credentials** tab.
   *   Create a user password (this is your personal credentials to push code from your local CLI directly to Azure's App Service container).

### 2. Push Backend to Azure App Service
1. Open your local terminal, navigate to `cloud-expense-tracker/backend` folder.
2. Initialize a sub-git or push the main repository. The recommended standard is to add a second git remote pointing to the Azure App Service.
3. In your terminal at the project root folder:
   ```bash
   # Add Azure App Service as a deployment remote (Replace with your copied Git Clone URL)
   git remote add azure https://your-deployment-username@cloud-expense-tracker-api-xxxx.scm.azurewebsites.net:443/cloud-expense-tracker-api-xxxx.git

   # Deploy your backend codebase by pushing to Azure (Azure will automatically detect server.js, run 'npm install', and boot up)
   git push azure main
   ```

---

## Part 3: Deploying Frontend (Azure Static Web Apps)

When you created the Azure Static Web App resource (Step 6 of `AZURE_SETUP.md`), Azure automatically inserted a workflow file inside your GitHub repository under `.github/workflows/azure-static-web-apps-xxxx.yml`.

Every time you execute a standard `git push origin main` to GitHub:
1. GitHub Actions will trigger.
2. The Action compiles your `/frontend` directory assets.
3. The bundle is automatically synchronized with Azure's globally distributed servers.

To confirm the build succeeded:
1. Open your GitHub Repository webpage.
2. Select the **Actions** tab.
3. You should see a green checkmark indicating the deployment pipeline successfully deployed your frontend.

---

## Part 4: Connecting Frontend and Backend (CORS and API Configurations)

Now that both elements are hosted in the cloud, we must configure them to talk to each other:

### 1. Point Frontend to App Service API
1. In the Azure Portal, open your deployed Node App Service dashboard.
2. Copy the **Default domain** URL displayed on the Overview tab (e.g. `https://cloud-expense-tracker-api-xxxx.azurewebsites.net`).
3. Open your local repository, navigate to `frontend/js/api.js`.
4. Replace the template URL string inside `API_BASE_URL` with your copied domain URL:
   ```javascript
   // Replace template string with your actual Azure Node App Service URL
   const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
       ? 'http://localhost:5000/api'
       : 'https://cloud-expense-tracker-api-xxxx.azurewebsites.net/api';
   ```
5. Commit and push this change to GitHub to trigger automatic frontend deployment:
   ```bash
   git add frontend/js/api.js
   git commit -m "config: point production API base url to Azure App Service"
   git push origin main
   ```

### 2. Configure CORS in Backend (Optional but Recommended)
For maximum security in production, prevent other domains from hitting your backend.
1. Open your **App Service** dashboard in the Azure Portal.
2. Select **API** -> **CORS** in the left menu.
3. Copy your **Static Web App URL** (e.g. `https://wonderful-sea-0abc123.azurestaticapps.net`) and paste it into the **Allowed Origins** text box.
4. Click **Save**.

---

## Part 5: Complete End-to-End Testing

Once both services are active and synced:
1. Open your Static Web App URL in your web browser.
2. Click **Sign Up** to create a test user. Verify that a success toast appears and redirects you to the main dashboard.
3. Try **Setting a Budget** limit (e.g., $1500). Verify that the card numbers and limit progress bar render immediately.
4. Add different expense items (e.g., Grocery shopping, Flights, utility bills). Verify:
   *   Values automatically update in the spent/remaining KPI metrics.
   *   The category Doughnut Chart renders dynamically.
   *   Interactive progress bars populate below the chart.
5. Search by keywords or filter by Category. Verify that matching entries render correctly.
6. Click **Export Data** at the top. Check that a CSV spreadsheet containing all transaction logs downloads instantly to your computer.
7. Click the **Theme Toggle** button. Verify that the UI smoothly transitions to a gorgeous light theme and shifts axis colors instantly.
8. Click **Sign Out** to test session destruction.
