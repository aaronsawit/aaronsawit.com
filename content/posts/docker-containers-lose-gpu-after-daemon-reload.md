---
title: Docker containers silently lose the GPU after a systemd reload
date: 2026-09-07
tag: Root cause
summary: Every GPU container on my server lost its device access at the same moment and nothing logged an error. The trigger was an unrelated systemctl daemon-reload.
symptom: "Three GPU services died at the same minute and nothing logged an error."
cause: "A systemd reload wiped device rules Docker never knew about."
---

## Symptom

Video transcoding on my media server started failing with `FFmpeg exited with code 187`. The transcode log had the real message:

```
cu->cuInit(0) failed -> CUDA_ERROR_NO_DEVICE: no CUDA-capable device is detected
```

On the host, `nvidia-smi` showed both cards healthy. Inside the container it said `Failed to initialize NVML: Unknown Error`. The device nodes were still there. The photo library's machine-learning container and my LLM container had the same problem, and all three had been fine an hour earlier.

## What changed

Nothing about the containers. The only event in the journal at the right time was me installing a systemd timer for something unrelated, which runs `systemctl daemon-reload`.

## Cause

Docker on this machine uses the systemd cgroup driver on cgroup v2. When a container asks for a GPU, the NVIDIA container runtime adds the device permissions with a hook, behind systemd's back. systemd does not know about those rules. On a reload it re-applies the device policy it does know about for every scope, and the GPU permissions are gone. The process keeps its open file handles, so it fails only on the next CUDA initialisation. That is why it looks random.

## Fix

Tell Docker about the devices explicitly, so Docker registers them with systemd and they survive a reload:

```yaml
services:
  jellyfin:
    devices:
      - /dev/nvidia0:/dev/nvidia0
      - /dev/nvidia1:/dev/nvidia1
      - /dev/nvidiactl:/dev/nvidiactl
      - /dev/nvidia-uvm:/dev/nvidia-uvm
      - /dev/nvidia-uvm-tools:/dev/nvidia-uvm-tools
      - /dev/nvidia-modeset:/dev/nvidia-modeset
```

Recreate the container, then prove it:

```bash
docker exec jellyfin nvidia-smi -L     # lists the GPUs
sudo systemctl daemon-reload
docker exec jellyfin nvidia-smi -L     # still lists the GPUs
```

There is now a small read-only checker that lists which of your GPU containers would survive a reload, and prints the `devices:` block for your host: [docker-gpu-reload-check on GitHub](https://github.com/aaronsawit/docker-gpu-reload-check).

## What I took from it

The failing component and the cause were in different layers, and the only link between them was a timestamp. I now treat "what else happened at that minute" as the first question, and I test a fix by repeating the trigger, not by checking that the symptom went away.
