#!/usr/bin/env node
// Generates docs/index.html from every */skills/*/SKILL.md in this repo.
// Neutrals, fonts and radius follow the shadcn theme used by
// github.com/joaopinto15/joaopinto15.github.io. The four category hues are
// validated for colour-vision separation across all pairs, in both themes.
// Run it with: node tools/build-catalog.mjs
import { readdirSync, readFileSync, writeFileSync, mkdirSync, statSync } from "node:fs";
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// ponytail: marked is vendored, not an npm dependency. The catalog workflow runs
// `node tools/build-catalog.mjs` with no install step, and this keeps it that way.
const { marked } = createRequire(import.meta.url)("./vendor/marked.min.js");

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ORDER = ["coding", "general", "productivity", "personal"];
const REPO = process.env.GITHUB_REPOSITORY || "joaopinto15/skills";
const BLOB = `https://github.com/${REPO}/blob/main`;
// Hues are assigned in fixed order and never cycled. A fifth category falls
// back to plain foreground rather than an invented hue.
const HUES = 4;

// ponytail: line-based frontmatter read, no YAML parser. Every description in
// this repo is a single line. Add js-yaml only if a multi-line one shows up.
function frontmatter(text) {
	const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
	if (!m) return null;
	const fields = {};
	for (const line of m[1].split(/\r?\n/)) {
		const kv = line.match(/^([A-Za-z-]+):\s*(.*)$/);
		if (kv) fields[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, "");
	}
	return fields;
}

// The frontmatter description doubles as the trigger, so it carries a tail of
// example phrases. Keep the part that says what the skill does.
function summarize(desc) {
	if (!desc) return "";
	let s = desc.split(/\s(?:Use|Also use|Triggers?|Fires)\s(?:when|for|on)\b/i)[0].trim();
	s = s.replace(/^Use (?:this skill )?when\s+(\w)/i, (_, c) => c.toUpperCase());
	let out = "";
	for (const part of s.split(/(?<=[.?!])\s+/)) {
		if (out && (out + " " + part).length > 260) break;
		out = out ? out + " " + part : part;
	}
	if (out.length > 300) out = out.slice(0, 297).trimEnd() + "…";
	return out.replace(/[,;:]$/, "").replace(/([^.?!…])$/, "$1.");
}

function collect() {
	const dirs = readdirSync(ROOT, { withFileTypes: true })
		.filter((d) => d.isDirectory() && statSync(join(ROOT, d.name, "skills"), { throwIfNoEntry: false })?.isDirectory())
		.map((d) => d.name);
	const cats = [...new Set([...ORDER.filter((c) => dirs.includes(c)), ...dirs.sort()])];

	return cats.map((cat, i) => {
		const base = join(ROOT, cat, "skills");
		const skills = readdirSync(base, { withFileTypes: true })
			.filter((d) => d.isDirectory())
			.map((d) => {
				const file = join(base, d.name, "SKILL.md");
				const text = statSync(file, { throwIfNoEntry: false }) ? readFileSync(file, "utf8") : "";
				const fm = frontmatter(text);
				return {
					dir: d.name,
					path: `${cat}/skills/${d.name}`,
					name: fm?.name || d.name,
					summary: fm ? summarize(fm.description) : "",
					typed: fm?.["disable-model-invocation"] === "true",
					loadable: Boolean(fm?.name && fm?.description),
					bytes: text.length,
					page: `${cat}/${d.name}.html`,
					// The whole file, split the way it is written: the header is a table of
					// fields, everything after it is markdown.
					fields: fm || {},
					body: text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, ""),
				};
			})
			.sort((a, b) => a.dir.localeCompare(b.dir));
		return { cat, skills, hue: i < HUES ? `var(--cat-${i + 1})` : "var(--foreground)" };
	});
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function commitSha() {
	if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7);
	try {
		return execSync("git rev-parse --short HEAD", { cwd: ROOT, encoding: "utf8" }).trim();
	} catch {
		return "working tree";
	}
}

const cats = collect();
const all = cats.flatMap((c) => c.skills);
const total = all.length;
const typed = all.filter((s) => s.typed).length;
const loadable = all.filter((s) => s.loadable).length;
const broken = all.filter((s) => !s.loadable);

const ARROW =
	'<svg class="arrow" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg>';

const card = (s) => {
	const pill = !s.loadable
		? '<span class="pill stub">empty</span>'
		: s.typed
			? '<span class="pill typed">typed</span>'
			: '<span class="pill outline">agent</span>';
	const text = s.loadable
		? esc(s.summary)
		: s.bytes === 0
			? "The folder is there. The file has nothing in it yet."
			: "No frontmatter, so this file does not load as a skill.";
	return `			<a class="card" href="./${esc(s.page)}">
				<div class="cardtop"><span class="cardname">${esc(s.name)}${ARROW}</span>${pill}</div>
				<p class="cardtext">${text}</p>
				<span class="cardpath">${esc(s.path)}</span>
			</a>`;
};

const section = ({ cat, skills, hue }) => {
	const t = skills.filter((s) => s.typed).length;
	const bad = skills.filter((s) => !s.loadable);
	const note = bad.length
		? `\n\t\t<p class="note"><strong>${bad.length === 1 ? "One skill here does not load." : `${bad.length} skills here do not load.`}</strong> ${bad
				.map((s) => `<code>${esc(s.path)}/SKILL.md</code>`)
				.join(", ")} ${bad.length === 1 ? "has" : "have"} no <code>name</code> and no <code>description</code>, so ${
				bad.length === 1 ? "it never reaches" : "they never reach"
			} a session.</p>`
		: "";
	return `	<section class="cat" id="cat-${esc(cat)}" style="--hue: ${hue}">
		<div class="cathead">
			<span class="dot"></span>
			<h2>${esc(cat)}</h2>
			<span class="count">${skills.length} ${skills.length === 1 ? "folder" : "skills"}, ${t} typed</span>
			<code class="install">/plugin install ${esc(cat)}@skills</code>
		</div>
		<div class="grid">
${skills.map(card).join("\n")}
		</div>${note}
	</section>`;
};

// What the library is made of, one segment per category. The names below carry
// identity; colour is the second encoding, never the only one.
const bar = cats
	.map(
		({ cat, skills, hue }) =>
			`				<span class="seg" style="--hue: ${hue}; flex-grow: ${skills.length}" title="${esc(cat)}: ${skills.length} of ${total} skills"></span>`,
	)
	.join("\n");

const keys = cats
	.map(
		({ cat, skills, hue }) =>
			`				<a class="key" href="#cat-${esc(cat)}" style="--hue: ${hue}"><span class="dot"></span>${esc(cat)} <b>${skills.length}</b></a>`,
	)
	.join("\n");

const CSS = `	/* Neutrals: shadcn, the same tokens as the portfolio.
	   Category hues: checked with the palette validator, all pairs, both themes. */
	:root {
		--background: oklch(1 0 0);
		--foreground: oklch(0.145 0 0);
		--card: oklch(1 0 0);
		--muted: oklch(0.97 0 0);
		--muted-foreground: oklch(0.556 0 0);
		--accent: oklch(0.97 0 0);
		--border: oklch(0.922 0 0);
		--primary: oklch(0.205 0 0);
		--primary-foreground: oklch(0.985 0 0);
		--warn: oklch(0.55 0.15 55);
		--ring: oklch(0.708 0 0);
		--radius: 0.625rem;

		--cat-1: #1447e6;
		--cat-2: #009689;
		--cat-3: #f54900;
		--cat-4: #a800b7;

		--sans: "Geist", ui-sans-serif, system-ui, "Segoe UI", Helvetica, Arial, sans-serif;
		--mono: "Geist Mono", ui-monospace, "SFMono-Regular", Consolas, monospace;
	}

	@media (prefers-color-scheme: dark) {
		:root:not([data-theme="light"]) {
			--background: oklch(0.18 0 0);
			--foreground: oklch(0.985 0 0);
			--card: oklch(0.205 0 0);
			--muted: oklch(0.269 0 0);
			--muted-foreground: oklch(0.708 0 0);
			--accent: oklch(0.269 0 0);
			--border: oklch(1 0 0 / 12%);
			--primary: oklch(0.922 0 0);
			--primary-foreground: oklch(0.205 0 0);
			--warn: oklch(0.828 0.189 84.429);
			--ring: oklch(0.556 0 0);
			--cat-1: #2b7fff;
		}
	}

	:root[data-theme="dark"], .dark {
		--background: oklch(0.18 0 0);
		--foreground: oklch(0.985 0 0);
		--card: oklch(0.205 0 0);
		--muted: oklch(0.269 0 0);
		--muted-foreground: oklch(0.708 0 0);
		--accent: oklch(0.269 0 0);
		--border: oklch(1 0 0 / 12%);
		--primary: oklch(0.922 0 0);
		--primary-foreground: oklch(0.205 0 0);
		--warn: oklch(0.828 0.189 84.429);
		--ring: oklch(0.556 0 0);
		--cat-1: #2b7fff;
	}

	* { box-sizing: border-box; }

	body {
		margin: 0;
		background: var(--background);
		color: var(--foreground);
		font-family: var(--sans);
		font-size: 16px;
		line-height: 1.6;
		-webkit-font-smoothing: antialiased;
	}

	.wrap {
		max-width: 1024px;
		margin: 0 auto;
		padding: clamp(28px, 6vw, 64px) clamp(16px, 4vw, 32px) 80px;
		display: flex;
		flex-direction: column;
		gap: 56px;
	}

	.masthead { display: flex; flex-direction: column; gap: 20px; }

	.eyebrow { font-family: var(--mono); font-size: 12.5px; color: var(--muted-foreground); margin: 0; }
	.eyebrow a { color: inherit; text-decoration: none; border-bottom: 1px solid var(--border); }
	.eyebrow a:hover { color: var(--foreground); }

	h1 {
		font-size: clamp(30px, 5.5vw, 48px);
		font-weight: 600;
		letter-spacing: -0.045em;
		line-height: 1.05;
		text-wrap: balance;
		margin: 0;
	}

	.lede { max-width: 65ch; font-size: 17px; color: var(--muted-foreground); margin: 0; }

	code { font-family: var(--mono); }
	.lede code, .note code, .cardtext code {
		font-size: 0.85em;
		background: var(--muted);
		border: 1px solid var(--border);
		border-radius: calc(var(--radius) - 4px);
		padding: 1px 5px;
		color: var(--foreground);
	}

	/* what the library is made of: one segment per category, 2px surface gaps */
	.barwrap { display: flex; flex-direction: column; gap: 12px; }
	.bar { display: flex; gap: 2px; height: 10px; }
	.seg { background: var(--hue); border-radius: 4px; min-width: 6px; }

	.keys { display: flex; flex-wrap: wrap; gap: 8px 18px; }
	.key {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		font-size: 14px;
		color: var(--muted-foreground);
		text-decoration: none;
	}
	.key:hover { color: var(--foreground); }
	.key b { color: var(--foreground); font-weight: 600; font-variant-numeric: tabular-nums; }
	.key:focus-visible { outline: 2px solid var(--hue); outline-offset: 3px; border-radius: 4px; }

	.dot { width: 10px; height: 10px; border-radius: 999px; background: var(--hue); flex: none; }

	.stats {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
		border: 1px solid var(--border);
		border-radius: var(--radius);
		overflow: hidden;
		background: var(--card);
	}
	.stat { padding: 14px 18px; border-right: 1px solid var(--border); display: flex; flex-direction: column; gap: 1px; }
	.stat:last-child { border-right: 0; }
	.stat b { font-size: 26px; font-weight: 600; letter-spacing: -0.03em; line-height: 1.2; font-variant-numeric: tabular-nums; }
	.stat span { font-size: 13px; color: var(--muted-foreground); }
	.stat.flag b { color: var(--warn); }

	.legend { display: flex; flex-wrap: wrap; gap: 8px 14px; align-items: center; }
	.legend p { margin: 0; font-size: 14px; color: var(--muted-foreground); }

	.pill {
		font-family: var(--mono);
		font-size: 11px;
		font-weight: 500;
		padding: 2px 8px;
		border-radius: 999px;
		border: 1px solid transparent;
		white-space: nowrap;
		flex: none;
	}
	.pill.typed { background: var(--primary); color: var(--primary-foreground); }
	.pill.outline { border-color: var(--border); color: var(--muted-foreground); }
	.pill.stub { border-color: var(--warn); color: var(--warn); }

	figure { margin: 0; display: flex; flex-direction: column; gap: 12px; }
	.figbox {
		overflow-x: auto;
		background: var(--card);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 22px;
	}
	.figbox svg { display: block; min-width: 720px; max-width: 100%; height: auto; color: var(--muted-foreground); }
	figcaption { font-size: 14px; color: var(--muted-foreground); max-width: 74ch; }

	.dgm-box { fill: var(--muted); stroke: var(--border); }
	.dgm-name { font-family: var(--mono); font-size: 12.5px; font-weight: 500; fill: var(--foreground); }
	.dgm-sub { font-size: 11.5px; fill: var(--muted-foreground); }
	.dgm-edge { font-family: var(--mono); font-size: 10.5px; fill: var(--muted-foreground); }
	.dgm-line { fill: none; stroke: currentColor; stroke-width: 1.25; }
	.dgm-solid { stroke: var(--foreground); }
	.dgm-dashed { stroke: var(--foreground); stroke-dasharray: 5 4; }

	.cat { display: flex; flex-direction: column; gap: 16px; scroll-margin-top: 24px; }
	.cathead {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 6px 12px;
		padding-bottom: 12px;
		border-bottom: 2px solid color-mix(in oklab, var(--hue) 60%, transparent);
	}
	.cathead h2 { font-size: 22px; font-weight: 600; letter-spacing: -0.03em; margin: 0; }
	.cathead .count { font-size: 13.5px; color: var(--muted-foreground); font-variant-numeric: tabular-nums; }
	.cathead .install { font-size: 12px; color: var(--muted-foreground); margin-left: auto; }

	.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(264px, 1fr)); gap: 12px; }

	.card {
		background: var(--card);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 14px 16px;
		display: flex;
		flex-direction: column;
		gap: 8px;
		color: inherit;
		text-decoration: none;
		transition: background-color 0.15s ease, border-color 0.15s ease;
	}
	.card:hover {
		background: color-mix(in oklab, var(--hue) 7%, var(--card));
		border-color: color-mix(in oklab, var(--hue) 55%, var(--border));
	}
	.card:focus-visible { outline: 2px solid var(--hue); outline-offset: 2px; }
	.cardtop { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
	.cardname {
		font-family: var(--mono);
		font-size: 13.5px;
		font-weight: 600;
		letter-spacing: -0.02em;
		display: inline-flex;
		align-items: center;
		gap: 4px;
		word-break: break-word;
	}
	.arrow { color: var(--hue); flex: none; transition: transform 0.15s ease; }
	.card:hover .arrow { transform: translate(1px, -1px); }
	.cardtext { margin: 0; font-size: 14px; color: var(--muted-foreground); }
	.cardpath {
		font-family: var(--mono);
		font-size: 11px;
		color: var(--muted-foreground);
		opacity: 0.75;
		margin-top: auto;
		padding-top: 8px;
		word-break: break-all;
	}

	.note {
		background: var(--muted);
		border: 1px solid var(--border);
		border-left: 4px solid var(--warn);
		border-radius: var(--radius);
		border-top-left-radius: 0;
		border-bottom-left-radius: 0;
		padding: 14px 16px;
		font-size: 14px;
		color: var(--muted-foreground);
		margin: 0;
	}
	.note strong { color: var(--foreground); font-weight: 600; }

	footer { border-top: 1px solid var(--border); padding-top: 20px; display: flex; flex-direction: column; gap: 8px; }
	footer p { margin: 0; font-size: 13px; color: var(--muted-foreground); }
	footer a { color: var(--foreground); text-decoration: underline; text-underline-offset: 4px; }

	/* a skill page: the SKILL.md itself */
	.md { font-size: 15.5px; }
	.md > :first-child { margin-top: 0; }
	.md h1, .md h2, .md h3, .md h4 { font-weight: 600; letter-spacing: -0.02em; line-height: 1.25; margin: 1.5em 0 0.5em; }
	.md h1 { font-size: 24px; }
	.md h2 { font-size: 19px; padding-bottom: 6px; border-bottom: 1px solid var(--border); }
	.md h3 { font-size: 16px; }
	.md h4 { font-size: 14.5px; }
	.md p, .md ul, .md ol, .md blockquote, .md pre { margin: 0 0 1em; }
	.md .tablewrap table { margin: 0; }
	.md ul, .md ol { padding-left: 1.4em; }
	.md li { margin: 0.25em 0; }
	.md a { color: var(--foreground); text-underline-offset: 3px; }
	.md code { font-family: var(--mono); font-size: 0.85em; background: var(--muted); border: 1px solid var(--border); border-radius: 5px; padding: 1px 5px; }
	.md pre { background: var(--muted); border: 1px solid var(--border); border-radius: var(--radius); padding: 14px 16px; overflow-x: auto; }
	.md pre code { background: none; border: 0; padding: 0; font-size: 13px; }
	.md blockquote { border-left: 3px solid var(--border); padding-left: 14px; color: var(--muted-foreground); }
	.tablewrap { overflow-x: auto; margin: 0 0 1em; }
	.md table { border-collapse: collapse; width: 100%; font-size: 14px; }
	.md th, .md td { border: 1px solid var(--border); padding: 6px 12px; text-align: left; }
	.md th { background: var(--muted); font-weight: 600; }
	.md table.fm { font-family: var(--mono); font-size: 13px; }
	.md table.fm th[scope="row"] { white-space: nowrap; width: 1%; font-weight: 500; }
	.md table.fm th[scope="row"] code { background: none; border: 0; padding: 0; }
	.md table.fm td { color: var(--muted-foreground); }
	.md hr { border: 0; border-top: 1px solid var(--border); margin: 2em 0; }
	.md img { max-width: 100%; }

	@media (prefers-reduced-motion: reduce) {
		.card, .arrow { transition: none; }
		.card:hover .arrow { transform: none; }
	}
	/* skill page chrome */
	.crumb { font-family: var(--mono); font-size: 12.5px; color: var(--muted-foreground); margin: 0; }
	.crumb a { color: inherit; text-decoration: none; border-bottom: 1px solid var(--border); }
	.crumb a:hover { color: var(--foreground); }
	.skillhead { display: flex; flex-direction: column; gap: 14px; }
	.skillhead .row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; }
	.skillhead h1 { font-family: var(--mono); font-size: clamp(24px, 4vw, 34px); }
	.skillhead .src { font-size: 13px; color: var(--muted-foreground); text-decoration: none; margin-left: auto; }
	.skillhead .src:hover { color: var(--foreground); }
	.filepath { font-family: var(--mono); font-size: 12px; color: var(--muted-foreground); word-break: break-all; }
	article { display: flex; flex-direction: column; gap: 24px; }

	.wrap.doc { max-width: 880px; gap: 32px; }
`;

const HEAD = (title, desc, css) => `<title>${esc(title)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="${esc(desc)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600&display=swap">
<link rel="stylesheet" href="${css}">`;

const html = `${HEAD("Skill Library", `Every skill in ${REPO}, generated from the SKILL.md files.`, "./style.css")}

<div class="wrap">

	<header class="masthead">
		<p class="eyebrow"><a href="https://github.com/${esc(REPO)}">github.com/${esc(REPO)}</a></p>
		<h1>Skill Library</h1>
		<p class="lede">${total} skill folders in ${cats.length} categories. Each one holds a <code>SKILL.md</code>: frontmatter naming the skill, a description that decides when it fires, and the instructions the agent follows. This page is generated from those files, so it cannot drift from them. Every card links to the file it describes.</p>

		<div class="barwrap">
			<div class="bar" role="img" aria-label="${cats.map((c) => `${c.cat} ${c.skills.length}`).join(", ")}, of ${total} skills">
${bar}
			</div>
			<nav class="keys">
${keys}
			</nav>
		</div>

		<div class="stats">
			<div class="stat"><b>${total}</b><span>skill folders</span></div>
			<div class="stat"><b>${typed}</b><span>you type</span></div>
			<div class="stat"><b>${loadable - typed}</b><span>agent picks</span></div>
			<div class="stat"><b>${cats.length}</b><span>categories</span></div>${
				broken.length
					? `\n\t\t\t<div class="stat flag"><b>${broken.length}</b><span>empty stub${broken.length === 1 ? "" : "s"}</span></div>`
					: ""
			}
		</div>

		<div class="legend">
			<span class="pill typed">typed</span>
			<p>Carries <code>disable-model-invocation: true</code>, so only <code>/name</code> starts it.</p>
		</div>
		<div class="legend">
			<span class="pill outline">agent</span>
			<p>No flag, so the agent may start it from the description alone.</p>
		</div>
	</header>

	<figure>
		<div class="figbox">
			<svg viewBox="0 0 920 300" role="img" aria-label="A skill travels from its SKILL.md file through either the setup.sh symlink or a plugin install into an agent session, where you can always start it by typing its name, while the agent can only start it from the description when disable-model-invocation is absent.">
				<defs>
					<marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
						<polygon points="0,1 10,5 0,9" fill="currentColor"></polygon>
					</marker>
				</defs>

				<polyline class="dgm-line" points="196,150 216,150 216,74 238,74" marker-end="url(#ah)"></polyline>
				<polyline class="dgm-line" points="196,150 216,150 216,226 238,226" marker-end="url(#ah)"></polyline>
				<polyline class="dgm-line" points="436,74 458,74 458,150 480,150" marker-end="url(#ah)"></polyline>
				<polyline class="dgm-line" points="436,226 458,226 458,150 480,150" marker-end="url(#ah)"></polyline>
				<polyline class="dgm-line dgm-solid" points="652,150 676,150 676,74 700,74" marker-end="url(#ah)"></polyline>
				<polyline class="dgm-line dgm-dashed" points="652,150 676,150 676,226 700,226" marker-end="url(#ah)"></polyline>

				<rect class="dgm-box" rx="8" x="14" y="118" width="182" height="64"></rect>
				<text class="dgm-name" x="30" y="144">SKILL.md</text>
				<text class="dgm-sub" x="30" y="164">name, description, body</text>

				<rect class="dgm-box" rx="8" x="238" y="46" width="198" height="56"></rect>
				<text class="dgm-name" x="254" y="70">setup.sh</text>
				<text class="dgm-sub" x="254" y="89">symlink in ~/.claude/skills</text>

				<rect class="dgm-box" rx="8" x="238" y="198" width="198" height="56"></rect>
				<text class="dgm-name" x="254" y="222">/plugin install</text>
				<text class="dgm-sub" x="254" y="241">one plugin per category</text>

				<rect class="dgm-box" rx="8" x="480" y="118" width="172" height="64"></rect>
				<text class="dgm-name" x="496" y="144">agent session</text>
				<text class="dgm-sub" x="496" y="164">reads name, description</text>

				<rect class="dgm-box" rx="8" x="700" y="46" width="206" height="56"></rect>
				<text class="dgm-name" x="716" y="70">you type /name</text>
				<text class="dgm-sub" x="716" y="89">all ${loadable} loadable skills</text>

				<rect class="dgm-box" rx="8" x="700" y="198" width="206" height="56"></rect>
				<text class="dgm-name" x="716" y="222">agent picks it</text>
				<text class="dgm-sub" x="716" y="241">the ${loadable - typed} without the flag</text>

				<text class="dgm-edge" x="222" y="112">local clone</text>
				<text class="dgm-edge" x="222" y="192">marketplace</text>
				<text class="dgm-edge" x="464" y="112">loads</text>
				<text class="dgm-edge" x="464" y="192">loads</text>
				<text class="dgm-edge" x="682" y="112">always</text>
				<text class="dgm-edge" x="682" y="192">by description</text>
			</svg>
		</div>
		<figcaption>Two install routes, one loading step, two ways to start a skill. The dashed path is the one <code>disable-model-invocation: true</code> closes off, and that flag is what the pill on each card records.</figcaption>
	</figure>

${cats.map(section).join("\n\n")}

	<footer>
		<p>Generated by <a href="${BLOB}/tools/build-catalog.mjs">tools/build-catalog.mjs</a> from the <code>SKILL.md</code> frontmatter at commit <code>${esc(commitSha())}</code>. Each card shows the opening of the skill's description, with the trigger phrases trimmed off.</p>
		<p>Edit a skill, push, and the <a href="${BLOB}/.github/workflows/catalog.yml">catalog workflow</a> rebuilds this page.</p>
	</footer>

</div>

`;

const frontmatterTable = (fields) => {
	const rows = Object.entries(fields);
	if (!rows.length) return "";
	return `<div class="tablewrap"><table class="fm">
<thead><tr><th>Field</th><th>Value</th></tr></thead>
<tbody>
${rows.map(([k, v]) => `<tr><th scope="row"><code>${esc(k)}</code></th><td>${esc(v)}</td></tr>`).join("\n")}
</tbody>
</table></div>`;
};

// A SKILL.md links to its neighbours by relative path (tests.md, reporting.md).
// Those files are not published here, so send those links to the repo instead.
function render(s) {
	const walk = new marked.Renderer();
	const table = walk.table.bind(walk);
	walk.table = (token) => `<div class="tablewrap">${table(token)}</div>`;
	const link = walk.link.bind(walk);
	walk.link = (token) => {
		if (!/^([a-z]+:|\/\/|#)/i.test(token.href)) token.href = `${BLOB}/${s.path}/${token.href}`;
		return link(token);
	};
	return marked.parse(s.body, { gfm: true, renderer: walk });
}

const skillPage = (cat, s, hue) => `${HEAD(`${s.name} · Skill Library`, s.summary || `${s.path}/SKILL.md`, "../style.css")}

<div class="wrap doc" style="--hue: ${hue}">

	<article>
		<header class="skillhead">
			<p class="crumb"><a href="../">Skill Library</a> / <a href="../#cat-${esc(cat)}">${esc(cat)}</a></p>
			<div class="row">
				<h1>${esc(s.name)}</h1>
				${
					s.loadable
						? s.typed
							? '<span class="pill typed">typed</span>'
							: '<span class="pill outline">agent</span>'
						: '<span class="pill stub">empty</span>'
				}
				<a class="src" href="${BLOB}/${esc(s.path)}/SKILL.md" target="_blank" rel="noopener">view on GitHub ↗</a>
			</div>
			<p class="filepath">${esc(s.path)}/SKILL.md</p>
		</header>

		<div class="md">
${frontmatterTable(s.fields)}
${s.body.trim() ? render(s) : "<p>The folder is there. The file has nothing in it yet.</p>"}
		</div>

		<footer>
			<p>The whole file, frontmatter included, rendered at commit <code>${esc(commitSha())}</code>. Edit it on <a href="${BLOB}/${esc(s.path)}/SKILL.md">GitHub</a> and this page rebuilds.</p>
			<p><a href="../">← every skill</a></p>
		</footer>
	</article>

</div>
`;

mkdirSync(join(ROOT, "docs"), { recursive: true });
writeFileSync(join(ROOT, "docs", "style.css"), CSS.trimStart() + "\n");
writeFileSync(join(ROOT, "docs", "index.html"), html);
for (const { cat, skills, hue } of cats) {
	mkdirSync(join(ROOT, "docs", cat), { recursive: true });
	for (const s of skills) writeFileSync(join(ROOT, "docs", s.page), skillPage(cat, s, hue));
}
console.log(`docs/index.html + ${total} skill pages: ${total} skills, ${typed} typed, ${loadable - typed} model-invocable, ${broken.length} not loadable`);
