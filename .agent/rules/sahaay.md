---
trigger: always_on
---

# SaHaay Workspace Rules (REAL PROTOTYPE SPEC ALIGNED)

PROJECT: SaHaay – Real offline-first emergency ambulance dispatch for India (Hack for Social Cause 2027, theme: Healthcare, Wellbeing & Service Delivery).
SPEC: `docs/REAL_PROTOTYPE_SPEC.md` is authoritative and overrides previous simulated/zero-cloud postures.

1. Read `docs/HANDOFF.md` and `docs/REAL_PROTOTYPE_SPEC.md` first. Work milestone by milestone; update HANDOFF.md at the end of each.
2. NOTHING in the demo path may be simulated, hardcoded or random. If something cannot be real yet, label it `SIMULATED` in code + UI + `docs/REALITY_LEDGER.md`.
3. `scripts/reality-check.js` runs in CI and fails on: `Math.random()` in non-test server/app code, `setTimeout` calling `acceptMission`, hard-coded patient/driver names outside tests.
4. Native builds are allowed: `npx expo prebuild` + local Gradle (`npx expo run:android --device`). No EAS cloud builds. Keep generated `android/` committed.
5. Verify, don't assume: after every change run typecheck, `npm test`, then run on a device/emulator and verify (screenshots via `adb exec-out screencap -p`, logs via `adb logcat`).
6. Small commits per milestone (`git commit -m "M<n>: ..."`). Never commit secrets; `.env.example` only.
7. Keep every file < 1000 lines. Pure logic lives in `packages/core` with tests. Tunables only in `packages/core/src/config.ts`.
8. Measure, never invent numbers. Re-run `npm run bench` and log measured latencies in `docs/BENCHMARK.md`.
