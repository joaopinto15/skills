# skills

My personal library of agent skills. Reusable instruction packs that Claude Code and other agents load on demand, so I stop re-explaining the same workflow every session.

A skill is a directory under `<category>/skills/` holding a `SKILL.md`. The YAML frontmatter sets `name`, `description`, and optionally `disable-model-invocation`. The rest of the file is the instructions the agent follows.

## Catalog

| Category | What's in it |
|---|---|
| [coding](./coding/README.md) | Design, build, review, debug: TDD, code review, domain modeling, bug diagnosis. |
| [general](./general/README.md) | Thinking and handoff: grill a plan, research, unslop. |
| [productivity](./productivity/README.md) | Conversations into plans, tickets, docs, and repeatable setup. |
| [personal](./personal/README.md) | Machine-specific one-offs. |

Each category README lists its skills. It marks which ones you invoke by typing `/<name>` and which ones the agent invokes on its own.

## Setup

Both methods point at this repo, so `git pull` or `/plugin update` brings in new skills. Pick one.

### Install as a plugin

This needs no clone and works on any machine.

```
/plugin marketplace add joaopinto15/skills
/plugin install coding@skills
/plugin install general@skills
/plugin install productivity@skills
```

The marketplace holds one plugin per category, so install only the ones you want. `personal@skills` is there too, but it only helps on my own machines.

To test a change before you push it, point the marketplace at your clone instead: `/plugin marketplace add ~/projetos/skills`.

### Link a local clone

```bash
git clone https://github.com/joaopinto15/skills.git ~/projetos/skills
~/projetos/skills/setup.sh
```

`setup.sh` creates a symlink in `~/.claude/skills` for every skill in the repo, and replaces any link that is already there. Run it again after you add a skill, then restart Claude Code.

To link into a project instead of your home directory, set `dst` in `setup.sh` to `<repo>/.claude/skills`.

## Add a skill

1. Create the directory: `mkdir <category>/skills/<skill-name>`.
2. Write `SKILL.md` with `name` and `description` in the frontmatter. To stop the agent from invoking the skill on its own, add `disable-model-invocation: true`.
3. Add a line for the new skill to that category's README.
4. If you use linked skills, run `setup.sh` again. If you use the plugin, raise `version` in `<category>/.claude-plugin/plugin.json` and push.

`setup.sh` links every skill directly into `~/.claude/skills`, so skill names must be unique across categories.
