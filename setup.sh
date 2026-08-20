#!/usr/bin/env bash
# Links every skill in this repo into ~/.claude/skills. Re-runnable; overwrites stale links.
set -euo pipefail
src="$(cd "$(dirname "$0")" && pwd)"
dst="$HOME/.claude/skills"
mkdir -p "$dst"
for f in "$src"/*/skills/*/SKILL.md; do
  d=$(dirname "$f")
  ln -sfn "$d" "$dst/$(basename "$d")"
  echo "link  $(basename "$d")"
done
echo
echo "Restart Claude Code to pick up new skills."
