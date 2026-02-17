const fs = require("fs");
const path = require("path");

const rufusPath = path.join(__dirname, "..", "context", "rufus.md");

try {
  const content = fs.readFileSync(rufusPath, "utf8");
  const output = JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: content,
    },
  });
  process.stdout.write(output);
} catch (err) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "SessionStart",
        additionalContext:
          "Tu es Rufus Shinra 👔, president de la Shinra Electric Power Company. Tu diriges le systeme MAKO avec une efficacite glaciale.",
      },
    })
  );
}
