---
title: My phone stopped using my DNS filter. It was iCloud Private Relay
date: 2026-09-09
tag: Root cause
summary: Ad blocking worked on every device except one iPhone, which sent no DNS queries at all. Packet captures on the VPN interface showed where the lookups were really going.
symptom: "Ad blocking stopped on one phone. The filter logged nothing."
cause: "iCloud Private Relay resolves names through Apple, so the filter was never asked."
---

## Setup

Every device I own reaches my server over a WireGuard mesh. The server runs a filtering DNS resolver and acts as the exit node, so a phone on mobile data gets the same ad and tracker blocking as a laptop at home.

## Symptom

One evening the phone started showing ads again. The resolver's query log had nothing from the phone. Not blocked queries, no queries.

## What the wire said

The phone's traffic was still arriving on the mesh interface and leaving through the exit tunnel, so routing was fine. A capture on the mesh interface filtered to the phone's address showed:

- zero packets to port 53
- TLS connections whose server name was `mask.icloud.com` and `apple-relay.cloudflare.com`
- regular fetches from `mask-api.icloud.com`

That is iCloud Private Relay. With it on, the phone resolves names over Oblivious DNS-over-HTTPS through Apple's relays and never asks the network's resolver. "Limit IP Address Tracking" does a version of the same thing per network. The filter was not failing. It was never asked.

## Fix, in layers

1. The resolver answers the Private Relay hostnames with NXDOMAIN. This is Apple's documented signal for networks that need to see DNS, and the phone falls back to normal resolution.
2. A blocklist for public DNS-over-HTTPS endpoints, so browsers with their own encrypted DNS fall back too.
3. Any port 53 traffic arriving on the mesh is redirected to the resolver, whatever address the client thought it was asking.

## The part that was not the server

After all that, the relay connections were being refused and the phone still made new connections with no visible lookups. The remaining cause was on the phone: the mesh app's "use these DNS settings" toggle had been switched off, so it was using the carrier's resolver directly. No server-side rule can fix a client that never sends you the question.

The blocking script, with a dry-run mode and a clean undo, is on GitHub: [private-relay-block](https://github.com/aaronsawit/private-relay-block).

## What I took from it

Absence of logs is data. "The filter is broken" and "the filter is not being consulted" look identical from the dashboard and completely different in a packet capture, so I captured before I changed anything.
