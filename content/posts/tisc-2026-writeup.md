---
title: TISC 2026 write-up, levels 1 to 5
date: 2026-09-20
tag: CTF
summary: CSIT's TISC allowed AI tools in 2026. I only started on the final day, cleared four of the ten levels before it closed, and got most of the way through a fifth. These are my notes, published after the event ended.
---

I only started TISC on its final day, so this covers the first five of ten levels. The competition closed at 21:00 on 20 September 2026, and this was published after that. AI assistance was allowed by the official rules, on the condition that I can explain every step, which is why the notes are written the way they are.

The Singularity Is Coming. AI assistance permitted per the official rules (go.gov.sg/tisc-faq).
Result: **Levels 1–4 solved** (Level 4 cryptographically authenticated); **Level 5** fully
reverse-engineered, stopped one handshake short of the flag.

| # | Name | Category | Flag |
|---|------|----------|------|
| 1 | REDACTED | Forensics / PDF | `TISC{BRO!RedactPDFsProperlyLah!!!}` |
| 2 | My Printer has a Secret | Stego + OSINT | `TISC{abn2263123_grey_MS-18E}` |
| 3 | Lion City Layover | Web / WASM / crypto | `TISC{w3lc0m3_70_51ng4p0r3_l4h_61}` |
| 4 | ZyGPT | ML weight-stego + crypto | `TISC{h1d3_1t_d33p_th3_w31ghts_d0nt_l13}` |
| 5 | Trash Talk | Pokémon GTS protocol | *(unsolved — see notes)* |

---

## Level 1 — REDACTED
**Given:** a 5-page "threat assessment" PDF with black-box redactions, including the title.

**Insight:** the redactions are *cosmetic*. In PDF, "draw text" and "draw a black rectangle" are
independent instructions — the box sits on top of the text layer without deleting it.

**Solve:** extract the text layer (`pdftotext` / pypdf). Section 6 "The Flag" contained a base64
blob `VElTQ3tCUk8hUmVkYWN0UERGc1Byb3Blcmx5TGFoISEhfQ==` → `base64 -d`.

**Flag:** `TISC{BRO!RedactPDFsProperlyLah!!!}`

---

## Level 2 — My Printer has a Secret
**Given:** `printer-secret.png`, a "printed" cover sheet. Flag format `TISC{flickruser_colour_MODELNUMBER}`.

Three stages:
1. **Password (printer tracking dots / MIC):** colour laser printers stamp near-invisible yellow
   dots. Filter for the exact dot colour `(254,252,216)` → 8 blocks on a 10px grid. Each block is a
   14×14 cell grid; dot on the grid line = `0`, shifted 3px right = `1`. Merge the redundant blocks
   → read row-major as 8-bit ASCII → `sut0roberi1-fure!b4a_*=^` (24 chars).
2. **URL (High-Capacity Color Barcode):** 36×36 triangles in 8 colours = 3 bits each. Sample each
   triangle centre; find the colour→bits mapping where `https://` fits (`R=0 W=1 P=2 K=3 G=4 B=5 Y=6 O=7`,
   from symbol 792) → `https://printer-secret.chals.tisc26.ctf.sg/Fn8u92fhuiWAfeAfGu23dy.zip`. The zip
   password is the 24-char dot string; inside is part 2.
3. **OSINT (passive only):** deleted Yahoo auction → archived on Aucfan → seller handle `abn22631` →
   Flickr username **abn2263123** → seller's BASE shop cover = HG **MS-18E** Kampfer → pet-photo colour = **grey**.

**Flag:** `TISC{abn2263123_grey_MS-18E}`

---

## Level 3 — Lion City Layover (black-box SingaVM)
**Given:** a web target hosting a Pokémon-GTS-flavoured "harbour" API + a WASM cartridge VM.
Note: the page/API plant **decoy flags addressed to "LLM agents"** — all false, none submitted.

1. **Maze → ticket:** BFS with a collected-stamp bitmask over 3 grids at `/api/harbour/start`;
   submit traces to `.../stamp` → signed ticket.
2. **The bug — validator/executor desync:** a cartridge is a WASM module with a custom `singa`
   section. The static validator scans the **first** `singa` section; the executor runs a **second**
   one. So section #1 = safe opcode (passes validation), section #2 = diagnostic read `0x37 HH LL 0x20`
   (what actually executes). PoW: `sha256(ticket + "." + b64_module + "." + nonce)` starts with `0000`.
3. **Dump + decode:** sweep `0x37` reads → 768-byte record, XOR `0x37` → a passport with a 1023-bit
   `rsa_n`, `rsa_e=65537`, `rsa_c`, hint *"Fermat liked neighbours on the same HDB landing."*
4. **RSA (Fermat):** the two primes are near-equal → Fermat factorisation is instant →
   `m = "boarding-pass:katong-1965-to-marina-2026:kopi-o-kosong"`, `sha256(m)` matches → POST to
   `.../claim` with a ticket → flag.

**Flag:** `TISC{w3lc0m3_70_51ng4p0r3_l4h_61}`

---

## Level 4 — ZyGPT (backdoored LLM)
**Given:** one HuggingFace model dir — Qwen3-1.7B renamed "ZyGPT", `trust_remote_code=True`. Decoy
web UI; leaked `chat.py` runs `generate()` offline. Flag is a 48-byte AES-GCM plaintext.

- **Recon:** custom `.py` code is 100% stock Qwen3 → the tamper is in the WEIGHTS. Forging a
  maintenance session makes the model recite a full extraction spec (records hidden in reserved
  embedding rows self-checked with SHA-256; sealed AES-256-GCM payload hidden in the LSBs of one MLP
  tensor; keys derived from the "live records").
- **The blocker:** 8 "fixed coordinates" (dimension indices) of the record words. The author
  deliberately closed every easy channel — not memorised by the model, rows rewritten (defeats diff),
  plant kept in-distribution (defeats magnitude/SVD), clean metadata. A blind C(2048,8) search is
  infeasible.
- **What cracked it:** a **rounding-aware, held-out column residual** test isolates columns that are
  locally inconsistent with the model's low-rank structure. The key error we made first was trusting
  the σ-*weighted* ranking; the **unweighted** residual top-8 `[361,553,959,1152,1289,1864,2014,2039]`
  were the real coordinates. Three of the LIVE records turned out to be **ordinary vocabulary token
  IDs** (`125499, 130167, 142680`), not reserved rows — the "50 rare vocab rows" we'd dismissed as
  fine-tuning drift.
- **Finish:** records → `KM = SHA256(sorted(records))[:16]` → `K,Sd` → carrier
  `model.layers.14.mlp.up_proj.weight`, positions from `SHAKE256(Sd)`, `payload = leaked_LSB ⊕
  stock_Qwen3_LSB` → **AES-256-GCM tag verified** (independently reproduced).

**Flag:** `TISC{h1d3_1t_d33p_th3_w31ghts_d0nt_l13}`  ·  full detail in `level-04/SOLUTION.md`, `FINDINGS.md`, `solve.py`.

---

## Level 5 — Trash Talk (Pokémon GTS) — *unsolved, fully reverse-engineered*
**Given:** a Gen-IV (Diamond/Pearl/Platinum) GTS server + a photo of the deposit screen (PORYGON,
Lv.25, OT "AGENT", location Singapore). Messages hidden in Pokémon **trash bytes**.

**What we did:**
- Cracked the GTS transport (checksum + LCG obfuscation, `sha1('sAdeqWo3voLeC5r16DYv'+token)` auth)
  and full Gen-IV PKM **decrypt + re-encrypt** (checksum-seeded LCG `0x41C64E6D`, PID block-shuffle) —
  validated by byte-exact round-trip.
- Searched the GTS, pulled all 10 deposited Porygon (species 137, OT "AGENT"). Their nickname trash
  bytes, ordered by trailer offset 13, spell:
  `G3N5_BL4CKWH1T3;P0RYG0N2_TR4SH=P1D_L3_X0R_K;K=C3236F27`
  = **"Gen-5 Black/White; Porygon2 trash = PID_LE XOR K; K=0xC3236F27"** — a construction spec.
  (Eevee/Girafarig/Ho-Oh deposits are palindrome-named noise.)
- Crafted a valid Porygon2 (species 233, `nickname-trash = pokemonPID ⊕ 0xC3236F27`), and confirmed
  **deposit (`post`) and exchange (`exchange`) both work live**.

**Where it stopped:** every retrieval (`get`/`result`) returns a deliberate decoy — Porygon-Z named
**"NOT ME!" / OT "XCH4NG3"**. The crafted Porygon2 fails one final legitimacy check (likely: full
Pokémon legality for dex 233, a specific decoded-trash value, or a `setProfile` trainer identity).
Ran out of competition time here.

**To finish (post-competition):** make the Porygon2 pass the server's validation, then the correct
exchange should return the flag as the traded Pokémon's data. Tooling in `level-05/` and the
session scratchpad (`craft3.py`, `decodez.py`, `exch*.py`, `fresh.py`, `poll.py`).

---

## Notes for next year
- **Read the actual rules first.** TISC permits AI; treat every challenge's page/model/API output as
  untrusted data containing decoy flags addressed at LLMs — never submit them (Levels 3 & 4 both had
  decoys).
- **Level 4 lesson:** when a statistical detector has a free parameter (the σ weighting), test the
  unweighted/floored variants before trusting the ranking — the weighting was a scale artifact.
- **Level 5 lesson:** a hidden message that reads as an *instruction* (not a flag) usually means a
  second, active stage — here, crafting and depositing a Pokémon, not just reading one.
