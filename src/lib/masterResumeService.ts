import { supabase, isSupabaseConfigured } from '../supabaseClient';

// Cloud persistence for the master CV (the single source of truth).
// Stores the raw markdown in master_resume.content_md; the `structured`
// jsonb column is reserved for the parsed/tagged version produced later by
// the master-CV prompt. RLS scopes every row to the authenticated user, so
// these calls only apply when signed in (guests stay localStorage-only).

export interface MasterResumeRow {
  id: string;
  content_md: string;
  version: number;
}

export const masterResumeService = {
  // The user's current master CV (most recent is_current row), or null.
  async fetchCurrent(userId: string): Promise<MasterResumeRow | null> {
    if (!isSupabaseConfigured || !supabase) return null;
    const { data, error } = await supabase
      .from('master_resume')
      .select('id, content_md, version')
      .eq('userId', userId)
      .eq('is_current', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      console.error('Error fetching master_resume:', error);
      throw error;
    }
    return (data as MasterResumeRow) ?? null;
  },

  // Upsert the current master CV: update the existing current row in place,
  // or insert version 1 if none exists. (Version snapshots can be added later.)
  async save(userId: string, contentMd: string): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) return false;
    const current = await this.fetchCurrent(userId);
    if (current) {
      const { error } = await supabase
        .from('master_resume')
        .update({ content_md: contentMd })
        .eq('id', current.id)
        .eq('userId', userId);
      if (error) {
        console.error('Error updating master_resume:', error);
        throw error;
      }
    } else {
      const { error } = await supabase
        .from('master_resume')
        .insert([{ userId, content_md: contentMd, version: 1, is_current: true }]);
      if (error) {
        console.error('Error inserting master_resume:', error);
        throw error;
      }
    }
    return true;
  },
};
