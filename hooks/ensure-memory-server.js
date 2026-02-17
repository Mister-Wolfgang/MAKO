/**
 * MAKO Hook: ensure-memory-server.js
 *
 * Lightweight session-start hook for mcp-memory-service (Python/SQLite-Vec).
 * Replaces ensure-shodh-server.js.
 *
 * This hook only:
 *   1. Ensures the storage directory exists (~/.shinra/)
 *   2. Verifies mcp-memory-service is installed (pip)
 *   3. Syncs ~/.mcp.json with the correct mcp-memory-service config
 *   4. Reports status
 *
 * Constraints:
 *   - Node.js only (no external npm deps)
 *   - 120s timeout (hooks.json)
 *   - Idempotent
 */

const path = require("path");
const fs = require("fs");
const os = require("os");
const { execSync } = require("child_process");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HOME_DIR = os.homedir();
const MCP_JSON_PATH = path.join(HOME_DIR, ".mcp.json");

const SHINRA_HOME = path.join(HOME_DIR, ".shinra");
const MEMORY_DB_PATH = path.join(SHINRA_HOME, "memory.db");
const PYTHON_CACHE_PATH = path.join(SHINRA_HOME, "python-cache.json");

// Cache TTL: 24 hours
const PYTHON_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Find Python executable (with caching)
// ---------------------------------------------------------------------------

/**
 * Read cached Python detection result if still valid.
 * @returns {{ cmd: string|null, installed: boolean }|null}
 */
function readPythonCache() {
  try {
    if (!fs.existsSync(PYTHON_CACHE_PATH)) return null;
    const data = JSON.parse(fs.readFileSync(PYTHON_CACHE_PATH, "utf8"));
    if (Date.now() - data.timestamp > PYTHON_CACHE_TTL_MS) return null;
    // Verify the cached command still exists with a fast check
    if (data.cmd) {
      try {
        execSync(`${data.cmd} --version 2>&1`, {
          encoding: "utf8",
          timeout: 3000,
          stdio: ["pipe", "pipe", "pipe"],
        });
      } catch {
        return null; // cached command no longer works
      }
    }
    return data;
  } catch {
    return null;
  }
}

/**
 * Write Python detection result to cache.
 */
function writePythonCache(cmd, installed) {
  try {
    fs.writeFileSync(
      PYTHON_CACHE_PATH,
      JSON.stringify({ cmd, installed, timestamp: Date.now() }) + "\n"
    );
  } catch {}
}

function findPython() {
  // Check cache first
  const cached = readPythonCache();
  if (cached) {
    log(`Python (cached): ${cached.cmd || "not found"}`);
    return cached.cmd;
  }

  // On Windows, try "py -3" first (Python Launcher, avoids Windows Store stubs)
  const candidates =
    os.platform() === "win32"
      ? ["py -3", "python", "python3"]
      : ["python3", "python"];

  for (const cmd of candidates) {
    try {
      const version = execSync(`${cmd} --version 2>&1`, {
        encoding: "utf8",
        timeout: 5000,
        stdio: ["pipe", "pipe", "pipe"],
      }).trim();
      if (version.includes("Python 3.")) return cmd;
    } catch {}
  }
  return null;
}

// ---------------------------------------------------------------------------
// Verify mcp-memory-service is installed
// ---------------------------------------------------------------------------

function checkMemoryServiceInstalled(pythonCmd) {
  try {
    const result = execSync(
      `${pythonCmd} -c "import mcp_memory_service; print(mcp_memory_service.__file__)"`,
      {
        encoding: "utf8",
        timeout: 10000,
        stdio: ["pipe", "pipe", "pipe"],
      }
    ).trim();
    return !!result;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// .mcp.json sync (writes to ~/.mcp.json, merges with existing config)
// ---------------------------------------------------------------------------

function syncMcpConfig(pythonCmd) {
  const memoryEntry = {
    command: pythonCmd,
    args: ["-m", "mcp_memory_service.server"],
    env: {
      MCP_MEMORY_STORAGE_BACKEND: "sqlite_vec",
      MCP_MEMORY_SQLITE_PATH: MEMORY_DB_PATH.replace(/\\/g, "/"),
      MCP_HTTP_ENABLED: "true",
      MCP_HTTP_PORT: "8000",
    },
  };

  let existing = {};
  try {
    existing = JSON.parse(fs.readFileSync(MCP_JSON_PATH, "utf8"));
  } catch {}

  // Ensure mcpServers object exists (Claude Code standard structure)
  if (!existing.mcpServers || typeof existing.mcpServers !== "object") {
    existing.mcpServers = {};
  }

  const current = JSON.stringify(existing.mcpServers.memory || {});
  const desired = JSON.stringify(memoryEntry);
  if (current !== desired) {
    existing.mcpServers.memory = memoryEntry;

    // Also clean up legacy top-level "memory" key if present (from old versions)
    if (existing.memory && existing.memory.args) {
      delete existing.memory;
    }

    fs.writeFileSync(MCP_JSON_PATH, JSON.stringify(existing, null, 2) + "\n");
    log("~/.mcp.json updated for mcp-memory-service (mcpServers.memory)");
  }
}

// ---------------------------------------------------------------------------
// Logging & output
// ---------------------------------------------------------------------------

function log(msg) {
  process.stderr.write(`[memory-hook] ${msg}\n`);
}

function output(statusMessage, extra) {
  const result = {
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      statusMessage,
      ...extra,
    },
  };
  process.stdout.write(JSON.stringify(result));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  // Step 1: Ensure storage directory exists
  if (!fs.existsSync(SHINRA_HOME)) {
    fs.mkdirSync(SHINRA_HOME, { recursive: true });
    log(`Created storage directory: ${SHINRA_HOME}`);
  }

  // Step 2: Find Python
  const pythonCmd = findPython();
  if (!pythonCmd) {
    writePythonCache(null, false);
    log("Python 3 not found");
    output(
      "Python 3.10+ not found. Install Python and run: pip install mcp-memory-service"
    );
    return;
  }
  log(`Python found: ${pythonCmd}`);

  // Step 3: Verify mcp-memory-service
  const installed = checkMemoryServiceInstalled(pythonCmd);
  writePythonCache(pythonCmd, installed);

  if (!installed) {
    log("mcp-memory-service not installed");
    output(
      `mcp-memory-service not installed. Run: ${pythonCmd} -m pip install mcp-memory-service`
    );
    return;
  }
  log("mcp-memory-service is installed");

  // Step 4: Sync ~/.mcp.json
  syncMcpConfig(pythonCmd);

  // Step 5: Report success
  // NOTE: Health check removed from SessionStart -- the MCP service is not yet
  // started at this stage so probing it is pointless and adds ~2-3s latency.
  // The fallback logic in individual hooks (subagent-stop, pre-compact) handles
  // runtime unavailability independently.
  output("mcp-memory-service configured (SQLite-Vec)");
  log(`Storage path: ${MEMORY_DB_PATH}`);
  log("Ready.");
}

main().catch((err) => {
  log(`FATAL: ${err.message}\n${err.stack}`);
  output(`memory hook error: ${err.message}`);
});
