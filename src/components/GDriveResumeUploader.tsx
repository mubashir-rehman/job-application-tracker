import { Lock } from 'lucide-react';

interface GDriveResumeUploaderProps {
  onUploadSuccess: (url: string) => void;
  currentLink?: string;
  id?: string;
}

export default function GDriveResumeUploader({ onUploadSuccess: _onUploadSuccess, currentLink: _currentLink, id: _id }: GDriveResumeUploaderProps) {
  return (
    <div className="mt-1 bg-slate-900/50 border border-slate-800/80 rounded-xl p-3 text-left">
      <div className="flex items-start gap-2.5">
        <div className="p-1.5 bg-slate-950 rounded-lg text-slate-500">
          <Lock className="w-3.5 h-3.5" />
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
            Google Drive Upload — Coming Soon
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
            Google Drive integration is temporarily unavailable while under review. Use a manual resume link below.
          </p>
        </div>
      </div>
    </div>
  );
}
