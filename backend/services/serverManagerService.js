import fs from 'fs-extra';
import path from 'path';
import { spawn, execSync } from 'child_process';
import net from 'net';
import http from 'http';
import https from 'https';

// ─── Runtime Detection ────────────────────────────────────────────────────────

/**
 * Detects the project type, start command, install command, likely port, and
 * entry file by inspecting the repository contents.
 *
 * Supports: Node.js, Python (Flask/Django/FastAPI), PHP, Java (Maven/Gradle).
 *
 * @param {string} repoPath - Absolute path to the cloned repository
 * @returns {Promise<Object>}
 */
export async function detectProjectRuntime(repoPath) {
  const runtime = {
    type: 'unknown',
    startCommand: null,
    startArgs: [],
    installCommand: null,
    installArgs: [],
    port: null,
    entryFile: null,
    envFile: null,
    cwd: repoPath,
  };

  try {
    const files = fs.readdirSync(repoPath);

    // ── Node.js ──────────────────────────────────────────────────────────────
    if (files.includes('package.json')) {
      runtime.type = 'node';
      const pkg = JSON.parse(fs.readFileSync(path.join(repoPath, 'package.json'), 'utf-8'));

      // Install command
      runtime.installCommand = 'npm';
      runtime.installArgs = ['install', '--legacy-peer-deps'];

      // Detect monorepo: if there's a backend/ or server/ sub-folder with its own package.json
      const monorepoCandidate = findNodeBackendDir(repoPath);
      if (monorepoCandidate && monorepoCandidate !== repoPath) {
        runtime.cwd = monorepoCandidate;
        const subPkg = JSON.parse(fs.readFileSync(path.join(monorepoCandidate, 'package.json'), 'utf-8'));
        Object.assign(runtime, parseNodePackage(subPkg, monorepoCandidate));
      } else {
        Object.assign(runtime, parseNodePackage(pkg, repoPath));
      }

      // Try to find .env
      const envPath = path.join(runtime.cwd, '.env');
      if (fs.existsSync(envPath)) runtime.envFile = envPath;

      // Port from .env or package.json
      if (!runtime.port) runtime.port = detectPortFromEnv(envPath);
      if (!runtime.port) runtime.port = detectPortFromSource(runtime.cwd);

    // ── Python ───────────────────────────────────────────────────────────────
    } else if (files.includes('requirements.txt') || files.includes('manage.py') || files.includes('Pipfile')) {
      runtime.type = 'python';
      runtime.installCommand = 'pip';
      runtime.installArgs = ['install', '-r', 'requirements.txt'];

      if (files.includes('manage.py')) {
        // Django
        runtime.startCommand = 'python';
        runtime.startArgs = ['manage.py', 'runserver', '0.0.0.0:0']; // port 0 = auto
        runtime.port = 8000;
      } else {
        // Flask / FastAPI
        const appFile = ['app.py', 'main.py', 'wsgi.py', 'asgi.py', 'server.py', 'run.py']
          .find(f => files.includes(f));
        if (appFile) runtime.entryFile = appFile;

        if (files.some(f => f === 'main.py' || f === 'app.py')) {
          // Guess FastAPI vs Flask
          const content = safeRead(path.join(repoPath, appFile || 'app.py'));
          if (content.includes('FastAPI') || content.includes('uvicorn')) {
            runtime.startCommand = 'uvicorn';
            runtime.startArgs = [`${path.basename(appFile || 'app', '.py')}:app`, '--host', '0.0.0.0', '--port', '0'];
            runtime.port = 8000;
          } else {
            runtime.startCommand = 'python';
            runtime.startArgs = [appFile || 'app.py'];
            runtime.port = 5000;
          }
        }

      // ── PHP ──────────────────────────────────────────────────────────────────
      }
    } else if (files.includes('composer.json')) {
      runtime.type = 'php';
      runtime.installCommand = 'composer';
      runtime.installArgs = ['install'];
      runtime.startCommand = 'php';
      runtime.startArgs = ['-S', '0.0.0.0:0'];
      runtime.port = 8080;

    // ── Java (Maven) ─────────────────────────────────────────────────────────
    } else if (files.includes('pom.xml')) {
      runtime.type = 'java';
      runtime.installCommand = process.platform === 'win32' ? 'mvnw.cmd' : './mvnw';
      runtime.installArgs = ['package', '-DskipTests'];
      runtime.startCommand = process.platform === 'win32' ? 'mvnw.cmd' : './mvnw';
      runtime.startArgs = ['spring-boot:run'];
      runtime.port = 8080;

    // ── Java (Gradle) ────────────────────────────────────────────────────────
    } else if (files.includes('build.gradle') || files.includes('build.gradle.kts')) {
      runtime.type = 'java';
      runtime.installCommand = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
      runtime.installArgs = ['build', '-x', 'test'];
      runtime.startCommand = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
      runtime.startArgs = ['bootRun'];
      runtime.port = 8080;
    }

  } catch (err) {
    console.error('[ServerManager] Runtime detection error:', err.message);
  }

  console.log(`[ServerManager] Detected runtime: ${runtime.type}, start: ${runtime.startCommand} ${runtime.startArgs.join(' ')}`);
  return runtime;
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

function safeRead(filePath) {
  try { return fs.readFileSync(filePath, 'utf-8'); } catch { return ''; }
}

/**
 * Inspects a Node package.json and extracts start command + entry file.
 */
function parseNodePackage(pkg, dir) {
  const result = { startCommand: null, startArgs: [], entryFile: null, port: null };
  const scripts = pkg.scripts || {};

  // Prefer: start → dev → serve
  const scriptPriority = ['start', 'dev', 'serve', 'server'];
  let chosen = null;
  for (const name of scriptPriority) {
    if (scripts[name]) { chosen = { name, cmd: scripts[name] }; break; }
  }

  if (chosen) {
    let scriptCmd = chosen.cmd;
    let modified = false;

    // Remove file watcher (nodemon or ts-node-dev)
    if (/(?:npx\s+)?nodemon\b/.test(scriptCmd)) {
      scriptCmd = scriptCmd.replace(/(?:npx\s+)?nodemon\b/g, 'node');
      pkg.scripts[chosen.name] = scriptCmd;
      modified = true;
    }
    if (/(?:npx\s+)?ts-node-dev\b/.test(scriptCmd)) {
      scriptCmd = scriptCmd.replace(/(?:npx\s+)?ts-node-dev\b/g, 'ts-node');
      pkg.scripts[chosen.name] = scriptCmd;
      modified = true;
    }

    if (modified) {
      try {
        fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(pkg, null, 2), 'utf-8');
        console.log(`[ServerManager] Rewrote package.json script '${chosen.name}' to bypass file watcher: ${scriptCmd}`);
      } catch (err) {
        console.error('[ServerManager] Error rewriting package.json:', err);
      }
    }

    result.startCommand = 'npm';
    result.startArgs = ['run', chosen.name];

    // Try to extract port from the script command
    const portMatch = scriptCmd.match(/(?:PORT|port)[=: ]*(\d+)/) ||
                      scriptCmd.match(/--port[= ](\d+)/) ||
                      scriptCmd.match(/-p[= ]?(\d+)/);
    if (portMatch) result.port = parseInt(portMatch[1], 10);
  } else {
    // No scripts → try to run the main file directly
    const main = pkg.main || 'index.js';
    if (fs.existsSync(path.join(dir, main))) {
      result.startCommand = 'node';
      result.startArgs = [main];
      result.entryFile = main;
    }
  }

  return result;
}

/**
 * For monorepos, find the backend sub-directory.
 */
function findNodeBackendDir(repoPath) {
  const candidates = ['backend', 'server', 'api', 'app', 'src/server', 'packages/server', 'packages/api'];
  for (const candidate of candidates) {
    const candidatePath = path.join(repoPath, candidate);
    if (fs.existsSync(path.join(candidatePath, 'package.json'))) {
      return candidatePath;
    }
  }
  return repoPath;
}

/**
 * Try to read PORT from a .env file.
 */
function detectPortFromEnv(envPath) {
  if (!envPath || !fs.existsSync(envPath)) return null;
  const envContent = safeRead(envPath);
  const match = envContent.match(/^\s*PORT\s*=\s*["']?(\d+)/m);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Scan source files for common port patterns.
 */
function detectPortFromSource(dir) {
  const candidates = ['server.js', 'app.js', 'index.js', 'server.ts', 'app.ts', 'index.ts', 'main.js', 'main.ts'];
  for (const file of candidates) {
    const content = safeRead(path.join(dir, file));
    if (!content) continue;
    // Match: app.listen(3000 or .listen(PORT || 3000
    const match = content.match(/\.listen\s*\(\s*(?:PORT\s*\|\|\s*)?(\d{4,5})/) ||
                  content.match(/port\s*[:=]\s*(\d{4,5})/i);
    if (match) return parseInt(match[1], 10);
  }
  return null;
}

// ─── Port Utilities ───────────────────────────────────────────────────────────

/**
 * Find a free port on the machine.
 */
export function getRandomFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

/**
 * Kill whatever is occupying a given port (Windows + Linux).
 */
export function killProcessOnPort(port) {
  try {
    if (process.platform === 'win32') {
      const result = execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, { encoding: 'utf-8', stdio: 'pipe' });
      const lines = result.trim().split('\n');
      const pids = new Set();
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== '0') pids.add(pid);
      }
      for (const pid of pids) {
        try { execSync(`taskkill /PID ${pid} /F`, { stdio: 'pipe' }); } catch { /* already dead */ }
      }
    } else {
      try { execSync(`fuser -k ${port}/tcp`, { stdio: 'pipe' }); } catch { /* nothing on port */ }
    }
    console.log(`[ServerManager] Killed process(es) on port ${port}`);
  } catch {
    // Nothing listening or command failed — fine
  }
}

// ─── Server Lifecycle ─────────────────────────────────────────────────────────

/**
 * Install project dependencies.
 *
 * @param {Object} runtime - Output of detectProjectRuntime
 * @returns {Promise<Object>}
 */
export async function installDependencies(runtime) {
  if (!runtime.installCommand) {
    return { success: true, skipped: true, message: 'No install command detected' };
  }

  const cwd = runtime.cwd;
  console.log(`[ServerManager] Installing dependencies in ${cwd}: ${runtime.installCommand} ${runtime.installArgs.join(' ')}`);

  return new Promise((resolve) => {
    const child = spawn(runtime.installCommand, runtime.installArgs, {
      cwd,
      shell: true,
      stdio: 'pipe',
      env: { ...process.env },
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', d => { stdout += d.toString(); });
    child.stderr?.on('data', d => { stderr += d.toString(); });

    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      resolve({ success: false, error: 'Install timed out after 120s', stdout, stderr });
    }, 120_000);

    child.on('exit', (code) => {
      clearTimeout(timer);
      const success = code === 0;
      if (!success) console.error(`[ServerManager] Install exited with code ${code}:\n${stderr.slice(-500)}`);
      resolve({ success, exitCode: code, stdout, stderr });
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({ success: false, error: err.message });
    });
  });
}

/**
 * Start the project server as a background process.
 *
 * @param {Object} opts
 * @param {string} opts.repoPath
 * @param {Object} opts.runtime   - Output of detectProjectRuntime
 * @param {number} [opts.port]    - Override port (will be injected as PORT env var)
 * @returns {Promise<Object>} { success, pid, port, process, error }
 */
export async function startServer({ repoPath, runtime, port }) {
  if (!runtime.startCommand) {
    return { success: false, error: 'No start command detected for this project' };
  }

  const actualPort = port || runtime.port || await getRandomFreePort();

  // Clear anything occupying the port
  killProcessOnPort(actualPort);
  // Small pause to let OS release the port
  await new Promise(r => setTimeout(r, 500));

  const cwd = runtime.cwd || repoPath;

  // Build environment: inject PORT
  const env = {
    ...process.env,
    PORT: String(actualPort),
    NODE_ENV: 'development',
  };

  // If there's a .env file, parse and inject its values (low priority — process.env wins)
  if (runtime.envFile && fs.existsSync(runtime.envFile)) {
    const envContent = safeRead(runtime.envFile);
    for (const line of envContent.split('\n')) {
      const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*["']?(.*?)["']?\s*$/i);
      if (match && !env[match[1]]) {
        env[match[1]] = match[2];
      }
    }
    // Make sure PORT override sticks
    env.PORT = String(actualPort);
  }

  console.log(`[ServerManager] Starting server: ${runtime.startCommand} ${runtime.startArgs.join(' ')} (port=${actualPort}, cwd=${cwd})`);

  const child = spawn(runtime.startCommand, runtime.startArgs, {
    cwd,
    shell: true,
    stdio: 'pipe',
    detached: false,
    env,
    windowsHide: true,
  });

  let startupStdout = '';
  let startupStderr = '';
  child.stdout?.on('data', d => {
    const chunk = d.toString();
    startupStdout += chunk;
    // Only keep last 2KB to avoid memory issues
    if (startupStdout.length > 2048) startupStdout = startupStdout.slice(-2048);
  });
  child.stderr?.on('data', d => {
    const chunk = d.toString();
    startupStderr += chunk;
    if (startupStderr.length > 2048) startupStderr = startupStderr.slice(-2048);
  });

  // Detect early crash
  const earlyExitPromise = new Promise((resolve) => {
    child.on('exit', (code) => {
      resolve({ crashed: true, code });
    });
    child.on('error', (err) => {
      resolve({ crashed: true, error: err.message });
    });
  });

  // Wait a bit and see if it crashed immediately
  const raceResult = await Promise.race([
    earlyExitPromise,
    new Promise(resolve => setTimeout(() => resolve({ crashed: false }), 3000)),
  ]);

  if (raceResult.crashed) {
    return {
      success: false,
      error: `Server crashed immediately: exit=${raceResult.code}, error=${raceResult.error || startupStderr.slice(-500)}`,
      stdout: startupStdout,
      stderr: startupStderr,
    };
  }

  return {
    success: true,
    pid: child.pid,
    port: actualPort,
    process: child,
  };
}

/**
 * Wait for the server to become responsive.
 *
 * @param {Object} opts
 * @param {number}  opts.port
 * @param {string}  [opts.host='127.0.0.1']
 * @param {number}  [opts.timeoutMs=30000]
 * @param {string}  [opts.healthPath='/']
 * @returns {Promise<Object>} { ready, responseTime }
 */
export async function waitForServerReady({ port, host = '127.0.0.1', timeoutMs = 30000, healthPath = '/' }) {
  const start = Date.now();
  const interval = 1000;
  const deadline = start + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const ready = await checkHttpReady({ port, host, path: healthPath });
      if (ready) {
        const elapsed = Date.now() - start;
        console.log(`[ServerManager] Server is HTTP-ready on port ${port} (took ${elapsed}ms)`);
        return { ready: true, responseTime: elapsed };
      }
    } catch { /* ignore */ }

    await new Promise(r => setTimeout(r, interval));
  }

  console.error(`[ServerManager] Server on port ${port} did not become ready within ${timeoutMs}ms`);
  return { ready: false, responseTime: timeoutMs };
}

function checkPort(port, host) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(800);
    socket.on('connect', () => { socket.destroy(); resolve(true); });
    socket.on('timeout', () => { socket.destroy(); resolve(false); });
    socket.on('error', () => { socket.destroy(); resolve(false); });
    socket.connect(port, host);
  });
}

function checkHttpReady({ port, host, path = '/' }) {
  return new Promise((resolve) => {
    const options = {
      hostname: host,
      port,
      path,
      method: 'GET',
      timeout: 1500,
    };

    const req = http.request(options, (res) => {
      const status = res.statusCode || 0;
      res.resume();
      resolve(status > 0 && status < 500);
    });

    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    req.on('error', () => resolve(false));
    req.end();
  });
}

/**
 * Stop a managed server process safely.
 *
 * @param {Object} serverHandle - Object with { process, pid, port }
 * @returns {Promise<Object>}
 */
export async function stopServer(serverHandle) {
  if (!serverHandle) return { success: true, message: 'No server to stop' };

  try {
    if (serverHandle.process && !serverHandle.process.killed) {
      serverHandle.process.kill('SIGTERM');

      // Grace period
      await new Promise(r => setTimeout(r, 2000));

      if (!serverHandle.process.killed) {
        serverHandle.process.kill('SIGKILL');
      }
    }

    // Also kill by port as a safety net
    if (serverHandle.port) {
      killProcessOnPort(serverHandle.port);
    }

    console.log(`[ServerManager] Server stopped (pid=${serverHandle.pid}, port=${serverHandle.port})`);
    return { success: true };
  } catch (err) {
    console.error(`[ServerManager] Error stopping server: ${err.message}`);
    // Force-kill by port
    if (serverHandle.port) killProcessOnPort(serverHandle.port);
    return { success: false, error: err.message };
  }
}
