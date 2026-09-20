---
title: Cloudflare KV cannot enforce a rate limit, and how I found out
date: 2026-09-10
tag: Root cause
summary: A per-minute cap on an AI feature in a free tool for students let through far more requests than the cap. The counter was correct. The reads were a minute old.
symptom: "A per-minute request cap let through several times the cap."
cause: "KV reads are cached for a minute. A stale counter cannot enforce a window."
---

## Context

Versed Study has an "ask" feature backed by a language model. The tool is free, so the feature has a hard cap per visitor and per day. Without one, a single script could spend the month's budget in an afternoon.

## Symptom

The first version counted requests in Workers KV. In testing, a loop of requests sailed well past the per-minute limit before the first refusal.

## Cause

KV is an eventually consistent store built for read-heavy configuration. Reads are cached at each edge location for about sixty seconds. My worker wrote `count = 5`, and the next request, a second later and possibly in a different location, read a cached `count = 1`. A counter whose reads are up to a minute stale cannot enforce a one-minute window. It was never going to work, and the documentation does say so if you read it looking for that sentence.

## Fix

The counters moved to a Durable Object. A Durable Object is a single-threaded instance with its own storage, addressed by name, so every request for the same visitor reaches the same instance and sees the same number. Increment and check happen in one place with no race.

The same property is why every live quiz room in Versed Play is a Durable Object. Two players cannot buzz in "at the same time" from the room's point of view, so there is no tie-breaking logic to get wrong.

## A smaller one from the same week

A teacher reported that the quiz host screen was blank. It was blank only for people with an ad blocker. The page's body had a class called `has-ad` for the small sponsor strip, and the blocker's cosmetic filter hid everything matching it, which was the whole page. Nothing machine-readable in the project is called "ad" any more.

## What I took from it

Both bugs passed my own testing, because I tested the way I use the product. Now I test limits with a loop, not by clicking, and I check every public page with a blocker enabled.
