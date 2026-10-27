/**
 * server/src/bench.ts
 * Benchmark the spatial grid matching search with 1k and 10k synthetic ambulances.
 * Writes real measured numbers to docs/BENCHMARK.md.
 * Run: npm run bench (from repo root) or npx ts-node src/bench.ts (from server/)
 */

import { SpatialGrid } from './matching';
import * as fs from 'fs';
import * as path from 'path';

const AHM_LAT = 23.0225;
const AHM_LON = 72.5714;
const RADII   = [500, 1000, 2000, 4000, 8000];
const COUNTS  = [1_000, 10_000];
const WARMUP_ITER = 100;
const BENCH_ITER  = 1_000;

function percentile(sorted: number[], p: number): number {
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function formatMs(n: number): string {
  return n < 0.01 ? `${(n * 1000).toFixed(1)} µs` : `${n.toFixed(3)} ms`;
}

function bench(count: number): Record<number, { p50: number; p95: number; p99: number; max: number; candidatesFound: number }> {
  // Build a grid with `count` random-ish ambulances around Ahmedabad
  const grid = new SpatialGrid();
  for (let i = 0; i < count; i++) {
    // Spread ±0.5° lat, ±0.5° lon around Ahmedabad (~55 km × ~50 km)
    const lat = AHM_LAT + (Math.random() - 0.5) * 1.0;
    const lon = AHM_LON + (Math.random() - 0.5) * 1.0;
    grid.upsert(`SYN-${i}`, lat, lon);
  }

  const results: Record<number, { p50: number; p95: number; p99: number; max: number; candidatesFound: number }> = {};

  for (const radius of RADII) {
    // Warmup
    for (let i = 0; i < WARMUP_ITER; i++) {
      grid.query(AHM_LAT, AHM_LON, radius);
    }

    // Bench
    const timings: number[] = [];
    let totalFound = 0;
    for (let i = 0; i < BENCH_ITER; i++) {
      const t0 = performance.now();
      const found = grid.query(AHM_LAT, AHM_LON, radius);
      const t1 = performance.now();
      timings.push(t1 - t0);
      totalFound += found.length;
    }

    timings.sort((a, b) => a - b);
    results[radius] = {
      p50: percentile(timings, 50),
      p95: percentile(timings, 95),
      p99: percentile(timings, 99),
      max: timings[timings.length - 1],
      candidatesFound: Math.round(totalFound / BENCH_ITER),
    };
  }

  return results;
}

// ── Run ───────────────────────────────────────────────────────────────────────

console.log('SaHaay — Spatial Index Matching Benchmark');
console.log('===========================================');
console.log(`Node.js ${process.version} | ${BENCH_ITER} iterations per radius × ${WARMUP_ITER} warmup\n`);

const allResults: Record<number, ReturnType<typeof bench>> = {};

for (const count of COUNTS) {
  console.log(`\n📊 ${count.toLocaleString()} ambulances in grid:`);
  const r = bench(count);
  allResults[count] = r;
  for (const radius of RADII) {
    const s = r[radius];
    console.log(`  r=${(radius/1000).toFixed(1)} km → candidates=${s.candidatesFound} | p50=${formatMs(s.p50)} p95=${formatMs(s.p95)} p99=${formatMs(s.p99)} max=${formatMs(s.max)}`);
  }
}

// ── Write BENCHMARK.md ────────────────────────────────────────────────────────

const date = new Date().toISOString().slice(0, 10);
const nodeV = process.version;

let md = `# SaHaay — Dispatch Search Benchmark\n\n`;
md += `**Measured:** ${date} | Node.js ${nodeV}\n\n`;
md += `> ⚠️ These numbers are for the **in-process spatial index search only** (excluding network I/O, DB, WebSocket overhead).\n`;
md += `> The slide claim "under 200 ms" refers specifically to this search step.\n\n`;
md += `## Methodology\n`;
md += `- ${BENCH_ITER} iterations per (count × radius) combination, after ${WARMUP_ITER} warmup iterations.\n`;
md += `- Grid populated with synthetic ambulances uniformly distributed ±0.5° around Ahmedabad (${AHM_LAT}, ${AHM_LON}).\n`;
md += `- Measured with \`performance.now()\` (sub-millisecond resolution).\n\n`;

for (const count of COUNTS) {
  md += `## ${count.toLocaleString()} Ambulances\n\n`;
  md += `| Radius | Avg. Candidates Found | p50 | p95 | p99 | Max |\n`;
  md += `|--------|----------------------|-----|-----|-----|-----|\n`;
  for (const radius of RADII) {
    const s = allResults[count][radius];
    md += `| ${(radius/1000).toFixed(1)} km | ${s.candidatesFound} | ${formatMs(s.p50)} | ${formatMs(s.p95)} | ${formatMs(s.p99)} | ${formatMs(s.max)} |\n`;
  }
  md += '\n';
}

md += `## Interpretation\n\n`;
md += `The SaHaay grid search uses a fixed-size spatial cell index (0.01° ≈ 1.11 km cells). `;
md += `Query time is proportional to the number of cells intersected by the search radius bounding box, `;
md += `not the total number of ambulances. As a result, performance scales well with fleet size.\n\n`;
md += `**500 m radius (initial search ring)** at 10k ambulances: see table above.\n\n`;
md += `For a fair comparison: the end-to-end SOS dispatch latency (HTTP request → search → WebSocket offer) `;
md += `is dominated by network round-trip (typically 1–50 ms on LAN), not the search itself.\n`;

const outPath = path.join(__dirname, '../../docs/BENCHMARK.md');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, md, 'utf8');
console.log(`\n✅ Benchmark written to docs/BENCHMARK.md`);

// Assert < 200 ms at 10k, 500 m radius (the slide claim)
const p99at10k500m = allResults[10_000][500].p99;
if (p99at10k500m >= 200) {
  console.error(`\n❌ BENCHMARK FAILED: p99 at 10k / 500m = ${formatMs(p99at10k500m)} ≥ 200 ms`);
  process.exit(1);
} else {
  console.log(`\n✅ BENCHMARK PASS: p99 at 10k / 500m = ${formatMs(p99at10k500m)} < 200 ms`);
}
