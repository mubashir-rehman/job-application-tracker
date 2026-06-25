---
name: hiretrack-knowledge-base
description: Knowledge base builder for HireTrack - processes resumes and job descriptions into searchable data
version: 1.0.0
triggers:
  - "build knowledge base"
  - "index resumes"
  - "parse templates"
  - "match skills"
  - "analyze resumes"
---

# HireTrack Knowledge Base Builder Skill

## Purpose
Parse existing resumes, extract structured data, and build a searchable knowledge base for matching job descriptions to existing resume content.

## Data Sources

### Resume Templates
Location: `/home/mubashir/Downloads/resumes` (43 files)

### Structured Data
- Master CV (markdown format)
- Role-specific resumes
- User feedback and ratings

## Knowledge Base Schema

### Resume Entries
```json
{
  "id": "uuid",
  "file_path": "string",
  "file_type": "docx|pdf|md",
  "role_type": "backend|ai|software|product",
  "company_targeted": "string",
  "content": {
    "summary": "string",
    "experience": [
      {
        "company": "string",
        "title": "string",
        "duration": "string",
        "achievements": ["string"],
        "technologies": ["string"]
      }
    ],
    "education": [
      {
        "institution": "string",
        "degree": "string",
        "year": "string"
      }
    ],
    "skills": {
      "languages": ["string"],
      "frameworks": ["string"],
      "tools": ["string"],
      "concepts": ["string"]
    }
  },
  "metadata": {
    "created_at": "timestamp",
    "last_updated": "timestamp",
    "times_used": "number",
    "user_ratings": ["number"],
    "ats_scores": ["number"]
  }
}
```

### Skill Mappings
```json
{
  "skill_id": "uuid",
  "skill_name": "string",
  "category": "language|framework|tool|concept",
  "related_skills": ["string"],
  "resume_ids": ["uuid"],
  "frequency": "number"
}
```

## Processing Pipeline

### Phase 1: File Parsing
1. **DOCX Files**
   - Extract text using mammoth.js or docx library
   - Preserve formatting hints (bold, italic, lists)
   - Extract section headers

2. **PDF Files**
   - Extract text using pdf-parse or pdfjs
   - Handle multi-column layouts
   - Extract tables if present

3. **Markdown Files**
   - Parse directly (structured format)
   - Extract frontmatter if present
   - Convert to structured data

### Phase 2: Content Extraction
1. **Section Detection**
   - Identify Experience, Education, Skills sections
   - Handle variations in naming
   - Parse dates and durations

2. **Achievement Extraction**
   - Extract bullet points
   - Identify action verbs
   - Quantify metrics where possible

3. **Skill Identification**
   - Extract technical skills
   - Map to standard skill taxonomy
   - Identify skill levels where stated

### Phase 3: Indexing
1. **Full-Text Search Index**
   - Create searchable index of all content
   - Support fuzzy matching
   - Weight by section importance

2. **Skill Graph**
   - Build relationship graph between skills
   - Track co-occurrence patterns
   - Identify skill clusters

3. **Template Scoring**
   - Score templates by role type
   - Track success metrics
   - Update based on feedback

## Matching Algorithm

### JD to Resume Matching
1. **Keyword Extraction**
   - Parse JD for required skills
   - Identify preferred vs required
   - Extract industry-specific terms

2. **Similarity Scoring**
   ```
   Score = (keyword_match * 0.4) + 
           (skill_overlap * 0.3) + 
           (experience_match * 0.2) + 
           (industry_match * 0.1)
   ```

3. **Ranking**
   - Sort templates by score
   - Apply user preferences
   - Consider past success rates

## Usage Example

**User says:** "Analyze my resume templates"

**Response flow:**
1. Scan `/home/mubashir/Downloads/resumes`
2. Parse each file and extract content
3. Build knowledge base entries
4. Generate skill graph
5. Create summary report

## Database Tables

### Supabase Tables Required
```sql
-- Resume entries
CREATE TABLE resume_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  role_type TEXT,
  company_targeted TEXT,
  content JSONB NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Skill mappings
CREATE TABLE skill_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_name TEXT NOT NULL,
  category TEXT NOT NULL,
  related_skills TEXT[],
  resume_ids UUID[],
  frequency INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- JD analysis cache
CREATE TABLE jd_analysis_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  jd_hash TEXT NOT NULL UNIQUE,
  jd_content TEXT NOT NULL,
  analysis JSONB NOT NULL,
  matched_resumes UUID[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Output Format

### Knowledge Base Report
```markdown
# Resume Knowledge Base Report

## Summary
- Total Resumes: [count]
- Role Types: [list]
- Skills Identified: [count]

## Resume Breakdown
### By Role Type
- Backend Engineer: [count]
- AI Engineer: [count]
- Software Engineer: [count]
- Product Operations: [count]

### Top Skills
1. [skill] - [frequency]
2. [skill] - [frequency]
...

## Recommendations
- [suggestions for improvement]
```