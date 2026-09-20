---
order: 1
title: Versed
kind: Product suite, solo
summary: Four free learning tools for students, tutors and teachers, designed, built and run by one person on Cloudflare's edge. No sign-up to play, no tracking, no budget.
role: Everything: product, design, code, operations
when: 2026, ongoing
link: https://versedapps.com
image: /img/shots/study.jpg
image_alt: Versed Study home page showing a pixel-art cat cafe study room
stack: ["TypeScript", "Cloudflare Workers", "Durable Objects", "D1", "KV", "Pages Functions", "React Native / Expo", "Supabase", "PWA"]
short: Four free learning tools for students, tutors and teachers. I designed, coded and run all of it.
metrics: ["4 products live","0 accounts needed to play","1 person: design, code, ops"]
---

## Why it exists

I tutor special needs students on the side. The tools schools pay for are loud, full of upsells, and assume a child who can sit through a sign-up form. Mine could not. So I started building the tools I wanted to hand them, and kept them free, because the kids who need them most are the ones whose parents are already paying for everything else.

Versed is now four products behind one front door:

- **Versed Play**: live quizzes for a whole class. Buzz-in, typed answers, multiple choice, polls and word clouds. The host shares a code and nobody creates an account.
- **Versed Study**: quiet pixel-art rooms where you sit with other people while you work, with a shared pomodoro timer, a cork board, and a pet that wanders around.
- **Versed Teach**: a progress tracker for tutors, with real accounts because student data deserves them.
- **Versed Learn**: flashcards on web and mobile, installable as a PWA with offline reading.

<div class="shots">
<img src="/img/shots/play.jpg" alt="Versed Play landing page" loading="lazy" width="1440" height="900">
<img src="/img/shots/study.jpg" alt="Versed Study cat cafe room" loading="lazy" width="1440" height="900">
<img src="/img/shots/teach.jpg" alt="Versed Teach tracker" loading="lazy" width="1440" height="900">
<img src="/img/shots/versed.jpg" alt="Versed front page with four product doors" loading="lazy" width="1440" height="900">
</div>

## How it is built

Each live room in Play and Study is a **Durable Object**: one small, single-threaded process that owns the room's state and holds every player's WebSocket. That removes a whole class of race conditions, because two buzzes cannot arrive "at the same time" from the room's point of view. It also makes the cost model boring, which is what you want when the budget is zero.

Study shards its lobby at thirty people so rooms stay social, and moves the pets on the server so everybody sees the same cat in the same place.

Teach started as a local-only page with no backend. I reversed that decision once I thought about what it holds. It now has email and password accounts on Pages Functions and D1, **scrypt** password hashing, cookie sessions, and a privacy page a parent can actually read.

## Security decisions I would defend in an interview

- **No account unless the feature needs one.** Play and Study collect nothing, so there is nothing to breach. Teach has accounts because progress notes about a child must not live in one browser's local storage.
- **Rate limits live in a Durable Object, not KV.** Cloudflare KV reads are cached at the edge for about a minute, so a KV counter cannot enforce a per-minute cap. I found that out by testing it, then moved the counters. [The write-up is here](/writing/cloudflare-kv-cannot-rate-limit/).
- **No user photo uploads on public content.** Public quizzes pick images from licensed sources instead. A free tool used by children is the wrong place to run an image moderation experiment.
- **Anonymous chat is fenced.** Study's chat runs through a word filter with reports, and the public library has an admin hide switch.
- **Nothing machine-readable is called "ad".** An ad blocker hid an entire host screen because of one CSS class name. Small thing, real outage, now a rule.

## What it shows

I can take a product from a blank page to something strangers use, and I make the security and privacy calls as part of the design, not as a review at the end.
