---
title: llama.cpp against Ollama on two GTX 1080 Tis, measured
date: 2026-08-30
tag: Benchmarks
summary: A 44 percent speed-up on nine-year-old GPUs from changing the runtime and four settings, plus the settings that made things worse and the context length that passed every check and then crashed.
symptom: "A 35B model ran at 46 tokens a second. Was that the hardware?"
cause: "No. Runtime and four defaults. 71 tokens a second on the same cards."
---

## Hardware

Two GTX 1080 Ti cards, 22 GB of VRAM between them, Pascal architecture. No tensor cores, and FP16 runs at a fraction of FP32 speed, so every quantisation level decodes at about the same rate. On this hardware quantisation buys memory, not speed.

The model is a 35-billion-parameter mixture-of-experts with roughly 3 billion parameters active per token. Dense models of similar quality are several times slower here.

## Building it at all

The operating system ships CUDA 13, which dropped Pascal. I built llama.cpp in a CUDA 12.8 container with the architecture pinned, and had it read the model blobs Ollama had already downloaded.

## Method

One change per run. Every configuration was measured twice: decode speed with an empty context, and decode speed at full context depth. Prompt processing was measured on a 6,000-token prompt, because a 24-token prompt reports a number that is all fixed overhead.

## Results

| Configuration | Empty | Full depth |
|---|---|---|
| Ollama defaults, 64K | 46 t/s | 46 t/s |
| llama.cpp, quantised KV cache, 64K | 66 t/s | 42 t/s |
| llama.cpp, FP16 cache, two expert layers on CPU, 64K | 65 t/s | 49 t/s |
| llama.cpp, FP16 cache, 32K | 71 t/s | 60 t/s |
| Same, with speculative decoding | 43 t/s | n/a |

- Flash attention costs nothing on Pascal. Always on.
- A quantised KV cache is free when shallow and costs about 17 percent at 64K. Every token re-reads and dequantises the whole cache.
- Speculative decoding lost. Half the drafts were rejected and the draft model needed memory that was not there.
- Raising the batch size from the default took prompt processing from 592 to about 900 tokens a second.

## The trap

A 48K context loaded, processed a full prompt, and crashed with a CUDA error partway through generating at full depth. 56K failed at load, which is an honest failure. 48K was the dangerous one, because it passes every test people normally run. I only ship a configuration after a generation run at its full context length.

## What I run

32K context, FP16 cache, flash attention, one parallel slot, context shifting enabled because it is off by default. 71 tokens a second empty and 60 at full depth, against 46 before.
