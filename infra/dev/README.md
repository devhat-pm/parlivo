# infra/dev

CPU-only local infrastructure (ARCHITECTURE.md section 8): LiveKit, coturn, PostgreSQL 18 with pgvector, Valkey and NATS with JetStream. Image versions are pinned in `docs/versions.md`. Everything here is for development only; the keys and passwords are public.

```bash
pnpm dev:infra          # start everything and wait until every health check passes
pnpm dev:infra:logs     # follow logs
pnpm dev:infra:down     # stop (data kept)
pnpm dev:infra:reset    # stop and delete the Postgres and NATS volumes
```

## Ports (host side)

| Service                             | Port(s)                                    | Notes                                                                                                   |
| ----------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| LiveKit HTTP / WebSocket signalling | 7880                                       | `ws://localhost:7880`; `GET /` returns `OK`                                                             |
| LiveKit RTC over TCP                | 7881                                       | Fallback when UDP is blocked                                                                            |
| LiveKit RTC over UDP                | 50000–50060/udp                            | Media; `node_ip` is 127.0.0.1, so only browsers on this machine can connect                             |
| coturn TURN/STUN                    | 3478/udp, 3478/tcp                         | User `parlivo`, password `parlivo-dev-turn`; relay ports 49160–49200/udp                                |
| PostgreSQL + pgvector               | 5433 (override with `PARLIVO_PG_PORT`)     | `postgresql://parlivo:parlivo@localhost:5433/parlivo`; the `vector` extension is created on first start |
| Valkey                              | 6380 (override with `PARLIVO_VALKEY_PORT`) | `redis://localhost:6380`                                                                                |
| NATS client                         | 4222                                       | JetStream enabled, data in a volume                                                                     |
| NATS monitoring                     | 8222                                       | `/healthz?js-enabled-only=true`                                                                         |

Postgres and Valkey use 5433 and 6380 rather than the defaults so they do not collide with other local projects.

## LiveKit runs with host networking

LiveKit uses `network_mode: host`, so its ports above are bound directly rather than forwarded. WebRTC through Docker's port forwarding does not work reliably: on Docker Desktop for macOS, ICE connects but the DTLS handshake times out. On Linux (including CI) host networking works out of the box. **On Docker Desktop (macOS or Windows), turn on Settings > Resources > Network > "Enable host networking" and restart Docker**; otherwise `ws://localhost:7880` is unreachable from the host even though the container reports healthy.

## LiveKit dev credentials

`infra/dev/livekit.yaml` defines API key `devkey` with secret `parlivo-dev-secret-0123456789abcdef`. `apps/api` uses the same values by default (`LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_URL=ws://localhost:7880`). LiveKit advertises the coturn server to clients through `rtc.turn_servers`.

## Health checks

| Service  | Check                                                                                         |
| -------- | --------------------------------------------------------------------------------------------- |
| livekit  | `GET http://127.0.0.1:7880/` returns `OK`                                                     |
| coturn   | `turnutils_stunclient 127.0.0.1` gets a STUN binding response (the image has no curl or wget) |
| postgres | `pg_isready`                                                                                  |
| valkey   | `valkey-cli ping`                                                                             |
| nats     | `GET /healthz?js-enabled-only=true` on 8222                                                   |
