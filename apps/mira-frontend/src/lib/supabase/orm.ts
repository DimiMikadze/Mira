import { Database } from '@/constants/database.types';
import { SupabaseClient, User } from '@supabase/supabase-js';

export const Tables = {
  Campaign: 'Campaign',
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
// Campaign
//=========================
export type CampaignRecord = Database['public']['Tables']['Campaign'];
export type CampaignRow = CampaignRecord['Row'];

export const createCampaign = async (supabase: SupabaseClient, campaign: CampaignRecord['Insert']) => {
  try {
    const { data, error } = await supabase.from(Tables.Campaign).insert(campaign).select('*').single();

    if (error) {
      console.error('Error inserting campaign:', error);
      throw new Error(error.message);
    }

    return data;
  } catch (err) {
    console.error('Unexpected error in createCampaign:', err);
    throw new Error('Failed to create campaign');
  }
};

export const updateCampaign = async (
  supabase: SupabaseClient,
  campaignId: string,
  updatedFields: Partial<CampaignRecord['Update']>
) => {
  try {
    const { data, error } = await supabase
      .from(Tables.Campaign)
      .update(updatedFields)
      .eq('id', campaignId)
      .select('id')
      .select('*')
      .single();

    if (error) {
      console.error('Error updating campaign:', error);
      throw new Error(error.message);
    }

    return data;
  } catch (err) {
    console.error('Unexpected error in updateCampaign:', err);
    throw new Error('Failed to update campaign');
  }
};

export const getCampaignById = async (supabase: SupabaseClient, campaignId: string) => {
  try {
    const { data, error } = await supabase.from(Tables.Campaign).select('*').eq('id', campaignId).single();

    if (error) {
      console.error('Error fetching campaign by ID:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Unexpected error in getCampaignById:', err);
    return null;
  }
};

export const getCampaigns = async (supabase: SupabaseClient, authUserId: string) => {
  try {
    const { data, error } = await supabase
      .from(Tables.Campaign)
      .select('*')
      .eq('user_id', authUserId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching campaigns for user:', error);
      return [];
    }

    return data;
  } catch (err) {
    console.error('Unexpected error in getCampaigns:', err);
    return [];
  }
};

export const deleteCampaignById = async (supabase: SupabaseClient, campaignId: string) => {
  try {
    const { data, error } = await supabase.from(Tables.Campaign).delete().eq('id', campaignId).select('id').single();

    if (error) {
      console.error('Error deleting campaign by ID:', error);
      throw new Error(error.message);
    }

    return data;
  } catch (err) {
    console.error('Unexpected error in deleteCampaignById:', err);
    throw new Error('Failed to delete campaign');
  }
};
