Generate professional documents from existing resume content or application data.

Ask the user what they want to generate:

### Option 1: Cover Letter
Inputs:
- Company name and role (or select from existing applications)
- Tone: formal / conversational / technical

Generate a tailored cover letter that:
- Opens with a specific hook about why this role/company
- Maps 2-3 of the user's strongest experiences to the JD requirements
- Closes with a clear call to action
- Stays under 400 words

Output to: `/generated/{company}_{role}_{date}/cover-letter.md`

### Option 2: Outreach Email
Inputs:
- Company name, role, HR/hiring manager name (optional)
- Context: cold outreach / referral / recruiter contact

Generate a concise outreach email (under 150 words):
- Subject line: `[Role] — Experienced [Title] Interested in Opportunity`
- Personal hook (1 sentence)
- Value proposition (2 sentences matching JD keywords)
- CTA (1 sentence)

Output to: `/generated/{company}_{role}_{date}/outreach-email.md`

### Option 3: LinkedIn Message
Short connection request or InMail (under 300 chars for connection request, under 2000 for InMail).

### Option 4: Application Status Follow-up
Inputs: Company, role, days since application, last contact

Generate a polite follow-up email checking application status.

---

After generating any document:
1. Show the full content to the user
2. Ask if they want any revisions
3. Save the final version to the output directory
4. Optionally link it to an existing job application in the tracker (ask for application ID)
