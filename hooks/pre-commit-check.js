/**
 * MAKO Pre-Commit Hook
 *
 * Runs before any git commit to verify tests/linters pass.
 * Auto-detects the test command from the project's config files.
 * If no test command is found, the commit proceeds normally.
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function findTestCommand(cwd) {
  // package.json — Node.js projects
  const pkgPath = path.join(cwd, "package.json");
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      if (pkg.scripts) {
        if (pkg.scripts.test && pkg.scripts.test !== 'echo "Error: no test specified" && exit 1') {
          const pm = fs.existsSync(path.join(cwd, "bun.lockb")) ? "bun" :
                     fs.existsSync(path.join(cwd, "pnpm-lock.yaml")) ? "pnpm" :
                     fs.existsSync(path.join(cwd, "yarn.lock")) ? "yarn" : "npm";
          return `${pm} test`;
        }
      }
    } catch {}
  }

  // Cargo.toml — Rust projects
  if (fs.existsSync(path.join(cwd, "Cargo.toml"))) {
    return "cargo test --quiet";
  }

  // Makefile — check for test target
  const makefile = path.join(cwd, "Makefile");
  if (fs.existsSync(makefile)) {
    try {
      const content = fs.readFileSync(makefile, "utf8");
      if (/^test\s*:/m.test(content)) {
        return "make test";
      }
    } catch {}
  }

  // pyproject.toml or pytest
  if (fs.existsSync(path.join(cwd, "pyproject.toml")) ||
      fs.existsSync(path.join(cwd, "pytest.ini")) ||
      fs.existsSync(path.join(cwd, "setup.py"))) {
    return "python -m pytest --quiet -x";
  }

  return null;
}

function main() {
  const cwd = process.cwd();
  const testCmd = findTestCommand(cwd);

  if (!testCmd) {
    // No test command found — allow commit
    process.stdout.write(JSON.stringify({ decision: "allow" }));
    return;
  }

  try {
    execSync(testCmd, {
      cwd,
      stdio: "pipe",
      timeout: 120000,
      windowsHide: true,
    });
    // Tests passed — allow commit
    process.stdout.write(JSON.stringify({ decision: "allow" }));
  } catch (err) {
    const output = (err.stdout || "").toString().slice(-500) +
                   (err.stderr || "").toString().slice(-500);
    process.stdout.write(JSON.stringify({
      decision: "block",
      reason: `Tests failed. Fix before committing.\n\nCommand: ${testCmd}\nOutput (last 1000 chars):\n${output}`,
    }));
  }
}

main();
