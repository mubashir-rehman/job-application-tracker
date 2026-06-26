import { supabase, isSupabaseConfigured } from '../supabaseClient';

// Tailored resumes generated from the master CV for a specific job. Cloud rows
// live in tailored_resumes (RLS-scoped, FK job_id → job_applications). Entries
// generated via the "quick paste" fallback have no job and stay localStorage-only.
// Client ids are generated up front so the local mirror and cloud row share an id.

export interface TailoredResume {
  id: string;
  jobId: string | null; // FK to job_applications.id; null = quick-paste (local only)
  label: string;        // display fallback when there's no jobId (JD snippet, etc.)
  version: number;
  contentMd: string;
  createdAt: string;
}

function fromRow(r: any): TailoredResume {
  return {
    id: r.id,
    jobId: r.job_id ?? null,
    label: '', // resolved from the application in the UI
    version: r.version ?? 1,
    contentMd: r.content_md ?? '',
    createdAt: r.created_at ?? new Date().toISOString(),
  };
}

function toRow(t: TailoredResume, userId: string) {
  return {
    id: t.id,
    userId,
    job_id: t.jobId,
    version: t.version,
    content_md: t.contentMd,
  };
}

export const tailoredResumeService = {
  async fetchAll(userId: string): Promise<TailoredResume[] | null> {
    if (!isSupabaseConfigured || !supabase) return null;
    const { data, error } = await supabase
      .from('tailored_resumes')
      .select('*')
      .eq('userId', userId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching tailored_resumes:', error);
      throw error;
    }
    return (data || []).map(fromRow);
  },

  async add(userId: string, t: TailoredResume): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) return false;
    const { error } = await supabase.from('tailored_resumes').insert([toRow(t, userId)]);
    if (error) {
      console.error('Error inserting tailored_resume:', error);
      throw error;
    }
    return true;
  },

  async remove(userId: string, id: string): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) return false;
    const { error } = await supabase.from('tailored_resumes').delete().eq('id', id).eq('userId', userId);
    if (error) {
      console.error('Error deleting tailored_resume:', error);
      throw error;
    }
    return true;
  },
};
