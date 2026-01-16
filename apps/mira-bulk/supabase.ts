/**
 * Supabase Admin Client for mira-bulk
 *
 * This module provides a service-role Supabase client that bypasses Row Level Security (RLS).
 * Used for bulk operations that need direct database access without user authentication context.
 */

import { type Database } from './database.types.ts';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error('SUPABASE_URL or SUPABASE_SERVICE_ROLE is missing from the environment variables in admin');
  throw new Error('Missing credentials for connecting the database in admin');
}

/**
 * Creates a Supabase client with service role privileges.
 * Service role bypasses RLS policies and has full database access.
 */
export const createSupabaseAdminClient = () =>
  createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
    // Service role should not manage sessions since it's not tied to a user
    auth: { autoRefreshToken: false, persistSession: false },
  });

type WorkspaceRecord = Database['public']['Tables']['Workspace'];
type WorkspaceRow = WorkspaceRecord['Row'];

/**
 * Fetches a workspace by its ID.
 * @param id - The workspace UUID
 * @returns The workspace row from the database
 * @throws Error if workspace is not found
 */
export const getWorkspace = async (id: string): Promise<WorkspaceRow> => {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from('Workspace').select('*').eq('id', id).single();
  if (error || !data) {
    throw new Error(`Workspace not found: ${id}`);
  }
  return data;
};

/**
 * Updates the workspace
 * @param WorkspaceId - The workspace UUID
 * @param updatedFields
 * @returns
 */
export const updateWorkspace = async (WorkspaceId: string, updatedFields: Partial<WorkspaceRecord['Update']>) => {
  const supabase = createSupabaseAdminClient();
  try {
    const { data, error } = await supabase
      .from('Workspace')
      .update(updatedFields)
      .eq('id', WorkspaceId)
      .select('id')
      .select('*')
      .single();

    if (error) {
      console.error('Error updating Workspace:', error);
      throw new Error(error.message);
    }

    return data;
  } catch (err) {
    console.error('Unexpected error in updateWorkspace:', err);
    throw new Error('Failed to update Workspace');
  }
};
