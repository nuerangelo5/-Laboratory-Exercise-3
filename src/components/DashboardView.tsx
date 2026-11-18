import React, { useMemo } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  CornerDownLeft,
  Plus,
} from 'lucide-react';
import type {
  ActiveSection,
  BorrowTransactionWithEquipment,
  DashboardMetrics,
  Equipment,
} from '../types/database';
import {
  formatDisplayDate,
  getDaysOverdue,
  getEffectiveStatus,
} from '../utils/businessRules';

interface DashboardViewProps {
  metrics: DashboardMetrics;
  equipment: Equipment[];
  transactions: BorrowTransactionWithEquipment[];
  loading: boolean;
  returningId: number | null;
  onNavigate: (
    section: ActiveSection,
    presetFilter?: { equipmentAvailability?: string; txStatus?: string }
  ) => void;
  onOpenNewBorrow: () => void;
  onOpenAddEquipment: () => void;
  onReturnEquipment: (tx: BorrowTransactionWithEquipment) => void;
  onInspectEquipment: (item: Equipment) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  metrics,
  equipment,
  transactions,
  loading,
  returningId,
  onNavigate,
  onOpenNewBorrow,
  onOpenAddEquipment,
  onReturnEquipment,
  onInspectEquipment,
}) => {
  const overdueTransactions = useMemo(
    () =>
      transactions
        .filter((tx) => getEffectiveStatus(tx) === 'Overdue')
        .sort((a, b) => a.due_date.localeCompare(b.due_date)),
    [transactions]
  );

  const recentTransactions = useMemo(
    () => transactions.slice(0, 6),
    [transactions]
  );

  const categorySummary = useMemo(() => {
    const map = new Map<
      string,
      { category: string; total: number; available: number; borrowed: number }
    >();
    for (const item of equipment) {
      const entry = map.get(item.category) ?? {
        category: item.category,
        total: 0,
        available: 0,
        borrowed: 0,
      };
      entry.total += 1;
      if (item.availability === 'Available') {
        entry.available += 1;
      } else {
        entry.borrowed += 1;
      }
      map.set(item.category, entry);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [equipment]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-5 bg-white border border-slate-200 rounded-xl divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} className="p-5 space-y-2.5 animate-pulse">
              <div className="h-3 w-24 bg-slate-200 rounded" />
              <div className="h-8 w-14 bg-slate-200 rounded" />
              <div className="h-3 w-28 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
        <div className="h-64 bg-white border border-slate-200 rounded-xl animate-pulse" />
      </div>
    );
  }

  const kpiCells = [
    {
      label: 'Total Equipment',
      value: metrics.totalEquipment,
      subtext: 'Registered lab assets',
      tone: 'text-slate-900',
      onClick: () =>
        onNavigate('equipment', { equipmentAvailability: 'All' }),
    },
    {
      label: 'Available',
      value: metrics.availableEquipment,
      subtext: 'Ready for borrowing',
      tone: 'text-emerald-700',
      onClick: () =>
        onNavigate('equipment', { equipmentAvailability: 'Available' }),
    },
    {
      label: 'Borrowed',
      value: metrics.borrowedEquipment,
      subtext: 'Currently checked out',
      tone: 'text-amber-700',
      onClick: () =>
        onNavigate('equipment', { equipmentAvailability: 'Borrowed' }),
    },
    {
      label: 'Returned Transactions',
      value: metrics.returnedTransactions,
      subtext: 'Completed returns',
      tone: 'text-slate-900',
      onClick: () => onNavigate('transactions', { txStatus: 'Returned' }),
    },
    {
      label: 'Overdue',
      value: metrics.overdueTransactions,
      subtext:
        metrics.overdueTransactions > 0
          ? 'Past due date (BR-09)'
          : 'No overdue loans',
      tone: metrics.overdueTransactions > 0 ? 'text-red-700' : 'text-slate-900',
      onClick: () => onNavigate('transactions', { txStatus: 'Overdue' }),
    },
  ];

  return (
    <div className="space-y-8">
      {/* KPI Ledger Band (Single-elevation, zero nested card clutter) */}
      <section aria-label="Dashboard summary metrics">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 bg-white border border-slate-200 rounded-xl overflow-hidden divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
          {kpiCells.map((kpi) => (
            <button
              key={kpi.label}
              type="button"
              onClick={kpi.onClick}
              className="p-5 text-left hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 cursor-pointer"
            >
              <p className="text-xs font-medium text-slate-600">{kpi.label}</p>
              <p
                className={`mt-2 font-mono text-3xl font-semibold tabular-nums tracking-tight ${kpi.tone}`}
              >
                {kpi.value}
              </p>
              <p className="mt-1.5 text-xs text-slate-500">{kpi.subtext}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Primary Operational Row: Overdue Monitoring Queue + Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Overdue Action Queue (Dominant Focal Anchor) */}
        <section className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">
                Overdue Return Queue
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Transactions past their expected due date and not yet returned
                (BR-09)
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('transactions', { txStatus: 'Overdue' })}
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900 whitespace-nowrap shrink-0 cursor-pointer"
            >
              View all
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {overdueTransactions.length === 0 ? (
            <div className="px-6 py-10 text-center space-y-2">
              <CheckCircle2 className="w-6 h-6 text-emerald-700 mx-auto" />
              <p className="text-sm font-medium text-slate-900">
                All borrowed equipment is within schedule
              </p>
              <p className="text-xs text-slate-500">
                Overdue transactions are automatically flagged when today&apos;s
                date passes the due date.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                    <th className="py-2.5 px-6">Equipment</th>
                    <th className="py-2.5 px-4">Borrower</th>
                    <th className="py-2.5 px-4">Due Date</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {overdueTransactions.map((tx) => {
                    const daysLate = getDaysOverdue(tx.due_date);
                    const isReturning = returningId === tx.id;
                    return (
                      <tr
                        key={tx.id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="py-3 px-6">
                          <p className="font-medium text-slate-900">
                            {tx.equipment?.equipment_name ?? 'Unknown Item'}
                          </p>
                          <p className="text-xs font-mono text-slate-500">
                            {tx.equipment?.asset_code ?? `#${tx.equipment_id}`}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-slate-900 font-medium">
                            {tx.borrower_name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {tx.borrower_type} · {tx.department}
                          </p>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs tabular-nums text-slate-700 whitespace-nowrap">
                          {formatDisplayDate(tx.due_date)}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            Overdue · {daysLate}d late
                          </span>
                        </td>
                        <td className="py-3 px-6 text-right whitespace-nowrap">
                          <button
                            type="button"
                            disabled={isReturning}
                            onClick={() => onReturnEquipment(tx)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-md transition-colors whitespace-nowrap cursor-pointer"
                          >
                            <CornerDownLeft className="w-3.5 h-3.5" />
                            {isReturning ? 'Returning...' : 'Return Equipment'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Category Availability Breakdown */}
        <section className="lg:col-span-4 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">
                Inventory by Category
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Available vs. total registered units
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenAddEquipment}
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900 whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Item
            </button>
          </div>

          {categorySummary.length === 0 ? (
            <div className="p-6 text-center space-y-3">
              <p className="text-sm text-slate-600">No equipment registered.</p>
              <button
                type="button"
                onClick={onOpenAddEquipment}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer"
              >
                Add First Equipment
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-slate-200">
              {categorySummary.map((row) => {
                const pct =
                  row.total > 0
                    ? Math.round((row.available / row.total) * 100)
                    : 0;
                return (
                  <li key={row.category} className="px-5 py-3 space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-800 truncate">
                        {row.category}
                      </span>
                      <span className="font-mono text-xs tabular-nums text-slate-600 shrink-0">
                        <span className="text-emerald-700 font-semibold">
                          {row.available}
                        </span>{' '}
                        / {row.total} available
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-700 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Recent Borrowing Transactions Ledger */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">
              Recent Borrowing Transactions
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Latest checkouts and returns across college departments
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onOpenNewBorrow}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              New Borrowing
            </button>
            <button
              type="button"
              onClick={() => onNavigate('transactions', { txStatus: 'All' })}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-slate-950 whitespace-nowrap cursor-pointer"
            >
              All transactions
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="px-6 py-10 text-center space-y-3">
            <p className="text-sm font-medium text-slate-900">
              No borrowing transactions recorded yet
            </p>
            <p className="text-xs text-slate-500">
              Record your first borrowing transaction to monitor due dates and
              returns.
            </p>
            <button
              type="button"
              onClick={onOpenNewBorrow}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Record Borrowing
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <th className="py-2.5 px-6">Asset Code</th>
                  <th className="py-2.5 px-4">Equipment</th>
                  <th className="py-2.5 px-4">Borrower</th>
                  <th className="py-2.5 px-4">Borrowed</th>
                  <th className="py-2.5 px-4">Due Date</th>
                  <th className="py-2.5 px-6">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {recentTransactions.map((tx) => {
                  const status = getEffectiveStatus(tx);
                  const matchedEquipment = equipment.find(
                    (e) => e.id === tx.equipment_id
                  );
                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3 px-6 font-mono text-xs font-semibold text-slate-700 whitespace-nowrap">
                        {tx.equipment?.asset_code ?? `#${tx.equipment_id}`}
                      </td>
                      <td className="py-3 px-4">
                        {matchedEquipment ? (
                          <button
                            type="button"
                            onClick={() => onInspectEquipment(matchedEquipment)}
                            className="font-medium text-slate-900 hover:text-blue-700 hover:underline text-left cursor-pointer"
                          >
                            {tx.equipment?.equipment_name ?? 'Unknown Item'}
                          </button>
                        ) : (
                          <span className="font-medium text-slate-900">
                            {tx.equipment?.equipment_name ?? 'Unknown Item'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-slate-900">{tx.borrower_name}</span>
                        <span className="text-xs text-slate-500">
                          {' '}
                          · {tx.borrower_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs tabular-nums text-slate-600 whitespace-nowrap">
                        {formatDisplayDate(tx.date_borrowed)}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs tabular-nums text-slate-600 whitespace-nowrap">
                        {formatDisplayDate(tx.due_date)}
                      </td>
                      <td className="py-3 px-6 whitespace-nowrap text-xs font-semibold">
                        {status === 'Returned' && (
                          <span className="inline-flex items-center gap-1.5 text-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Returned
                          </span>
                        )}
                        {status === 'Borrowed' && (
                          <span className="inline-flex items-center gap-1.5 text-amber-700">
                            <Clock className="w-3.5 h-3.5" />
                            Borrowed
                          </span>
                        )}
                        {status === 'Overdue' && (
                          <span className="inline-flex items-center gap-1.5 text-red-700">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Overdue
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
