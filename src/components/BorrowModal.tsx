import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Plus, X } from 'lucide-react';
import {
  BORROWER_TYPES,
  type BorrowFormValues,
  type BorrowerType,
  type Equipment,
  type ExistingStudent,
} from '../types/database';
import {
  addDaysToIsoDate,
  getTodayIsoDate,
  validateBorrowForm,
} from '../utils/businessRules';

interface BorrowModalProps {
  open: boolean;
  equipment: Equipment[];
  students?: ExistingStudent[];
  preselectedEquipmentId?: number | null;
  onClose: () => void;
  onSubmit: (values: BorrowFormValues) => Promise<void>;
}

const DEPARTMENT_SUGGESTIONS = [
  'BSIT Department',
  'BSIS Department',
  'College of Computer Studies',
  'Engineering Department',
  'Information Systems Office',
  'Student Affairs Office',
  'Audio-Visual Center',
  'Campus Journalism Office',
];

export const BorrowModal: React.FC<BorrowModalProps> = ({
  open,
  equipment,
  students = [],
  preselectedEquipmentId,
  onClose,
  onSubmit,
}) => {
  const availableEquipment = useMemo(
    () => equipment.filter((item) => item.availability === 'Available'),
    [equipment]
  );

  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [values, setValues] = useState<BorrowFormValues>(() => {
    const today = getTodayIsoDate();
    return {
      borrower_name: '',
      borrower_type: 'Student',
      department: '',
      equipment_id: '',
      date_borrowed: today,
      due_date: addDaysToIsoDate(today, 3),
    };
  });

  const [errors, setErrors] = useState<
    Partial<Record<keyof BorrowFormValues, string>>
  >({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const today = getTodayIsoDate();
    const defaultEquipId =
      preselectedEquipmentId &&
      availableEquipment.some((i) => i.id === preselectedEquipmentId)
        ? String(preselectedEquipmentId)
        : availableEquipment[0]
          ? String(availableEquipment[0].id)
          : '';

    setSelectedStudentId('');
    setValues({
      borrower_name: '',
      borrower_type: 'Student',
      department: '',
      equipment_id: defaultEquipId,
      date_borrowed: today,
      due_date: addDaysToIsoDate(today, 3),
    });
    setErrors({});
    setSubmitError(null);
  }, [open, preselectedEquipmentId, availableEquipment]);

  if (!open) return null;

  const handleSelectExistingStudent = (studentDbId: string) => {
    setSelectedStudentId(studentDbId);
    const match = students.find((s) => String(s.id) === studentDbId);
    if (!match) return;
    setValues((prev) => ({
      ...prev,
      borrower_type: 'Student',
      borrower_name: `${match.first_name} ${match.last_name}`.trim(),
      department: `${match.program} — Year ${match.year_level}`,
    }));
    setErrors((prev) => ({
      ...prev,
      borrower_name: undefined,
      department: undefined,
    }));
  };

  const handleFormSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError(null);

    const validationErrors = validateBorrowForm(values, equipment);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSaving(true);
    try {
      await onSubmit(values);
      onClose();
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : 'Unable to save borrowing transaction.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="borrow-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3
              id="borrow-modal-title"
              className="font-display text-base font-bold text-slate-900"
            >
              New Borrowing Transaction
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Only available equipment can be borrowed (BR-03). Status will be
              set to Borrowed (BR-06, BR-07).
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close borrowing form"
            className="p-1.5 text-slate-500 hover:text-slate-900 rounded-md hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
          {availableEquipment.length === 0 && (
            <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>
                All registered equipment items are currently borrowed. Return an
                item or register new equipment before recording a borrowing
                transaction.
              </p>
            </div>
          )}

          {submitError && (
            <div
              role="alert"
              className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800"
            >
              {submitError}
            </div>
          )}

          {students.length > 0 && values.borrower_type === 'Student' && (
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
              <label
                htmlFor="borrow-existing-student"
                className="block text-xs font-semibold text-slate-700"
              >
                Quick-Fill from Existing Students Table (Optional)
              </label>
              <select
                id="borrow-existing-student"
                value={selectedStudentId}
                onChange={(e) => handleSelectExistingStudent(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="">Type manually or pick a registered student...</option>
                {students.map((student) => (
                  <option key={student.id} value={String(student.id)}>
                    {student.student_id} — {student.last_name}, {student.first_name} ({student.program} Yr {student.year_level})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label
              htmlFor="borrow-name"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Borrower Name <span className="text-red-600">*</span>
            </label>
            <input
              id="borrow-name"
              type="text"
              value={values.borrower_name}
              onChange={(e) => {
                setValues((prev) => ({
                  ...prev,
                  borrower_name: e.target.value,
                }));
                setErrors((prev) => ({ ...prev, borrower_name: undefined }));
              }}
              placeholder="e.g., Juan Dela Cruz"
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            {errors.borrower_name && (
              <p className="mt-1 text-xs text-red-700">
                {errors.borrower_name}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="borrow-type"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Borrower Type <span className="text-red-600">*</span>
              </label>
              <select
                id="borrow-type"
                value={values.borrower_type}
                onChange={(e) =>
                  setValues((prev) => ({
                    ...prev,
                    borrower_type: e.target.value as BorrowerType,
                  }))
                }
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {BORROWER_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="borrow-department"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Department / Office <span className="text-red-600">*</span>
              </label>
              <input
                id="borrow-department"
                type="text"
                list="department-options"
                value={values.department}
                onChange={(e) => {
                  setValues((prev) => ({
                    ...prev,
                    department: e.target.value,
                  }));
                  setErrors((prev) => ({ ...prev, department: undefined }));
                }}
                placeholder="e.g., BSIT 3-B"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <datalist id="department-options">
                {DEPARTMENT_SUGGESTIONS.map((dept) => (
                  <option key={dept} value={dept} />
                ))}
              </datalist>
              {errors.department && (
                <p className="mt-1 text-xs text-red-700">{errors.department}</p>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="borrow-equipment"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Available Equipment <span className="text-red-600">*</span>
            </label>
            <select
              id="borrow-equipment"
              value={values.equipment_id}
              disabled={availableEquipment.length === 0}
              onChange={(e) => {
                setValues((prev) => ({
                  ...prev,
                  equipment_id: e.target.value,
                }));
                setErrors((prev) => ({ ...prev, equipment_id: undefined }));
              }}
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg text-slate-900 bg-white disabled:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              {availableEquipment.length === 0 ? (
                <option value="">No available equipment</option>
              ) : (
                availableEquipment.map((item) => (
                  <option key={item.id} value={String(item.id)}>
                    {item.asset_code} — {item.equipment_name} ({item.condition})
                  </option>
                ))
              )}
            </select>
            {errors.equipment_id && (
              <p className="mt-1 text-xs text-red-700">{errors.equipment_id}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="borrow-date"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Date Borrowed <span className="text-red-600">*</span>
              </label>
              <input
                id="borrow-date"
                type="date"
                value={values.date_borrowed}
                onChange={(e) => {
                  const nextBorrowed = e.target.value;
                  setValues((prev) => ({
                    ...prev,
                    date_borrowed: nextBorrowed,
                  }));
                  setErrors((prev) => ({
                    ...prev,
                    date_borrowed: undefined,
                    due_date: undefined,
                  }));
                }}
                className="w-full px-3.5 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              {errors.date_borrowed && (
                <p className="mt-1 text-xs text-red-700">
                  {errors.date_borrowed}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="borrow-due-date"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Due Date <span className="text-red-600">*</span>
              </label>
              <input
                id="borrow-due-date"
                type="date"
                min={values.date_borrowed}
                value={values.due_date}
                onChange={(e) => {
                  setValues((prev) => ({
                    ...prev,
                    due_date: e.target.value,
                  }));
                  setErrors((prev) => ({ ...prev, due_date: undefined }));
                }}
                className="w-full px-3.5 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              {errors.due_date && (
                <p className="mt-1 text-xs text-red-700">{errors.due_date}</p>
              )}
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Tip: To test Overdue Detection (TC-07), record a borrowing
            transaction with both Date Borrowed and Due Date set earlier than
            today.
          </p>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || availableEquipment.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              {saving ? 'Saving...' : 'Save Borrowing Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
