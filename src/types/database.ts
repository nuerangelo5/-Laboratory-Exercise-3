export type EquipmentCondition = 'Good' | 'Fair' | 'For Repair';
export type EquipmentAvailability = 'Available' | 'Borrowed';
export type BorrowerType = 'Student' | 'Faculty' | 'Staff';
export type StoredTransactionStatus = 'Borrowed' | 'Returned' | 'Overdue';
export type EffectiveTransactionStatus = 'Borrowed' | 'Returned' | 'Overdue';

export const EQUIPMENT_CATEGORIES = [
  'Laptop',
  'Projector',
  'Camera',
  'Microphone',
  'Router',
  'Extension Cord',
  'HDMI Cable',
  'Computer Toolkit',
  'Portable Speaker',
  'Other ICT Equipment',
] as const;

export const EQUIPMENT_CONDITIONS: readonly EquipmentCondition[] = [
  'Good',
  'Fair',
  'For Repair',
];

export const BORROWER_TYPES: readonly BorrowerType[] = [
  'Student',
  'Faculty',
  'Staff',
];

export interface Equipment {
  id: number;
  equipment_name: string;
  category: string;
  asset_code: string;
  condition: EquipmentCondition;
  availability: EquipmentAvailability;
  created_at: string;
}

export interface ExistingStudent {
  id: number;
  student_id: string;
  first_name: string;
  last_name: string;
  program: string;
  year_level: number;
  email: string;
}

export interface BorrowTransaction {
  id: number;
  equipment_id: number;
  borrower_name: string;
  borrower_type: BorrowerType;
  department: string;
  date_borrowed: string;
  due_date: string;
  date_returned: string | null;
  status: StoredTransactionStatus;
  user_id: string | null;
  created_at: string;
}

export interface BorrowTransactionWithEquipment extends BorrowTransaction {
  equipment: Pick<
    Equipment,
    'id' | 'equipment_name' | 'asset_code' | 'category' | 'condition' | 'availability'
  > | null;
}

export interface EquipmentFormValues {
  equipment_name: string;
  category: string;
  asset_code: string;
  condition: EquipmentCondition;
}

export interface BorrowFormValues {
  borrower_name: string;
  borrower_type: BorrowerType;
  department: string;
  equipment_id: string;
  date_borrowed: string;
  due_date: string;
}

export interface DashboardMetrics {
  totalEquipment: number;
  availableEquipment: number;
  borrowedEquipment: number;
  returnedTransactions: number;
  overdueTransactions: number;
  activeTransactions: number;
}

export type ActiveSection = 'dashboard' | 'equipment' | 'transactions' | 'docs';

export interface ToastNotice {
  id: string;
  kind: 'success' | 'error' | 'info';
  title: string;
  detail?: string;
}
