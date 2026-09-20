---
title: Jellyfin, ffmpeg 7.1 and the HLS segment with no extension
date: 2026-09-08
tag: Root cause
summary: Some live TV channels played in every other player and died in Jellyfin with a fatal player error. ffmpeg was refusing video segments because their URLs did not end in .ts.
symptom: "One TV channel played everywhere except my media server."
cause: "ffmpeg 7.1 refuses video segments whose URL has no file extension."
---

## Symptom

A free-to-air channel played in a browser and in VLC. In Jellyfin it failed with "Playback failed due to a fatal player error". The server log said `FFmpeg exited with code 8` and `Error probing live tv stream`.

## Finding the line

The playlist itself downloaded fine with `curl`, so the stream was up. The transcode log had one line that mattered:

```
[hls] URL https://.../stream-segment/6a288d...?d=I_53lLg... is not in allowed_segment_extensions
```

An HLS playlist is a text file listing short video segments. Most hosts name them `segment-655.ts`. This one served them from a path with no file extension. ffmpeg 7.1 added a safety check, `extension_picky`, that only fetches segments whose names end in a known media extension. It read the playlist, refused every segment, and exited.

## The catch

ffmpeg has a switch for this. Jellyfin builds the ffmpeg command itself and has no field for extra input options. It also refuses a custom encoder path from its settings page when the container sets `JELLYFIN_FFMPEG`, which the official image does. The API answers `500 Unable to update encoder app path`.

## Fix

A twelve-line wrapper that Jellyfin calls instead of ffmpeg. It walks the arguments, and in front of every `-i http...` input it inserts the two options, then hands everything to the real binary in the original order:

```sh
#!/bin/sh
real=/usr/lib/jellyfin-ffmpeg/ffmpeg
n=$#; i=0
while [ $i -lt $n ]; do
  a=$1; shift; i=$((i+1))
  if [ "$a" = "-i" ]; then case "$1" in http*)
    set -- "$@" -extension_picky 0 -allowed_extensions ALL ;; esac; fi
  set -- "$@" "$a"
done
exec "$real" "$@"
```

A copy named `ffprobe` sits beside it, because Jellyfin derives the probe path from the same directory and the probe fails the same way. The compose file points `JELLYFIN_FFMPEG` at the wrapper.

My first version of the wrapper reordered the arguments. I caught it because I tested the wrapper by making it print its final argument list before I let it run anything.

## Scope

The check exists for a reason, so the wrapper relaxes it only for network inputs on a server whose stream sources I choose. Local files are untouched.
