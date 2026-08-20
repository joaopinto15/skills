# Productivity

Skills for turning conversations into plans, tickets, docs, and repeatable setup.

## User-invoked

Reachable only when you type them (`disable-model-invocation: true` in the frontmatter).

- **[ask-matt](./skills/ask-matt/SKILL.md)**: Ask which skill or flow fits your situation. A router over the user-invoked skills in this repo.
- **[bro](./skills/bro/SKILL.md)**: Restate the last message in plain human language, with no jargon.
- **[setup-matt-pocock-skills](./skills/setup-matt-pocock-skills/SKILL.md)**: Configure this repo for the engineering skills (issue tracker, triage labels, domain doc layout). Run once per repo.
- **[technical-writing](./skills/technical-writing/SKILL.md)**: Layered technical-writing standard: Diátaxis structure, Google developer style sentences, STE instruction rules, Global English syntax. For docs, RFCs, readmes, PR descriptions, commit messages.
- **[to-spec](./skills/to-spec/SKILL.md)**: Turn the current conversation into a spec and publish it to the issue tracker.
- **[to-tickets](./skills/to-tickets/SKILL.md)**: Break any plan, spec, or conversation into a set of tracer-bullet tickets, each declaring its blocking edges, whether as text in a local file or as native blocking links on a real tracker.
- **[triage](./skills/triage/SKILL.md)**: Move issues and external PRs through a state machine of triage roles, categorise, verify, grill if needed, and write agent-ready briefs.
- **[wayfinder](./skills/wayfinder/SKILL.md)**: Plan a huge chunk of work (more than one agent session can hold) as a shared map of decision tickets on the issue tracker, resolved one at a time until the way to the destination is clear.

## Model-invoked

Model- or user-reachable (rich trigger phrasing so the model can reach for them).

- **[wizard](./skills/wizard/SKILL.md)**: Generate an interactive bash wizard that walks a human through steps only they can perform: provisioning infrastructure, setting up credentials or CI secrets, walking an unfamiliar third-party dashboard, or running a one-off migration or cutover.
