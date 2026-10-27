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
| 0.5 km | 0 | 1.9 µs | 2.0 µs | 2.9 µs | 0.034 ms |
| 1.0 km | 0 | 1.3 µs | 1.5 µs | 3.4 µs | 3.017 ms |
| 2.0 km | 0 | 3.1 µs | 4.1 µs | 5.8 µs | 0.062 ms |
| 4.0 km | 3 | 5.4 µs | 0.011 ms | 0.016 ms | 0.092 ms |
| 8.0 km | 8 | 7.7 µs | 0.013 ms | 0.016 ms | 1.241 ms |

## 10,000 Ambulances

| Radius | Avg. Candidates Found | p50 | p95 | p99 | Max |
|--------|----------------------|-----|-----|-----|-----|
| 0.5 km | 1 | 2.4 µs | 3.2 µs | 3.7 µs | 0.019 ms |
| 1.0 km | 2 | 2.7 µs | 3.0 µs | 3.8 µs | 1.769 ms |
| 2.0 km | 14 | 4.3 µs | 6.8 µs | 9.6 µs | 0.139 ms |
| 4.0 km | 34 | 8.7 µs | 0.011 ms | 0.022 ms | 1.294 ms |
| 8.0 km | 92 | 0.022 ms | 0.044 ms | 0.075 ms | 0.501 ms |

## Interpretation

The SaHaay grid search uses a fixed-size spatial cell index (0.01° ≈ 1.11 km cells). Query time is proportional to the number of cells intersected by the search radius bounding box, not the total number of ambulances. As a result, performance scales well with fleet size.

**500 m radius (initial search ring)** at 10k ambulances: see table above.

For a fair comparison: the end-to-end SOS dispatch latency (HTTP request → search → WebSocket offer) is dominated by network round-trip (typically 1–50 ms on LAN), not the search itself.
