import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { JobApplication } from '../types';

export const supabaseService = {
  /**
   * Fetches all job applications from the Supabase DB
   */
  async fetchApplications(): Promise<JobApplication[] | null> {
    if (!isSupabaseConfigured || !supabase) return null;

    try {
      const { data, error } = await supabase
        .from('job_applications')
        .select('*')
        .order('createdAt', { ascending: false });

      if (error) {
        console.error('Error fetching from Supabase:', error);
        throw error;
      }

      return (data || []) as JobApplication[];
    } catch (err) {
      console.error('Failed to query job_applications table:', err);
      throw err;
    }
  },

  /**
   * Inserts a new job application into Supabase
   */
  async addApplication(app: JobApplication): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) return false;

    try {
      const { error } = await supabase
        .from('job_applications')
        .insert([app]);

      if (error) {
        console.error('Error adding application to Supabase:', error);
        throw error;
      }
      return true;
    } catch (err) {
      console.error('Failed to insert application:', err);
      throw err;
    }
  },

  /**
   * Updates an existing job application in Supabase
   */
  async updateApplication(app: JobApplication): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) return false;

    try {
      const { error } = await supabase
        .from('job_applications')
        .update(app)
        .eq('id', app.id);

      if (error) {
        console.error('Error updating application in Supabase:', error);
        throw error;
      }
      return true;
    } catch (err) {
      console.error('Failed to update application:', err);
      throw err;
    }
  },

  /**
   * Deletes a job application from Supabase
   */
  async deleteApplication(id: string): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) return false;

    try {
      const { error } = await supabase
        .from('job_applications')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting from Supabase:', error);
        throw error;
      }
      return true;
    } catch (err) {
      console.error('Failed to delete application:', err);
      throw err;
    }
  },

  /**
   * Uploads multiple records in bulk (useful for Syncing local storage)
   */
  async bulkSync(apps: JobApplication[]): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase || apps.length === 0) return false;

    try {
      const { error } = await supabase
        .from('job_applications')
        .upsert(apps, { onConflict: 'id' });

      if (error) {
        console.error('Error in bulkupsert in Supabase:', error);
        throw error;
      }
      return true;
    } catch (err) {
      console.error('Failed to bulk sync applications:', err);
      throw err;
    }
  }
};
