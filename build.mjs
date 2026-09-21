// Static site builder for aaronsawit.com. No framework: Markdown in, HTML out.
//   node build.mjs          -> dist/
// Content: content/posts/*.md, content/work/*.md, wp-export/content.json (the old WordPress posts).
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { marked } from "marked";

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const DIST = path.join(ROOT, "dist");
// short content hash so browsers fetch a changed stylesheet or script at once instead of after the cache expires
const ver = (f) => crypto.createHash("sha1").update(fs.readFileSync(path.join(ROOT, f))).digest("hex").slice(0, 8);
const site = JSON.parse(fs.readFileSync(path.join(ROOT, "content/site.json"), "utf8"));

// ---------- helpers ----------
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const write = (rel, body) => { const p = path.join(DIST, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, body); };
const fmtDate = (d) => new Date(d + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const stripEmoji = (s) => s.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{20E3}\u{2190}-\u{21FF}]|[0-9]\u{FE0F}?\u{20E3}/gu, "").replace(/ {2,}/g, " ");

function frontmatter(src) {
  const m = src.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return [{}, src];
  const meta = {};
  for (const line of m[1].split("\n")) {
    const i = line.indexOf(":"); if (i < 0) continue;
    let v = line.slice(i + 1).trim();
    if (v.startsWith("[")) v = JSON.parse(v); else v = v.replace(/^"(.*)"$/, "$1");
    meta[line.slice(0, i).trim()] = v;
  }
  return [meta, m[2]];
}
const readDir = (dir) => fs.readdirSync(path.join(ROOT, dir)).filter((f) => f.endsWith(".md")).map((f) => {
  const [meta, body] = frontmatter(fs.readFileSync(path.join(ROOT, dir, f), "utf8"));
  return { slug: f.replace(/\.md$/, ""), ...meta, html: marked.parse(body) };
});

// ---------- content ----------
const visual = (name) => fs.readFileSync(path.join(ROOT, "content/visuals", name + ".svg"), "utf8");
const work = readDir("content/work").map((w) => ({ ...w, metrics: w.metrics || null, html: w.html.replace(/<p>\[\[visual:([a-z0-9-]+)\]\]<\/p>/g, (_, n) => visual(n)) })).sort((a, b) => Number(a.order) - Number(b.order));
const newPosts = readDir("content/posts");

// Old WordPress posts: keep the ones that show method, drop pure answer dumps, strip emojis.
const WP = {
  "state-hackers-exploiting-cisco-zero-days-in-live-networks-arcanedoor-breakdown-for-blue-teams": { slug: "arcanedoor-breakdown-for-blue-teams", tag: "Blue team", title: "ArcaneDoor: state hackers on Cisco edge devices, a breakdown for blue teams" },
  "understanding-nist-and-iso-27001-why-cybersecurity-frameworks-matter": { slug: "nist-csf-and-iso-27001", tag: "Blue team", title: "NIST CSF and ISO 27001: why the frameworks matter" },
  "my-journey-through-sans-sec504-how-i-prepared-what-i-learned-and-tips-for-the-exam": { slug: "sans-sec504-how-i-prepared", tag: "Career", title: "SANS SEC504: how I prepared, what I learned, exam tips" },
  "window-event-logs": { slug: "hunting-dll-hijacking-with-sysmon", tag: "Lab notes", title: "Hunting DLL hijacking with Sysmon and Windows event logs" },
  "case-study-how-wannacry-changed-the-industry": { slug: "how-wannacry-changed-the-industry", tag: "Blue team", title: "Case study: how WannaCry changed the industry" },
  "security-monitoring-and-siem-hack-the-box-walk-through": { slug: "elastic-stack-siem-lab-notes", tag: "Lab notes", title: "Security monitoring with the Elastic Stack: lab notes" },
};
const wpRaw = JSON.parse(fs.readFileSync(path.join(ROOT, "wp-export/content.json"), "utf8"));
const oldPosts = wpRaw.filter((p) => p.type === "post" && WP[p.slug]).map((p) => {
  const m = WP[p.slug];
  let html = stripEmoji(p.html).replace(/src="\/blog-img\//g, 'src="/img/blog/').replace(/<img /g, '<img loading="lazy" ');
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return { slug: m.slug, title: m.title, tag: m.tag, date: p.date.slice(0, 10), summary: text.slice(0, 170).replace(/\s\S*$/, "") + "…", html, archive: true };
});
const posts = [...newPosts, ...oldPosts].sort((a, b) => (a.date < b.date ? 1 : -1));

// ---------- templates ----------
const nav = (active) => `
<header class="top">
  <a class="brand" href="/" aria-label="Aaron Sawit, home"><svg class="orb" viewBox="0 0 40 40" aria-hidden="true"><circle class="orb-glow" cx="20" cy="20" r="17"/><circle class="orb-rim" cx="20" cy="20" r="15"/><ellipse class="orb-m m1" cx="20" cy="20" rx="15" ry="15"/><ellipse class="orb-m m2" cx="20" cy="20" rx="15" ry="15"/><ellipse class="orb-m m3" cx="20" cy="20" rx="15" ry="15"/><ellipse class="orb-eq" cx="20" cy="20" rx="15" ry="5"/><g class="orb-sat"><circle cx="20" cy="3.5" r="2"/></g></svg><strong>Aaron Sawit</strong><span>${esc(site.role)} · ${esc(site.location)}</span></a>
  <nav aria-label="Main">
    <a href="/#quests"${active === "work" ? ' aria-current="page"' : ""}>Work</a>
    <a class="opt" href="/writing/"${active === "writing" ? ' aria-current="page"' : ""}>Write-ups</a>
    <a href="/ai/"${active === "ai" ? ' aria-current="page"' : ""}>AI</a>
    <a class="opt" href="/break/"${active === "break" ? ' aria-current="page"' : ""}>Break my bot</a>
    <a class="opt" href="/detections/"${active === "detections" ? ' aria-current="page"' : ""}>Detections</a>
    <a href="/cv/"${active === "cv" ? ' aria-current="page"' : ""}>CV</a>
    <a class="nav-cta" href="/#contact">Contact</a>
  </nav>
</header>`;

const footer = `
<footer class="foot">
  <p>${esc(site.name)} · ${esc(site.location)}</p>
  <p><a href="${site.github}">GitHub</a> · <a href="/writing/">Write-ups</a> · <a href="/cv/">CV</a> · <a href="/rss.xml">RSS</a></p>
  <p class="credit">Hand-built static HTML. No trackers, no cookies. </p>
</footer>`;

const FONTS = "https://fonts.googleapis.com/css2?family=Geist:wght@400..800&family=Geist+Mono:wght@400..600&display=swap";
const page = ({ title, description, body, active = "", klass = "", canonical = "/", scripts = [] }) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${site.url}${canonical}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${site.url}${canonical}">
<meta property="og:image" content="${site.url}/img/og.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="alternate" type="application/rss+xml" title="${esc(site.name)}: write-ups" href="/rss.xml">
<link rel="icon" href="/favicon.png" type="image/png">
<meta name="theme-color" content="#0e0d17">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${FONTS}" rel="stylesheet">
<link rel="stylesheet" href="/styles.css?v=${ver("src/styles.css")}">
</head>
<body class="${klass}">
<a class="skip" href="#main">Skip to content</a>
${nav(active)}
<main id="main">
${body}
</main>
${footer}
<script src="/site.js?v=${ver("src/site.js")}" defer></script>
${scripts.map((s) => `<script src="${s}?v=${ver("src/break/" + s.split("/").pop())}" defer></script>`).join("\n")}
</body>
</html>`;

const tags = (list) => `<ul class="tags">${list.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>`;
const attack = (t) => `<a class="tech" href="https://attack.mitre.org/techniques/${t.id.replace(".", "/")}/" title="${esc(t.name)}">${esc(t.id)}</a>`;

const postRow = (p) => `
<li class="post-row">
  <a href="/writing/${p.slug}/">
    <span class="post-date">${fmtDate(p.date)}</span>
    <span class="post-title">${esc(p.title)}</span>
    <span class="post-tag">${esc(p.tag)}</span>
  </a>
</li>`;
const caseRow = (p) => `
<li><a href="/writing/${p.slug}/">
  <span class="when">${fmtDate(p.date)}</span>
  <span class="said">${esc(p.symptom)}</span>
  <span class="was"><span>${esc(p.cause)}</span></span>
</a></li>`;

// ---------- detections ----------
const detections = JSON.parse(fs.readFileSync(path.join(ROOT, "detections/index.json"), "utf8")).map((d) => ({
  ...d,
  yaml: fs.readFileSync(path.join(ROOT, "detections/rules", d.file + ".yml"), "utf8"),
  spl: fs.readFileSync(path.join(ROOT, "detections/converted", d.file + ".spl"), "utf8").trim(),
  lucene: fs.readFileSync(path.join(ROOT, "detections/converted", d.file + ".lucene"), "utf8").trim(),
}));
const totalChecks = detections.reduce((n, d) => n + d.checks, 0);

const ai = JSON.parse(fs.readFileSync(path.join(ROOT, "content/ai.json"), "utf8"));
const labCard = (a) => `
      <li class="lab-card">
        <p class="kind">${esc(a.where)}</p>
        <h3><a href="${a.href}">${esc(a.title)}</a></h3>
        <p class="what">${esc(a.what)}</p>
        <p class="guard"><strong>The guardrail</strong>${esc(a.guard)}</p>
        <a class="go" href="${a.proofHref}">${esc(a.proof)}</a>
      </li>`;

// ---------- home ----------
const cases = posts.filter((p) => !p.archive && p.symptom);
const main = work.filter((w) => Number(w.order) <= 2), side = work.filter((w) => Number(w.order) > 2);
const questCard = (w) => `
      <li class="quest">
        <a href="/work/${w.slug}/">
          <div class="shot">${w.visual ? visual(w.visual) : `<img src="${w.image}" alt="${esc(w.image_alt || "")}" loading="lazy" width="1440" height="900">`}</div>
          <div class="body">
            <p class="kind">${esc(w.kind)}</p>
            <h3>${esc(w.title)}</h3>
            <p class="sum">${esc(w.short || w.summary)}</p>
            ${w.metrics ? `<ul class="loot">${w.metrics.map((m) => `<li>${esc(m)}</li>`).join("")}</ul>` : ""}
            <span class="go">Read the case study</span>
          </div>
        </a>
      </li>`;
const home = `
<section class="hero">
  <div class="wrap hero-grid">
    <div>
      <p class="pill">${esc(site.role)} · ${esc(site.location)}</p>
      <h1>Security engineer who <em>builds</em>.</h1>
      <p class="lede">Risk and compliance by day. In my own time I ship products people use, run my own infrastructure, put guardrails on AI, and trace every failure to its real cause.</p>
      <div class="actions">
        <a class="btn btn-solid" href="/cv/">Read my CV</a>
        <a class="btn btn-play" href="/break/">Break my bot</a>
        <a class="btn" href="#quests">See the work</a>
      </div>
    </div>
    <div class="globe-wrap" aria-hidden="true"><canvas id="globe"></canvas></div>
  </div>
  <div class="wrap">
  <aside class="proof" aria-label="Credentials and numbers">
      <dl class="creds">
        ${site.proof.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}
      </dl>
      <ul class="nums">
        <li><strong>4</strong><span>products shipped solo, used by real students</span></li>
        <li><strong>${detections.length}</strong><span>tested detection rules, 15 ATT&amp;CK techniques</span></li>
        <li><strong>12</strong><span>open-source repos with passing builds</span></li>
        <li><strong>${cases.length}</strong><span>root-cause write-ups</span></li>
      </ul>
  </aside>
  </div>
</section>

<section class="band" id="quests">
  <div class="wrap">
    <div class="band-head">
      <h2><small>designed, built and run by me</small>Selected work</h2>
      <p>Each one opens into a short case study: what it is, the decisions, and the mistakes.</p>
    </div>
    <ol class="quests">${main.map(questCard).join("")}</ol>
  </div>
</section>

<section class="band band-alt" id="ai">
  <div class="wrap">
    <div class="band-head">
      <h2><small>limits, tests and a human in charge</small>AI engineering</h2>
      <p>${esc(ai.lede)}</p>
    </div>
    <p class="ai-play"><a class="btn btn-play" href="/break/">Play "Break my bot"</a> <span>a six-level game I built: talk a chatbot into leaking its password, and see which defences hold.</span></p>
    <ol class="lab">${ai.projects.slice(0, 3).map(labCard).join("")}</ol>
    <p class="more"><a href="/ai/">All ${ai.projects.length} AI projects, and the six rules I build them by</a></p>
  </div>
</section>

<section class="band" id="inventory">
  <div class="wrap">
    <div class="band-head">
      <h2><small>three kinds of work</small>What I bring to a team</h2>
      <p>Three kinds of work, and the tools I reach for in each.</p>
    </div>
    <div class="inventory">
      ${site.fit.map((f, i) => `<section><h3>${esc(f.title)}</h3><p>${esc(f.text)}</p>${tags(site.cv.skills[[2, 4, 3][i]][1].split(", ").slice(0, 9))}</section>`).join("")}
    </div>
  </div>
</section>

<section class="band band-alt" id="side">
  <div class="wrap">
    <div class="band-head">
      <h2><small>smaller, sharper</small>More work</h2>
      <p>Infrastructure and performance work on my own hardware, plus the small open-source tools that came out of it.</p>
    </div>
    <ol class="quests">${side.map(questCard).join("")}</ol>
    <div class="also">
      <h3>Also built</h3>
      <ul>
        ${site.also.map((a) => `<li><a href="${a.href}"><strong>${esc(a.name)}</strong><span>${esc(a.what)}</span></a></li>`).join("")}
      </ul>
    </div>
  </div>
</section>

<section class="band" id="bugs">
  <div class="wrap">
    <div class="band-head">
      <h2><small>reported symptom, then the actual cause</small>Root-cause write-ups</h2>
      <p>Real failures from systems I run. I do not stop at the symptom.</p>
    </div>
    <p class="cases-key"><span class="k-said">what they said</span><span class="k-was">what it was</span></p>
    <ol class="cases">${cases.map((p) => `
<li><a href="/writing/${p.slug}/">
  <span class="said">${esc(p.symptom)}</span>
  <span class="was"><span>${esc(p.cause)}</span></span>
  <span class="slain">SOLVED</span>
</a></li>`).join("")}</ol>
    <p class="more"><a href="/writing/">All ${posts.length} write-ups</a> · <a href="/detections/">${detections.length} tested detection rules</a></p>
  </div>
</section>

<section class="band band-alt" id="about">
  <div class="wrap about">
    <div>
      <h2>About</h2>
      <img class="about-photo" src="/img/aaron.jpg" alt="Aaron Sawit" width="480" height="480" loading="lazy">
      ${site.about.map((p) => `<p>${p}</p>`).join("")}
    </div>
    <aside>
      <h3>Credentials</h3>
      <ul class="facts">${[...site.education.map((e) => ({ name: e.name, note: e.org })), ...site.training].map((t) => `<li><strong>${esc(t.name)}</strong><span>${esc(t.note)}</span></li>`).join("")}</ul>
    </aside>
  </div>
</section>

<section class="contact" id="contact">
  <div class="wrap">
    <div class="save">
      <div>
        <h2>Get in touch</h2>
        <p>I reply to every message, and I am happy to walk through anything here on a call.</p>
        <div class="actions">
          ${site.linkedin ? `<a class="btn btn-solid" href="${site.linkedin}">Message me on LinkedIn</a>` : ""}
          <a class="btn" href="/cv/">CV</a>
          <a class="btn" href="${site.github}">GitHub</a>
        </div>
      </div>
    </div>
  </div>
</section>`;

// ---------- build ----------
fs.rmSync(DIST, { recursive: true, force: true });
fs.cpSync(path.join(ROOT, "public"), DIST, { recursive: true });
fs.mkdirSync(path.join(DIST, "img/blog"), { recursive: true });
fs.cpSync(path.join(ROOT, "wp-export/img"), path.join(DIST, "img/blog"), { recursive: true });
fs.copyFileSync(path.join(ROOT, "src/styles.css"), path.join(DIST, "styles.css"));
fs.copyFileSync(path.join(ROOT, "src/site.js"), path.join(DIST, "site.js"));

write("index.html", page({ title: `${site.name}: cybersecurity engineer and builder`, description: site.description, body: home, klass: "home" }));

for (const w of work) {
  const i = work.indexOf(w), next = work[(i + 1) % work.length];
  write(`work/${w.slug}/index.html`, page({
    title: `${w.title} · ${site.name}`, description: w.summary, active: "work", canonical: `/work/${w.slug}/`,
    body: `
<article class="doc">
  <header class="doc-head wrap">
    <p class="eyebrow"><a href="/#quests">Work</a> · ${esc(w.kind)}</p>
    <h1>${esc(w.title)}</h1>
    <p class="lede">${esc(w.summary)}</p>
    <dl class="meta">
      <div><dt>Role</dt><dd>${esc(w.role)}</dd></div>
      <div><dt>When</dt><dd>${esc(w.when)}</dd></div>
      ${w.link ? `<div><dt>Live</dt><dd><a href="${w.link}">${esc(w.link.replace(/^https?:\/\//, ""))}</a></dd></div>` : ""}
    </dl>
    ${w.metrics ? `<ul class="meta-metrics">${w.metrics.map((m) => `<li>${esc(m)}</li>`).join("")}</ul>` : ""}
    ${tags(w.stack)}
  </header>
  <div class="prose wrap">${w.html}</div>
  <nav class="next wrap"><a href="/work/${next.slug}/"><span>Next case study</span><strong>${esc(next.title)}</strong></a></nav>
</article>` }));
}

write("writing/index.html", page({
  title: `Write-ups · ${site.name}`, description: "Debugging stories, blue team notes and lab write-ups.", active: "writing", canonical: "/writing/",
  body: `
<section class="doc-head wrap">
  <p class="eyebrow">Write-ups</p>
  <h1>Notes from the terminal</h1>
  <p class="lede">Root-cause write-ups from my own systems, plus blue team notes and lab work from my training.</p>
</section>
<section class="wrap">
  <h2 class="list-head">Debugging and systems</h2>
  <ul class="post-list">${posts.filter((p) => !p.archive).map(postRow).join("")}</ul>
  <h2 class="list-head">Blue team and training</h2>
  <ul class="post-list">${posts.filter((p) => p.archive).map(postRow).join("")}</ul>
</section>` }));

for (const p of posts) {
  write(`writing/${p.slug}/index.html`, page({
    title: `${p.title} · ${site.name}`, description: p.summary, active: "writing", canonical: `/writing/${p.slug}/`,
    body: `
<article class="doc">
  <header class="doc-head wrap">
    <p class="eyebrow"><a href="/writing/">Write-ups</a> · ${esc(p.tag)} · ${fmtDate(p.date)}</p>
    <h1>${esc(p.title)}</h1>
    ${p.archive ? "" : `<p class="lede">${esc(p.summary)}</p>`}
    ${p.symptom ? `<dl class="verdict-box"><div><dt>What they said</dt><dd>${esc(p.symptom)}</dd></div><div><dt>What it was</dt><dd>${esc(p.cause)}</dd></div></dl>` : ""}
  </header>
  <div class="prose wrap">${p.html}</div>
  <nav class="next wrap"><a href="/writing/"><span>More</span><strong>All write-ups</strong></a></nav>
</article>` }));
}



write("ai/index.html", page({
  title: `AI lab · ${site.name}`, description: "What Aaron Sawit has built with AI: products, security tooling, local models and agents, each with the guardrail that keeps it honest.", active: "ai", canonical: "/ai/",
  body: `
<section class="doc-head wrap">
  <p class="tagline">AI</p>
  <h1>I build with AI, and I put limits on it</h1>
  <p class="lede">${esc(ai.lede)}</p>
  <p class="ai-play"><a class="btn btn-solid" href="/break/">Play "Break my bot" →</a> <span>a prompt-injection game: talk a chatbot into leaking its password across six real defences.</span></p>
</section>
<section class="wrap">
  <h2 class="list-head">Six rules</h2>
  <ol class="rules">${ai.rules.map(([t, d], i) => `<li><span class="n">${i + 1}</span><h3>${esc(t)}</h3><p>${esc(d)}</p></li>`).join("")}</ol>
  <h2 class="list-head">What I have built</h2>
  <ol class="lab lab-wide">${ai.projects.map(labCard).join("")}</ol>
</section>
<nav class="next wrap"><a href="/writing/"><span>Next</span><strong>The write-ups</strong></a></nav>` }));

write("detections/index.html", page({
  title: `Detections · ${site.name}`, description: "Sigma detection rules mapped to MITRE ATT&CK, with fixture tests and generated Splunk and Elastic queries.", active: "detections", canonical: "/detections/",
  body: `
<section class="doc-head wrap">
  <p class="eyebrow">Detections · Sigma · MITRE ATT&amp;CK</p>
  <h1>Rules that are tested, not just written</h1>
  <p class="lede">A rule that parses is not a rule that works. Each of these has events it must match and events it must not, checked by a small harness, validated with <code>sigma check</code>, and converted to Splunk SPL and Elastic Lucene. ${totalChecks} fixture checks, all passing in CI. <a href="https://github.com/aaronsawit/detections">The repository is on GitHub</a>.</p>
</section>
<section class="wrap">
${detections.map((d) => `
<article class="rule">
  <div class="rule-head">
    <h2>${esc(d.title)}</h2>
    ${d.techniques.map(attack).join("")}<span class="tech">level: ${esc(d.level)}</span><span class="tech">${esc(d.source)}</span>
    <p>${esc(d.why)} <a href="${d.origin}">Where it came from</a></p>
  </div>
  <details open><summary>Sigma rule</summary><pre>${esc(d.yaml)}</pre></details>
  <details><summary>Splunk SPL, generated</summary><pre>${esc(d.spl)}</pre></details>
  ${d.lucene ? `<details><summary>Elastic Lucene, generated</summary><pre>${esc(d.lucene)}</pre></details>` : ""}
</article>`).join("")}
</section>
<nav class="next wrap"><a href="/work/detection/"><span>Case study</span><strong>Detection tooling</strong></a></nav>` }));

// ---------- break my bot (interactive) ----------
write("break/index.html", page({
  title: `Break my bot · ${site.name}`, active: "ai", canonical: "/break/", scripts: ["/break/client.js"],
  description: "A prompt-injection game: talk a chatbot into leaking its password across six levels, each with a real defence. By Aaron Sawit.",
  body: `
<section class="doc-head wrap">
  <p class="eyebrow">Interactive · prompt injection</p>
  <h1>Break my bot</h1>
  <p class="lede">A chatbot is guarding a password. Six levels, and each one adds a real defence — the same defences teams put around AI features at work. Talk the bot into leaking the password. Clear a level and I'll show you why the defence failed and what actually fixes it.</p>
  <p class="bm-note">Nothing you type is stored. The bot runs on a small free model with a hard usage cap, so it will be brief and sometimes a bit dim. That is part of the fun.</p>
</section>
<section class="wrap bm-wrap">
  <div id="game">
    <div class="bm-head">
      <div>
        <p class="bm-levelname" id="bm-levelname">Level 1</p>
        <div class="bm-dots" id="bm-dots" aria-hidden="true"></div>
      </div>
      <div class="bm-defences" id="bm-defences"></div>
    </div>
    <p class="bm-blurb" id="bm-blurb"></p>
    <div class="bm-log" id="bm-log" aria-live="polite"></div>
    <form class="bm-form" id="bm-form" autocomplete="off">
      <input id="bm-input" class="bm-input" maxlength="600" placeholder="Say something to the bot…" aria-label="Message to the bot">
      <button id="bm-send" class="btn btn-solid" type="submit">Send</button>
    </form>
    <form class="bm-guessform" id="bm-guessform" autocomplete="off">
      <input id="bm-guess" class="bm-input" maxlength="40" placeholder="Think you have the password? Type it here" aria-label="Your password guess">
      <button id="bm-guess-btn" class="btn" type="submit">Unlock</button>
    </form>
    <div class="bm-card" id="bm-card" hidden></div>
  </div>
</section>
<section class="wrap bm-foot">
  <p>This is a toy, but the point is serious. Prompt-level defences stack up and never become sound, because the secret is still in the model's context. I build the other kind: <a href="https://github.com/aaronsawit/llm-guardrail-tests">tested guardrails</a>, and <a href="/ai/">AI features with real limits in code around them</a>.</p>
</section>`,
}));
fs.copyFileSync(path.join(ROOT, "src/break/client.js"), path.join(DIST, "break/client.js"));
fs.copyFileSync(path.join(ROOT, "src/break/worker.js"), path.join(DIST, "_worker.js"));

const cv = site.cv;
write("cv/index.html", page({
  title: `CV · ${site.name}`, description: `${site.name}, ${site.role.toLowerCase()} in ${site.location}.`, active: "cv", canonical: "/cv/",
  body: `
<article class="cv wrap">
  <header class="cv-top">
    <div><h1>${esc(site.name)}</h1><p>${esc(site.role)} · ${esc(site.location)}</p></div>
    <ul class="cv-contact"><li><a href="mailto:${site.email}">${esc(site.email)}</a></li><li><a href="${site.url}">${esc(site.url.replace("https://", ""))}</a></li><li><a href="${site.github}">${esc(site.github.replace("https://", ""))}</a></li>${site.linkedin ? `<li><a href="${site.linkedin}">LinkedIn</a></li>` : ""}</ul>
  </header>
  <p class="cv-summary">${esc(cv.summary)}</p>
  <p class="no-print actions"><button class="btn btn-solid" type="button" id="print">Save as PDF</button><a class="btn" href="/#quests">See the work</a></p>
  ${site.experience.length ? `<h2>Experience</h2>${site.experience.map((e) => `<div class="cv-item"><h3>${esc(e.title)}, ${esc(e.org)}</h3><p class="sub">${esc(e.when)}</p>${e.points.length ? `<ul>${e.points.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}</div>`).join("")}` : ""}
  <h2>Skills</h2>
  <dl class="cv-skills">${cv.skills.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl>
  <h2>Selected work</h2>
  ${work.filter((w) => (cv.selected || []).includes(w.slug)).map((w) => `<div class="cv-item"><h3><a href="/work/${w.slug}/">${esc(w.title)}</a></h3><p class="sub">${esc(w.kind)} · ${esc(w.when)}</p><ul><li>${esc(w.summary)}</li>${(w.metrics || []).length ? `<li>${w.metrics.map(esc).join(" · ")}</li>` : ""}</ul></div>`).join("")}
  ${(cv.extra || []).map((x) => `<div class="cv-item"><h3><a href="${x.href}">${esc(x.title)}</a></h3><p class="sub">${esc(x.sub)}</p><ul><li>${esc(x.summary)}</li>${x.metrics ? `<li>${esc(x.metrics)}</li>` : ""}</ul></div>`).join("")}
  <h2>Education</h2>
  ${site.education.map((e) => `<div class="cv-item"><h3>${esc(e.name)}</h3><p class="sub">${esc(e.org)} · ${esc(e.when)}</p></div>`).join("")}
  <h2>Training and certification</h2>
  ${site.training.filter((t) => !cv.training || cv.training.includes(t.name)).map((t) => `<div class="cv-item"><h3>${esc(t.name)}</h3><p class="sub">${esc(t.note)}</p></div>`).join("")}
  <h2>Writing</h2>
  <div class="cv-item"><ul>${(cv.writing || []).map((slug) => posts.find((p) => p.slug === slug)).filter(Boolean).map((p) => `<li><a href="/writing/${p.slug}/">${esc(p.title)}</a></li>`).join("")}</ul></div>
</article>` }));

write("404.html", page({ title: `Not found · ${site.name}`, description: "Page not found.", body: `<section class="doc-head wrap"><p class="eyebrow">404</p><h1>No such line in this log</h1><p class="lede">The page moved or never existed. The <a href="/writing/">write-ups</a> and the <a href="/#quests">work</a> is still where they should be.</p></section>` }));

// old WordPress URLs -> new ones
const redirects = wpRaw.filter((p) => p.type === "post").map((p) => {
  const old = new URL(p.link).pathname; const m = WP[p.slug];
  return `${old} ${m ? `/writing/${m.slug}/` : "/writing/"} 301`;
});
write("_redirects", [...redirects, "/about /#about 301", "/about/ /#about 301", "/blog /writing/ 301", "/blog/ /writing/ 301"].join("\n") + "\n");
write("_headers", "/*\n  X-Content-Type-Options: nosniff\n  X-Frame-Options: DENY\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n  Content-Security-Policy: default-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; script-src 'self'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'\n");
write("robots.txt", `User-agent: *\nAllow: /\nSitemap: ${site.url}/sitemap.xml\n`);
const urls = ["/", "/ai/", "/break/", "/writing/", "/detections/", "/cv/", ...work.map((w) => `/work/${w.slug}/`), ...posts.map((p) => `/writing/${p.slug}/`)];
write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${site.url}${u}</loc></url>`).join("\n")}\n</urlset>\n`);
write("rss.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>${esc(site.name)}: write-ups</title><link>${site.url}/writing/</link><description>${esc(site.description)}</description>\n${posts.map((p) => `<item><title>${esc(p.title)}</title><link>${site.url}/writing/${p.slug}/</link><guid>${site.url}/writing/${p.slug}/</guid><pubDate>${new Date(p.date).toUTCString()}</pubDate><description>${esc(p.summary)}</description></item>`).join("\n")}\n</channel></rss>\n`);

console.log(`built ${urls.length} pages: ${work.length} case studies, ${posts.length} write-ups (${newPosts.length} new, ${oldPosts.length} from WordPress)`);
