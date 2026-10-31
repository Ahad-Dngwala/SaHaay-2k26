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
| 0.5 km | 0 | 0.6 µs | 1.9 µs | 2.7 µs | 3.466 ms |
| 1.0 km | 0 | 1.2 µs | 1.5 µs | 2.4 µs | 0.041 ms |
| 2.0 km | 0 | 2.7 µs | 4.0 µs | 6.2 µs | 0.117 ms |
| 4.0 km | 6 | 6.3 µs | 0.011 ms | 0.040 ms | 0.127 ms |
| 8.0 km | 17 | 0.014 ms | 0.031 ms | 0.046 ms | 0.854 ms |

## 10,000 Ambulances

| Radius | Avg. Candidates Found | p50 | p95 | p99 | Max |
|--------|----------------------|-----|-----|-----|-----|
| 0.5 km | 0 | 0.5 µs | 0.8 µs | 0.9 µs | 0.021 ms |
| 1.0 km | 3 | 1.1 µs | 1.6 µs | 2.0 µs | 0.022 ms |
| 2.0 km | 12 | 3.2 µs | 9.2 µs | 0.012 ms | 0.040 ms |
| 4.0 km | 43 | 0.010 ms | 0.027 ms | 0.049 ms | 1.715 ms |
| 8.0 km | 177 | 0.043 ms | 0.123 ms | 0.246 ms | 0.618 ms |

## Interpretation

The SaHaay grid search uses a fixed-size spatial cell index (0.01° ≈ 1.11 km cells). Query time is proportional to the number of cells intersected by the search radius bounding box, not the total number of ambulances. As a result, performance scales well with fleet size.

**500 m radius (initial search ring)** at 10k ambulances: see table above.

For a fair comparison: the end-to-end SOS dispatch latency (HTTP request → search → WebSocket offer) is dominated by network round-trip (typically 1–50 ms on LAN), not the search itself.

### Presentation Guidance
> **Recommended slide/pitch wording:**
> *"In a synthetic 10,000-ambulance benchmark, the 500 m in-memory spatial search reported sub-millisecond p99 latency. This excludes end-to-end network and dispatch latency."*
