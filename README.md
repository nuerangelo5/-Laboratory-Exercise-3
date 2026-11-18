# CampusGear — Online Equipment Borrowing and Return Monitoring System

**Course:** Systems Analysis and Design (Laboratory Exercise 3 – BSIT Section B)  
**Stack:** React + TypeScript + Tailwind CSS (Static Frontend) · Supabase PostgreSQL & Authentication · GitHub Pages

---

## 1. Problem Statement

The College currently tracks borrowed laboratory and ICT equipment using manual logbooks. Equipment custodians, students, faculty, and staff cannot quickly verify which items are available, who holds a device, when returns are due, or which loans are overdue. Manual recording causes scheduling conflicts, misplaced assets, delayed follow-ups, and inaccurate inventory counts. The proposed Online Equipment Borrowing and Return Monitoring System centralizes asset records and borrowing transactions in a Supabase PostgreSQL database with custodian authentication, automated availability updates, overdue detection, search, filtering, and borrowing history tracking accessible online via GitHub Pages.

*(92 words)*

---

## 2. Actors

| Actor | Role | Interaction |
| :--- | :--- | :--- |
| **System User / Equipment Custodian** | Primary Actor | Logs into the application, manages equipment CRUD, records borrowing transactions, processes returns, monitors overdue loans, and inspects borrowing history. |
| **Borrower (Student, Faculty, Staff)** | Secondary Actor | Requests and returns laboratory equipment in person; borrower details are recorded by the Equipment Custodian. |

---

## 3. System Architecture

```text
INTERNET
   │
   ▼
GitHub Pages (Static Web Bundle: HTML / CSS / JS)
   │
   ▼
Supabase JS Client (@supabase/supabase-js)
   │
   ▼
Supabase Project (ekiwatjcqtbpjufnyowo)
   ├── Supabase Authentication (Email/Password Session + RLS)
   └── Supabase PostgreSQL Database
         ├── public.equipment (1)
         └── public.borrow_transactions (M)
```

---

## 4. Database Schema & Entity-Relationship Diagram (ERD)

See [`documentation/erd-diagram.svg`](documentation/erd-diagram.svg) and [`documentation/use-case-diagram.svg`](documentation/use-case-diagram.svg) (also downloadable as PNG/SVG directly from the **SAD Docs & Testing** tab inside the app).

**Relationship Explanation (1:M):**  
One `equipment` record may appear in multiple `borrow_transactions` over time, while each `borrow_transaction` references exactly one `equipment` item via foreign key `equipment_id -> equipment(id)` and records the authenticated custodian via `user_id -> auth.users(id)`.

---

## 5. Supabase Setup & Default Custodian Credentials

### Step 1: Run the SQL Schema in Supabase
1. Open your Supabase Dashboard (`https://supabase.com/dashboard/project/ekiwatjcqtbpjufnyowo`).
2. Go to **SQL Editor → New Query**.
3. Copy and paste the full contents of [`supabase/schema.sql`](supabase/schema.sql) and click **Run**.
   - Creates `public.equipment` and `public.borrow_transactions` with business rule constraints.
   - Enables Row Level Security (RLS) so only authenticated users can manage records (**BR-11**).
   - Seeds 12 college ICT equipment items plus historical Returned, active Borrowed, and past-due Overdue transactions.

### Step 2: Create Your Custodian Account
Recommended credentials for laboratory demonstration (or use any valid email/password you prefer):
- **Email:** `campusgear.custodian@gmail.com`
- **Password:** `Custodian@2026`

Create the user in **Supabase Dashboard → Authentication → Users → Add user → Create new user** (check **Auto Confirm User** so it bypasses free-tier email rate limits), or disable **Authentication → Providers → Email → Confirm email** and register directly on the app's **Create Account** tab.

---

## 6. Implemented Business Rules (BR-01 – BR-12)

| ID | Business Rule | Enforcement |
| :--- | :--- | :--- |
| **BR-01** | Equipment name cannot be empty | Client validation + PostgreSQL `CHECK` constraint |
| **BR-02** | Asset code must be unique | Uppercase normalization + client pre-check + PostgreSQL `UNIQUE` |
| **BR-03** | Only available equipment may be borrowed | Dropdown filters `availability = 'Available'` + pre-insert verification |
| **BR-04** | Borrower name must be provided | Client validation + PostgreSQL `CHECK` constraint |
| **BR-05** | Due date cannot be earlier than borrowing date | Date input `min` constraint + validation + PostgreSQL `CHECK` |
| **BR-06** | Newly borrowed equipment receives `Borrowed` status | Explicitly written on transaction insert |
| **BR-07** | Borrowed equipment becomes unavailable | Equipment updated to `availability = 'Borrowed'` |
| **BR-08** | Returned equipment becomes available again | Equipment updated to `availability = 'Available'` on return |
| **BR-09** | Past-due unreturned loans identified as `Overdue` | Computed dynamically (`today > due_date && status !== 'Returned'`) |
| **BR-10** | Deletion requires user confirmation | Accessible confirmation dialog required before delete |
| **BR-11** | Only authenticated users may manage records | Supabase Auth gate + PostgreSQL RLS `TO authenticated` |
| **BR-12** | Returned transaction cannot be returned twice | Action disabled on returned records + guarded update check |

---

## 7. Requirements Traceability Matrix

| Requirement | System Feature | Test Case |
| :--- | :--- | :--- |
| **FR-01** | User Login & Session Management | TC-01 |
| **FR-02** | Add Equipment | TC-02 |
| **FR-03** | Edit Equipment | TC-03 |
| **FR-04** | Delete Equipment (with Confirmation) | TC-04 |
| **FR-05** | Record Borrowing Transaction | TC-05 |
| **FR-06** | Return Equipment Function | TC-06 |
| **FR-07** | Overdue Detection | TC-07 |
| **FR-08** | Search Equipment & Transactions | TC-08 |
| **FR-09** | Filter by Availability & Status | TC-09 |
| **FR-10** | Real-Time Dashboard Summary | TC-10 |
| **Bonus (+5)** | Equipment Borrowing History Drawer | Click any equipment item |

---

## 8. Functional Testing Plan

| Test ID | Test Scenario | Expected Result | Status |
| :--- | :--- | :--- | :--- |
| **TC-01** | Login with valid custodian account | Dashboard displayed with KPI counts | PASS |
| **TC-02** | Add new equipment (e.g., `PROJ-003`) | Record saved in Supabase and displayed | PASS |
| **TC-03** | Edit equipment name/condition | Updated values persisted and displayed | PASS |
| **TC-04** | Delete equipment | Confirmation dialog shown before deletion | PASS |
| **TC-05** | Borrow available equipment | Transaction saved as `Borrowed`; item becomes `Borrowed` | PASS |
| **TC-06** | Return borrowed equipment | Status becomes `Returned`, `date_returned` recorded, item `Available` | PASS |
| **TC-07** | View past-due borrowing transaction | Automatically displayed as `Overdue` with days late | PASS |
| **TC-08** | Search by borrower name / asset code | Only matching records displayed | PASS |
| **TC-09** | Filter transactions by `Borrowed` / `Overdue` | Only matching status records displayed | PASS |
| **TC-10** | Open GitHub Pages deployment URL | System accessible live in browser | PASS |

---

## 9. Deploying to GitHub & GitHub Pages

1. Create a repository named `SAD-EquipmentBorrowing-Lastname` (for example, `SAD-EquipmentBorrowing-Santos`).
2. Build and verify locally:
   ```bash
   npm install
   npm run build
   ```
3. Make at least four meaningful commits:
   ```bash
   git init
   git add README.md documentation/ supabase/schema.sql
   git commit -m "Initial equipment borrowing system structure and SAD documentation"

   git add package.json vite.config.ts index.html src/lib/ src/types/ src/utils/
   git commit -m "Create Supabase equipment database integration and business rules"

   git add src/components/AuthScreen.tsx src/components/EquipmentView.tsx src/components/EquipmentHistoryDrawer.tsx
   git commit -m "Implement authentication, equipment CRUD, and borrowing history"

   git add src/components/TransactionsView.tsx src/components/DashboardView.tsx src/components/SadDocumentationView.tsx src/App.tsx
   git commit -m "Implement borrowing/return logic, overdue detection, and deploy configuration"
   ```
4. Push to GitHub and enable **Settings → Pages → GitHub Actions** (or publish the `dist/` folder via `gh-pages`). A ready-to-use `.github/workflows/deploy.yml` workflow is included in this repository so pushing to `main` automatically deploys to `https://<username>.github.io/SAD-EquipmentBorrowing-Lastname/`.
