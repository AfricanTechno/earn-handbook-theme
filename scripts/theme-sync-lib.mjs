import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const REPO_ROOT = path.resolve(__dirname, "..");
export const MANIFEST_PATH = path.join(REPO_ROOT, "theme-sync.manifest.json");

function normalizeRelativePath(value) {
  return String(value || "")
    .replaceAll("\\", "/")
    .replace(/^\.\//, "")
    .replace(/^\/+/, "")
    .replace(/\/+/g, "/");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function ensureStringArray(value, fieldName) {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string" || !entry.trim())) {
    throw new Error(`${fieldName} must be an array of non-empty strings.`);
  }
}

function validatePattern(pattern, fieldName) {
  if (pattern.includes("*") && !pattern.endsWith("/**") && pattern !== "**/.DS_Store") {
    throw new Error(`${fieldName} contains unsupported pattern '${pattern}'. Only exact paths and dir/** are supported.`);
  }
}

export function loadManifest() {
  const manifest = readJson(MANIFEST_PATH);
  ensureStringArray(manifest.include, "include");
  ensureStringArray(manifest.exclude, "exclude");
  if (manifest.maintainerOnly !== undefined) {
    ensureStringArray(manifest.maintainerOnly, "maintainerOnly");
  }

  for (const pattern of manifest.include) {
    validatePattern(pattern, "include");
  }
  for (const pattern of manifest.exclude) {
    validatePattern(pattern, "exclude");
  }

  return {
    version: Number(manifest.version || 1),
    include: manifest.include.map(normalizeRelativePath),
    exclude: manifest.exclude.map(normalizeRelativePath),
    maintainerOnly: Array.isArray(manifest.maintainerOnly)
      ? manifest.maintainerOnly.map(normalizeRelativePath)
      : []
  };
}

function matchesPattern(relativePath, pattern) {
  if (pattern === "**/.DS_Store") {
    return relativePath === ".DS_Store" || relativePath.endsWith("/.DS_Store");
  }

  if (pattern.endsWith("/**")) {
    const base = normalizeRelativePath(pattern.slice(0, -3)).replace(/\/$/, "");
    return relativePath === base || relativePath.startsWith(`${base}/`);
  }

  return relativePath === normalizeRelativePath(pattern);
}

function isExcluded(relativePath, excludePatterns) {
  return excludePatterns.some((pattern) => matchesPattern(relativePath, pattern));
}

function listFilesRecursive(rootDir, baseRelativePath) {
  const startDir = path.join(rootDir, baseRelativePath);
  if (!fs.existsSync(startDir)) {
    return [];
  }
  if (!fs.statSync(startDir).isDirectory()) {
    throw new Error(`Expected directory: ${baseRelativePath}`);
  }

  const files = [];

  function walk(currentDir, relativePrefix) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const absolutePath = path.join(currentDir, entry.name);
      const nextRelativePath = normalizeRelativePath(path.posix.join(relativePrefix, entry.name));
      if (entry.isDirectory()) {
        walk(absolutePath, nextRelativePath);
        continue;
      }
      if (entry.isFile()) {
        files.push(nextRelativePath);
      }
    }
  }

  walk(startDir, normalizeRelativePath(baseRelativePath));
  return files;
}

function collectIncludedPaths(rootDir, { allowMissing = false } = {}) {
  const manifest = loadManifest();
  const collected = new Map();

  for (const pattern of manifest.include) {
    if (pattern.endsWith("/**")) {
      const dirPath = normalizeRelativePath(pattern.slice(0, -3)).replace(/\/$/, "");
      const absoluteDir = path.join(rootDir, dirPath);
      if (!fs.existsSync(absoluteDir)) {
        if (allowMissing) {
          continue;
        }
        throw new Error(`Missing managed directory: ${dirPath}`);
      }

      for (const relativePath of listFilesRecursive(rootDir, dirPath)) {
        if (!isExcluded(relativePath, manifest.exclude)) {
          collected.set(relativePath, path.join(rootDir, relativePath));
        }
      }
      continue;
    }

    const relativePath = normalizeRelativePath(pattern);
    const absolutePath = path.join(rootDir, relativePath);
    if (!fs.existsSync(absolutePath)) {
      if (allowMissing) {
        continue;
      }
      throw new Error(`Missing managed file: ${relativePath}`);
    }
    if (!fs.statSync(absolutePath).isFile()) {
      throw new Error(`Expected file: ${relativePath}`);
    }
    if (isExcluded(relativePath, manifest.exclude)) {
      throw new Error(`Managed file '${relativePath}' is also excluded.`);
    }
    collected.set(relativePath, absolutePath);
  }

  return collected;
}

function fileContentsMatch(leftPath, rightPath) {
  return fs.readFileSync(leftPath).equals(fs.readFileSync(rightPath));
}

export function resolveTargetPath(rawTarget) {
  if (!rawTarget || !String(rawTarget).trim()) {
    throw new Error("Missing required --target <path> argument.");
  }
  return path.resolve(process.cwd(), String(rawTarget).trim());
}

export function diffConsumerTheme(targetDir) {
  const sourceFiles = collectIncludedPaths(REPO_ROOT);
  const targetFiles = collectIncludedPaths(targetDir, { allowMissing: true });

  const missing = [];
  const changed = [];
  const extra = [];

  for (const relativePath of sourceFiles.keys()) {
    if (!targetFiles.has(relativePath)) {
      missing.push(relativePath);
      continue;
    }
    if (!fileContentsMatch(sourceFiles.get(relativePath), targetFiles.get(relativePath))) {
      changed.push(relativePath);
    }
  }

  for (const relativePath of targetFiles.keys()) {
    if (!sourceFiles.has(relativePath)) {
      extra.push(relativePath);
    }
  }

  return {
    sourceFiles,
    targetFiles,
    missing: missing.sort((a, b) => a.localeCompare(b)),
    changed: changed.sort((a, b) => a.localeCompare(b)),
    extra: extra.sort((a, b) => a.localeCompare(b))
  };
}

function removeEmptyParentDirectories(targetDir, relativePath) {
  let currentDir = path.dirname(path.join(targetDir, relativePath));
  const normalizedTargetDir = path.resolve(targetDir);

  while (currentDir.startsWith(normalizedTargetDir) && currentDir !== normalizedTargetDir) {
    if (!fs.existsSync(currentDir) || !fs.statSync(currentDir).isDirectory()) {
      currentDir = path.dirname(currentDir);
      continue;
    }

    if (fs.readdirSync(currentDir).length > 0) {
      break;
    }

    fs.rmdirSync(currentDir);
    currentDir = path.dirname(currentDir);
  }
}

export function syncConsumerTheme(targetDir, { dryRun = false } = {}) {
  const diff = diffConsumerTheme(targetDir);
  const operations = [];

  for (const relativePath of diff.extra) {
    operations.push({ type: "delete", relativePath });
  }
  for (const relativePath of diff.missing) {
    operations.push({ type: "copy", relativePath });
  }
  for (const relativePath of diff.changed) {
    operations.push({ type: "update", relativePath });
  }

  if (operations.length === 0) {
    return { operations, changed: false };
  }

  if (!dryRun) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  for (const operation of operations) {
    const targetPath = path.join(targetDir, operation.relativePath);

    if (operation.type === "delete") {
      if (!dryRun && fs.existsSync(targetPath)) {
        fs.unlinkSync(targetPath);
        removeEmptyParentDirectories(targetDir, operation.relativePath);
      }
      continue;
    }

    const sourcePath = path.join(REPO_ROOT, operation.relativePath);
    if (!dryRun) {
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.copyFileSync(sourcePath, targetPath);
    }
  }

  return { operations, changed: true };
}

export function formatDiff(diff) {
  const lines = [];

  for (const relativePath of diff.missing) {
    lines.push(`missing ${relativePath}`);
  }
  for (const relativePath of diff.changed) {
    lines.push(`changed ${relativePath}`);
  }
  for (const relativePath of diff.extra) {
    lines.push(`unexpected ${relativePath}`);
  }

  return lines;
}

export function parseCliArgs(argv = process.argv.slice(2)) {
  let target = "";
  let dryRun = false;

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (value === "--help" || value === "-h") {
      return { help: true, dryRun: false, target: "" };
    }
    if (value === "--target") {
      target = argv[index + 1] || "";
      index += 1;
      continue;
    }
    if (value.startsWith("--target=")) {
      target = value.slice("--target=".length);
      continue;
    }
    throw new Error(`Unknown argument: ${value}`);
  }

  return {
    help: false,
    dryRun,
    target: resolveTargetPath(target)
  };
}
