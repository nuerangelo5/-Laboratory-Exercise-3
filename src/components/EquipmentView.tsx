import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  History,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  EQUIPMENT_CATEGORIES,
  EQUIPMENT_CONDITIONS,
  type Equipment,
  type EquipmentCondition,
  type EquipmentFormValues,
} from '../types/database';
import { validateEquipmentForm } from '../utils/businessRules';

interface EquipmentViewProps {
  equipment: Equipment[];
  loading: boolean;
  availabilityFilter: 'All' | 'Available' | 'Borrowed';
  onAvailabilityFilterChange: (value: 'All' | 'Available' | 'Borrowed') => void;
  onCreateEquipment: (values: EquipmentFormValues) => Promise<void>;
  onUpdateEquipment: (id: number, values: EquipmentFormValues) => Promise<void>;
  onDeleteEquipment: (item: Equipment) => Promise<void>;
  onOpenHistory: (item: Equipment) => void;
  onQuickBorrow: (item: Equipment) => void;
  externalAddTrigger: number;
}

const INITIAL_FORM: EquipmentFormValues = {
  equipment_name: '',
  category: EQUIPMENT_CATEGORIES[0],
  asset_code: '',
  condition: 'Good',
};

export const EquipmentView: React.FC<EquipmentViewProps> = ({
  equipment,
  loading,
  availabilityFilter,
  onAvailabilityFilterChange,
  onCreateEquipment,
  onUpdateEquipment,
  onDeleteEquipment,
  onOpenHistory,
  onQuickBorrow,
  externalAddTrigger,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  // Create / Edit modal state
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Equipment | null>(null);
  const [formValues, setFormValues] =
    useState<EquipmentFormValues>(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState<
    Partial<Record<keyof EquipmentFormValues, string>>
  >({});
  const [formSubmitError, setFormSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete confirmation modal state (BR-10)
  const [deletingItem, setDeletingItem] = useState<Equipment | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Open modal when triggered externally from top bar or dashboard
  const [lastTrigger, setLastTrigger] = useState(externalAddTrigger);
  if (externalAddTrigger !== lastTrigger) {
    setLastTrigger(externalAddTrigger);
    setEditingItem(null);
    setFormValues(INITIAL_FORM);
    setFormErrors({});
    setFormSubmitError(null);
    setFormModalOpen(true);
  }

  const openAddModal = () => {
    setEditingItem(null);
    setFormValues(INITIAL_FORM);
    setFormErrors({});
    setFormSubmitError(null);
    setFormModalOpen(true);
  };

  const openEditModal = (item: Equipment) => {
    setEditingItem(item);
    setFormValues({
      equipment_name: item.equipment_name,
      category: item.category,
      asset_code: item.asset_code,
      condition: item.condition,
    });
    setFormErrors({});
    setFormSubmitError(null);
    setFormModalOpen(true);
  };

  const handleFormSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormSubmitError(null);

    const validationErrors = validateEquipmentForm(
      formValues,
      equipment,
      editingItem?.id
    );
    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      return;
    }

    setSaving(true);
    try {
      if (editingItem) {
        await onUpdateEquipment(editingItem.id, formValues);
      } else {
        await onCreateEquipment(formValues);
      }
      setFormModalOpen(false);
      setEditingItem(null);
      setFormValues(INITIAL_FORM);
      setFormErrors({});
    } catch (err) {
      setFormSubmitError(
        err instanceof Error ? err.message : 'Unable to save equipment record.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    if (deletingItem.availability === 'Borrowed') {
      setDeleteError(
        'Cannot delete equipment that is currently Borrowed. Process the return first.'
      );
      return;
    }

    setDeleting(true);
    setDeleteError(null);
    try {
      await onDeleteEquipment(deletingItem);
      setDeletingItem(null);
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : 'Unable to delete equipment.'
      );
    } finally {
      setDeleting(false);
    }
  };

  const counts = useMemo(() => {
    const available = equipment.filter(
      (i) => i.availability === 'Available'
    ).length;
    const borrowed = equipment.filter(
      (i) => i.availability === 'Borrowed'
    ).length;
    return { all: equipment.length, available, borrowed };
  }, [equipment]);

  const filteredEquipment = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return equipment.filter((item) => {
      if (
        availabilityFilter !== 'All' &&
        item.availability !== availabilityFilter
      ) {
        return false;
      }
      if (categoryFilter !== 'All' && item.category !== categoryFilter) {
        return false;
      }
      if (query) {
        const matchesName = item.equipment_name.toLowerCase().includes(query);
        const matchesCode = item.asset_code.toLowerCase().includes(query);
        const matchesCategory = item.category.toLowerCase().includes(query);
        return matchesName || matchesCode || matchesCategory;
      }
      return true;
    });
  }, [equipment, availabilityFilter, categoryFilter, searchQuery]);

  const categoriesPresent = useMemo(() => {
    const unique = new Set<string>(EQUIPMENT_CATEGORIES);
    equipment.forEach((item) => unique.add(item.category));
    return Array.from(unique);
  }, [equipment]);

  return (
    <div className="space-y-6">
      {/* Toolbar: Search + Segmented Availability Filter + Category Filter + Add CTA */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by equipment name or asset code..."
              aria-label="Search equipment by name or asset code"
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            />
          </div>

          {/* Availability Segmented Control */}
          <div
            role="group"
            aria-label="Filter equipment by availability"
            className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start sm:self-auto"
          >
            {(
              [
                { value: 'All', label: `All (${counts.all})` },
                { value: 'Available', label: `Available (${counts.available})` },
                { value: 'Borrowed', label: `Borrowed (${counts.borrowed})` },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onAvailabilityFilterChange(opt.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 tabular-nums cursor-pointer ${
                  availabilityFilter === opt.value
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Category Dropdown */}
          <select
            aria-label="Filter equipment by category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="All">All Categories</option>
            {categoriesPresent.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Equipment
        </button>
      </div>

      {/* Equipment Data Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-3.5 border-b border-slate-200 flex items-center justify-between gap-4">
          <p className="text-xs text-slate-600">
            Showing{' '}
            <span className="font-mono font-semibold text-slate-900 tabular-nums">
              {filteredEquipment.length}
            </span>{' '}
            of{' '}
            <span className="font-mono font-semibold text-slate-900 tabular-nums">
              {equipment.length}
            </span>{' '}
            items · Click any equipment name to view its live Supabase borrowing
            history.
          </p>
          {(searchQuery ||
            availabilityFilter !== 'All' ||
            categoryFilter !== 'All') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                onAvailabilityFilterChange('All');
                setCategoryFilter('All');
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
                <div className="h-4 w-20 bg-slate-200 rounded" />
                <div className="h-4 flex-1 bg-slate-200 rounded" />
                <div className="h-4 w-24 bg-slate-100 rounded" />
                <div className="h-4 w-20 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        ) : filteredEquipment.length === 0 ? (
          <div className="px-6 py-14 text-center space-y-3">
            <p className="text-sm font-semibold text-slate-900">
              {equipment.length === 0
                ? 'No equipment items registered yet'
                : 'No equipment matches your search or filter'}
            </p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {equipment.length === 0
                ? 'Add your first projector, laptop, camera, or laboratory tool to begin tracking borrowing transactions.'
                : 'Try adjusting your search term or switching the availability filter back to All.'}
            </p>
            {equipment.length === 0 && (
              <button
                type="button"
                onClick={openAddModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Add First Equipment
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <th className="py-2.5 px-6">Code</th>
                  <th className="py-2.5 px-4">Equipment</th>
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-4">Condition</th>
                  <th className="py-2.5 px-4">Availability</th>
                  <th className="py-2.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredEquipment.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-3 px-6 font-mono text-xs font-semibold text-slate-800 whitespace-nowrap">
                      {item.asset_code}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => onOpenHistory(item)}
                        className="font-medium text-slate-900 hover:text-blue-700 hover:underline text-left cursor-pointer"
                      >
                        {item.equipment_name}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 whitespace-nowrap">
                      {item.category}
                    </td>
                    <td className="py-3 px-4 text-xs whitespace-nowrap">
                      <span
                        className={
                          item.condition === 'For Repair'
                            ? 'font-semibold text-red-700'
                            : item.condition === 'Fair'
                              ? 'font-medium text-amber-700'
                              : 'text-slate-700'
                        }
                      >
                        {item.condition}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs font-semibold whitespace-nowrap">
                      {item.availability === 'Available' ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Available
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-amber-700">
                          <Clock className="w-3.5 h-3.5" />
                          Borrowed
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-6 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1">
                        {item.availability === 'Available' && (
                          <button
                            type="button"
                            onClick={() => onQuickBorrow(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                            title="Borrow this equipment"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            Borrow
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onOpenHistory(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                          title="View borrowing history"
                        >
                          <History className="w-3.5 h-3.5" />
                          History
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          aria-label={`Edit ${item.equipment_name}`}
                          className="p-1.5 text-slate-600 hover:text-slate-950 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                          title="Edit equipment"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteError(null);
                            setDeletingItem(item);
                          }}
                          aria-label={`Delete ${item.equipment_name}`}
                          className="p-1.5 text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                          title="Delete equipment"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Equipment Modal */}
      {formModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="equipment-modal-title"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3
                  id="equipment-modal-title"
                  className="font-display text-base font-bold text-slate-900"
                >
                  {editingItem ? 'Edit Equipment Record' : 'Add New Equipment'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {editingItem
                    ? 'Update equipment details, category, asset code, or physical condition.'
                    : 'Register a new college laboratory asset (BR-01, BR-02).'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFormModalOpen(false)}
                aria-label="Close modal"
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded-md hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {formSubmitError && (
                <div
                  role="alert"
                  className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800"
                >
                  {formSubmitError}
                </div>
              )}

              <div>
                <label
                  htmlFor="equip-name"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Equipment Name <span className="text-red-600">*</span>
                </label>
                <input
                  id="equip-name"
                  type="text"
                  value={formValues.equipment_name}
                  onChange={(e) => {
                    setFormValues((prev) => ({
                      ...prev,
                      equipment_name: e.target.value,
                    }));
                    setFormErrors((prev) => ({
                      ...prev,
                      equipment_name: undefined,
                    }));
                  }}
                  placeholder="e.g., Epson EB-X51 Projector"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                {formErrors.equipment_name && (
                  <p className="mt-1 text-xs text-red-700">
                    {formErrors.equipment_name}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="equip-code"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    Asset Code <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="equip-code"
                    type="text"
                    value={formValues.asset_code}
                    onChange={(e) => {
                      setFormValues((prev) => ({
                        ...prev,
                        asset_code: e.target.value.toUpperCase(),
                      }));
                      setFormErrors((prev) => ({
                        ...prev,
                        asset_code: undefined,
                      }));
                    }}
                    placeholder="e.g., PROJ-003"
                    className="w-full px-3.5 py-2 text-sm font-mono uppercase border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  {formErrors.asset_code && (
                    <p className="mt-1 text-xs text-red-700">
                      {formErrors.asset_code}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="equip-category"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    Category <span className="text-red-600">*</span>
                  </label>
                  <select
                    id="equip-category"
                    value={formValues.category}
                    onChange={(e) =>
                      setFormValues((prev) => ({
                        ...prev,
                        category: e.target.value,
                      }))
                    }
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    {EQUIPMENT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="equip-condition"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Condition
                </label>
                <select
                  id="equip-condition"
                  value={formValues.condition}
                  onChange={(e) =>
                    setFormValues((prev) => ({
                      ...prev,
                      condition: e.target.value as EquipmentCondition,
                    }))
                  }
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {EQUIPMENT_CONDITIONS.map((cond) => (
                    <option key={cond} value={cond}>
                      {cond}
                    </option>
                  ))}
                </select>
              </div>

              {!editingItem && (
                <p className="text-xs text-slate-500">
                  Availability automatically defaults to{' '}
                  <span className="font-semibold text-emerald-700">
                    Available
                  </span>{' '}
                  when adding new equipment.
                </p>
              )}

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setFormModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                >
                  {saving
                    ? 'Saving...'
                    : editingItem
                      ? 'Save Changes'
                      : 'Add Equipment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (BR-10) */}
      {deletingItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3
                    id="delete-modal-title"
                    className="font-display text-base font-bold text-slate-900"
                  >
                    Confirm Equipment Deletion
                  </h3>
                  <p className="text-sm text-slate-600">
                    Are you sure you want to permanently delete{' '}
                    <span className="font-semibold text-slate-900">
                      {deletingItem.equipment_name}
                    </span>{' '}
                    (
                    <span className="font-mono text-xs">
                      {deletingItem.asset_code}
                    </span>
                    )?
                  </p>
                </div>
              </div>

              {deletingItem.availability === 'Borrowed' ? (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
                  This item is currently marked as <strong>Borrowed</strong>.
                  Return the equipment in the Transactions module before
                  deleting it from inventory.
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  Deletion requires explicit confirmation (BR-10) and will also
                  remove associated historical borrowing records for this asset.
                </p>
              )}

              {deleteError && (
                <div
                  role="alert"
                  className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800"
                >
                  {deleteError}
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setDeletingItem(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleting || deletingItem.availability === 'Borrowed'}
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                >
                  {deleting ? 'Deleting...' : 'Confirm Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
