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
| 0.5 km | 0 | 3.0 µs | 6.0 µs | 0.015 ms | 3.661 ms |
| 1.0 km | 0 | 1.6 µs | 2.7 µs | 6.0 µs | 0.039 ms |
| 2.0 km | 3 | 3.5 µs | 5.7 µs | 9.0 µs | 0.075 ms |
| 4.0 km | 5 | 5.3 µs | 8.8 µs | 0.013 ms | 1.716 ms |
| 8.0 km | 11 | 0.012 ms | 0.020 ms | 0.036 ms | 0.092 ms |

## 10,000 Ambulances

| Radius | Avg. Candidates Found | p50 | p95 | p99 | Max |
|--------|----------------------|-----|-----|-----|-----|
| 0.5 km | 1 | 2.6 µs | 3.9 µs | 8.0 µs | 0.260 ms |
| 1.0 km | 5 | 3.8 µs | 4.5 µs | 6.2 µs | 0.102 ms |
| 2.0 km | 12 | 4.2 µs | 6.7 µs | 0.010 ms | 0.183 ms |
| 4.0 km | 32 | 8.7 µs | 0.018 ms | 0.050 ms | 1.876 ms |
| 8.0 km | 109 | 0.026 ms | 0.044 ms | 0.095 ms | 0.896 ms |

## Interpretation

The SaHaay grid search uses a fixed-size spatial cell index (0.01° ≈ 1.11 km cells). Query time is proportional to the number of cells intersected by the search radius bounding box, not the total number of ambulances. As a result, performance scales well with fleet size.

**500 m radius (initial search ring)** at 10k ambulances: see table above.

For a fair comparison: the end-to-end SOS dispatch latency (HTTP request → search → WebSocket offer) is dominated by network round-trip (typically 1–50 ms on LAN), not the search itself.

### Presentation Guidance
> **Recommended slide/pitch wording:**
> *"In a synthetic 10,000-ambulance benchmark, the 500 m in-memory spatial search reported sub-millisecond p99 latency. This excludes end-to-end network and dispatch latency."*
