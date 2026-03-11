#!/usr/bin/env node
import { parseCliArgs, syncConsumerTheme } from "./theme-sync-lib.mjs";

function printUsage() {
  console.log("Usage: node scripts/sync-consumer-theme.mjs --target <path-to-theme-dir> [--dry-run]");
}

try {
  const args = parseCliArgs();
  if (args.help) {
    printUsage();
    process.exit(0);
  }

  const result = syncConsumerTheme(args.target, { dryRun: args.dryRun });

  if (!result.changed) {
    console.log(args.dryRun ? `No theme changes needed (dry run): ${args.target}` : `Consumer theme already in sync: ${args.target}`);
    process.exit(0);
  }

  console.log(`${args.dryRun ? "Planned" : "Applied"} theme sync for ${args.target}`);
  for (const operation of result.operations) {
    console.log(`- ${operation.type} ${operation.relativePath}`);
  }
  process.exit(0);
} catch (error) {
  console.error(String(error && error.message ? error.message : error));
  printUsage();
  process.exit(1);
}
