-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create agencies table
CREATE TABLE IF NOT EXISTS agencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  rera_brn TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'suspended', 'deactivated')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create users table with auth mapping
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'broker' CHECK (role IN ('broker', 'admin')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'suspended', 'deactivated')),
  agency_id UUID REFERENCES agencies(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create broker profiles table
CREATE TABLE IF NOT EXISTS broker_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  agency_id UUID REFERENCES agencies(id) ON DELETE SET NULL,
  rera_brn TEXT,
  covered_area_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
  speciality TEXT,
  experience_years INTEGER,
  whatsapp_number TEXT,
  bio TEXT,
  application_status TEXT NOT NULL DEFAULT 'pending' CHECK (application_status IN ('pending', 'approved', 'suspended', 'deactivated')),
  application_submitted_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create areas table
CREATE TABLE IF NOT EXISTS areas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create broker credits table
CREATE TABLE IF NOT EXISTS broker_credits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  available_credits INTEGER NOT NULL DEFAULT 0,
  used_credits INTEGER NOT NULL DEFAULT 0,
  total_credits_assigned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

-- Create listings table
CREATE TABLE IF NOT EXISTS listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  property_type TEXT NOT NULL CHECK (property_type IN ('apartment', 'villa', 'townhouse', 'penthouse', 'office', 'retail', 'warehouse', 'land')),
  deal_type TEXT NOT NULL CHECK (deal_type IN ('off_plan', 'secondary', 'distressed', 'urgent_sale')),
  bedrooms INTEGER,
  size_sqft INTEGER,
  area_id UUID REFERENCES areas(id) ON DELETE SET NULL,
  developer TEXT,
  price INTEGER NOT NULL,
  payment_plan TEXT,
  handover_date DATE,
  yield_percent DECIMAL(5, 2),
  notes TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agency_id UUID REFERENCES agencies(id) ON DELETE SET NULL,
  renewal_due_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  credits_used INTEGER NOT NULL DEFAULT 1
);

-- Create listing images table
CREATE TABLE IF NOT EXISTS listing_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_cover BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create commission terms table
CREATE TABLE IF NOT EXISTS commission_terms (
  listing_id UUID PRIMARY KEY REFERENCES listings(id) ON DELETE CASCADE,
  co_broke_percent DECIMAL(5, 2) NOT NULL DEFAULT 0,
  payment_terms TEXT,
  notes TEXT
);

-- Create requirements table
CREATE TABLE IF NOT EXISTS requirements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  deal_type TEXT NOT NULL CHECK (deal_type IN ('off_plan', 'secondary', 'distressed', 'urgent_sale')),
  property_type TEXT NOT NULL CHECK (property_type IN ('apartment', 'villa', 'townhouse', 'penthouse', 'office', 'retail', 'warehouse', 'land')),
  bedrooms INTEGER,
  area_id UUID REFERENCES areas(id) ON DELETE SET NULL,
  budget_min INTEGER,
  budget_max INTEGER,
  urgency TEXT NOT NULL DEFAULT 'active' CHECK (urgency IN ('hot', 'active', 'planning')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  posted_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

-- Create leads table
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  requirement_id UUID REFERENCES requirements(id) ON DELETE SET NULL,
  from_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lead_type TEXT NOT NULL CHECK (lead_type IN ('listing_enquiry', 'requirement_match')),
  lead_status TEXT NOT NULL DEFAULT 'new' CHECK (lead_status IN ('new', 'contacted', 'won', 'closed')),
  message TEXT,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  preferred_channel TEXT NOT NULL DEFAULT 'email' CHECK (preferred_channel IN ('email', 'whatsapp', 'both')),
  email_triggered_at TIMESTAMP WITH TIME ZONE,
  whatsapp_triggered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create chat participants table (to track who's in the conversation)
CREATE TABLE IF NOT EXISTS chat_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(listing_id, user_id)
);

-- Create activity log table
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_table TEXT,
  target_id UUID,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indices for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_agency_id ON users(agency_id);
CREATE INDEX idx_broker_profiles_user_id ON broker_profiles(user_id);
CREATE INDEX idx_broker_profiles_agency_id ON broker_profiles(agency_id);
CREATE INDEX idx_broker_credits_user_id ON broker_credits(user_id);
CREATE INDEX idx_listings_created_by ON listings(created_by);
CREATE INDEX idx_listings_agency_id ON listings(agency_id);
CREATE INDEX idx_listings_status ON listings(status);
CREATE INDEX idx_listings_area_id ON listings(area_id);
CREATE INDEX idx_listings_property_type ON listings(property_type);
CREATE INDEX idx_listings_price ON listings(price);
CREATE INDEX idx_listing_images_listing_id ON listing_images(listing_id);
CREATE INDEX idx_requirements_posted_by ON requirements(posted_by);
CREATE INDEX idx_requirements_area_id ON requirements(area_id);
CREATE INDEX idx_leads_listing_id ON leads(listing_id);
CREATE INDEX idx_leads_to_user_id ON leads(to_user_id);
CREATE INDEX idx_chat_messages_listing_id ON chat_messages(listing_id);
CREATE INDEX idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX idx_chat_participants_listing_id ON chat_participants(listing_id);
CREATE INDEX idx_chat_participants_user_id ON chat_participants(user_id);
CREATE INDEX idx_activity_log_created_at ON activity_log(created_at);

-- Enable RLS (Row Level Security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE broker_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE broker_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings DISABLE ROW LEVEL SECURITY;
ALTER TABLE listing_images DISABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE areas DISABLE ROW LEVEL SECURITY;
ALTER TABLE requirements DISABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can read their own profile and admin can read all
CREATE POLICY "users_select" ON users
  FOR SELECT USING (auth.uid() = id OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- Brokers can read their own profile
CREATE POLICY "broker_profiles_select" ON broker_profiles
  FOR SELECT USING (auth.uid() = user_id);

-- Brokers can read their own credits
CREATE POLICY "broker_credits_select" ON broker_credits
  FOR SELECT USING (auth.uid() = user_id);

-- RLS for leads - users can see leads assigned to them
CREATE POLICY "leads_select" ON leads
  FOR SELECT USING (auth.uid() = to_user_id OR auth.uid() = from_user_id OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- RLS for chat messages - only users in the chat can see messages
CREATE POLICY "chat_messages_select" ON chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_participants 
      WHERE chat_participants.listing_id = chat_messages.listing_id 
      AND chat_participants.user_id = auth.uid()
    )
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- RLS for chat participants
CREATE POLICY "chat_participants_select" ON chat_participants
  FOR SELECT USING (
    auth.uid() = user_id 
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );
