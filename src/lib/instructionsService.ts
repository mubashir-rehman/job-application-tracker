import { supabase, isSupabaseConfigured } from '../supabaseClient';

// Cloud persistence for the user's custom tailoring instructions (system prompt
// used when generating tailored resumes). Mirrors masterResumeService: one
// current row per user in resume_instructions, RLS-scoped, signed-in only.

export interface InstructionsRow {
  id: string;
  content_md: string;
  version: number;
}

export const instructionsService = {
  async fetchCurrent(userId: string): Promise<InstructionsRow | null> {
    if (!isSupabaseConfigured || !supabase) return null;
    const { data, error } = await supabase
      .from('resume_instructions')
      .select('id, content_md, version')
      .eq('userId', userId)
      .eq('is_current', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      console.error('Error fetching resume_instructions:', error);
      throw error;
    }
    return (data as InstructionsRow) ?? null;
  },

  // Update the current row in place, or insert version 1 if none exists.
  async save(userId: string, contentMd: string): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) return false;
    const current = await this.fetchCurrent(userId);
    if (current) {
      const { error } = await supabase
        .from('resume_instructions')
        .update({ content_md: contentMd })
        .eq('id', current.id)
        .eq('userId', userId);
      if (error) {
        console.error('Error updating resume_instructions:', error);
        throw error;
      }
    } else {
      const { error } = await supabase
        .from('resume_instructions')
        .insert([{ userId, content_md: contentMd, version: 1, is_current: true }]);
      if (error) {
        console.error('Error inserting resume_instructions:', error);
        throw error;
      }
    }
    return true;
  },
};
