## Feature Goal

- Normalize `Jvedio.Test` unit-test structure and maintenance rules without expanding into production-code refactors.

## Confirmed Scope

- Only touch `Jvedio.Test` and the related test documentation.
- Preserve existing runtime path rules and suite-output separation.
- Keep MSTest and current script entry layout.

## Current Todo Summary

1. Simplify `scan-test-config.json` to use only input root, output root, report settings, and minimal switches.
2. Implement the scan lookup-and-organize-only flow: matched videos are moved into output subdirectories, unmatched files stay in place.
3. Emit a simple JSON or TXT report that lists unmatched files and organized outputs.
4. Keep scan tests focused on organize-only behavior; do not expand this pass into full scrape asset verification.

## Execution Order

1. Replace the current case-heavy scan config with a minimal config model driven by input root, output root, and report settings.
2. Update the scan integration flow and helper code so putting videos into the input directory and running the PowerShell script is enough to execute the test.
3. Ensure matched videos are organized into output subdirectories, unmatched videos remain in the input directory, and a simple summary report is written.
4. Update the scan test script and any affected docs to reflect the simplified workflow.

## Validation Steps

- Build `Jvedio.Test.csproj` in Release.
- Run the affected scan integration test entry.
- Verify the output directory structure matches organized vs unmatched expectations.
- Verify the generated JSON/TXT report matches the actual unmatched files.
- Verify docs and scripts match the resulting simplified workflow.

## Blockers And Caveats

- Do not expand this feature into production-code testability refactors.
- Keep the scan test scoped to organize-only behavior in this pass; full scrape outputs such as NFO, poster, and actor avatars remain covered by separate manual or integration verification.
- The previously tracked blockers `ScanTest/ImportTest.cs` and `UnitTests/Core/Crawler/CrawlerServer.cs` are already absent in the current repository snapshot, so execution should treat them as documentation-cleanup context rather than code-migration work.
- User-confirmed path A means residual empty-directory cleanup is in scope for the first build pass.
- Keep test-project suite outputs and app runtime debug outputs clearly separated.
