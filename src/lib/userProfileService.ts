import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { UserProfile } from './userProfile';

// Cloud persistence for the User Profile hard rules. Mirrors masterResumeService
// / instructionsService exactly: one current row per user in user_profile,
// content stored as jsonb, RLS-scoped, signed-in only (guests stay
// localStorage-only via useUserProfile).

export interface UserProfileRow {
  id: string;
  content: UserProfile;
  version: number;
}

export const userProfileService = {
  async fetchCurrent(userId: string): Promise<UserProfileRow | null> {
    if (!isSupabaseConfigured || !supabase) return null;
    const { data, error } = await supabase
      .from('user_profile')
      .select('id, content, version')
      .eq('userId', userId)
      .eq('is_current', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      console.error('Error fetching user_profile:', error);
      throw error;
    }
    return (data as UserProfileRow) ?? null;
  },

  // Update the current row in place, or insert version 1 if none exists.
  async save(userId: string, content: UserProfile): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) return false;
    const current = await this.fetchCurrent(userId);
    if (current) {
      const { error } = await supabase
        .from('user_profile')
        .update({ content })
        .eq('id', current.id)
        .eq('userId', userId);
      if (error) {
        console.error('Error updating user_profile:', error);
        throw error;
      }
    } else {
      const { error } = await supabase
        .from('user_profile')
        .insert([{ userId, content, version: 1, is_current: true }]);
      if (error) {
        console.error('Error inserting user_profile:', error);
        throw error;
      }
    }
    return true;
  },
};
