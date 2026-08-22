---
name: gmail-create-filter
description: Create Gmail filters with the `gws` CLI: rules that label, archive, star, or forward mail as it arrives. Use when the user wants future mail handled automatically, on phrasings like "always label these", "auto-archive that newsletter", "keep this sender out of my inbox", "set up a filter", "star anything from my boss".
compatibility: Requires the `gws` CLI, authenticated with Gmail `settings.basic` and label modify scope.
---

# Create a Gmail filter

A filter is a criteria → action rule Gmail applies to **incoming** mail.
Mail already in the mailbox stays put, so a filter answers half the
request: pair it with a [gmail-triage](../gmail-triage/SKILL.md) sweep to
file the backlog the same way.

## Commands

`gws` prints a `Using keyring backend: keyring` line before the JSON body.

```
gws gmail users labels list             --params '{"userId":"me"}' --format json
gws gmail users labels create           --params '{"userId":"me"}' --json '{"name":"Receipts"}'
gws gmail users settings filters list   --params '{"userId":"me"}' --format json
gws gmail users settings filters create --params '{"userId":"me"}' --json '<filter>'
gws gmail users settings filters delete --params '{"userId":"me","id":"<filter_id>"}'
```

## Filter shape

```json
{"criteria": {"from": "receipts@example.com"},
 "action": {"addLabelIds": ["Label_5"], "removeLabelIds": ["INBOX"]}}
```

**criteria**: `from`, `to`, `subject`, `query`, `negatedQuery`,
`hasAttachment`, `excludeChats`, `size` + `sizeComparison`. `query` takes a
full Gmail search string, such as `from:(a@x.com OR b@y.com) has:attachment`,
so one filter covers a whole family of senders.

**action**: `addLabelIds`, `removeLabelIds`, `forward`. Labels are addressed
by id (`Label_5`), never display name. Every Gmail-UI checkbox is one of
these two lists:

| Intent | Action |
|---|---|
| Skip the inbox (archive) | `removeLabelIds: ["INBOX"]` |
| Star it | `addLabelIds: ["STARRED"]` |
| Mark as read | `removeLabelIds: ["UNREAD"]` |
| Always / never important | `addLabelIds` / `removeLabelIds: ["IMPORTANT"]` |
| Delete it | `addLabelIds: ["TRASH"]` |
| Never send to spam | `removeLabelIds: ["SPAM"]` |

A `forward` address has to be verified in Gmail's settings UI first; the API
forwards to verified addresses only.

## Workflow

1. `labels list` builds the id↔name map. `labels create` makes the target
   label when it is missing.
2. `filters list` reads what already fires. Gmail runs every matching
   filter, so a near-duplicate stacks its actions on top of the old one.
3. Restate the rule to the user in plain words. Which mail, which action.
   Create it once they confirm. A filter that archives or trashes acts
   on mail the user has not seen yet, which is the expensive kind of wrong.
4. `filters create`, then `filters list` to confirm the stored criteria
   match what was asked.
5. Offer the [gmail-triage](../gmail-triage/SKILL.md) sweep for the mail
   that arrived before the filter existed.

Filters are immutable. There is no update verb. Editing one means delete
plus create, so keep the old filter's JSON until the replacement is listed.

## Example

"label anything from Amazon as Orders and keep it out of my inbox"

```
Label:  Orders (Label_12, created)
Filter: AND_1234 created
  criteria: from = auto-confirm@amazon.es OR no-reply@amazon.es
  action:   +Orders, -INBOX  (skips the inbox)
Applies to new mail only. 14 older Amazon threads still in the inbox.
```
