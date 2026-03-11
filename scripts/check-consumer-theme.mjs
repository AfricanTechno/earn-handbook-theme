#!/usr/bin/env node
import { diffConsumerTheme, formatDiff, parseCliArgs } from "./theme-sync-lib.mjs";

function printUsage() {
  console.log("Usage: node scripts/check-consumer-theme.mjs --target <path-to-theme-dir>");
}

try {
  const args = parseCliArgs();
  if (args.help) {
    printUsage();
    process.exit(0);
  }

  const diff = diffConsumerTheme(args.target);
  const lines = formatDiff(diff);

  if (lines.length === 0) {
    console.log(`Consumer theme matches manifest: ${args.target}`);
    process.exit(0);
  }

  console.error(`Consumer theme drift detected: ${args.target}`);
  for (const line of lines) {
    console.error(`- ${line}`);
  }
  process.exit(1);
} catch (error) {
  console.error(String(error && error.message ? error.message : error));
  printUsage();
  process.exit(1);
}
