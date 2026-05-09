export type Role = 'Admin' | 'Technician';
export type UserStatus = 'active' | 'inactive';
export type SerialStatus = 'warehouse' | 'allocated' | 'quarantine' | 'faulty';
export type AllocationStatus = 'pending_confirmation' | 'confirmed' | 'returned';

export interface Profile {
  id: string;
  email: string;
  role: Role;
  status: UserStatus;
  created_at: string;
}

export interface StockItem {
  id: string;
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
  id: string;
  stock_item_id: string;
  serial_number: string;
  status: SerialStatus;
  created_at: string;
  updated_at: string;
}

export interface Allocation {
  id: string;
  admin_id: string | null;
  technician_id: string;
  stock_item_id: string;
  quantity: number;
  status: AllocationStatus;
  created_at: string;
  updated_at: string;

  // Relations for joining
  technician?: Profile;
  stock_item?: StockItem;
  allocation_serials?: AllocationSerial[];
}

export interface AllocationSerial {
  id: string;
  allocation_id: string;
  serial_number_id: string;
  created_at: string;

  // Relation
  serial_number?: SerialNumber;
}

export interface AuditLog {
  id: string;
  action: string;
  user_id: string;
  details: any;
  created_at: string;
}
