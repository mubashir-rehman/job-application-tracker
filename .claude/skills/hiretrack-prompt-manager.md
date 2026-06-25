---
name: hiretrack-prompt-manager
description: Prompt versioning and A/B testing manager for HireTrack resume generation
version: 1.0.0
triggers:
  - "manage prompts"
  - "version prompts"
  - "test prompts"
  - "optimize prompts"
  - "prompt engineering"
---

# HireTrack Prompt Manager Skill

## Purpose
Version control, A/B test, and evolve prompts used for resume generation, JD analysis, and email creation based on user feedback and success metrics.

## Prompt Categories

### 1. JD Analysis Prompts
- Extract key requirements
- Identify skills and experience levels
- Parse company culture indicators

### 2. Resume Matching Prompts
- Score template matches
- Rank relevant experience
- Identify gaps

### 3. Resume Generation Prompts
- Tailor content to JD
- Optimize for ATS
- Generate achievement bullets

### 4. ATS Optimization Prompts
- Keyword integration
- Format optimization
- Section ordering

### 5. Email Generation Prompts
- Find contact information
- Tailor outreach message
- Follow-up templates

## Version Schema

```json
{
  "prompt_id": "uuid",
  "version": "1.0.0",
  "category": "jd_analysis|matching|generation|ats|email",
  "stage": "extract|analyze|generate|optimize|review",
  "content": "string",
  "variables": ["string"],
  "metadata": {
    "created_at": "timestamp",
    "created_by": "user_id",
    "parent_version": "string",
    "description": "string"
  },
  "performance": {
    "times_used": 0,
    "avg_user_rating": 0,
    "avg_ats_score": 0,
    "interview_success_rate": 0,
    "last_used": "timestamp"
  }
}
```

## A/B Testing Framework

### Test Structure
```json
{
  "test_id": "uuid",
  "prompt_category": "string",
  "variants": [
    {
      "version": "1.0.0",
      "content": "string",
      "weight": 0.5
    },
    {
      "version": "1.1.0",
      "content": "string",
      "weight": 0.5
    }
  ],
  "metrics": ["user_rating", "ats_score", "interview_success"],
  "status": "active|completed|paused",
  "created_at": "timestamp",
  "results": {
    "variant_a": { "samples": 0, "avg_score": 0 },
    "variant_b": { "samples": 0, "avg_score": 0 }
  }
}
```

### Testing Process
1. **Create Variants**
   - Identify prompt to improve
   - Generate variations
   - Set test weights

2. **Collect Data**
   - Track which variant was used
   - Collect user feedback
   - Measure success metrics

3. **Analyze Results**
   - Calculate statistical significance
   - Determine winner
   - Archive loser

4. **Deploy Winner**
   - Update active prompt
   - Archive test results
   - Document learnings

## Prompt Evolution Rules

### Automatic Adaptation
1. **User Feedback Loop**
   - Low-rated prompts → flag for review
   - High-rated prompts → increase usage weight
   - Consistent feedback → create new variant

2. **Performance Tracking**
   - Track ATS scores per prompt
   - Monitor interview success rates
   - Correlate with user ratings

3. **Skill-Based Adaptation**
   - Track which skills appear in successful resumes
   - Adjust prompts to emphasize high-performing skills
   - De-emphasize low-performing skills

### Manual Overrides
1. **Pin Prompts**
   - Lock specific versions
   - Prevent automatic changes
   - Use for critical templates

2. **Force Updates**
   - Override A/B test results
   - Deploy new versions immediately
   - Bypass normal rollout

## Prompt Templates

### JD Analysis Template
```
Analyze the following job description and extract:
1. Required technical skills
2. Preferred skills
3. Experience level requirements
4. Key responsibilities
5. Company culture indicators
6. ATS keywords to include

Job Description:
{jd_content}

Return as structured JSON.
```

### Resume Generation Template
```
Based on the following job analysis and user profile, generate a tailored resume:

Job Analysis:
{job_analysis}

User Profile:
{user_profile}

Requirements:
- Emphasize matching skills
- Use action verbs
- Include quantifiable achievements
- Optimize for ATS parsing
- Format for {output_format}

Generate the resume content.
```

### Email Generation Template
```
Create a professional email for job application:

Job Details:
{job_details}

Applicant Profile:
{applicant_profile}

Contact Information:
{contact_info}

Requirements:
- Reference specific job requirements
- Highlight relevant experience
- Professional tone
- Include call to action

Generate the email.
```

## Database Schema

```sql
-- Prompt versions
CREATE TABLE prompt_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID NOT NULL,
  version TEXT NOT NULL,
  category TEXT NOT NULL,
  stage TEXT NOT NULL,
  content TEXT NOT NULL,
  variables TEXT[],
  metadata JSONB DEFAULT '{}',
  performance JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(prompt_id, version)
);

-- A/B tests
CREATE TABLE prompt_ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_category TEXT NOT NULL,
  variants JSONB NOT NULL,
  metrics TEXT[],
  status TEXT DEFAULT 'active',
  results JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Prompt usage logs
CREATE TABLE prompt_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID NOT NULL,
  version TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  resume_id UUID,
  context JSONB DEFAULT '{}',
  user_rating INTEGER,
  ats_score FLOAT,
  interview_success BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Usage Examples

### List Prompts
**User says:** "Show me all resume generation prompts"
**Response:** List all prompts in the generation category with their versions and performance metrics.

### Create Variant
**User says:** "Create a new variant of the JD analysis prompt"
**Response:** 
1. Show current active prompt
2. Ask for changes
3. Create new version
4. Optionally start A/B test

### Analyze Performance
**User says:** "Which prompts are performing best?"
**Response:**
1. Query usage logs
2. Calculate metrics per prompt
3. Show top performers
4. Suggest improvements

### Deploy Version
**User says:** "Deploy version 2.0.0 of the resume generation prompt"
**Response:**
1. Verify version exists
2. Check if A/B test is running
3. Update active version
4. Log deployment

## Output Format

### Prompt Report
```markdown
# Prompt Performance Report

## Category: Resume Generation

### Top Performing Prompts
1. Version 2.1.0 - Avg Rating: 4.5, ATS Score: 87%
2. Version 1.8.0 - Avg Rating: 4.2, ATS Score: 82%
3. Version 2.0.0 - Avg Rating: 4.0, ATS Score: 85%

### Active A/B Tests
- Test #123: v2.1.0 vs v2.2.0 (Resume Generation)
  - v2.1.0: 45 samples, avg 4.5
  - v2.2.0: 38 samples, avg 4.3
  - Status: Running (need 50 more samples)

### Recommendations
- Version 2.1.0 performing well, consider pinning
- Version 1.5.0 underperforming, consider deprecating
- New A/B test opportunity: email generation prompts
```