import { Database } from '@/constants/database.types';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error('SUPABASE_URL or SUPABASE_SERVICE_ROLE is missing from the environment variables in admin');
  throw new Error('Missing credentials for connecting the database in admin');
}

export const createSupabaseAdminClient = () =>
  createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
    // Service role should not manage sessions
    auth: { autoRefreshToken: false, persistSession: false },
  });
