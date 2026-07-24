import { supabase, isSupabaseConfigured } from '../supabaseClient';

// Cloud persistence for Track 4 Prompt Manager overrides (every configurable
// prompt except tailoring instructions, which keeps its own resume_instructions
// table). One row per (user, prompt_key) in prompt_overrides, RLS-scoped,
// signed-in only — guests stay localStorage-only via usePromptOverrides.

export interface PromptOverrideRow {
  prompt_key: string;
  content: string;
  updated_at: string;
}

export const promptOverridesService = {
  async fetchAll(userId: string): Promise<PromptOverrideRow[]> {
    if (!isSupabaseConfigured || !supabase) return [];
    const { data, error } = await supabase
      .from('prompt_overrides')
      .select('prompt_key, content, updated_at')
      .eq('userId', userId);
    if (error) {
      console.error('Error fetching prompt_overrides:', error);
      throw error;
    }
    return (data as PromptOverrideRow[]) ?? [];
  },

  // Upsert on (userId, prompt_key) — the migration's unique index makes this safe.
  async save(userId: string, promptKey: string, content: string): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) return false;
    const { error } = await supabase
      .from('prompt_overrides')
      .upsert([{ userId, prompt_key: promptKey, content, updated_at: new Date().toISOString() }], { onConflict: 'userId,prompt_key' });
    if (error) {
      console.error('Error saving prompt_overrides:', error);
      throw error;
    }
    return true;
  },

  async reset(userId: string, promptKey: string): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) return false;
    const { error } = await supabase
      .from('prompt_overrides')
      .delete()
      .eq('userId', userId)
      .eq('prompt_key', promptKey);
    if (error) {
      console.error('Error deleting prompt_overrides row:', error);
      throw error;
    }
    return true;
  },
};
