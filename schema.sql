-- Supabase Schema
-- Run this in the Supabase SQL Editor

-- 1. Profiles Table
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    role TEXT CHECK (role IN ('Admin', 'Technician')) DEFAULT 'Technician',
    status TEXT CHECK (status IN ('active', 'inactive')) DEFAULT 'inactive',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, status)
    VALUES (NEW.id, NEW.email, 'inactive');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Stock Items Table (Warehouse generic items)
CREATE TABLE public.stock_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    quantity INTEGER DEFAULT 0 NOT NULL,
    is_serialized BOOLEAN DEFAULT false NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Serial Numbers Table (For serialized items)
CREATE TABLE public.serial_numbers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    stock_item_id UUID REFERENCES public.stock_items(id) ON DELETE CASCADE,
    serial_number TEXT UNIQUE NOT NULL,
    status TEXT CHECK (status IN ('warehouse', 'allocated', 'quarantine', 'faulty')) DEFAULT 'warehouse',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Allocations Table
CREATE TABLE public.allocations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id UUID REFERENCES public.profiles(id),
    technician_id UUID REFERENCES public.profiles(id) NOT NULL,
    stock_item_id UUID REFERENCES public.stock_items(id) NOT NULL,
    quantity INTEGER DEFAULT 1 NOT NULL,
    status TEXT CHECK (status IN ('pending_confirmation', 'confirmed', 'returned')) DEFAULT 'pending_confirmation',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Mapping for serialized allocations
CREATE TABLE public.allocation_serials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    allocation_id UUID REFERENCES public.allocations(id) ON DELETE CASCADE,
    serial_number_id UUID REFERENCES public.serial_numbers(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Audit Logs
CREATE TABLE public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    action TEXT NOT NULL,
    user_id UUID REFERENCES public.profiles(id),
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Set up Row Level Security (RLS) if needed.
-- For now, enabling access for authenticated users as a baseline.
-- (In a real production app, configure RLS policies appropriately.)
