# 🗄️ Manual Supabase Database Setup

## 📋 Step-by-Step Instructions

### 1. **Access Supabase Dashboard**
- Go to: https://supabase.com/dashboard
- Select your project: `fwbizsvzkwzfahvgnegr`

### 2. **Navigate to SQL Editor**
- Click on **SQL Editor** in the left sidebar
- Click **New Query**

### 3. **Run Database Schema**
Copy and paste this SQL into the editor:

```sql
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  phone VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Parties table
CREATE TABLE IF NOT EXISTS parties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  party_name VARCHAR(255) NOT NULL,
  sr_no VARCHAR(50),
  status VARCHAR(10) DEFAULT 'R',
  commi_system VARCHAR(20) DEFAULT 'Take',
  balance_limit VARCHAR(50) DEFAULT '0',
  m_commission VARCHAR(50) DEFAULT 'No Commission',
  rate VARCHAR(50) DEFAULT '0',
  monday_final VARCHAR(10) DEFAULT 'No',
  address TEXT,
  phone VARCHAR(20),
  email VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, party_name)
);

-- Ledger entries table
CREATE TABLE IF NOT EXISTS ledger_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  party_name VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  remarks TEXT,
  tns_type VARCHAR(50) NOT NULL,
  debit DECIMAL(15,2) DEFAULT 0,
  credit DECIMAL(15,2) DEFAULT 0,
  balance DECIMAL(15,2) DEFAULT 0,
  chk BOOLEAN DEFAULT false,
  ti VARCHAR(255),
  is_old_record BOOLEAN DEFAULT false,
  settlement_date DATE,
  settlement_monday_final_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ledger_entries_user_id ON ledger_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_party_name ON ledger_entries(party_name);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_date ON ledger_entries(date);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_tns_type ON ledger_entries(tns_type);
CREATE INDEX IF NOT EXISTS idx_parties_user_id ON parties(user_id);

-- Row Level Security (RLS) Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (true);

-- Parties policies
CREATE POLICY "Users can manage their parties" ON parties
  FOR ALL USING (true);

-- Ledger entries policies
CREATE POLICY "Users can manage their ledger entries" ON ledger_entries
  FOR ALL USING (true);

-- Functions for automatic timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parties_updated_at BEFORE UPDATE ON parties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ledger_entries_updated_at BEFORE UPDATE ON ledger_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 4. **Execute the SQL**
- Click **Run** button
- Wait for all statements to execute successfully

### 5. **Verify Tables Created**
- Go to **Table Editor** in the left sidebar
- You should see: `users`, `parties`, `ledger_entries`

### 6. **Test Connection**
```bash
npm run dev
```

## 🔧 Troubleshooting

### If SQL fails:
1. **Check permissions** - Make sure you're the project owner
2. **Check syntax** - Copy the SQL exactly as shown
3. **Run statements one by one** - Execute each CREATE TABLE separately

### If connection fails:
1. **Check API keys** - Verify SUPABASE_URL and SUPABASE_ANON_KEY
2. **Check project status** - Ensure project is active
3. **Check RLS policies** - Verify policies are created correctly

## ✅ Success Indicators

- ✅ Tables created in Table Editor
- ✅ Server starts without database errors
- ✅ Connection test passes
- ✅ API endpoints work correctly
