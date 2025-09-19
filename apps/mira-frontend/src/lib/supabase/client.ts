import { createBrowserClient } from '@supabase/ssr';
import { Database } from '../../constants/database.types';

const SUPABASE_URL = process.env['NEXT_PUBLIC_SUPABASE_URL'];
const SUPABASE_ANON_KEY = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('SUPABASE_URL or SUPABASE_ANON_KEY is missing from the environment variables in client');
  throw new Error('Missing credentials for connecting the database in client');
}

export const createSupabaseClient = () => createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
