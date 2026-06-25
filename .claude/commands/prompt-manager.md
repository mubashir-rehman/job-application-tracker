Manage, version, and evaluate prompts for the HireTrack AI resume generator.

The prompt store lives at: `/home/mubashir/development/job-application-tracker/generated/prompts/`

**Available sub-commands** — ask the user which they want:

### `list` — Show all prompt versions
List all prompt files. For each show: name, version, stage, last modified, performance score (if tracked).

### `show <name>` — Display a specific prompt
Read and display the prompt content with its metadata.

### `new <stage>` — Create a new prompt version
Stages: `jd-analysis`, `resume-generation`, `ats-optimization`, `email-generation`

Create a new versioned prompt file:
`/generated/prompts/{stage}-v{N}.md`

With frontmatter:
```yaml
---
stage: jd-analysis
version: 1.0.0
created: ISO date
description: one-line description
performance:
  userRating: null
  interviewSuccessRate: null
  notes: ""
---
```

Then write the prompt body. For `jd-analysis`, a good starting prompt extracts: required skills, preferred skills, experience level, keywords, culture signals, red flags.

### `test <name> <jd-url>` — Test a prompt against a real JD
Fetch the JD URL, run the prompt against it, show the structured output. Ask user to rate (1-10) and save the rating back to the prompt file.

### `compare <name-v1> <name-v2>` — Compare two prompt versions
Show side-by-side diff and any performance differences.

### `promote <name>` — Mark a prompt as the active/production version
Update `/generated/prompts/active.json` with the promoted prompt name per stage.
