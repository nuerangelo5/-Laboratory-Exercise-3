import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  CornerDownLeft,
  History,
  X,
} from 'lucide-react';
import {
  fetchEquipmentBorrowingHistory,
  formatSupabaseError,
} from '../lib/supabase';
import type {
  BorrowTransactionWithEquipment,
  Equipment,
} from '../types/database';
import {
  formatDisplayDate,
  getDaysOverdue,
  getEffectiveStatus,
} from '../utils/businessRules';

interface EquipmentHistoryDrawerProps {
  equipment: Equipment | null;
  onClose: () => void;
  onReturnEquipment: (tx: BorrowTransactionWithEquipment) => Promise<void>;
  returningId: number | null;
  refreshToken: number;
}

export const EquipmentHistoryDrawer: React.FC<EquipmentHistoryDrawerProps> = ({
  equipment,
  onClose,
  onReturnEquipment,
  returningId,
  refreshToken,
}) => {
  const [history, setHistory] = useState<BorrowTransactionWithEquipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!equipment) return;
    let active = true;

    const loadHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        const rows = await fetchEquipmentBorrowingHistory(equipment.id);
        if (active) {
          setHistory(rows);
        }
      } catch (err) {
        if (active) {
          setError(
            formatSupabaseError(
              err,
              'Failed to load borrowing history from Supabase.'
            )
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadHistory();
    return () => {
      active = false;
    };
  }, [equipment, refreshToken]);

  if (!equipment) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="history-drawer-title"
    >
      <div
        className="fixed inset-0 bg-slate-950/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className="relative z-10 w-full max-w-lg bg-white border-l border-slate-200 h-full flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-mono font-semibold text-slate-800">
                {equipment.asset_code}
              </span>
              <span aria-hidden="true">·</span>
              <span>{equipment.category}</span>
              <span aria-hidden="true">·</span>
              <span>{equipment.condition}</span>
            </div>
            <h3
              id="history-drawer-title"
              className="mt-1 font-display text-lg font-bold text-slate-900"
            >
              {equipment.equipment_name}
            </h3>
            <p className="mt-1 text-xs font-medium text-slate-600">
              Current Status:{' '}
              <span
                className={
                  equipment.availability === 'Available'
                    ? 'text-emerald-700 font-semibold'
                    : 'text-amber-700 font-semibold'
                }
              >
                {equipment.availability}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close borrowing history drawer"
            className="p-1.5 text-slate-500 hover:text-slate-900 rounded-md hover:bg-slate-100 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Summary Metadata Strip */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
            <History className="w-3.5 h-3.5 text-blue-700" />
            Equipment Borrowing History (Live Supabase Query)
          </span>
          <span className="font-mono tabular-nums font-semibold text-slate-900">
            {history.length} {history.length === 1 ? 'record' : 'records'}
          </span>
        </div>

        {/* History Timeline List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="p-4 border border-slate-200 rounded-lg space-y-2 animate-pulse"
                >
                  <div className="h-4 w-36 bg-slate-200 rounded" />
                  <div className="h-3 w-48 bg-slate-100 rounded" />
                  <div className="h-3 w-32 bg-slate-100 rounded" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
              {error}
            </div>
          ) : history.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <History className="w-6 h-6 text-slate-400 mx-auto" />
              <p className="text-sm font-medium text-slate-900">
                No borrowing history yet
              </p>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Previous and active borrowing transactions for{' '}
                {equipment.asset_code} will appear here automatically.
              </p>
            </div>
          ) : (
            <ol className="divide-y divide-slate-200 border-t border-b border-slate-200">
              {history.map((tx) => {
                const status = getEffectiveStatus(tx);
                const daysLate =
                  status === 'Overdue' ? getDaysOverdue(tx.due_date) : 0;
                const isReturning = returningId === tx.id;

                return (
                  <li key={tx.id} className="py-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {tx.borrower_name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {tx.borrower_type} · {tx.department}
                        </p>
                      </div>

                      <div className="text-xs font-semibold whitespace-nowrap shrink-0">
                        {status === 'Returned' && (
                          <span className="inline-flex items-center gap-1 text-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Returned
                          </span>
                        )}
                        {status === 'Borrowed' && (
                          <span className="inline-flex items-center gap-1 text-amber-700">
                            <Clock className="w-3.5 h-3.5" />
                            Borrowed
                          </span>
                        )}
                        {status === 'Overdue' && (
                          <span className="inline-flex items-center gap-1 text-red-700">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Overdue · {daysLate}d late
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono tabular-nums text-slate-600">
                      <span>Borrowed: {formatDisplayDate(tx.date_borrowed)}</span>
                      <span>Due: {formatDisplayDate(tx.due_date)}</span>
                      {tx.date_returned && (
                        <span className="text-emerald-700">
                          Returned: {formatDisplayDate(tx.date_returned)}
                        </span>
                      )}
                    </div>

                    {status !== 'Returned' && (
                      <div className="pt-1">
                        <button
                          type="button"
                          disabled={isReturning}
                          onClick={() => onReturnEquipment(tx)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-md transition-colors cursor-pointer"
                        >
                          <CornerDownLeft className="w-3.5 h-3.5" />
                          {isReturning ? 'Returning...' : 'Return Equipment'}
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </aside>
    </div>
  );
};
