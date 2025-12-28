-- Demo data seed script
-- This will create sample devices for testing (run this after user signup)

-- Note: Replace the user_id values with your actual user ID from auth.users table
-- You can get your user ID by running: SELECT id FROM auth.users WHERE email = 'your-email@example.com';

-- Example device inserts (uncomment and update user_id after signup):
-- INSERT INTO public.devices (user_id, name, hostname, ip_address, os_version, status, connection_status, cpu_usage, memory_usage, disk_usage)
-- VALUES 
--   ('YOUR_USER_ID_HERE', 'Production Server', 'PROD-WEB-01', '192.168.1.100', 'Windows Server 2022', 'online', 'connected', 45.2, 62.8, 78.5),
--   ('YOUR_USER_ID_HERE', 'Development Workstation', 'DEV-PC-01', '192.168.1.101', 'Windows 11 Pro', 'online', 'connected', 32.1, 48.3, 55.2),
--   ('YOUR_USER_ID_HERE', 'Database Server', 'DB-SERVER-01', '192.168.1.102', 'Windows Server 2019', 'online', 'connected', 68.5, 85.2, 92.1),
--   ('YOUR_USER_ID_HERE', 'Backup Server', 'BACKUP-01', '192.168.1.103', 'Windows Server 2022', 'offline', 'disconnected', 15.3, 25.7, 45.8);
