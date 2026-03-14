## Feature Goal

- Provide a low-overhead Oh My OpenCode workflow guide for a WPF project, tailored to Jvedio, with the minimum practical agent count and explicit cost-control rules.

## Confirmed Scope

- Planning artifacts only.
- No implementation, build, test execution, install, or desktop export.
- Focus on WPF testing workflow and UI-refactor workflow design.

## Current Recommendation

1. Use one primary agent as the default and only resident agent.
2. Split test work and UI refactor work into separate features.
3. Cap each feature to three conversation rounds.
4. Allow at most one on-demand explore invocation per feature.

## Deliverables

- `plan/active/omoc-wpf-lean-workflow/guide.md`
- `plan/active/omoc-wpf-lean-workflow/plan.json`
- `plan/active/omoc-wpf-lean-workflow/plan.md`
- `plan/active/omoc-wpf-lean-workflow/.plan-original.md`
- `plan/active/omoc-wpf-lean-workflow/handoff.md`

## Awaiting Confirmation

- Whether the user accepts the recommended single-agent path.
- Whether the guide should later be exported to the Desktop once planning restrictions are lifted.
