## Feature Goal

- Normalize `Jvedio.Test` unit-test structure and maintenance rules without expanding into production-code refactors.

## Confirmed Scope

- Only touch `Jvedio.Test` and the related test documentation.
- Preserve existing runtime path rules and suite-output separation.
- Keep MSTest and current script entry layout.

## Completion Summary

1. Simplified `scan-test-config.json` to use only input root, output root, report settings, and minimal switches.
2. Completed the scan lookup-and-organize-only flow: matched videos are moved into output subdirectories, unmatched files stay in place.
3. Added the summary report output for unmatched files and organized results.
4. Kept the scan tests focused on organize-only behavior without expanding this feature into full scrape asset verification.

## Completed Work

1. Replaced the previous case-heavy scan config with the minimal input-root / output-root / report-driven model.
2. Aligned the scan integration flow so the PowerShell entry can run directly against files placed in the input directory.
3. Verified the organize-only behavior and summary-report output as the scoped result of this feature.
4. Synced the affected docs and scripts with the simplified workflow.

## Completed Validation

- Build `Jvedio.Test.csproj` in Release.
- Run the affected scan integration test entry.
- Verify the output directory structure matches organized vs unmatched expectations.
- Verify the generated JSON/TXT report matches the actual unmatched files.
- Verify docs and scripts match the resulting simplified workflow.

Validation result:
- Functional verification completed.
- This feature is now treated as complete unless later regressions reopen it.

## Closure Notes

- Do not expand this feature into production-code testability refactors.
- Keep the scan test scoped to organize-only behavior in this pass; full scrape outputs such as NFO, poster, and actor avatars remain covered by separate manual or integration verification.
- The previously tracked blockers `ScanTest/ImportTest.cs` and `UnitTests/Core/Crawler/CrawlerServer.cs` are already absent in the current repository snapshot, so execution should treat them as documentation-cleanup context rather than code-migration work.
- User-confirmed path A means residual empty-directory cleanup is in scope for the first build pass.
- Keep test-project suite outputs and app runtime debug outputs clearly separated.
