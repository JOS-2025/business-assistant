-- Supabase Schema for AI-Powered Business Assistant

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  role TEXT CHECK (role IN ('owner', 'manager', 'staff')) DEFAULT 'owner',
  branch_id UUID, -- Will be linked after branches table is created
  currency TEXT DEFAULT 'KES',
  whatsapp_number TEXT,
  preferences JSONB DEFAULT '{"whatsapp_alerts": true, "vat_rate": 0, "low_stock_threshold": 5}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. BRANCHES
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key to profiles now that branches exists (using a DO block to avoid errors if already exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_profiles_branch') THEN
        ALTER TABLE profiles ADD CONSTRAINT fk_profiles_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 3. CUSTOMERS
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  loyalty_points INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. SUPPLIERS
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. PRODUCTS
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(12,2) NOT NULL DEFAULT 0,
  cost_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  unit TEXT DEFAULT 'pcs',
  category TEXT,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  min_stock_level INTEGER DEFAULT 5,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  last_purchase_price DECIMAL(12,2),
  total_sold INTEGER DEFAULT 0,
  total_bought INTEGER DEFAULT 0,
  expiry_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TRANSACTIONS
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN ('sale', 'expense', 'payment')) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  quantity INTEGER,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. DEBTS
CREATE TABLE IF NOT EXISTS debts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  type TEXT CHECK (type IN ('debt', 'credit')) NOT NULL,
  status TEXT CHECK (status IN ('pending', 'paid')) DEFAULT 'pending',
  due_date TIMESTAMPTZ,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. SUPPLIER PURCHASES
CREATE TABLE IF NOT EXISTS supplier_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE NOT NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  total_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
  status TEXT CHECK (status IN ('paid', 'pending')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ROW LEVEL SECURITY (RLS) POLICIES
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_purchases ENABLE ROW LEVEL SECURITY;

-- Create policies (Users can only access their own data)
-- Using DROP IF EXISTS to ensure we can recreate them
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can manage own branches" ON branches;
CREATE POLICY "Users can manage own branches" ON branches FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own customers" ON customers;
CREATE POLICY "Users can manage own customers" ON customers FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own suppliers" ON suppliers;
CREATE POLICY "Users can manage own suppliers" ON suppliers FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own products" ON products;
CREATE POLICY "Users can manage own products" ON products FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own transactions" ON transactions;
CREATE POLICY "Users can manage own transactions" ON transactions FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own debts" ON debts;
CREATE POLICY "Users can manage own debts" ON debts FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own audit_logs" ON audit_logs;
CREATE POLICY "Users can manage own audit_logs" ON audit_logs FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own supplier_purchases" ON supplier_purchases;
CREATE POLICY "Users can manage own supplier_purchases" ON supplier_purchases FOR ALL USING (auth.uid() = user_id);

-- UPDATED_AT TRIGGER
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
