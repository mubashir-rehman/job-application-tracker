---
name: hiretrack-resume-generator
description: AI resume generation skill for HireTrack - creates ATS-optimized resumes from job descriptions
version: 1.0.0
triggers:
  - "generate resume"
  - "create resume"
  - "tailor resume"
  - "build resume"
  - "resume builder"
  - "ats optimize"
---

# HireTrack Resume Generator Skill

## Purpose
Generate ATS-optimized, JD-tailored resumes in multiple formats (docx, PDF, markdown) using AI and existing templates.

## Input Requirements

### Required
- **Job Description (JD)**: Full text of the job posting
- **Job Post Link**: URL to the job posting (for validation)

### Optional
- **Company Link**: URL to company website
- **User Profile**: Existing resume/CV data
- **Template Preference**: Specific template to use

## Available Templates

Location: `/home/mubashir/Downloads/resumes`

### Master Templates
- `Mubashir_Rehman_Master_CV_Source_of_Truth_Export.md` - Master CV
- `Mubashir_Rehman_Master_CV (1) (1).docx` - Master CV (docx)

### Role-Specific Templates
- Backend Engineer templates
- AI Engineer templates
- Software Engineer templates
- Product Operations templates

## Generation Process

### Phase 1: JD Analysis
1. Parse job description for:
   - Required skills and technologies
   - Experience level requirements
   - Key responsibilities
   - Company culture indicators
   - ATS keywords

2. Create knowledge base entry:
   ```json
   {
     "company": "string",
     "role": "string",
     "required_skills": ["string"],
     "preferred_skills": ["string"],
     "experience_level": "string",
     "keywords": ["string"]
   }
   ```

### Phase 2: Template Matching
1. Compare JD requirements against existing templates
2. Score templates based on skill overlap
3. Select best matching template (or create new)

### Phase 3: Content Optimization
1. Extract relevant experience from master CV
2. Tailor bullet points to match JD keywords
3. Optimize for ATS parsing:
   - Use standard section headings
   - Include keywords naturally
   - Avoid tables/columns that break ATS
   - Use reverse chronological order

### Phase 4: Format Generation
1. **Markdown**: Clean, readable format
2. **DOCX**: Professional formatting with templates
3. **PDF**: Final output for submission

### Phase 5: Review & Feedback
1. Present resume to user
2. Collect feedback on:
   - Content accuracy
   - Formatting preferences
   - ATS score (if available)
3. Store feedback for prompt improvement

## ATS Optimization Rules

### Must Include
- Standard section headers (Experience, Education, Skills)
- Keywords from job description
- Quantifiable achievements
- Action verbs
- Relevant technical skills

### Must Avoid
- Graphics or images
- Tables or columns
- Unusual fonts
- Headers/footers
- Abbreviations without explanation

## Email Generation

### Process
1. Find HR/contact from JD or company website
2. Generate tailored email:
   - Reference specific job requirements
   - Highlight relevant experience
   - Include resume attachment

### Email Template Structure
```
Subject: [Role] Application - [Your Name]

Dear [Hiring Manager/HR],

[Opening paragraph - role interest]

[Body - relevant experience matching JD]

[Closing - call to action]

Best regards,
[Your Name]
[Contact Information]
```

## Prompt Versioning

### Schema
```json
{
  "prompt_id": "string",
  "version": "1.0.0",
  "stage": "jd_analysis|resume_generation|email_generation",
  "content": "string",
  "performance_metrics": {
    "user_rating": "number",
    "ats_score": "number",
    "interview_success": "boolean"
  }
}
```

### Evolution Process
1. Track which prompts produce best results
2. A/B test prompt variations
3. Adapt based on user feedback
4. Version control all prompts

## Usage Example

**User says:** "Generate resume for Backend Engineer at Google"

**Response flow:**
1. Request JD URL
2. Fetch and analyze JD
3. Match against templates
4. Generate tailored resume
5. Present for review
6. Collect feedback
7. Store for future reference

## File Outputs

Generated resumes saved to:
```
/home/mubashir/development/job-application-tracker/generated/
├── {company}_{role}_{date}/
│   ├── resume.md
│   ├── resume.docx
│   ├── resume.pdf
│   ├── email.md
│   └── metadata.json
```