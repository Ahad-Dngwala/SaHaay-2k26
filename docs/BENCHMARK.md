# SaHaay — Dispatch Search Benchmark

**Measured:** 2026-10-31 | Node.js v22.23.4

> ⚠️ These numbers are for the **in-process spatial index search only** (excluding network I/O, DB, WebSocket overhead).
> The slide claim "under 200 ms" refers specifically to this search step.

## Methodology
- 1000 iterations per (count × radius) combination, after 100 warmup iterations.
- Grid populated with synthetic ambulances uniformly distributed ±0.5° around Ahmedabad (23.0225, 72.5714).
- Measured with `performance.now()` (sub-millisecond resolution).

## 1,000 Ambulances

| Radius | Avg. Candidates Found | p50 | p95 | p99 | Max |
|--------|----------------------|-----|-----|-----|-----|
| 0.5 km | 0 | 4.2 µs | 9.4 µs | 0.191 ms | 0.546 ms |
| 1.0 km | 0 | 3.6 µs | 4.1 µs | 0.017 ms | 0.579 ms |
| 2.0 km | 0 | 5.0 µs | 6.2 µs | 0.037 ms | 0.507 ms |
| 4.0 km | 6 | 9.4 µs | 0.023 ms | 0.248 ms | 2.974 ms |
| 8.0 km | 13 | 0.021 ms | 0.063 ms | 0.344 ms | 1.417 ms |

## 10,000 Ambulances

| Radius | Avg. Candidates Found | p50 | p95 | p99 | Max |
|--------|----------------------|-----|-----|-----|-----|
| 0.5 km | 0 | 4.3 µs | 6.8 µs | 0.026 ms | 0.194 ms |
| 1.0 km | 3 | 6.5 µs | 8.9 µs | 0.032 ms | 0.207 ms |
| 2.0 km | 12 | 9.4 µs | 0.016 ms | 0.056 ms | 0.316 ms |
| 4.0 km | 38 | 0.020 ms | 0.039 ms | 0.151 ms | 5.115 ms |
| 8.0 km | 100 | 0.054 ms | 0.268 ms | 0.992 ms | 39.098 ms |

## Interpretation

The SaHaay grid search uses a fixed-size spatial cell index (0.01° ≈ 1.11 km cells). Query time is proportional to the number of cells intersected by the search radius bounding box, not the total number of ambulances. As a result, performance scales well with fleet size.

**500 m radius (initial search ring)** at 10k ambulances: see table above.

For a fair comparison: the end-to-end SOS dispatch latency (HTTP request → search → WebSocket offer) is dominated by network round-trip (typically 1–50 ms on LAN), not the search itself.

### Presentation Guidance
> **Recommended slide/pitch wording:**
> *"In a synthetic 10,000-ambulance benchmark, the 500 m in-memory spatial search reported sub-millisecond p99 latency. This excludes end-to-end network and dispatch latency."*
