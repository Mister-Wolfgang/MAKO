/**
 * MAKO Hook: ensure-memory-server.js
 *
 * Lightweight session-start hook for mcp-memory-service (Python/SQLite-Vec).
 *
 * This hook only:
 *   1. Ensures the storage directory exists (~/.shinra/)
 *   2. Verifies mcp-memory-service is installed (pip)
 *   3. Adjusts the Python command in .mcp.json if the detected
 *      Python differs from the declared default
 *   4. Reports status
 *
 * The MCP server declaration lives in .mcp.json at the plugin root.
 * This hook dynamically patches the "command" field if the local Python
 * executable differs (e.g. "py -3" on Windows vs "python" default).
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

const SHINRA_HOME = path.join(HOME_DIR, ".shinra");
const MEMORY_DB_PATH = path.join(SHINRA_HOME, "memory.db");
const PYTHON_CACHE_PATH = path.join(SHINRA_HOME, "python-cache.json");

// Path to .mcp.json at plugin root
const PLUGIN_ROOT = process.env.CLAUDE_PLUGIN_ROOT || path.resolve(__dirname, "..");
const MCP_JSON_PATH = path.join(PLUGIN_ROOT, ".mcp.json");

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
// .mcp.json Python command sync
// ---------------------------------------------------------------------------

/**
 * If the detected Python command differs from the one declared in
 * .mcp.json mcpServers.memory.command, update it in place.
 * This ensures the MCP server starts with the correct Python on the
 * current machine (e.g. "py -3" on Windows).
 */
function syncPluginMcpPythonCommand(pythonCmd) {
  try {
    if (!fs.existsSync(MCP_JSON_PATH)) {
      log(`.mcp.json not found at ${MCP_JSON_PATH} -- skipping sync`);
      return;
    }

    const raw = fs.readFileSync(MCP_JSON_PATH, "utf8");
    const config = JSON.parse(raw);

    if (
      !config.mcpServers ||
      !config.mcpServers.memory ||
      typeof config.mcpServers.memory.command !== "string"
    ) {
      log(".mcp.json has no mcpServers.memory.command -- skipping sync");
      return;
    }

    const current = config.mcpServers.memory.command;
    if (current === pythonCmd) {
      log(`.mcp.json Python command already matches: ${pythonCmd}`);
      return;
    }

    config.mcpServers.memory.command = pythonCmd;
    fs.writeFileSync(MCP_JSON_PATH, JSON.stringify(config, null, 2) + "\n");
    log(`.mcp.json updated: command "${current}" -> "${pythonCmd}"`);
  } catch (err) {
    log(`Warning: could not sync .mcp.json Python command: ${err.message}`);
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

  // Step 4: Sync Python command in .mcp.json if needed
  syncPluginMcpPythonCommand(pythonCmd);

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
