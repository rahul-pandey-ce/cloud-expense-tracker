# Azure Cloud Provisioning Steps

This document outlines the step-by-step process of provisioning **Microsoft Azure Free Tier Services** to host the Cloud Expense Tracker. Follow these steps sequentially to configure your database, backend, and frontend host resources at zero cost.

---

## Step 1: Create an Azure Free Account

1. Go to the [Azure Free Account Website](https://azure.microsoft.com/free/).
2. Click **Start free** and sign in with a Microsoft account (Outlook/Live).
3. Complete the verification process (requires a valid credit/debit card for identity verification; Azure will **not** charge you unless you explicitly upgrade to pay-as-you-go).
4. Upon successful setup, you will receive:
   *   **$200 USD free credits** for the first 30 days.
   *   **12 months of popular free services**.
   *   **40+ services that are always free** (including App Service, Static Web Apps, and SQL Database).

---

## Step 2: Provision an Azure SQL Database (Free Tier)

1. Sign in to the [Azure Portal](https://portal.azure.com/).
2. In the top search bar, search for **SQL databases** and click on it.
3. Click **+ Create** or **Create SQL database**.
4. Configure the **Project Details**:
   *   **Subscription:** Select your free trial or active subscription.
   *   **Resource Group:** Click *Create new*, name it `cloud-expense-tracker-rg`, and select **OK**.
5. Configure the **Database Details**:
   *   **Database name:** Enter `cloud-expense-db`.
   *   **Server:** Click *Create new*.
       *   **Server name:** Enter a unique name (e.g. `expense-tracker-sqlserver-xxxx`).
       *   **Location:** Choose a region close to you (e.g. *East US*).
       *   **Authentication method:** Select *Use SQL authentication*.
       *   **Server admin login:** Enter `cloud_admin`.
       *   **Password / Confirm password:** Create a strong password (e.g. `SecurePass123!`). Save these credentials as you will need them for your backend `.env` variables.
       *   Click **OK**.
   *   **Want to use SQL elastic pool?** Select **No**.
   *   **Workload environment:** Select **Development**.
   *   **Compute + storage:** Click **Configure database**.
       *   Select **Free Trial** (Look for the "Free Trial - 100,000 vCore seconds" option) or choose the **Standard / Basic Tier** and scale the slider to the absolute minimum (Basic, 5 DTUs, 2 GB space, which is covered under the free allocation).
       *   Click **Apply**.
   *   **Backup storage redundancy:** Select **Locally-redundant backup storage** (the cheapest option).
6. Click **Next: Networking**.
   *   **Connectivity method:** Select **Public endpoint**.
   *   **Allow Azure services and resources to access this server:** Set to **Yes** (CRITICAL: This allows your Express App Service to query the SQL Server!).
   *   **Add current client IP address:** Set to **Yes** (This allows your local PC to run DB tests or execute `schema.sql`).
7. Click **Review + Create**, then click **Create**. Wait 2-3 minutes for deployment to finish.

---

## Step 3: Run the Schema on Azure SQL Database

Once the database is successfully created, we need to run our initial setup commands:

1. In the database's side panel in the Azure Portal, click on **Query editor (preview)**.
2. Sign in using the database credentials created in Step 2:
   *   **Login:** `cloud_admin`
   *   **Password:** `SecurePass123!`
3. Open `schema.sql` from your project folder, copy all contents, paste them into the editor workspace, and click **Run**.
4. You should see "Query succeeded" with three tables created (`Users`, `Expenses`, and `Budgets`).

---

## Step 4: Provision Azure App Service (Backend Hosting - F1 Free Tier)

1. In the Azure Portal, search for **App Services** and click on it.
2. Click **+ Create** -> **Web App**.
3. Configure the **Project Details**:
   *   **Subscription:** Select your subscription.
   *   **Resource Group:** Choose `cloud-expense-tracker-rg`.
4. Configure the **Instance Details**:
   *   **Name:** Enter a unique URL identifier (e.g. `cloud-expense-tracker-api-xxxx`).
   *   **Publish:** Select **Code**.
   *   **Runtime stack:** Select **Node 18 LTS** or **Node 20 LTS**.
   *   **Operating System:** Select **Linux**.
   *   **Region:** Choose the same region as your database (e.g. *East US*).
5. Configure the **Pricing Plan**:
   *   **Linux Plan:** Select the default or create a new one.
   *   **Pricing Plan:** Click **Change size** or **Explore pricing plans**, select **F1 (Free)** under the *Dev/Test* tab, and click **Apply**.
6. Click **Review + Create**, then **Create**. Wait 2 minutes for deployment.

---

## Step 5: Configure Backend App Service Environment Variables

1. Once the App Service is created, open its dashboard in the Azure Portal.
2. In the left-hand navigation pane, select **Settings** -> **Configuration** (or **Environment Variables** in newer portal layouts).
3. Under **Application settings**, click **+ New application setting** to add each of the following:
   *   `PORT` = `8080` (Azure default backend router)
   *   `NODE_ENV` = `production`
   *   `DB_USER` = `cloud_admin`
   *   `DB_PASSWORD` = `SecurePass123!` (Password created in Step 2)
   *   `DB_SERVER` = `expense-tracker-sqlserver-xxxx.database.windows.net` (Found in your database dashboard)
   *   `DB_DATABASE` = `cloud-expense-db`
   *   `DB_PORT` = `1433`
   *   `JWT_SECRET` = `ChooseASecretLongStringForSecurityPurposes`
   *   `JWT_EXPIRES_IN` = `7d`
4. Click **Save** at the top, then click **Continue** to apply settings. This restarts your application with active variables secure in Azure Vault.

---

## Step 6: Provision Azure Static Web Apps (SWA) for Frontend Hosting

1. In the Azure Portal, search for **Static Web Apps** and click on it.
2. Click **+ Create**.
3. Configure details:
   *   **Subscription:** Select subscription.
   *   **Resource Group:** Select `cloud-expense-tracker-rg`.
   *   **Name:** `cloud-expense-tracker-ui`.
   *   **Plan type:** Select **Free: For hobby or personal projects**.
   *   **Region:** Select an available nearby region.
4. Configure **Deployment Details**:
   *   **Source:** Select **GitHub**.
   *   Click **Sign in with GitHub** and authorize Azure to connect.
   *   Select your account name, Repository, and Branch (e.g., `main`).
5. Configure **Build Details**:
   *   **Build Presets:** Select **Custom**.
   *   **App location:** `/frontend` (path where the HTML/CSS/JS resides).
   *   **Api location:** Leave blank (as we are hosting our backend independently on App Service).
   *   **Output location:** Leave blank or enter `.` (since we are using vanilla JS and don't need a build command).
6. Click **Review + Create**, then click **Create**.
7. Azure will automatically establish a CI/CD GitHub Action pipeline inside your repo and host your website to a unique URL (e.g. `wonderful-sea-0abc123.azurestaticapps.net`).
