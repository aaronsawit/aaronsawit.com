---
order: 4
title: One box, forty services
kind: Infrastructure, self-hosted
summary: A recycled gaming PC running forty-odd containers for my family: photos, passwords, media, DNS filtering, game streaming and local AI. Reachable from anywhere, with no port open to the internet.
role: Architect, operator, on-call
when: 2026, ongoing
visual: homelab
stack: ["Ubuntu", "Docker Compose", "systemd", "Tailscale / WireGuard", "AdGuard Home", "NVENC", "iptables", "Uptime Kuma", "ntfy"]
short: A recycled gaming PC running my family's photos, passwords, media and AI, reachable from anywhere and exposed to no one.
metrics: ["40+ services","0 ports open to the internet","14 days of restorable backups"]
---

## The constraint is the point

The server is a 2017 gaming PC: two GTX 1080 Ti cards, 30 GB of RAM, a small SSD and two spinning disks. Pascal GPUs are old enough that current software has quietly stopped supporting them, so very little works the way the README says. That makes it a good teacher.

[[visual:homelab]]

## What runs on it

- **Everyday**: photo backup with on-GPU face and object search, a password manager, a media server with hardware transcoding, audiobooks, a recipe book, document scanning with OCR, offline Wikipedia.
- **Network**: DNS filtering for every device on the tailnet, a WireGuard mesh, and an exit node that routes my phone's traffic through a commercial VPN tunnel on the server.
- **Play**: 1080p60 game streaming from a headless display to any screen in the house, and an emulation library with an intake script that identifies disc images by their magic bytes and converts the formats the emulators refuse.
- **AI**: local LLMs split across both GPUs, with a script that evicts models from VRAM when a game starts.

## How it is run

Deployment is a set of numbered, idempotent phase scripts over Docker Compose, so the whole machine can be rebuilt from one folder and one secrets file. Backups run nightly with fourteen days of retention and include the database dumps, not only the config. Uptime checks push to my phone through a self-hosted notification server, and a disk alert fires before the disk is full, not after.

## The security posture

There is **no public entry point**. I ran a Cloudflare Tunnel for a while, then turned it off: a tunnel terminates TLS at someone else's edge, so they can read everything passing through it. That is fine for a blog and wrong for a password manager. Everything is now reachable only over WireGuard, end to end.

The local LLM API has no authentication, so it is bound where only the mesh can reach it. One hostname resolves to the LAN address at home and the mesh address elsewhere, so the same bookmark works everywhere and nothing ever falls back to a public route.

## Investigations that came out of it

Each of these started as "it just stopped working" and ended at one specific cause:

- [Containers silently lose the GPU after a systemd reload](/writing/docker-containers-lose-gpu-after-daemon-reload/)
- [My phone stopped using my DNS filter. It was iCloud Private Relay](/writing/iphone-bypassing-dns-filter-private-relay/)
- [1080p60 game streaming from a headless Pascal card](/writing/headless-game-streaming-on-pascal/)
- [Why xemu says "Please insert an Xbox disc"](/writing/xemu-please-insert-an-xbox-disc/)
- [Jellyfin, ffmpeg 7.1 and the HLS segment with no extension](/writing/jellyfin-ffmpeg-extension-picky/)

## What it shows

I run production-style operations on hardware that fights back: infrastructure as code, monitoring, backups I have restored from, and a threat model I can explain.
