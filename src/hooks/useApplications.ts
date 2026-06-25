import { useState, useEffect } from 'react';
import React from 'react';
import { JobApplication } from '../types';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { supabaseService } from '../lib/supabaseService';
import { User as SupabaseUser } from '@supabase/supabase-js';

function getStorageKey(user: SupabaseUser | null) {
  return user ? `hiretrack_applications_user_${user.id}` : 'hiretrack_applications_guest';
}

export function useApplications(user: SupabaseUser | null) {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  const saveLocalOnly = (updatedList: JobApplication[]) => {
    setApplications(updatedList);
    localStorage.setItem(getStorageKey(user), JSON.stringify(updatedList));
  };

  useEffect(() => {
    const key = getStorageKey(user);

    // Migrate legacy guest data
    if (!localStorage.getItem('hiretrack_applications_guest') && localStorage.getItem('hiretrack_applications')) {
      const legacy = localStorage.getItem('hiretrack_applications');
      if (legacy) localStorage.setItem('hiretrack_applications_guest', legacy);
    }

    const loadLocalFallback = () => {
      const saved = localStorage.getItem(key);
      if (saved) {
        try { setApplications(JSON.parse(saved)); }
        catch { setApplications([]); }
      } else {
        setApplications([]);
      }
    };

    const loadData = async () => {
      setIsLoading(true);
      setDbError(null);

      if (isSupabaseConfigured) {
        try {
          const cloudData = await supabaseService.fetchApplications(user?.id);
          if (cloudData && cloudData.length > 0) {
            setApplications(cloudData);
            localStorage.setItem(key, JSON.stringify(cloudData));
          } else {
            loadLocalFallback();
          }
        } catch (err: unknown) {
          console.error('Supabase load failed, falling back to local storage', err);
          const msg = err instanceof Error ? err.message : '';
          let userFriendlyMessage = 'Could not retrieve cloud data. Loading offline backup.';
          if (msg.includes('relation') && (msg.includes('does not exist') || msg.includes('not found'))) {
            userFriendlyMessage = "Supabase connection is active, but the 'job_applications' table was not found. Please refer to 'supabase/migrations/' to run the database setup scripts.";
          } else if ((msg.includes('column') || msg.includes('attribute')) && msg.toLowerCase().includes('userid')) {
            userFriendlyMessage = "Database Schema Error: The 'userId' column is missing. Please run the SQL schema migration.";
          } else if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('network')) {
            userFriendlyMessage = 'Network Connection Error: Unable to reach Supabase. Check your internet connection or VITE_SUPABASE_URL.';
          } else if (msg.includes('JWT') || msg.includes('invalid') || msg.includes('key')) {
            userFriendlyMessage = 'Authentication Key Error: Your Supabase API key is invalid or expired.';
          } else if (msg) {
            userFriendlyMessage = `Supabase Error: ${msg}. Loading offline backup.`;
          }
          setDbError(userFriendlyMessage);
          loadLocalFallback();
        }
      } else {
        loadLocalFallback();
      }

      setIsLoading(false);
    };

    loadData();
  }, [user]);

  const addApplication = async (newApp: JobApplication, showToast: (m: string, t: any) => void) => {
    const updated = [newApp, ...applications];
    saveLocalOnly(updated);
    showToast(`Successfully added ${newApp.companyName} to your pipeline.`, 'success');
    if (isSupabaseConfigured) {
      try { await supabaseService.addApplication(newApp, user?.id); }
      catch { showToast('Failed to save to cloud. Saved locally in offline sandbox mode.', 'warning'); }
    }
  };

  const updateApplication = async (updatedApp: JobApplication, showToast: (m: string, t: any) => void) => {
    const updated = applications.map(app => app.id === updatedApp.id ? updatedApp : app);
    saveLocalOnly(updated);
    showToast(`Successfully updated details for ${updatedApp.companyName}.`, 'success');
    if (isSupabaseConfigured) {
      try { await supabaseService.updateApplication(updatedApp, user?.id); }
      catch { showToast('Failed to update on cloud. Updated locally in offline sandbox mode.', 'warning'); }
    }
  };

  const deleteApplication = async (id: string, showToast: (m: string, t: any) => void) => {
    const app = applications.find(a => a.id === id);
    const companyName = app?.companyName ?? 'Application';
    const updated = applications.filter(a => a.id !== id);
    saveLocalOnly(updated);
    showToast(`Successfully deleted ${companyName} from your pipeline.`, 'success');
    if (isSupabaseConfigured) {
      try { await supabaseService.deleteApplication(id, user?.id); }
      catch { showToast('Failed to delete from cloud, but deleted locally.', 'warning'); }
    }
  };

  const refreshFromCloud = async () => {
    if (!isSupabaseConfigured) return;
    const cloudData = await supabaseService.fetchApplications(user?.id);
    if (cloudData) saveLocalOnly(cloudData);
  };

  const exportData = (apps: JobApplication[]) => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(apps, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', 'hiretrack_applications_backup.json');
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return {
    applications,
    isLoading,
    dbError,
    addApplication,
    updateApplication,
    deleteApplication,
    refreshFromCloud,
    exportData,
  };
}
