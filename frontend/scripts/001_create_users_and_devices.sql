-- Create users profile table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create devices table
CREATE TABLE IF NOT EXISTS public.devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  hostname TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  os_version TEXT,
  status TEXT DEFAULT 'offline',
  connection_status TEXT DEFAULT 'disconnected',
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  windows_username TEXT NOT NULL DEFAULT 'Administrator',
  wallpaper_url TEXT DEFAULT '/placeholder.svg',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on devices
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

-- Devices policies
CREATE POLICY "Users can view their own devices"
  ON public.devices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own devices"
  ON public.devices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own devices"
  ON public.devices FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own devices"
  ON public.devices FOR DELETE
  USING (auth.uid() = user_id);

-- Create device files table
CREATE TABLE IF NOT EXISTS public.device_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  size BIGINT DEFAULT 0,
  modified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on device files
ALTER TABLE public.device_files ENABLE ROW LEVEL SECURITY;

-- Device files policies
CREATE POLICY "Users can view files of their devices"
  ON public.device_files FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert files for their devices"
  ON public.device_files FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update files of their devices"
  ON public.device_files FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete files of their devices"
  ON public.device_files FOR DELETE
  USING (auth.uid() = user_id);

-- Create device services table
CREATE TABLE IF NOT EXISTS public.device_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  status TEXT NOT NULL,
  startup_type TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on device services
ALTER TABLE public.device_services ENABLE ROW LEVEL SECURITY;

-- Device services policies
CREATE POLICY "Users can view services of their devices"
  ON public.device_services FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert services for their devices"
  ON public.device_services FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update services of their devices"
  ON public.device_services FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete services of their devices"
  ON public.device_services FOR DELETE
  USING (auth.uid() = user_id);

-- Create shell sessions table
CREATE TABLE IF NOT EXISTS public.shell_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shell_type TEXT NOT NULL,
  command TEXT NOT NULL,
  output TEXT,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on shell sessions
ALTER TABLE public.shell_sessions ENABLE ROW LEVEL SECURITY;

-- Shell sessions policies
CREATE POLICY "Users can view their shell sessions"
  ON public.shell_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their shell sessions"
  ON public.shell_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create trigger function for updating updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_devices_updated_at
  BEFORE UPDATE ON public.devices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_device_services_updated_at
  BEFORE UPDATE ON public.device_services
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
