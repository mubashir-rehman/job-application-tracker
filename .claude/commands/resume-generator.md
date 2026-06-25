Generate an ATS-optimized resume tailored to a specific job description.

Ask the user for:
1. **Job Description URL** (required) — fetch and parse the JD from this URL
2. **Company website URL** (optional) — for additional company context
3. **Output format** (default: all three) — md, docx, pdf
4. **Template preference** (optional) — list available templates from /home/mubashir/Downloads/resumes

Then execute the resume generation pipeline:

**Step 1: Parse the JD**
Fetch the JD URL content. Extract:
- Required skills and technologies
- Experience level
- Key responsibilities  
- ATS keywords
- Company culture signals

**Step 2: Read the master CV**
Read `/home/mubashir/Downloads/resumes/Mubashir_Rehman_Master_CV_Source_of_Truth_Export.md` (or the closest match if that exact name doesn't exist — list files in that directory first).

**Step 3: Match and select template**
List files in `/home/mubashir/Downloads/resumes/`. Select the best matching template based on role type (backend, frontend, AI, etc.).

**Step 4: Generate tailored content**
Create a tailored resume that:
- Opens with a strong summary matching the JD
- Reorders/rephrases experience to emphasize JD-relevant skills
- Uses keywords from the JD naturally throughout
- Quantifies achievements where possible
- Follows ATS rules: standard headings, no tables/graphics, reverse chronological

**Step 5: Output**
Create the output directory: `/home/mubashir/development/job-application-tracker/generated/{company}_{role}_{YYYY-MM-DD}/`

Write:
- `resume.md` — the tailored resume in markdown
- `metadata.json` — `{ company, role, jdUrl, generatedAt, keywords[], templateUsed }`

For docx/pdf: note that these require additional libraries (docx, puppeteer) — output a note if they're not yet available and provide the .md output.

**Step 6: Summary**
Show the user:
- What template was used and why
- Top 5 keywords incorporated
- File paths of outputs
- Any ATS warnings (things that couldn't be optimized)
