---
title: Why xemu says "Please insert an Xbox disc" to a perfectly good image
date: 2026-09-06
tag: Root cause
summary: Disc images dumped from my own original Xbox games would not boot in the emulator. The images were fine. They were the wrong kind of fine.
symptom: "The emulator rejected every disc image I dumped."
cause: "Full dumps put the game partition at 0x18310000. The emulator reads 0x10000."
---

## Symptom

I dumped my old Xbox discs and pointed the xemu emulator at the ISO files. Every one of them gave the console's own error: "Please insert an Xbox disc". The files were not corrupt, and they were all exactly 7,825,162,240 bytes.

## Reading the bytes

That identical size was the clue. A full dump of an Xbox disc contains two things: a small standard DVD-Video partition that tells an ordinary DVD player "this is a game disc", followed by the real game partition in Microsoft's XDVDFS format. The game partition's magic string, `MICROSOFT*XBOX*MEDIA`, sits at offset `0x18310000` in a full dump.

xemu expects an image of the game partition only, where that string is at offset `0x10000`. Given a full dump it looks there, finds the DVD-Video data instead, and correctly reports that this is not an Xbox disc.

```bash
dd if=game.iso bs=65536 skip=6193 count=1 | grep -a 'MICROSOFT\*XBOX\*MEDIA'   # full dump
dd if=game.iso bs=65536 skip=1    count=1 | grep -a 'MICROSOFT\*XBOX\*MEDIA'   # game partition only
```

## Fix

`extract-xiso -r` rewrites a full dump as a game-partition image. It is not packaged for my distribution and the server has no compiler, so I built it in a throwaway container and copied the binary out.

## Making it not my problem again

My intake script now identifies every image by its magic bytes and size, not by its file extension. PlayStation 2 and Xbox images both arrive as `.iso` and have to go to different places. Full Xbox dumps are converted on the way in. Archives that contain a folder named `something.iso` are handled too, because one of mine did.

The identification part is now a small standalone tool with tests: [disc-image-id on GitHub](https://github.com/aaronsawit/disc-image-id).

## What I took from it

The error message was true. The disc really was not what the emulator considers an Xbox disc. When a tool rejects input that looks valid, I open the input in a hex viewer before I open the tool's issue tracker.
