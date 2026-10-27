# SaHaay — Dispatch Search Benchmark

**Measured:** 2026-10-27 | Node.js v22.23.4

> ⚠️ These numbers are for the **in-process spatial index search only** (excluding network I/O, DB, WebSocket overhead).
> The slide claim "under 200 ms" refers specifically to this search step.

## Methodology
- 1000 iterations per (count × radius) combination, after 100 warmup iterations.
- Grid populated with synthetic ambulances uniformly distributed ±0.5° around Ahmedabad (23.0225, 72.5714).
- Measured with `performance.now()` (sub-millisecond resolution).

## 1,000 Ambulances

| Radius | Avg. Candidates Found | p50 | p95 | p99 | Max |
|--------|----------------------|-----|-----|-----|-----|
| 0.5 km | 0 | 3.0 µs | 6.0 µs | 0.017 ms | 4.086 ms |
| 1.0 km | 0 | 1.6 µs | 2.5 µs | 2.8 µs | 0.017 ms |
| 2.0 km | 1 | 3.3 µs | 6.3 µs | 0.018 ms | 0.106 ms |
| 4.0 km | 5 | 4.1 µs | 8.9 µs | 0.013 ms | 0.042 ms |
| 8.0 km | 15 | 9.2 µs | 0.014 ms | 0.022 ms | 1.671 ms |

## 10,000 Ambulances

| Radius | Avg. Candidates Found | p50 | p95 | p99 | Max |
|--------|----------------------|-----|-----|-----|-----|
| 0.5 km | 0 | 2.7 µs | 3.9 µs | 4.1 µs | 0.019 ms |
| 1.0 km | 3 | 3.7 µs | 4.2 µs | 5.4 µs | 1.693 ms |
| 2.0 km | 12 | 5.6 µs | 6.8 µs | 0.013 ms | 0.077 ms |
| 4.0 km | 34 | 8.6 µs | 0.013 ms | 0.025 ms | 1.266 ms |
| 8.0 km | 96 | 0.023 ms | 0.037 ms | 0.075 ms | 0.665 ms |

## Interpretation

The SaHaay grid search uses a fixed-size spatial cell index (0.01° ≈ 1.11 km cells). Query time is proportional to the number of cells intersected by the search radius bounding box, not the total number of ambulances. As a result, performance scales well with fleet size.

**500 m radius (initial search ring)** at 10k ambulances: see table above.

For a fair comparison: the end-to-end SOS dispatch latency (HTTP request → search → WebSocket offer) is dominated by network round-trip (typically 1–50 ms on LAN), not the search itself.
