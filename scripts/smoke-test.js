/**
 * scripts/smoke-test.js
 * Cross-platform runtime smoke test for SaHaay dispatch server.
 * Starts server on an isolated port, polls /health and /control, and terminates cleanly.
 */

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT || '3001';
const serverEntry = fs.existsSync(path.join(__dirname, '..', 'server', 'dist', 'index.js'))
  ? path.join(__dirname, '..', 'server', 'dist', 'index.js')
  : path.join(__dirname, '..', 'server', 'src', 'index.ts');

console.log(`🚀 Starting smoke test on port ${PORT} using ${serverEntry}...`);

const isTs = serverEntry.endsWith('.ts');
const cmd = isTs ? (process.platform === 'win32' ? 'npx.cmd' : 'npx') : 'node';
const args = isTs ? ['ts-node', serverEntry] : [serverEntry];

const serverProc = spawn(cmd, args, {
  cwd: path.join(__dirname, '..'),
  env: { ...process.env, PORT },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let stdout = '';
let stderr = '';
serverProc.stdout.on('data', (d) => { stdout += d.toString(); });
serverProc.stderr.on('data', (d) => { stderr += d.toString(); });

function cleanup() {
  if (serverProc && !serverProc.killed) {
    try {
      serverProc.kill('SIGTERM');
      setTimeout(() => {
        try { serverProc.kill('SIGKILL'); } catch (_) {}
      }, 1000);
    } catch (_) {}
  }
}

process.on('exit', cleanup);
process.on('SIGINT', () => { cleanup(); process.exit(1); });
process.on('SIGTERM', () => { cleanup(); process.exit(1); });

function poll(attemptsRemaining) {
  if (attemptsRemaining <= 0) {
    cleanup();
    console.error('❌ Smoke test timed out waiting for server to be healthy.');
    if (stderr) console.error('Server stderr:', stderr);
    process.exit(1);
  }

  const req = http.get(`http://localhost:${PORT}/health`, (res) => {
    let body = '';
    res.on('data', (chunk) => { body += chunk; });
    res.on('end', () => {
      if (res.statusCode === 200) {
        console.log(`✅ /health responded 200 OK (${body.trim()})`);
        verifyControl();
      } else {
        setTimeout(() => poll(attemptsRemaining - 1), 500);
      }
    });
  });

  req.on('error', () => {
    setTimeout(() => poll(attemptsRemaining - 1), 500);
  });
}

function verifyControl() {
  http.get(`http://localhost:${PORT}/control`, (res) => {
    let body = '';
    res.on('data', (chunk) => { body += chunk; });
    res.on('end', () => {
      cleanup();
      if (res.statusCode === 200 && (body.includes('SaHaay') || body.includes('<!DOCTYPE html>'))) {
        console.log('✅ /control responded 200 OK with valid HTML dashboard.');
        console.log('🎉 Runtime smoke test passed successfully.');
        process.exit(0);
      } else {
        console.error(`❌ /control failed with status ${res.statusCode}`);
        process.exit(1);
      }
    });
  }).on('error', (err) => {
    cleanup();
    console.error(`❌ Failed to request /control: ${err.message}`);
    process.exit(1);
  });
}

// Allow 15 seconds (30 attempts x 500ms)
poll(30);
