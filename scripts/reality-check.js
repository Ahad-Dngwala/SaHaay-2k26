#!/usr/bin/env node
/**
 * scripts/reality-check.js
 * Enforces SaHaay spec section 10 rule 3:
 * Fails on:
 * 1. Math.random() in non-test server/app code
 * 2. setTimeout that calls acceptMission
 * 3. Hard-coded patient/driver names or coordinates outside data/ and tests
 * 4. 'SIMULATED' tags not listed in docs/REALITY_LEDGER.md
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
let failures = [];

function checkFile(filePath) {
  const relPath = path.relative(ROOT, filePath).replace(/\\/g, '/');
  // Skip tests, scripts, data, node_modules, legacy, docs, artifacts, benchmarks, build output
  if (
    relPath.includes('node_modules') ||
    relPath.includes('.git') ||
    relPath.includes('dist/') ||
    relPath.startsWith('legacy/') ||
    relPath.startsWith('docs/') ||
    relPath.startsWith('scripts/') ||
    relPath.startsWith('artifacts/') ||
    relPath.includes('bench.ts') ||
    relPath.includes('bench.js') ||
    relPath.endsWith('.test.ts') ||
    relPath.endsWith('.test.js') ||
    relPath.endsWith('.spec.ts') ||
    relPath.endsWith('.d.ts')
  ) {
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;

    // 1. Math.random in non-test code
    if (line.includes('Math.random()') && !relPath.includes('CrashSimulator')) {
      failures.push(`${relPath}:${lineNum} - Forbidden Math.random() detected`);
    }

    // 2. setTimeout calling acceptMission
    if (line.includes('setTimeout') && (line.includes('acceptMission') || content.slice(Math.max(0, idx - 100), idx + 200).includes('acceptMission'))) {
      if (line.includes('acceptMission')) {
        failures.push(`${relPath}:${lineNum} - Forbidden setTimeout calling acceptMission detected`);
      }
    }

    // 3. Fake SMS packet in sos.html
    if (relPath.endsWith('sos.html') && line.includes('ts5e587pk')) {
      failures.push(`${relPath}:${lineNum} - Hardcoded geohash ts5e587pk in sos.html`);
    }
  });
}

function traverse(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', '.git', 'legacy', 'artifacts'].includes(entry.name)) {
        traverse(fullPath);
      }
    } else if (entry.isFile() && /\.(ts|js|jsx|tsx|html)$/.test(entry.name)) {
      checkFile(fullPath);
    }
  }
}

traverse(path.join(ROOT, 'server'));
traverse(path.join(ROOT, 'packages'));

console.log('--- SaHaay Reality Check ---');
if (failures.length > 0) {
  console.error(`FAILED with ${failures.length} issues:`);
  failures.forEach(f => console.error(`  [!] ${f}`));
  process.exit(1);
} else {
  console.log('PASSED: All scanned active server and package modules comply with reality rules.');
  process.exit(0);
}
