---
name: hiretrack-document-generator
description: Document generation skill for HireTrack - creates resumes, cover letters, and emails in multiple formats
version: 1.0.0
triggers:
  - "generate document"
  - "create docx"
  - "create pdf"
  - "export resume"
  - "build cover letter"
  - "generate email"
---

# HireTrack Document Generator Skill

## Purpose
Generate professional documents (resumes, cover letters, emails) in multiple formats (DOCX, PDF, Markdown) using templates and AI-optimized content.

## Supported Formats

### 1. Markdown (.md)
- Clean, readable format
- Easy to version control
- Quick preview capability
- Base format for conversions

### 2. DOCX (.docx)
- Professional formatting
- Template-based layouts
- ATS-compatible structure
- Editable by users

### 3. PDF (.pdf)
- Final submission format
- Consistent rendering
- Print-ready
- Universal compatibility

## Document Types

### Resume
**Sections:**
- Header (Name, Contact, Links)
- Professional Summary
- Technical Skills
- Professional Experience
- Education
- Projects (optional)
- Certifications (optional)

**ATS Optimization:**
- Standard section headers
- No tables or columns
- Simple formatting
- Keywords from JD
- Reverse chronological order

### Cover Letter
**Structure:**
- Header (matching resume)
- Date
- Recipient info
- Opening paragraph
- Body (2-3 paragraphs)
- Closing
- Signature

**Customization:**
- Reference specific job requirements
- Highlight matching experience
- Show company knowledge
- Professional tone

### Email
**Components:**
- Subject line
- Greeting
- Opening (role interest)
- Body (key qualifications)
- Closing (call to action)
- Signature

**Personalization:**
- Address hiring manager by name
- Reference specific job details
- Mention mutual connections
- Keep concise (3-4 paragraphs)

## Generation Pipeline

### Phase 1: Content Preparation
1. **Load Template**
   - Select base template by role type
   - Apply user style preferences
   - Set formatting rules

2. **Gather Content**
   - User profile/master CV
   - Job analysis data
   - Matching resume content

3. **AI Optimization**
   - Tailor bullet points
   - Integrate keywords
   - Quantify achievements

### Phase 2: Document Assembly
1. **Markdown Generation**
   ```markdown
   # [Name]
   [Contact Info] | [Links]
   
   ## Professional Summary
   [Tailored summary]
   
   ## Technical Skills
   [Categorized skills]
   
   ## Professional Experience
   ### [Company] - [Title]
   [Date Range]
   - [Achievement 1]
   - [Achievement 2]
   ```

2. **DOCX Generation**
   ```javascript
   // Using docx library
   const doc = new Document({
     sections: [{
       children: [
         new Paragraph({ text: name, heading: HeadingLevel.HEADING_1 }),
         // ... other sections
       ]
     }]
   });
   ```

3. **PDF Generation**
   ```javascript
   // Using puppeteer or pdf-lib
   const pdf = await page.pdf({
     format: 'Letter',
     margin: { top: '0.5in', bottom: '0.5in', left: '0.5in', right: '0.5in' }
   });
   ```

### Phase 3: Quality Assurance
1. **ATS Validation**
   - Check section headers
   - Verify keyword density
   - Ensure no parsing issues

2. **Format Validation**
   - Check margins and spacing
   - Verify font consistency
   - Ensure proper alignment

3. **Content Validation**
   - Grammar and spelling
   - Consistency in dates
   - Contact information accuracy

## Template System

### Template Structure
```json
{
  "template_id": "uuid",
  "name": "Backend Engineer Template",
  "role_type": "backend",
  "sections": [
    {
      "name": "header",
      "order": 1,
      "required": true,
      "fields": ["name", "email", "phone", "linkedin", "github"]
    },
    {
      "name": "summary",
      "order": 2,
      "required": true,
      "max_length": 150
    },
    {
      "name": "skills",
      "order": 3,
      "required": true,
      "categories": ["languages", "frameworks", "tools"]
    }
  ],
  "styling": {
    "font": "Calibri",
    "size": 11,
    "margins": { "top": 0.5, "bottom": 0.5, "left": 0.5, "right": 0.5 }
  }
}
```

### Template Variables
- `{{name}}` - Full name
- `{{email}}` - Email address
- `{{phone}}` - Phone number
- `{{linkedin}}` - LinkedIn URL
- `{{github}}` - GitHub URL
- `{{summary}}` - Professional summary
- `{{skills}}` - Skills list
- `{{experience}}` - Work experience
- `{{education}}` - Education

## File Output

### Directory Structure
```
generated/
├── {company}_{role}_{date}/
│   ├── resume/
│   │   ├── resume.md
│   │   ├── resume.docx
│   │   └── resume.pdf
│   ├── cover_letter/
│   │   ├── cover_letter.md
│   │   ├── cover_letter.docx
│   │   └── cover_letter.pdf
│   ├── email/
│   │   └── email.md
│   └── metadata.json
```

### Metadata File
```json
{
  "generated_at": "2026-06-25T10:30:00Z",
  "job_details": {
    "company": "Google",
    "role": "Backend Engineer",
    "url": "https://..."
  },
  "template_used": "backend_engineer_v2",
  "prompt_version": "2.1.0",
  "ats_score": 87,
  "user_rating": null,
  "files": {
    "resume": ["resume.md", "resume.docx", "resume.pdf"],
    "cover_letter": ["cover_letter.md", "cover_letter.docx", "cover_letter.pdf"],
    "email": ["email.md"]
  }
}
```

## ATS Optimization Rules

### Do's
- Use standard section headers
- Include keywords naturally
- Use bullet points for achievements
- Start bullets with action verbs
- Include metrics and numbers
- Use reverse chronological order
- Keep to 1-2 pages

### Don'ts
- Use tables or columns
- Include graphics or images
- Use headers/footers
- Use unusual fonts
- Use abbreviations without explanation
- Include references (on request)
- Use personal pronouns

## Usage Examples

### Generate Resume
**User says:** "Generate a resume for Backend Engineer at Google"
**Response:**
1. Load job analysis
2. Select backend template
3. Generate content
4. Create all formats
5. Present for review

### Export to PDF
**User says:** "Export my resume to PDF"
**Response:**
1. Load current resume
2. Apply PDF styling
3. Generate PDF
4. Save to file system

### Create Cover Letter
**User says:** "Create a cover letter for the Google position"
**Response:**
1. Load job details
2. Load resume content
3. Generate tailored cover letter
4. Create all formats

## Dependencies

### Required Packages
```json
{
  "docx": "^8.5.0",
  "pdf-lib": "^1.17.1",
  "puppeteer": "^21.0.0",
  "mammoth": "^1.6.0",
  "pdf-parse": "^1.1.1"
}
```

### Installation
```bash
npm install docx pdf-lib puppeteer mammoth pdf-parse
```

## Quality Metrics

### Track Per Document
- ATS score (0-100)
- User rating (1-5)
- Keyword match percentage
- Page count
- Generation time

### Aggregate Metrics
- Average ATS score by template
- Most successful templates
- Common user feedback
- Format preferences