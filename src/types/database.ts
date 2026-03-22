export type UserRole = 'owner' | 'manager' | 'staff';

export interface Profile {
  id: string;
  full_name: string | null;
  role: UserRole;
  branch_id: string | null;
  currency: string;
  whatsapp_number: string | null;
  preferences: {
    whatsapp_alerts: boolean;
    vat_rate: number;
    low_stock_threshold: number;
  } | null;
  created_at: string;
}

export interface Branch {
  id: string;
  user_id: string;
  name: string;
  location: string | null;
  created_at: string;
}

export interface Customer {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  loyalty_points: number; // Added for loyalty rewards
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  details: any;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: 'sale' | 'expense' | 'payment';
  amount: number;
  category: string;
  description: string;
  product_id: string | null;
  quantity: number | null;
  customer_id: string | null;
  branch_id: string | null;
  tax_amount: number;
  created_at: string;
}

export interface Supplier {
  id: string;
  user_id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  category: string | null;
  created_at: string;
}

export interface Product {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  price: number;
  cost_price: number;
  stock: number;
  unit: string;
  category: string | null;
  branch_id: string | null;
  min_stock_level: number;
  supplier_id: string | null; // Added for supplier intelligence
  last_purchase_price: number | null; // Added for price comparison
  total_sold: number; // Added for reports
  total_bought: number; // Added for reports
  expiry_date: string | null; // Added for inventory management
  created_at: string;
  updated_at: string;
}

export interface Debt {
  id: string;
  user_id: string;
  customer_id: string | null;
  customer_name: string;
  amount: number;
  type: 'debt' | 'credit';
  status: 'pending' | 'paid';
  due_date: string | null;
  description: string | null;
  created_at: string;
}

export interface SupplierPurchase {
  id: string;
  user_id: string;
  supplier_id: string;
  product_name: string;
  quantity: number;
  total_cost: number;
  status: 'paid' | 'pending';
  created_at: string;
}
