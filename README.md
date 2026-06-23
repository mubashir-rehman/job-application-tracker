# HireTrack: Developer Job Opportunity Tracker & Supabase Bridge

HireTrack is a premium, high-fidelity developer application designed specifically for tracking active software engineering pipelines, interview rounds, salaries, benefits, and technical criteria.

It is currently deployed live on Vercel at: **[https://job-application-tracker-sigma-liard.vercel.app/](https://job-application-tracker-sigma-liard.vercel.app/)**

---

## 🚀 Key Features

*   **7-Phase Application Pipeline**: Track stages from initial submission, recruiter prescreens, technical deep-dives, systems architecture rounds, to final decision makers and negotiations.
*   **Aesthetic Dark UI**: Styled using an elegant glassmorphic dark twilight design with responsive layouts and negative-space accents.
*   **Offline Sandboxing**: Stores and loads from client-side `localStorage` immediately, serving as a robust fallback.
*   **Supabase PostgreSQL Bridge**: Integrates directly with Supabase for cloud persistence, enabling access across devices and preventing data loss.
*   **Interactive SQL Initialization**: Built-in script generation allows you to bootstrap your cloud database with a single click.

---

## 🛠️ Supabase Configuration & Setup Instructions

To hook up your Supabase database with your Vercel deployment and local workspace:

### 1. Execute the Database Script
Log in to your **Supabase Dashboard**, select your project, open the **SQL Editor**, create a **New Query**, paste the following script, and click **Run**:

```sql
create table if not exists public.job_applications (
  "id" text primary key,
  "companyName" text not null,
  "targetRole" text not null,
  "workModel" text not null,
  "location" text,
  "salaryRange" text,
  "otherBenefits" text,
  "hrContact" text,
  "appliedVia" text not null,
  "resumeLink" text,
  "portfolioLink" text,
  "keyJdRequirements" text,
  "currentStatus" text not null,
  "phases" jsonb not null default '[]'::jsonb,
  "postMortem" jsonb not null default '{}'::jsonb,
  "createdAt" text not null
);

-- Disable Row Level Security (RLS) for simple integration or configure an active policy:
alter table public.job_applications disable row level security;
```

### 2. Configure Environment Variables

Create a `.env` file in your workspace root (or set them directly in Vercel):

```env
# Client environment variables prefix for Vite compilation
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-api-key
```

### 3. Deploy to Vercel
1. Go to your **Vercel Dashboard** and click on your HireTrack project.
2. Navigate to **Settings** > **Environment Variables**.
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` with the credentials obtained from your Supabase settings page.
4. Go to **Deployments**, choose your latest commit, click **Redeploy** (or push a new commit) to compile the credentials into the client-side bundle.

---

## 📦 Local Installation & Development

```bash
# Install dependencies
npm install

# Start development server on port 3000
npm run dev

# Run linter
npm run lint

# Build production artifact
npm run build
```

---

*Keep track of your interview pipeline cleanly and secure your next big engineering role!*
