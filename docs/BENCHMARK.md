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
| 0.5 km | 0 | 6.2 µs | 0.012 ms | 0.060 ms | 0.222 ms |
| 1.0 km | 0 | 5.5 µs | 8.2 µs | 0.049 ms | 0.189 ms |
| 2.0 km | 0 | 8.2 µs | 0.021 ms | 0.042 ms | 0.281 ms |
| 4.0 km | 1 | 0.013 ms | 0.034 ms | 0.048 ms | 0.197 ms |
| 8.0 km | 6 | 0.029 ms | 0.046 ms | 0.103 ms | 2.753 ms |

## 10,000 Ambulances

| Radius | Avg. Candidates Found | p50 | p95 | p99 | Max |
|--------|----------------------|-----|-----|-----|-----|
| 0.5 km | 0 | 9.0 µs | 0.014 ms | 0.025 ms | 0.110 ms |
| 1.0 km | 4 | 7.0 µs | 0.013 ms | 0.026 ms | 0.102 ms |
| 2.0 km | 15 | 0.014 ms | 0.023 ms | 0.049 ms | 3.702 ms |
| 4.0 km | 29 | 0.027 ms | 0.045 ms | 0.085 ms | 0.421 ms |
| 8.0 km | 93 | 0.072 ms | 0.123 ms | 0.177 ms | 1.107 ms |

## Interpretation

The SaHaay grid search uses a fixed-size spatial cell index (0.01° ≈ 1.11 km cells). Query time is proportional to the number of cells intersected by the search radius bounding box, not the total number of ambulances. As a result, performance scales well with fleet size.

**500 m radius (initial search ring)** at 10k ambulances: see table above.

For a fair comparison: the end-to-end SOS dispatch latency (HTTP request → search → WebSocket offer) is dominated by network round-trip (typically 1–50 ms on LAN), not the search itself.

### Presentation Guidance
> **Recommended slide/pitch wording:**
> *"In a synthetic 10,000-ambulance benchmark, the 500 m in-memory spatial search reported sub-millisecond p99 latency. This excludes end-to-end network and dispatch latency."*
