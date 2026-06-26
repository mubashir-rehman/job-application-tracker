import { supabase, isSupabaseConfigured } from '../supabaseClient';

// Personal-profile knowledge bank: categorized interview gaps / strengths /
// improvements. Cloud rows live in profile_entries (RLS-scoped to the user);
// guests stay localStorage-only. Client ids are generated up front so the
// localStorage mirror and the cloud row share the same id (optimistic UI).

export type EntryKind = 'gap' | 'strength' | 'improvement';
export type EntryStatus = 'open' | 'in_progress' | 'resolved';

export interface ProfileEntry {
  id: string;
  category: string;
  kind: EntryKind;
  topic: string;
  detail: string;
  severity: number; // 1-5
  status: EntryStatus;
  action: string;
  createdAt: string;
}

// Mirrors the seeded profile_competencies categories (system source of truth).
export const KB_CATEGORIES = [
  'Character',
  'Communication / Speaking',
  'CS Fundamentals',
  'Hands-on Coding',
  'System Design',
  'Tool Depth',
  'Domain Knowledge',
  'Behavioral / STAR',
  'Negotiation',
  'Presence / Confidence',
  'Time Management',
];

// DB row → client entry (first_seen is the canonical created timestamp).
function fromRow(r: any): ProfileEntry {
  return {
    id: r.id,
    category: r.category,
    kind: r.kind,
    topic: r.topic,
    detail: r.detail ?? '',
    severity: r.severity ?? 3,
    status: r.status,
    action: r.action ?? '',
    createdAt: r.first_seen ?? new Date().toISOString(),
  };
}

function toRow(e: ProfileEntry, userId: string) {
  return {
    id: e.id,
    userId,
    category: e.category,
    kind: e.kind,
    topic: e.topic,
    detail: e.detail || null,
    severity: e.severity,
    status: e.status,
    action: e.action || null,
  };
}

export const knowledgeBankService = {
  async fetchEntries(userId: string): Promise<ProfileEntry[] | null> {
    if (!isSupabaseConfigured || !supabase) return null;
    const { data, error } = await supabase
      .from('profile_entries')
      .select('*')
      .eq('userId', userId)
      .order('first_seen', { ascending: false });
    if (error) {
      console.error('Error fetching profile_entries:', error);
      throw error;
    }
    return (data || []).map(fromRow);
  },

  async addEntry(userId: string, entry: ProfileEntry): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) return false;
    const { error } = await supabase.from('profile_entries').insert([toRow(entry, userId)]);
    if (error) {
      console.error('Error inserting profile_entry:', error);
      throw error;
    }
    return true;
  },

  async updateEntry(userId: string, entry: ProfileEntry): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) return false;
    const { error } = await supabase
      .from('profile_entries')
      .update(toRow(entry, userId))
      .eq('id', entry.id)
      .eq('userId', userId);
    if (error) {
      console.error('Error updating profile_entry:', error);
      throw error;
    }
    return true;
  },

  async deleteEntry(userId: string, id: string): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) return false;
    const { error } = await supabase.from('profile_entries').delete().eq('id', id).eq('userId', userId);
    if (error) {
      console.error('Error deleting profile_entry:', error);
      throw error;
    }
    return true;
  },
};
