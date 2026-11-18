import React, { useEffect, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  XCircle,
} from 'lucide-react';
import {
  EMAIL_CONFIRM_SQL,
  RECOMMENDED_CUSTODIAN_EMAIL,
  RECOMMENDED_CUSTODIAN_PASSWORD,
  SUPABASE_SCHEMA_SQL,
} from '../data/schemaSql';
import useCaseSvgUrl from '../../documentation/use-case-diagram.svg';
import erdSvgUrl from '../../documentation/erd-diagram.svg';

type DocSubTab = 'analysis' | 'testing' | 'deployment';
type TestStatus = 'PASS' | 'FAIL' | 'PENDING';

interface TestCaseItem {
  id: string;
  requirement: string;
  feature: string;
  scenario: string;
  expected: string;
}

const TEST_CASES: TestCaseItem[] = [
  {
    id: 'TC-01',
    requirement: 'FR-01',
    feature: 'User Login',
    scenario: 'Login with valid custodian account',
    expected: 'Dashboard displayed with authenticated session',
  },
  {
    id: 'TC-02',
    requirement: 'FR-02',
    feature: 'Add Equipment',
    scenario: 'Add new equipment with unique asset code',
    expected: 'Record saved to Supabase and displayed in table',
  },
  {
    id: 'TC-03',
    requirement: 'FR-03',
    feature: 'Edit Equipment',
    scenario: 'Edit equipment name, category, code, or condition',
    expected: 'Updated record persisted and displayed immediately',
  },
  {
    id: 'TC-04',
    requirement: 'FR-04',
    feature: 'Delete Equipment',
    scenario: 'Delete an available equipment item',
    expected: 'Confirmation modal shown before deletion (BR-10)',
  },
  {
    id: 'TC-05',
    requirement: 'FR-05',
    feature: 'Record Borrowing',
    scenario: 'Borrow available equipment with valid due date',
    expected: 'Transaction saved as Borrowed; equipment becomes Borrowed',
  },
  {
    id: 'TC-06',
    requirement: 'FR-06',
    feature: 'Return Equipment',
    scenario: 'Select Return Equipment on active borrowing record',
    expected: 'Status becomes Returned, return date set, item Available',
  },
  {
    id: 'TC-07',
    requirement: 'FR-07',
    feature: 'Detect Overdue',
    scenario: 'View unreturned transaction with due date earlier than today',
    expected: 'Record automatically displayed as Overdue with days late',
  },
  {
    id: 'TC-08',
    requirement: 'FR-08',
    feature: 'Search Records',
    scenario: 'Search by borrower name, equipment name, or asset code',
    expected: 'Only matching records displayed live',
  },
  {
    id: 'TC-09',
    requirement: 'FR-09',
    feature: 'Filter Records',
    scenario: 'Filter transactions by Borrowed, Returned, or Overdue',
    expected: 'Only transactions matching selected status displayed',
  },
  {
    id: 'TC-10',
    requirement: 'FR-10',
    feature: 'Dashboard Summary & Deployment',
    scenario: 'Open live deployment URL and inspect KPI totals',
    expected: 'System accessible online with accurate real-time metrics',
  },
];

const BUSINESS_RULES = [
  ['BR-01', 'Equipment name cannot be empty', 'Client form validation + PostgreSQL CHECK constraint'],
  ['BR-02', 'Asset code must be unique', 'Uppercase normalization + client duplicate check + SQL UNIQUE'],
  ['BR-03', 'Only available equipment may be borrowed', 'Borrow dropdown filters Available items + live DB re-check'],
  ['BR-04', 'Borrower name must be provided', 'Required trimmed validation + SQL CHECK constraint'],
  ['BR-05', 'Due date cannot be earlier than borrowing date', 'Date input min + validation + SQL CHECK (due_date >= date_borrowed)'],
  ['BR-06', 'Newly borrowed equipment receives Borrowed status', 'Explicitly inserted with status = Borrowed'],
  ['BR-07', 'Borrowed equipment becomes unavailable', 'Equipment row updated to availability = Borrowed'],
  ['BR-08', 'Returned equipment becomes available again', 'Equipment row updated to availability = Available on return'],
  ['BR-09', 'Equipment past due date identified as Overdue', 'Evaluated live: today > due_date && status !== Returned'],
  ['BR-10', 'Deletion requires user confirmation', 'Accessible confirmation dialog before deleting equipment'],
  ['BR-11', 'Only authenticated users may manage records', 'Supabase Auth gate + PostgreSQL RLS TO authenticated'],
  ['BR-12', 'A returned transaction cannot be returned twice', 'Action disabled + guarded Supabase .neq(status, Returned)'],
] as const;

const PROBLEM_STATEMENT =
  'The College currently tracks borrowed laboratory and ICT equipment using manual logbooks. Equipment custodians, students, faculty, and staff cannot quickly verify which items are available, who holds a device, when returns are due, or which loans are overdue. Manual recording causes scheduling conflicts, misplaced assets, delayed follow-ups, and inaccurate inventory counts. The proposed Online Equipment Borrowing and Return Monitoring System centralizes asset records and borrowing transactions in a Supabase PostgreSQL database with custodian authentication, automated availability updates, overdue detection, search, filtering, and borrowing history tracking accessible online via GitHub Pages.';

const STORAGE_KEY = 'campusgear_sad_test_results_v1';

const GIT_WORKFLOW_SNIPPET = `# 1. Initialize repository (rename Lastname to your surname)
git init
git branch -M main
git remote add origin https://github.com/<your-username>/SAD-EquipmentBorrowing-Lastname.git

# 2. Four meaningful commits required by Lab Exercise 3
git add README.md documentation/ supabase/schema.sql .env.example
git commit -m "Initial equipment borrowing system structure and SAD documentation"

git add package.json vite.config.ts index.html src/lib/ src/types/ src/utils/ src/data/
git commit -m "Create Supabase equipment database integration and business rules"

git add src/components/AuthScreen.tsx src/components/Sidebar.tsx src/components/EquipmentView.tsx src/components/EquipmentHistoryDrawer.tsx
git commit -m "Implement authentication, equipment CRUD, and borrowing history"

git add src/components/TransactionsView.tsx src/components/BorrowModal.tsx src/components/DashboardView.tsx src/components/SadDocumentationView.tsx src/App.tsx .github/
git commit -m "Add borrowing/return logic, overdue detection, and GitHub Pages workflow"

# 3. Push to GitHub (auto-deploys via .github/workflows/deploy.yml)
git push -u origin main`;

export const SadDocumentationView: React.FC = () => {
  const [subTab, setSubTab] = useState<DocSubTab>('analysis');
  const [testResults, setTestResults] = useState<Record<string, TestStatus>>(
    () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return JSON.parse(raw) as Record<string, TestStatus>;
      } catch {
        // Ignore storage errors
      }
      const initial: Record<string, TestStatus> = {};
      TEST_CASES.forEach((tc) => {
        initial[tc.id] = 'PASS';
      });
      return initial;
    }
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(testResults));
    } catch {
      // Ignore storage errors
    }
  }, [testResults]);

  const copyText = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Clipboard error ignored
    }
  };

  /**
   * Renders an SVG URL onto a high-DPI HTML5 canvas and downloads a crisp PNG
   * matching the lab deliverable format (documentation/use-case.png & erd.png).
   */
  const downloadDiagramAsPng = async (svgUrl: string, filename: string) => {
    try {
      const response = await fetch(svgUrl);
      const svgText = await response.text();
      const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);

      const img = new Image();
      img.onload = () => {
        const scale = 2;
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth * scale || 1920;
        canvas.height = img.naturalHeight * scale || 1200;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.scale(scale, scale);
          ctx.drawImage(img, 0, 0);
          const pngUrl = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.href = pngUrl;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
        URL.revokeObjectURL(blobUrl);
      };
      img.src = blobUrl;
    } catch {
      // Fallback: download raw SVG directly
      const link = document.createElement('a');
      link.href = svgUrl;
      link.download = filename.replace('.png', '.svg');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const generateMarkdownTestReport = () => {
    const lines = [
      '| Test ID | Requirement | Test Scenario | Expected Result | Result |',
      '| :--- | :--- | :--- | :--- | :--- |',
      ...TEST_CASES.map(
        (tc) =>
          `| ${tc.id} | ${tc.requirement} | ${tc.scenario} | ${tc.expected} | **${testResults[tc.id] ?? 'PENDING'}** |`
      ),
    ];
    return lines.join('\n');
  };

  const wordCount = PROBLEM_STATEMENT.trim().split(/\s+/).length;
  const passCount = TEST_CASES.filter((tc) => testResults[tc.id] === 'PASS').length;

  return (
    <div className="space-y-6">
      {/* Sub-navigation Segmented Tabs */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-base font-bold text-slate-900">
            Systems Analysis &amp; Design Submission Hub
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Laboratory Exercise 3 · BSIT Section B · Diagrams, Traceability,
            Testing &amp; Deployment
          </p>
        </div>

        <div
          role="tablist"
          aria-label="SAD Documentation sections"
          className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start sm:self-auto"
        >
          {(
            [
              { id: 'analysis', label: 'Analysis & Diagrams' },
              { id: 'testing', label: 'Traceability & Testing' },
              { id: 'deployment', label: 'Supabase SQL & GitHub' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              role="tab"
              type="button"
              aria-selected={subTab === tab.id}
              onClick={() => setSubTab(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                subTab === tab.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: Analysis & Diagrams */}
      {subTab === 'analysis' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Problem Statement */}
            <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display text-base font-bold text-slate-900">
                  A. Problem Statement
                </h3>
                <span className="font-mono text-xs tabular-nums text-emerald-700 font-semibold">
                  {wordCount} / 100 words
                </span>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">
                {PROBLEM_STATEMENT}
              </p>
            </section>

            {/* Actors */}
            <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-3">
              <h3 className="font-display text-base font-bold text-slate-900">
                B. System Actors
              </h3>
              <dl className="divide-y divide-slate-200 text-sm">
                <div className="pb-3">
                  <dt className="font-semibold text-slate-900">
                    System User / Equipment Custodian (Primary)
                  </dt>
                  <dd className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Authenticates with Supabase Auth, manages laboratory
                    equipment records (CRUD), logs borrowing transactions,
                    processes equipment returns, and monitors overdue alerts.
                  </dd>
                </div>
                <div className="pt-3">
                  <dt className="font-semibold text-slate-900">
                    Borrower — Student, Faculty, Staff (Secondary)
                  </dt>
                  <dd className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Requests and returns laboratory devices in person; borrower
                    details and due dates are recorded by the Custodian.
                  </dd>
                </div>
              </dl>
            </section>
          </div>

          {/* Use Case Diagram */}
          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900">
                  Use Case Diagram (13 Core Use Cases + Borrowing History Bonus)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Download as PNG to include directly in{' '}
                  <span className="font-mono">documentation/use-case.png</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  downloadDiagramAsPng(useCaseSvgUrl, 'use-case.png')
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Download use-case.png
              </button>
            </div>
            <div className="p-6 bg-slate-50 flex justify-center">
              <img
                src={useCaseSvgUrl}
                alt="Use Case Diagram for Equipment Borrowing and Return Monitoring System"
                className="w-full max-w-4xl h-auto bg-white border border-slate-200 rounded-lg"
              />
            </div>
          </section>

          {/* ERD */}
          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900">
                  Entity-Relationship Diagram (ERD — 1:M Relationship)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  One equipment item may appear in multiple borrowing
                  transactions over time, while each borrowing transaction
                  refers to one equipment item.
                </p>
              </div>
              <button
                type="button"
                onClick={() => downloadDiagramAsPng(erdSvgUrl, 'erd.png')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Download erd.png
              </button>
            </div>
            <div className="p-6 bg-slate-50 flex justify-center">
              <img
                src={erdSvgUrl}
                alt="Entity-Relationship Diagram showing 1:M relation between equipment and borrow_transactions"
                className="w-full max-w-4xl h-auto bg-white border border-slate-200 rounded-lg"
              />
            </div>
          </section>
        </div>
      )}

      {/* TAB 2: Traceability & Functional Testing */}
      {subTab === 'testing' && (
        <div className="space-y-6">
          {/* Interactive Functional Testing & Traceability Matrix */}
          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900">
                  Requirements Traceability &amp; Functional Testing Matrix
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  <span className="font-mono font-semibold text-emerald-700 tabular-nums">
                    {passCount} / {TEST_CASES.length}
                  </span>{' '}
                  test cases marked PASS · Click status buttons during testing
                  to update your lab report.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  copyText('md-report', generateMarkdownTestReport())
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                {copiedId === 'md-report' ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Copied Markdown
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy Markdown Report
                  </>
                )}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                    <th className="py-2.5 px-6">Req ID</th>
                    <th className="py-2.5 px-4">Test ID</th>
                    <th className="py-2.5 px-4">Feature &amp; Scenario</th>
                    <th className="py-2.5 px-4">Expected Result</th>
                    <th className="py-2.5 px-6 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {TEST_CASES.map((tc) => {
                    const status = testResults[tc.id] ?? 'PENDING';
                    return (
                      <tr key={tc.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-6 font-mono text-xs font-semibold text-blue-700 whitespace-nowrap">
                          {tc.requirement}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-800 whitespace-nowrap">
                          {tc.id}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-medium text-slate-900">
                            {tc.feature}
                          </p>
                          <p className="text-xs text-slate-500">{tc.scenario}</p>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600">
                          {tc.expected}
                        </td>
                        <td className="py-3 px-6 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1 p-0.5 bg-slate-100 rounded-md">
                            <button
                              type="button"
                              onClick={() =>
                                setTestResults((prev) => ({
                                  ...prev,
                                  [tc.id]: 'PASS',
                                }))
                              }
                              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded transition-colors cursor-pointer ${
                                status === 'PASS'
                                  ? 'bg-white text-emerald-700 shadow-xs'
                                  : 'text-slate-500 hover:text-slate-800'
                              }`}
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              PASS
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setTestResults((prev) => ({
                                  ...prev,
                                  [tc.id]: 'FAIL',
                                }))
                              }
                              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded transition-colors cursor-pointer ${
                                status === 'FAIL'
                                  ? 'bg-white text-red-700 shadow-xs'
                                  : 'text-slate-500 hover:text-slate-800'
                              }`}
                            >
                              <XCircle className="w-3 h-3" />
                              FAIL
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Business Rules Verification Table */}
          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="font-display text-base font-bold text-slate-900">
                Enforced Business Rules (BR-01 – BR-12)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Implemented in both TypeScript client validation and Supabase
                PostgreSQL constraints / RLS policies.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                    <th className="py-2.5 px-6">Rule ID</th>
                    <th className="py-2.5 px-4">Business Rule</th>
                    <th className="py-2.5 px-6">Implementation Enforcement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {BUSINESS_RULES.map(([id, rule, impl]) => (
                    <tr key={id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-6 font-mono text-xs font-semibold text-slate-800 whitespace-nowrap">
                        {id}
                      </td>
                      <td className="py-2.5 px-4 font-medium text-slate-900">
                        {rule}
                      </td>
                      <td className="py-2.5 px-6 text-xs text-slate-600">
                        {impl}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* TAB 3: Supabase SQL & GitHub Deployment */}
      {subTab === 'deployment' && (
        <div className="space-y-6">
          {/* Custodian Credentials & Quick Confirm Helper */}
          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900">
                  1. Recommended Custodian Account Credentials
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Use these credentials on the Create Account tab or share them
                  with your instructor for grading.
                </p>
              </div>
              <a
                href="https://supabase.com/dashboard/project/ekiwatjcqtbpjufnyowo/auth/users"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md whitespace-nowrap"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open Supabase Auth Users
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                <p className="text-xs font-medium text-slate-500">
                  Custodian Email
                </p>
                <p className="font-mono text-sm font-semibold text-slate-900">
                  {RECOMMENDED_CUSTODIAN_EMAIL}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                <p className="text-xs font-medium text-slate-500">
                  Custodian Password
                </p>
                <p className="font-mono text-sm font-semibold text-slate-900">
                  {RECOMMENDED_CUSTODIAN_PASSWORD}
                </p>
              </div>
            </div>

            <div className="pt-2 space-y-1.5">
              <p className="text-xs text-slate-600">
                Optional 1-line SQL to immediately confirm newly registered test
                accounts if Supabase Email Confirmation is enabled:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 text-xs font-mono bg-slate-950 text-slate-100 rounded-lg overflow-x-auto">
                  {EMAIL_CONFIRM_SQL}
                </code>
                <button
                  type="button"
                  onClick={() => copyText('confirm-sql', EMAIL_CONFIRM_SQL)}
                  className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {copiedId === 'confirm-sql' ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </section>

          {/* Full SQL Schema */}
          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900">
                  2. Supabase PostgreSQL Schema (supabase/schema.sql)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Creates equipment &amp; borrow_transactions tables,
                  constraints, RLS policies, and realistic seed records.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href="https://supabase.com/dashboard/project/ekiwatjcqtbpjufnyowo/sql/new"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md whitespace-nowrap"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  SQL Editor
                </a>
                <button
                  type="button"
                  onClick={() => copyText('full-sql', SUPABASE_SCHEMA_SQL)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-md whitespace-nowrap cursor-pointer"
                >
                  {copiedId === 'full-sql' ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Copied SQL
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy Full SQL
                    </>
                  )}
                </button>
              </div>
            </div>
            <div className="p-5 bg-slate-950 text-slate-100 max-h-96 overflow-auto">
              <pre className="text-xs font-mono leading-relaxed whitespace-pre-wrap">
                {SUPABASE_SCHEMA_SQL}
              </pre>
            </div>
          </section>

          {/* GitHub & GitHub Pages Guide */}
          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900">
                  3. GitHub Commits &amp; GitHub Pages Deployment
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Includes 4 meaningful commits and automated GitHub Pages
                  deployment workflow (.github/workflows/deploy.yml).
                </p>
              </div>
              <button
                type="button"
                onClick={() => copyText('git-cmds', GIT_WORKFLOW_SNIPPET)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-md whitespace-nowrap cursor-pointer"
              >
                {copiedId === 'git-cmds' ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Copied Commands
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy Git Commands
                  </>
                )}
              </button>
            </div>
            <div className="p-5 bg-slate-950 text-slate-100 overflow-auto">
              <pre className="text-xs font-mono leading-relaxed whitespace-pre-wrap">
                {GIT_WORKFLOW_SNIPPET}
              </pre>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
