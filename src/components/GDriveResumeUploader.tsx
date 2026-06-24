import React, { useState, useEffect } from 'react';
import { Upload, Check, Loader, Cloud, FileText, Lock } from 'lucide-react';
import { getGoogleAccessToken, uploadResumeToDrive } from '../lib/googleDriveService';
import { supabase } from '../supabaseClient';

interface GDriveResumeUploaderProps {
  onUploadSuccess: (url: string) => void;
  currentLink?: string;
  id?: string;
}

export default function GDriveResumeUploader({ onUploadSuccess, currentLink, id }: GDriveResumeUploaderProps) {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; url: string } | null>(null);

  // Check if Google Drive is authorized on mount and session changes
  useEffect(() => {
    let active = true;
    async function checkConnection() {
      if (!supabase) {
        setIsConnected(false);
        return;
      }
      
      const token = await getGoogleAccessToken();
      if (active) {
        setIsConnected(!!token);
      }
    }

    checkConnection();

    // Listen to auth state updates
    const { data: { subscription } } = supabase?.auth.onAuthStateChange(() => {
      checkConnection();
    }) ?? { data: { subscription: null } };

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, []);

  const handleFileChange = async (file: File) => {
    if (!file) return;
    
    setIsUploading(true);
    setUploadError(null);
    try {
      const result = await uploadResumeToDrive(file);
      setUploadedFile({ name: file.name, url: result.viewLink });
      onUploadSuccess(result.viewLink);
    } catch (err: any) {
      console.error("GDrive Upload Error:", err);
      setUploadError(err.message || "Failed to upload file to Google Drive.");
    } finally {
      setIsUploading(false);
    }
  };

  const onDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleManualSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileChange(e.target.files[0]);
    }
  };

  if (isConnected === null) {
    return (
      <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono py-1">
        <Loader className="w-3 h-3 animate-spin text-indigo-500" />
        <span>Initializing Google Drive context...</span>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="mt-1 bg-slate-900/50 border border-slate-800/80 rounded-xl p-3 text-left">
        <div className="flex items-start gap-2.5">
          <div className="p-1.5 bg-slate-950 rounded-lg text-slate-500">
            <Lock className="w-3.5 h-3.5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
              Google Drive Upload Disabled
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
              Sign in with Google to enable direct, secure resume uploads to your private Drive.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-1">
      <div
        onDragEnter={onDrag}
        onDragOver={onDrag}
        onDragLeave={onDrag}
        onDrop={onDrop}
        className={`relative border border-dashed rounded-xl p-3.5 transition-all text-center flex flex-col items-center justify-center cursor-pointer ${
          dragActive 
            ? 'border-indigo-500 bg-indigo-500/5' 
            : 'border-slate-800 bg-slate-900/20 hover:border-slate-700 hover:bg-slate-900/40'
        }`}
      >
        <input
          type="file"
          id={`gdrive-file-input-${id || 'default'}`}
          className="hidden"
          accept=".pdf,.docx,.doc"
          onChange={handleManualSelect}
          disabled={isUploading}
        />
        
        <label 
          htmlFor={`gdrive-file-input-${id || 'default'}`}
          className="cursor-pointer w-full h-full flex flex-col items-center justify-center gap-1.5"
        >
          {isUploading ? (
            <>
              <Loader className="w-5 h-5 text-indigo-500 animate-spin" />
              <p className="text-[11px] font-semibold text-indigo-400">
                Uploading to "HireTrack Resumes" folder...
              </p>
            </>
          ) : uploadedFile ? (
            <>
              <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <Check className="w-3.5 h-3.5" />
              </div>
              <p className="text-[11px] font-semibold text-emerald-400 truncate max-w-[200px]" title={uploadedFile.name}>
                Uploaded: {uploadedFile.name}
              </p>
              <span className="text-[9px] text-slate-500 font-mono">
                Click or drag to replace
              </span>
            </>
          ) : (
            <>
              <Cloud className="w-5 h-5 text-indigo-500" />
              <div className="text-[11px] text-slate-300">
                <span className="font-semibold text-indigo-400 hover:underline">Upload to Google Drive</span>
                <span className="text-slate-500"> or drag & drop</span>
              </div>
              <p className="text-[9px] text-slate-500 font-mono flex items-center gap-1 justify-center">
                <FileText className="w-3 h-3 text-slate-600" />
                Supports PDF, DOCX
              </p>
            </>
          )}
        </label>
      </div>

      {uploadError && (
        <p className="text-[10px] text-red-400 mt-1.5 text-left font-mono">
          ⚠️ {uploadError}
        </p>
      )}
    </div>
  );
}
