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

## 🛠️ Supabase Configuration, Auth & Setup Instructions

To hook up your Supabase database with your Vercel deployment and enable secure multi-user Google/Email accounts:

### 1. Setup the Database Schema

Choose one of the two methods below to initialize or update your Supabase database schema:

#### Option A: Automated Database Migration (Super Easy)
We have provided an automated migration script that connects directly to your Supabase PostgreSQL database to create the tables, verify columns, and configure security permissions.

1. In your `.env` file, add your **Database Password** (defined during your Supabase project creation):
   ```env
   SUPABASE_DB_PASSWORD="your-supabase-db-password"
   ```
   *Alternatively, you can provide the full `DATABASE_URL` transaction/session connection string.*
2. Run the migration script command:
   ```bash
   npm run db:migrate
   ```

#### Option B: Manual SQL Editor (Fallback)
Log in to your **Supabase Dashboard**, select your project, open the **SQL Editor**, create a **New Query**, paste the following script (also saved in `supabase/migrations/20260624000000_setup_job_applications.sql`), and click **Run**:

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
  "createdAt" text not null,
  "userId" text -- Associates opportunities with signed-in users
);

-- Disable Row Level Security (RLS) for simple integration or configure an active policy:
alter table public.job_applications disable row level security;
```

### 2. Configure Google Sign-In Provider (Optional but Recommended)
1. Go to the **Google Cloud Console**, create a project, and navigate to **APIs & Services > OAuth consent screen**. Create an **External** screen.
2. Under **Credentials > Create Credentials**, select **OAuth client ID** and set the application type to **Web Application**.
3. In your **Supabase Dashboard**, navigate to **Authentication > Providers > Google**. Enable Google, and copy the **Redirect URI**.
4. Paste this Redirect URI into Google Cloud Console's **Authorized redirect URIs** section, then save to generate your **Client ID** and **Client Secret**.
5. Paste these Google credentials back into your Supabase Google Provider panel and click **Save**. You are now ready to log in with Google popups!

### 3. Configure Environment Variables

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
