import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { JobApplication } from '../types';

export const supabaseService = {
  /**
   * Fetches job applications from the Supabase DB, optionally scoped to a user
   */
  async fetchApplications(userId?: string): Promise<JobApplication[] | null> {
    if (!isSupabaseConfigured || !supabase) return null;

    try {
      let query = supabase
        .from('job_applications')
        .select('*');

      if (userId) {
        query = query.eq('userId', userId);
      } else {
        // If not logged in, we fetch where userId is null to avoid showing other users' records
        query = query.is('userId', null);
      }

      const { data, error } = await query.order('createdAt', { ascending: false });

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
  async addApplication(app: JobApplication, userId?: string): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) return false;

    try {
      const record = {
        ...app,
        userId: userId || null
      };

      const { error } = await supabase
        .from('job_applications')
        .insert([record]);

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
  async updateApplication(app: JobApplication, userId?: string): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) return false;

    try {
      const record = {
        ...app,
        userId: userId || null
      };

      let query = supabase
        .from('job_applications')
        .update(record)
        .eq('id', app.id);

      if (userId) {
        query = query.eq('userId', userId);
      }

      const { error } = await query;

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
  async deleteApplication(id: string, userId?: string): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) return false;

    try {
      let query = supabase
        .from('job_applications')
        .delete()
        .eq('id', id);

      if (userId) {
        query = query.eq('userId', userId);
      }

      const { error } = await query;

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
  async bulkSync(apps: JobApplication[], userId?: string): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase || apps.length === 0) return false;

    try {
      const records = apps.map(app => ({
        ...app,
        userId: userId || null
      }));

      const { error } = await supabase
        .from('job_applications')
        .upsert(records, { onConflict: 'id' });

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
