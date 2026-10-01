# Purchasing Requirement Analysis (ProcurePlan ERP)

Enterprise-grade material consumption forecasting, purchasing requirement planning, safety stock calculation, and inventory optimization dashboard for manufacturing plants and procurement departments.

---

## 1. Key Features

- **Excel / CSV Upload & Multi-Sheet Processing**:
  - Supports `.xlsx`, `.xls`, `.csv` up to 20 MB.
  - Automatic column recognition with synonym dictionary.
  - Interactive column-mapping interface for manual overrides.
  - Non-destructive data cleaning and validation (Valid, Warning, Invalid classifications).
- **Core Purchasing Engine & Explainable Formulas**:
  - **Forecast Monthly Consumption**: Weighted multi-year average (Latest year 50%, Previous year 30%, Older years 20% by default, automatically rebalanced).
  - **Planning Requirement**: `Forecast Monthly Consumption × Planning Period Months`.
  - **Safety Stock Buffer**: `Forecast Monthly Consumption × Safety Stock %`.
  - **Gross Requirement**: `Planning Requirement + Safety Stock`.
  - **Net Purchasing Requirement**: `MAX(0, Gross Requirement - Current Stock - Confirmed Incoming POs)`.
  - Applied rounding increments and Minimum Order Quantity (MOQ).
- **Stock Coverage & Inventory Diagnostics**:
  - **Stock Coverage Days**: `Current Stock / Average Daily Consumption`.
  - Configurable health categories: Critical (<7 days), Low (7–15 days), Normal (15–45 days), Excess (>45 days).
  - **Lead-Time Demand**: `Daily Consumption × Lead Time Days`.
  - **Reorder Point (ROP)**: `Lead-Time Demand + Safety Stock`.
- **Purchasing Priority Classification**:
  - Immediate, High, Medium, Low, No Purchase Required based on stock coverage days and ROP triggers.
- **Analytical 20-Column Table**:
  - Material Code, Name, Category, UOM, Current Stock, Avg Monthly, Max Monthly, Min Monthly, Latest Year, YoY Growth %, Forecast, Safety Stock, Planning Req, Gross Req, Incoming Qty, Net Purchase Req, Stock Coverage, Lead Time, ROP, Purchasing Priority.
  - Real-time column sorting, category/priority/coverage filtering, search, column visibility toggler, and pagination.
- **Consumption Analytics (Yearly & Monthly)**:
  - Multi-year consumption comparisons and YoY growth percentages.
  - 12-month January–December matrix grid with seasonality curves.
- **What-If Scenario Simulator**:
  - Test assumptions (Planning months, Safety stock %, Market demand surge %, Lead time) and save named scenarios to Firestore.
- **Comprehensive Reporting & Export**:
  - **Excel**: Full 9-sheet management workbook with formatted tables and formulas.
  - **PDF**: Executive-ready procurement report generated client-side via jsPDF.
  - **CSV**: Downloadable issue audit logs and data quality reports.
- **Instant Demo Mode**:
  - 1-click load of multi-year industrial chemical consumption data (Sodium Sulphate, Soda Ash, Hydrogen Peroxide, Caustic Soda, Acetic Acid, Sodium Chlorite).

---

## 2. Technology Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Spreadsheet Processing**: SheetJS (XLSX)
- **PDF Generation**: jsPDF + jsPDF-AutoTable
- **Icons**: Lucide React
- **Database & Auth**: Firebase Firestore & Firebase Authentication
- **Storage**: Firebase Cloud Storage
- **Deployment**: Vercel ready

---

## 3. Firebase Configuration & Security

The project uses Firebase configuration in `firebase-applet-config.json` and client-side environment variables:

```env
VITE_FIREBASE_API_KEY="..."
VITE_FIREBASE_AUTH_DOMAIN="..."
VITE_FIREBASE_PROJECT_ID="..."
VITE_FIREBASE_STORAGE_BUCKET="..."
VITE_FIREBASE_MESSAGING_SENDER_ID="..."
VITE_FIREBASE_APP_ID="..."
```

### Firestore Security Rules
Rules enforce Attribute-Based Access Control (ABAC), strict document schema validation, and prevent unauthorized cross-tenant reads or writes. See `firestore.rules` for full details.

---

## 4. Local Development

```bash
# Install dependencies
npm install

# Start Vite development server
npm run dev

# Build production bundle
npm run build
```

---

## 5. Deployment to Vercel

1. Push repository to GitHub or GitLab.
2. In Vercel, click **New Project** and import the repository.
3. Framework Preset: **Vite**.
4. Build Command: `npm run build`.
5. Output Directory: `dist`.
6. Add the Firebase environment variables in the Vercel project settings.
7. Deploy.
