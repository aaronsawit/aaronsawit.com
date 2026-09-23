---
order: 3
title: Local AI on 2017 hardware
kind: Performance engineering
summary: How I got a 35-billion-parameter model to 66 tokens a second on two GTX 1080 Tis: by measuring every assumption, including the ones in the documentation.
role: Builder and benchmarker
when: 2026
visual: llm-bench
stack: ["llama.cpp", "Ollama", "CUDA 12.8", "Docker", "Python", "GGUF quantisation"]
short: A 35-billion-parameter model made 44% faster on nine-year-old GPUs by measuring every assumption.
metrics: ["46 to 71 tokens a second","+44% on the same hardware","1 crash found before it shipped"]
---

## Making old GPUs useful

Two GTX 1080 Tis give 22 GB of VRAM and no tensor cores. Pascal runs FP16 at a small fraction of FP32 speed, so quantisation buys memory, not speed, and dense models crawl. The model that fits the hardware is a mixture-of-experts: 35 billion parameters on disk, about 3 billion active per token.

Out of the box it ran at 46 tokens a second. I wanted to know how much of that was the hardware and how much was defaults nobody had questioned.

[[visual:llm-bench]]

## The build problem came first

The server's operating system ships CUDA 13, and CUDA 13 dropped Pascal. Nothing compiled. I built llama.cpp inside a CUDA 12.8 container targeted at the card's exact architecture, and pointed it at the model files the other runtime had already downloaded, so there was no second 20 GB copy.

## What the benchmarks said

I changed one thing at a time and recorded decode speed both with an empty context and at full depth, because those two numbers disagree more than you would expect.

- **Flash attention is free on Pascal.** 71.4 tokens a second with it, 70.6 without. Always on.
- **A quantised KV cache is not free at depth.** It costs nothing when the cache is shallow and about 17 percent at 64K, because every token re-reads and dequantises the whole cache and there are no tensor cores to hide that.
- **Speculative decoding was a net loss.** Half the drafts were rejected and the draft model needed memory that did not exist. 43 tokens a second against 66 without it.
- **Raising the batch size was a free 52 percent on prompt processing.** A default, not a limit.

## The config that survives

The most useful finding was a failure. A 48K context loaded, processed a full prompt, and then crashed with a CUDA error partway through generating at full depth. It passed every check except the one that mattered. I now only ship a configuration that has completed a generation run at its full context length.

The production setup is 32K context, full-precision cache, flash attention on: 71 tokens a second empty and 60 at full depth. That is 44 percent faster than where it started, on the same hardware, with no loss of output quality.

## What it shows

I benchmark instead of guessing, I test at the boundary where things actually break, and I write down the negative results so nobody repeats them. The full method is in [the write-up](/writing/llama-cpp-vs-ollama-on-pascal/).
