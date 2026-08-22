# Copilot Instructions

## Test Execution Rules

- Never run tests in watch mode for this repository.
- Do not use `npm test` because the script enables Jest watch mode.
- Always run tests in CI-style non-watch mode.

Approved examples:

- `CI=1 npx jest --runInBand --watchAll=false`
- `CI=1 npx jest --runInBand --watchAll=false src/lib/variables.test.ts`
- `CI=1 npx jest --runInBand --watchAll=false src/app/components/set-variable.test.tsx`

## Implementation Rules

- Never write legacy conversion code.
- Never write migration compatibility code paths.
- Implement clean forward-only behavior and update callers/tests accordingly.
- Always run relevant tests after making code changes.
- Always update or add tests when behavior, interfaces, or outputs change.
- Treat component and context state transitions as first-class behavior: when changing rendering or refactoring stateful code, add or update tests that assert the transition path, not just the final markup, and review any test edits for hidden state regressions before accepting them.
- Use browser localStorage as the source of truth for UI state where applicable.
- Ensure UI updates immediately when localStorage-backed variables change.
- For client-side polling, background status sync, or repeated variable resolution, prefer lightweight API endpoints plus targeted client state updates over server actions or page-route roundtrips that trigger full route rendering.
- When a polling or refresh loop is needed, scope it to the smallest data surface possible, avoid re-rendering the whole page tree, and pause or reduce polling for hidden/inactive tabs when practical.
- If a change may deviate from any of these rules, ask for explicit user approval before proceeding.
- Refactor static/hardcoded values into named constants or environment variables.
- If it is unclear whether a value should be a constant or an environment variable, ask the user before implementing.
- Do not implement readability-reducing compatibility alias patterns that accept multiple names for the same input.
- For any given input/option, accept a single canonical name and update callers/tests/docs to match it instead of adding fallback aliases or normalization logic.
- Do not introduce duplicate code; extract shared logic into centralized utilities/modules and update call sites instead of copy-pasting implementations.
- Add JSDoc headers to all exported functions and exported class methods; keep the docblocks concise and accurate.
- When changing, adding, or removing any MDX component or any behavior behind an MDX component, also update [src/app/docs/author-docs.mdx](src/app/docs/author-docs.mdx) so the documentation and smoke-test usage examples stay in sync.

## Change Validation Rules

- After any code change, run the relevant tests immediately.
- Do not auto-fix failing tests without user review.
- If tests fail after a change:
  1. Stop and present the failure details
  2. List options for resolution
  3. Assess whether the change is breaking to existing users/clients
  4. Wait for explicit user direction before proceeding with fixes
- Consider a change breaking if:
  - Existing code/integrations will stop working
  - Public APIs or interfaces are affected
  - Client code will need updates to stay compatible
  - User behavior or expectations will change unexpectedly
- This prevents silent compatibility issues and ensures informed decisions about changes.
