Build or update the resume knowledge base from existing resume files.

The knowledge base extracts structured data from all resume templates and the master CV, making it searchable for resume generation.

**Step 1: Inventory resume files**
List all files in `/home/mubashir/Downloads/resumes/`. Show counts by format (.md, .docx, .pdf).

**Step 2: Parse readable files**
For each .md file, extract:
- Skills mentioned
- Technologies/tools listed
- Job titles and companies
- Key achievements (lines with numbers/metrics)
- Sections present (Summary, Experience, Education, Skills, Projects, etc.)

For .docx/.pdf files: note that they require parsing libraries. List them for manual processing.

**Step 3: Build structured index**
Create/update `/home/mubashir/development/job-application-tracker/generated/knowledge-base.json`:

```json
{
  "lastUpdated": "ISO date",
  "masterCV": {
    "skills": [],
    "technologies": [],
    "experience": [{ "title": "", "company": "", "duration": "", "highlights": [] }],
    "education": [],
    "certifications": []
  },
  "roleTemplates": [
    {
      "file": "filename.md",
      "roleType": "backend|frontend|ai|fullstack|devops|other",
      "targetLevel": "junior|mid|senior|staff|principal",
      "keySkills": [],
      "industries": []
    }
  ],
  "skillIndex": {
    "python": ["file1.md", "file2.md"],
    "react": ["file3.md"]
  }
}
```

**Step 4: Report**
Show:
- Total files processed
- Total skills extracted
- Role type distribution
- Any files that couldn't be parsed (need manual processing)
- Path to knowledge-base.json
