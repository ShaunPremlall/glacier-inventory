export type Role = 'Admin' | 'Technician';
export type UserStatus = 'active' | 'inactive';
export type SerialStatus = 'warehouse' | 'allocated' | 'quarantine' | 'faulty';
export type AllocationStatus = 'pending_confirmation' | 'confirmed' | 'returned';

export interface Profile {
  id: string; // Document ID (usually matches Firebase Auth UID)
  email: string;
  role: Role;
  status: UserStatus;
  created_at: string; // ISO String
}

export interface StockItem {
  id: string; // Document ID
  name: string;
  category: string;
  description: string | null;
  quantity: number;
  is_serialized: boolean;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface SerialNumber {
  id: string; // Document ID
  stock_item_id: string; // Reference to StockItem Document ID
  serial_number: string;
  status: SerialStatus;
  created_at: string;
  updated_at: string;
}

// In Firestore, we can embed serials or keep them separate.
// Keeping them separate (as above) makes large queries easier.
// For allocations, we can embed the list of serial_ids rather than a join table.
export interface Allocation {
  id: string; // Document ID
  admin_id: string | null;
  technician_id: string; // Reference to Profile Document ID
  stock_item_id: string; // Reference to StockItem Document ID
  quantity: number;
  serial_number_ids?: string[]; // Embedded array of serial number Document IDs
  status: AllocationStatus;
  created_at: string;
  updated_at: string;

  // Optional transient fields for UI joins
  technician?: Profile;
  stock_item?: StockItem;
  serial_numbers_data?: SerialNumber[];
}

export interface AuditLog {
  id: string; // Document ID
  action: string;
  user_id: string; // Reference to Profile Document ID
  details: any;
  created_at: string;
}
