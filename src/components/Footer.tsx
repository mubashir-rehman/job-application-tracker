import { Github } from 'lucide-react';

interface FooterProps {
  showLinks?: boolean;
}

export function Footer({ showLinks = true }: FooterProps) {
  return (
    <footer className="mt-16 pt-8 border-t border-slate-800/60 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-400 font-semibold font-sans">
      <div className="flex items-center gap-1.5">
        <span>Developed by</span>
        <a 
          href="https://mubashir-rehman.is-a.dev/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="font-extrabold text-slate-200 hover:text-indigo-400 dark:hover:text-indigo-400 transition-colors underline decoration-slate-800 hover:decoration-indigo-400 underline-offset-2"
          title="Visit Mubashir Rehman's Portfolio"
        >
          Mubashir Rehman
        </a>
      </div>
      {showLinks && (
        <div className="flex items-center gap-5 flex-wrap justify-center">
          <a 
            href="https://mubashir-rehman.is-a.dev/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-slate-200 transition-colors"
            title="Visit Portfolio"
          >
            Portfolio
          </a>
          <span className="w-1 h-1 rounded-full bg-slate-800" />
          <a 
            href="https://github.com/mubashir-rehman/job-application-tracker" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-colors"
            title="View GitHub Repository"
          >
            <Github className="w-4 h-4" />
            <span>GitHub Repo</span>
          </a>
          <span className="w-1 h-1 rounded-full bg-slate-800" />
          <a 
            href="/privacy" 
            className="text-slate-400 hover:text-slate-200 transition-colors"
            title="Read Privacy Policy"
          >
            Privacy Policy
          </a>
        </div>
      )}
    </footer>
  );
}
