# Enhanced Planning Workflow

This project is initialized for the `plan-todo` workflow.

## Commands

- `/init-plan` - initialize or normalize the project planning workflow
- `/plan-feature <name>` - create or resume a feature plan
- `/feature-switch` - switch the active feature while staying in `plan-todo`
- `/plan-handoff` - generate a concise handoff for build mode

## Directory Structure

- `plan/active/<feature>/plan.json`
- `plan/active/<feature>/plan.md`
- `plan/active/<feature>/.plan-original.md`
- `plan/active/<feature>/handoff.md`
- `plan/archive/<feature>/...`

## Recommended Flow

1. Run `/plan-feature <feature>` in `plan-todo` mode.
2. Clarify requirements, review `方案路径`, and refine the plan.
3. Explicitly approve execution when the plan is ready.
4. Run `/plan-handoff`.
5. Switch to build mode and implement from the handoff.

## Notes

- Keep planning focused on one feature at a time.
- Treat `handoff.md` as the default build context.
- Keep legacy docs preserved but move new planning into the normalized `plan/` structure.
