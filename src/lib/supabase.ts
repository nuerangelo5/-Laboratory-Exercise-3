import { createClient } from '@supabase/supabase-js';
import type {
  BorrowFormValues,
  BorrowTransactionWithEquipment,
  Equipment,
  EquipmentFormValues,
  ExistingStudent,
} from '../types/database';
import { getTodayIsoDate } from '../utils/businessRules';

export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://ekiwatjcqtbpjufnyowo.supabase.co';

export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVraXdhdGpjcXRicGp1Zm55b3dvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ5NTYyMTEsImV4cCI6MjExMDUzMjIxMX0.ocwauk_YmaUZCMI17mj1eT4Vel7JwE8FHLdToiJIpe8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/**
 * Checks whether a Supabase/PostgREST error indicates the required SQL tables
 * have not yet been created in the connected Supabase project.
 */
export function isMissingTableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const err = error as { code?: string; message?: string };
  return (
    err.code === 'PGRST205' ||
    err.code === '42P01' ||
    Boolean(err.message?.includes("Could not find the table 'public."))
  );
}

/**
 * Translates raw PostgreSQL / Supabase error codes into plain-English feedback.
 */
export function formatSupabaseError(error: unknown, fallback: string): string {
  if (!error || typeof error !== 'object') return fallback;
  const err = error as { code?: string; message?: string; details?: string };

  if (err.code === '23505') {
    return 'Asset code already exists. Every equipment item must have a unique asset code (BR-02).';
  }
  if (err.code === '23514') {
    return 'Input violates a database business rule constraint. Check required fields and due date (BR-01/BR-04/BR-05).';
  }
  if (err.code === '42501') {
    return 'Access denied by Row Level Security. Please sign in with a valid custodian account (BR-11).';
  }
  if (isMissingTableError(err)) {
    return 'Database tables are not created yet. Run supabase/schema.sql in your Supabase SQL Editor.';
  }

  return err.message || fallback;
}

// ============================================================================
// Equipment CRUD Operations
// ============================================================================

export async function fetchEquipmentList(): Promise<Equipment[]> {
  const { data, error } = await supabase
    .from('equipment')
    .select('*')
    .order('asset_code', { ascending: true });

  if (error) throw error;
  return (data ?? []) as Equipment[];
}

export async function createEquipmentRecord(
  values: EquipmentFormValues
): Promise<Equipment> {
  const payload = {
    equipment_name: values.equipment_name.trim(),
    category: values.category.trim(),
    asset_code: values.asset_code.trim().toUpperCase(),
    condition: values.condition,
    availability: 'Available' as const,
  };

  const { data, error } = await supabase
    .from('equipment')
    .insert(payload)
    .select('*')
    .single();

  if (error) throw error;
  return data as Equipment;
}

export async function updateEquipmentRecord(
  id: number,
  values: EquipmentFormValues
): Promise<Equipment> {
  const payload = {
    equipment_name: values.equipment_name.trim(),
    category: values.category.trim(),
    asset_code: values.asset_code.trim().toUpperCase(),
    condition: values.condition,
  };

  const { data, error } = await supabase
    .from('equipment')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data as Equipment;
}

export async function deleteEquipmentRecord(id: number): Promise<void> {
  const { error } = await supabase.from('equipment').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================================
// Borrowing & Return Transaction Operations
// ============================================================================

export async function fetchTransactionList(): Promise<
  BorrowTransactionWithEquipment[]
> {
  const { data, error } = await supabase
    .from('borrow_transactions')
    .select(
      `
      *,
      equipment (
        id,
        equipment_name,
        asset_code,
        category,
        condition,
        availability
      )
    `
    )
    .order('date_borrowed', { ascending: false })
    .order('id', { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as BorrowTransactionWithEquipment[];
}

/**
 * Bonus Feature (+5 pts): Live per-equipment borrowing history from Supabase.
 */
export async function fetchEquipmentBorrowingHistory(
  equipmentId: number
): Promise<BorrowTransactionWithEquipment[]> {
  const { data, error } = await supabase
    .from('borrow_transactions')
    .select(
      `
      *,
      equipment (
        id,
        equipment_name,
        asset_code,
        category,
        condition,
        availability
      )
    `
    )
    .eq('equipment_id', equipmentId)
    .order('date_borrowed', { ascending: false })
    .order('id', { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as BorrowTransactionWithEquipment[];
}

/**
 * Creates a borrowing transaction and marks the equipment as Borrowed.
 * Enforces BR-03, BR-04, BR-05, BR-06, BR-07.
 */
export async function recordBorrowingTransaction(
  values: BorrowFormValues,
  userId: string
): Promise<BorrowTransactionWithEquipment> {
  const equipmentId = Number(values.equipment_id);

  // Re-verify live availability in Supabase before inserting (BR-03)
  const { data: currentItem, error: checkError } = await supabase
    .from('equipment')
    .select('id, availability, equipment_name')
    .eq('id', equipmentId)
    .single();

  if (checkError) throw checkError;
  if (!currentItem || currentItem.availability !== 'Available') {
    throw new Error(
      'Selected equipment is no longer available for borrowing (BR-03).'
    );
  }

  // Insert transaction with status = 'Borrowed' (BR-06)
  const { data: createdTx, error: txError } = await supabase
    .from('borrow_transactions')
    .insert({
      equipment_id: equipmentId,
      borrower_name: values.borrower_name.trim(),
      borrower_type: values.borrower_type,
      department: values.department.trim(),
      date_borrowed: values.date_borrowed,
      due_date: values.due_date,
      date_returned: null,
      status: 'Borrowed',
      user_id: userId,
    })
    .select(
      `
      *,
      equipment (
        id,
        equipment_name,
        asset_code,
        category,
        condition,
        availability
      )
    `
    )
    .single();

  if (txError) throw txError;

  // Update equipment availability = 'Borrowed' (BR-07)
  const { error: updateError } = await supabase
    .from('equipment')
    .update({ availability: 'Borrowed' })
    .eq('id', equipmentId);

  if (updateError) {
    // Compensating rollback if equipment status update fails
    await supabase.from('borrow_transactions').delete().eq('id', createdTx.id);
    throw updateError;
  }

  return createdTx as unknown as BorrowTransactionWithEquipment;
}

/**
 * Processes an equipment return.
 * Enforces BR-08 (equipment becomes Available) and BR-12 (cannot return twice).
 */
export async function returnBorrowedEquipment(
  transaction: BorrowTransactionWithEquipment
): Promise<void> {
  // BR-12: Prevent double return
  if (transaction.status === 'Returned' || transaction.date_returned !== null) {
    throw new Error('This transaction has already been returned (BR-12).');
  }

  const returnDate = getTodayIsoDate();

  // 1 & 2. Record current date as date_returned and set status = 'Returned'
  const { data: updatedRows, error: txError } = await supabase
    .from('borrow_transactions')
    .update({
      date_returned: returnDate,
      status: 'Returned',
    })
    .eq('id', transaction.id)
    .neq('status', 'Returned')
    .select('id');

  if (txError) throw txError;
  if (!updatedRows || updatedRows.length === 0) {
    throw new Error('This transaction was already marked as Returned (BR-12).');
  }

  // 3. Change equipment availability back to 'Available' (BR-08)
  const { error: equipError } = await supabase
    .from('equipment')
    .update({ availability: 'Available' })
    .eq('id', transaction.equipment_id);

  if (equipError) throw equipError;
}

/**
 * Safely reads the pre-existing public.students table (if present and readable)
 * to offer quick borrower auto-fill without failing if empty or restricted.
 */
export async function fetchExistingStudents(): Promise<ExistingStudent[]> {
  try {
    const { data, error } = await supabase
      .from('students')
      .select('id, student_id, first_name, last_name, program, year_level, email')
      .order('last_name', { ascending: true })
      .order('first_name', { ascending: true });

    if (error || !data) return [];
    return data as ExistingStudent[];
  } catch {
    return [];
  }
}
