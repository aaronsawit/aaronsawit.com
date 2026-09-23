---
order: 2
title: Detection tooling
kind: Blue team, Python
summary: Small, tested tools from my blue team practice: a log triage pipeline that pairs rule-based detection with an LLM classifier, a phishing link checker, and Snort and iptables rules I wrote by hand.
role: Author
when: 2024 to 2025
link: https://github.com/aaronsawit
visual: detection
stack: ["Python", "pytest", "RFC 5424 syslog", "IOC matching", "GeoIP", "Snort", "iptables", "OpenPhish / URLhaus"]
short: A log triage pipeline, a phishing link checker and tested Sigma rules, all public with passing builds.
metrics: ["10 Sigma rules across 15 ATT&CK techniques, green in CI","12 public repositories with passing builds"]
---

## Log triage: rules first, model second

`blue-team-ai` reads RFC 5424 syslog and runs each record through four stages.

[[visual:detection]]

1. **Parse.** Every field is extracted into a structured record. Unsupported formats raise a named exception instead of producing half a record.
2. **Detect.** Deterministic rules run first: SSH brute force by source and window, suspicious cron entries, and indicator matches for IPs, domains, URLs and file hashes against a threat feed.
3. **Enrich.** GeoIP attribution for the source address, plus the matched indicator's context.
4. **Classify.** A language model labels the record malicious, anomalous or normal with a confidence score. It is given the rule hits as context and is held to a fixed output format at temperature zero.

The order is deliberate. Rules are cheap, explainable and do not hallucinate, so they decide what is certain. The model only has a vote on what the rules could not settle, and its answer is parsed strictly: anything that does not match the expected format is discarded, not guessed at. 36 tests cover every stage and run offline, with the model client faked.

## Phishing link analyser

A command-line tool that takes a URL and answers one question: should I click this. It checks live feeds from OpenPhish and URLhaus, detects lookalike brand domains and character substitution such as `micros0ft`, and flags URL patterns common in phishing kits. It checks every token of the hostname, so `micros0ft-login.example.com` is caught and `login.microsoft.com` is not. It returns exit codes so it can sit in a mail pipeline, and it still works from its local heuristics when the feeds are unreachable.

## Rules written by hand

- **Snort rules and an iptables baseline** from 2024, when I was first learning network detection and host firewalls. They are simple and I have left them up as they were. The default-deny approach is the one that now runs on my own server, where policy routing and a fail-closed default keep VPN traffic from leaking when the tunnel drops.

## What it shows

I write detection logic that a colleague can read and test, I use a model where it adds signal and nowhere else, and I design for the failure case: the feed that is down, the log line that does not parse, the tunnel that drops.
