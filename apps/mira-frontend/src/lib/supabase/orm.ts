import { Database } from '@/constants/database.types';
import { SupabaseClient, User } from '@supabase/supabase-js';

export const Tables = {
  Workspace: 'Workspace',
};

//=========================
// Auth
//=========================
export async function getAuthUser(supabase: SupabaseClient): Promise<User | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

//=========================
// Workspace
//=========================
export type WorkspaceRecord = Database['public']['Tables']['Workspace'];
export type WorkspaceRow = WorkspaceRecord['Row'];

export const createWorkspace = async (supabase: SupabaseClient, Workspace: WorkspaceRecord['Insert']) => {
  try {
    const { data, error } = await supabase.from(Tables.Workspace).insert(Workspace).select('*').single();

    if (error) {
      console.error('Error inserting Workspace:', error);
      throw new Error(error.message);
    }

    return data;
  } catch (err) {
    console.error('Unexpected error in createWorkspace:', err);
    throw new Error('Failed to create Workspace');
  }
};

export const updateWorkspace = async (
  supabase: SupabaseClient,
  WorkspaceId: string,
  updatedFields: Partial<WorkspaceRecord['Update']>
) => {
  try {
    const { data, error } = await supabase
      .from(Tables.Workspace)
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

export const getWorkspaceById = async (supabase: SupabaseClient, WorkspaceId: string) => {
  try {
    const { data, error } = await supabase.from(Tables.Workspace).select('*').eq('id', WorkspaceId).single();

    if (error) {
      console.error('Error fetching Workspace by ID:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Unexpected error in getWorkspaceById:', err);
    return null;
  }
};

export const getWorkspaces = async (supabase: SupabaseClient, authUserId: string) => {
  try {
    const { data, error } = await supabase
      .from(Tables.Workspace)
      .select('*')
      .eq('user_id', authUserId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching Workspaces for user:', error);
      return [];
    }

    return data;
  } catch (err) {
    console.error('Unexpected error in getWorkspaces:', err);
    return [];
  }
};

export const deleteWorkspaceById = async (supabase: SupabaseClient, WorkspaceId: string) => {
  try {
    const { data, error } = await supabase.from(Tables.Workspace).delete().eq('id', WorkspaceId).select('id').single();

    if (error) {
      console.error('Error deleting Workspace by ID:', error);
      throw new Error(error.message);
    }

    return data;
  } catch (err) {
    console.error('Unexpected error in deleteWorkspaceById:', err);
    throw new Error('Failed to delete Workspace');
  }
};
