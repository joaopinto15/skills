# Links every skill in this repo into ~/.claude/skills. Re-runnable; skips what's already linked.
$src = $PSScriptRoot
$dst = Join-Path $HOME ".claude\skills"
New-Item -ItemType Directory -Force $dst | Out-Null
Get-ChildItem $src -Filter SKILL.md -Recurse | ForEach-Object {
  $d = $_.Directory
  $t = Join-Path $dst $d.Name
  if (Test-Path $t) { "skip  $($d.Name)" }
  else { New-Item -ItemType Junction -Path $t -Target $d.FullName | Out-Null; "link  $($d.Name)" }
}
"`nRestart Claude Code to pick up new skills."
