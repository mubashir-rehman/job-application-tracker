Run the full HireTrack test suite and fix any errors found.

Execute these steps in order:

1. **TypeScript type check**
   ```
   cd /home/mubashir/development/job-application-tracker && npm run lint
   ```
   Capture all errors. If there are errors, fix them in the source files before continuing.

2. **Build check**
   ```
   npm run build
   ```
   If the build fails, fix the errors.

3. **Report results**
   Show a summary table:
   - TypeScript errors: N found, N fixed
   - Build: passed/failed
   - Files modified: list them

Fix all errors you find. Do not just report them.
