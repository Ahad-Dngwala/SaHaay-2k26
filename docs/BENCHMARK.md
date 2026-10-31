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
| 0.5 km | 0 | 6.0 µs | 9.8 µs | 0.053 ms | 0.517 ms |
| 1.0 km | 0 | 3.1 µs | 4.3 µs | 8.3 µs | 0.582 ms |
| 2.0 km | 0 | 3.7 µs | 4.5 µs | 6.1 µs | 0.026 ms |
| 4.0 km | 6 | 0.012 ms | 0.023 ms | 0.155 ms | 3.111 ms |
| 8.0 km | 13 | 0.018 ms | 0.036 ms | 0.086 ms | 5.177 ms |

## 10,000 Ambulances

| Radius | Avg. Candidates Found | p50 | p95 | p99 | Max |
|--------|----------------------|-----|-----|-----|-----|
| 0.5 km | 0 | 6.1 µs | 8.4 µs | 0.026 ms | 1.354 ms |
| 1.0 km | 3 | 6.5 µs | 0.012 ms | 0.064 ms | 3.402 ms |
| 2.0 km | 12 | 8.4 µs | 0.016 ms | 0.062 ms | 0.525 ms |
| 4.0 km | 38 | 0.015 ms | 0.031 ms | 0.090 ms | 2.283 ms |
| 8.0 km | 100 | 0.032 ms | 0.048 ms | 0.094 ms | 1.407 ms |

## Interpretation

The SaHaay grid search uses a fixed-size spatial cell index (0.01° ≈ 1.11 km cells). Query time is proportional to the number of cells intersected by the search radius bounding box, not the total number of ambulances. As a result, performance scales well with fleet size.

**500 m radius (initial search ring)** at 10k ambulances: see table above.

For a fair comparison: the end-to-end SOS dispatch latency (HTTP request → search → WebSocket offer) is dominated by network round-trip (typically 1–50 ms on LAN), not the search itself.

### Presentation Guidance
> **Recommended slide/pitch wording:**
> *"In a synthetic 10,000-ambulance benchmark, the 500 m in-memory spatial search reported sub-millisecond p99 latency. This excludes end-to-end network and dispatch latency."*
