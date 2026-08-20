# Coding

Skills for code work: design, build, review, debug.

## User-invoked

Reachable only when you type them (`disable-model-invocation: true` in the frontmatter).

- **[implement](./skills/implement/SKILL.md)**: Build the work described by a spec or set of tickets, driving `/tdd` at pre-agreed seams and closing out with `/code-review` before committing.
- **[show-me-your-work](./skills/show-me-your-work/SKILL.md)**: Keep a reviewable decision trail for long-running or unattended work: a TSV log with one row per decision (what, why, evidence, result), local by default, committed when a reviewer needs the trail to trust the result.
- **[improve-codebase-architecture](./skills/improve-codebase-architecture/SKILL.md)**: Scan a codebase for deepening opportunities, present them as a visual HTML report, then grill through whichever one you pick.

## Model-invoked

Model- or user-reachable (rich trigger phrasing so the model can reach for them).

- **[code-review](./skills/code-review/SKILL.md)**: Two-axis review of the diff since a fixed point: **Standards** (does it follow the repo's coding standards, plus a Fowler smell baseline?) and **Spec** (does it faithfully implement the originating issue/spec?), run as parallel sub-agents.
- **[codebase-design](./skills/codebase-design/SKILL.md)**: Shared discipline and vocabulary for designing deep modules: small interfaces, clean seams, testable through the interface.
- **[diagnosing-bugs](./skills/diagnosing-bugs/SKILL.md)**: Disciplined diagnosis loop for hard bugs and performance regressions: build a feedback loop that goes red on this bug → minimise → hypothesise → instrument → fix → regression-test.
- **[domain-modeling](./skills/domain-modeling/SKILL.md)**: Actively build and sharpen a project's domain model by challenging terms, stress-testing with scenarios, and updating `CONTEXT.md` and ADRs inline.
- **[prototype](./skills/prototype/SKILL.md)**: Build a throwaway prototype to answer a design question: a single shareable HTML file for state/logic, or several toggleable UI variations.
- **[resolving-merge-conflicts](./skills/resolving-merge-conflicts/SKILL.md)**: Work through an in-progress git merge or rebase conflict hunk by hunk, resolving by intent traced to each side's primary source, then finish the operation, never `--abort`.
- **[tdd](./skills/tdd/SKILL.md)**: Test-driven development with a red-green-refactor loop. Builds features or fixes bugs one vertical slice at a time.
- **[writing-for-agents](./skills/writing-for-agents/SKILL.md)**: Write documents meant for agents to read: creating or editing skills, `AGENTS.md`, `CLAUDE.md`.
