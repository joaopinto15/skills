#!/usr/bin/env python3
"""Thin wrapper over the `gws` CLI for Gmail triage/labeling.

Handles the two gws gotchas: it prints a "Using keyring backend" line to stdout
before the JSON, and CLAUDE.md forbids the Gmail MCP. Everything routes through
`gws gmail ...` here.
"""
import json
import subprocess
import sys


def _gws(args, body=None):
    cmd = ["gws", "gmail"] + args + ["--format", "json"]
    if body is not None:
        cmd += ["--json", json.dumps(body)]
    r = subprocess.run(cmd, capture_output=True, text=True)
    out = r.stdout
    start = min([i for i in (out.find("{"), out.find("[")) if i != -1] or [-1])
    if start == -1:
        sys.exit(f"gws failed: {r.stderr.strip() or out.strip()}")
    return json.loads(out[start:])


def _p(userId="me", **kw):
    return ["--params", json.dumps({"userId": userId, **kw})]


def labels():
    d = _gws(["users", "labels", "list"] + _p())
    for l in sorted(d["labels"], key=lambda x: x["name"]):
        if l.get("type") == "user":
            print(f"{l['id']}\t{l['name']}")


def create_label(name):
    d = _gws(["users", "labels", "create"] + _p(),
             {"name": name, "labelListVisibility": "labelShow",
              "messageListVisibility": "show"})
    print(f"{d['id']}\t{d['name']}")


def _threads(query, mx):
    mx = int(mx)
    out, token = [], None
    while len(out) < mx:
        p = {"q": query, "maxResults": min(500, mx - len(out))}
        if token:
            p["pageToken"] = token
        d = _gws(["users", "threads", "list"] + _p(**p))
        out += d.get("threads", [])
        token = d.get("nextPageToken")
        if not token:
            break
    return out[:mx]


def _rows(query, mx):
    for t in _threads(query, mx):
        m = _gws(["users", "messages", "get"] +
                 _p(id=t["id"], format="metadata",
                    metadataHeaders=["From", "Subject"]))
        h = {x["name"]: x["value"] for x in m.get("payload", {}).get("headers", [])}
        inbox = "IN" if "INBOX" in m.get("labelIds", []) else "  "
        print(f"{t['id']}\t{inbox}\t{h.get('From','')[:45]}\t{h.get('Subject','')[:60]}")


def inbox(mx=1000):
    _rows("in:inbox", mx)


def search(query, mx=1000):
    _rows(query, mx)


def move(label_id, *tids):
    _apply(label_id, tids, archive=True)


def label(label_id, *tids):
    _apply(label_id, tids, archive=False)


def _apply(label_id, tids, archive):
    body = {"addLabelIds": [label_id]}
    if archive:
        body["removeLabelIds"] = ["INBOX"]
    ok = 0
    for tid in tids:
        d = _gws(["users", "threads", "modify"] + _p(id=tid), body)
        ok += "id" in d
    print(f"{'moved' if archive else 'labeled'}: {ok}/{len(tids)}")


if __name__ == "__main__":
    cmds = {"labels": labels, "create-label": create_label, "inbox": inbox,
            "search": search, "move": move, "label": label}
    if len(sys.argv) < 2 or sys.argv[1] not in cmds:
        sys.exit(f"usage: gmail.py <{'|'.join(cmds)}> [args]")
    cmds[sys.argv[1]](*sys.argv[2:])
