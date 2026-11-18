import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  CornerDownLeft,
  Plus,
  Search,
} from 'lucide-react';
import type {
  BorrowTransactionWithEquipment,
  EffectiveTransactionStatus,
  Equipment,
} from '../types/database';
import {
  formatDisplayDate,
  getDaysOverdue,
  getEffectiveStatus,
  getTodayIsoDate,
} from '../utils/businessRules';

interface TransactionsViewProps {
  transactions: BorrowTransactionWithEquipment[];
  equipment: Equipment[];
  loading: boolean;
  statusFilter: 'All' | EffectiveTransactionStatus;
  onStatusFilterChange: (value: 'All' | EffectiveTransactionStatus) => void;
  returningId: number | null;
  onOpenNewBorrow: () => void;
  onReturnEquipment: (tx: BorrowTransactionWithEquipment) => Promise<void>;
  onInspectEquipment: (item: Equipment) => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  equipment,
  loading,
  statusFilter,
  onStatusFilterChange,
  returningId,
  onOpenNewBorrow,
  onReturnEquipment,
  onInspectEquipment,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmReturnTx, setConfirmReturnTx] =
    useState<BorrowTransactionWithEquipment | null>(null);

  const counts = useMemo(() => {
    let borrowed = 0;
    let returned = 0;
    let overdue = 0;
    for (const tx of transactions) {
      const effective = getEffectiveStatus(tx);
      if (effective === 'Borrowed') borrowed += 1;
      else if (effective === 'Returned') returned += 1;
      else if (effective === 'Overdue') overdue += 1;
    }
    return { all: transactions.length, borrowed, returned, overdue };
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return transactions.filter((tx) => {
      const effectiveStatus = getEffectiveStatus(tx);
      if (statusFilter !== 'All' && effectiveStatus !== statusFilter) {
        return false;
      }
      if (query) {
        const borrowerMatch = tx.borrower_name.toLowerCase().includes(query);
        const deptMatch = tx.department.toLowerCase().includes(query);
        const equipNameMatch = (tx.equipment?.equipment_name ?? '')
          .toLowerCase()
          .includes(query);
        const assetCodeMatch = (tx.equipment?.asset_code ?? '')
          .toLowerCase()
          .includes(query);
        return borrowerMatch || deptMatch || equipNameMatch || assetCodeMatch;
      }
      return true;
    });
  }, [transactions, statusFilter, searchQuery]);

  const handleConfirmReturn = async () => {
    if (!confirmReturnTx) return;
    await onReturnEquipment(confirmReturnTx);
    setConfirmReturnTx(null);
  };

  return (
    <div className="space-y-6">
      {/* Toolbar: Search + Segmented Status Filter + New Borrowing CTA */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search borrower, equipment name, or asset code..."
              aria-label="Search transactions by borrower, equipment name, or asset code"
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            />
          </div>

          <div
            role="group"
            aria-label="Filter transactions by status"
            className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg self-start sm:self-auto"
          >
            {(
              [
                { value: 'All', label: `All (${counts.all})` },
                { value: 'Borrowed', label: `Borrowed (${counts.borrowed})` },
                { value: 'Returned', label: `Returned (${counts.returned})` },
                { value: 'Overdue', label: `Overdue (${counts.overdue})` },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onStatusFilterChange(opt.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 tabular-nums cursor-pointer ${
                  statusFilter === opt.value
                    ? opt.value === 'Overdue'
                      ? 'bg-white text-red-700 shadow-xs font-semibold'
                      : 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenNewBorrow}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          New Borrowing
        </button>
      </div>

      {/* Transactions Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-3.5 border-b border-slate-200 flex items-center justify-between gap-4">
          <p className="text-xs text-slate-600">
            Showing{' '}
            <span className="font-mono font-semibold text-slate-900 tabular-nums">
              {filteredTransactions.length}
            </span>{' '}
            of{' '}
            <span className="font-mono font-semibold text-slate-900 tabular-nums">
              {transactions.length}
            </span>{' '}
            borrowing transactions · Overdue status evaluated live against{' '}
            <span className="font-mono">{formatDisplayDate(getTodayIsoDate())}</span>
          </p>
          {(searchQuery || statusFilter !== 'All') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                onStatusFilterChange('All');
              }}
              className="text-xs font-medium text-blue-700 hover:text-blue-900 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Reset filters
            </button>
          )}
        </div>

        {loading ? (
          <div className="divide-y divide-slate-200">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="px-6 py-3.5 flex items-center gap-4 animate-pulse"
              >
                <div className="h-4 w-24 bg-slate-200 rounded" />
                <div className="h-4 flex-1 bg-slate-200 rounded" />
                <div className="h-4 w-28 bg-slate-100 rounded" />
                <div className="h-4 w-20 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="px-6 py-14 text-center space-y-3">
            <p className="text-sm font-semibold text-slate-900">
              {transactions.length === 0
                ? 'No borrowing transactions recorded yet'
                : 'No transactions match your search or status filter'}
            </p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {transactions.length === 0
                ? 'Record a borrowing transaction when a student, faculty member, or staff borrows laboratory equipment.'
                : 'Try clearing your search input or selecting All in the status filter.'}
            </p>
            {transactions.length === 0 && (
              <button
                type="button"
                onClick={onOpenNewBorrow}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Record First Borrowing
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <th className="py-2.5 px-6">Equipment</th>
                  <th className="py-2.5 px-4">Borrower</th>
                  <th className="py-2.5 px-4">Borrowed</th>
                  <th className="py-2.5 px-4">Due Date</th>
                  <th className="py-2.5 px-4">Returned</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredTransactions.map((tx) => {
                  const status = getEffectiveStatus(tx);
                  const daysLate =
                    status === 'Overdue' ? getDaysOverdue(tx.due_date) : 0;
                  const isReturning = returningId === tx.id;
                  const matchedEquip = equipment.find(
                    (e) => e.id === tx.equipment_id
                  );

                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3 px-6">
                        {matchedEquip ? (
                          <button
                            type="button"
                            onClick={() => onInspectEquipment(matchedEquip)}
                            className="font-medium text-slate-900 hover:text-blue-700 hover:underline text-left cursor-pointer"
                          >
                            {tx.equipment?.equipment_name ?? 'Unknown Item'}
                          </button>
                        ) : (
                          <p className="font-medium text-slate-900">
                            {tx.equipment?.equipment_name ?? 'Unknown Item'}
                          </p>
                        )}
                        <p className="text-xs font-mono text-slate-500">
                          {tx.equipment?.asset_code ?? `#${tx.equipment_id}`}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-slate-900">
                          {tx.borrower_name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {tx.borrower_type} · {tx.department}
                        </p>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs tabular-nums text-slate-600 whitespace-nowrap">
                        {formatDisplayDate(tx.date_borrowed)}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs tabular-nums text-slate-700 whitespace-nowrap">
                        {formatDisplayDate(tx.due_date)}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs tabular-nums text-slate-600 whitespace-nowrap">
                        {formatDisplayDate(tx.date_returned)}
                      </td>
                      <td className="py-3 px-4 text-xs font-semibold whitespace-nowrap">
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
                            Overdue · {daysLate}d late
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-6 text-right whitespace-nowrap">
                        {status === 'Returned' ? (
                          <span className="text-xs text-slate-400">
                            Completed
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={isReturning}
                            onClick={() => setConfirmReturnTx(tx)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-md transition-colors whitespace-nowrap cursor-pointer"
                          >
                            <CornerDownLeft className="w-3.5 h-3.5" />
                            {isReturning ? 'Returning...' : 'Return Equipment'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Return Equipment Confirmation Dialog */}
      {confirmReturnTx && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="return-modal-title"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <h3
                  id="return-modal-title"
                  className="font-display text-base font-bold text-slate-900"
                >
                  Confirm Equipment Return
                </h3>
                <p className="text-sm text-slate-600">
                  Mark{' '}
                  <span className="font-semibold text-slate-900">
                    {confirmReturnTx.equipment?.equipment_name ?? 'this item'}
                  </span>{' '}
                  (
                  <span className="font-mono text-xs">
                    {confirmReturnTx.equipment?.asset_code ??
                      `#${confirmReturnTx.equipment_id}`}
                  </span>
                  ) borrowed by{' '}
                  <span className="font-semibold text-slate-900">
                    {confirmReturnTx.borrower_name}
                  </span>{' '}
                  as returned?
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1 text-xs text-slate-700">
                <p>
                  Return Date:{' '}
                  <span className="font-mono font-semibold text-slate-900">
                    {formatDisplayDate(getTodayIsoDate())}
                  </span>
                </p>
                <p>
                  Transaction Status:{' '}
                  <span className="font-semibold text-emerald-700">
                    Returned
                  </span>{' '}
                  (cannot be returned again — BR-12)
                </p>
                <p>
                  Equipment Availability:{' '}
                  <span className="font-semibold text-emerald-700">
                    Available
                  </span>{' '}
                  (BR-08)
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setConfirmReturnTx(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={returningId === confirmReturnTx.id}
                  onClick={handleConfirmReturn}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                >
                  <CornerDownLeft className="w-3.5 h-3.5" />
                  {returningId === confirmReturnTx.id
                    ? 'Processing...'
                    : 'Confirm Return'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
