---
title: My AI agent described its tools and never used them
date: 2026-08-31
tag: Root cause
summary: A self-hosted AI agent kept announcing a plan, naming the tools it would call, and then doing nothing. The model was fine. Two layers above it were not.
symptom: "The agent says it will search the web, then does nothing."
cause: "A hidden text-only tool mode, plus tool definitions silently cut off by a context mismatch."
---

## Symptom

I run an open-source AI workspace on my home server, pointed at models served locally. Asked to look something up, the agent would reply with a confident plan, "I will use web_search to find...", and stop. No search, no error. Its own log summarised each round the same way:

```
Agent round 1 summary: 412 chars, 0 native calls, 0 tool blocks
```

## The theory I wasted time on

The obvious suspect was the model. Small local models are known to be shaky at tool calling, and this one had a thinking mode that could plausibly swallow the call. I changed models. I turned thinking off. Nothing changed, which should have told me sooner that I was debugging the wrong layer.

## Testing the layers instead

I stopped theorising and tested each layer on its own. I sent a minimal, hand-written tool-call request straight to the model server, skipping the workspace entirely:

- all seven installed models
- both API paths the server offers
- streaming and non-streaming

Every combination returned a correct structured tool call. The models could do it. Whatever was wrong sat between the workspace and the model.

## Cause one: a mode with no switch

For local model endpoints, the workspace deliberately defaults to a conservative text-based tool protocol, where the model is asked to write its call inside a fenced block, because some local models mishandle native tool schemas. My models were answering in the native format the app was not listening for. The setting that enables native calls exists in the API and has no control in the interface. One authenticated request to the endpoint's settings turned it on.

## Cause two: the definitions were being cut off

The workspace assumed the model had a 131,072-token context window, from a built-in lookup table. My model server was actually serving 16,384. The list of tool definitions is long, it goes at the front of the prompt, and the server silently truncated what did not fit. The model was being asked to use tools it had only partly been told about. Aligning the served context with what the app assumed fixed the rest.

A per-model setting baked into the model file overrides the server-wide one, which is why my first attempt at this fix appeared to do nothing.

## What I took from it

Two lessons, and the second is the expensive one.

Silent truncation is the worst kind of failure, because every component reports success. Nothing in any log said "I dropped half your prompt".

And when a system has layers, test the layers before building a theory. I spent three rounds on the model because it was the most interesting suspect. Ten minutes with a raw request would have cleared it on the first day.
