import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const color = {
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  bold: (text) => `\x1b[1m${text}\x1b[0m`,
};

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run") || args.includes("-d");
const showSummary = args.includes("--show-summary") || args.includes("-s");
const level = args.find((arg) => !arg.startsWith("-"))?.toLowerCase();

const VALID_LEVELS = [
  "major",
  "minor",
  "patch",
  "alpha",
  "beta",
  "rc",
  "dev",
  "release",
];

if (!level || !VALID_LEVELS.includes(level)) {
  console.error(
    `❌ Usage: node versioning.mjs <${VALID_LEVELS.join("|")}> [--dry-run] [--show-summary]`,
  );
  process.exit(1);
}

function loadConfig() {
  const pkgPath = join(process.cwd(), "package.json");
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    if (!pkg.version)
      throw new Error("package.json is missing 'version' property.");

    const config = pkg.versioning?.files || [];
    return { currentVersion: pkg.version, config };
  } catch (err) {
    console.error("❌ Failed to load package.json:", err.message);
    process.exit(1);
  }
}

function parseVersion(version) {
  const VERSION_PATTERN =
    /^(?<major>\d+)\.(?<minor>\d+)\.(?<patch>\d+)(?:-(?<pre_type>[a-zA-Z]+)\.(?<pre_num>\d+))?$/;
  const match = version.match(VERSION_PATTERN);

  if (!match) {
    throw new Error(
      `Invalid version format ${version}. Expected MAJOR.MINOR.PATCH[-type.number]`,
    );
  }
  return match.groups;
}

function getNewVersion(level, currentVersion) {
  const parts = parseVersion(currentVersion);

  switch (level) {
    case "major":
      return `${parseInt(parts.major) + 1}.0.0`;
    case "minor":
      return `${parts.major}.${parseInt(parts.minor) + 1}.0`;
    case "patch":
      return `${parts.major}.${parts.minor}.${parseInt(parts.patch) + 1}`;
    case "alpha":
    case "beta":
    case "rc":
    case "dev": {
      const preTypeMap = { alpha: "a", beta: "b", rc: "rc", dev: "dev" };
      const preType = preTypeMap[level];
      const preNum =
        parts.pre_type === preType ? parseInt(parts.pre_num || 0) + 1 : 1;
      return `${parts.major}.${parts.minor}.${parts.patch}-${preType}.${preNum}`;
    }
    case "release":
      if (parts.pre_type || parts.pre_num) {
        return `${parts.major}.${parts.minor}.${parts.patch}`;
      }
      throw new Error(
        `The project is already on release version ${currentVersion}`,
      );
  }
}

function replaceVariableInText(text, variableName, newValue) {
  const lines = text.split("\n");
  let changedLineNumber = -1;

  // Search for: variableName optionally followed by spaces, then an equals sign
  const regex = new RegExp(`(\\b${variableName}\\s*=\\s*["'])([^"']*)(["'])`);

  for (let i = 0; i < lines.length; i++) {
    if (regex.test(lines[i])) {
      lines[i] = lines[i].replace(regex, `$1${newValue}$3`);
      changedLineNumber = i + 1;
      break;
    }
  }

  return { newText: lines.join("\n"), changedLineNumber };
}

function syncVersionInFiles(newVersion, config, dryRun) {
  const filesSynced = [];

  const pkgPath = join(process.cwd(), "package.json");
  const pkgText = readFileSync(pkgPath, "utf8");
  const pkg = JSON.parse(pkgText);
  pkg.version = newVersion;

  if (!dryRun) {
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  }
  filesSynced.push({ filePath: "package.json", lineNumber: "N/A" });

  for (const syncTarget of config) {
    const [fileName, variableName] = syncTarget.split(":");
    if (!fileName || !variableName)
      throw new Error(`Invalid sync target: ${syncTarget}`);

    const filePath = join(process.cwd(), fileName);

    try {
      const text = readFileSync(filePath, "utf8");
      const { newText, changedLineNumber } = replaceVariableInText(
        text,
        variableName,
        newVersion,
      );

      if (changedLineNumber !== -1) {
        if (!dryRun) writeFileSync(filePath, newText);
        filesSynced.push({ filePath: fileName, lineNumber: changedLineNumber });
      } else {
        console.warn(
          color.yellow(`⚠ Variable '${variableName}' not found in ${fileName}`),
        );
      }
    } catch (err) {
      console.warn(
        color.yellow(`⚠ Could not read file ${fileName} for syncing.`),
      );
    }
  }

  return filesSynced;
}

try {
  const { currentVersion, config } = loadConfig();
  const newVersion = getNewVersion(level, currentVersion);

  const filesSynced = syncVersionInFiles(newVersion, config, dryRun);

  const prefix = dryRun ? color.yellow("Dry Run: ") : "";
  console.log(
    `${prefix}Bumped version: ${color.bold(color.cyan(currentVersion))} ➡ ${color.bold(color.green(newVersion))}`,
  );

  if (showSummary) {
    console.log("\n" + color.cyan("--- Version Update Summary ---\n"));
    filesSynced.forEach((file) => {
      console.log(
        `✔ Synced ${color.cyan(file.filePath)} at line ${color.cyan(file.lineNumber)}`,
      );
    });
  }
} catch (err) {
  console.error(color.yellow("❌ Error:"), err.message);
  process.exit(1);
}
