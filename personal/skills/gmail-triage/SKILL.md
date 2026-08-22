---
name: gmail-triage
description: Triage Gmail with the `gws` CLI: classify inbox threads into labels, create labels on demand, and bulk-file the results of a mailbox-wide search. Use when the user wants mail sorted, labeled, filed, archived, or moved to a folder, and on the softer phrasings that mean the same thing, such as "clean up my inbox", "where did that receipt go", "organize this mess".
compatibility: Requires the `gws` CLI, authenticated with Gmail read/modify scope.
---

# Gmail triage

Classify and file Gmail threads with `scripts/gmail.py`, a wrapper over
`gws gmail`. Every Gmail action goes through it, including the ones the
Gmail MCP tools also offer.

## Commands

Rows are tab-separated: `thread_id`, `IN`/blank (in inbox?), `from`, `subject`.

```
gmail.py labels                        # user labels -> label_id \t name
gmail.py inbox [max]                   # inbox threads, ready to classify
gmail.py search "<gmail query>" [max]  # same rows, any Gmail search
gmail.py create-label "<Name>"         # make a label, prints its id
gmail.py move  <label_id> <tid>...     # apply label + drop INBOX
gmail.py label <label_id> <tid>...     # apply label, thread stays in inbox
```

Labels are addressed by id (`Label_5`), never display name. System ids:
`INBOX TRASH SPAM STARRED UNREAD IMPORTANT SENT DRAFT`.

## Move vs label

A **move** applies the label and drops `INBOX`. A **label** tags the thread
where it sits. "Move it to a tag/folder" reads as either one casually, so ask
which the user means when the context doesn't settle it.

## Workflow

1. `gmail.py labels` builds the id↔name map.
2. `gmail.py inbox`, or `gmail.py search "<query>"` for a mailbox-wide sweep.
3. Classify each row by sender domain plus subject against the existing labels.
4. `gmail.py move <label_id> <tid...>`. One call per label, with every
   thread id for that label batched into it.
5. Report grouped counts. Every thread from step 2 is either moved or listed
   with the reason it stayed.

Move a thread on a **confident** sender/subject match. Undo is manual and
per-thread, with no bulk equivalent, so the cost is asymmetric: an ambiguous
thread goes on the list for the user rather than into a label.

## Broad queries over-match

`ulisboa.pt` hits every University of Lisbon faculty; `"faculdade de
ciências"` hits Porto (`fc.up.pt`) and Lisbon (`ciencias.ulisboa.pt`) at
once. Read the `from` column of a search before moving anything, and file
the rows whose sender domain actually matches the target label.

## Example

"file everything from GitHub notifications under Dev, and move the Amazon
order confirmations to Orders"

```
Dev: 6 moved (notifications@github.com)
Orders: 3 moved (auto-confirm@amazon.es, no-reply@amazon.es)
Left in inbox: 1 (ambiguous, "Re: your order" from a personal address)
```
