const { fork, spawn } = require('child_process');
const path = require('path');

try {
  const dotenv = require('dotenv');
  dotenv.config({ override: true });
  dotenv.config({ path: path.join(__dirname, 'server', '.env'), override: true });
} catch (e) {}

const isProd = process.argv.includes('--prod') || process.env.NODE_ENV === 'production';
const backendPort = process.env.BACKEND_PORT || (process.env.PORT && process.env.PORT !== '3000' ? process.env.PORT : '5000');

console.log(`[Runner] Starting backend server on port ${backendPort}...`);

const serverProcess = fork(path.join(__dirname, 'server', 'server.js'), [], {
  env: {
    ...process.env,
    PORT: backendPort,
    BACKEND_PORT: backendPort,
    CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000'
  },
  stdio: 'inherit'
});

const nextCommand = isProd ? 'start' : 'dev';
console.log(`[Runner] Starting Next.js client (${nextCommand}) on port 3000...`);

const clientProcess = spawn('npx', ['next', nextCommand, '-p', '3000', '-H', '0.0.0.0'], {
  cwd: path.join(__dirname, 'client'),
  env: {
    ...process.env,
    PORT: '3000',
    BACKEND_URL: `http://127.0.0.1:${backendPort}`
  },
  stdio: 'inherit'
});

serverProcess.on('error', (err) => {
  console.error('[Runner] Server process error:', err);
});

clientProcess.on('error', (err) => {
  console.error('[Runner] Client process error:', err);
});

function cleanup() {
  console.log('[Runner] Shutting down processes...');
  try { serverProcess.kill('SIGTERM'); } catch (e) {}
  try { clientProcess.kill('SIGTERM'); } catch (e) {}
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
