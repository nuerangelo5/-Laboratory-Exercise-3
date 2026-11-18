import type {
  BorrowFormValues,
  BorrowTransaction,
  DashboardMetrics,
  EffectiveTransactionStatus,
  Equipment,
  EquipmentFormValues,
} from '../types/database';

/**
 * Returns today's local date in YYYY-MM-DD format so due-date comparisons
 * strictly match the custodian's local calendar date without UTC drift.
 */
export function getTodayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Adds a given number of days to an ISO date string (YYYY-MM-DD).
 */
export function addDaysToIsoDate(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * BR-09: Overdue Detection
 * IF current date > due date AND status is not Returned THEN status = Overdue
 */
export function getEffectiveStatus(
  transaction: Pick<BorrowTransaction, 'status' | 'due_date' | 'date_returned'>,
  todayIso: string = getTodayIsoDate()
): EffectiveTransactionStatus {
  if (transaction.status === 'Returned' || transaction.date_returned !== null) {
    return 'Returned';
  }
  if (todayIso > transaction.due_date) {
    return 'Overdue';
  }
  return 'Borrowed';
}

/**
 * Calculates how many calendar days past due an unreturned transaction is.
 */
export function getDaysOverdue(
  dueDateIso: string,
  todayIso: string = getTodayIsoDate()
): number {
  if (todayIso <= dueDateIso) return 0;
  const [ty, tm, td] = todayIso.split('-').map(Number);
  const [dy, dm, dd] = dueDateIso.split('-').map(Number);
  const todayUtc = Date.UTC(ty, tm - 1, td);
  const dueUtc = Date.UTC(dy, dm - 1, dd);
  return Math.max(0, Math.round((todayUtc - dueUtc) / 86_400_000));
}

/**
 * Formats YYYY-MM-DD into a compact, readable calendar label (e.g. Nov 17, 2026).
 */
export function formatDisplayDate(isoDate: string | null | undefined): string {
  if (!isoDate) return '—';
  const parts = isoDate.split('T')[0].split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return isoDate;
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Validates Equipment Create/Edit form against BR-01 and BR-02.
 */
export function validateEquipmentForm(
  values: EquipmentFormValues,
  existingEquipment: Equipment[],
  editingId?: number
): Partial<Record<keyof EquipmentFormValues, string>> {
  const errors: Partial<Record<keyof EquipmentFormValues, string>> = {};
  const trimmedName = values.equipment_name.trim();
  const normalizedCode = values.asset_code.trim().toUpperCase();

  // BR-01: Equipment name cannot be empty
  if (!trimmedName) {
    errors.equipment_name = 'Equipment name cannot be empty (BR-01).';
  }

  if (!values.category.trim()) {
    errors.category = 'Please select an equipment category.';
  }

  // BR-02: Asset code must be unique
  if (!normalizedCode) {
    errors.asset_code = 'Asset code is required (BR-02).';
  } else {
    const duplicate = existingEquipment.find(
      (item) =>
        item.asset_code.trim().toUpperCase() === normalizedCode &&
        item.id !== editingId
    );
    if (duplicate) {
      errors.asset_code = `Asset code "${normalizedCode}" is already assigned to ${duplicate.equipment_name} (BR-02).`;
    }
  }

  return errors;
}

/**
 * Validates New Borrowing Transaction form against BR-03, BR-04, BR-05.
 */
export function validateBorrowForm(
  values: BorrowFormValues,
  equipmentList: Equipment[]
): Partial<Record<keyof BorrowFormValues, string>> {
  const errors: Partial<Record<keyof BorrowFormValues, string>> = {};

  // BR-04: Borrower name must be provided
  if (!values.borrower_name.trim()) {
    errors.borrower_name = 'Borrower name must be provided (BR-04).';
  }

  if (!values.department.trim()) {
    errors.department = 'Department or office is required.';
  }

  // BR-03: Only available equipment may be borrowed
  const selectedId = Number(values.equipment_id);
  const selectedItem = equipmentList.find((item) => item.id === selectedId);
  if (!values.equipment_id || !selectedItem) {
    errors.equipment_id = 'Please select an available equipment item (BR-03).';
  } else if (selectedItem.availability !== 'Available') {
    errors.equipment_id = 'Only available equipment may be borrowed (BR-03).';
  }

  if (!values.date_borrowed) {
    errors.date_borrowed = 'Date borrowed is required.';
  }

  if (!values.due_date) {
    errors.due_date = 'Due date is required.';
  } else if (values.date_borrowed && values.due_date < values.date_borrowed) {
    // BR-05: Due date cannot be earlier than borrowing date
    errors.due_date = 'Due date cannot be earlier than the borrowing date (BR-05).';
  }

  return errors;
}

/**
 * Computes all five required Dashboard KPI metrics (FR-10).
 */
export function computeDashboardMetrics(
  equipment: Equipment[],
  transactions: BorrowTransaction[],
  todayIso: string = getTodayIsoDate()
): DashboardMetrics {
  const totalEquipment = equipment.length;
  const availableEquipment = equipment.filter(
    (item) => item.availability === 'Available'
  ).length;
  const borrowedEquipment = equipment.filter(
    (item) => item.availability === 'Borrowed'
  ).length;

  let returnedTransactions = 0;
  let overdueTransactions = 0;
  let activeTransactions = 0;

  for (const tx of transactions) {
    const effective = getEffectiveStatus(tx, todayIso);
    if (effective === 'Returned') {
      returnedTransactions += 1;
    } else if (effective === 'Overdue') {
      overdueTransactions += 1;
      activeTransactions += 1;
    } else {
      activeTransactions += 1;
    }
  }

  return {
    totalEquipment,
    availableEquipment,
    borrowedEquipment,
    returnedTransactions,
    overdueTransactions,
    activeTransactions,
  };
}
