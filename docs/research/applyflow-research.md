# ApplyFlow Research — Future-Work Reference

**Where this came from.** Harvested from the archived `applyflow` repo (its
`docs/SRS_DISCOVERY.md` and `AGENTS.md`, research dated June 9, 2026). ApplyFlow
never went past requirements discovery; it was superseded by HireTrack and
`upwork-automation-v2`. Its research is kept here so the open-source evaluation and
product thinking aren't lost.

**How to read this.** Everything below is a **candidate idea for future work**, not a
commitment to build. Repository status (activity, ownership, license, interfaces)
must be re-checked before adopting anything — the notes are ~13 months old.

---

## Open-source components worth reusing

### JobSpy — job discovery / ingestion
- Repo: https://github.com/speedyapply/JobSpy
- Offers: concurrent scraping of LinkedIn, Indeed, Glassdoor, Google, ZipRecruiter
  and other boards; dataframe output; proxy support.
- License noted: **MIT**.
- Assessment: strong candidate for a **job-ingestion component**, not a full workflow
  product.
- Caveats to check before adopting: site reliability, rate limits, terms of service,
  anti-bot behavior, source coverage for the target market, normalized-schema
  quality, maintenance activity.

### Reactive Resume — resume creation / export
- Repo: https://github.com/AmruthPillai/Reactive-Resume
- Offers: real-time editing; PDF / JSON / DOCX export; self-hosting; AI-provider
  integrations; JSON Resume import; privacy controls.
- License noted: **MIT**.
- Assessment: candidate to **integrate with or learn from** instead of building a
  resume editor/renderer from scratch (relevant to HireTrack's resume-builder track).
- Caveats: API/embedding support, data-model compatibility, automated variant
  generation, deployment weight, upgrade strategy.

### JobNavigator — architectural reference
- Repo: https://github.com/vesaias/JobNavigator
- Offers (as a reference architecture): self-hosted multi-source scraping, AI
  scoring, resume builder, Chrome extension, React dashboard, FastAPI, Docker,
  notifications.
- Maturity noted: ~6 stars, last update May 31, 2026 — **too immature to adopt**
  without a detailed code/license/security/maintenance review. Useful as a
  whole-system reference.

### AIHawk — automated / tailored applications
- Repo: https://github.com/feder-cr/Jobs_Applier_AI_Agent_AIHawk
- Status noted: **archived / read-only** since May 17, 2026 (~29,900 stars, ~4,600
  forks at research time).
- Assessment: useful for **studying workflows and prior art**, but the archived
  upstream should not be a default foundation.
- Caveats: look for active forks/successors; review security history, site-specific
  automation fragility, and account / terms-of-service risk.

### Gmail + Notion automation — status-tracking reference
- Repo: https://github.com/Abhishek24J/job-application-tracker-automation
- Offers: an **n8n** workflow connecting Gmail and Notion for application-status
  tracking.
- Assessment: useful reference for ingesting confirmation / rejection / assessment /
  interview emails; a **workflow engine (n8n) may beat custom code** for some
  integrations.

---

## Feature ideas not yet in HireTrack

HireTrack today does 7-phase pipeline tracking, BYOK AI resume tailoring, and JD
parse/score (LangGraph), backed by Supabase + localStorage. The following came out of
ApplyFlow's research and are **not yet** in HireTrack:

- **Multi-source job discovery / ingestion** — pull postings from LinkedIn, Indeed,
  Glassdoor, Google, ZipRecruiter, etc. (JobSpy-style), normalized into one schema.
- **Email (Gmail/Outlook) sync with status detection** — auto-detect
  acknowledged / assessment / interview / rejection emails and advance pipeline
  stages automatically (manual + inferred transitions).
- **Calendar integration** — interviews and follow-up reminders on Google/Microsoft
  calendar.
- **Browser extension** — one-click capture of a posting and autofill of application
  forms.
- **Follow-up reminders and templates.**
- **Resume-to-job matching + skill-gap analysis** — explainable scoring criteria
  (extends HireTrack's existing JD scoring toward gap analysis and match rationale).
- **Resume variant management** — multiple tailored variants with export
  (Reactive-Resume-style editor; JSON Resume import).
- **Assisted / automated application submission** — explicitly flagged **high-risk**;
  would require approval controls, accuracy safeguards, credential handling, and
  account/ToS-risk decisions before any build.
- **Recruiter-message / screening-answer generation.**
- **Interview preparation.**
- **Analytics / activity trends** beyond the current telemetry.
- **A canonical job + application data model** owned by the app as an explicit layer.
- **A qualification-rules engine** — deal-breakers, title variants, exclusions, and
  visa / location / compensation / recency filters.

### Build-vs-reuse direction (from ApplyFlow's notes)
Avoid committing to one large repo. The suggested composition was: a focused
**ingestion layer** for collecting jobs; a **canonical job/application data model**
owned by the app; a **scoring/triage workflow with explainable criteria**;
**resume/document generation delegated** to an established component where practical;
**human approval before consequential actions**; and **email + calendar integrations**
for status updates and follow-ups.

### Caveats carried over
Job boards can change markup, block scraping, or prohibit automation. Automated
applications can submit inaccurate information or damage accounts/employer
relationships. Resumes, emails, compensation, immigration status, and application
answers are sensitive personal data. LLM-generated materials can fabricate facts.
Open-source repos may be unmaintained, insecure, or incompatibly licensed despite
popularity. A broad feature set risks distracting from the core product.

---

## Open discovery questions (still open)

ApplyFlow framed 14 discovery questions that were never answered. They remain useful
open questions for scoping any of the features above:

1. **Current workflow** — how are jobs currently discovered, evaluated, applied for,
   and tracked? Which tools, docs, extensions, spreadsheets, or manual routines?
2. **Main pain points** — which three activities consume the most time, create the
   most stress, reduce quality, or cause opportunities/follow-ups to fall through?
3. **Target jobs** — roles, seniority, industries, company types, countries,
   locations, remote preference, employment types, salary ranges, visa arrangements.
4. **Primary outcome & success metrics** — optimize for volume, quality, interview
   conversion, response time, organization, consistency, or a balance? How measured?
5. **Automation boundary** — suggestions only / prepare-but-require-approval /
   auto-perform under rules / auto-submit? Which actions must always require approval?
6. **Job sources** — which matter most (LinkedIn, Indeed, Glassdoor, Google Jobs,
   company pages, Wellfound, Upwork, recruiter email, communities, referrals, boards)?
7. **Qualification rules** — what makes a job worth applying to? Required/desired
   skills, acceptable gaps, title variants, exclusions, visa/location/comp, recency,
   experience, deal-breakers.
8. **Application materials** — what exists today; should the system manage/generate
   resume variants, cover letters, portfolios, screening answers, recruiter messages,
   references, work samples? Which outputs require manual review?
9. **Application lifecycle** — which stages/events to track (discovered, shortlisted,
   preparing, ready, applied, acknowledged, assessment, interview, offer, rejected,
   withdrawn, ghosted, archived)? Manual vs. email-inferred transitions?
10. **Integrations** — Gmail, Outlook, Google/Microsoft Calendar, LinkedIn, Notion,
    Google Sheets, Telegram, Slack, cloud storage, browser extension, contacts?
11. **Users, platform, hosting** — private tool, small group, or public product?
    Local-only, self-hosted, desktop, browser, mobile, cloud, or a combination?
12. **AI providers, cost, data policy** — which providers/local models; acceptable
    monthly cost; what personal/employer data may go to external providers; is a
    local model or redaction required?
13. **Existing data & migration** — what resumes, JDs, application records, templates,
    notes, contacts, emails, spreadsheets, or accounts to import; formats and volumes?
14. **First usable release** — what must the MVP accomplish in its first usable week;
    the smallest end-to-end workflow that would immediately improve the active search?
