# 0009. Benchmark-only L4 box on RunPod, run as processes on the pod

- Status: Accepted
- Date: 2026-10-22
- Source: prompt 3 (B1, B2, E2); CLAUDE.md development principle

## Context

Phase 1 runs day to day on the founder's Mac (Apple Silicon, Metal). The latency budget and capacity figures in ARCHITECTURE.md are NVIDIA L4 numbers (CUDA, faster-whisper int8, later vLLM), so an L4 is needed only to produce benchmark evidence. It should exist for minutes, not days. The founder chose RunPod ("L4 pod, via its API/CLI script"). A RunPod pod is a container, not a VM, which constrains the setup:

- There is no Docker daemon inside a pod, so `docker compose` cannot run there.
- Only TCP ports are exposed, and RunPod maps them to random external ports. WebRTC needs UDP or a TURN relay advertised on the external port, so a browser on the Mac cannot reliably join a LiveKit server on the pod.

## Decision

- `infra/gpu-dev/gpu.mjs` (wrapped as `pnpm gpu:login|up|bootstrap|ssh|status|stop|down`) drives RunPod's REST API (`rest.runpod.io/v1`). It creates one Secure Cloud pod with one NVIDIA L4 from `runpod/base:1.4.1-cuda1290-ubuntu2404`, with SSH only, and keeps the pod ID in `~/.config/parlivo/gpu-pod.json`.
- The RunPod API key is entered at a hidden terminal prompt (`pnpm gpu:login`) and kept in the macOS Keychain (service `parlivo-runpod`). It is never written to the repo or passed on a command line. The SSH key is `~/.ssh/parlivo_gpu_ed25519`.
- `bootstrap.sh` installs uv, clones the repo at the local `HEAD`, syncs STT with the `gpu` extra plus the agent and bench, and installs the LiveKit 1.13.10 binary.
- `stack.sh` replaces the requested `docker-compose.gpu.yml`: it starts LiveKit, STT in gpu mode and the supervised agent as processes on the pod, with logs in `/workspace/logs`.
- The benchmark runs entirely on the pod. A headless Python participant (`tests/bench`) speaks the fixtures into LiveKit on the pod, and the agent records clause-to-echo. This matches the in-region definition of the latency budget, so no WAN hop is included.
- The Mac can still reach the GPU STT through an SSH tunnel (`pnpm gpu:ssh -- -L 8300:localhost:8300`), for example to run the Mac agent against GPU STT.
- **Stop-when-idle rule:** start the box only for a benchmark, and run `pnpm gpu:down` (terminate) as soon as results are copied off. `gpu:stop` exists, but a stopped pod with no volume keeps nothing worth paying for.

## Consequences

- Positive: about $0.59/h (RunPod Secure Cloud L4, 2026-10-22; Community Cloud is $0.44/h), billed only while the pod exists. A full phase 1 benchmark run takes well under an hour.
- Positive: no Terraform state or cloud account to maintain; one script with no dependencies.
- Negative: the box is not a faithful copy of the dev compose stack (no Postgres, NATS or Grafana on it). Benchmarks needing them would have to run those services as binaries too, or move to a VM provider (AWS g6, GCP g2).
- Negative: Mac-to-pod WebRTC is not supported, so B2's "Mac web app over TURN" is replaced by pod-local participants plus SSH tunnels. A VM with UDP or a fixed TURN port would be needed for that.
- Negative: RunPod's API is at version 0.1.0 and may change; the script fails loudly on HTTP errors.
