---
name: gmail-triage
description: >
  Sort, label, and file the user's Gmail. Use whenever the user wants their
  inbox organized: "go through the inbox", "clean up my inbox", "sort my
  email", "move these to a label/folder", "create a label", "find all mail
  from X and file it", or "archive everything from Y". Also trigger on
  softer phrasing that implies the same thing, even without the word
  "Gmail" — "where did that receipt go", "get rid of the newsletter spam
  in my inbox", "organize this mess". Covers classifying inbox threads into
  existing labels, creating new labels on demand, and searching the whole
  mailbox for a topic to bulk-file matches. Triggers: Gmail, inbox, label,
  tag, folder, triage, archive, sort email, file emails, mailbox cleanup.
compatibility: >
  Requires the `gws` CLI, authenticated with Gmail read/modify scope. Do not
  use Gmail MCP tools for this — this skill exists specifically to route
  Gmail work through `gws` instead.
---

# Gmail Triage

Classify and file Gmail threads into labels using the `gws` CLI, via the
`scripts/gmail.py` wrapper.

## Rules

- Use `gws gmail ...` (through the wrapper below), never the Gmail MCP tools.
- "Move to a tag/folder" means apply the label **and** remove `INBOX`.
  Labeling without removing `INBOX` just tags the thread in place — these
  read as the same request casually, so ask which the user means if it's
  not clear from context.
- Operate on **threads**, not individual messages, so replies stay grouped
  under one decision.
- Only file a thread when the sender/subject match is confident. A wrong
  bulk move is tedious to undo (see Notes), so ambiguous threads stay in
  the inbox — list them for the user instead of guessing.

## Helper script

`scripts/gmail.py` wraps `gws` and strips the noisy `Using keyring` line it
prints to stdout before the JSON. Output is tab-separated:
`thread_id`, `IN`/blank (currently in inbox?), `from`, `subject`.

```
gmail.py labels                        # user labels -> label_id \t name
gmail.py inbox [max]                   # inbox threads, ready to classify
gmail.py search "<gmail query>" [max]  # same, but any Gmail search
gmail.py create-label "<Name>"         # make a label, prints its id
gmail.py move  <label_id> <tid>...     # apply label + remove INBOX (the "move")
gmail.py label <label_id> <tid>...     # apply label only, keep in inbox
```

## Workflow

1. `gmail.py labels` — build the id↔name map. Labels are addressed by id
   (e.g. `Label_5`), not by display name.
2. `gmail.py inbox` — read senders/subjects for everything waiting.
3. Classify by sender domain + subject against the existing labels. Skip
   anything you're not confident about rather than force-fitting it.
4. `gmail.py move <label_id> <tid...>` per label — batch every thread id
   for a given label into one call instead of one call per thread.
5. Report grouped counts, plus what was left in the inbox and why.

### Example

Input: "file everything from GitHub notifications under Dev, and move the
Amazon order confirmations to Orders"

Output:
```
Dev: 6 moved (notifications@github.com)
Orders: 3 moved (auto-confirm@amazon.es, no-reply@amazon.es)
Left in inbox: 1 (ambiguous — "Re: your order" from a personal address, not a storefront)
```

## Search-and-file gotcha

Broad queries over-match. `ulisboa.pt` hits every University of Lisbon
faculty; `"faculdade de ciências"` hits both Porto (`fc.up.pt`) and Lisbon
(`ciencias.ulisboa.pt`) simultaneously. Always run `search` first and
eyeball the `from` column before moving anything — file only the rows whose
sender domain actually matches the target label, not just the rows the
query happened to return.

## Notes

- System label ids: `INBOX TRASH SPAM STARRED UNREAD IMPORTANT SENT DRAFT`.
- Moves are reversible (re-add `INBOX`), but that's a manual per-thread
  fix — there's no bulk undo. That asymmetry is why low-confidence threads
  get listed for the user instead of moved speculatively.
