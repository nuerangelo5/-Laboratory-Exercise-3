import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  AlertCircle,
  CheckCircle2,
  Menu,
  Plus,
  RefreshCw,
  X,
} from 'lucide-react';
import { AuthScreen } from './components/AuthScreen';
import { BorrowModal } from './components/BorrowModal';
import { DashboardView } from './components/DashboardView';
import { DatabaseSetupNotice } from './components/DatabaseSetupNotice';
import { EquipmentHistoryDrawer } from './components/EquipmentHistoryDrawer';
import { EquipmentView } from './components/EquipmentView';
import { SadDocumentationView } from './components/SadDocumentationView';
import { Sidebar } from './components/Sidebar';
import { TransactionsView } from './components/TransactionsView';
import {
  createEquipmentRecord,
  deleteEquipmentRecord,
  fetchEquipmentList,
  fetchExistingStudents,
  fetchTransactionList,
  formatSupabaseError,
  isMissingTableError,
  recordBorrowingTransaction,
  returnBorrowedEquipment,
  supabase,
  updateEquipmentRecord,
} from './lib/supabase';
import type {
  ActiveSection,
  BorrowFormValues,
  BorrowTransactionWithEquipment,
  EffectiveTransactionStatus,
  Equipment,
  EquipmentFormValues,
  ExistingStudent,
  ToastNotice,
} from './types/database';
import { computeDashboardMetrics } from './utils/businessRules';

const SECTION_LABELS: Record<ActiveSection, string> = {
  dashboard: 'Dashboard',
  equipment: 'Equipment Inventory',
  transactions: 'Borrowing & Returns',
  docs: 'SAD Docs & Testing',
};

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [activeSection, setActiveSection] =
    useState<ActiveSection>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Live Supabase data state
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [transactions, setTransactions] = useState<
    BorrowTransactionWithEquipment[]
  >([]);
  const [students, setStudents] = useState<ExistingStudent[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [schemaMissing, setSchemaMissing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Cross-view filters & interactive modals/drawers
  const [equipmentAvailabilityFilter, setEquipmentAvailabilityFilter] =
    useState<'All' | 'Available' | 'Borrowed'>('All');
  const [txStatusFilter, setTxStatusFilter] = useState<
    'All' | EffectiveTransactionStatus
  >('All');

  const [borrowModalOpen, setBorrowModalOpen] = useState(false);
  const [preselectedEquipmentId, setPreselectedEquipmentId] = useState<
    number | null
  >(null);
  const [addEquipmentTrigger, setAddEquipmentTrigger] = useState(0);

  const [historyEquipment, setHistoryEquipment] = useState<Equipment | null>(
    null
  );
  const [historyRefreshToken, setHistoryRefreshToken] = useState(0);
  const [returningId, setReturningId] = useState<number | null>(null);

  const [toasts, setToasts] = useState<ToastNotice[]>([]);

  const pushToast = useCallback(
    (kind: ToastNotice['kind'], title: string, detail?: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, kind, title, detail }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== id));
      }, 4500);
    },
    []
  );

  // 1. Initialize & subscribe to Supabase Auth session (BR-11)
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session ?? null);
        setAuthReady(true);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) {
        setSession(nextSession ?? null);
        setAuthReady(true);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // 2. Fetch live Equipment + Transactions when authenticated
  const loadWorkspaceData = useCallback(async () => {
    if (!session) return;
    setLoadingData(true);
    setLoadError(null);
    try {
      const [equipRows, txRows, studentRows] = await Promise.all([
        fetchEquipmentList(),
        fetchTransactionList(),
        fetchExistingStudents(),
      ]);
      setEquipment(equipRows);
      setTransactions(txRows);
      setStudents(studentRows);
      setSchemaMissing(false);
      setHistoryRefreshToken((prev) => prev + 1);
    } catch (err) {
      if (isMissingTableError(err)) {
        setSchemaMissing(true);
      } else {
        setLoadError(
          formatSupabaseError(
            err,
            'Could not load records from Supabase. Verify your connection and RLS policies.'
          )
        );
      }
    } finally {
      setLoadingData(false);
    }
  }, [session]);

  useEffect(() => {
    if (session) {
      loadWorkspaceData();
    } else {
      setEquipment([]);
      setTransactions([]);
      setStudents([]);
      setSchemaMissing(false);
      setLoadError(null);
    }
  }, [session, loadWorkspaceData]);

  // Keep open EquipmentHistoryDrawer synced with latest equipment state
  const activeHistoryEquipment = useMemo(() => {
    if (!historyEquipment) return null;
    return (
      equipment.find((item) => item.id === historyEquipment.id) ??
      historyEquipment
    );
  }, [equipment, historyEquipment]);

  // Live Dashboard metrics (FR-10)
  const metrics = useMemo(
    () => computeDashboardMetrics(equipment, transactions),
    [equipment, transactions]
  );

  // Handlers: Equipment CRUD
  const handleCreateEquipment = async (values: EquipmentFormValues) => {
    try {
      const created = await createEquipmentRecord(values);
      await loadWorkspaceData();
      pushToast(
        'success',
        'Equipment added',
        `${created.asset_code} · ${created.equipment_name} is now Available.`
      );
    } catch (err) {
      throw new Error(formatSupabaseError(err, 'Failed to add equipment.'));
    }
  };

  const handleUpdateEquipment = async (
    id: number,
    values: EquipmentFormValues
  ) => {
    try {
      const updated = await updateEquipmentRecord(id, values);
      await loadWorkspaceData();
      pushToast(
        'success',
        'Equipment updated',
        `Saved changes for ${updated.asset_code} · ${updated.equipment_name}.`
      );
    } catch (err) {
      throw new Error(formatSupabaseError(err, 'Failed to update equipment.'));
    }
  };

  const handleDeleteEquipment = async (item: Equipment) => {
    try {
      await deleteEquipmentRecord(item.id);
      if (historyEquipment?.id === item.id) {
        setHistoryEquipment(null);
      }
      await loadWorkspaceData();
      pushToast(
        'success',
        'Equipment deleted',
        `Removed ${item.asset_code} · ${item.equipment_name} from inventory.`
      );
    } catch (err) {
      throw new Error(formatSupabaseError(err, 'Failed to delete equipment.'));
    }
  };

  // Handlers: Borrowing & Returning Transactions
  const handleCreateBorrowing = async (values: BorrowFormValues) => {
    if (!session?.user.id) {
      throw new Error('You must be signed in to record a transaction (BR-11).');
    }
    try {
      const created = await recordBorrowingTransaction(values, session.user.id);
      await loadWorkspaceData();
      pushToast(
        'success',
        'Borrowing transaction recorded',
        `${created.equipment?.asset_code ?? 'Item'} assigned to ${created.borrower_name}.`
      );
    } catch (err) {
      throw new Error(
        formatSupabaseError(err, 'Failed to record borrowing transaction.')
      );
    }
  };

  const handleReturnEquipment = async (
    tx: BorrowTransactionWithEquipment
  ): Promise<void> => {
    setReturningId(tx.id);
    try {
      await returnBorrowedEquipment(tx);
      await loadWorkspaceData();
      pushToast(
        'success',
        'Equipment returned',
        `${tx.equipment?.asset_code ?? 'Item'} returned by ${tx.borrower_name} and marked Available.`
      );
    } catch (err) {
      pushToast(
        'error',
        'Unable to process return',
        formatSupabaseError(err, 'Could not complete equipment return.')
      );
    } finally {
      setReturningId(null);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setActiveSection('dashboard');
    setHistoryEquipment(null);
    setBorrowModalOpen(false);
  };

  const handleNavigate = (
    section: ActiveSection,
    presetFilter?: { equipmentAvailability?: string; txStatus?: string }
  ) => {
    if (
      presetFilter?.equipmentAvailability === 'All' ||
      presetFilter?.equipmentAvailability === 'Available' ||
      presetFilter?.equipmentAvailability === 'Borrowed'
    ) {
      setEquipmentAvailabilityFilter(presetFilter.equipmentAvailability);
    }
    if (
      presetFilter?.txStatus === 'All' ||
      presetFilter?.txStatus === 'Borrowed' ||
      presetFilter?.txStatus === 'Returned' ||
      presetFilter?.txStatus === 'Overdue'
    ) {
      setTxStatusFilter(presetFilter.txStatus);
    }
    setActiveSection(section);
  };

  // Initial Auth Boot Screen
  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <p className="font-display text-base font-semibold text-slate-900">
            CampusGear
          </p>
          <p className="text-xs text-slate-500">
            Checking custodian authentication session...
          </p>
        </div>
      </div>
    );
  }

  // Gate entire application behind Supabase Auth (BR-11)
  if (!session) {
    return <AuthScreen onAuthSuccess={() => setActiveSection('dashboard')} />;
  }

  const custodianName =
    (session.user.user_metadata?.full_name as string | undefined) ||
    'Equipment Custodian';
  const custodianEmail = session.user.email ?? 'Authenticated Custodian';

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex">
      {/* Left Navigation Sidebar */}
      <Sidebar
        activeSection={activeSection}
        onSelectSection={(sec) => setActiveSection(sec)}
        userEmail={custodianEmail}
        userName={custodianName}
        equipmentCount={equipment.length}
        overdueCount={metrics.overdueTransactions}
        onLogout={handleLogout}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Right Main Operational Workspace */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Contextual Top Bar (Single row, breadcrumb left, primary CTA right) */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 sticky top-0 z-30 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-100 cursor-pointer shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>
            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-2 text-sm min-w-0"
            >
              <span className="text-slate-500 hidden sm:inline whitespace-nowrap">
                CampusGear
              </span>
              <span
                aria-hidden="true"
                className="text-slate-300 hidden sm:inline"
              >
                /
              </span>
              <h1 className="font-display font-bold text-slate-900 truncate">
                {SECTION_LABELS[activeSection]}
              </h1>
            </nav>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {activeSection === 'equipment' ? (
              <button
                type="button"
                disabled={schemaMissing}
                onClick={() => setAddEquipmentTrigger((c) => c + 1)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Add Equipment
              </button>
            ) : activeSection === 'docs' ? (
              <button
                type="button"
                onClick={loadWorkspaceData}
                disabled={loadingData}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin' : ''}`}
                />
                Sync Supabase
              </button>
            ) : (
              <button
                type="button"
                disabled={schemaMissing}
                onClick={() => {
                  setPreselectedEquipmentId(null);
                  setBorrowModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                New Borrowing
              </button>
            )}
          </div>
        </header>

        {/* Main Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full mx-auto">
          {loadError && !schemaMissing && (
            <div
              role="alert"
              className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex flex-wrap items-center justify-between gap-3 text-sm text-red-800"
            >
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{loadError}</span>
              </div>
              <button
                type="button"
                onClick={loadWorkspaceData}
                className="px-3 py-1.5 text-xs font-semibold bg-white border border-red-200 text-red-800 hover:bg-red-100 rounded-md whitespace-nowrap cursor-pointer"
              >
                Retry Connection
              </button>
            </div>
          )}

          {schemaMissing && activeSection !== 'docs' ? (
            <DatabaseSetupNotice
              onRetry={loadWorkspaceData}
              retrying={loadingData}
            />
          ) : (
            <>
              {activeSection === 'dashboard' && (
                <DashboardView
                  metrics={metrics}
                  equipment={equipment}
                  transactions={transactions}
                  loading={loadingData}
                  returningId={returningId}
                  onNavigate={handleNavigate}
                  onOpenNewBorrow={() => {
                    setPreselectedEquipmentId(null);
                    setBorrowModalOpen(true);
                  }}
                  onOpenAddEquipment={() => {
                    setActiveSection('equipment');
                    setAddEquipmentTrigger((c) => c + 1);
                  }}
                  onReturnEquipment={handleReturnEquipment}
                  onInspectEquipment={(item) => setHistoryEquipment(item)}
                />
              )}

              {activeSection === 'equipment' && (
                <EquipmentView
                  equipment={equipment}
                  loading={loadingData}
                  availabilityFilter={equipmentAvailabilityFilter}
                  onAvailabilityFilterChange={setEquipmentAvailabilityFilter}
                  onCreateEquipment={handleCreateEquipment}
                  onUpdateEquipment={handleUpdateEquipment}
                  onDeleteEquipment={handleDeleteEquipment}
                  onOpenHistory={(item) => setHistoryEquipment(item)}
                  onQuickBorrow={(item) => {
                    setPreselectedEquipmentId(item.id);
                    setBorrowModalOpen(true);
                  }}
                  externalAddTrigger={addEquipmentTrigger}
                />
              )}

              {activeSection === 'transactions' && (
                <TransactionsView
                  transactions={transactions}
                  equipment={equipment}
                  loading={loadingData}
                  statusFilter={txStatusFilter}
                  onStatusFilterChange={setTxStatusFilter}
                  returningId={returningId}
                  onOpenNewBorrow={() => {
                    setPreselectedEquipmentId(null);
                    setBorrowModalOpen(true);
                  }}
                  onReturnEquipment={handleReturnEquipment}
                  onInspectEquipment={(item) => setHistoryEquipment(item)}
                />
              )}

              {activeSection === 'docs' && <SadDocumentationView />}
            </>
          )}
        </main>
      </div>

      {/* Global New Borrowing Modal */}
      <BorrowModal
        open={borrowModalOpen}
        equipment={equipment}
        students={students}
        preselectedEquipmentId={preselectedEquipmentId}
        onClose={() => {
          setBorrowModalOpen(false);
          setPreselectedEquipmentId(null);
        }}
        onSubmit={handleCreateBorrowing}
      />

      {/* Bonus (+5 pts): Live Equipment Borrowing History Drawer */}
      <EquipmentHistoryDrawer
        equipment={activeHistoryEquipment}
        onClose={() => setHistoryEquipment(null)}
        onReturnEquipment={handleReturnEquipment}
        returningId={returningId}
        refreshToken={historyRefreshToken}
      />

      {/* Accessible Toast Notification Stack */}
      {toasts.length > 0 && (
        <div
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
        >
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="pointer-events-auto bg-white border border-slate-200 rounded-xl p-4 shadow-lg flex items-start gap-3"
            >
              {toast.kind === 'error' ? (
                <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-900">
                  {toast.title}
                </p>
                {toast.detail && (
                  <p className="text-xs text-slate-600 mt-0.5">{toast.detail}</p>
                )}
              </div>
              <button
                type="button"
                aria-label="Dismiss notification"
                onClick={() =>
                  setToasts((prev) => prev.filter((item) => item.id !== toast.id))
                }
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
