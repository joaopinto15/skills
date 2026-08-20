# skills

My personal library of agent skills — reusable instruction packs that Claude Code (and other agents) load on demand instead of me re-explaining a workflow every session.

Each skill is a directory under `<category>/skills/` with a `SKILL.md`: YAML frontmatter (`name`, `description`, and whether the model may invoke it on its own) plus the instructions the agent follows.

## Catalog

| Category | What's in it |
|---|---|
| [coding](./coding/README.md) | Design, build, review, debug — TDD, code review, domain modeling, bug diagnosis. |
| [general](./general/README.md) | Thinking and handover — grilling a plan, research, handoffs, unslop. |
| [productivity](./productivity/README.md) | Conversations into plans, tickets, docs, repeatable setup. |
| [personal](./personal/README.md) | Machine-specific one-offs. |

Each category README lists its skills and marks which are user-invoked (you type them) vs model-invoked (the agent reaches for them itself).

## Setup

Pick one. Both keep the skills pointing at this repo, so `git pull` updates them.

### As a plugin (easiest, any machine)

```
/plugin marketplace add joaopinto15/skills
/plugin install coding@skills
/plugin install general@skills
/plugin install productivity@skills
```

One plugin per category — install only what you want. `/plugin update` pulls new skills.
Working on the repo locally? Point the marketplace at the folder instead: `/plugin marketplace add ~/projetos/skills`.

### As linked skills (local clone)

```powershell
git clone https://github.com/joaopinto15/skills.git $HOME\projetos\skills
$HOME\projetos\skills\setup.ps1
```

```bash
git clone https://github.com/joaopinto15/skills.git ~/projetos/skills
~/projetos/skills/setup.sh
```

`setup.ps1` / `setup.sh` junction (Windows) or symlink (macOS/Linux) every skill into `~/.claude/skills`. Re-run after adding a skill. Restart the Claude Code session to pick up changes.

Project-scoped instead of global: edit `$dst` / `dst` in the script to `<repo>/.claude/skills`.

## Adding a skill

1. `mkdir <category>/skills/<skill-name>` and write `SKILL.md` with frontmatter (`name`, `description`; add `disable-model-invocation: true` for type-only skills).
2. Add a line to that category's README.
3. Re-run `setup.ps1`, or bump the category's `version` in `<category>/.claude-plugin/plugin.json` and push for plugin users.

Skill names must be unique across categories — linked skills all land flat in `~/.claude/skills`.
