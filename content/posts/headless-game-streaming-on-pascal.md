---
title: 1080p60 game streaming from a headless Pascal card
date: 2026-09-05
tag: Build log
summary: Streaming games from a server with no monitor attached, on a GPU that current software has stopped compiling for. Four separate problems, each with one specific cause.
symptom: "Game streams worked but looked soft and lagged."
cause: "The encoder was built without this GPU's kernels and silently fell back to the CPU."
---

The goal: play games on a server in a cupboard from any screen in the house, using Sunshine on the server and Moonlight on the clients. The GPU is a GTX 1080 Ti.

## 1. The encoder silently fell back to the CPU

Streams worked but were soft and laggy. Sunshine's log showed `cudaErrorNoKernelImageForDevice`. Every 2026 build of Sunshine compiles its CUDA colour-conversion kernel without Pascal's architecture, so the kernel cannot load, and Sunshine quietly uses software encoding. I pinned the last release that still includes Pascal kernels. The lesson is in the word "quietly": it never reported a failure, only a worse result.

## 2. The probe landed on the wrong GPU

The first card is usually full of language models. Sunshine probed that one, failed to allocate, and gave up. Setting `CUDA_VISIBLE_DEVICES` for the streaming session pins it to the second card, and a prep command unloads any model from that card when a game starts.

## 3. No monitor means no display

With nothing plugged in, the driver creates no screen. I generate a synthetic EDID, the small data block a monitor sends to describe itself, and tell the driver a monitor with that EDID is connected.

1440p at 60 Hz was then rejected. The driver treats that HDMI output as limited to a 165 MHz pixel clock and 1440p60 needs 241.5. Declaring the fake monitor on a DisplayPort output instead, with an explicit modeline, fixed it.

## 4. Emulators showed a black screen

PlayStation 2 emulation failed with "Failed to initialize GS". The cause was one layer down: `VK: Failed to find an acceptable present queue`. Vulkan cannot present to this headless display, and the emulator's automatic renderer chooses Vulkan. Forcing OpenGL in each emulator's config fixed all of them.

The working config files, the EDID generator and the systemd units are on GitHub: [headless-sunshine-nvidia](https://github.com/aaronsawit/headless-sunshine-nvidia).

## Result

1080p at 60 frames a second, hardware encoded, to a laptop, a phone and the living room TV. I chose 1080p over 1440p in the end, because the same card also transcodes video for the rest of the family.
