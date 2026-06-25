---
name: hiretrack-test-runner
description: Automated testing skill for HireTrack - runs lint, type checks, and unit tests
version: 1.0.0
triggers:
  - "run tests"
  - "check for errors"
  - "lint code"
  - "type check"
  - "verify build"
  - "test skill"
---

# HireTrack Test Runner Skill

## Purpose
Automate testing and error detection for the HireTrack project. Run this skill after making code changes to catch issues early.

## Available Commands

### 1. Type Checking (TypeScript)
```bash
npm run lint
```
This runs `tsc --noEmit` to check for TypeScript compilation errors without generating output files.

### 2. Full Build Check
```bash
npm run build
```
This runs a complete production build. If this succeeds, the code compiles correctly.

### 3. Dev Server Health Check
```bash
# Check if dev server is running
curl -s http://localhost:3000 > /dev/null && echo "Dev server running" || echo "Dev server not running"

# Start dev server if not running
npm run dev
```

## Workflow

When this skill is triggered:

1. **Run TypeScript check first:**
   ```bash
   npm run lint 2>&1
   ```

2. **If errors found, report them:**
   - List each error with file path and line number
   - Categorize by severity (error vs warning)
   - Suggest fixes

3. **Run build check:**
   ```bash
   npm run build 2>&1
   ```

4. **Report results:**
   - ✅ If all checks pass
   - ❌ If any errors found (with details)

## Error Categories

### TypeScript Errors
- Type mismatches
- Missing imports
- Invalid function signatures
- Missing required props

### Build Errors
- Vite compilation failures
- Tailwind CSS issues
- Asset loading problems

## Example Usage

**User says:** "Run tests" or "Check for errors"

**Response format:**
```
Running HireTrack tests...

1. TypeScript Check: [PASS/FAIL]
   - Errors: [count]
   - Warnings: [count]

2. Build Check: [PASS/FAIL]
   - Duration: [time]

[If errors]
Errors found:
- file.tsx:42 - Type 'string' is not assignable to type 'number'
- component.tsx:15 - Cannot find module './missing.ts'

[If all pass]
✅ All checks passed! Code is ready.
```

## Notes
- Always run after making code changes
- Can be run in parallel with other tasks
- Results should be reviewed before committing
- Build errors prevent deployment to Vercel