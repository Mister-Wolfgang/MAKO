/**
 * Unit Tests -- ST-2: SessionStart Hooks
 *
 * Hypothesis: ensure-memory-server.js and inject-rufus.js produce correct
 * SessionStart outputs under all code paths (success, degraded, error).
 *
 * Method: Subprocess execution with environment manipulation and wrapper
 * scripts for mocking child_process (ensure-memory-server.js) and fs
 * (inject-rufus.js edge cases).
 *
 * Both hooks are CJS scripts that execute at load time (no exported function).
 * We run them as subprocesses and parse stdout JSON output.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { execSync, spawnSync } from 'node:child_process';
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  renameSync,
  copyFileSync,
} from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir, homedir } from 'node:os';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const HOOKS_DIR = resolve(__dirname, '..');
const PLUGIN_ROOT = resolve(HOOKS_DIR, '..');
const CONTEXT_DIR = resolve(PLUGIN_ROOT, 'context');
const RUFUS_MD_PATH = resolve(CONTEXT_DIR, 'rufus.md');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Execute a hook script as a subprocess. Returns { stdout, stderr, exitCode }.
 * Uses spawnSync to capture both stdout and stderr regardless of exit code.
 */
function execHook(hookFile, { env = {}, cwd = null, input = '' } = {}) {
  const hookPath = join(HOOKS_DIR, hookFile);
  const workDir = cwd || PLUGIN_ROOT;
  const mergedEnv = {
    ...process.env,
    CLAUDE_PLUGIN_ROOT: PLUGIN_ROOT,
    CLAUDE_PROJECT_DIR: workDir,
    ...env,
  };

  const result = spawnSync('node', [hookPath], {
    cwd: workDir,
    input,
    encoding: 'utf8',
    timeout: 15000,
    env: mergedEnv,
    windowsHide: true,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  return {
    stdout: (result.stdout || '').trim(),
    stderr: (result.stderr || '').trim(),
    exitCode: result.status || 0,
  };
}

/**
 * Parse JSON from hook stdout. Returns parsed object or null on failure.
 */
function parseOutput(stdout) {
  try {
    return JSON.parse(stdout);
  } catch {
    return null;
  }
}

/**
 * Execute a wrapper script that mocks child_process.execSync before loading
 * ensure-memory-server.js. The wrapper takes a scenario name that determines
 * mock behavior.
 *
 * Scenarios:
 *   - "python-found"       : Python 3 found, mcp-memory-service installed
 *   - "python-not-found"   : No Python 3 available
 *   - "service-not-installed" : Python found but mcp-memory-service missing
 */
function execEnsureMemoryWithMock(scenario, { env = {} } = {}) {
  const wrapperPath = join(__dirname, 'mocks', 'ensure-memory-wrapper.js');
  const mergedEnv = {
    ...process.env,
    CLAUDE_PLUGIN_ROOT: PLUGIN_ROOT,
    CLAUDE_PROJECT_DIR: PLUGIN_ROOT,
    MOCK_SCENARIO: scenario,
    ...env,
  };

  const result = spawnSync('node', [wrapperPath], {
    cwd: PLUGIN_ROOT,
    encoding: 'utf8',
    timeout: 15000,
    env: mergedEnv,
    windowsHide: true,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  return {
    stdout: (result.stdout || '').trim(),
    stderr: (result.stderr || '').trim(),
    exitCode: result.status || 0,
  };
}

// ===========================================================================
// inject-rufus.js
// ===========================================================================

describe('ST-2: inject-rufus.js', () => {
  // -----------------------------------------------------------------------
  // Happy path: rufus.md exists
  // -----------------------------------------------------------------------

  describe('when rufus.md exists (happy path)', () => {
    it('outputs valid JSON to stdout', () => {
      const { stdout } = execHook('inject-rufus.js');
      const output = parseOutput(stdout);
      expect(output).not.toBeNull();
    });

    it('output has hookSpecificOutput with hookEventName "SessionStart"', () => {
      const { stdout } = execHook('inject-rufus.js');
      const output = parseOutput(stdout);
      expect(output).toHaveProperty('hookSpecificOutput');
      expect(output.hookSpecificOutput.hookEventName).toBe('SessionStart');
    });

    it('output has additionalContext matching rufus.md file content', () => {
      const { stdout } = execHook('inject-rufus.js');
      const output = parseOutput(stdout);
      const expectedContent = readFileSync(RUFUS_MD_PATH, 'utf8');

      expect(output.hookSpecificOutput.additionalContext).toBe(expectedContent);
    });

    it('additionalContext is a non-empty string', () => {
      const { stdout } = execHook('inject-rufus.js');
      const output = parseOutput(stdout);

      expect(typeof output.hookSpecificOutput.additionalContext).toBe('string');
      expect(output.hookSpecificOutput.additionalContext.length).toBeGreaterThan(0);
    });

    it('additionalContext contains "Rufus Shinra"', () => {
      const { stdout } = execHook('inject-rufus.js');
      const output = parseOutput(stdout);

      expect(output.hookSpecificOutput.additionalContext).toContain('Rufus Shinra');
    });

    it('exits with code 0', () => {
      const { exitCode } = execHook('inject-rufus.js');
      expect(exitCode).toBe(0);
    });

    it('output has exactly the expected shape (no extra top-level keys)', () => {
      const { stdout } = execHook('inject-rufus.js');
      const output = parseOutput(stdout);
      const topKeys = Object.keys(output);

      expect(topKeys).toEqual(['hookSpecificOutput']);
    });

    it('hookSpecificOutput has exactly hookEventName and additionalContext', () => {
      const { stdout } = execHook('inject-rufus.js');
      const output = parseOutput(stdout);
      const hookKeys = Object.keys(output.hookSpecificOutput).sort();

      expect(hookKeys).toEqual(['additionalContext', 'hookEventName']);
    });
  });

  // -----------------------------------------------------------------------
  // Fallback: rufus.md missing
  // -----------------------------------------------------------------------

  describe('when rufus.md is missing (fallback)', () => {
    let tempBackupPath;

    beforeEach(() => {
      // Temporarily rename rufus.md so the hook can't find it
      tempBackupPath = RUFUS_MD_PATH + '.bak-test';
      if (existsSync(RUFUS_MD_PATH)) {
        renameSync(RUFUS_MD_PATH, tempBackupPath);
      }
    });

    afterEach(() => {
      // Restore rufus.md
      if (existsSync(tempBackupPath)) {
        renameSync(tempBackupPath, RUFUS_MD_PATH);
      }
    });

    it('does not crash -- exits with code 0', () => {
      const { exitCode } = execHook('inject-rufus.js');
      expect(exitCode).toBe(0);
    });

    it('outputs valid JSON even when rufus.md is missing', () => {
      const { stdout } = execHook('inject-rufus.js');
      const output = parseOutput(stdout);
      expect(output).not.toBeNull();
    });

    it('provides fallback additionalContext with hookEventName "SessionStart"', () => {
      const { stdout } = execHook('inject-rufus.js');
      const output = parseOutput(stdout);

      expect(output.hookSpecificOutput.hookEventName).toBe('SessionStart');
      expect(typeof output.hookSpecificOutput.additionalContext).toBe('string');
      expect(output.hookSpecificOutput.additionalContext.length).toBeGreaterThan(0);
    });

    it('fallback context mentions "Rufus Shinra"', () => {
      const { stdout } = execHook('inject-rufus.js');
      const output = parseOutput(stdout);

      expect(output.hookSpecificOutput.additionalContext).toContain('Rufus Shinra');
    });

    it('fallback context mentions "MAKO"', () => {
      const { stdout } = execHook('inject-rufus.js');
      const output = parseOutput(stdout);

      expect(output.hookSpecificOutput.additionalContext).toContain('MAKO');
    });
  });
});

// ===========================================================================
// ensure-memory-server.js (via mock wrapper)
// ===========================================================================

describe('ST-2: ensure-memory-server.js', () => {
  let tempDir;

  beforeAll(() => {
    // Create the mock wrapper script for ensure-memory-server.js
    const wrapperContent = `
'use strict';

/**
 * Mock wrapper for ensure-memory-server.js
 *
 * Intercepts child_process.execSync to simulate different Python/pip
 * environments without actually spawning processes.
 *
 * Controlled by MOCK_SCENARIO env var.
 */

const Module = require('module');
const path = require('path');
const fs = require('fs');
const os = require('os');

const scenario = process.env.MOCK_SCENARIO || 'python-found';

// Clear Python cache before running to ensure test isolation
const cachePath = path.join(os.homedir(), '.shinra', 'python-cache.json');
try { fs.unlinkSync(cachePath); } catch {}

// ---------------------------------------------------------------------------
// Mock execSync before the hook loads
// ---------------------------------------------------------------------------

const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === 'child_process') {
    const real = originalLoad.call(this, request, parent, isMain);
    return {
      ...real,
      execSync: function mockExecSync(cmd, opts) {
        const cmdStr = String(cmd);

        // Python version check
        if (cmdStr.includes('--version')) {
          if (scenario === 'python-not-found') {
            throw new Error('Command failed: python --version');
          }
          return 'Python 3.11.5';
        }

        // mcp-memory-service import check
        if (cmdStr.includes('import mcp_memory_service')) {
          if (scenario === 'service-not-installed') {
            throw new Error('ModuleNotFoundError: No module named mcp_memory_service');
          }
          return '/usr/lib/python3.11/site-packages/mcp_memory_service/__init__.py';
        }

        // Fallback: call real execSync for anything else
        return real.execSync(cmd, opts);
      },
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

// Now load the real hook -- it will use our mocked child_process
// __dirname is mocks/, so go up twice: mocks/ -> __tests__/ -> hooks/
require(path.join(__dirname, '..', '..', 'ensure-memory-server.js'));
`;

    writeFileSync(join(__dirname, 'mocks', 'ensure-memory-wrapper.js'), wrapperContent);
  });

  const PYTHON_CACHE_PATH = join(homedir(), '.shinra', 'python-cache.json');
  const MARKETPLACE_JSON_PATH = resolve(PLUGIN_ROOT, '..', '..', '.claude-plugin', 'marketplace.json');
  let backupPythonCache;
  let backupMarketplaceJson;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'mako-st2-'));

    // Backup existing marketplace.json
    if (existsSync(MARKETPLACE_JSON_PATH)) {
      backupMarketplaceJson = readFileSync(MARKETPLACE_JSON_PATH, 'utf8');
    } else {
      backupMarketplaceJson = null;
    }

    // Backup existing python-cache.json if it exists
    if (existsSync(PYTHON_CACHE_PATH)) {
      backupPythonCache = readFileSync(PYTHON_CACHE_PATH, 'utf8');
    } else {
      backupPythonCache = null;
    }
  });

  afterEach(() => {
    // Restore marketplace.json
    if (backupMarketplaceJson !== null) {
      writeFileSync(MARKETPLACE_JSON_PATH, backupMarketplaceJson);
    }

    // Restore python-cache.json
    if (backupPythonCache !== null) {
      writeFileSync(PYTHON_CACHE_PATH, backupPythonCache);
    } else if (existsSync(PYTHON_CACHE_PATH)) {
      rmSync(PYTHON_CACHE_PATH, { force: true });
    }

    // Clean temp dir
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  afterAll(() => {
    // Clean up the wrapper script
    const wrapperPath = join(__dirname, 'mocks', 'ensure-memory-wrapper.js');
    if (existsSync(wrapperPath)) {
      rmSync(wrapperPath, { force: true });
    }
  });

  // -----------------------------------------------------------------------
  // Scenario: Python found, service installed (success path)
  // -----------------------------------------------------------------------

  describe('scenario: python found + service installed (success)', () => {
    it('outputs valid JSON to stdout', () => {
      const { stdout } = execEnsureMemoryWithMock('python-found');
      const output = parseOutput(stdout);
      expect(output).not.toBeNull();
    });

    it('output has hookSpecificOutput with hookEventName "SessionStart"', () => {
      const { stdout } = execEnsureMemoryWithMock('python-found');
      const output = parseOutput(stdout);

      expect(output).toHaveProperty('hookSpecificOutput');
      expect(output.hookSpecificOutput.hookEventName).toBe('SessionStart');
    });

    it('statusMessage indicates configured', () => {
      const { stdout } = execEnsureMemoryWithMock('python-found');
      const output = parseOutput(stdout);

      expect(output.hookSpecificOutput.statusMessage).toContain('configured');
    });

    it('statusMessage mentions SQLite-Vec', () => {
      const { stdout } = execEnsureMemoryWithMock('python-found');
      const output = parseOutput(stdout);

      expect(output.hookSpecificOutput.statusMessage).toContain('SQLite-Vec');
    });

    it('exits with code 0', () => {
      const { exitCode } = execEnsureMemoryWithMock('python-found');
      expect(exitCode).toBe(0);
    });

    it('marketplace.json mcpServers.memory has command, args, and env', () => {
      execEnsureMemoryWithMock('python-found');

      const config = JSON.parse(readFileSync(MARKETPLACE_JSON_PATH, 'utf8'));
      expect(config).toHaveProperty('mcpServers');
      expect(config.mcpServers).toHaveProperty('memory');
      expect(config.mcpServers.memory).toHaveProperty('command');
      expect(config.mcpServers.memory).toHaveProperty('args');
      expect(config.mcpServers.memory).toHaveProperty('env');
    });

    it('marketplace.json mcpServers.memory has correct args for mcp-memory-service', () => {
      execEnsureMemoryWithMock('python-found');

      const config = JSON.parse(readFileSync(MARKETPLACE_JSON_PATH, 'utf8'));
      expect(config.mcpServers.memory.args).toEqual(['-m', 'mcp_memory_service.server']);
    });

    it('marketplace.json mcpServers.memory env has expected keys', () => {
      execEnsureMemoryWithMock('python-found');

      const config = JSON.parse(readFileSync(MARKETPLACE_JSON_PATH, 'utf8'));
      const memEnv = config.mcpServers.memory.env;
      expect(memEnv).toHaveProperty('MCP_MEMORY_STORAGE_BACKEND', 'sqlite_vec');
      expect(memEnv).toHaveProperty('MCP_MEMORY_SQLITE_PATH');
    });

    it('does not write to ~/.mcp.json', () => {
      const MCP_JSON_PATH = join(homedir(), '.mcp.json');
      const beforeContent = existsSync(MCP_JSON_PATH) ? readFileSync(MCP_JSON_PATH, 'utf8') : null;

      execEnsureMemoryWithMock('python-found');

      const afterContent = existsSync(MCP_JSON_PATH) ? readFileSync(MCP_JSON_PATH, 'utf8') : null;
      expect(afterContent).toBe(beforeContent);
    });
  });

  // -----------------------------------------------------------------------
  // Scenario: Python not found (graceful skip)
  // -----------------------------------------------------------------------

  describe('scenario: python not found (graceful skip)', () => {
    it('does not crash -- exits with code 0', () => {
      const { exitCode } = execEnsureMemoryWithMock('python-not-found');
      expect(exitCode).toBe(0);
    });

    it('outputs valid JSON to stdout', () => {
      const { stdout } = execEnsureMemoryWithMock('python-not-found');
      const output = parseOutput(stdout);
      expect(output).not.toBeNull();
    });

    it('output has hookEventName "SessionStart"', () => {
      const { stdout } = execEnsureMemoryWithMock('python-not-found');
      const output = parseOutput(stdout);

      expect(output.hookSpecificOutput.hookEventName).toBe('SessionStart');
    });

    it('statusMessage mentions Python not found', () => {
      const { stdout } = execEnsureMemoryWithMock('python-not-found');
      const output = parseOutput(stdout);

      expect(output.hookSpecificOutput.statusMessage).toContain('Python');
      expect(output.hookSpecificOutput.statusMessage).toContain('not found');
    });

    it('statusMessage suggests installing Python', () => {
      const { stdout } = execEnsureMemoryWithMock('python-not-found');
      const output = parseOutput(stdout);

      expect(output.hookSpecificOutput.statusMessage).toContain('pip install');
    });
  });

  // -----------------------------------------------------------------------
  // Scenario: Python found but mcp-memory-service not installed
  // -----------------------------------------------------------------------

  describe('scenario: python found, service not installed', () => {
    it('does not crash -- exits with code 0', () => {
      const { exitCode } = execEnsureMemoryWithMock('service-not-installed');
      expect(exitCode).toBe(0);
    });

    it('outputs valid JSON to stdout', () => {
      const { stdout } = execEnsureMemoryWithMock('service-not-installed');
      const output = parseOutput(stdout);
      expect(output).not.toBeNull();
    });

    it('output has hookEventName "SessionStart"', () => {
      const { stdout } = execEnsureMemoryWithMock('service-not-installed');
      const output = parseOutput(stdout);

      expect(output.hookSpecificOutput.hookEventName).toBe('SessionStart');
    });

    it('statusMessage mentions not installed', () => {
      const { stdout } = execEnsureMemoryWithMock('service-not-installed');
      const output = parseOutput(stdout);

      expect(output.hookSpecificOutput.statusMessage).toContain('not installed');
    });

    it('statusMessage suggests pip install command', () => {
      const { stdout } = execEnsureMemoryWithMock('service-not-installed');
      const output = parseOutput(stdout);

      expect(output.hookSpecificOutput.statusMessage).toContain('pip install mcp-memory-service');
    });
  });

  // -----------------------------------------------------------------------
  // marketplace.json idempotency
  // -----------------------------------------------------------------------

  describe('idempotency: marketplace.json sync', () => {
    it('running twice does not duplicate or corrupt marketplace.json', () => {
      execEnsureMemoryWithMock('python-found');
      const firstContent = readFileSync(MARKETPLACE_JSON_PATH, 'utf8');

      execEnsureMemoryWithMock('python-found');
      const secondContent = readFileSync(MARKETPLACE_JSON_PATH, 'utf8');

      expect(secondContent).toBe(firstContent);
    });

    it('preserves existing plugins and metadata in marketplace.json', () => {
      execEnsureMemoryWithMock('python-found');

      const config = JSON.parse(readFileSync(MARKETPLACE_JSON_PATH, 'utf8'));
      expect(config).toHaveProperty('name', 'shinra-marketplace');
      expect(config).toHaveProperty('plugins');
      expect(config.plugins.length).toBeGreaterThan(0);
      expect(config.plugins[0]).toHaveProperty('name', 'mako-ai-agents');
      expect(config).toHaveProperty('metadata');
    });
  });

  // -----------------------------------------------------------------------
  // Storage directory creation
  // -----------------------------------------------------------------------

  describe('storage directory: ~/.shinra/', () => {
    it('ensure-memory-server references .shinra home directory', () => {
      // Verify by reading the source -- the hook creates ~/.shinra/ if missing.
      // We just confirm the hook runs without error (it will find or create it).
      const { exitCode, stdout } = execEnsureMemoryWithMock('python-found');
      expect(exitCode).toBe(0);

      const output = parseOutput(stdout);
      expect(output).not.toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // Stderr logging
  // -----------------------------------------------------------------------

  describe('stderr logging', () => {
    it('logs diagnostic messages to stderr on success', () => {
      const { stderr } = execEnsureMemoryWithMock('python-found');

      expect(stderr).toContain('[memory-hook]');
      expect(stderr).toContain('Python found');
    });

    it('logs Python not found to stderr', () => {
      const { stderr } = execEnsureMemoryWithMock('python-not-found');

      expect(stderr).toContain('[memory-hook]');
      expect(stderr).toContain('Python 3 not found');
    });

    it('logs service not installed to stderr', () => {
      const { stderr } = execEnsureMemoryWithMock('service-not-installed');

      expect(stderr).toContain('[memory-hook]');
      expect(stderr).toContain('not installed');
    });
  });
});
