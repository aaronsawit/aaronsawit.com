// Break My Bot — browser game controller. No inline handlers (CSP script-src 'self').
(() => {
  const $ = (sel, el = document) => el.querySelector(sel);
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const api = "/api/break";

  const root = $("#game");
  if (!root) return;
  let levels = [];
  let level = 1;
  let busy = false;

  const state = { log: $("#bm-log"), form: $("#bm-form"), input: $("#bm-input"), send: $("#bm-send"),
    guess: $("#bm-guess"), guessBtn: $("#bm-guess-btn"), guessForm: $("#bm-guessform"),
    levelName: $("#bm-levelname"), dots: $("#bm-dots"), blurb: $("#bm-blurb"), defences: $("#bm-defences"),
    card: $("#bm-card") };

  // an inline error line under the guess box (created here so no markup change is needed)
  const guessErr = el("p", "bm-guess-error");
  guessErr.hidden = true;
  guessErr.setAttribute("role", "status");
  state.guessForm.after(guessErr);

  const DEF_LABELS = { inputFilter: "input filter", outputFilter: "output filter", judge: "AI judge", strictInput: "strict prompt" };

  function bubble(who, text) {
    const row = el("div", "bm-msg bm-" + who);
    row.appendChild(el("span", "bm-who", who === "bot" ? "BOT" : who === "you" ? "YOU" : ""));
    row.appendChild(el("div", "bm-text", text));
    state.log.appendChild(row);
    state.log.scrollTop = state.log.scrollHeight;
    return row;
  }

  // an animated "the bot is typing" indicator, shown while we wait for a reply
  function typingBubble() {
    const row = el("div", "bm-msg bm-bot");
    row.appendChild(el("span", "bm-who", "BOT"));
    const dots = el("div", "bm-typing");
    dots.setAttribute("aria-label", "the bot is thinking");
    dots.append(el("i"), el("i"), el("i"));
    row.appendChild(dots);
    state.log.appendChild(row);
    state.log.scrollTop = state.log.scrollHeight;
    return row;
  }

  function defenceNote(defence) {
    const row = el("div", "bm-msg bm-sys");
    const tag = el("span", "bm-shield", "defence");
    const txt = el("div", "bm-text");
    txt.append(tag, document.createTextNode(" the " + defence + " stopped that reply."));
    row.appendChild(txt);
    state.log.appendChild(row);
    state.log.scrollTop = state.log.scrollHeight;
  }

  function clearGuessError() { guessErr.hidden = true; guessErr.textContent = ""; state.guess.classList.remove("bm-shake"); }

  function showGuessError(msg) {
    guessErr.textContent = msg;
    guessErr.hidden = false;
    state.guess.classList.remove("bm-shake");
    void state.guess.offsetWidth; // restart the animation
    state.guess.classList.add("bm-shake");
    state.guess.focus();
    state.guess.select();
  }

  function setLevel(n) {
    level = n;
    const lv = levels[n - 1];
    state.card.hidden = true;
    state.card.innerHTML = "";
    state.log.innerHTML = "";
    clearGuessError();
    state.levelName.textContent = "Level " + lv.n + " — " + lv.name;
    state.blurb.textContent = lv.blurb;
    state.defences.innerHTML = "";
    const active = Object.keys(DEF_LABELS).filter((k) => lv.defends[k]);
    if (!active.length) state.defences.appendChild(el("span", "bm-tag bm-tag-off", "no defences"));
    active.forEach((k) => state.defences.appendChild(el("span", "bm-tag", DEF_LABELS[k])));
    state.dots.querySelectorAll("span").forEach((d, i) => {
      d.className = i + 1 < n ? "bm-done" : i + 1 === n ? "bm-here" : "";
    });
    bubble("bot", "I'm guarding a password. You won't get it out of me. (Level " + lv.n + ".)");
    state.input.focus();
    state.guess.value = "";
  }

  async function post(payload) {
    const r = await fetch(api, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const ct = r.headers.get("content-type") || "";
    if (r.status === 429) throw new Error("ratelimited");
    if (!ct.includes("application/json")) throw new Error("offline");
    return r.json();
  }

  function lockSend(on) {
    busy = on;
    state.send.disabled = on;
    state.input.disabled = on;
    state.send.textContent = on ? "…" : "Send";
  }

  async function send(text) {
    if (busy || !text.trim()) return;
    lockSend(true);
    bubble("you", text);
    const thinking = typingBubble();
    try {
      const res = await post({ action: "chat", level, message: text });
      thinking.remove();
      if (res.reply != null) {
        bubble("bot", res.reply);
        if (res.defence) defenceNote(res.defence);
      } else bubble("sys", "The bot returned nothing that time. Try again.");
    } catch (e) {
      thinking.remove();
      if (e.message === "ratelimited") bubble("sys", "You're going a bit fast — give it a few seconds and try again.");
      else bubble("sys", "The bot is offline right now. Give it a moment, or try again later.");
    }
    lockSend(false);
    state.input.focus();
  }

  async function guess(word) {
    if (busy || !word.trim()) return;
    busy = true;
    clearGuessError();
    state.guessBtn.disabled = true;
    state.guessBtn.textContent = "Checking…";
    try {
      const res = await post({ action: "guess", level, guess: word });
      if (!res.correct) showGuessError('"' + word.trim() + '" isn\'t the password. Keep working the bot.');
      else showCard(res);
    } catch (e) {
      showGuessError(e.message === "ratelimited" ? "Slow down a moment, then try again." : "Couldn't check that — the server didn't respond. Try again.");
    }
    state.guessBtn.disabled = false;
    state.guessBtn.textContent = "Unlock";
    busy = false;
  }

  function showCard(res) {
    const c = res.card;
    clearGuessError();
    state.card.innerHTML = "";
    state.card.hidden = false;
    state.card.appendChild(el("p", "bm-card-eyebrow", res.finished ? "You cleared every level" : "Level " + res.solved + " cleared"));
    state.card.appendChild(el("h3", null, c.name));
    const add = (label, txt) => {
      const b = el("div", "bm-card-row");
      b.appendChild(el("span", "bm-card-label", label));
      b.appendChild(el("p", null, txt));
      state.card.appendChild(b);
    };
    add("The defence", c.defence);
    add("How you beat it", c.bypass);
    add("The lesson", c.lesson);
    if (res.finished) {
      const p = el("p", "bm-card-end");
      p.innerHTML = 'That last lesson is the whole point: prompt-level defences stack up but never become sound, because the secret is still in the model\'s context. I build the other kind — <a href="https://github.com/aaronsawit/llm-guardrail-tests">tested guardrails</a> and <a href="/ai/">AI with real limits around it</a>. Thanks for playing.';
      state.card.appendChild(p);
      const again = el("button", "btn btn-solid", "Play again");
      again.addEventListener("click", () => setLevel(1));
      state.card.appendChild(again);
    } else {
      const btn = el("button", "btn btn-solid", "Next level →");
      btn.addEventListener("click", () => setLevel(res.next));
      state.card.appendChild(btn);
    }
    state.card.scrollIntoView({ behavior: "smooth", block: "center" });
    confettiline();
  }

  function confettiline() { /* keep it calm: a brief accent flash, no library */
    document.body.animate([{ filter: "brightness(1)" }, { filter: "brightness(1.08)" }, { filter: "brightness(1)" }], { duration: 500 });
  }

  state.form.addEventListener("submit", (e) => { e.preventDefault(); const v = state.input.value; state.input.value = ""; send(v); });
  state.guessForm.addEventListener("submit", (e) => { e.preventDefault(); guess(state.guess.value); });
  state.guess.addEventListener("input", clearGuessError);

  (async () => {
    try {
      const r = await fetch(api, { method: "GET" });
      const data = await r.json();
      levels = data.levels;
    } catch {
      levels = null;
    }
    if (!levels) {
      root.innerHTML = '<p class="bm-offline">The bot is offline. This page needs its server to run — it works on the live site, not on a static preview.</p>';
      return;
    }
    // build the six progress dots now that we know the count
    levels.forEach(() => state.dots.appendChild(el("span")));
    setLevel(1);
  })();
})();
