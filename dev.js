import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const apiDir = path.join(__dirname, 'weeb-api');
const uiDir = path.join(__dirname, 'weeb-ui');

// ANSI Colors
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const DIM = '\x1b[2m';

console.log(`\n${BOLD}${CYAN}====================================================${RESET}`);
console.log(`${BOLD}${CYAN}   🚀 Starting WeeBudget Local Development Stack    ${RESET}`);
console.log(`${BOLD}${CYAN}====================================================${RESET}\n`);
console.log(`  ${BOLD}• Backend (Laravel):${RESET}  ${CYAN}http://localhost:8000${RESET}`);
console.log(`  ${BOLD}• Frontend (Vite):${RESET}    ${GREEN}http://localhost:5173${RESET}`);
console.log(`  ${DIM}Tekan Ctrl + C untuk menghentikan kedua server sekaligus.${RESET}\n`);

let isShuttingDown = false;
const processes = [];

function pipeOutput(stream, prefix, color) {
  if (!stream) return;
  let buffer = '';
  stream.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (line.trim().length > 0) {
        console.log(`${color}${BOLD}[${prefix}]${RESET} ${line}`);
      }
    }
  });
  stream.on('end', () => {
    if (buffer.trim().length > 0) {
      console.log(`${color}${BOLD}[${prefix}]${RESET} ${buffer}`);
    }
  });
}

function spawnProcess(command, args, cwd, prefix, color) {
  const child = spawn(command, args, {
    cwd,
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      FORCE_COLOR: '1',
    },
  });

  pipeOutput(child.stdout, prefix, color);
  pipeOutput(child.stderr, prefix, color);

  child.on('error', (err) => {
    console.error(`${RED}${BOLD}[${prefix} ERROR]${RESET} Gagal menjalankan ${command}: ${err.message}`);
  });

  child.on('close', (code, signal) => {
    if (!isShuttingDown) {
      const exitInfo = signal ? `signal ${signal}` : `kode ${code}`;
      console.log(`${YELLOW}${BOLD}[${prefix}]${RESET} Server berhenti (${exitInfo}).`);
      shutdown(code ?? 0);
    }
  });

  processes.push(child);
  return child;
}

function shutdown(exitCode = 0) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`\n${YELLOW}${BOLD}Menghentikan server backend dan frontend...${RESET}`);

  for (const proc of processes) {
    try {
      if (!proc.killed) {
        proc.kill('SIGINT');
      }
    } catch {
      // ignore
    }
  }

  // Force kill if graceful shutdown takes too long
  setTimeout(() => {
    for (const proc of processes) {
      try {
        if (!proc.killed) {
          proc.kill('SIGKILL');
        }
      } catch {
        // ignore
      }
    }
    process.exit(exitCode);
  }, 1200);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

// 1. Jalankan Backend Laravel (Port 8000)
spawnProcess('php', ['artisan', 'serve', '--port=8000'], apiDir, 'API', CYAN);

// 2. Jalankan Frontend Vite (Port 5173)
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
spawnProcess(npmCmd, ['run', 'dev'], uiDir, 'UI', GREEN);
