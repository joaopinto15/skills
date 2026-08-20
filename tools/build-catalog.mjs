#!/usr/bin/env node
// Generates docs/index.html from every */skills/*/SKILL.md in this repo.
// Run it with: node tools/build-catalog.mjs
import { readdirSync, readFileSync, writeFileSync, mkdirSync, statSync } from "node:fs";
import { execSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ORDER = ["coding", "general", "productivity", "personal"];

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
	// Drop the trigger tail, then the leading "Use when" of the skills written that way.
	let s = desc.split(/\s(?:Use|Also use|Triggers?|Fires)\s(?:when|for|on)\b/i)[0].trim();
	s = s.replace(/^Use (?:this skill )?when\s+(\w)/i, (_, c) => c.toUpperCase());
	// Keep whole sentences up to roughly one card's worth.
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

	return cats.map((cat) => {
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
				};
			})
			.sort((a, b) => a.dir.localeCompare(b.dir));
		return { cat, skills };
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

const card = (s) => {
	const pill = !s.loadable
		? '<span class="pill stub">empty</span>'
		: s.typed
			? '<span class="pill typed">typed</span>'
			: '<span class="pill auto">agent</span>';
	const text = s.loadable
		? esc(s.summary)
		: s.bytes === 0
			? "The folder is there. The file has nothing in it yet."
			: "No frontmatter, so this file does not load as a skill.";
	return `			<article class="card">
				<div class="cardtop"><span class="cardname">${esc(s.name)}</span>${pill}</div>
				<p class="cardtext">${text}</p>
				<div class="cardpath">${esc(s.path)}</div>
			</article>`;
};

const section = ({ cat, skills }) => {
	const t = skills.filter((s) => s.typed).length;
	const bad = skills.filter((s) => !s.loadable);
	const note = bad.length
		? `\n\t\t<p class="note"><strong>${bad.length === 1 ? "One skill here does not load." : `${bad.length} skills here do not load.`}</strong> ${bad
				.map((s) => `<code>${esc(s.path)}/SKILL.md</code>`)
				.join(", ")} ${bad.length === 1 ? "has" : "have"} no <code>name</code> and no <code>description</code>, so ${
				bad.length === 1 ? "it never reaches" : "they never reach"
			} a session.</p>`
		: "";
	return `	<section class="cat">
		<div class="cathead">
			<h2>${esc(cat)}</h2>
			<span class="count">${skills.length} ${skills.length === 1 ? "folder" : "skills"}, ${t} typed</span>
			<span class="install">/plugin install ${esc(cat)}@skills</span>
		</div>
		<div class="grid">
${skills.map(card).join("\n")}
		</div>${note}
	</section>`;
};

const html = `<title>Pinto Skill Library</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Familjen+Grotesk:wght@400;500;600;700&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&family=JetBrains+Mono:wght@400;500;700&display=swap">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="Every skill in joaopinto15/skills, generated from the SKILL.md files.">

<style>
	:root {
		--bg: #E7EBEC;
		--surface: #F8FAFA;
		--surface-2: #DCE3E4;
		--ink: #101A1D;
		--ink-2: #4A5B5F;
		--ink-3: #6E8085;
		--rule: #C2CCCD;
		--accent: #0F525E;
		--stamp: #99401F;
		--warn: #7E5A0E;
		--on-stamp: #FBF6F3;

		--display: "Familjen Grotesk", "Helvetica Neue", Arial, sans-serif;
		--body: "Source Serif 4", Georgia, "Times New Roman", serif;
		--mono: "JetBrains Mono", ui-monospace, "SFMono-Regular", Consolas, monospace;
	}

	@media (prefers-color-scheme: dark) {
		:root:not([data-theme="light"]) {
			--bg: #0D1416;
			--surface: #162023;
			--surface-2: #1F2C30;
			--ink: #E9EEEF;
			--ink-2: #A3B4B8;
			--ink-3: #7B8D92;
			--rule: #2B3A3E;
			--accent: #6BC3CD;
			--stamp: #E4906A;
			--warn: #D9AA44;
			--on-stamp: #1A0F09;
		}
	}

	:root[data-theme="dark"] {
		--bg: #0D1416;
		--surface: #162023;
		--surface-2: #1F2C30;
		--ink: #E9EEEF;
		--ink-2: #A3B4B8;
		--ink-3: #7B8D92;
		--rule: #2B3A3E;
		--accent: #6BC3CD;
		--stamp: #E4906A;
		--warn: #D9AA44;
		--on-stamp: #1A0F09;
	}

	* { box-sizing: border-box; }

	body {
		margin: 0;
		background: var(--bg);
		color: var(--ink);
		font-family: var(--body);
		font-size: 16px;
		line-height: 1.55;
		-webkit-font-smoothing: antialiased;
	}

	.wrap {
		max-width: 1180px;
		margin: 0 auto;
		padding: clamp(24px, 5vw, 64px) clamp(16px, 4vw, 40px) 72px;
		display: flex;
		flex-direction: column;
		gap: clamp(32px, 5vw, 56px);
	}

	.masthead { display: flex; flex-direction: column; gap: 18px; }

	.eyebrow {
		font-family: var(--mono);
		font-size: 12px;
		letter-spacing: 0.09em;
		text-transform: uppercase;
		color: var(--ink-3);
		margin: 0;
	}

	h1 {
		font-family: var(--display);
		font-weight: 700;
		font-size: clamp(38px, 7vw, 66px);
		line-height: 1.02;
		letter-spacing: -0.02em;
		text-wrap: balance;
		margin: 0;
	}

	.lede { max-width: 62ch; font-size: 17px; color: var(--ink-2); margin: 0; }
	.lede code, .note code, .cardtext code { font-family: var(--mono); font-size: 0.86em; color: var(--ink); }

	.stats {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(148px, 1fr));
		gap: 1px;
		background: var(--rule);
		border: 1px solid var(--rule);
		margin-top: 6px;
	}
	.stat { background: var(--surface); padding: 14px 16px; display: flex; flex-direction: column; gap: 2px; }
	.stat b { font-family: var(--display); font-size: 30px; font-weight: 600; line-height: 1; font-variant-numeric: tabular-nums; }
	.stat span { font-family: var(--mono); font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink-3); }

	.legend { display: flex; flex-wrap: wrap; gap: 10px 20px; align-items: center; }
	.legend p { margin: 0; font-size: 14px; color: var(--ink-2); }

	.pill {
		font-family: var(--mono);
		font-size: 10.5px;
		font-weight: 500;
		letter-spacing: 0.07em;
		text-transform: uppercase;
		padding: 3px 8px;
		white-space: nowrap;
		border: 1px solid transparent;
	}
	.pill.typed { background: var(--stamp); color: var(--on-stamp); }
	.pill.auto { border-color: var(--accent); color: var(--accent); }
	.pill.stub { border-color: var(--warn); color: var(--warn); }

	figure { margin: 0; display: flex; flex-direction: column; gap: 12px; }
	.figbox { overflow-x: auto; background: var(--surface); border: 1px solid var(--rule); padding: 20px; }
	.figbox svg { display: block; min-width: 720px; max-width: 100%; height: auto; color: var(--ink-2); }
	figcaption { font-size: 14.5px; color: var(--ink-2); max-width: 74ch; }

	.dgm-box { fill: var(--surface-2); stroke: var(--rule); }
	.dgm-name { font-family: var(--mono); font-size: 12.5px; font-weight: 500; fill: var(--ink); }
	.dgm-sub { font-family: var(--body); font-size: 11.5px; fill: var(--ink-2); }
	.dgm-edge { font-family: var(--mono); font-size: 10.5px; letter-spacing: 0.04em; fill: var(--ink-3); }
	.dgm-line { fill: none; stroke: currentColor; stroke-width: 1.25; }

	.cat { display: flex; flex-direction: column; gap: 16px; }
	.cathead {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 8px 16px;
		padding-bottom: 10px;
		border-bottom: 2px solid var(--ink);
	}
	.cathead h2 { font-family: var(--display); font-size: 26px; font-weight: 600; letter-spacing: -0.01em; margin: 0; }
	.cathead .count { font-family: var(--mono); font-size: 12px; color: var(--ink-3); font-variant-numeric: tabular-nums; }
	.cathead .install { font-family: var(--mono); font-size: 12px; color: var(--ink-2); margin-left: auto; }

	.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(268px, 1fr)); gap: 14px; }

	.card {
		background: var(--surface);
		border: 1px solid var(--rule);
		padding: 14px 16px 12px;
		display: flex;
		flex-direction: column;
		gap: 9px;
	}
	.cardtop { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
	.cardname { font-family: var(--mono); font-size: 14px; font-weight: 700; letter-spacing: -0.01em; word-break: break-word; }
	.cardtext { margin: 0; font-size: 14.5px; color: var(--ink-2); }
	.cardpath {
		font-family: var(--mono);
		font-size: 10.5px;
		color: var(--ink-3);
		padding-top: 9px;
		border-top: 1px solid var(--rule);
		margin-top: auto;
		word-break: break-all;
	}

	.note {
		background: var(--surface);
		border: 1px solid var(--rule);
		border-left: 3px solid var(--warn);
		padding: 14px 16px;
		font-size: 14.5px;
		color: var(--ink-2);
		margin: 0;
	}
	.note strong { color: var(--ink); font-weight: 600; }

	footer { border-top: 1px solid var(--rule); padding-top: 18px; display: flex; flex-direction: column; gap: 10px; }
	footer p { margin: 0; font-size: 13.5px; color: var(--ink-3); }
	footer code { font-family: var(--mono); }
	a { color: var(--accent); }
	a:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
</style>

<div class="wrap">

	<header class="masthead">
		<p class="eyebrow">github.com/joaopinto15/skills</p>
		<h1>Pinto Skill Library</h1>
		<p class="lede">${total} skill folders in ${cats.length} categories. Each one holds a <code>SKILL.md</code>: frontmatter naming the skill, a description that decides when it fires, and the instructions the agent follows. This page is generated from those files, so it cannot drift from them.</p>

		<div class="stats">
			<div class="stat"><b>${total}</b><span>skill folders</span></div>
			<div class="stat"><b>${typed}</b><span>you type</span></div>
			<div class="stat"><b>${loadable - typed}</b><span>agent picks</span></div>
			<div class="stat"><b>${cats.length}</b><span>categories</span></div>${
				broken.length ? `\n\t\t\t<div class="stat"><b>${broken.length}</b><span>empty stub${broken.length === 1 ? "" : "s"}</span></div>` : ""
			}
		</div>

		<div class="legend">
			<span class="pill typed">typed</span>
			<p>Carries <code>disable-model-invocation: true</code>, so only <code>/name</code> starts it.</p>
		</div>
		<div class="legend">
			<span class="pill auto">agent</span>
			<p>No flag, so the agent may start it from the description alone.</p>
		</div>
	</header>

	<figure>
		<div class="figbox">
			<svg viewBox="0 0 920 300" role="img" aria-label="A skill travels from its SKILL.md file through either the setup.sh symlink or a plugin install into an agent session, where you can start it by typing its name, or the agent can start it from the description unless disable-model-invocation is set.">
				<defs>
					<marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
						<polygon points="0,1 10,5 0,9" fill="currentColor"></polygon>
					</marker>
				</defs>

				<polyline class="dgm-line" points="196,150 216,150 216,74 238,74" marker-end="url(#ah)"></polyline>
				<polyline class="dgm-line" points="196,150 216,150 216,226 238,226" marker-end="url(#ah)"></polyline>
				<polyline class="dgm-line" points="436,74 458,74 458,150 480,150" marker-end="url(#ah)"></polyline>
				<polyline class="dgm-line" points="436,226 458,226 458,150 480,150" marker-end="url(#ah)"></polyline>
				<polyline class="dgm-line" points="652,150 676,150 676,74 700,74" marker-end="url(#ah)" stroke="var(--stamp)" color="var(--stamp)"></polyline>
				<polyline class="dgm-line" points="652,150 676,150 676,226 700,226" marker-end="url(#ah)" stroke="var(--accent)" color="var(--accent)"></polyline>

				<rect class="dgm-box" x="14" y="118" width="182" height="64"></rect>
				<text class="dgm-name" x="28" y="144">SKILL.md</text>
				<text class="dgm-sub" x="28" y="164">name, description, body</text>

				<rect class="dgm-box" x="238" y="46" width="198" height="56"></rect>
				<text class="dgm-name" x="252" y="70">setup.sh</text>
				<text class="dgm-sub" x="252" y="89">symlink in ~/.claude/skills</text>

				<rect class="dgm-box" x="238" y="198" width="198" height="56"></rect>
				<text class="dgm-name" x="252" y="222">/plugin install</text>
				<text class="dgm-sub" x="252" y="241">one plugin per category</text>

				<rect class="dgm-box" x="480" y="118" width="172" height="64"></rect>
				<text class="dgm-name" x="494" y="144">agent session</text>
				<text class="dgm-sub" x="494" y="164">reads name, description</text>

				<rect class="dgm-box" x="700" y="46" width="206" height="56"></rect>
				<text class="dgm-name" x="714" y="70">you type /name</text>
				<text class="dgm-sub" x="714" y="89">all ${loadable} loadable skills</text>

				<rect class="dgm-box" x="700" y="198" width="206" height="56"></rect>
				<text class="dgm-name" x="714" y="222">agent picks it</text>
				<text class="dgm-sub" x="714" y="241">the ${loadable - typed} without the flag</text>

				<text class="dgm-edge" x="222" y="112">local clone</text>
				<text class="dgm-edge" x="222" y="192">marketplace</text>
				<text class="dgm-edge" x="464" y="112">loads</text>
				<text class="dgm-edge" x="464" y="192">loads</text>
				<text class="dgm-edge" x="682" y="112">always</text>
				<text class="dgm-edge" x="682" y="192">by description</text>
			</svg>
		</div>
		<figcaption>Two install routes, one loading step, two ways to start a skill. The lower right path is the one <code>disable-model-invocation: true</code> closes off, and that flag is what the pill on each card below records.</figcaption>
	</figure>

${cats.map(section).join("\n\n")}

	<footer>
		<p>Generated by <code>tools/build-catalog.mjs</code> from the <code>SKILL.md</code> frontmatter at commit <code>${esc(commitSha())}</code>. Each card shows the opening of the skill's description, with the trigger phrases trimmed off.</p>
		<p>Edit a skill, push, and the workflow in <code>.github/workflows/catalog.yml</code> rebuilds this page.</p>
	</footer>

</div>
`;

mkdirSync(join(ROOT, "docs"), { recursive: true });
writeFileSync(join(ROOT, "docs", "index.html"), html);
console.log(`docs/index.html: ${total} skills, ${typed} typed, ${loadable - typed} model-invocable, ${broken.length} not loadable`);
